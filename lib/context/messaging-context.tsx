import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { AppState } from "react-native";
import { apiService } from "../services/api";
import {
  connectNotifications,
  subscribeNotificationsSocket,
} from "../services/notificationsSocket";
import { playIncomingNotificationSound } from "../services/local-notifications";
import { useAuth } from "./auth-context";
import { useNotifications } from "./notifications-context";
import type {
  Conversation,
  ConversationDetail,
  ConversationMessage,
  CreateConversationDTO,
  CreateResidentConversationDTO,
  ResidentConversationTarget,
  ResidentManagementContact,
  MessageNewPayload,
  ConversationNewPayload,
  ConversationReadPayload,
} from "../types";

// State
interface MessagingState {
  conversations: Conversation[];
  activeConversation: ConversationDetail | null;
  totalUnreadCount: number;
  loading: boolean;
  error: string | null;
}

// Actions interface
interface MessagingActions {
  fetchConversations: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  fetchResidentManagementContacts: () => Promise<ResidentManagementContact[]>;
  openConversation: (id: string) => Promise<void>;
  closeConversation: () => void;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  createConversation: (data: CreateConversationDTO) => Promise<Conversation | null>;
  createResidentConversation: (
    target: ResidentConversationTarget,
    data: CreateResidentConversationDTO,
  ) => Promise<Conversation | null>;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  clearError: () => void;
}

export interface MessagingContextType extends MessagingState {
  actions: MessagingActions;
}

// Reducer action types
const ACTIONS = {
  SET_CONVERSATIONS: "SET_CONVERSATIONS",
  UPSERT_CONVERSATION: "UPSERT_CONVERSATION",
  SET_ACTIVE_CONVERSATION: "SET_ACTIVE_CONVERSATION",
  CLEAR_ACTIVE_CONVERSATION: "CLEAR_ACTIVE_CONVERSATION",
  APPEND_MESSAGE: "APPEND_MESSAGE",
  REPLACE_OPTIMISTIC_MESSAGE: "REPLACE_OPTIMISTIC_MESSAGE",
  UPDATE_CONVERSATION_LAST_MESSAGE: "UPDATE_CONVERSATION_LAST_MESSAGE",
  MARK_READ: "MARK_READ",
  SET_TOTAL_UNREAD: "SET_TOTAL_UNREAD",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
} as const;

type ActionType = (typeof ACTIONS)[keyof typeof ACTIONS];

interface Action {
  type: ActionType;
  payload?: any;
}

const isConversationMessageArray = (value: unknown): value is ConversationMessage[] =>
  Array.isArray(value);

const normalizeConversationSummary = (response: any): Conversation | null => {
  const candidate =
    response?.data?.conversation ??
    response?.conversation ??
    response?.data?.item ??
    response?.item ??
    response?.data ??
    response;

  if (!candidate || typeof candidate !== "object" || !candidate.id) {
    return null;
  }

  return {
    ...candidate,
    id: String(candidate.id),
    participants: Array.isArray(candidate.participants) ? candidate.participants : [],
    unreadCount: typeof candidate.unreadCount === "number" ? candidate.unreadCount : 0,
    createdAt: candidate.createdAt ?? new Date().toISOString(),
    updatedAt:
      candidate.updatedAt ??
      candidate.lastMessage?.createdAt ??
      candidate.createdAt ??
      new Date().toISOString(),
  } as Conversation;
};

const parseUnreadCount = (response: any): number | null => {
  const candidate =
    response?.data?.unreadCount ??
    response?.unreadCount ??
    response?.data?.count ??
    response?.count ??
    null;

  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
};

