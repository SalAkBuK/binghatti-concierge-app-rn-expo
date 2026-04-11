import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { useAsyncStorage } from "../hooks/useAsyncStorage";
import { clearResidentRequestsCache } from "../hooks/useResidentRequests";
import { clearResidentContractCache } from "../hooks/useResidentSelfService";
import { invalidateResidentTenancy } from "../hooks/useResidentTenancy";
import {
  getDefaultRoleFromPersona,
  getMobileWorkspaces,
  getResidentWorkspaceAccessLevel,
  getRoleForMobileWorkspace,
  normalizeUserPersona,
} from "../config/mobile-workspaces";
import { API_ENDPOINTS, STORAGE_KEYS } from "../utils";
import apiService from "../services/api";
import { ownerPortalApi } from "../services/api/owner-portal";
import type { ApiResponse, LoginDTO, MobileWorkspace, User } from "../types";

// Auth State Interface
interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  userRole: string | null;
  users: Record<string, User>;
  loading: boolean;
  error: string | null;
}

export type AuthBootstrapStatus = "restoring" | "ready" | "error";

// Auth Actions Interface
interface AuthActions {
  setAuth: (authData: {
    isAuthenticated: boolean;
    currentUser: User | null;
    userRole: string | null;
  }) => void;
  login: (credentials: LoginDTO) => Promise<void>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<User | null>;
  updateProfile: (userData: Partial<User>) => Promise<User>;
  updateUser: (email: string, userData: User) => Promise<User>;
  addUser: (email: string, userData: User) => void;
  deleteUser: (email: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  clearError: () => void;
  retryBootstrap: () => void;
  recoverFromBootstrapError: () => Promise<void>;
  selectWorkspace: (workspace: MobileWorkspace) => Promise<void>;
}

// Auth Context Type
export interface AuthContextType extends AuthState {
  bootstrapStatus: AuthBootstrapStatus;
  bootstrapError: string | null;
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

const asAccessEntries = (value: unknown): Record<string, any>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (entry): entry is Record<string, any> =>
        entry != null && typeof entry === "object",
    );
  }

  if (value != null && typeof value === "object") {
    return [value as Record<string, any>];
  }

  return [];
};

const buildAccessProfile = (
  payloadUser: any,
  role: User["role"] | null,
) => {
  const buildingAccess = [
    ...asAccessEntries(payloadUser?.buildingAccess),
    ...asAccessEntries(payloadUser?.buildingAssignments),
  ];
  const buildingIds = buildingAccess
    .map(
      (entry) =>
        entry?.scopeId ??
        entry?.buildingId ??
        entry?.building?.id ??
        entry?.building?.buildingId,
    )
    .filter((id) => id != null)
    .map((id) => String(id));
  const buildingName = buildingAccess.find(
    (entry) => entry?.buildingName ?? entry?.building?.name ?? entry?.building?.buildingName,
  );
  const resident = payloadUser?.resident ?? null;
  const residentBuildingId =
    resident?.buildingId ??
    resident?.building?.id ??
    resident?.building?.buildingId;
  const residentBuildingName =
    resident?.buildingName ??
    resident?.building?.name ??
    resident?.building?.buildingName;
  const residentApartment =
    resident?.unitLabel ??
    resident?.unitNumber ??
    resident?.unit?.label ??
    resident?.unit?.number ??
    resident?.unit?.unitNumber ??
    resident?.unit?.name;
  const residentFloor =
    resident?.floor ??
    resident?.floorNumber ??
    resident?.unit?.floor ??
    resident?.unit?.floorNumber;

  const accessProfile: Record<string, any> = {};

  if (buildingIds.length > 0) {
    accessProfile.buildingId = buildingIds[0];
    if (role === "management") {
      accessProfile.managedBuildingIds = buildingIds;
    }
  } else if (residentBuildingId != null) {
    accessProfile.buildingId = String(residentBuildingId);
  }

  const derivedBuildingName =
    buildingName?.buildingName ??
    buildingName?.building?.name ??
    buildingName?.building?.buildingName ??
    residentBuildingName;
  if (derivedBuildingName) {
    accessProfile.buildingName = String(derivedBuildingName);
  }

  if (residentApartment != null) {
    accessProfile.apartment = String(residentApartment);
  }

  if (residentFloor != null) {
    accessProfile.floor = String(residentFloor);
  }

  return accessProfile;
};

