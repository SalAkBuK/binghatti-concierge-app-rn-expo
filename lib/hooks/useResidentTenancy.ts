import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { residentSelfServiceApi } from "../services/api/resident-self-service";
import type {
  ResidentContractStatus,
  ResidentIdentity,
  ResidentLatestContract,
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
  isFormerResident: boolean;
  hasActiveOccupancy: boolean;
  hasTenancyContext: boolean;
  latestContractStatus: ResidentContractStatus | null;
  canCreateMaintenanceRequest: boolean;
  canManageVisitors: boolean;
  canCreateManagementConversation: boolean;
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
let cachedSnapshot: ResidentTenancySnapshot | null = null;
let sharedRequestPromise: Promise<ResidentTenancySnapshot> | null = null;

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

const deriveMode = (
  resident: ResidentIdentity,
  latestContract: ResidentLatestContract,
): ResidentTenancyMode => {
  const occupancyExists = hasOccupancy(resident);
  const latestStatus = latestContract.contract?.status ?? null;

  if (occupancyExists && latestStatus !== "ENDED" && latestStatus !== "CANCELLED") {
    return "active";
  }

  if (!occupancyExists && (latestStatus === "ENDED" || latestStatus === "CANCELLED")) {
    return "former_resident";
  }

  if (occupancyExists) {
    return "active";
  }

  return "no_tenancy";
};

export const useResidentTenancy = (
  options?: HookOptions,
): UseResidentTenancyResult => {
  const enabled = options?.enabled ?? true;
  const providedLatestContract = options?.latestContractData;
  const onUnauthorized = options?.onUnauthorized;
  const onUnauthorizedRef = useRef(onUnauthorized);
  const inFlightRef = useRef(false);

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
    void load({ showLoading: true, asRefresh: false });
  }, [load]);

  const mode = useMemo(
    () => deriveMode(resident, latestContract),
    [resident, latestContract],
  );

  const latestContractStatus = latestContract.contract?.status ?? null;
  const isFormerResident = mode === "former_resident";
  const isActiveResident = mode === "active";
  const hasActiveOccupancy = hasOccupancy(resident);
  const hasTenancyContext = Boolean(hasActiveOccupancy || latestContract.contract?.id);
  const displayBuildingName =
    resident.occupancy?.buildingName ?? latestContract.contract?.buildingName ?? null;
  const displayUnitLabel =
    resident.occupancy?.unitLabel ?? latestContract.contract?.unitLabel ?? null;

  const statusTitle =
    mode === "former_resident"
      ? "Former resident"
      : mode === "no_tenancy"
        ? "No active unit"
        : "Active resident";

  const statusMessage =
    mode === "former_resident"
      ? "You no longer have an active unit in this building. You can still view your previous contract details and history here."
      : mode === "no_tenancy"
        ? "Your account does not currently have an active unit. You can still access your available profile and tenancy history."
        : "";

  return {
    resident,
    latestContract,
    mode,
    isActiveResident,
    isFormerResident,
    hasActiveOccupancy,
    hasTenancyContext,
    latestContractStatus,
    canCreateMaintenanceRequest: isActiveResident,
    canManageVisitors: isActiveResident,
    canCreateManagementConversation: isActiveResident,
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
