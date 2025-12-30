import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { AppState } from "react-native";
import { useAsyncStorage } from "../hooks/useAsyncStorage";
import { apiService } from "../services/api";
import {
  connectNotifications,
  disconnectNotifications,
} from "../services/notificationsSocket";
import {
  STORAGE_KEYS,
  DEFAULT_NOTIFICATIONS,
  createSystemNotification,
  getUnreadNotificationsCount,
  normalizeNotification,
  normalizeNotifications,
} from "../utils";
import type { Notification, User } from "../types";
import { useAuth } from "./auth-context";

// Notifications State Interface
interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

// Notifications Actions Interface
interface NotificationsActions {
  createNotification: (
    userId: string,
    title: string,
    message: string,
    type?: Notification["type"],
  ) => Notification;
  broadcastNotificationToRole: (
    role: User["role"],
    title: string,
    message: string,
    type?: Notification["type"],
    users?: Record<string, User>,
  ) => void;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: (userId?: string) => Promise<void>;
  dismissNotification: (notificationId: string) => Promise<void>;
  undismissNotification: (notificationId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  clearError: () => void;
}

// Notifications Context Type
export interface NotificationsContextType extends NotificationsState {
  actions: NotificationsActions;
}

// Action Types
const NOTIFICATIONS_ACTIONS = {
  CREATE_NOTIFICATION: "CREATE_NOTIFICATION",
  UPSERT_NOTIFICATIONS: "UPSERT_NOTIFICATIONS",
  MARK_NOTIFICATION_READ: "MARK_NOTIFICATION_READ",
  MARK_ALL_NOTIFICATIONS_READ: "MARK_ALL_NOTIFICATIONS_READ",
  DISMISS_NOTIFICATION: "DISMISS_NOTIFICATION",
  UNDISMISS_NOTIFICATION: "UNDISMISS_NOTIFICATION",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
} as const;

type NotificationsActionType =
  (typeof NOTIFICATIONS_ACTIONS)[keyof typeof NOTIFICATIONS_ACTIONS];

interface NotificationsAction {
  type: NotificationsActionType;
  payload?: any;
}

const getUnreadCount = (notifications: Notification[]) =>
  getUnreadNotificationsCount(notifications);

const mergeNotifications = (
  existing: Notification[],
  incoming: Notification[],
): Notification[] => {
  const byId = new Map(existing.map((notification) => [notification.id, notification]));

  incoming.forEach((notification) => {
    const normalized = normalizeNotification(notification);
    const current = byId.get(normalized.id);
    if (current) {
      byId.set(normalized.id, {
        ...current,
        ...normalized,
        message: normalized.message || current.message,
        body: normalized.body ?? current.body,
      });
    } else {
      byId.set(normalized.id, normalized);
    }
  });

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

const coerceNotificationPayload = (payload: any): Notification => {
  const message =
    typeof payload?.message === "string"
      ? payload.message
      : typeof payload?.body === "string"
        ? payload.body
        : "";

  return normalizeNotification({
    id: String(payload?.id ?? ""),
    userId: payload?.userId,
    title: payload?.title || "Notification",
    message,
    body: payload?.body ?? message,
    data: payload?.data,
    type: payload?.type ?? "info",
    read: Boolean(payload?.readAt) || Boolean(payload?.read),
    readAt: payload?.readAt ?? null,
    dismissedAt: payload?.dismissedAt ?? null,
    createdAt: payload?.createdAt ?? new Date().toISOString(),
  });
};

// Notifications Reducer
const notificationsReducer = (
  state: NotificationsState,
  action: NotificationsAction,
): NotificationsState => {
  switch (action.type) {
    case NOTIFICATIONS_ACTIONS.CREATE_NOTIFICATION:
      const newNotifications = mergeNotifications(state.notifications, [
        action.payload,
      ]);
      return {
        ...state,
        notifications: newNotifications,
        unreadCount: getUnreadCount(newNotifications),
      };

    case NOTIFICATIONS_ACTIONS.UPSERT_NOTIFICATIONS: {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      const mergedNotifications = mergeNotifications(
        state.notifications,
        incoming,
      );
      return {
        ...state,
        notifications: mergedNotifications,
        unreadCount: getUnreadCount(mergedNotifications),
      };
    }

    case NOTIFICATIONS_ACTIONS.MARK_NOTIFICATION_READ:
      const readAt =
        action.payload?.readAt != null
          ? action.payload.readAt
          : new Date().toISOString();
      const updatedNotifications = state.notifications.map((notif) =>
        notif.id === action.payload?.id
          ? {
              ...notif,
              read: true,
              readAt: notif.readAt ?? readAt,
            }
          : notif,
      );
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: getUnreadCount(updatedNotifications),
      };

    case NOTIFICATIONS_ACTIONS.MARK_ALL_NOTIFICATIONS_READ:
      const markAllReadAt =
        action.payload?.readAt != null
          ? action.payload.readAt
          : new Date().toISOString();
      const allReadNotifications = state.notifications.map((notif) => {
        const userId = action.payload?.userId;
        if (userId && notif.userId && notif.userId !== userId) {
          return notif;
        }
        return {
          ...notif,
          read: true,
          readAt: notif.readAt ?? markAllReadAt,
        };
      });
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: getUnreadCount(allReadNotifications),
      };

    case NOTIFICATIONS_ACTIONS.DISMISS_NOTIFICATION: {
      const dismissedAt =
        action.payload?.dismissedAt != null
          ? action.payload.dismissedAt
          : new Date().toISOString();
      const dismissedNotifications = state.notifications.map((notif) =>
        notif.id === action.payload?.id
          ? { ...notif, dismissedAt }
          : notif,
      );
      return {
        ...state,
        notifications: dismissedNotifications,
        unreadCount: getUnreadCount(dismissedNotifications),
      };
    }

    case NOTIFICATIONS_ACTIONS.UNDISMISS_NOTIFICATION: {
      const restoredNotifications = state.notifications.map((notif) =>
        notif.id === action.payload?.id
          ? { ...notif, dismissedAt: null }
          : notif,
      );
      return {
        ...state,
        notifications: restoredNotifications,
        unreadCount: getUnreadCount(restoredNotifications),
      };
    }

    case NOTIFICATIONS_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case NOTIFICATIONS_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case NOTIFICATIONS_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Initial State
const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

// Create Context
const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

// Provider Props
interface NotificationsProviderProps {
  children: ReactNode;
}

// Notifications Provider Component
export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();
  const appState = useRef(AppState.currentState);
  const fallbackAttemptedRef = useRef(false);
  const lastTokenRef = useRef<string | null>(null);
  const [storedNotifications, setNotifications] = useAsyncStorage(
    STORAGE_KEYS.notifications,
    DEFAULT_NOTIFICATIONS,
  );
  const normalizedNotifications = normalizeNotifications(
    storedNotifications || [],
  );
  const [state, dispatch] = useReducer(notificationsReducer, {
    ...initialState,
    notifications: normalizedNotifications,
    unreadCount: getUnreadCount(normalizedNotifications),
  });

  // Update AsyncStorage when notifications change
  useEffect(() => {
    if (Array.isArray(state.notifications)) {
      setNotifications(state.notifications);
    }
  }, [state.notifications, setNotifications]);

  const refreshUnreadNotifications = useCallback(async () => {
    dispatch({ type: NOTIFICATIONS_ACTIONS.SET_LOADING, payload: true });
    try {
      const response = await apiService.notifications.getNotifications({
        unreadOnly: true,
        limit: 50,
      });
      const payload = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
      const normalizedPayload = payload
        .map(coerceNotificationPayload)
        .filter((notification) => notification.id);
      dispatch({
        type: NOTIFICATIONS_ACTIONS.UPSERT_NOTIFICATIONS,
        payload: normalizedPayload,
      });
    } catch (error) {
      dispatch({
        type: NOTIFICATIONS_ACTIONS.SET_ERROR,
        payload: "Failed to fetch notifications",
      });
    } finally {
      dispatch({ type: NOTIFICATIONS_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectNotifications();
      return;
    }

    let isMounted = true;

    const attachHandlers = (socket: ReturnType<typeof connectNotifications>) => {
      socket.off("connect").on("connect", () => {
        refreshUnreadNotifications();
      });

      socket.off("notifications:hello").on("notifications:hello", () => {
        refreshUnreadNotifications();
      });

      socket.off("notifications:new").on("notifications:new", (payload: any) => {
        if (!payload?.id) return;
        dispatch({
          type: NOTIFICATIONS_ACTIONS.UPSERT_NOTIFICATIONS,
          payload: [coerceNotificationPayload(payload)],
        });
      });

      socket.off("notifications:read").on("notifications:read", (payload: any) => {
        dispatch({
          type: NOTIFICATIONS_ACTIONS.MARK_NOTIFICATION_READ,
          payload: { id: payload?.id, readAt: payload?.readAt },
        });
      });

      socket
        .off("notifications:read_all")
        .on("notifications:read_all", (payload: any) => {
          dispatch({
            type: NOTIFICATIONS_ACTIONS.MARK_ALL_NOTIFICATIONS_READ,
            payload: { readAt: payload?.readAt },
          });
        });

      socket
        .off("notifications:dismiss")
        .on("notifications:dismiss", (payload: any) => {
          dispatch({
            type: NOTIFICATIONS_ACTIONS.DISMISS_NOTIFICATION,
            payload: { id: payload?.id, dismissedAt: payload?.dismissedAt },
          });
        });

      socket
        .off("notifications:undismiss")
        .on("notifications:undismiss", (payload: any) => {
          dispatch({
            type: NOTIFICATIONS_ACTIONS.UNDISMISS_NOTIFICATION,
            payload: { id: payload?.id },
          });
        });
    };

    const connectSocket = async (useQueryAuth = false) => {
      const token = await apiService.getAuthToken();
      if (!token || !isMounted) return;

      if (!useQueryAuth) {
        fallbackAttemptedRef.current = false;
      }

      lastTokenRef.current = token;
      const socket = connectNotifications(token, { useQueryAuth });
      attachHandlers(socket);

      socket.off("connect_error").on("connect_error", () => {
        if (useQueryAuth) return;
        if (fallbackAttemptedRef.current) return;
        if (!lastTokenRef.current) return;

        fallbackAttemptedRef.current = true;
        disconnectNotifications();
        const fallbackSocket = connectNotifications(lastTokenRef.current, {
          useQueryAuth: true,
        });
        attachHandlers(fallbackSocket);
      });
    };

    connectSocket();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        connectSocket();
      } else if (nextState.match(/inactive|background/)) {
        disconnectNotifications();
      }
      appState.current = nextState;
    });

    return () => {
      isMounted = false;
      subscription.remove();
      disconnectNotifications();
    };
  }, [appState, isAuthenticated, refreshUnreadNotifications]);

