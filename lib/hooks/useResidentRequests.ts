import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAsyncStorage } from "./useAsyncStorage";
import { residentRequestsApi } from "../services/api/resident-requests";
import { STORAGE_KEYS } from "../utils/constants";
import { filterNotificationsByUser } from "../utils/helpers";
import type { Notification, Request, RequestStatus, User } from "../types";

type ResidentRequestsCache = {
  items: Request[];
  fetchedAt: string | null;
};

type RefreshOptions = {
  showLoading?: boolean;
  asRefresh?: boolean;
  reason?: "initial" | "manual" | "notification";
};

const mapStatusFromBackend = (status: any): RequestStatus => {
  const numeric = Number(status);
  if (!Number.isNaN(numeric)) {
    switch (numeric) {
      case 1:
        return "pending";
      case 2:
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
  if (normalized === "ASSIGNED" || normalized === "IN_PROGRESS") {
    return "in-progress";
  }
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

const isRequestNotification = (notification: Notification) => {
  const type = String(notification.type || "").toUpperCase();
  return type === "REQUEST_STATUS_CHANGED" || type === "REQUEST_COMMENTED";
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
  const storageKey = currentUser?.id
    ? `${STORAGE_KEYS.resident_requests}_${currentUser.id}`
    : STORAGE_KEYS.resident_requests;
  const [cache, setCache, cacheLoading] = useAsyncStorage<ResidentRequestsCache>(
    storageKey,
    { items: [], fetchedAt: null },
  );
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inFlightRef = useRef(false);
  const pendingNotificationRefreshRef = useRef(false);
  const lastNotificationIdRef = useRef<string | null>(null);
  const initialFetchRef = useRef(false);

  const userNotifications = useMemo(
    () => filterNotificationsByUser(notifications ?? [], currentUser?.id),
    [notifications, currentUser?.id],
  );

  const mapBackendRequests = useCallback(
    (items: any[]): Request[] => {
      if (!currentUser?.id) return [];
      return items.map((item: any) => ({
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
        apartment: item.unit?.label || currentUser?.profile?.apartment || "",
        floor:
          item.unit?.floor != null
            ? String(item.unit.floor)
            : currentUser?.profile?.floor || "",
        contactPhone: currentUser?.profile?.phone || "",
        preferredTime: "",
        additionalNotes: "",
        attachments: Array.isArray(item.attachments)
          ? item.attachments
              .map((att: any) => att?.url || att?.fileUrl || att?.uri || null)
              .filter(Boolean)
          : [],
        comments: [],
        messages: [],
        notes: [],
        timeline: [],
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        _source: "backend" as const,
      }));
    },
    [currentUser],
  );

  const refreshRequests = useCallback(
    async (options: RefreshOptions = {}): Promise<void> => {
      if (!currentUser?.id) return;
      if (inFlightRef.current) {
        if (options.reason === "notification") {
          pendingNotificationRefreshRef.current = true;
        }
        return;
      }

      inFlightRef.current = true;
      if (options.showLoading) setIsLoading(true);
      if (options.asRefresh) setIsRefreshing(true);

      try {
        const response = await residentRequestsApi.getRequests();
        const items = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray((response as any)?.items)
              ? (response as any).items
              : [];
        const mappedRequests = mapBackendRequests(items);
        setRequests(mappedRequests);
        await setCache({
          items: mappedRequests,
          fetchedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "status" in error &&
          (error as { status?: number }).status === 401
        ) {
          await onUnauthorized?.();
          return;
        }
        console.error("[Requests] Failed to fetch requests:", error);
        setRequests([]);
        await setCache({ items: [], fetchedAt: cache.fetchedAt ?? null });
      } finally {
        if (options.showLoading) setIsLoading(false);
        if (options.asRefresh) setIsRefreshing(false);
        inFlightRef.current = false;

        if (pendingNotificationRefreshRef.current) {
          pendingNotificationRefreshRef.current = false;
          refreshRequests({ reason: "notification" });
        }
      }
    },
    [cache.fetchedAt, currentUser?.id, mapBackendRequests, onUnauthorized, setCache],
  );

  useEffect(() => {
    if (cacheLoading) return;
    if (!currentUser?.id) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setRequests(cache.items ?? []);
    setIsLoading(false);

    if (!initialFetchRef.current && (cache.items?.length ?? 0) === 0) {
      initialFetchRef.current = true;
      refreshRequests({ showLoading: true, reason: "initial" });
    } else {
      initialFetchRef.current = true;
    }
  }, [cache.items, cacheLoading, currentUser?.id, refreshRequests]);

  useEffect(() => {
    if (!currentUser?.id || userNotifications.length === 0) return;
    const relevant = userNotifications.filter(isRequestNotification);
    if (relevant.length === 0) return;

    const latest = getLatestNotification(relevant);
    if (!latest?.id || lastNotificationIdRef.current === latest.id) return;

    lastNotificationIdRef.current = latest.id;
    refreshRequests({ reason: "notification" });
  }, [currentUser?.id, refreshRequests, userNotifications]);

  return {
    requests,
    isLoading,
    isRefreshing,
    refreshRequests,
  };
};
