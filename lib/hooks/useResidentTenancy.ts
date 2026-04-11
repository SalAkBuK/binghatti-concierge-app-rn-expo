import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAuth } from "../context/auth-context";
import { residentSelfServiceApi } from "../services/api/resident-self-service";
import type {
  ResidentContractStatus,
  ResidentIdentity,
  ResidentLatestContract,
  ResidentMoveRequestStatus,
  ResidentOccupancyStatus,
  ResidentTenancyMode,
} from "../types";

type RefetchOptions = {
  asRefresh?: boolean;
  showLoading?: boolean;
};

type HookOptions = {
  enabled?: boolean;
  latestContractData?: ResidentLatestContract;
  onUnauthorized?: () => void | Promise<void>;
};

type UseResidentTenancyResult = {
  resident: ResidentIdentity;
  latestContract: ResidentLatestContract;
  mode: ResidentTenancyMode;
  isActiveResident: boolean;
  isPreMoveIn: boolean;
  isFormerResident: boolean;
  hasActiveOccupancy: boolean;
  hasTenancyContext: boolean;
  latestContractStatus: ResidentContractStatus | null;
  canCreateMaintenanceRequest: boolean;
  canManageVisitors: boolean;
  canCreateManagementConversation: boolean;
  preMoveInStatusTitle: string;
  preMoveInStatusMessage: string;
  preMoveInActionLabel: string;
  statusTitle: string;
  statusMessage: string;
  displayBuildingName: string | null;
  displayUnitLabel: string | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  refetch: (options?: RefetchOptions) => Promise<void>;
};

type ResidentTenancySnapshot = {
  resident: ResidentIdentity;
  latestContract: ResidentLatestContract;
  fetchedAt: number;
};

const EMPTY_IDENTITY: ResidentIdentity = {
  user: null,
  occupancy: null,
};

const EMPTY_LATEST_CONTRACT: ResidentLatestContract = {
  contract: null,
  canRequestMoveIn: false,
  canRequestMoveOut: false,
  latestMoveInRequestStatus: null,
  latestMoveOutRequestStatus: null,
};

const CACHE_TTL_MS = 30_000;
const PRE_MOVE_IN_FOREGROUND_REFRESH_TTL_MS = 10_000;
const PERSONA_SYNC_TTL_MS = 10_000;
let cachedSnapshot: ResidentTenancySnapshot | null = null;
let sharedRequestPromise: Promise<ResidentTenancySnapshot> | null = null;
const tenancyListeners = new Set<() => void>();

export const invalidateResidentTenancy = (): void => {
  cachedSnapshot = null;
  sharedRequestPromise = null;
  tenancyListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn("[ResidentTenancy] Failed to notify listener", error);
    }
  });
};

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

const hasOccupancy = (resident: ResidentIdentity): boolean => {
  const occupancy = resident.occupancy;
  if (!occupancy) return false;

  return Boolean(
    occupancy.id ||
      occupancy.buildingId ||
      occupancy.buildingName ||
      occupancy.unitId ||
      occupancy.unitLabel,
  );
};

const isInactiveContractStatus = (
  status: ResidentContractStatus | null | undefined,
): boolean => status === "ENDED" || status === "CANCELLED";

const deriveMode = (
  resident: ResidentIdentity,
  latestContract: ResidentLatestContract,
  personaOccupancyStatus?: ResidentOccupancyStatus | null,
): ResidentTenancyMode => {
  const normalizedPersonaOccupancyStatus =
    typeof personaOccupancyStatus === "string"
      ? personaOccupancyStatus.trim().toUpperCase()
      : null;
  const occupancyExists = hasOccupancy(resident);
  const latestStatus = latestContract.contract?.status ?? null;
  const hasCurrentContract = Boolean(latestContract.contract?.id);

  if (normalizedPersonaOccupancyStatus === "ACTIVE") {
    return "active";
  }

  if (normalizedPersonaOccupancyStatus === "NONE") {
    return "pre_move_in";
  }

  if (occupancyExists && !isInactiveContractStatus(latestStatus)) {
    return "active";
  }

  if (!occupancyExists && hasCurrentContract && !isInactiveContractStatus(latestStatus)) {
    return "pre_move_in";
  }

  if (normalizedPersonaOccupancyStatus === "FORMER") {
    return "former_resident";
  }

  if (!occupancyExists && isInactiveContractStatus(latestStatus)) {
    return "former_resident";
  }

  if (occupancyExists) {
    return "active";
  }

  return "no_tenancy";
};

