import { useApp } from "../../../../lib/context/connected-app-provider";
import type { User } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";

export interface UseDashboardDataResult {
  currentUser: User | null;
  analytics: ReturnType<ReturnType<typeof useApp>["actions"]["getAnalytics"]>;
  managedBuildings: ReturnType<
    NonNullable<ReturnType<typeof useApp>["actions"]["getManagedBuildings"]>
  >;
  hasUnreadNotifications: boolean;
  isManagement: boolean;
  managementBaseRoute: string;
  actions: ReturnType<typeof useApp>["actions"];
}

export function useDashboardData(): UseDashboardDataResult {
  const { currentUser, notifications, actions } = useApp();

  const isManagement = currentUser?.role === "management";
  const managementBaseRoute = isManagement ? "/(management)" : "/(admin)";

  const analytics = actions.getAnalytics();

  const managedBuildings = isManagement
    ? actions.getManagedBuildings?.() ?? []
    : [];

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  return {
    currentUser,
    analytics,
    managedBuildings,
    hasUnreadNotifications,
    isManagement,
    managementBaseRoute,
    actions,
  };
}
