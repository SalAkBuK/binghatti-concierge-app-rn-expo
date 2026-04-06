import { useMemo } from "react";

import { useAuth } from "../../../context/auth-context";
import { useAppDomain } from "../../../context/connected-app-provider";
import { useNotifications } from "../../../context/notifications-context";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../../utils/helpers";
import type { UseMaintenanceDataResult } from "../../../../components/management/maintenance/_types";

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
