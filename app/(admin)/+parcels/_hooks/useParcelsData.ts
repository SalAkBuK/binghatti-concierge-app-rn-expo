import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import type { Building, User } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";

export interface UseParcelsDataResult {
  currentUser: User | null;
  allBuildings: Building[];
  hasUnreadNotifications: boolean;
  actions: ReturnType<typeof useApp>["actions"];
}

export function useParcelsData(): UseParcelsDataResult {
  const { currentUser, notifications, actions } = useApp();
  const { getBuildings } = actions;

  const allBuildings = useMemo(() => getBuildings?.() ?? [], [getBuildings]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  return {
    currentUser,
    allBuildings,
    hasUnreadNotifications,
    actions,
  };
}
