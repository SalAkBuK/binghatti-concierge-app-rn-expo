import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import type { Building } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";
import type { UseServiceProvidersDataResult } from "../_types";

export function useServiceProvidersData(): UseServiceProvidersDataResult {
  const { currentUser, notifications, actions, providerAccessRequests } = useApp();

  const serviceProviders = useMemo(() => actions.getServiceProviders(), [actions]);
  const pendingRequests = useMemo(() => {
    return (providerAccessRequests || []).filter((req) => req.status === "pending");
  }, [providerAccessRequests]);

  const allBuildings = useMemo(() => actions.getBuildings(), [actions]);
  const managedBuildings = useMemo(() => {
    if (currentUser?.role !== "management") return allBuildings;
    return actions.getManagedBuildings?.() ?? [];
  }, [actions, currentUser?.role, allBuildings]);

  const buildingOptions: Building[] =
    currentUser?.role === "management" ? managedBuildings : allBuildings;

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  return {
    serviceProviders,
    pendingRequests,
    buildingOptions,
    managedBuildings,
    hasUnreadNotifications,
    actions,
    currentUser,
  };
}
