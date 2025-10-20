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
import type {
  Request,
  CreateRequestDTO,
  UpdateRequestDTO,
  RequestMessage,
  RequestNote,
  RequestTimelineEvent,
  CreateRequestMessageDTO,
  CreateRequestNoteDTO,
  CreateRequestTimelineEventDTO,
} from "../types";

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
  addRequestMessage: (
    payload: CreateRequestMessageDTO,
  ) => Promise<RequestMessage>;
  addRequestNote: (payload: CreateRequestNoteDTO) => Promise<RequestNote>;
  logTimelineEvent: (
    payload: CreateRequestTimelineEventDTO,
  ) => RequestTimelineEvent;
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
  ADD_MESSAGE: "ADD_MESSAGE",
  ADD_NOTE: "ADD_NOTE",
  ADD_TIMELINE_EVENT: "ADD_TIMELINE_EVENT",
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

    case REQUESTS_ACTIONS.ADD_MESSAGE: {
      const { requestId, message } = action.payload;
      return {
        ...state,
        requests: state.requests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                messages: [...(req.messages ?? []), message],
                updatedAt: message.createdAt,
              }
            : req,
        ),
      };
    }

    case REQUESTS_ACTIONS.ADD_NOTE: {
      const { requestId, note } = action.payload;
      return {
        ...state,
        requests: state.requests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                notes: [...(req.notes ?? []), note],
                updatedAt: note.createdAt,
              }
            : req,
        ),
      };
    }

    case REQUESTS_ACTIONS.ADD_TIMELINE_EVENT: {
      const { requestId, event } = action.payload;
      return {
        ...state,
        requests: state.requests.map((req) =>
          req.id === requestId
            ? {
                ...req,
                timeline: [...(req.timeline ?? []), event].sort(
                  (a: RequestTimelineEvent, b: RequestTimelineEvent) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime(),
                ),
                updatedAt: event.createdAt,
              }
            : req,
        ),
      };
    }

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

