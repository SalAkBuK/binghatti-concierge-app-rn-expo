import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useAsyncStorage } from "../hooks/useAsyncStorage";
import { STORAGE_KEYS, DEFAULT_USERS, generateId } from "../utils";
// import { apiService } from '../services/api'; // Temporarily disabled to prevent crashes
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
interface AuthContextType extends AuthState {
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

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [users, setUsers, isLoadingUsers] = useAsyncStorage(STORAGE_KEYS.users, DEFAULT_USERS);
  const [isInitialized, setIsInitialized] = useState(false);
  const [state, dispatch] = useReducer(authReducer, {
    ...initialState,
    users: users || {},
  });

  // Sync users from AsyncStorage to state when loaded (only once on mount)
  useEffect(() => {
    if (!isLoadingUsers && !isInitialized) {
      console.log("[AuthProvider] Users loaded from AsyncStorage:", Object.keys(users));
      dispatch({
        type: AUTH_ACTIONS.SET_USERS,
        payload: users,
      });
      setIsInitialized(true);
    }
  }, [users, isLoadingUsers, isInitialized]);

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

        console.log("[Auth] Login attempt for:", credentials.email);
        console.log("[Auth] Available users:", Object.keys(state.users));

        // TODO: Replace with real API call when ready
        // const response = await apiService.login(credentials);

        // Mock login: Check if user exists in mock data
        const existingUser = state.users[credentials.email];

        if (!existingUser) {
          console.log("[Auth] User not found in state.users");
          throw new Error("Invalid email or password");
        }

        console.log("[Auth] User found:", { email: existingUser.email, role: existingUser.role });

        // In production, verify password here
        // For mock, we accept any password for existing users

        actions.setAuth({
          isAuthenticated: true,
          currentUser: existingUser,
          userRole: existingUser.role,
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
        const newUser: User = {
          id: generateId(Object.values(state.users)).toString(),
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
