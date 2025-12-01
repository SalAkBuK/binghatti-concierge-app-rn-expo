import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";
import type { UseMaintenanceDataResult } from "../_types";

export function useMaintenanceData(): UseMaintenanceDataResult {
  const { currentUser, notifications, actions } = useApp();

  const buildingOptions = useMemo(() => actions.getManagedBuildings?.() ?? [], [actions]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  return {
    buildingOptions,
    hasUnreadNotifications,
  };
}
