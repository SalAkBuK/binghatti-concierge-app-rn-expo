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
  DEFAULT_REQUESTS,
  generateId,
  createSystemNotification,
} from "../utils";
// import { apiService } from '../services/api'; // Temporarily disabled to prevent crashes
import type { Request, CreateRequestDTO, UpdateRequestDTO } from "../types";

// Requests State Interface
interface RequestsState {
  requests: Request[];
  selectedRequest: Request | null;
  loading: boolean;
  error: string | null;
}

// Requests Actions Interface
interface RequestsActions {
  loadRequests: () => Promise<void>;
  createRequest: (
    requestData: CreateRequestDTO,
    tenantId: string,
  ) => Promise<Request>;
  updateRequest: (
    requestId: string,
    updates: UpdateRequestDTO,
  ) => Promise<Request>;
  deleteRequest: (requestId: string) => Promise<Request>;
  setSelectedRequest: (request: Request | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  clearError: () => void;
}

// Requests Context Type
interface RequestsContextType extends RequestsState {
  actions: RequestsActions;
}

// Action Types
const REQUESTS_ACTIONS = {
  SET_REQUESTS: "SET_REQUESTS",
  CREATE_REQUEST: "CREATE_REQUEST",
  UPDATE_REQUEST: "UPDATE_REQUEST",
  DELETE_REQUEST: "DELETE_REQUEST",
  SET_SELECTED_REQUEST: "SET_SELECTED_REQUEST",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
} as const;

type RequestsActionType =
  (typeof REQUESTS_ACTIONS)[keyof typeof REQUESTS_ACTIONS];

interface RequestsAction {
  type: RequestsActionType;
  payload?: any;
}

// Requests Reducer
const requestsReducer = (
  state: RequestsState,
  action: RequestsAction,
): RequestsState => {
  switch (action.type) {
    case REQUESTS_ACTIONS.SET_REQUESTS:
      return {
        ...state,
        requests: action.payload,
      };

    case REQUESTS_ACTIONS.CREATE_REQUEST:
      return {
        ...state,
        requests: [action.payload, ...state.requests],
      };

    case REQUESTS_ACTIONS.UPDATE_REQUEST: {
      const updatedRequest = state.requests.find(
        (req) => req.id === action.payload.id,
      );
      const newRequest = updatedRequest
        ? {
            ...updatedRequest,
            ...action.payload.updates,
            updatedAt: new Date().toISOString(),
          }
        : null;

      return {
        ...state,
        requests: state.requests.map((req) =>
          req.id === action.payload.id && newRequest ? newRequest : req,
        ),
        selectedRequest:
          state.selectedRequest?.id === action.payload.id && newRequest
            ? newRequest
            : state.selectedRequest,
      };
    }

    case REQUESTS_ACTIONS.DELETE_REQUEST:
      return {
        ...state,
        requests: state.requests.filter((req) => req.id !== action.payload),
        selectedRequest:
          state.selectedRequest?.id === action.payload
            ? null
            : state.selectedRequest,
      };

    case REQUESTS_ACTIONS.SET_SELECTED_REQUEST:
      return {
        ...state,
        selectedRequest: action.payload,
      };

    case REQUESTS_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case REQUESTS_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case REQUESTS_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Initial State
const initialState: RequestsState = {
  requests: [],
  selectedRequest: null,
  loading: false,
  error: null,
};

// Create Context
const RequestsContext = createContext<RequestsContextType | undefined>(
  undefined,
);

// Provider Props
interface RequestsProviderProps {
  children: ReactNode;
  onNotificationCreate?: (
    userId: string,
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => void;
}

// Requests Provider Component
export const RequestsProvider: React.FC<RequestsProviderProps> = ({
  children,
  onNotificationCreate,
}) => {
  const [requests, setRequests] = useAsyncStorage(
    STORAGE_KEYS.requests,
    DEFAULT_REQUESTS,
  );
  const [state, dispatch] = useReducer(requestsReducer, {
    ...initialState,
    requests: requests || [],
  });

  // Update AsyncStorage when requests change
  useEffect(() => {
    if (Array.isArray(state.requests)) {
      setRequests(state.requests);
    }
  }, [state.requests, setRequests]);

  // Action Creators
  const actions: RequestsActions = {
    loadRequests: async (): Promise<void> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        // TODO: Replace with real API call
        // const response = await apiService.requests.getRequests();

        // Use existing local storage data for now
        console.log("Mock: Using local storage data for requests");

        actions.setLoading(false);
      } catch (error: any) {
        actions.setError(error.message || "Failed to load requests");
        throw error;
      }
    },

    createRequest: async (
      requestData: CreateRequestDTO,
      tenantId: string,
    ): Promise<Request> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        // Add tenantId to the request data if not already present
        const requestWithTenant = {
          ...requestData,
          tenantId,
        };

        // TODO: Replace with real API call
        // const response = await apiService.requests.createRequest(requestWithTenant);

        // Mock create for now
        const newRequest: Request = {
          id: generateId(state.requests || []).toString(),
          ...requestData,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tenantId,
          assignedTo: undefined,
          attachments: requestData.attachments || [],
          comments: [],
        };

        dispatch({
          type: REQUESTS_ACTIONS.CREATE_REQUEST,
          payload: newRequest,
        });

        // Create notification for tenant
        if (onNotificationCreate) {
          onNotificationCreate(
            tenantId,
            "Request Submitted",
            `Your ${requestData.type} request "${requestData.title}" has been submitted successfully`,
            "success",
          );
        }

        actions.setLoading(false);
        return newRequest;
      } catch (error: any) {
        actions.setError(
          error.message || "Failed to create request. Please try again.",
        );
        throw error;
      }
    },

    updateRequest: async (
      requestId: string,
      updates: UpdateRequestDTO,
    ): Promise<Request> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        const originalRequest = state.requests.find(
          (req) => req.id === requestId,
        );
        if (!originalRequest) {
          throw new Error("Request not found");
        }

        // TODO: Replace with real API call
        // const response = await apiService.requests.updateRequest(requestId, updates);

        // Mock update for now
        dispatch({
          type: REQUESTS_ACTIONS.UPDATE_REQUEST,
          payload: { id: requestId, updates },
        });

        // Create notification if status changed
        if (
          updates.status &&
          updates.status !== originalRequest.status &&
          onNotificationCreate
        ) {
          onNotificationCreate(
            originalRequest.tenantId,
            "Request Status Updated",
            `Your request "${originalRequest.title}" status has been updated to ${updates.status}`,
            "info",
          );
        }

        // Create notification if assigned
        if (
          updates.assignedTo &&
          updates.assignedTo !== originalRequest.assignedTo &&
          onNotificationCreate
        ) {
          onNotificationCreate(
            updates.assignedTo,
            "New Assignment",
            `You have been assigned to work on "${originalRequest.title}" at ${originalRequest.apartment}, ${originalRequest.tower}`,
            "warning",
          );
        }

        actions.setLoading(false);
        const updatedRequest = {
          ...originalRequest,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        return updatedRequest;
      } catch (error: any) {
        actions.setError(
          error.message || "Failed to update request. Please try again.",
        );
        throw error;
      }
    },

