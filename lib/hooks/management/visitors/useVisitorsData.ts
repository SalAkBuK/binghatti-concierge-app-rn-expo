import { useMemo } from "react";

import { useAuth } from "../../../context/auth-context";
import { useAppDomain } from "../../../context/connected-app-provider";
import { useNotifications } from "../../../context/notifications-context";
import type { Building, User } from "../../../types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../../utils/helpers";

export interface UseVisitorsDataResult {
  currentUser: User | null;
  allBuildings: Building[];
  hasUnreadNotifications: boolean;
}

export function useVisitorsData(): UseVisitorsDataResult {
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
