import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import type { Building, User } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";

export interface UseBroadcastDataResult {
  currentUser: User | null;
  allBuildings: Building[];
  hasUnreadNotifications: boolean;
  actions: ReturnType<typeof useApp>["actions"];
}

export function useBroadcastData(): UseBroadcastDataResult {
  const { currentUser, notifications, actions } = useApp();

  const allBuildings = useMemo(() => actions.getBuildings(), [actions]);

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