const normalizeResidentManagementContacts = (
  response: any,
): ResidentManagementContact[] => {
  const candidate =
    response?.data?.contacts ??
    response?.contacts ??
    response?.data?.items ??
    response?.items ??
    response?.data ??
    response;

  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate
    .map((item): ResidentManagementContact | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const managementUserId =
        item.managementUserId ??
        item.userId ??
        item.id;

      if (managementUserId == null) {
        return null;
      }

      const name =
        item.name ??
        item.fullName ??
        item.displayName ??
        item.userName ??
        item.email ??
        "Management";
      const avatarUrl =
        typeof item.avatarUrl === "string"
          ? item.avatarUrl
          : typeof item.avatar === "string"
            ? item.avatar
            : null;
      const role =
        typeof item.role === "string"
          ? item.role
          : typeof item.title === "string"
            ? item.title
            : null;

      return {
        managementUserId: String(managementUserId),
        name: String(name),
        ...(avatarUrl ? { avatarUrl } : {}),
        ...(role ? { role } : {}),
      };
    })
    .filter((item): item is ResidentManagementContact => item !== null);
};

const normalizeConversationDetail = (
  response: any,
  fallbackConversation?: Conversation | null,
): ConversationDetail | null => {
  const candidate =
    response?.data?.conversation ??
    response?.conversation ??
    response?.data?.item ??
    response?.item ??
    response?.data?.items ??
    response?.items ??
    response?.data ??
    response;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const directMessages = isConversationMessageArray(candidate.messages)
    ? candidate.messages
    : null;
  const nestedMessages = isConversationMessageArray(response?.data?.messages)
    ? response.data.messages
    : isConversationMessageArray(response?.messages)
      ? response.messages
      : null;
  const fallbackMessages =
    fallbackConversation?.lastMessage ? [fallbackConversation.lastMessage] : [];

  const id = candidate.id ?? candidate.conversationId ?? fallbackConversation?.id;
  if (!id) {
    return null;
  }

  return {
    ...(fallbackConversation ?? {}),
    ...candidate,
    id: String(id),
    participants: Array.isArray(candidate.participants)
      ? candidate.participants
      : fallbackConversation?.participants ?? [],
    unreadCount:
      typeof candidate.unreadCount === "number"
        ? candidate.unreadCount
        : fallbackConversation?.unreadCount ?? 0,
    lastMessage: candidate.lastMessage ?? fallbackConversation?.lastMessage ?? null,
    createdAt:
      candidate.createdAt ??
      fallbackConversation?.createdAt ??
      new Date().toISOString(),
    updatedAt:
      candidate.updatedAt ??
      candidate.lastMessage?.createdAt ??
      fallbackConversation?.updatedAt ??
      new Date().toISOString(),
    messages: directMessages ?? nestedMessages ?? fallbackMessages,
  };
};

const computeUnreadCount = (conversations: Conversation[]) =>
  conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

const messagingReducer = (state: MessagingState, action: Action): MessagingState => {
  switch (action.type) {
    case ACTIONS.SET_CONVERSATIONS: {
      const conversations: Conversation[] = action.payload || [];
      return {
        ...state,
        conversations,
        totalUnreadCount: computeUnreadCount(conversations),
        loading: false,
      };
    }

    case ACTIONS.UPSERT_CONVERSATION: {
      const incoming: Conversation = action.payload;
      const exists = state.conversations.some((c) => c.id === incoming.id);
      const conversations = exists
        ? state.conversations.map((c) => (c.id === incoming.id ? { ...c, ...incoming } : c))
        : [incoming, ...state.conversations];
      return {
        ...state,
        conversations,
        totalUnreadCount: computeUnreadCount(conversations),
      };
    }

    case ACTIONS.SET_ACTIVE_CONVERSATION:
      return {
        ...state,
        activeConversation: action.payload,
        loading: false,
      };

    case ACTIONS.CLEAR_ACTIVE_CONVERSATION:
      return {
        ...state,
        activeConversation: null,
      };

    case ACTIONS.APPEND_MESSAGE: {
      const { conversationId, message } = action.payload as {
        conversationId: string;
        message: ConversationMessage;
      };

      // Append to active conversation if it matches
      let activeConversation = state.activeConversation;
      if (activeConversation && activeConversation.id === conversationId) {
        const alreadyExists = activeConversation.messages.some((m) => m.id === message.id);
        if (!alreadyExists) {
          activeConversation = {
            ...activeConversation,
            messages: [...activeConversation.messages, message],
            lastMessage: message,
          };
        }
      }

      // Update conversation list lastMessage
      const conversations = state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: message, updatedAt: message.createdAt }
          : c,
      );

      return {
        ...state,
        activeConversation,
        conversations,
      };
    }

    case ACTIONS.REPLACE_OPTIMISTIC_MESSAGE: {
      const { conversationId, optimisticId, message } = action.payload as {
        conversationId: string;
        optimisticId: string;
        message: ConversationMessage;
      };

      let activeConversation = state.activeConversation;
      if (activeConversation && activeConversation.id === conversationId) {
        activeConversation = {
          ...activeConversation,
          messages: activeConversation.messages.map((m) =>
            m.id === optimisticId ? message : m,
          ),
          lastMessage: message,
        };
      }

      const conversations = state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: message, updatedAt: message.createdAt }
          : c,
      );

      return {
        ...state,
        activeConversation,
        conversations,
      };
    }

    case ACTIONS.UPDATE_CONVERSATION_LAST_MESSAGE: {
      const { conversationId, message } = action.payload as {
        conversationId: string;
        message: ConversationMessage;
      };
      const conversations = state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: message,
              updatedAt: message.createdAt,
              unreadCount: c.unreadCount + 1,
            }
          : c,
      );
      return {
        ...state,
        conversations,
        totalUnreadCount: computeUnreadCount(conversations),
      };
    }

    case ACTIONS.MARK_READ: {
      const convId: string = action.payload;
      const conversations = state.conversations.map((c) =>
        c.id === convId ? { ...c, unreadCount: 0 } : c,
      );
      return {
        ...state,
        conversations,
        totalUnreadCount: computeUnreadCount(conversations),
      };
    }

    case ACTIONS.SET_TOTAL_UNREAD:
      return {
        ...state,
        totalUnreadCount:
          typeof action.payload === "number" ? action.payload : state.totalUnreadCount,
      };

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    default:
      return state;
  }
};

