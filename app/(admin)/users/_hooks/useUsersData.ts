import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import type { User } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";

export function useUsersData() {
  const { currentUser, notifications, actions } = useApp();

  const isSuperAdmin = currentUser?.role === "super_admin";
  const isAdmin = currentUser?.role === "admin";
  const isManagement = currentUser?.role === "management";
  const canManageUsers = ["admin", "super_admin"].includes(
    currentUser?.role ?? "",
  );

  const adminAssignedBuildingIds = useMemo(
    () => actions.getAdminAssignedBuildingIds?.() ?? [],
    [actions],
  );

  const managedBuildingIds = useMemo(
    () => actions.getManagedBuildingIds?.() ?? [],
    [actions],
  );

  const scopedBuildingIds = useMemo(() => {
    if (isSuperAdmin) return [];
    if (isAdmin) return adminAssignedBuildingIds;
    if (isManagement) return managedBuildingIds;
    return [];
  }, [adminAssignedBuildingIds, isAdmin, isManagement, isSuperAdmin, managedBuildingIds]);

  const defaultBuildingId = useMemo(() => {
    if (scopedBuildingIds.length > 0) {
      return scopedBuildingIds[0];
    }
    return currentUser?.profile?.buildingId || "building-1";
  }, [scopedBuildingIds, currentUser?.profile?.buildingId]);

  const allUsers = actions.getUsers();
  const allBuildings = actions.getBuildings();

  const managedBuildings = useMemo(() => {
    // For admin users, use getBuildings() which filters by adminAssignedBuildingIds
    if (currentUser?.role === "admin") {
      return allBuildings; // allBuildings already filtered by getBuildings() for admin role
    }
    // For management users, use getManagedBuildings() which filters by profile.managedBuildingIds
    if (currentUser?.role === "management") {
      return actions.getManagedBuildings?.() ?? [];
    }
    // For super_admin and other roles, return all buildings
    return allBuildings;
  }, [actions, allBuildings, currentUser?.role]);

  const scopedUsers = useMemo(() => {
    let filtered: User[];

    if (isSuperAdmin) {
      filtered = allUsers;
    } else if (isAdmin || isManagement) {
      if (!scopedBuildingIds.length) {
        filtered = allUsers.filter((user) => user.id === currentUser?.id);
      } else {
        filtered = allUsers.filter((user: User) => {
          if (
            user.role === "tenant" ||
            user.role === "employee" ||
            user.role === "service_provider"
          ) {
            const buildingId = user.profile?.buildingId;
            return buildingId
              ? scopedBuildingIds.includes(String(buildingId))
              : false;
          }
          if (user.role === "management") {
            const managedIds = user.profile?.managedBuildingIds || [];
            const primaryBuildingId = user.profile?.buildingId;
            const hasMatch =
              Array.isArray(managedIds) && managedIds.length > 0
                ? managedIds.some((id: any) =>
                    scopedBuildingIds.includes(String(id)),
                  )
                : primaryBuildingId
                  ? scopedBuildingIds.includes(String(primaryBuildingId))
                  : false;
            return hasMatch;
          }
          // Admins should not see other admins/super_admins
          return false;
        });
      }
    } else {
      filtered = allUsers.filter((user: User) => {
        // Fallback: only show current user for non-admin/management roles
        return user.id === currentUser?.id;
      });
    }

    // Filter out users with invalid IDs
    return filtered.filter((user) => user.id != null && user.id !== undefined && user.id !== '');
  }, [allUsers, currentUser?.id, isAdmin, isManagement, isSuperAdmin, scopedBuildingIds]);

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