const normalizeComparableString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const normalizeComparableStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeComparableString(entry))
    .filter((entry): entry is string => Boolean(entry))
    .sort();
};

const getUserRefreshSignature = (user: User): string => {
  const resident =
    user.resident && typeof user.resident === "object"
      ? (user.resident as Record<string, unknown>)
      : null;
  const residentUnit =
    resident?.unit && typeof resident.unit === "object"
      ? (resident.unit as Record<string, unknown>)
      : null;
  const profile =
    user.profile && typeof user.profile === "object"
      ? (user.profile as Record<string, unknown>)
      : null;
  const persona = user.persona;

  return JSON.stringify({
    id: user.id,
    email: user.email,
    name: normalizeComparableString(user.name),
    phone: normalizeComparableString(user.phone),
    role: user.role,
    orgId: normalizeComparableString(user.orgId),
    activeWorkspace: normalizeComparableString(user.activeWorkspace),
    mobileWorkspaces: normalizeComparableStringArray(user.mobileWorkspaces),
    persona: persona
      ? {
          keys: normalizeComparableStringArray(persona.keys),
          isResident: persona.isResident === true,
          isOwner: persona.isOwner === true,
          isServiceProvider: persona.isServiceProvider === true,
          isBuildingStaff: persona.isBuildingStaff === true,
          residentOccupancyStatus: normalizeComparableString(
            persona.residentOccupancyStatus,
          ),
          residentInviteStatus: normalizeComparableString(
            persona.residentInviteStatus,
          ),
          serviceProviderRoles: normalizeComparableStringArray(
            persona.serviceProviderRoles,
          ),
          buildingStaffRoleKeys: normalizeComparableStringArray(
            persona.buildingStaffRoleKeys,
          ),
        }
      : null,
    resident: resident
      ? {
          id: normalizeComparableString(resident.id),
          buildingId: normalizeComparableString(
            resident.buildingId ??
              (resident.building as Record<string, unknown> | undefined)?.id,
          ),
          unitId: normalizeComparableString(
            resident.unitId ?? residentUnit?.id,
          ),
          unitLabel: normalizeComparableString(
            resident.unitLabel ??
              resident.unitNumber ??
              residentUnit?.label ??
              residentUnit?.number,
          ),
        }
      : null,
    profile: profile
      ? {
          name: normalizeComparableString(profile.name),
          phone: normalizeComparableString(profile.phone),
          avatarUrl: normalizeComparableString(
            profile.avatarUrl ?? profile.avatar,
          ),
          buildingId: normalizeComparableString(profile.buildingId),
          buildingName: normalizeComparableString(profile.buildingName),
          apartment: normalizeComparableString(profile.apartment),
          floor: normalizeComparableString(profile.floor),
        }
      : null,
  });
};

const shouldInvalidateResidentSessionCaches = (
  previousUser: User,
  nextUser: User,
): boolean => {
  const previouslyResident = previousUser.persona?.isResident === true;
  const nextResident = nextUser.persona?.isResident === true;

  if (!previouslyResident && !nextResident) {
    return false;
  }

  return (
    previousUser.id !== nextUser.id ||
    previousUser.role !== nextUser.role ||
    previousUser.activeWorkspace !== nextUser.activeWorkspace ||
    previousUser.persona?.residentOccupancyStatus !==
      nextUser.persona?.residentOccupancyStatus ||
    previousUser.persona?.residentInviteStatus !==
      nextUser.persona?.residentInviteStatus ||
    getResidentWorkspaceAccessLevel(previousUser.persona) !==
      getResidentWorkspaceAccessLevel(nextUser.persona)
  );
};

const getWorkspaceSelectionKey = (user: {
  id?: unknown;
  email?: unknown;
}): string | null => {
  if (typeof user.id === "string" && user.id.length > 0) {
    return `id:${user.id}`;
  }

  if (typeof user.email === "string" && user.email.length > 0) {
    return `email:${user.email.toLowerCase()}`;
  }

  return null;
};

const readStoredWorkspaceSelections = async (): Promise<
  Record<string, MobileWorkspace>
