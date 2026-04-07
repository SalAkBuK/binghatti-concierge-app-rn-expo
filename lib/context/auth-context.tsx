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
import {
  resolveExplicitUserRole,
  resolveUserRole,
  shouldFetchAssignmentsForAuthRole,
  shouldProbeOwnerRuntimeForAuthRole,
} from "./auth-role";
import { API_ENDPOINTS, STORAGE_KEYS } from "../utils";
import apiService from "../services/api";
import { ownerPortalApi } from "../services/api/owner-portal";
import type { ApiResponse, LoginDTO, User } from "../types";

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

const resolveRoleFromAssignments = (assignments: any[]): User["role"] | null => {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return null;
  }

  const types = assignments
    .map((assignment) => assignment?.type)
    .filter((value) => typeof value === "string")
    .map((value) => value.toUpperCase());

  if (types.some((type) => type.includes("MANAGER") || type.includes("MANAGEMENT"))) {
    return "management";
  }

  if (types.some((type) => type.includes("STAFF") || type.includes("EMPLOYEE"))) {
    return "building_employee";
  }

  return null;
};

const buildAssignmentProfile = (assignments: any[], role: User["role"]) => {
  const assignmentBuildingIds = assignments
    .map((assignment) => assignment?.buildingId)
    .filter((id) => id != null)
    .map((id) => String(id));
  const assignmentBuildingName = assignments.find(
    (assignment) => assignment?.buildingName,
  )?.buildingName;
  const assignmentProfile: Record<string, any> = {};
  if (assignmentBuildingIds.length > 0) {
    assignmentProfile.buildingId = assignmentBuildingIds[0];
    if (role === "management") {
      assignmentProfile.managedBuildingIds = assignmentBuildingIds;
    }
  }
  if (assignmentBuildingName) {
    assignmentProfile.buildingName = assignmentBuildingName;
  }
  return assignmentProfile;
};

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

const OWNER_ACCESS_REQUIRED_CODE = "OWNER_ACCESS_REQUIRED";

