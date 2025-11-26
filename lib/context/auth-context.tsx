import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useAsyncStorage } from "../hooks/useAsyncStorage";
import { APP_CONFIG, STORAGE_KEYS, DEFAULT_USERS, generateId } from "../utils";
import apiService from "../services/api";
import type { User, LoginDTO, RegisterDTO } from "../types";

// Auth State Interface
interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  userRole: string | null;
  users: Record<string, User>;
  loading: boolean;
  error: string | null;
}

// Auth Actions Interface
interface AuthActions {
  setAuth: (authData: {
    isAuthenticated: boolean;
    currentUser: User | null;
    userRole: string | null;
  }) => void;
  login: (credentials: LoginDTO) => Promise<void>;
  register: (userData: RegisterDTO) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<User>;
  updateUser: (email: string, userData: User) => Promise<User>;
  addUser: (email: string, userData: User) => void;
  deleteUser: (email: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  clearError: () => void;
}

// Auth Context Type
export interface AuthContextType extends AuthState {
  actions: AuthActions;
}

// Action Types
const AUTH_ACTIONS = {
  SET_AUTH: "SET_AUTH",
  SET_USERS: "SET_USERS",
  UPDATE_USER: "UPDATE_USER",
  ADD_USER: "ADD_USER",
  DELETE_USER: "DELETE_USER",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
} as const;

type AuthActionType = (typeof AUTH_ACTIONS)[keyof typeof AUTH_ACTIONS];

interface AuthAction {
  type: AuthActionType;
  payload?: any;
}

// Auth Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_AUTH:
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        currentUser: action.payload.currentUser,
        userRole: action.payload.userRole,
      };

    case AUTH_ACTIONS.SET_USERS:
      return {
        ...state,
        users: action.payload,
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        users: {
          ...state.users,
          [action.payload.email]: action.payload.user,
        },
        currentUser:
          state.currentUser?.email === action.payload.email
            ? action.payload.user
            : state.currentUser,
      };

    case AUTH_ACTIONS.ADD_USER:
      return {
        ...state,
        users: {
          ...state.users,
          [action.payload.email]: action.payload.user,
        },
      };

    case AUTH_ACTIONS.DELETE_USER:
      const { [action.payload]: deletedUser, ...remainingUsers } = state.users;
      return {
        ...state,
        users: remainingUsers,
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Initial State
const initialState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  userRole: null,
  users: {},
  loading: false,
  error: null,
};

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

const ADMIN_LOGIN_EMAIL = "admin@towerdesk.com";