> => {
  try {
    const rawValue = await SecureStore.getItemAsync(
      STORAGE_KEYS.selected_mobile_workspace,
    );

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === "object"
      ? (parsedValue as Record<string, MobileWorkspace>)
      : {};
  } catch (error) {
    console.warn("[Auth] Failed to read saved workspace selection:", error);
    return {};
  }
};

const getSavedWorkspaceSelection = async (
  user: {
    id?: unknown;
    email?: unknown;
  },
  availableWorkspaces: MobileWorkspace[],
): Promise<MobileWorkspace | null> => {
  const selectionKey = getWorkspaceSelectionKey(user);

  if (!selectionKey || availableWorkspaces.length === 0) {
    return null;
  }

  const storedSelections = await readStoredWorkspaceSelections();
  const savedWorkspace = storedSelections[selectionKey];

  return savedWorkspace && availableWorkspaces.includes(savedWorkspace)
    ? savedWorkspace
    : null;
};

const persistWorkspaceSelection = async (
  user: {
    id?: unknown;
    email?: unknown;
  },
  workspace: MobileWorkspace,
): Promise<void> => {
  const selectionKey = getWorkspaceSelectionKey(user);

  if (!selectionKey) {
    return;
  }

  const storedSelections = await readStoredWorkspaceSelections();
  storedSelections[selectionKey] = workspace;

  try {
    await SecureStore.setItemAsync(
      STORAGE_KEYS.selected_mobile_workspace,
      JSON.stringify(storedSelections),
    );
  } catch (error) {
    console.warn("[Auth] Failed to save workspace selection:", error);
  }
};

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [users, setUsers, isLoadingUsers] = useAsyncStorage(
    STORAGE_KEYS.users,
    {}, // No mock users - start fresh
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [bootstrapStatus, setBootstrapStatus] =
    useState<AuthBootstrapStatus>("restoring");
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const storedUsers =
    users && typeof users === "object" ? (users as Record<string, User>) : {};
  const mergedInitialUsers = { ...storedUsers }; // No DEFAULT_USERS
  const [state, dispatch] = useReducer(authReducer, {
    ...initialState,
    users: mergedInitialUsers,
  });
  const refreshCurrentUserPromiseRef = useRef<Promise<User | null> | null>(null);

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

  const clearPersistedSession = useCallback(async (): Promise<void> => {
    await clearResidentRequestsCache();
    clearResidentContractCache();
    invalidateResidentTenancy();

    try {
      await apiService.clearAuthToken();
    } catch (error) {
      console.warn("[Auth] Failed to clear in-memory auth token state:", error);
    }

    try {
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.user_data),
        SecureStore.deleteItemAsync(STORAGE_KEYS.auth_token),
        SecureStore.deleteItemAsync(STORAGE_KEYS.refresh_token),
        SecureStore.deleteItemAsync(STORAGE_KEYS.push_device_token),
        SecureStore.deleteItemAsync(STORAGE_KEYS.owner_push_device_id),
        SecureStore.deleteItemAsync(STORAGE_KEYS.owner_push_device_token),
      ]);
    } catch (error) {
      console.warn("[Auth] Failed to clear persisted session state:", error);
    }
  }, []);

  const resetResidentRuntimeCaches = useCallback((): void => {
    clearResidentContractCache();
    invalidateResidentTenancy();
  }, []);

  // Update AsyncStorage when users change (but not on initial load)
  useEffect(() => {
    if (isInitialized && state.users && typeof state.users === "object") {
      setUsers(state.users);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.users, isInitialized]);

  // Initialize auth state from saved session
  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      setBootstrapStatus("restoring");
      setBootstrapError(null);

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
              const persona = normalizeUserPersona(resolvedUser?.persona);
              const availableWorkspaces = getMobileWorkspaces({
                persona,
              });
              const savedWorkspace = await getSavedWorkspaceSelection(
                resolvedUser,
                availableWorkspaces,
              );
              const activeWorkspace =
                resolvedUser?.activeWorkspace &&
                availableWorkspaces.includes(resolvedUser.activeWorkspace)
                  ? resolvedUser.activeWorkspace
                  : savedWorkspace ??
                    (availableWorkspaces.length === 1
                      ? availableWorkspaces[0]
                      : null);
              const resolvedRole = activeWorkspace
                ? getRoleForMobileWorkspace(activeWorkspace, persona)
                : getDefaultRoleFromPersona(
                    persona,
                    resolvedUser?.role ?? "tenant",
                  );

              resolvedUser = {
                ...resolvedUser,
                persona,
                mobileWorkspaces: availableWorkspaces,
                activeWorkspace,
                role: resolvedRole,
              };

              const restoredAccessProfile = buildAccessProfile(
                resolvedUser,
                resolvedUser.role,
              );
              if (Object.keys(restoredAccessProfile).length > 0) {
                resolvedUser = {
                  ...resolvedUser,
                  profile: {
                    ...(resolvedUser?.profile ?? {}),
                    ...restoredAccessProfile,
                  },
                };
              }

              if (activeWorkspace && availableWorkspaces.length > 1) {
                await persistWorkspaceSelection(resolvedUser, activeWorkspace);
              }

              if (activeWorkspace === "resident" || resolvedUser.role === "tenant") {
                resolvedUser = await enrichTenantProfile(resolvedUser);
              }
              if (getResidentWorkspaceAccessLevel(persona) !== "active") {
                await clearResidentRequestsCache(resolvedUser.id);
                resetResidentRuntimeCaches();
              }
              console.log('[AuthProvider] Restored persona summary:', {
                personaKeys: persona.keys,
                residentOccupancyStatus: persona.residentOccupancyStatus,
                residentInviteStatus: persona.residentInviteStatus,
                isResident: persona.isResident,
                activeWorkspace,
                resolvedRole,
              });
              console.log('[AuthProvider] Restored user from storage:', {
                email: resolvedUser.email,
                role: resolvedUser.role,
                activeWorkspace,
                availableWorkspaces,
              });

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
              console.error('[AuthProvider] Failed to parse saved user data:', parseError);

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
        console.warn('[AuthProvider] Auth initialization failed:', error);
        dispatch({
          type: AUTH_ACTIONS.SET_AUTH,
          payload: {
            isAuthenticated: false,
            currentUser: null,
            userRole: null,
          },
        });
        if (!cancelled) {
          setBootstrapError(
            "We could not restore your workspace. Retry or continue to sign in again.",
          );
          setBootstrapStatus("error");
        }
        return;
      }

      if (!cancelled) {
        setBootstrapStatus("ready");
      }
    };

    if (isInitialized) {
      void initializeAuth();
    }

    return () => {
      cancelled = true;
    };
  }, [bootstrapAttempt, isInitialized]);

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
          ...(residentUser?.avatarUrl ?? residentUser?.avatar
            ? {
                avatar:
                  residentUser?.avatarUrl ??
                  residentUser?.avatar,
                avatarUrl:
                  residentUser?.avatarUrl ??
                  residentUser?.avatar,
              }
            : {}),
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

        const nowIso = new Date().toISOString();
        const userEmail = (payloadUser.email || normalizedEmail).toLowerCase();
        const existingUser = state.users[userEmail];
        const persona = normalizeUserPersona(payloadUser?.persona);
        if (!persona) {
          throw new Error("Login response did not include persona");
        }
        const availableWorkspaces = getMobileWorkspaces({ persona });
        const savedWorkspace = await getSavedWorkspaceSelection(
          {
            id: payloadUser?.id ? String(payloadUser.id) : existingUser?.id,
            email: userEmail,
          },
          availableWorkspaces,
        );
        const activeWorkspace =
          savedWorkspace ??
          (availableWorkspaces.length === 1 ? availableWorkspaces[0] : null);
        const userRole = activeWorkspace
          ? getRoleForMobileWorkspace(activeWorkspace, persona)
          : getDefaultRoleFromPersona(persona, existingUser?.role ?? "tenant");

        console.log("[Auth] Resolved mobile workspace:", {
          personaKeys: persona.keys,
          availableWorkspaces,
          activeWorkspace,
          resolvedRole: userRole,
          residentOccupancyStatus: persona.residentOccupancyStatus,
          residentInviteStatus: persona.residentInviteStatus,
        });
        console.log("[Auth] Persona summary:", {
          id: payloadUser?.id,
          email: userEmail,
          personaKeys: persona.keys,
          isResident: persona.isResident,
          residentOccupancyStatus: persona.residentOccupancyStatus,
          residentInviteStatus: persona.residentInviteStatus,
          activeWorkspace,
          resolvedRole: userRole,
        });

        const accessProfile = buildAccessProfile(payloadUser, userRole);

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
          orgAccess:
            payloadUser?.orgAccess ??
            existingUser?.orgAccess ??
            null,
          buildingAccess:
            payloadUser?.buildingAccess ??
            payloadUser?.buildingAssignments ??
            existingUser?.buildingAccess ??
            null,
          buildingAssignments:
            payloadUser?.buildingAssignments ??
            existingUser?.buildingAssignments ??
            null,
          resident:
            payloadUser?.resident ??
            existingUser?.resident ??
            null,
          persona,
          mobileWorkspaces: availableWorkspaces,
          activeWorkspace,
          effectivePermissions:
            Array.isArray(payloadUser?.effectivePermissions)
              ? payloadUser.effectivePermissions.filter(
                  (permission: unknown): permission is string =>
                    typeof permission === "string" && permission.length > 0,
                )
              : existingUser?.effectivePermissions ?? [],
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
            ...accessProfile,
          },
          createdAt: existingUser?.createdAt ?? payloadUser?.createdAt ?? nowIso,
          updatedAt: payloadUser?.updatedAt ?? nowIso,
        };

        if (activeWorkspace && availableWorkspaces.length > 1) {
          await persistWorkspaceSelection(authenticatedUser, activeWorkspace);
        }

        await clearResidentRequestsCache(authenticatedUser.id);
        resetResidentRuntimeCaches();

        let resolvedUser = authenticatedUser;
        if (activeWorkspace === "resident" || userRole === "tenant") {
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
    selectWorkspace: async (workspace: MobileWorkspace): Promise<void> => {
      if (!state.currentUser) {
        throw new Error("No user logged in");
      }

      const persona = normalizeUserPersona(state.currentUser.persona);
      const availableWorkspaces = getMobileWorkspaces({
        persona,
      });

      if (!availableWorkspaces.includes(workspace)) {
        throw new Error("Selected workspace is not available for this account");
      }

      actions.clearError();

      const role = getRoleForMobileWorkspace(workspace, persona);
      let updatedUser: User = {
        ...state.currentUser,
        persona,
        role,
        mobileWorkspaces: availableWorkspaces,
        activeWorkspace: workspace,
      };

      if (workspace === "resident") {
        updatedUser = await enrichTenantProfile(updatedUser);
      }

      await clearResidentRequestsCache(updatedUser.id);
      resetResidentRuntimeCaches();

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

      await persistWorkspaceSelection(updatedUser, workspace);

      try {
        await SecureStore.setItemAsync(
          STORAGE_KEYS.user_data,
          JSON.stringify(updatedUser),
        );
      } catch (storageError) {
        console.warn(
          "[Auth] Failed to persist selected workspace to SecureStore:",
          storageError,
        );
      }
    },
    logout: async (): Promise<void> => {
      try {
        actions.setLoading(true);
        actions.clearError();

        console.log('[Auth] Logging out, clearing session data...');
        const currentRole = state.currentUser?.role;
        const currentUserId = state.currentUser?.id;
        const hasOwnerWorkspace =
          state.currentUser?.activeWorkspace === "owner" ||
          state.currentUser?.mobileWorkspaces?.includes("owner") ||
          state.currentUser?.persona?.isOwner === true;

        // Clear auth state
        actions.setAuth({
          isAuthenticated: false,
          currentUser: null,
          userRole: null,
        });

        // Clear persisted session data from SecureStore
        try {
          await clearResidentRequestsCache(currentUserId);
          const pushDeviceToken = await SecureStore.getItemAsync(
            STORAGE_KEYS.push_device_token,
          );
          const ownerPushDeviceId = await SecureStore.getItemAsync(
            STORAGE_KEYS.owner_push_device_id,
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
          if ((currentRole === 'owner' || hasOwnerWorkspace) && ownerPushDeviceId) {
            try {
              await ownerPortalApi.deleteNotificationDevice(ownerPushDeviceId);
            } catch (ownerPushError) {
              console.warn(
                '[Auth] Failed to unregister owner push device:',
                ownerPushError,
              );
            }
          }

          await apiService.logout();
          await SecureStore.deleteItemAsync(STORAGE_KEYS.user_data);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.auth_token);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.refresh_token);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.push_device_token);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.owner_push_device_id);
          await SecureStore.deleteItemAsync(STORAGE_KEYS.owner_push_device_token);
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

    refreshCurrentUser: async (): Promise<User | null> => {
      if (!state.currentUser) {
        return null;
      }

      if (refreshCurrentUserPromiseRef.current) {
        return refreshCurrentUserPromiseRef.current;
      }

      const refreshPromise = (async (): Promise<User | null> => {
        const currentUser = state.currentUser;
        const previousSignature = getUserRefreshSignature(currentUser);
        const response = await apiService.getProfile();
        const payloadUser =
          (response as ApiResponse<any>)?.data ??
          (response as { user?: any })?.user ??
          response;

        if (!payloadUser || typeof payloadUser !== "object") {
          throw new Error("Current user refresh returned an invalid payload");
        }

        const userEmail = String(
          payloadUser?.email ?? currentUser.email,
        ).trim().toLowerCase();
        const persona = normalizeUserPersona(
          payloadUser?.persona ?? currentUser.persona,
        );

        if (!persona) {
          throw new Error("Current user refresh did not include persona");
        }

        const availableWorkspaces = getMobileWorkspaces({ persona });
        const savedWorkspace = await getSavedWorkspaceSelection(
          {
            id:
              payloadUser?.id != null
                ? String(payloadUser.id)
                : currentUser.id,
            email: userEmail,
          },
          availableWorkspaces,
        );
        const activeWorkspace =
          currentUser.activeWorkspace &&
          availableWorkspaces.includes(currentUser.activeWorkspace)
            ? currentUser.activeWorkspace
            : savedWorkspace ??
              (availableWorkspaces.length === 1 ? availableWorkspaces[0] : null);
        const userRole = activeWorkspace
          ? getRoleForMobileWorkspace(activeWorkspace, persona)
          : getDefaultRoleFromPersona(persona, currentUser.role ?? "tenant");
        const accessProfile = buildAccessProfile(payloadUser, userRole);

        let refreshedUser: User = {
          ...currentUser,
          id:
            payloadUser?.id != null ? String(payloadUser.id) : currentUser.id,
          email: userEmail,
          name:
            payloadUser?.name ??
            payloadUser?.fullName ??
            currentUser.name ??
            userEmail,
          role: userRole,
          orgId:
            payloadUser?.orgId ??
            payloadUser?.org_id ??
            currentUser.orgId,
          orgAccess:
            payloadUser?.orgAccess ??
            currentUser.orgAccess ??
            null,
          buildingAccess:
            payloadUser?.buildingAccess ??
            payloadUser?.buildingAssignments ??
            currentUser.buildingAccess ??
            null,
          buildingAssignments:
            payloadUser?.buildingAssignments ??
            currentUser.buildingAssignments ??
            null,
          resident:
            payloadUser?.resident ??
            currentUser.resident ??
            null,
          persona,
          mobileWorkspaces: availableWorkspaces,
          activeWorkspace,
          effectivePermissions:
            Array.isArray(payloadUser?.effectivePermissions)
              ? payloadUser.effectivePermissions.filter(
                  (permission: unknown): permission is string =>
                    typeof permission === "string" && permission.length > 0,
                )
              : currentUser.effectivePermissions ?? [],
          phone:
            payloadUser?.phone ??
            payloadUser?.phoneNumber ??
            currentUser.phone,
          mustChangePassword:
            payloadUser?.mustChangePassword ?? currentUser.mustChangePassword,
          profile: {
            ...(currentUser.profile ?? {}),
            ...(payloadUser?.profile && typeof payloadUser.profile === "object"
              ? payloadUser.profile
              : {}),
            name:
              payloadUser?.name ??
              payloadUser?.fullName ??
              currentUser.profile?.name,
            phone:
              payloadUser?.phone ??
              payloadUser?.phoneNumber ??
              currentUser.profile?.phone,
            ...accessProfile,
          },
          createdAt:
            currentUser.createdAt ??
            payloadUser?.createdAt ??
            new Date().toISOString(),
          updatedAt: payloadUser?.updatedAt ?? new Date().toISOString(),
        };

        if (activeWorkspace === "resident" || userRole === "tenant") {
          refreshedUser = await enrichTenantProfile(refreshedUser);
        }

        const nextSignature = getUserRefreshSignature(refreshedUser);
        if (previousSignature === nextSignature) {
          console.log("[Auth] Skipping current user refresh; session unchanged");
          return currentUser;
        }

        if (activeWorkspace && availableWorkspaces.length > 1) {
          await persistWorkspaceSelection(refreshedUser, activeWorkspace);
        }

        if (shouldInvalidateResidentSessionCaches(currentUser, refreshedUser)) {
          await clearResidentRequestsCache(refreshedUser.id);
          resetResidentRuntimeCaches();
        }

        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: {
            email: userEmail,
            user: refreshedUser,
          },
        });

        actions.setAuth({
          isAuthenticated: state.isAuthenticated,
          currentUser: refreshedUser,
          userRole: refreshedUser.role,
        });

        try {
          await SecureStore.setItemAsync(
            STORAGE_KEYS.user_data,
            JSON.stringify(refreshedUser),
          );
        } catch (storageError) {
          console.warn(
            "[Auth] Failed to persist refreshed user data to SecureStore:",
            storageError,
          );
        }

        console.log("[Auth] Refreshed current user session:", {
          email: refreshedUser.email,
          activeWorkspace: refreshedUser.activeWorkspace,
          role: refreshedUser.role,
          residentOccupancyStatus:
            refreshedUser.persona?.residentOccupancyStatus,
        });

        return refreshedUser;
      })().finally(() => {
        refreshCurrentUserPromiseRef.current = null;
      });

      refreshCurrentUserPromiseRef.current = refreshPromise;
      return refreshPromise;
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

            case "owner":
              if (Object.keys(updatePayload).length > 0) {
                response = await ownerPortalApi.updateMeProfile(updatePayload);
              } else {
                response = await ownerPortalApi.getMe();
              }
              apiCallSuccess = true;
              break;

            default:
              throw new Error(`Profile update not supported for role: ${role}`);
          }

          if (response && (response.success || role === "owner")) {
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
          mergedProfile.avatarUrl = profileData.avatar;
        } else if (resolvedAvatarUrl) {
          mergedProfile.avatar = resolvedAvatarUrl;
          mergedProfile.avatarUrl = resolvedAvatarUrl;
        }

        const responseProfile =
          role === "owner"
            ? response?.user ?? response?.data?.user ?? null
            : response?.data?.profile ?? response?.data;
        const residentProfile = residentProfileResponse ?? null;

        const mergedResponseProfile = {
          ...mergedProfile,
          ...(responseProfile && typeof responseProfile === "object"
            ? responseProfile
            : {}),
        } as any;

        if (role === "owner" && responseProfile && typeof responseProfile === "object") {
          mergedResponseProfile.name =
            responseProfile.name ?? mergedResponseProfile.name;
          mergedResponseProfile.phone =
            responseProfile.phone ?? mergedResponseProfile.phone;
          if (responseProfile.avatarUrl) {
            mergedResponseProfile.avatar = responseProfile.avatarUrl;
            mergedResponseProfile.avatarUrl = responseProfile.avatarUrl;
          }
        }

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
            (role === "owner"
              ? response?.user?.name ?? response?.data?.user?.name
              : null) ||
            resolvedName ||
            residentProfile?.user?.name ||
            state.currentUser.name,
          phone:
            (role === "owner"
              ? response?.user?.phone ?? response?.data?.user?.phone
              : null) ||
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

        const isCurrentUser = state.currentUser?.email === email;

        dispatch({
          type: AUTH_ACTIONS.UPDATE_USER,
          payload: { email, user: userData },
        });

        if (isCurrentUser) {
          await SecureStore.setItemAsync(
            STORAGE_KEYS.user_data,
            JSON.stringify(userData),
          );
        }

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
    retryBootstrap: () => {
      setBootstrapError(null);
      setBootstrapStatus("restoring");
      setBootstrapAttempt((current) => current + 1);
    },
    recoverFromBootstrapError: async (): Promise<void> => {
      await clearPersistedSession();
      dispatch({
        type: AUTH_ACTIONS.SET_AUTH,
        payload: {
          isAuthenticated: false,
          currentUser: null,
          userRole: null,
        },
      });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
      setBootstrapError(null);
      setBootstrapStatus("ready");
    },
  };

  const value: AuthContextType = {
    ...state,
    bootstrapStatus,
    bootstrapError,
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