const getPreMoveInStatusCopy = (
  latestMoveInRequestStatus: ResidentMoveRequestStatus,
  canRequestMoveIn: boolean,
): {
  actionLabel: string;
  message: string;
  title: string;
} => {
  switch (latestMoveInRequestStatus) {
    case "PENDING":
      return {
        title: "Move-in request submitted",
        message:
          "Your move-in request is under review. Requests, messages, and visitors will unlock automatically once your occupancy is activated.",
        actionLabel: "Review Move-In",
      };
    case "APPROVED":
      return {
        title: "Move-in approved",
        message:
          "Your move-in request has been approved. Open lease details to review the timeline. Resident features will unlock once occupancy becomes active.",
        actionLabel: "Review Move-In",
      };
    case "REJECTED":
      return {
        title: "Move-in needs attention",
        message:
          "Your last move-in request was rejected. Review the details and submit a new move-in request to unlock resident features.",
        actionLabel: "Review Lease Details",
      };
    case "COMPLETED":
      return {
        title: "Finishing your move-in",
        message:
          "Your move-in has been recorded and resident access is being finalized. Features will unlock automatically once occupancy is active.",
        actionLabel: "Review Lease Details",
      };
    case "CANCELLED":
      return {
        title: "Move-in not scheduled",
        message:
          "Your previous move-in request was cancelled. Open lease details to submit a new move-in request when you are ready.",
        actionLabel: "Schedule Move-In",
      };
    default:
      return {
        title: "Before you move in",
        message: canRequestMoveIn
          ? "Your contract is active, but resident services unlock only after move-in is completed. Schedule your move-in from lease details to activate the full portal."
          : "Your contract is active, but resident services unlock only after move-in is completed. Open lease details to check your move-in eligibility and next steps.",
        actionLabel: canRequestMoveIn ? "Schedule Move-In" : "Review Lease Details",
      };
  }
};

