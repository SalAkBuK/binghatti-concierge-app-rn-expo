import { useMemo } from "react";

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
  // PERFORMANCE FIX: Extract only what we need from useApp()
  const { currentUser, notifications, actions } = useApp();

  // PERFORMANCE FIX: Memoize computed values to prevent re-computation
  const isManagement = useMemo(
    () => currentUser?.role === "management",
    [currentUser?.role]
  );

  const managementBaseRoute = useMemo(
    () => (isManagement ? "/(management)" : "/(admin)"),
    [isManagement]
  );

  // These functions are now memoized in useApp(), so calling them directly is safe
  const analytics = actions.getAnalytics();

  const managedBuildings = useMemo(
    () => (isManagement ? actions.getManagedBuildings?.() ?? [] : []),
    [isManagement, actions.getManagedBuildings]
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
    analytics,
    managedBuildings,
    hasUnreadNotifications,
    isManagement,
    managementBaseRoute,
    actions,
  };
}
