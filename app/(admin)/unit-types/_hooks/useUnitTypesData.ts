import { useApp } from "../../../../lib/context/connected-app-provider";
import type { User } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";

export interface UseUnitTypesDataResult {
  currentUser: User | null;
  allUnitTypes: ReturnType<ReturnType<typeof useApp>["actions"]["getUnitTypes"]>;
  hasUnreadNotifications: boolean;
  canManageUnitTypes: boolean;
  actions: ReturnType<typeof useApp>["actions"];
}

export function useUnitTypesData(): UseUnitTypesDataResult {
  const { currentUser, notifications, actions } = useApp();

  const allUnitTypes = actions.getUnitTypes();

  const canManageUnitTypes = ["admin", "super_admin"].includes(
    currentUser?.role ?? "",
  );

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  return {
    currentUser,
    allUnitTypes,
    hasUnreadNotifications,
    canManageUnitTypes,
    actions,
  };
}
