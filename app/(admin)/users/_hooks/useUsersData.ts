import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import type { User } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";
import { measure } from "../../../../utils/adminProfiler";

export function useUsersData() {
  const { currentUser, notifications, actions } = useApp();

  const isManagement = currentUser?.role === "management";
  const canManageUsers = ["admin", "super_admin"].includes(
    currentUser?.role ?? "",
  );
  const hasScopedBuildings =
    currentUser?.role === "management" || currentUser?.role === "super_admin";

  const managedBuildingIds = useMemo(() => {
    if (!hasScopedBuildings) return [];
    return actions.getManagedBuildingIds?.() ?? [];
  }, [actions, hasScopedBuildings]);

  const defaultBuildingId = useMemo(() => {
    if (managedBuildingIds.length > 0) {
      return managedBuildingIds[0];
    }
    return currentUser?.profile?.buildingId || "building-1";
  }, [managedBuildingIds, currentUser?.profile?.buildingId]);

  const allUsers = actions.getUsers();
  const allBuildings = actions.getBuildings();

  const managedBuildings = useMemo(() => {
    if (!isManagement) return allBuildings;
    return actions.getManagedBuildings?.() ?? [];
  }, [actions, allBuildings, isManagement]);

  const scopedUsers = useMemo(() => {
    return measure("useUsersData: compute scopedUsers", () => {
      let filtered: User[];

      if (!isManagement) {
        filtered = allUsers;
      } else if (!managedBuildingIds.length) {
        filtered = allUsers.filter((user) => user.id === currentUser?.id);
      } else {
        filtered = allUsers.filter((user: User) => {
          if (
            user.role === "tenant" ||
            user.role === "employee" ||
            user.role === "service_provider"
          ) {
            const buildingId = user.profile?.buildingId;
            return buildingId ? managedBuildingIds.includes(buildingId) : false;
          }
          if (user.role === "management") {
            return user.id === currentUser?.id;
          }
          return false;
        });
      }

      // Filter out users with invalid IDs
      return filtered.filter((user) => user.id != null && user.id !== undefined && user.id !== '');
    });
  }, [allUsers, currentUser?.id, isManagement, managedBuildingIds]);

  const hasUnreadNotifications = useMemo(() => {
    const userNotifications = filterNotificationsByUser(
      notifications || [],
      currentUser?.id,
    );
    return userNotifications.some((notif) => !notif.read);
  }, [notifications, currentUser?.id]);

  return {
    actions,
    scopedUsers,
    managedBuildings,
    canManageUsers,
    hasUnreadNotifications,
    defaultBuildingId,
  };
}
