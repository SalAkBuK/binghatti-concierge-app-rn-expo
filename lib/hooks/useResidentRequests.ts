import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAsyncStorage } from "./useAsyncStorage";
import { residentRequestsApi } from "../services/api/resident-requests";
import { STORAGE_KEYS } from "../utils/constants";
import { filterNotificationsByUser } from "../utils/helpers";
import {
  hasActiveResidentHistoryAccess,
  isActiveOccupancyRequiredError,
  RESIDENT_HISTORY_UNAVAILABLE_MESSAGE,
} from "../utils/resident-history-access";
import { mapRequestContractFields } from "../utils/request-contract";
import { normalizeOwnerApprovalSnapshot } from "../utils/resident-request-approval";
import type {
  Notification,
  Request,
  RequestStatus,
  ResidentEmergencySignal,
  User,
} from "../types";

type ResidentRequestsCache = {
  items: Request[];
  fetchedAt: string | null;
};

type RefreshOptions = {
  showLoading?: boolean;
  asRefresh?: boolean;
  reason?: "initial" | "manual" | "notification";
};

type ResidentRequestsSnapshot = {
  userId: string;
  items: Request[];
  fetchedAt: number;
};

type PublishOptions = {
  persist?: boolean;
};

const CACHE_TTL_MS = 30_000;
const EMPTY_CACHE: ResidentRequestsCache = {
  items: [],
  fetchedAt: null,
};
const residentRequestsSnapshots = new Map<string, ResidentRequestsSnapshot>();
const sharedResidentRequestsPromises = new Map<
  string,
  Promise<ResidentRequestsSnapshot>
>();
const residentRequestsListeners = new Map<
  string,
  Set<(snapshot: ResidentRequestsSnapshot) => void>
>();

const mapStatusFromBackend = (status: any): RequestStatus => {
  const numeric = Number(status);
  if (!Number.isNaN(numeric)) {
    switch (numeric) {
      case 1:
        return "pending";
      case 2:
        return "assigned";
      case 3:
        return "in-progress";
      case 4:
        return "on-hold";
      case 5:
        return "completed";
      case 6:
        return "cancelled";
      default:
        return "pending";
    }
  }

  const normalized = String(status || "")
    .toUpperCase()
    .replace(/[\s-]/g, "_");

  if (normalized === "OPEN") return "pending";
  if (normalized === "ASSIGNED") return "assigned";
  if (normalized === "IN_PROGRESS") return "in-progress";
  if (normalized === "COMPLETED") return "completed";
  if (normalized === "CANCELED" || normalized === "CANCELLED") return "cancelled";
  return "pending";
};

const mapPriorityFromBackend = (priority: any): Request["priority"] => {
  const numeric = Number(priority);
  if (!Number.isNaN(numeric)) {
    switch (numeric) {
      case 1:
        return "low";
      case 2:
        return "medium";
      case 3:
        return "high";
      case 4:
        return "urgent";
      default:
        return "medium";
    }
  }

  const normalized = String(priority || "").toUpperCase();
  if (normalized === "LOW") return "low";
  if (normalized === "MEDIUM") return "medium";
  if (normalized === "HIGH") return "high";
  if (normalized === "URGENT") return "urgent";
  return "medium";
};

const mapTypeFromBackend = (type: any): Request["type"] => {
  const normalized = String(type || "").toUpperCase();
  switch (normalized) {
    case "CLEANING":
      return "cleaning";
    case "ELECTRICAL":
      return "electrical";
    case "MAINTENANCE":
      return "maintenance";
    case "PLUMBING_AC_HEATING":
      return "hvac";
    case "OTHER":
      return "other";
    default:
      return "maintenance";
  }
};

const normalizeEmergencySignals = (
  signals: unknown,
): ResidentEmergencySignal[] => {
  if (!Array.isArray(signals)) return [];

  return signals
    .map((signal) =>
      typeof signal === "string" ? signal.trim().toUpperCase() : null,
    )
    .filter(
      (signal): signal is ResidentEmergencySignal =>
        signal === "ACTIVE_LEAK" ||
        signal === "NO_POWER" ||
        signal === "SAFETY_RISK" ||
        signal === "NO_COOLING",
    );
};

