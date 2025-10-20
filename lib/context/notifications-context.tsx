import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from "react";
import { useAsyncStorage } from "../hooks/useAsyncStorage";
import {
  STORAGE_KEYS,
  DEFAULT_NOTIFICATIONS,
  createSystemNotification,
} from "../utils";
import type { Notification, User } from "../types";

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
  markAllNotificationsAsRead: (userId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: (userId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  clearError: () => void;
}

// Notifications Context Type
interface NotificationsContextType extends NotificationsState {
  actions: NotificationsActions;
}

// Action Types
const NOTIFICATIONS_ACTIONS = {
  CREATE_NOTIFICATION: "CREATE_NOTIFICATION",
  MARK_NOTIFICATION_READ: "MARK_NOTIFICATION_READ",
  MARK_ALL_NOTIFICATIONS_READ: "MARK_ALL_NOTIFICATIONS_READ",
  DELETE_NOTIFICATION: "DELETE_NOTIFICATION",
  DELETE_ALL_NOTIFICATIONS: "DELETE_ALL_NOTIFICATIONS",
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

// Notifications Reducer
const notificationsReducer = (
  state: NotificationsState,
  action: NotificationsAction,
): NotificationsState => {
  switch (action.type) {
    case NOTIFICATIONS_ACTIONS.CREATE_NOTIFICATION:
      const newNotifications = [action.payload, ...state.notifications];
      return {
        ...state,
        notifications: newNotifications,
        unreadCount: newNotifications.filter((n) => !n.read).length,
      };

    case NOTIFICATIONS_ACTIONS.MARK_NOTIFICATION_READ:
      const updatedNotifications = state.notifications.map((notif) =>
        notif.id === action.payload ? { ...notif, read: true } : notif,
      );
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter((n) => !n.read).length,
      };

    case NOTIFICATIONS_ACTIONS.MARK_ALL_NOTIFICATIONS_READ:
      const allReadNotifications = state.notifications.map((notif) =>
        notif.userId === action.payload ? { ...notif, read: true } : notif,
      );
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: allReadNotifications.filter((n) => !n.read).length,
      };

    case NOTIFICATIONS_ACTIONS.DELETE_NOTIFICATION:
      const remainingNotifications = state.notifications.filter(
        (notif) => notif.id !== action.payload,
      );
      return {
        ...state,
        notifications: remainingNotifications,
        unreadCount: remainingNotifications.filter((n) => !n.read).length,
      };

    case NOTIFICATIONS_ACTIONS.DELETE_ALL_NOTIFICATIONS:
      const filteredNotifications = state.notifications.filter(
        (notif) => notif.userId !== action.payload,
      );
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter((n) => !n.read).length,
      };

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
  const [notifications, setNotifications] = useAsyncStorage(
    STORAGE_KEYS.notifications,
    DEFAULT_NOTIFICATIONS,
  );
  const [state, dispatch] = useReducer(notificationsReducer, {
    ...initialState,
    notifications: notifications || [],
    unreadCount: (notifications || []).filter((n) => !n.read).length,
  });

  // Update AsyncStorage when notifications change
  useEffect(() => {
    if (Array.isArray(state.notifications)) {
      setNotifications(state.notifications);
    }
  }, [state.notifications, setNotifications]);

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
          payload: notificationId,
        });
      } catch (error) {
        actions.setError("Failed to mark notification as read");
      }
    },

    markAllNotificationsAsRead: async (userId?: string) => {
      try {
        dispatch({
          type: NOTIFICATIONS_ACTIONS.MARK_ALL_NOTIFICATIONS_READ,
          payload: userId,
        });
      } catch (error) {
        actions.setError("Failed to mark all notifications as read");
      }
    },

    deleteNotification: async (notificationId: string) => {
      try {
        dispatch({
          type: NOTIFICATIONS_ACTIONS.DELETE_NOTIFICATION,
          payload: notificationId,
        });
      } catch (error) {
        actions.setError("Failed to delete notification");
      }
    },

    deleteAllNotifications: async (userId: string) => {
      try {
        dispatch({
          type: NOTIFICATIONS_ACTIONS.DELETE_ALL_NOTIFICATIONS,
          payload: userId,
        });
      } catch (error) {
        actions.setError("Failed to delete all notifications");
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