const ensureRequestShape = (request: Request): Request => {
  const createdAt = request.createdAt
    ? new Date(request.createdAt)
    : new Date();
  const defaultSla = new Date(
    createdAt.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();

  return {
    ...request,
    attachments: request.attachments ?? [],
    comments: request.comments ?? [],
    messages: request.messages ?? [],
    notes: request.notes ?? [],
    timeline: request.timeline ?? [],
    slaDueAt: request.slaDueAt ?? defaultSla,
    lastEscalatedAt: request.lastEscalatedAt,
  };
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
    requests: Array.isArray(requests)
      ? requests.map((request) => ensureRequestShape(request))
      : [],
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

        const normalized = Array.isArray(requests)
          ? requests.map((request) => ensureRequestShape(request))
          : DEFAULT_REQUESTS.map((request) => ensureRequestShape(request));

        dispatch({
          type: REQUESTS_ACTIONS.SET_REQUESTS,
          payload: normalized,
        });

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

        // TODO: Replace with real API call
        // const response = await apiService.requests.createRequest(requestWithTenant);

        // Mock create for now
        const newRequestId = generateId(state.requests || []).toString();
        const submittedAt = new Date();
        const baseRequest: Request = {
          id: newRequestId,
          ...requestData,
          status: "pending",
          createdAt: submittedAt.toISOString(),
          updatedAt: submittedAt.toISOString(),
          tenantId,
          assignedTo: undefined,
          attachments: requestData.attachments || [],
          comments: [],
          slaDueAt:
            requestData.slaDueAt ??
            new Date(submittedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          lastEscalatedAt: undefined,
          messages: [],
          notes: [],
          timeline: [
            {
              id: `timeline-${newRequestId}-submitted`,
              requestId: newRequestId,
              eventType: "status_change",
              title: "Request Submitted",
              description: `${requestData.type} request created by tenant`,
              actorId: tenantId,
              actorName: undefined,
              createdAt: submittedAt.toISOString(),
            },
          ],
        };

        const newRequest = ensureRequestShape(baseRequest);

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

        const timelineTimestamp = new Date().toISOString();

        if (updates.status && updates.status !== originalRequest.status) {
          dispatch({
            type: REQUESTS_ACTIONS.ADD_TIMELINE_EVENT,
            payload: {
              requestId,
              event: {
                id: `timeline-${requestId}-status-${Date.now()}`,
                requestId,
                eventType: "status_change",
                title: `Status updated to ${updates.status}`,
                description: `Status changed from ${originalRequest.status} to ${updates.status}.`,
                actorId: undefined,
                actorName: undefined,
                createdAt: timelineTimestamp,
              },
            },
          });
        }

        if (
          updates.assignedTo &&
          updates.assignedTo !== originalRequest.assignedTo
        ) {
          dispatch({
            type: REQUESTS_ACTIONS.ADD_TIMELINE_EVENT,
            payload: {
              requestId,
              event: {
                id: `timeline-${requestId}-assignment-${Date.now()}`,
                requestId,
                eventType: "assignment",
                title: "Assignment updated",
                description: `Reassigned to user ${updates.assignedTo}.`,
                actorId: updates.assignedTo,
                actorName: undefined,
                createdAt: timelineTimestamp,
              },
            },
          });
        }

        actions.setLoading(false);
        const updatedRequest = ensureRequestShape({
          ...originalRequest,
          ...updates,
          updatedAt: timelineTimestamp,
        });
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

    addRequestMessage: async (
      payload: CreateRequestMessageDTO,
    ): Promise<RequestMessage> => {
      const targetRequest = state.requests.find(
        (req) => req.id === payload.requestId,
      );

      if (!targetRequest) {
        throw new Error("Request not found");
      }

      const timestamp = new Date().toISOString();
      const message: RequestMessage = {
        id: `msg-${payload.requestId}-${Date.now()}`,
        requestId: payload.requestId,
        senderId: payload.senderId,
        senderName: payload.senderName,
        senderRole: payload.senderRole,
        channel: payload.channel,
        body: payload.body,
        attachments: payload.attachments,
        createdAt: timestamp,
      };

      dispatch({
        type: REQUESTS_ACTIONS.ADD_MESSAGE,
        payload: { requestId: payload.requestId, message },
      });

      dispatch({
        type: REQUESTS_ACTIONS.ADD_TIMELINE_EVENT,
        payload: {
          requestId: payload.requestId,
          event: {
            id: `timeline-${payload.requestId}-message-${Date.now()}`,
            requestId: payload.requestId,
            eventType: "message",
            title: `Message from ${payload.senderName}`,
            description: payload.body.slice(0, 140),
            actorId: payload.senderId,
            actorName: payload.senderName,
            metadata: { channel: payload.channel },
            createdAt: timestamp,
          },
        },
      });

      return message;
    },

    addRequestNote: async (
      payload: CreateRequestNoteDTO,
    ): Promise<RequestNote> => {
      const targetRequest = state.requests.find(
        (req) => req.id === payload.requestId,
      );

      if (!targetRequest) {
        throw new Error("Request not found");
      }

      const timestamp = new Date().toISOString();
      const note: RequestNote = {
        id: `note-${payload.requestId}-${Date.now()}`,
        requestId: payload.requestId,
        authorId: payload.authorId,
        authorName: payload.authorName,
        body: payload.body,
        visibility: payload.visibility ?? "management",
        createdAt: timestamp,
      };

      dispatch({
        type: REQUESTS_ACTIONS.ADD_NOTE,
        payload: { requestId: payload.requestId, note },
      });

      dispatch({
        type: REQUESTS_ACTIONS.ADD_TIMELINE_EVENT,
        payload: {
          requestId: payload.requestId,
          event: {
            id: `timeline-${payload.requestId}-note-${Date.now()}`,
            requestId: payload.requestId,
            eventType: "note",
            title: "Internal note added",
            description: payload.body.slice(0, 140),
            actorId: payload.authorId,
            actorName: payload.authorName,
            metadata: { visibility: payload.visibility ?? "management" },
            createdAt: timestamp,
          },
        },
      });

      return note;
    },

    logTimelineEvent: (
      payload: CreateRequestTimelineEventDTO,
    ): RequestTimelineEvent => {
      const targetRequest = state.requests.find(
        (req) => req.id === payload.requestId,
      );

      if (!targetRequest) {
        throw new Error("Request not found");
      }

      const timestamp = new Date().toISOString();
      const event: RequestTimelineEvent = {
        id: `timeline-${payload.requestId}-${Date.now()}`,
        requestId: payload.requestId,
        eventType: payload.eventType,
        title: payload.title,
        description: payload.description,
        actorId: payload.actorId,
        actorName: payload.actorName,
        metadata: payload.metadata,
        createdAt: timestamp,
      };

      dispatch({
        type: REQUESTS_ACTIONS.ADD_TIMELINE_EVENT,
        payload: { requestId: payload.requestId, event },
      });

      return event;
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
