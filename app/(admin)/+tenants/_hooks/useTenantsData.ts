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
  // PERFORMANCE FIX: Extract only what we need from useApp()
  // This reduces re-renders when unrelated context state changes
  const { currentUser, notifications, actions } = useApp();
  const { getBuildings, getManagedBuildings, getUsers } = actions;

  const isManagement = useMemo(
    () => currentUser?.role === "management",
    [currentUser?.role]
  );

  // PERFORMANCE FIX: Call getBuildings/getUsers directly instead of in useMemo
  // The functions themselves are memoized in useApp now
  const allBuildings = getBuildings();
  const allUsers = getUsers();

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

  const tenants = useMemo(
    () => allUsers.filter((user) => user.role === "tenant"),
    [allUsers],
  );

  const hasUnreadNotifications = useMemo(() => {
    const userNotifications = filterNotificationsByUser(
      notifications || [],
      currentUser?.id,
    );
    return userNotifications.some((notif) => !notif.read);
  }, [notifications, currentUser?.id]);

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
