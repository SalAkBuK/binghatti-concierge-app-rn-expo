import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import type { Building, User } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";

export interface UseTenantsDataResult {
  currentUser: User | null;
  allBuildings: Building[];
  managedBuildings: Building[];
  allUsers: User[];
  tenants: User[];
  buildingMap: Map<string, Building>;
  hasUnreadNotifications: boolean;
  isManagement: boolean;
  actions: ReturnType<typeof useApp>["actions"];
}

export function useTenantsData(): UseTenantsDataResult {
  const { currentUser, notifications, actions } = useApp();
  const { getBuildings, getManagedBuildings, getUsers } = actions;

  const isManagement = currentUser?.role === "management";

  const allBuildings = useMemo(() => getBuildings(), [getBuildings]);
  const managedBuildings = useMemo(() => {
    if (!isManagement) return allBuildings;
    return getManagedBuildings?.() ?? [];
  }, [isManagement, getManagedBuildings, allBuildings]);

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    allBuildings.forEach((building) => {
      map.set(building.id, building);
    });
    return map;
  }, [allBuildings]);

  const allUsers = useMemo(() => getUsers(), [getUsers]);

  const tenants = useMemo(
    () => allUsers.filter((user) => user.role === "tenant"),
    [allUsers],
  );

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  return {
    currentUser,
    allBuildings,
    managedBuildings,
    allUsers,
    tenants,
    buildingMap,
    hasUnreadNotifications,
    isManagement,
    actions,
  };
}