  // Action Creators
  const actions: NotificationsActions = {
    createNotification: (
      userId: string,
      title: string,
      message: string,
      type: Notification["type"] = "info",
    ): Notification => {
      const newNotification = createSystemNotification(
        userId,
        title,
        message,
        type,
      );
      dispatch({
        type: NOTIFICATIONS_ACTIONS.CREATE_NOTIFICATION,
        payload: newNotification,
      });
      return newNotification;
    },

    broadcastNotificationToRole: (
      role: User["role"],
      title: string,
      message: string,
      type: Notification["type"] = "info",
      users: Record<string, User> = {},
    ) => {
      Object.values(users).forEach((user) => {
        if (user.role === role) {
          actions.createNotification(user.id, title, message, type);
        }
      });
    },

    markNotificationAsRead: async (notificationId: string) => {
      try {
        dispatch({
          type: NOTIFICATIONS_ACTIONS.MARK_NOTIFICATION_READ,
          payload: { id: notificationId },
        });
        await apiService.notifications.markAsRead(notificationId);
      } catch (error) {
        actions.setError("Failed to mark notification as read");
      }
    },

    markAllNotificationsAsRead: async (userId?: string) => {
      try {
        dispatch({
          type: NOTIFICATIONS_ACTIONS.MARK_ALL_NOTIFICATIONS_READ,
          payload: { userId },
        });
        await apiService.notifications.markAllAsRead();
      } catch (error) {
        actions.setError("Failed to mark all notifications as read");
      }
    },

    dismissNotification: async (notificationId: string) => {
      try {
        dispatch({
          type: NOTIFICATIONS_ACTIONS.DISMISS_NOTIFICATION,
          payload: { id: notificationId },
        });
        await apiService.notifications.dismissNotification(notificationId);
      } catch (error) {
        actions.setError("Failed to dismiss notification");
      }
    },

    undismissNotification: async (notificationId: string) => {
      try {
        dispatch({
          type: NOTIFICATIONS_ACTIONS.UNDISMISS_NOTIFICATION,
          payload: { id: notificationId },
        });
        await apiService.notifications.undismissNotification(notificationId);
      } catch (error) {
        actions.setError("Failed to restore notification");
      }
    },

    setLoading: (loading: boolean) => {
      dispatch({ type: NOTIFICATIONS_ACTIONS.SET_LOADING, payload: loading });
    },

    setError: (error: string) => {
      dispatch({ type: NOTIFICATIONS_ACTIONS.SET_ERROR, payload: error });
    },

    clearError: () => {
      dispatch({ type: NOTIFICATIONS_ACTIONS.CLEAR_ERROR });
    },
  };

  const value: NotificationsContextType = {
    ...state,
    actions,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

// Custom Hook
export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return context;
};
