import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import type { Building, BuildingEmployee, ServiceProviderProfile, User } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";

import type { ProviderSummary, StaffSummary } from "../_types";

export interface UseWorkforceDataResult {
  currentUser: User | null;
  hasUnreadNotifications: boolean;
  isManagement: boolean;
  allBuildings: Building[];
  managedBuildings: Building[];
  buildingMap: Map<string, Building>;
  employees: BuildingEmployee[];
  serviceProviders: ServiceProviderProfile[];
  staffSummary: StaffSummary;
  providerSummary: ProviderSummary;
  actions: ReturnType<typeof useApp>["actions"];
}

export function useWorkforceData(selectedBuildingId: string): UseWorkforceDataResult {
  const { currentUser, notifications, actions } = useApp();
  const {
    getBuildings,
    getManagedBuildings,
    getBuildingEmployees,
    getServiceProviders,
  } = actions;

  const isManagement = currentUser?.role === "management";

  const allBuildings = useMemo(() => getBuildings(), [getBuildings]);
  const managedBuildings = useMemo(() => {
    if (!isManagement) return allBuildings;
    return getManagedBuildings?.() ?? [];
  }, [isManagement, getManagedBuildings, allBuildings]);

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    allBuildings.forEach((building) => map.set(building.id, building));
    return map;
  }, [allBuildings]);

  const employees = useMemo(() => {
    if (selectedBuildingId === "all") {
      const scopedBuildingIds =
        isManagement && managedBuildings.length
          ? managedBuildings.map((building) => building.id)
          : allBuildings.map((building) => building.id);

      return scopedBuildingIds.flatMap((buildingId) =>
        getBuildingEmployees(buildingId),
      );
    }

    return getBuildingEmployees(selectedBuildingId);
  }, [
    selectedBuildingId,
    managedBuildings,
    allBuildings,
    isManagement,
    getBuildingEmployees,
  ]);

  const serviceProviders = useMemo<ServiceProviderProfile[]>(
    () => getServiceProviders(),
    [getServiceProviders],
  );

  const staffSummary = useMemo(() => {
    const total = employees.length;
    const avgRating =
      employees.reduce((acc, employee) => acc + (employee.rating || 0), 0) /
      (employees.length || 1);
    const nightShift = employees.filter((employee) => employee.shift === "night")
      .length;

    return {
      total,
      nightShift,
      avgRating: avgRating ? avgRating.toFixed(1) : "N/A",
    };
  }, [employees]);

  const providerSummary = useMemo(() => {
    const topPerformer = [...serviceProviders].sort(
      (a, b) => b.rating - a.rating,
    )[0];
    const averageResponse =
      serviceProviders.reduce(
        (acc, provider) => acc + (provider.responseTimeMinutes || 0),
        0,
      ) / (serviceProviders.length || 1);

    return {
      total: serviceProviders.length,
      topPerformer,
      averageResponse: Math.round(averageResponse || 0),
    };
  }, [serviceProviders]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  return {
    currentUser,
    hasUnreadNotifications,
    isManagement,
    allBuildings,
    managedBuildings,
    buildingMap,
    employees,
    serviceProviders,
    staffSummary,
    providerSummary,
    actions,
  };
}
