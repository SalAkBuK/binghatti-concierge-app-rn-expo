import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import type { Building } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";

export function useBuildingsData() {
  const { currentUser, notifications, actions, unitTypes } = useApp();

  const isManagement = currentUser?.role === "management";
  const canManageBuildings = ["admin", "super_admin"].includes(
    currentUser?.role ?? "",
  );
  const hasScopedBuildings =
    currentUser?.role === "management" || currentUser?.role === "super_admin";

  const managedBuildingIds = useMemo(() => {
    if (!hasScopedBuildings) return [];
    return actions.getManagedBuildingIds?.() ?? [];
  }, [actions, hasScopedBuildings]);

  const allBuildings = actions.getBuildings();
  const allUsers = actions.getUsers();

  const managementUsers = useMemo(
    () => allUsers.filter((user) => user.role === "management"),
    [allUsers],
  );

  const buildings = useMemo(() => {
    if (!isManagement) return allBuildings;
    if (!managedBuildingIds.length) {
      return allBuildings.filter(
        (building) => building.managerId === currentUser?.id,
      );
    }
    return allBuildings.filter((building: Building) =>
      managedBuildingIds.includes(building.id),
    );
  }, [allBuildings, currentUser?.id, isManagement, managedBuildingIds]);

  const userNotifications = useMemo(() => {
    return filterNotificationsByUser(notifications || [], currentUser?.id);
  }, [notifications, currentUser?.id]);

  const hasUnreadNotifications = useMemo(
    () => userNotifications.some((notif) => !notif.read),
    [userNotifications],
  );

  return {
    currentUser,
    actions,
    unitTypes,
    buildings,
    managementUsers,
    canManageBuildings,
    hasUnreadNotifications,
  };
}