const safeJsonParse = (raw: string): any => {
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const extractAuthToken = (payload: any): string | undefined => {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  return (
    payload.token ??
    payload.access_token ??
    payload.accessToken ??
    payload.data?.token ??
    payload.data?.access_token ??
    payload.data?.accessToken ??
    payload.result?.token ??
    payload.data?.result?.token
  );
};

const extractUserPayload = (payload: any): any => {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  if (payload.user && typeof payload.user === "object") {
    return payload.user;
  }

  if (payload.data && typeof payload.data === "object") {
    if (payload.data.user && typeof payload.data.user === "object") {
      return payload.data.user;
    }
    return payload.data;
  }

  return undefined;
};

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [users, setUsers, isLoadingUsers] = useAsyncStorage(
    STORAGE_KEYS.users,
    DEFAULT_USERS,
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const storedUsers =
    users && typeof users === "object" ? (users as Record<string, User>) : {};
  const mergedInitialUsers = { ...DEFAULT_USERS, ...storedUsers };
  const [state, dispatch] = useReducer(authReducer, {
    ...initialState,
    users: mergedInitialUsers,
  });

  // Sync users from AsyncStorage to state when loaded (only once on mount)
  useEffect(() => {
    if (!isLoadingUsers && !isInitialized) {
      const incomingUsers =
        users && typeof users === "object"
          ? (users as Record<string, User>)
          : {};

      // Sanitize users: filter out any with invalid IDs and regenerate if needed
      const sanitizedIncoming: Record<string, User> = {};
      let nextId = 1;

      Object.entries(incomingUsers).forEach(([email, user]) => {
        // Check if user has a valid ID
        const hasValidId = user.id != null &&
                          user.id !== undefined &&
                          user.id !== '' &&
                          user.id !== 'NaN' &&
                          !isNaN(Number(user.id)) ||
                          (typeof user.id === 'string' && user.id.length > 0 && user.id !== 'NaN');

        if (hasValidId) {
          sanitizedIncoming[email] = user;
          // Track highest numeric ID
          const numericId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
          if (!isNaN(numericId) && numericId >= nextId) {
            nextId = numericId + 1;
          }
        } else {
          // Regenerate ID for invalid users
          console.warn(`[AuthProvider] User ${email} has invalid ID:`, user.id, "- regenerating");
          sanitizedIncoming[email] = {
            ...user,
            id: String(nextId++),
          };
        }
      });

      const mergedUsers = { ...DEFAULT_USERS, ...sanitizedIncoming };

      console.log(
        "[AuthProvider] Users loaded from AsyncStorage:",
        Object.keys(incomingUsers),
      );
      console.log(
        "[AuthProvider] Sanitized users:",
        Object.keys(sanitizedIncoming),
      );
      console.log(
        "[AuthProvider] Users after merging defaults:",
        Object.keys(mergedUsers),
      );

      dispatch({
        type: AUTH_ACTIONS.SET_USERS,
        payload: mergedUsers,
      });

      // Save sanitized users back to storage if we had to clean any
      if (Object.keys(mergedUsers).length !== Object.keys(incomingUsers).length ||
          Object.keys(sanitizedIncoming).length !== Object.keys(incomingUsers).length) {
        setUsers(mergedUsers);
      }
      setIsInitialized(true);
    }
  }, [users, isLoadingUsers, isInitialized, setUsers]);

  // Update AsyncStorage when users change (but not on initial load)
  useEffect(() => {
    if (isInitialized && state.users && typeof state.users === "object") {
      setUsers(state.users);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.users, isInitialized]);

  // Initialize auth state from API service (temporarily disabled)
  // useEffect(() => {
  //   const initializeAuth = async () => {
  //     try {
  //       const authState = await apiService.getAuthState();
  //       if (authState.isAuthenticated) {
  //         // Try to get user profile
  //         const profileResponse = await apiService.getProfile();
  //         if (profileResponse.success && profileResponse.data) {
  //           dispatch({
  //             type: AUTH_ACTIONS.SET_AUTH,
  //             payload: {
  //               isAuthenticated: true,
  //               currentUser: profileResponse.data,
  //               userRole: profileResponse.data.role,
  //             },
  //           });
  //         }
  //       }
  //     } catch (error) {
  //       // If auth check fails, user is not authenticated
  //       console.warn('Auth initialization failed:', error);
  //     }
  //   };

  //   initializeAuth();
  // }, []);

  // Action Creators
  const actions: AuthActions = {
    setAuth: (authData) => {
      dispatch({ type: AUTH_ACTIONS.SET_AUTH, payload: authData });
    },

    login: async (credentials: LoginDTO): Promise<void> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        const normalizedEmail = credentials.email.trim().toLowerCase();

        console.log("[Auth] Login attempt for:", normalizedEmail);
        console.log("[Auth] Available users:", Object.keys(state.users));

        const existingUser =
          state.users[normalizedEmail] || state.users[credentials.email];

        const isAdminLogin = normalizedEmail === ADMIN_LOGIN_EMAIL;
        let authenticatedUser: User | null = null;

        if (isAdminLogin) {
          const response = await fetch(APP_CONFIG.api.adminLoginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const rawPayload = await response.text();
          const payload = safeJsonParse(rawPayload);

          if (!response.ok) {
            const errorMessage =
              (payload &&
                typeof payload === "object" &&
                (payload.message || payload.error || payload.title)) ||
              (typeof payload === "string" ? payload : null) ||
              response.statusText ||
              "Invalid admin credentials";
            throw new Error(errorMessage);
          }

          const token = extractAuthToken(payload);
          if (!token) {
            throw new Error("Login response did not include an auth token");
          }

          await apiService.setAuthToken(token);

          const payloadUser = extractUserPayload(payload);
          const nowIso = new Date().toISOString();
          const adminUser: User = {
            id: payloadUser?.id
              ? String(payloadUser.id)
              : existingUser?.id ?? "admin-live",
            email: normalizedEmail,
            name:
              payloadUser?.name ??
              payloadUser?.fullName ??
              payloadUser?.username ??
              existingUser?.name ??
              "Tower Desk Admin",
            role: "admin",
            phone:
              payloadUser?.phone ??
              payloadUser?.mobile ??
              existingUser?.phone,
            profile: {
              ...(existingUser?.profile ?? {}),
              ...(payloadUser?.profile && typeof payloadUser.profile === "object"
                ? payloadUser.profile
                : {}),
              name:
                payloadUser?.name ??
                payloadUser?.fullName ??
                existingUser?.profile?.name ??
                "Tower Desk Admin",
              phone:
                payloadUser?.phone ??
                payloadUser?.mobile ??
                existingUser?.profile?.phone,
            },
            createdAt: existingUser?.createdAt ?? nowIso,
            updatedAt: nowIso,
          };

          dispatch({
            type: AUTH_ACTIONS.UPDATE_USER,
            payload: { email: normalizedEmail, user: adminUser },
          });

          authenticatedUser = adminUser;
        } else {
          if (!existingUser) {
            console.log("[Auth] User not found in state.users");
            throw new Error("Invalid email or password");
          }

          authenticatedUser = existingUser;
        }

        if (!authenticatedUser) {
          throw new Error("Authentication failed");
        }

        console.log("[Auth] User authenticated:", {
          email: authenticatedUser.email,
          role: authenticatedUser.role,
        });

        // In production, verify password for non-admin users here

        actions.setAuth({
          isAuthenticated: true,
          currentUser: authenticatedUser,
          userRole: authenticatedUser.role,
        });

        console.log("[Auth] Auth state set successfully");
        actions.setLoading(false);
      } catch (error: any) {
        console.error("[Auth] Login error:", error);
        actions.setError(error.message || "Login failed");
        throw error;
      }
    },

    register: async (userData: RegisterDTO): Promise<void> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        // TODO: Replace with real API call
        // const response = await apiService.register(userData);

        // Check if user already exists
        if (state.users[userData.email]) {
          throw new Error("User with this email already exists");
        }

        // Create new user with provided role (default to tenant)
        const generatedId = generateId(Object.values(state.users));

        // Validate generated ID
        if (isNaN(generatedId) || generatedId < 1) {
          console.error("[Auth] generateId returned invalid ID:", generatedId);
          throw new Error("Failed to generate valid user ID");
        }

        const newUser: User = {
          id: generatedId.toString(),
          email: userData.email,
          name: userData.name,
          role: (userData as any).role || "tenant", // Use role from signup or default to tenant
          phone: userData.phone,
          profile: {
            name: userData.name,
            phone: userData.phone,
            apartment: userData.apartment,
            tower: userData.tower,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        console.log("[Auth] Created new user with ID:", newUser.id);

        // Add user to users record
        actions.addUser(userData.email, newUser);

        actions.setLoading(false);
      } catch (error: any) {
        actions.setError(error.message || "Registration failed");
        throw error;
      }
    },

    logout: async (): Promise<void> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        // TODO: Replace with real API call
        // await apiService.logout();

        actions.setAuth({
          isAuthenticated: false,
          currentUser: null,
          userRole: null,
        });

        actions.setLoading(false);
      } catch (error: any) {
        actions.setError(error.message || "Logout failed");
        throw error;
      }
    },

    updateProfile: async (userData: Partial<User>): Promise<User> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        // TODO: Replace with real API call
        // const response = await apiService.updateProfile(userData);

        // Mock update for now
        const updatedUser = { ...state.currentUser, ...userData } as User;

        actions.setAuth({
          isAuthenticated: state.isAuthenticated,
          currentUser: updatedUser,
          userRole: updatedUser.role,
        });

        actions.setLoading(false);
        return updatedUser;
      } catch (error: any) {
        actions.setError(error.message || "Profile update failed");
        throw error;
      }
    },

    updateUser: async (email: string, userData: User): Promise<User> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: { email, user: userData },
        });

        actions.setLoading(false);
        return userData;
      } catch (error) {
        actions.setError("Failed to update user profile");
        throw error;
      }
    },

    addUser: (email: string, userData: User) => {
      dispatch({
        type: AUTH_ACTIONS.ADD_USER,
        payload: { email, user: userData },
      });
    },

    deleteUser: async (email: string) => {
      try {
        actions.setLoading(true);
        actions.clearError();

        dispatch({ type: AUTH_ACTIONS.DELETE_USER, payload: email });

        actions.setLoading(false);
      } catch (error) {
        actions.setError("Failed to delete user");
        throw error;
      }
    },

    setLoading: (loading: boolean) => {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: loading });
    },

    setError: (error: string) => {
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: error });
    },

    clearError: () => {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    },
  };

  const value: AuthContextType = {
    ...state,
    actions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