export const useResidentTenancy = (
  options?: HookOptions,
): UseResidentTenancyResult => {
  const { currentUser, actions: authActions } = useAuth();
  const enabled = options?.enabled ?? true;
  const providedLatestContract = options?.latestContractData;
  const onUnauthorized = options?.onUnauthorized;
  const onUnauthorizedRef = useRef(onUnauthorized);
  const inFlightRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastForegroundRefreshAtRef = useRef(0);
  const lastPersonaSyncAtRef = useRef(0);

  const [resident, setResident] = useState<ResidentIdentity>(EMPTY_IDENTITY);
  const [latestContract, setLatestContract] = useState<ResidentLatestContract>(
    providedLatestContract ?? EMPTY_LATEST_CONTRACT,
  );
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  useEffect(() => {
    if (providedLatestContract) {
      setLatestContract(providedLatestContract);
      if (cachedSnapshot) {
        cachedSnapshot = {
          ...cachedSnapshot,
          latestContract: providedLatestContract,
          fetchedAt: Date.now(),
        };
      }
    }
  }, [providedLatestContract]);

  const getFreshSnapshot = useCallback(
    async (forceRefresh: boolean): Promise<ResidentTenancySnapshot> => {
      const now = Date.now();
      const canUseCache =
        !forceRefresh &&
        cachedSnapshot &&
        now - cachedSnapshot.fetchedAt < CACHE_TTL_MS &&
        (!providedLatestContract ||
          cachedSnapshot.latestContract.contract?.id ===
            providedLatestContract.contract?.id);

      if (canUseCache) {
        return {
          resident: cachedSnapshot.resident,
          latestContract: providedLatestContract ?? cachedSnapshot.latestContract,
          fetchedAt: cachedSnapshot.fetchedAt,
        };
      }

      if (!sharedRequestPromise) {
        sharedRequestPromise = (async () => {
          const [residentIdentity, liveLatestContract] = await Promise.all([
            residentSelfServiceApi.getResidentIdentity(),
            providedLatestContract
              ? Promise.resolve(providedLatestContract)
              : residentSelfServiceApi.getResidentLatestContract(),
          ]);

          const snapshot = {
            resident: residentIdentity,
            latestContract: liveLatestContract,
            fetchedAt: Date.now(),
          };
          cachedSnapshot = snapshot;
          return snapshot;
        })().finally(() => {
          sharedRequestPromise = null;
        });
      }

      const snapshot = await sharedRequestPromise;
      return {
        resident: snapshot.resident,
        latestContract: providedLatestContract ?? snapshot.latestContract,
        fetchedAt: snapshot.fetchedAt,
      };
    },
    [providedLatestContract],
  );

  const load = useCallback(
    async ({ asRefresh = false, showLoading = !asRefresh }: RefetchOptions = {}) => {
      if (!enabled) {
        setResident(EMPTY_IDENTITY);
        setLatestContract(providedLatestContract ?? EMPTY_LATEST_CONTRACT);
        setErrorMessage(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      if (showLoading) setIsLoading(true);
      if (asRefresh) setIsRefreshing(true);

      try {
        const snapshot = await getFreshSnapshot(asRefresh);

        setResident(snapshot.resident);
        setLatestContract(snapshot.latestContract);
        setErrorMessage(null);
      } catch (error) {
        if (getStatusCode(error) === 401) {
          await onUnauthorizedRef.current?.();
          return;
        }

        setErrorMessage(
          "Unable to load your resident access details right now. Please try again.",
        );
      } finally {
        if (showLoading) setIsLoading(false);
        if (asRefresh) setIsRefreshing(false);
        inFlightRef.current = false;
      }
    },
    [enabled, getFreshSnapshot, providedLatestContract],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleInvalidation = () => {
      void load({ asRefresh: true, showLoading: false });
    };

    tenancyListeners.add(handleInvalidation);

    return () => {
      tenancyListeners.delete(handleInvalidation);
    };
  }, [enabled, load]);

  useEffect(() => {
    void load({ showLoading: true, asRefresh: false });
  }, [load]);

  const mode = useMemo(
    () =>
      deriveMode(
        resident,
        latestContract,
        currentUser?.persona?.residentOccupancyStatus,
      ),
    [currentUser?.persona?.residentOccupancyStatus, latestContract, resident],
  );
  const preMoveInCopy = useMemo(
    () =>
      getPreMoveInStatusCopy(
        latestContract.latestMoveInRequestStatus,
        latestContract.canRequestMoveIn,
      ),
    [latestContract.canRequestMoveIn, latestContract.latestMoveInRequestStatus],
  );

  useEffect(() => {
    if (!enabled || mode !== "pre_move_in") {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const shouldRefresh =
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        Date.now() - lastForegroundRefreshAtRef.current >
          PRE_MOVE_IN_FOREGROUND_REFRESH_TTL_MS;

      appStateRef.current = nextAppState;

      if (shouldRefresh) {
        lastForegroundRefreshAtRef.current = Date.now();
        void load({ asRefresh: true, showLoading: false });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, load, mode]);

  const latestContractStatus = latestContract.contract?.status ?? null;
  const isFormerResident = mode === "former_resident";
  const isActiveResident = mode === "active";
  const isPreMoveIn = mode === "pre_move_in";
  const hasActiveOccupancy = hasOccupancy(resident);
  const hasTenancyContext = Boolean(hasActiveOccupancy || latestContract.contract?.id);
  const displayBuildingName =
    resident.occupancy?.buildingName ?? latestContract.contract?.buildingName ?? null;
  const displayUnitLabel =
    resident.occupancy?.unitLabel ?? latestContract.contract?.unitLabel ?? null;

  useEffect(() => {
    const currentPersonaStatus =
      currentUser?.persona?.residentOccupancyStatus ?? null;
    const shouldSyncPersona =
      enabled &&
      currentUser?.persona?.isResident === true &&
      currentPersonaStatus !== "ACTIVE" &&
      hasActiveOccupancy &&
      !isInactiveContractStatus(latestContractStatus);

    if (!shouldSyncPersona) {
      return;
    }

    if (Date.now() - lastPersonaSyncAtRef.current < PERSONA_SYNC_TTL_MS) {
      return;
    }

    lastPersonaSyncAtRef.current = Date.now();

    void authActions.refreshCurrentUser().catch((error) => {
      console.warn("[ResidentTenancy] Failed to refresh resident persona", error);
    });
  }, [
    authActions,
    currentUser?.id,
    currentUser?.persona?.isResident,
    currentUser?.persona?.residentOccupancyStatus,
    enabled,
    hasActiveOccupancy,
    latestContractStatus,
  ]);

  const statusTitle =
    mode === "former_resident"
      ? "Former resident"
      : mode === "pre_move_in"
        ? preMoveInCopy.title
      : mode === "no_tenancy"
        ? "No active unit"
        : "Active resident";

  const statusMessage =
    mode === "former_resident"
      ? "You no longer have an active unit in this building. You can still view your previous contract details and history here."
      : mode === "pre_move_in"
        ? preMoveInCopy.message
      : mode === "no_tenancy"
        ? "Your account does not currently have an active unit. You can still access your available profile and tenancy history."
        : "";

  return {
    resident,
    latestContract,
    mode,
    isActiveResident,
    isPreMoveIn,
    isFormerResident,
    hasActiveOccupancy,
    hasTenancyContext,
    latestContractStatus,
    canCreateMaintenanceRequest: isActiveResident,
    canManageVisitors: isActiveResident,
    canCreateManagementConversation: isActiveResident,
    preMoveInStatusTitle: preMoveInCopy.title,
    preMoveInStatusMessage: preMoveInCopy.message,
    preMoveInActionLabel: preMoveInCopy.actionLabel,
    statusTitle,
    statusMessage,
    displayBuildingName,
    displayUnitLabel,
    isLoading,
    isRefreshing,
    errorMessage,
    refetch: load,
  };
};
