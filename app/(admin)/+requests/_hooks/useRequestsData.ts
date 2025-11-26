import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import type { Building } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";
import type { StatusFilter, UseRequestsDataResult } from "../_types";

interface UseRequestsDataParams {
  selectedBuildingId: string;
  statusFilter: StatusFilter;
  searchQuery: string;
}

export function useRequestsData({
  selectedBuildingId,
  statusFilter,
  searchQuery,
}: UseRequestsDataParams): UseRequestsDataResult {
  const {
    currentUser,
    notifications,
    requests: requestItems,
    actions,
  } = useApp();
  const {
    getBuildings,
    getManagedBuildings,
    getJobs,
    getServiceProviders,
  } = actions;

  const isManagement = currentUser?.role === "management";
  const isAdmin = currentUser?.role === "admin";

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

  const jobs = useMemo(() => getJobs(), [getJobs]);
  const serviceProviders = useMemo(
    () => getServiceProviders(),
    [getServiceProviders],
  );

  const scopedRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const buildingScope =
      selectedBuildingId === "all"
        ? managedBuildings.length
          ? managedBuildings.map((building) => building.id)
          : undefined
        : [selectedBuildingId];

    return requestItems
      .filter((request) => {
        if (buildingScope && buildingScope.length) {
          return buildingScope.includes(request.buildingId);
        }

        if (isManagement && managedBuildings.length) {
          return managedBuildings.some(
            (building) => building.id === request.buildingId,
          );
        }

        return true;
      })
      .filter((request) => {
        if (statusFilter === "all") return true;
        return request.status === statusFilter;
      })
      .filter((request) => {
        if (!query) return true;
        const haystack = `${request.title} ${request.description} ${request.apartment || ""} ${request.type || ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [
    requestItems,
    selectedBuildingId,
    managedBuildings,
    statusFilter,
    searchQuery,
    isManagement,
  ]);

  const summary = useMemo(() => {
    const buildingScoped = requestItems.filter((request) => {
      if (selectedBuildingId === "all") {
        if (isManagement && managedBuildings.length) {
          return managedBuildings.some(
            (building) => building.id === request.buildingId,
          );
        }
        return true;
      }
      return request.buildingId === selectedBuildingId;
    });

    const total = buildingScoped.length;
    const open = buildingScoped.filter((request) =>
      ["pending", "in-progress"].includes(request.status),
    ).length;
    const resolved = buildingScoped.filter(
      (request) => request.status === "completed",
    ).length;
    const unassigned = buildingScoped.filter((request) => {
      return !jobs.some((job) => job.requestId === request.id);
    }).length;

    return {
      total,
      open,
      resolved,
      unassigned,
    };
  }, [requestItems, selectedBuildingId, managedBuildings, isManagement, jobs]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const buildingFilterOptions = useMemo(() => {
    const scope = isManagement ? managedBuildings : allBuildings;
    return scope;
  }, [isManagement, managedBuildings, allBuildings]);

  const selectedBuildingName =
    selectedBuildingId !== "all"
      ? buildingMap.get(selectedBuildingId)?.name || "Building"
      : "All Buildings";

  return {
    scopedRequests,
    summary,
    buildingFilterOptions,
    buildingMap,
    managedBuildings,
    selectedBuildingName,
    hasUnreadNotifications,
    isManagement: Boolean(isManagement),
    isAdmin: Boolean(isAdmin),
    jobs,
    serviceProviders,
    actions,
  };
}