const isRequestNotification = (notification: Notification) => {
  const type = String(notification.type || "").toUpperCase();
  return type === "REQUEST_STATUS_CHANGED" || type === "REQUEST_COMMENTED";
};

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

const getResidentRequestsStorageKey = (userId?: string | null): string =>
  userId
    ? `${STORAGE_KEYS.resident_requests}_${userId}`
    : STORAGE_KEYS.resident_requests;

const getTimestamp = (value?: string | number | null): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getRequestTimestamp = (request: Pick<Request, "createdAt" | "updatedAt">): number => {
  const updatedAt = getTimestamp(request.updatedAt);
  if (updatedAt > 0) return updatedAt;
  return getTimestamp(request.createdAt);
};

const ensureResidentRequestShape = (request: Request): Request => ({
  ...request,
  attachments: Array.isArray(request.attachments)
    ? request.attachments.filter(Boolean)
    : [],
  comments: Array.isArray(request.comments) ? request.comments : [],
  messages: Array.isArray(request.messages) ? request.messages : [],
  notes: Array.isArray(request.notes) ? request.notes : [],
  timeline: Array.isArray(request.timeline) ? request.timeline : [],
  emergencySignals: Array.isArray(request.emergencySignals)
    ? request.emergencySignals
    : [],
});

const normalizeResidentRequests = (items: Request[]): Request[] =>
  items
    .map((item) => ensureResidentRequestShape(item))
    .sort((a, b) => getRequestTimestamp(b) - getRequestTimestamp(a));

const isResidentRequestsSnapshotFresh = (
  snapshot: ResidentRequestsSnapshot | null | undefined,
): boolean =>
  Boolean(
    snapshot?.fetchedAt && Date.now() - snapshot.fetchedAt < CACHE_TTL_MS,
  );

const getResidentRequestsSnapshot = (
  userId?: string | null,
): ResidentRequestsSnapshot | null => {
  if (!userId) return null;
  return residentRequestsSnapshots.get(userId) ?? null;
};

const getResidentRequestsListenerSet = (
  userId: string,
): Set<(snapshot: ResidentRequestsSnapshot) => void> => {
  let listeners = residentRequestsListeners.get(userId);
  if (!listeners) {
    listeners = new Set();
    residentRequestsListeners.set(userId, listeners);
  }
  return listeners;
};

const persistResidentRequestsSnapshot = async (
  snapshot: ResidentRequestsSnapshot,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      getResidentRequestsStorageKey(snapshot.userId),
      JSON.stringify({
        items: snapshot.items,
        fetchedAt: snapshot.fetchedAt
          ? new Date(snapshot.fetchedAt).toISOString()
          : null,
      } satisfies ResidentRequestsCache),
    );
  } catch (error) {
    console.warn("[ResidentRequests] Failed to persist snapshot", error);
  }
};

const publishResidentRequestsSnapshot = (
  snapshot: ResidentRequestsSnapshot,
  options?: PublishOptions,
): ResidentRequestsSnapshot => {
  const normalizedSnapshot: ResidentRequestsSnapshot = {
    userId: snapshot.userId,
    items: normalizeResidentRequests(snapshot.items),
    fetchedAt: snapshot.fetchedAt || Date.now(),
  };

  residentRequestsSnapshots.set(snapshot.userId, normalizedSnapshot);

  getResidentRequestsListenerSet(snapshot.userId).forEach((listener) => {
    try {
      listener(normalizedSnapshot);
    } catch (error) {
      console.warn("[ResidentRequests] Failed to notify listener", error);
    }
  });

  if (options?.persist !== false) {
    void persistResidentRequestsSnapshot(normalizedSnapshot);
  }

  return normalizedSnapshot;
};

const getSnapshotFromCache = (
  userId: string,
  cache: ResidentRequestsCache,
): ResidentRequestsSnapshot | null => {
  const items = Array.isArray(cache.items) ? cache.items : [];
  const fetchedAt = getTimestamp(cache.fetchedAt);

  if (items.length === 0 && !fetchedAt) {
    return null;
  }

  return {
    userId,
    items: normalizeResidentRequests(items),
    fetchedAt,
  };
};

