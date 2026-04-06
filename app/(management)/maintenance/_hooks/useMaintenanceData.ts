import { useMemo } from "react";

import { useAuth } from "../../../../lib/context/auth-context";
import { useAppDomain } from "../../../../lib/context/connected-app-provider";
import { useNotifications } from "../../../../lib/context/notifications-context";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../../../lib/utils/helpers";
import type { UseMaintenanceDataResult } from "../_types";

export function useMaintenanceData(): UseMaintenanceDataResult {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const { property } = useAppDomain();

  const buildingOptions = useMemo(
    () => property.getManagedBuildings?.() ?? [],
    [property],
  );

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  return {
    buildingOptions,
    hasUnreadNotifications,
  };
}
