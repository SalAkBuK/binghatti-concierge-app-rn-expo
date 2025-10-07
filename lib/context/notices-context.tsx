import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from "react";
import { useAsyncStorage } from "../hooks/useAsyncStorage";
import { DEFAULT_NOTICES } from "../utils/mockData";
import type { MaintenanceNotice } from "../types";

// Storage key for notices
const STORAGE_KEY = "@tower_desk_notices";

// Notices State Interface
interface NoticesState {
  notices: MaintenanceNotice[];
  selectedNotice: MaintenanceNotice | null;
  activeNoticesCount: number;
  loading: boolean;
  error: string | null;
}

// Notices Actions Interface
interface NoticesActions {
  createNotice: (
    noticeData: Omit<MaintenanceNotice, "id" | "createdAt" | "updatedAt">,
  ) => MaintenanceNotice;
  updateNotice: (
    noticeId: string,
    updates: Partial<MaintenanceNotice>,
  ) => Promise<void>;
  deleteNotice: (noticeId: string) => Promise<void>;
  setSelectedNotice: (notice: MaintenanceNotice | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  clearError: () => void;
}

// Notices Context Type
interface NoticesContextType extends NoticesState {
  actions: NoticesActions;
}

// Action Types
const NOTICES_ACTIONS = {
  CREATE_NOTICE: "CREATE_NOTICE",
  UPDATE_NOTICE: "UPDATE_NOTICE",
  DELETE_NOTICE: "DELETE_NOTICE",
  SET_SELECTED_NOTICE: "SET_SELECTED_NOTICE",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  LOAD_NOTICES: "LOAD_NOTICES",
} as const;

type NoticesActionType = (typeof NOTICES_ACTIONS)[keyof typeof NOTICES_ACTIONS];

interface NoticesAction {
  type: NoticesActionType;
  payload?: any;
}

// Notices Reducer
const noticesReducer = (
  state: NoticesState,
  action: NoticesAction,
): NoticesState => {
  switch (action.type) {
    case NOTICES_ACTIONS.LOAD_NOTICES:
      const loadedNotices = action.payload || DEFAULT_NOTICES;
      return {
        ...state,
        notices: loadedNotices,
        activeNoticesCount: loadedNotices.filter(
          (n: MaintenanceNotice) =>
            n.status === "scheduled" || n.status === "in-progress",
        ).length,
        loading: false,
      };

    case NOTICES_ACTIONS.CREATE_NOTICE:
      const newNotices = [action.payload, ...state.notices];
      return {
        ...state,
        notices: newNotices,
        activeNoticesCount: newNotices.filter(
          (n) => n.status === "scheduled" || n.status === "in-progress",
        ).length,
      };

    case NOTICES_ACTIONS.UPDATE_NOTICE:
      const updatedNotices = state.notices.map((notice) =>
        notice.id === action.payload.id
          ? {
              ...notice,
              ...action.payload.updates,
              updatedAt: new Date().toISOString(),
            }
          : notice,
      );
      return {
        ...state,
        notices: updatedNotices,
        activeNoticesCount: updatedNotices.filter(
          (n) => n.status === "scheduled" || n.status === "in-progress",
        ).length,
      };

    case NOTICES_ACTIONS.DELETE_NOTICE:
      const filteredNotices = state.notices.filter(
        (notice) => notice.id !== action.payload,
      );
      return {
        ...state,
        notices: filteredNotices,
        selectedNotice: state.selectedNotice?.id === action.payload ? null : state.selectedNotice,
        activeNoticesCount: filteredNotices.filter(
          (n) => n.status === "scheduled" || n.status === "in-progress",
        ).length,
      };

    case NOTICES_ACTIONS.SET_SELECTED_NOTICE:
      return { ...state, selectedNotice: action.payload };

    case NOTICES_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case NOTICES_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case NOTICES_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    default:
      return state;
  }
};

// Initial State
const initialState: NoticesState = {
  notices: DEFAULT_NOTICES,
  selectedNotice: null,
  activeNoticesCount: 1,
  loading: false,
  error: null,
};

// Create Context
const NoticesContext = createContext<NoticesContextType | undefined>(undefined);

// Provider Props
interface NoticesProviderProps {
  children: ReactNode;
}

// Notices Provider Component
export const NoticesProvider: React.FC<NoticesProviderProps> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(noticesReducer, initialState);
  const [storedValue, setValue, storageLoading] = useAsyncStorage<
    MaintenanceNotice[]
  >(STORAGE_KEY, DEFAULT_NOTICES);

  // Load notices from storage on mount only
  useEffect(() => {
    if (storedValue && state.notices.length === DEFAULT_NOTICES.length) {
      // Only load if we haven't loaded yet (still have default data)
      dispatch({ type: NOTICES_ACTIONS.LOAD_NOTICES, payload: storedValue });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Actions
  const actions: NoticesActions = {
    createNotice: (noticeData) => {
      const newNotice: MaintenanceNotice = {
        ...noticeData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatch({ type: NOTICES_ACTIONS.CREATE_NOTICE, payload: newNotice });

      // Persist to storage after create
      const updatedNotices = [newNotice, ...state.notices];
      setValue(updatedNotices);

      return newNotice;
    },

    updateNotice: async (noticeId, updates) => {
      try {
        dispatch({
          type: NOTICES_ACTIONS.UPDATE_NOTICE,
          payload: { id: noticeId, updates },
        });

        // Persist to storage after update
        const updatedNotices = state.notices.map((notice) =>
          notice.id === noticeId
            ? { ...notice, ...updates, updatedAt: new Date().toISOString() }
            : notice,
        );
        setValue(updatedNotices);
      } catch (error) {
        dispatch({
          type: NOTICES_ACTIONS.SET_ERROR,
          payload:
            error instanceof Error ? error.message : "Failed to update notice",
        });
        throw error;
      }
    },

    deleteNotice: async (noticeId) => {
      try {
        dispatch({ type: NOTICES_ACTIONS.DELETE_NOTICE, payload: noticeId });

        // Persist to storage after delete
        const updatedNotices = state.notices.filter(
          (notice) => notice.id !== noticeId,
        );
        setValue(updatedNotices);
      } catch (error) {
        dispatch({
          type: NOTICES_ACTIONS.SET_ERROR,
          payload:
            error instanceof Error ? error.message : "Failed to delete notice",
        });
        throw error;
      }
    },

    setLoading: (loading) => {
      dispatch({ type: NOTICES_ACTIONS.SET_LOADING, payload: loading });
    },

    setError: (error) => {
      dispatch({ type: NOTICES_ACTIONS.SET_ERROR, payload: error });
    },

    setSelectedNotice: (notice) => {
      dispatch({ type: NOTICES_ACTIONS.SET_SELECTED_NOTICE, payload: notice });
    },

    clearError: () => {
      dispatch({ type: NOTICES_ACTIONS.CLEAR_ERROR });
    },
  };

  const value: NoticesContextType = {
    ...state,
    actions,
  };

  return (
    <NoticesContext.Provider value={value}>{children}</NoticesContext.Provider>
  );
};

// Custom hook to use Notices Context
export const useNotices = (): NoticesContextType => {
  const context = useContext(NoticesContext);
  if (!context) {
    throw new Error("useNotices must be used within a NoticesProvider");
  }
  return context;
};
