import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { useAsyncStorage } from "../hooks/useAsyncStorage";
import { APP_CONFIG, STORAGE_KEYS, generateId } from "../utils";
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
    {}, // No mock users - start fresh
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const storedUsers =
    users && typeof users === "object" ? (users as Record<string, User>) : {};
  const mergedInitialUsers = { ...storedUsers }; // No DEFAULT_USERS
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

      // Remove mock users from previous versions (one-time migration)
      // Mock users have specific email domain patterns
      const mockEmailDomains = ['@demo.com', '@email.com', '@towerdesk.com'];

      const cleanedUsers: Record<string, User> = {};
      let removedMockCount = 0;

      Object.entries(incomingUsers).forEach(([email, user]) => {
        // Skip mock users (check if email contains any mock domain)
        const isMockUser = mockEmailDomains.some(domain => email.includes(domain));

        if (isMockUser) {
          removedMockCount++;
          console.log(`[AuthProvider] Removing mock user: ${email}`);
          return;
        }
        cleanedUsers[email] = user;
      });

      if (removedMockCount > 0) {
        console.log(`[AuthProvider] Removed ${removedMockCount} mock users from storage`);
      }

      // Sanitize users: filter out any with invalid IDs and regenerate if needed
      const sanitizedIncoming: Record<string, User> = {};
      let nextId = 1;

      Object.entries(cleanedUsers).forEach(([email, user]) => {
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

      const mergedUsers = { ...sanitizedIncoming }; // No DEFAULT_USERS

      console.log(
        "[AuthProvider] Users loaded from AsyncStorage:",
        Object.keys(incomingUsers),
      );
      console.log(
        "[AuthProvider] Sanitized users:",
        Object.keys(sanitizedIncoming),
      );
      console.log(
        "[AuthProvider] Merged users (no mock data):",
        Object.keys(mergedUsers),
      );

      dispatch({
        type: AUTH_ACTIONS.SET_USERS,
        payload: mergedUsers,
      });

      // Save sanitized users back to storage if we had to clean any or removed mock users
      if (removedMockCount > 0 ||
          Object.keys(mergedUsers).length !== Object.keys(incomingUsers).length ||
          Object.keys(sanitizedIncoming).length !== Object.keys(incomingUsers).length) {
        console.log('[AuthProvider] Saving cleaned users to storage');
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

  // Initialize auth state from saved session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('[AuthProvider] Initializing auth from saved session...');

        // Check if we have a saved token
        const authState = await apiService.getAuthState();
        console.log('[AuthProvider] Auth state check:', { isAuthenticated: authState.isAuthenticated, hasToken: !!authState.token });

        if (authState.isAuthenticated && authState.token) {
          // Try to get saved user data from SecureStore
          const savedUserData = await SecureStore.getItemAsync(STORAGE_KEYS.user_data);

          if (savedUserData) {
            try {
              const userData = JSON.parse(savedUserData);
              console.log('[AuthProvider] Restored user from storage:', { email: userData.email, role: userData.role });

              // Restore auth state from saved data
              dispatch({
                type: AUTH_ACTIONS.SET_AUTH,
                payload: {
                  isAuthenticated: true,
                  currentUser: userData,
                  userRole: userData.role,
                },
              });

              console.log('[AuthProvider] Session restored successfully!');
            } catch (parseError) {
              console.error('[AuthProvider] Failed to parse saved user data:', parseError);
              // Clear invalid data
              await SecureStore.deleteItemAsync(STORAGE_KEYS.user_data);
              await SecureStore.deleteItemAsync(STORAGE_KEYS.auth_token);
            }
          } else {
            console.log('[AuthProvider] No saved user data found, clearing session');
            // Token exists but no user data - clear the orphaned token
            await SecureStore.deleteItemAsync(STORAGE_KEYS.auth_token);
          }
        } else {
          console.log('[AuthProvider] No active session found');
        }
      } catch (error) {
        // If auth check fails, user is not authenticated
        console.warn('[AuthProvider] Auth initialization failed:', error);
      }
    };

    if (isInitialized) {
      initializeAuth();
    }
  }, [isInitialized]);

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

        // Try backend login first for all users
        // Only fall back to mock authentication if backend login fails with 404
        let authenticatedUser: User | null = null;
        let backendLoginAttempted = false;

        try {
          backendLoginAttempted = true;
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
            // Handle specific HTTP status codes
            if (response.status === 401 || response.status === 403) {
              throw new Error("Invalid email or password");
            }

            if (response.status === 404) {
              throw new Error("User not found");
            }

            if (response.status === 500) {
              throw new Error("Server error. Please try again later");
            }

            // Try to extract error message from response
            const errorMessage =
              (payload &&
                typeof payload === "object" &&
                (payload.message || payload.error || payload.title)) ||
              (typeof payload === "string" ? payload : null) ||
              response.statusText ||
              "Invalid email or password";
            throw new Error(errorMessage);
          }

          const token = extractAuthToken(payload);
          if (!token) {
            throw new Error("Login response did not include an auth token");
          }

          await apiService.setAuthToken(token);

          const payloadUser = extractUserPayload(payload);
          const nowIso = new Date().toISOString();

          // Determine user role from backend response
          // Backend returns roles array with roleName, frontend expects single role string
          let userRole: User["role"] = "admin"; // default
          if (payloadUser?.roles && Array.isArray(payloadUser.roles) && payloadUser.roles.length > 0) {
            const backendRole = payloadUser.roles[0].roleName?.toLowerCase();
            console.log('[Auth] Backend role from API:', payloadUser.roles[0].roleName, '→ lowercase:', backendRole);

            // Map backend role names to frontend role types
            if (backendRole === "towerdesk" || backendRole === "superadmin") {
              userRole = "super_admin";
            } else if (backendRole === "admin") {
              userRole = "admin";
            } else if (backendRole === "manager" || backendRole === "management") {
              userRole = "management";
            } else if (backendRole === "tenant") {
              userRole = "tenant";
            } else if (backendRole === "maintenancestaff") {
              userRole = "building_employee";
            } else if (backendRole === "serviceprovider") {
              userRole = "service_provider";
            }
            console.log('[Auth] Mapped frontend role:', userRole);
          }

          const adminUser: User = {
            id: payloadUser?.id
              ? String(payloadUser.id)
              : existingUser?.id ?? "admin-live",
            email: normalizedEmail,
            name:
              payloadUser?.fullName ??
              payloadUser?.name ??
              payloadUser?.username ??
              existingUser?.name ??
              "Tower Desk Admin",
            role: userRole,
            phone:
              payloadUser?.phoneNumber ??
              payloadUser?.phone ??
              payloadUser?.mobile ??
              existingUser?.phone,
            profile: {
              ...(existingUser?.profile ?? {}),
              ...(payloadUser?.profile && typeof payloadUser.profile === "object"
                ? payloadUser.profile
                : {}),
              name:
                payloadUser?.fullName ??
                payloadUser?.name ??
                existingUser?.profile?.name ??
                "Tower Desk Admin",
              phone:
                payloadUser?.phoneNumber ??
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

          // Fetch full tenant profile if user is a tenant
          if (userRole === "tenant" && payloadUser?.id) {
            try {
              console.log("[Auth] Fetching tenant profile for ID:", payloadUser.id);
              const { tenantsApi } = await import("../services/api/tenants");
              const tenantProfileResponse = await tenantsApi.getTenantById(payloadUser.id);

              if (tenantProfileResponse.success && tenantProfileResponse.data) {
                const tenantData = tenantProfileResponse.data;
                console.log("[Auth] Tenant profile fetched:", tenantData);

                // Update authenticated user with complete tenant profile
                authenticatedUser = {
                  ...authenticatedUser,
                  name: tenantData.fullName || authenticatedUser.name,
                  phone: tenantData.phoneNumber || authenticatedUser.phone,
                  profile: {
                    ...authenticatedUser.profile,
                    buildingId: tenantData.profile?.buildingId
                      ? String(tenantData.profile.buildingId)
                      : authenticatedUser.profile?.buildingId,
                    apartment: tenantData.profile?.unitNumber || authenticatedUser.profile?.apartment,
                    floor: tenantData.profile?.floorNumber
                      ? String(tenantData.profile.floorNumber)
                      : authenticatedUser.profile?.floor,
                    phone: tenantData.phoneNumber || authenticatedUser.profile?.phone,
                    address: tenantData.address || authenticatedUser.profile?.address,
                    nationality: tenantData.nationality || authenticatedUser.profile?.nationality,
                  },
                };

                // Update in storage
                dispatch({
                  type: AUTH_ACTIONS.UPDATE_USER,
                  payload: { email: normalizedEmail, user: authenticatedUser },
                });

                console.log("[Auth] Tenant profile updated with buildingId:", authenticatedUser.profile?.buildingId);
              }
            } catch (tenantError) {
              console.error("[Auth] Failed to fetch tenant profile:", tenantError);
              // Don't fail login if profile fetch fails - continue with basic data
            }
          }
        } catch (backendError: any) {
          // If backend login fails with 404 (user not found in backend),
          // fall back to mock authentication for demo users
          const is404 = backendError.message?.includes("User not found") ||
                        backendError.message?.includes("404");

          if (is404 && existingUser) {
            console.log("[Auth] Backend user not found, falling back to mock authentication");
            authenticatedUser = existingUser;
          } else {
            // For any other error (401, 403, 500, network error, etc.), re-throw
            throw backendError;
          }
        }

        if (!authenticatedUser) {
          throw new Error("Authentication failed");
        }

        console.log("[Auth] User authenticated:", {
          email: authenticatedUser.email,
          role: authenticatedUser.role,
        });

        // In production, verify password for non-admin users here

        // Set auth state
        actions.setAuth({
          isAuthenticated: true,
          currentUser: authenticatedUser,
          userRole: authenticatedUser.role,
        });

        // Persist user data to SecureStore for session restoration
        try {
          await SecureStore.setItemAsync(
            STORAGE_KEYS.user_data,
            JSON.stringify(authenticatedUser)
          );
          console.log("[Auth] User data saved to SecureStore for session persistence");
        } catch (storageError) {
          console.warn("[Auth] Failed to save user data to SecureStore:", storageError);
          // Don't fail login if storage fails - user is still authenticated
        }

        console.log("[Auth] Auth state set successfully");
        actions.setLoading(false);
      } catch (error: any) {
        console.error("[Auth] Login error:", error);

        // Enhanced error handling
        let errorMessage = "Login failed. Please try again.";

        if (error.message) {
          errorMessage = error.message;
        } else if (error.response) {
          // Handle API error responses
          if (error.response.status === 401 || error.response.status === 403) {
            errorMessage = "Invalid email or password";
          } else if (error.response.status === 404) {
            errorMessage = "User not found";
          } else if (error.response.status === 500) {
            errorMessage = "Server error. Please try again later";
          } else if (error.response.data) {
            errorMessage = error.response.data.message || error.response.data.error || errorMessage;
          }
        } else if (error.code === "NETWORK_ERROR" || error.message?.includes("Network")) {
          errorMessage = "Network error. Please check your connection.";
        }

        actions.setError(errorMessage);
        actions.setLoading(false);
        throw new Error(errorMessage);
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

        console.log('[Auth] Logging out, clearing session data...');

        // Clear auth state
        actions.setAuth({
          isAuthenticated: false,
          currentUser: null,
          userRole: null,
        });

        // Clear persisted session data from SecureStore
        try {
          await SecureStore.deleteItemAsync(STORAGE_KEYS.user_data);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.auth_token);
          console.log('[Auth] Session data cleared from SecureStore');
        } catch (storageError) {
          console.warn('[Auth] Failed to clear SecureStore:', storageError);
          // Don't fail logout if storage clear fails
        }

        // TODO: Call backend logout API if needed
        // await apiService.logout();

        actions.setLoading(false);
        console.log('[Auth] Logout completed');
      } catch (error: any) {
        actions.setError(error.message || "Logout failed");
        throw error;
      }
    },

    updateProfile: async (userData: Partial<User>): Promise<User> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        if (!state.currentUser) {
          throw new Error("No user logged in");
        }

        const role = state.currentUser.role;
        const profileData = userData.profile || {};
        let response;
        let apiCallSuccess = false;

        // Try to call backend API, but gracefully handle if endpoints don't exist yet
        try {
          // Route to role-specific endpoint (Option B)
          switch (role) {
            case "admin":
              response = await apiService.users.updateAdminProfile({
                companyName: profileData.companyName || "",
                phone: profileData.phone || "",
                companyWebsite: profileData.companyWebsite,
                companyDescription: profileData.companyDescription,
                companyAddress: profileData.companyAddress,
                companyLogoUrl: profileData.companyLogoUrl,
              });
              break;

            case "management":
              response = await apiService.users.updateManagementProfile({
                name: userData.name || profileData.name || "",
                phone: profileData.phone || "",
                buildingId: profileData.buildingId || "",
                managedBuildingIds: profileData.managedBuildingIds || [],
                jobTitle: profileData.jobTitle,
                department: profileData.department,
                bio: profileData.bio,
                avatar: profileData.avatar,
              });
              break;

            case "tenant":
              response = await apiService.users.updateTenantProfile({
                name: userData.name || profileData.name || "",
                phone: profileData.phone || "",
                buildingId: profileData.buildingId || "",
                apartment: profileData.apartment || "",
                floor: profileData.floor || "",
                tower: profileData.tower,
                emergencyContact: profileData.emergencyContact,
                emergencyPhone: profileData.emergencyPhone,
                emiratesId: profileData.emiratesId,
                avatar: profileData.avatar,
              });
              break;

            default:
              throw new Error(`Profile update not supported for role: ${role}`);
          }

          if (response && response.success) {
            apiCallSuccess = true;
          }
        } catch (apiError: any) {
          // Check if it's a 404 or network error - gracefully handle for demo/development
          const is404 = apiError.status === 404 || apiError.message?.includes("404") || apiError.message?.includes("Not Found");
          const isNetworkError = apiError.message?.includes("Network") || apiError.message?.includes("fetch");

          if (is404 || isNetworkError) {
            console.warn(`[Auth] Profile update API not available (${is404 ? '404' : 'Network error'}), updating locally only`);
            // Continue with local update instead of failing
            apiCallSuccess = false;
          } else {
            // For other errors, re-throw
            throw apiError;
          }
        }

        // Update local state (either from server response or with local data)
        const updatedUser = {
          ...state.currentUser,
          name: userData.name || state.currentUser.name,
          phone: profileData.phone || state.currentUser.phone,
          profile: apiCallSuccess && response?.data
            ? response.data
            : {
                ...state.currentUser.profile,
                ...profileData,
              },
          profileCompleted: true,
        };

        actions.setAuth({
          isAuthenticated: state.isAuthenticated,
          currentUser: updatedUser,
          userRole: updatedUser.role,
        });

        // Persist to secure storage
        await SecureStore.setItemAsync(
          STORAGE_KEYS.user_data,
          JSON.stringify(updatedUser)
        );

        actions.setLoading(false);
        return updatedUser;
      } catch (error: any) {
        actions.setError(error.message || "Profile update failed");
        actions.setLoading(false);
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