export const mapResidentRequestFromBackend = (
  item: any,
  currentUser: User | null,
): Request | null => {
  if (!currentUser?.id) return null;

  const ownerApproval = normalizeOwnerApprovalSnapshot(item);
  const contractFields = mapRequestContractFields(item);

  return ensureResidentRequestShape({
    id: String(item.id),
    tenantId: currentUser.id,
    title: item.title || "Untitled Request",
    description: item.description || "",
    type: mapTypeFromBackend(item.type),
    status: mapStatusFromBackend(item.status),
    priority: mapPriorityFromBackend(item.priority),
    assignedTo:
      item.assignedTo?.name ||
      item.assignedTo?.fullName ||
      item.assignedTo?.email ||
      item.assignedTo ||
      undefined,
    buildingId: item.buildingId ? String(item.buildingId) : undefined,
    buildingName: item.buildingName || currentUser?.profile?.buildingName,
    apartment: item.unit?.label || item.unitNumber || currentUser?.profile?.apartment || "",
    floor:
      item.unit?.floor != null
        ? String(item.unit.floor)
        : item.floorNumber != null
          ? String(item.floorNumber)
          : currentUser?.profile?.floor || "",
    contactPhone: currentUser?.profile?.phone || "",
    preferredTime: "",
    additionalNotes: "",
    attachments: Array.isArray(item.attachments)
      ? item.attachments
          .map((att: any) => att?.url || att?.fileUrl || att?.uri || null)
          .filter(Boolean)
      : [],
    isEmergency:
      typeof item.isEmergency === "boolean"
        ? item.isEmergency
        : typeof item.policy?.isEmergency === "boolean"
          ? item.policy.isEmergency
          : undefined,
    ...contractFields,
    ownerApproval,
    ownerApprovalStatus:
      ownerApproval?.status ?? contractFields.ownerApprovalStatus ?? null,
    emergencySignals: normalizeEmergencySignals(item.emergencySignals),
    comments: [],
    messages: [],
    notes: [],
    timeline: [],
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    _source: "backend" as const,
  });
};

export const mapResidentRequestsFromBackend = (
  items: any[],
  currentUser: User | null,
): Request[] =>
  normalizeResidentRequests(
    items
      .map((item) => mapResidentRequestFromBackend(item, currentUser))
      .filter((item): item is Request => Boolean(item)),
  );

export const upsertResidentRequestSnapshot = (
  userId: string,
  request: Request,
  options?: { fetchedAt?: number },
): ResidentRequestsSnapshot => {
  const existing = getResidentRequestsSnapshot(userId);
  const nextItems = [
    ensureResidentRequestShape(request),
    ...(existing?.items ?? []).filter((item) => item.id !== request.id),
  ];

  return publishResidentRequestsSnapshot(
    {
      userId,
      items: nextItems,
      fetchedAt: options?.fetchedAt ?? Date.now(),
    },
    { persist: true },
  );
};

export const clearResidentRequestsCache = async (
  userId?: string | null,
): Promise<void> => {
  if (userId) {
    residentRequestsSnapshots.delete(userId);
    sharedResidentRequestsPromises.delete(userId);

    try {
      await AsyncStorage.removeItem(getResidentRequestsStorageKey(userId));
    } catch (error) {
      console.warn("[ResidentRequests] Failed to clear snapshot", error);
    }
    return;
  }

  residentRequestsSnapshots.clear();
  sharedResidentRequestsPromises.clear();

  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.resident_requests);
  } catch (error) {
    console.warn("[ResidentRequests] Failed to clear base snapshot", error);
  }
};

const getLatestNotification = (notifications: Notification[]) => {
  return notifications.reduce((latest, current) => {
    if (!latest) return current;
    const latestAt = Date.parse(latest.createdAt ?? "");
    const currentAt = Date.parse(current.createdAt ?? "");
    return currentAt > latestAt ? current : latest;
  }, notifications[0]);
};