const createOwnerAccessError = (): Error & { code: string } => {
  const error = new Error(
    "Owner access is not active for this account.",
  ) as Error & { code: string };
  error.code = OWNER_ACCESS_REQUIRED_CODE;
  return error;
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

  const resolveOwnerRuntimeRole = async (
    role: User["role"] | null,
    source: "login" | "restore",
  ): Promise<User["role"] | null> => {
    if (!shouldProbeOwnerRuntimeForAuthRole(role)) {
      return role;
    }

    try {
      await ownerPortalApi.getSummary();
      console.log(`[Auth] Owner runtime probe succeeded during ${source}`);
      return "owner";
    } catch (error) {
      const status = getStatusCode(error);

      if (status === 401 || status === 403 || status === 404) {
        if (role === "owner") {
          throw createOwnerAccessError();
        }

        console.log(
          `[Auth] Owner runtime probe skipped owner routing during ${source}:`,
          status,
        );
        return role;
      }

      console.warn(
        `[Auth] Owner runtime probe failed during ${source}:`,
        error,
      );
      return role;
    }
  };

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
              let resolvedUser = userData;
              let resolvedRole =
                resolveExplicitUserRole(userData) ?? resolvedUser?.role ?? null;
              resolvedRole = await resolveOwnerRuntimeRole(
                resolvedRole,
                "restore",
              );
              let assignmentsPayload: any[] = [];
              if (shouldFetchAssignmentsForAuthRole(resolvedRole)) {
                try {
                  const assignmentsResponse = await apiService.users.getMyAssignments();
                  assignmentsPayload = Array.isArray(assignmentsResponse)
                    ? assignmentsResponse
                    : Array.isArray(assignmentsResponse?.data)
                      ? assignmentsResponse.data
                      : [];
                  console.log("[AuthProvider] Assignments response:", assignmentsPayload);
                } catch (assignmentError) {
                  console.warn("[AuthProvider] Failed to load assignments:", assignmentError);
                }
              }

              const assignmentRole = resolveRoleFromAssignments(assignmentsPayload);
              if (assignmentRole) {
                resolvedRole = assignmentRole;
                resolvedUser = {
                  ...resolvedUser,
                  role: resolvedRole,
                  profile: {
                    ...(resolvedUser?.profile ?? {}),
                    ...buildAssignmentProfile(assignmentsPayload, resolvedRole),
                  },
                };
              } else if (resolvedRole && resolvedUser?.role !== resolvedRole) {
                resolvedUser = {
                  ...resolvedUser,
                  role: resolvedRole,
                };
              }

              if (resolvedUser?.role == null) {
                resolvedUser = {
                  ...resolvedUser,
                  role: "tenant",
                };
              }

              if (resolvedUser.role === "tenant") {
                resolvedUser = await enrichTenantProfile(resolvedUser);
              }
              console.log('[AuthProvider] Restored user from storage:', { email: resolvedUser.email, role: resolvedUser.role });

              // Restore auth state from saved data
              dispatch({
                type: AUTH_ACTIONS.SET_AUTH,
                payload: {
                  isAuthenticated: true,
                  currentUser: resolvedUser,
                  userRole: resolvedUser.role,
                },
              });

              try {
                await SecureStore.setItemAsync(
                  STORAGE_KEYS.user_data,
                  JSON.stringify(resolvedUser)
                );
              } catch (storageError) {
                console.warn("[Auth] Failed to update user data in SecureStore:", storageError);
              }

              console.log('[AuthProvider] Session restored successfully!');
            } catch (parseError) {
              if (
                parseError &&
                typeof parseError === "object" &&
                "code" in parseError &&
                (parseError as { code?: unknown }).code === OWNER_ACCESS_REQUIRED_CODE
              ) {
                console.warn("[AuthProvider] Stored owner session no longer has active owner access");
              } else {
                console.error('[AuthProvider] Failed to parse saved user data:', parseError);
              }

              // Clear invalid data
              await SecureStore.deleteItemAsync(STORAGE_KEYS.user_data);
              await SecureStore.deleteItemAsync(STORAGE_KEYS.auth_token);
              await SecureStore.deleteItemAsync(STORAGE_KEYS.refresh_token);
            }
          } else {
            console.log('[AuthProvider] No saved user data found, clearing session');
            // Token exists but no user data - clear the orphaned token
            await SecureStore.deleteItemAsync(STORAGE_KEYS.auth_token);
            await SecureStore.deleteItemAsync(STORAGE_KEYS.refresh_token);
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

  const enrichTenantProfile = async (user: User): Promise<User> => {
    try {
      const response = await apiService.get<ApiResponse<any> | any>(
        API_ENDPOINTS.resident.me,
      );

      const responseData =
        (response as ApiResponse<any>)?.data ?? response ?? {};
      const occupancy = responseData.occupancy ?? null;
      const residentUser = responseData.user ?? null;

      if (!occupancy && !residentUser) {
        return user;
      }

      const nextProfile = { ...(user.profile ?? {}) };

      const buildingId =
        occupancy?.buildingId ??
        occupancy?.building?.id ??
        occupancy?.building?.buildingId ??
        occupancy?.building_id;
      if (buildingId != null) {
        nextProfile.buildingId = String(buildingId);
      }

      const buildingName =
        occupancy?.building?.name ??
        occupancy?.buildingName ??
        occupancy?.building?.buildingName ??
        occupancy?.building_name;
      if (buildingName) {
        nextProfile.buildingName = String(buildingName);
      }

      const unitNumber =
        occupancy?.unitNumber ??
        occupancy?.unit?.label ??
        occupancy?.unit?.number ??
        occupancy?.unit?.unitNumber ??
        occupancy?.unit?.name;
      if (unitNumber != null) {
        nextProfile.apartment = String(unitNumber);
      }

      const floorNumber =
        occupancy?.floorNumber ??
        occupancy?.unit?.floor ??
        occupancy?.unit?.floorNumber ??
        occupancy?.floor;
      if (floorNumber != null) {
        nextProfile.floor = String(floorNumber);
      }

      return {
        ...user,
        name:
          residentUser?.name ??
          residentUser?.fullName ??
          user.name,
        phone:
          residentUser?.phone ??
          residentUser?.phoneNumber ??
          user.phone,
        profile: {
          ...nextProfile,
          name:
            residentUser?.name ??
            residentUser?.fullName ??
            nextProfile.name,
          phone:
            residentUser?.phone ??
            residentUser?.phoneNumber ??
            nextProfile.phone,
        },
      };
    } catch (error) {
      console.warn("[Auth] Failed to load resident profile:", error);
      return user;
    }
  };

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
        const response = await apiService.login({
          email: normalizedEmail,
          password: credentials.password,
        });

        const accessToken = response?.accessToken ?? response?.data?.accessToken;
        const refreshToken = response?.refreshToken ?? response?.data?.refreshToken;
        const payloadUser = response?.user ?? response?.data?.user;

        console.log("[Auth] Login response summary:", {
          hasAccessToken: Boolean(accessToken),
          hasRefreshToken: Boolean(refreshToken),
          responseKeys: response && typeof response === "object" ? Object.keys(response) : null,
          dataKeys:
            response?.data && typeof response.data === "object"
              ? Object.keys(response.data)
              : null,
        });
        console.log("[Auth] Login payload user:", payloadUser);
        console.log("[Auth] Login user payload role fields:", {
          id: payloadUser?.id,
          email: payloadUser?.email,
          name: payloadUser?.name ?? payloadUser?.fullName,
          role: payloadUser?.role,
          roleKey: payloadUser?.roleKey,
          roleName: payloadUser?.roleName,
          userRole: payloadUser?.userRole,
          type: payloadUser?.type,
          roles: payloadUser?.roles,
        });

        if (!accessToken || !refreshToken || !payloadUser) {
          throw new Error("Login response did not include required credentials");
        }

        await apiService.setAuthTokens({ accessToken, refreshToken });

        const explicitUserRole = resolveExplicitUserRole(payloadUser);
        let userRole = await resolveOwnerRuntimeRole(explicitUserRole, "login");
        let assignmentsPayload: any[] = [];
        if (shouldFetchAssignmentsForAuthRole(userRole)) {
          try {
            const assignmentsResponse = await apiService.users.getMyAssignments();
            console.log("[Auth] Assignments raw response:", assignmentsResponse);
            assignmentsPayload = Array.isArray(assignmentsResponse)
              ? assignmentsResponse
              : Array.isArray(assignmentsResponse?.data)
                ? assignmentsResponse.data
                : [];
            console.log("[Auth] Assignments response:", assignmentsPayload);
          } catch (assignmentError) {
            console.warn("[Auth] Failed to load assignments:", assignmentError);
          }
        }

        const nowIso = new Date().toISOString();
        const userEmail = (payloadUser.email || normalizedEmail).toLowerCase();
        const existingUser = state.users[userEmail];
        const assignmentRole = resolveRoleFromAssignments(assignmentsPayload);
        if (assignmentRole) {
          userRole = assignmentRole;
        }
        userRole = userRole ?? resolveUserRole(payloadUser);
        console.log("[Auth] Resolved user role:", {
          rawRole: payloadUser?.role ?? payloadUser?.roleKey ?? payloadUser?.roleName ?? payloadUser?.userRole ?? payloadUser?.type,
          explicitRole: explicitUserRole,
          resolvedRole: userRole,
          assignmentRole,
        });

        const assignmentProfile = buildAssignmentProfile(assignmentsPayload, userRole);

        const authenticatedUser: User = {
          id: payloadUser?.id
            ? String(payloadUser.id)
            : existingUser?.id ?? userEmail,
          email: userEmail,
          name:
            payloadUser?.name ??
            payloadUser?.fullName ??
            existingUser?.name ??
            userEmail,
          role: userRole,
          mustChangePassword: !!payloadUser?.mustChangePassword,
          orgId:
            payloadUser?.orgId ??
            (payloadUser as any)?.org_id ??
            existingUser?.orgId,
          phone:
            payloadUser?.phone ??
            payloadUser?.phoneNumber ??
            existingUser?.phone,
          profile: {
            ...(existingUser?.profile ?? {}),
            ...(payloadUser?.profile && typeof payloadUser.profile === "object"
              ? payloadUser.profile
              : {}),
            name:
              payloadUser?.name ??
              payloadUser?.fullName ??
              existingUser?.profile?.name,
            phone:
              payloadUser?.phone ??
              payloadUser?.phoneNumber ??
              existingUser?.profile?.phone,
            ...assignmentProfile,
          },
          createdAt: existingUser?.createdAt ?? payloadUser?.createdAt ?? nowIso,
          updatedAt: payloadUser?.updatedAt ?? nowIso,
        };

        let resolvedUser = authenticatedUser;
        if (userRole === "tenant") {
          resolvedUser = await enrichTenantProfile(authenticatedUser);
        }

        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: { email: userEmail, user: resolvedUser },
        });

        actions.setAuth({
          isAuthenticated: true,
          currentUser: resolvedUser,
          userRole: resolvedUser.role,
        });

        try {
          await SecureStore.setItemAsync(
            STORAGE_KEYS.user_data,
            JSON.stringify(resolvedUser)
          );
        } catch (storageError) {
          console.warn("[Auth] Failed to save user data to SecureStore:", storageError);
        }

        actions.setLoading(false);
      } catch (error: any) {
        let errorMessage = "Login failed. Please try again.";

        if (
          error?.status === 401 ||
          error?.status === 403 ||
          error?.code === "Unauthorized" ||
          error?.message?.code === "Unauthorized"
        ) {
          console.warn("[Auth] Login rejected:", {
            status: error?.status,
            code: error?.code ?? error?.message?.code,
          });
          errorMessage = "Invalid email or password";
        } else if (error?.status === 404) {
          console.warn("[Auth] Login failed: user not found");
          errorMessage = "User not found";
        } else if (error?.status === 500) {
          console.warn("[Auth] Login failed: server error");
          errorMessage = "Server error. Please try again later";
        } else if (error?.code === OWNER_ACCESS_REQUIRED_CODE) {
          console.warn("[Auth] Login failed: owner access is not active");
          errorMessage = "Owner access is not active for this account.";
        } else if (error.code === "NETWORK_ERROR" || error.message?.includes("Network")) {
          console.warn("[Auth] Login failed: network error");
          errorMessage = "Network error. Please check your connection.";
        } else if (typeof error?.message === "string" && error.message.trim().length > 0) {
          errorMessage = error.message;
          console.error("[Auth] Login error:", error);
        } else {
          console.error("[Auth] Login error:", error);
        }

        actions.setError(errorMessage);
        actions.setLoading(false);
        throw new Error(errorMessage);
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
          const pushDeviceToken = await SecureStore.getItemAsync(
            STORAGE_KEYS.push_device_token,
          );
          if (pushDeviceToken) {
            try {
              await apiService.notifications.unregisterPushDevice({
                token: pushDeviceToken,
              });
            } catch (pushError) {
              console.warn("[Auth] Failed to unregister push device:", pushError);
            }
          }

          await apiService.logout();
          await SecureStore.deleteItemAsync(STORAGE_KEYS.user_data);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.auth_token);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.refresh_token);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.push_device_token);
          console.log('[Auth] Session data cleared from SecureStore');
        } catch (storageError) {
          console.warn('[Auth] Failed to clear SecureStore:', storageError);
          // Don't fail logout if storage clear fails
        }

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
        let residentProfileResponse: any;
        let apiCallSuccess = false;
        const resolvedName = (
          userData.name ??
          profileData.name
        )?.trim();
        const resolvedPhone = (
          userData.phone ??
          profileData.phone
        )?.trim();
        const resolvedAvatar =
          (profileData as any).avatarUrl ??
          profileData.avatar ??
          (userData as any).avatarUrl ??
          (userData as any).avatar;
        const resolvedAvatarUrl =
          typeof resolvedAvatar === "string" ? resolvedAvatar.trim() : undefined;
        const updatePayload = {
          ...(resolvedName ? { name: resolvedName } : {}),
          ...(resolvedPhone ? { phone: resolvedPhone } : {}),
          ...(resolvedAvatarUrl ? { avatarUrl: resolvedAvatarUrl } : {}),
        };
        const tenantResidentProfilePayload: Record<string, string> = {};
        const setTenantProfileField = (
          key: string,
          value: unknown,
          fallback?: unknown,
        ) => {
          const selectedValue = value ?? fallback;
          if (typeof selectedValue !== "string") return;
          tenantResidentProfilePayload[key] = selectedValue.trim();
        };
        setTenantProfileField(
          "emergencyContactName",
          (profileData as any).emergencyContactName,
          profileData.emergencyContact,
        );
        setTenantProfileField(
          "emergencyContactPhone",
          (profileData as any).emergencyContactPhone,
          profileData.emergencyPhone,
        );
        setTenantProfileField("currentAddress", (profileData as any).currentAddress);
        setTenantProfileField(
          "passportNumber",
          (profileData as any).passportNumber,
        );
        setTenantProfileField("nationality", (profileData as any).nationality);
        setTenantProfileField(
          "emiratesIdNumber",
          (profileData as any).emiratesIdNumber,
          (profileData as any).emiratesId,
        );
        setTenantProfileField("dateOfBirth", (profileData as any).dateOfBirth);
        setTenantProfileField(
          "preferredBuildingId",
          (profileData as any).preferredBuildingId,
        );
        console.log("[Auth] Updating profile with payload:", updatePayload);

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
            case "building_employee":
              if (Object.keys(updatePayload).length > 0) {
                response = await apiService.updateProfile(updatePayload);
              } else {
                response = { success: true };
              }
              break;

            case "tenant":
              if (Object.keys(updatePayload).length > 0) {
                response = await apiService.updateProfile(updatePayload);
              } else {
                response = { success: true };
              }
              if (Object.keys(tenantResidentProfilePayload).length > 0) {
                try {
                  residentProfileResponse =
                    await apiService.residentSelfService.updateResidentProfile(
                      tenantResidentProfilePayload,
                    );
                } catch (residentProfileError: any) {
                  const is404Resident =
                    residentProfileError?.status === 404 ||
                    residentProfileError?.message?.includes("404") ||
                    residentProfileError?.message?.includes("Not Found");
                  const isNetworkResident =
                    residentProfileError?.message?.includes("Network") ||
                    residentProfileError?.message?.includes("fetch");
                  if (is404Resident || isNetworkResident) {
                    console.warn(
                      `[Auth] Resident profile API not available (${is404Resident ? "404" : "Network error"}), continuing with local merge only`,
                    );
                  } else {
                    throw residentProfileError;
                  }
                }
              }
              break;

            default:
              throw new Error(`Profile update not supported for role: ${role}`);
          }

          if (response && response.success) {
            apiCallSuccess = true;
          }
          console.log("[Auth] Profile update response:", response);
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

        const mergedProfile = {
          ...state.currentUser.profile,
          ...profileData,
        };

        if (resolvedName) {
          mergedProfile.name = resolvedName;
        }
        if (resolvedPhone) {
          mergedProfile.phone = resolvedPhone;
        }
        if (profileData.avatar) {
          mergedProfile.avatar = profileData.avatar;
        } else if (resolvedAvatarUrl) {
          mergedProfile.avatar = resolvedAvatarUrl;
        }

        const responseProfile =
          response?.data?.profile ?? response?.data;
        const residentProfile = residentProfileResponse ?? null;

        const mergedResponseProfile = {
          ...mergedProfile,
          ...(responseProfile && typeof responseProfile === "object"
            ? responseProfile
            : {}),
        } as any;

        if (residentProfile && typeof residentProfile === "object") {
          mergedResponseProfile.currentAddress =
            residentProfile.currentAddress ?? mergedResponseProfile.currentAddress;
          mergedResponseProfile.emergencyContactName =
            residentProfile.emergencyContactName ??
            mergedResponseProfile.emergencyContactName;
          mergedResponseProfile.emergencyContactPhone =
            residentProfile.emergencyContactPhone ??
            mergedResponseProfile.emergencyContactPhone;
          mergedResponseProfile.emergencyContact =
            residentProfile.emergencyContactName ??
            mergedResponseProfile.emergencyContact;
          mergedResponseProfile.emergencyPhone =
            residentProfile.emergencyContactPhone ??
            mergedResponseProfile.emergencyPhone;
          mergedResponseProfile.passportNumber =
            residentProfile.passportNumber ?? mergedResponseProfile.passportNumber;
          mergedResponseProfile.nationality =
            residentProfile.nationality ?? mergedResponseProfile.nationality;
          mergedResponseProfile.emiratesId =
            residentProfile.emiratesIdNumber ?? mergedResponseProfile.emiratesId;
          mergedResponseProfile.dateOfBirth =
            residentProfile.dateOfBirth ?? mergedResponseProfile.dateOfBirth;
          mergedResponseProfile.preferredBuildingId =
            residentProfile.preferredBuildingId ??
            mergedResponseProfile.preferredBuildingId;
        }

        // Update local state (either from server response or with local data)
        const updatedUser = {
          ...state.currentUser,
          name:
            resolvedName ||
            residentProfile?.user?.name ||
            state.currentUser.name,
          phone:
            resolvedPhone ||
            residentProfile?.user?.phone ||
            state.currentUser.phone,
          profile: mergedResponseProfile,
          profileCompleted: true,
        };

        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: {
            email: updatedUser.email,
            user: updatedUser,
          },
        });

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