const initialState: MessagingState = {
  conversations: [],
  activeConversation: null,
  totalUnreadCount: 0,
  loading: false,
  error: null,
};

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

interface MessagingProviderProps {
  children: ReactNode;
}

export const MessagingProvider: React.FC<MessagingProviderProps> = ({ children }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const { notifications, actions: notificationActions } = useNotifications();
  const [state, dispatch] = useReducer(messagingReducer, initialState);
  const appState = useRef(AppState.currentState);
  const activeConversationIdRef = useRef<string | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const currentUserIdRef = useRef<string | null>(null);
  const notifiedMessageIdsRef = useRef<Set<string>>(new Set());
  const notificationsRef = useRef(notifications);
  const isOwnerRuntime = currentUser?.role === "owner";

  // Keep ref in sync with state for socket handlers
  useEffect(() => {
    activeConversationIdRef.current = state.activeConversation?.id ?? null;
  }, [state.activeConversation?.id]);

  useEffect(() => {
    conversationsRef.current = state.conversations;
  }, [state.conversations]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id ?? null;
  }, [currentUser?.id]);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const fetchUnreadCount = useCallback(async () => {
    if (isOwnerRuntime) {
      dispatch({ type: ACTIONS.SET_TOTAL_UNREAD, payload: 0 });
      return;
    }

    try {
      const response = await apiService.conversations.getUnreadCount();
      const unreadCount = parseUnreadCount(response);
      if (unreadCount != null) {
        dispatch({ type: ACTIONS.SET_TOTAL_UNREAD, payload: unreadCount });
      }
    } catch (error) {
      if (__DEV__) {
        console.log("[Messaging] Failed to fetch unread count", error);
      }
    }
  }, [isOwnerRuntime]);

  const fetchResidentManagementContacts = useCallback(async () => {
    const response = await apiService.conversations.getResidentManagementContacts();
    return normalizeResidentManagementContacts(response);
  }, []);

  const fetchConversations = useCallback(async () => {
    if (isOwnerRuntime) {
      dispatch({ type: ACTIONS.SET_CONVERSATIONS, payload: [] });
      dispatch({ type: ACTIONS.SET_TOTAL_UNREAD, payload: 0 });
      return;
    }

    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const [response, unreadResponse] = await Promise.all([
        apiService.conversations.getConversations(),
        apiService.conversations.getUnreadCount().catch(() => null),
      ]);
      if (__DEV__) {
        console.log("[Messaging] fetchConversations raw response:", JSON.stringify(response, null, 2));
      }
      const data = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray((response as any)?.items)
            ? (response as any).items
            : Array.isArray((response as any)?.conversations)
              ? (response as any).conversations
              : [];
      if (__DEV__) {
        console.log("[Messaging] fetchConversations parsed count:", data.length);
      }
      dispatch({ type: ACTIONS.SET_CONVERSATIONS, payload: data });

      const unreadCount = parseUnreadCount(unreadResponse);
      if (unreadCount != null) {
        dispatch({ type: ACTIONS.SET_TOTAL_UNREAD, payload: unreadCount });
      }
    } catch (error) {
      if (__DEV__) {
        console.log("[Messaging] Failed to fetch conversations", error);
      }
      dispatch({ type: ACTIONS.SET_ERROR, payload: "Failed to load conversations" });
    }
  }, [isOwnerRuntime]);

  const openConversation = useCallback(async (id: string) => {
    if (isOwnerRuntime) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: "Owner messaging uses owner runtime routes" });
      return;
    }

    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const response = await apiService.conversations.getConversation(id);
      const fallbackConversation =
        conversationsRef.current.find((conversation) => conversation.id === id) ?? null;
      const detail = normalizeConversationDetail(response, fallbackConversation);

      if (!detail) {
        throw new Error("Conversation detail payload was empty");
      }

      if (__DEV__) {
        console.log("[Messaging] openConversation parsed detail:", {
          id: detail.id,
          messageCount: detail.messages?.length ?? 0,
          hasParticipants: Array.isArray(detail.participants) && detail.participants.length > 0,
        });
      }

      dispatch({ type: ACTIONS.SET_ACTIVE_CONVERSATION, payload: detail });

      // Mark as read (optimistic)
      dispatch({ type: ACTIONS.MARK_READ, payload: id });
      void fetchUnreadCount();
      apiService.conversations.markAsRead(id).catch(() => {
        // silent — optimistic update already applied
      });
    } catch (error) {
      if (__DEV__) {
        console.log("[Messaging] Failed to open conversation", error);
      }
      dispatch({ type: ACTIONS.SET_ERROR, payload: "Failed to load conversation" });
    }
  }, [fetchUnreadCount, isOwnerRuntime]);

  const closeConversation = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_ACTIVE_CONVERSATION });
  }, []);

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (isOwnerRuntime) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: "Owner messaging uses owner runtime routes" });
        return;
      }

      if (!content.trim()) return;

      // Optimistic message
      const optimisticMessage: ConversationMessage = {
        id: `optimistic-${Date.now()}`,
        content,
        sender: {
          id: currentUser?.id ?? "",
          name: currentUser?.name ?? currentUser?.fullName ?? "",
          avatarUrl: null,
        },
        createdAt: new Date().toISOString(),
      };

      dispatch({
        type: ACTIONS.APPEND_MESSAGE,
        payload: { conversationId, message: optimisticMessage },
      });

      try {
        const response = await apiService.conversations.sendMessage(conversationId, { content });
        const serverMessage = (response?.data ?? response) as any;

        // Replace optimistic with server response if we got one
        if (serverMessage && serverMessage.id) {
          dispatch({
            type: ACTIONS.REPLACE_OPTIMISTIC_MESSAGE,
            payload: {
              conversationId,
              optimisticId: optimisticMessage.id,
              message: serverMessage as ConversationMessage,
            },
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.log("[Messaging] Failed to send message", error);
        }
        dispatch({ type: ACTIONS.SET_ERROR, payload: "Failed to send message" });
      } finally {
        void fetchUnreadCount();
      }
    },
    [currentUser, fetchUnreadCount, isOwnerRuntime],
  );

  const createConversation = useCallback(
    async (data: CreateConversationDTO): Promise<Conversation | null> => {
      if (isOwnerRuntime) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: "Owner compose uses owner runtime routes" });
        return null;
      }

      try {
        const response = await apiService.conversations.createConversation(data);
        const conversation = normalizeConversationSummary(response);
        if (conversation && conversation.id) {
          dispatch({ type: ACTIONS.UPSERT_CONVERSATION, payload: conversation });
          void fetchConversations();
          return conversation;
        }
        return null;
      } catch (error) {
        if (__DEV__) {
          console.log("[Messaging] Failed to create conversation", error);
        }
        dispatch({ type: ACTIONS.SET_ERROR, payload: "Failed to create conversation" });
        return null;
      }
    },
    [fetchConversations, isOwnerRuntime],
  );

  const createResidentConversation = useCallback(
    async (
      target: ResidentConversationTarget,
      data: CreateResidentConversationDTO,
    ): Promise<Conversation | null> => {
      if (isOwnerRuntime) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: "Owner compose uses owner runtime routes" });
        return null;
      }

      const response =
        target === "owner"
          ? await apiService.conversations.createResidentOwnerConversation(data)
          : await apiService.conversations.createResidentManagementConversation(data);

      const conversation = normalizeConversationSummary(response);
      if (conversation && conversation.id) {
        dispatch({ type: ACTIONS.UPSERT_CONVERSATION, payload: conversation });
        void fetchConversations();
        return conversation;
      }

      return null;
    },
    [fetchConversations, isOwnerRuntime],
  );

  // Socket event handlers (named functions for clean detach)
  const handleConversationNew = useCallback(
    (_payload: ConversationNewPayload) => {
      if (__DEV__) {
        console.log("[Messaging] conversation:new", _payload);
      }
      fetchConversations();
    },
    [fetchConversations],
  );

  const handleMessageNew = useCallback(
    (payload: MessageNewPayload) => {
      if (__DEV__) {
        console.log("[Messaging] message:new", payload);
      }
      if (!payload?.conversationId || !payload?.message) return;
      if (payload.message.id && notifiedMessageIdsRef.current.has(payload.message.id)) {
        return;
      }

      const isViewing = activeConversationIdRef.current === payload.conversationId;
      const currentUserId = currentUserIdRef.current;
      const senderId = payload.message.sender?.id ? String(payload.message.sender.id) : null;
      const isOwnMessage = Boolean(currentUserId && senderId && senderId === String(currentUserId));

      if (isViewing) {
        dispatch({
          type: ACTIONS.APPEND_MESSAGE,
          payload: {
            conversationId: payload.conversationId,
            message: payload.message,
          },
        });
        // Auto-mark read since user is viewing
        apiService.conversations.markAsRead(payload.conversationId).catch(() => {});
      } else {
        dispatch({
          type: ACTIONS.UPDATE_CONVERSATION_LAST_MESSAGE,
          payload: {
            conversationId: payload.conversationId,
            message: payload.message,
          },
        });

        if (!isOwnMessage && appState.current === "active") {
          const conversation = conversationsRef.current.find(
            (item) => item.id === payload.conversationId,
          );
          const senderName = payload.message.sender?.name?.trim();
          const subject = conversation?.subject?.trim();

          const title = subject
            ? subject
            : senderName
              ? `Message from ${senderName}`
              : "New message";

          const body = payload.message.content?.trim() || "You received a new message";

          const existingMessageNotification = notificationsRef.current.some((notification) => {
            const notificationMessageId = notification.data?.messageId;
            return Boolean(notificationMessageId && notificationMessageId === payload.message.id);
          });

          if (!existingMessageNotification && currentUserId) {
            notificationActions.createNotification(
              String(currentUserId),
              title,
              body,
              "MESSAGE_CREATED",
              {
                conversationId: payload.conversationId,
                messageId: payload.message.id,
                senderId,
              },
            );
          }

          void playIncomingNotificationSound({
            title,
            body,
            data: {
              type: "message",
              conversationId: payload.conversationId,
              messageId: payload.message.id,
            },
          });
        }
      }

      if (payload.message.id) {
        notifiedMessageIdsRef.current.add(payload.message.id);
        if (notifiedMessageIdsRef.current.size > 200) {
          const oldest = notifiedMessageIdsRef.current.values().next().value;
          if (oldest) {
            notifiedMessageIdsRef.current.delete(oldest);
          }
        }
      }

      void fetchUnreadCount();
    },
    [fetchUnreadCount, notificationActions],
  );

  const handleConversationRead = useCallback((payload: ConversationReadPayload) => {
    if (__DEV__) {
      console.log("[Messaging] conversation:read", payload);
    }
    if (payload?.conversationId) {
      dispatch({ type: ACTIONS.MARK_READ, payload: payload.conversationId });
      void fetchUnreadCount();
    }
  }, [fetchUnreadCount]);

  const attachSocketHandlers = useCallback(
    (socket: ReturnType<typeof connectNotifications>) => {
      socket.off("conversation:new", handleConversationNew);
      socket.off("message:new", handleMessageNew);
      socket.off("conversation:read", handleConversationRead);

      socket.on("conversation:new", handleConversationNew);
      socket.on("message:new", handleMessageNew);
      socket.on("conversation:read", handleConversationRead);
    },
    [handleConversationNew, handleMessageNew, handleConversationRead],
  );

  const detachSocketHandlers = useCallback(
    (socket: ReturnType<typeof connectNotifications>) => {
      socket.off("conversation:new", handleConversationNew);
      socket.off("message:new", handleMessageNew);
      socket.off("conversation:read", handleConversationRead);
    },
    [handleConversationNew, handleMessageNew, handleConversationRead],
  );

  // Socket connection + event subscription
  useEffect(() => {
    if (!isAuthenticated) return;
    if (isOwnerRuntime) {
      dispatch({ type: ACTIONS.SET_CONVERSATIONS, payload: [] });
      dispatch({ type: ACTIONS.SET_TOTAL_UNREAD, payload: 0 });
      return;
    }

    let isMounted = true;
    let activeSocket: ReturnType<typeof connectNotifications> | null = null;

    const ensureSocket = async () => {
      const token = await apiService.getAuthToken();
      if (!token || !isMounted) return;

      connectNotifications(token, {
        orgId: currentUser?.orgId,
      });
    };

    const unsubscribe = subscribeNotificationsSocket((socketInstance) => {
      if (!isMounted) return;

      if (activeSocket && activeSocket !== socketInstance) {
        detachSocketHandlers(activeSocket);
      }

      if (socketInstance) {
        attachSocketHandlers(socketInstance);
      }

      activeSocket = socketInstance;
    });

    ensureSocket();
    fetchConversations();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        // Re-attach handlers on foreground (socket may have been recreated)
        ensureSocket();
        fetchConversations();
      }
      appState.current = nextState;
    });

    return () => {
      isMounted = false;
      subscription.remove();
      unsubscribe();
      if (activeSocket) {
        detachSocketHandlers(activeSocket);
      }
    };
  }, [
    isAuthenticated,
    isOwnerRuntime,
    fetchConversations,
    handleConversationNew,
    handleMessageNew,
    handleConversationRead,
    currentUser?.orgId,
    attachSocketHandlers,
    detachSocketHandlers,
  ]);

  const setLoading = useCallback(
    (loading: boolean) => dispatch({ type: ACTIONS.SET_LOADING, payload: loading }),
    [],
  );
  const setError = useCallback(
    (error: string) => dispatch({ type: ACTIONS.SET_ERROR, payload: error }),
    [],
  );
  const clearError = useCallback(
    () => dispatch({ type: ACTIONS.CLEAR_ERROR }),
    [],
  );

  const actions: MessagingActions = React.useMemo(
    () => ({
      fetchConversations,
      fetchUnreadCount,
      fetchResidentManagementContacts,
      openConversation,
      closeConversation,
      sendMessage,
      createConversation,
      createResidentConversation,
      setLoading,
      setError,
      clearError,
    }),
    [
      fetchConversations,
      fetchUnreadCount,
      fetchResidentManagementContacts,
      openConversation,
      closeConversation,
      sendMessage,
      createConversation,
      createResidentConversation,
      setLoading,
      setError,
      clearError,
    ],
  );

  const value: MessagingContextType = {
    ...state,
    actions,
  };

  return (
    <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
  );
};

export const useMessaging = (): MessagingContextType => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error("useMessaging must be used within a MessagingProvider");
  }
  return context;
};
