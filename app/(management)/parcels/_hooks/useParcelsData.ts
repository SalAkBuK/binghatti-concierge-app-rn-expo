import { useMemo } from "react";

import { useAuth } from "../../../../lib/context/auth-context";
import { useAppDomain } from "../../../../lib/context/connected-app-provider";
import { useNotifications } from "../../../../lib/context/notifications-context";
import type { Building, User } from "../../../../lib/types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../../../lib/utils/helpers";

export interface UseParcelsDataResult {
  currentUser: User | null;
  allBuildings: Building[];
  hasUnreadNotifications: boolean;
}

export function useParcelsData(): UseParcelsDataResult {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const { property } = useAppDomain();

  const allBuildings = useMemo(
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
    currentUser,
    allBuildings,
    hasUnreadNotifications,
  };
}