export const useResidentRequests = ({
  currentUser,
  notifications,
  onUnauthorized,
}: {
  currentUser: User | null;
  notifications?: Notification[];
  onUnauthorized?: () => void | Promise<void>;
}) => {
  const currentUserId = currentUser?.id ?? null;
  const storageKey = getResidentRequestsStorageKey(currentUserId);
  const [cache, , cacheLoading] = useAsyncStorage<ResidentRequestsCache>(
    storageKey,
    EMPTY_CACHE,
  );
  const initialSnapshot = getResidentRequestsSnapshot(currentUserId);
  const hasInitialSnapshot = isResidentRequestsSnapshotFresh(initialSnapshot);
  const [requests, setRequests] = useState<Request[]>(
    hasInitialSnapshot ? initialSnapshot?.items ?? [] : [],
  );
  const [isLoading, setIsLoading] = useState(Boolean(currentUserId && !hasInitialSnapshot));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const pendingNotificationRefreshRef = useRef(false);
  const lastNotificationIdRef = useRef<string | null>(null);
  const bootstrappedUserIdRef = useRef<string | null>(null);
  const onUnauthorizedRef = useRef(onUnauthorized);

  const userNotifications = useMemo(
    () => filterNotificationsByUser(notifications ?? [], currentUserId),
    [currentUserId, notifications],
  );
  const hasResidentHistoryAccess = hasActiveResidentHistoryAccess(currentUser);
  const historyUnavailable =
    currentUser?.role === "tenant" && !hasResidentHistoryAccess;

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  useEffect(() => {
    inFlightRef.current = false;
    pendingNotificationRefreshRef.current = false;
    lastNotificationIdRef.current = null;
    bootstrappedUserIdRef.current = null;

    if (!currentUserId) {
      setRequests([]);
      setIsLoading(false);
      setIsRefreshing(false);
      setErrorMessage(null);
      return;
    }

    const snapshot = getResidentRequestsSnapshot(currentUserId);
    setRequests(snapshot?.items ?? []);
    setIsLoading(!isResidentRequestsSnapshotFresh(snapshot));
    setIsRefreshing(false);
    setErrorMessage(null);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !historyUnavailable) {
      return;
    }

    inFlightRef.current = false;
    bootstrappedUserIdRef.current = null;
    setRequests([]);
    setIsLoading(false);
    setIsRefreshing(false);
    setErrorMessage(RESIDENT_HISTORY_UNAVAILABLE_MESSAGE);
    void clearResidentRequestsCache(currentUserId);
  }, [currentUserId, historyUnavailable]);

  const refreshRequests = useCallback(
    async (options: RefreshOptions = {}): Promise<void> => {
      if (!currentUserId) {
        setRequests([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setErrorMessage(null);
        return;
      }

      if (!hasResidentHistoryAccess) {
        bootstrappedUserIdRef.current = null;
        setRequests([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setErrorMessage(RESIDENT_HISTORY_UNAVAILABLE_MESSAGE);
        void clearResidentRequestsCache(currentUserId);
        return;
      }

      if (inFlightRef.current) {
        if (options.reason === "notification") {
          pendingNotificationRefreshRef.current = true;
        }
        return;
      }

        if (!options.asRefresh && options.reason !== "notification") {
          const cachedSnapshot = getResidentRequestsSnapshot(currentUserId);
          if (isResidentRequestsSnapshotFresh(cachedSnapshot)) {
            setRequests(cachedSnapshot?.items ?? []);
            setIsLoading(false);
            setIsRefreshing(false);
            setErrorMessage(null);
            return;
          }
        }

      inFlightRef.current = true;
      if (options.showLoading) setIsLoading(true);
      if (options.asRefresh) setIsRefreshing(true);

      try {
        let sharedPromise = sharedResidentRequestsPromises.get(currentUserId);

        if (!sharedPromise) {
          sharedPromise = (async (): Promise<ResidentRequestsSnapshot> => {
            const response = await residentRequestsApi.getRequests();
            const items = Array.isArray(response)
              ? response
              : Array.isArray(response?.data)
                ? response.data
                : Array.isArray((response as any)?.items)
                  ? (response as any).items
                  : [];

            return {
              userId: currentUserId,
              items: mapResidentRequestsFromBackend(items, currentUser),
              fetchedAt: Date.now(),
            };
          })().finally(() => {
            sharedResidentRequestsPromises.delete(currentUserId);
          });

          sharedResidentRequestsPromises.set(currentUserId, sharedPromise);
        }

        const snapshot = await sharedPromise;
        const publishedSnapshot = publishResidentRequestsSnapshot(snapshot, {
          persist: true,
        });
        setRequests(publishedSnapshot.items);
        setErrorMessage(null);
      } catch (error) {
        if (getStatusCode(error) === 401) {
          await onUnauthorizedRef.current?.();
          return;
        }

        if (isActiveOccupancyRequiredError(error)) {
          bootstrappedUserIdRef.current = null;
          await clearResidentRequestsCache(currentUserId);
          setRequests([]);
          setErrorMessage(RESIDENT_HISTORY_UNAVAILABLE_MESSAGE);
          return;
        }

        console.error("[Requests] Failed to fetch requests:", error);

        const cachedSnapshot = getResidentRequestsSnapshot(currentUserId);
        setRequests(cachedSnapshot?.items ?? []);
        setErrorMessage(null);
      } finally {
        if (options.showLoading) setIsLoading(false);
        if (options.asRefresh) setIsRefreshing(false);
        inFlightRef.current = false;

        if (pendingNotificationRefreshRef.current) {
          pendingNotificationRefreshRef.current = false;
          void refreshRequests({ reason: "notification" });
        }
      }
    },
    [currentUser, currentUserId, hasResidentHistoryAccess],
  );

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const listeners = getResidentRequestsListenerSet(currentUserId);
    const handleSnapshot = (snapshot: ResidentRequestsSnapshot) => {
      setRequests(snapshot.items);
      setIsLoading(false);
      setIsRefreshing(false);
    };

    listeners.add(handleSnapshot);

    return () => {
      listeners.delete(handleSnapshot);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (cacheLoading) return;
    if (!currentUserId) return;
    if (historyUnavailable) return;
    if (bootstrappedUserIdRef.current === currentUserId) return;

    bootstrappedUserIdRef.current = currentUserId;

    const liveSnapshot = getResidentRequestsSnapshot(currentUserId);
    if (liveSnapshot) {
      setRequests(liveSnapshot.items);
      setIsLoading(false);
      if (isResidentRequestsSnapshotFresh(liveSnapshot)) {
        return;
      }
    }

    const cacheSnapshot = getSnapshotFromCache(currentUserId, cache);
    const hydratedItems = liveSnapshot?.items ?? cacheSnapshot?.items ?? [];

    if (!liveSnapshot && cacheSnapshot) {
      publishResidentRequestsSnapshot(cacheSnapshot, { persist: false });
      setRequests(cacheSnapshot.items);
      setIsLoading(false);

      if (isResidentRequestsSnapshotFresh(cacheSnapshot)) {
        return;
      }
    }

    void refreshRequests({
      showLoading: hydratedItems.length === 0,
      reason: "initial",
    });
  }, [cache, cacheLoading, currentUserId, historyUnavailable, refreshRequests]);

  useEffect(() => {
    if (historyUnavailable) return;
    if (!currentUserId || userNotifications.length === 0) return;
    const relevant = userNotifications.filter(isRequestNotification);
    if (relevant.length === 0) return;

    const latest = getLatestNotification(relevant);
    if (!latest?.id || lastNotificationIdRef.current === latest.id) return;

    const cachedSnapshot = getResidentRequestsSnapshot(currentUserId);
    const latestNotificationAt = getTimestamp(latest.createdAt);
    if (
      cachedSnapshot &&
      latestNotificationAt > 0 &&
      latestNotificationAt <= cachedSnapshot.fetchedAt
    ) {
      lastNotificationIdRef.current = latest.id;
      return;
    }

    lastNotificationIdRef.current = latest.id;
    void refreshRequests({ reason: "notification" });
  }, [currentUserId, historyUnavailable, refreshRequests, userNotifications]);

  return {
    errorMessage,
    historyUnavailable,
    requests,
    isLoading,
    isRefreshing,
    refreshRequests,
  };
};