    deleteRequest: async (requestId: string): Promise<Request> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        const requestToDelete = state.requests.find(
          (req) => req.id === requestId,
        );

        if (!requestToDelete) {
          throw new Error("Request not found");
        }

        if (
          requestToDelete.status !== "pending" &&
          requestToDelete.status !== "cancelled"
        ) {
          throw new Error("Only pending or cancelled requests can be deleted");
        }

        // TODO: Replace with real API call
        // const response = await apiService.requests.deleteRequest(requestId);

        // Mock delete for now
        dispatch({ type: REQUESTS_ACTIONS.DELETE_REQUEST, payload: requestId });

        // Create notification
        if (onNotificationCreate) {
          onNotificationCreate(
            requestToDelete.tenantId,
            "Request Deleted",
            `Your request "${requestToDelete.title}" has been deleted`,
            "info",
          );
        }

        actions.setLoading(false);
        return requestToDelete;
      } catch (error: any) {
        actions.setError(
          error.message || "Failed to delete request. Please try again.",
        );
        throw error;
      }
    },

    setSelectedRequest: (request: Request | null): void => {
      dispatch({
        type: REQUESTS_ACTIONS.SET_SELECTED_REQUEST,
        payload: request,
      });
    },

    setLoading: (loading: boolean) => {
      dispatch({ type: REQUESTS_ACTIONS.SET_LOADING, payload: loading });
    },

    setError: (error: string) => {
      dispatch({ type: REQUESTS_ACTIONS.SET_ERROR, payload: error });
    },

    clearError: () => {
      dispatch({ type: REQUESTS_ACTIONS.CLEAR_ERROR });
    },
  };

  // Load requests on initialization (temporarily disabled)
  // useEffect(() => {
  //   const initializeRequests = async () => {
  //     try {
  //       await actions.loadRequests();
  //     } catch (error) {
  //       console.warn('Failed to load requests on initialization:', error);
  //       // Fall back to local storage data
  //     }
  //   };

  //   initializeRequests();
  // }, []);

  const value: RequestsContextType = {
    ...state,
    actions,
  };

  return (
    <RequestsContext.Provider value={value}>
      {children}
    </RequestsContext.Provider>
  );
};

// Custom Hook
export const useRequests = (): RequestsContextType => {
  const context = useContext(RequestsContext);
  if (!context) {
    throw new Error("useRequests must be used within a RequestsProvider");
  }
  return context;
};
