import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiService } from "../services/api";
import type { Notification } from "../types";
import {
  isNotificationDismissed,
  normalizeNotifications,
} from "../utils/helpers";

type RefetchOptions = {
  asRefresh?: boolean;
  showLoading?: boolean;
};

type HookOptions = {
  enabled?: boolean;
  realtimeNotifications?: Notification[];
  onUnauthorized?: () => void | Promise<void>;
};

type UseBroadcastNotificationsResult = {
  notifications: Notification[];
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  refetch: (options?: RefetchOptions) => Promise<void>;
};

const MAX_BROADCAST_NOTICES = 20;

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

const isBroadcastNotification = (notification: Notification): boolean =>
  String(notification.type || "").toUpperCase() === "BROADCAST";

const getNotificationTimestamp = (notification: Notification): number => {
  const parsed = Date.parse(notification.createdAt || "");
  return Number.isNaN(parsed) ? 0 : parsed;
};

const mergeNotifications = (
  ...groups: Array<Notification[] | undefined>
): Notification[] => {
  const byId = new Map<string, Notification>();

  groups.forEach((items) => {
    items?.forEach((notification) => {
      if (!notification?.id || !isBroadcastNotification(notification)) return;
      if (isNotificationDismissed(notification)) {
        byId.delete(notification.id);
        return;
      }
      const existing = byId.get(notification.id);
      if (
        !existing ||
        getNotificationTimestamp(notification) >= getNotificationTimestamp(existing)
      ) {
        byId.set(notification.id, notification);
      }
    });
  });

  return Array.from(byId.values())
    .sort((a, b) => getNotificationTimestamp(b) - getNotificationTimestamp(a))
    .slice(0, MAX_BROADCAST_NOTICES);
};

export const useBroadcastNotifications = (
  options?: HookOptions,
): UseBroadcastNotificationsResult => {
  const enabled = options?.enabled ?? true;
  const realtimeNotifications = options?.realtimeNotifications ?? [];
  const onUnauthorized = options?.onUnauthorized;
  const onUnauthorizedRef = useRef(onUnauthorized);
  const inFlightRef = useRef(false);

  const [fetchedNotifications, setFetchedNotifications] = useState<Notification[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  const refetch = useCallback(
    async ({ asRefresh = false, showLoading = !asRefresh }: RefetchOptions = {}) => {
      if (!enabled) {
        setFetchedNotifications([]);
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
        const response = await apiService.notifications.getNotifications({
          type: "BROADCAST" as Notification["type"],
          limit: MAX_BROADCAST_NOTICES,
        });
        const payload = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray((response as { items?: Notification[] })?.items)
              ? (response as { items: Notification[] }).items
              : [];

        setFetchedNotifications(
          mergeNotifications(normalizeNotifications(payload)),
        );
        setErrorMessage(null);
      } catch (error) {
        if (getStatusCode(error) === 401) {
          await onUnauthorizedRef.current?.();
          return;
        }

        setErrorMessage(
          "Unable to load building notices right now. Please try again.",
        );
      } finally {
        if (showLoading) setIsLoading(false);
        if (asRefresh) setIsRefreshing(false);
        inFlightRef.current = false;
      }
    },
    [enabled],
  );

  useEffect(() => {
    void refetch({ showLoading: true, asRefresh: false });
  }, [refetch]);

  const notifications = useMemo(
    () =>
      mergeNotifications(
        fetchedNotifications,
        normalizeNotifications(realtimeNotifications),
      ),
    [fetchedNotifications, realtimeNotifications],
  );

  return {
    notifications,
    isLoading,
    isRefreshing,
    errorMessage,
    refetch,
  };
};
