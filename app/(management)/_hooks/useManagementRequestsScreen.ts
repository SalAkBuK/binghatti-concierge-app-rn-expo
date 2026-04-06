import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { orgBuildingsApi } from '../../../lib/services/api/org-buildings';
import type { Building, Notification, Request, RequestStatus } from '../../../lib/types';
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from '../../../lib/utils/helpers';
import {
  getResponseItems,
  mapOrgAssignedBuilding,
  mapOrgBuildingRequestSummary,
} from './management-request-helpers';

export type StatusFilter = 'all' | RequestStatus;
export type PriorityFilter = 'all' | Request['priority'];
export type TypeFilter = 'all' | NonNullable<Request['type']>;

type UseManagementRequestsScreenOptions = {
  currentUserId?: string;
  notifications?: Notification[] | null;
  statusFilterParam?: string | string[];
};

const ITEMS_PER_PAGE = 20;
const REQUESTS_REFETCH_COOLDOWN_MS = 15000;

const STATUS_FILTER_VALUES: StatusFilter[] = [
  'all',
  'pending',
  'assigned',
  'in-progress',
  'on-hold',
  'completed',
  'cancelled',
];

const normalizeStatusFilter = (
  value?: string | string[],
): StatusFilter => {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return 'all';

  return STATUS_FILTER_VALUES.includes(candidate as StatusFilter)
    ? (candidate as StatusFilter)
    : 'all';
};

const loadManagedRequestsData = async (): Promise<{
  managedBuildings: Building[];
  buildingRequests: Request[];
}> => {
  const buildingsResponse = await orgBuildingsApi.getAssignedBuildings();
  const buildingsPayload = getResponseItems(buildingsResponse);

  if (!buildingsPayload.length) {
    return {
      managedBuildings: [],
      buildingRequests: [],
    };
  }

  const managedBuildings = buildingsPayload.map(mapOrgAssignedBuilding);

  if (!managedBuildings.length) {
    return {
      managedBuildings,
      buildingRequests: [],
    };
  }

  const requestResponses = await Promise.all(
    managedBuildings.map((building) =>
      orgBuildingsApi.getBuildingRequests(building.id),
    ),
  );

  const buildingRequests: Request[] = [];

  requestResponses.forEach((response, index) => {
    const payload = getResponseItems(response);

    if (!payload.length) {
      return;
    }

    const buildingId = managedBuildings[index].id;
    const buildingName = managedBuildings[index].name;
    const mappedRequests = payload.map((item: any) =>
      mapOrgBuildingRequestSummary(item, {
        buildingId,
        buildingName,
      }),
    );

    buildingRequests.push(...mappedRequests);
  });

  return {
    managedBuildings,
    buildingRequests,
  };
};

export const useManagementRequestsScreen = ({
  currentUserId,
  notifications,
  statusFilterParam,
}: UseManagementRequestsScreenOptions) => {
  const [managedBuildings, setManagedBuildings] = useState<Building[]>([]);
  const [buildingRequests, setBuildingRequests] = useState<Request[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    normalizeStatusFilter(statusFilterParam),
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
  const hasAnimatedHeaderRef = useRef(false);
  const lastRequestsFetchAtRef = useRef(0);
  const isRequestsFetchInFlightRef = useRef(false);

  const fetchRequestsData = useCallback(
    async ({ force = false, refreshing = false } = {}) => {
      if (!currentUserId) {
        setLoadingData(false);
        if (refreshing) {
          setIsRefreshing(false);
        }
        return;
      }

      const now = Date.now();
      if (isRequestsFetchInFlightRef.current) {
        if (refreshing) {
          setIsRefreshing(false);
        }
        return;
      }

      if (
        !force &&
        now - lastRequestsFetchAtRef.current < REQUESTS_REFETCH_COOLDOWN_MS
      ) {
        return;
      }

      isRequestsFetchInFlightRef.current = true;
      lastRequestsFetchAtRef.current = now;

      if (!refreshing) {
        setLoadingData(true);
      }

      try {
        console.log(
          '[ManagementRequests] Fetching assigned buildings for manager:',
          currentUserId,
        );

        const nextData = await loadManagedRequestsData();

        console.log(
          '[ManagementRequests] Buildings fetched:',
          nextData.managedBuildings.length,
        );
        console.log(
          '[ManagementRequests] Total requests fetched:',
          nextData.buildingRequests.length,
        );

        setManagedBuildings(nextData.managedBuildings);
        setBuildingRequests(nextData.buildingRequests);
      } catch (error) {
        console.error('[ManagementRequests] Failed to fetch data:', error);
        setManagedBuildings([]);
        setBuildingRequests([]);
      } finally {
        setLoadingData(false);
        if (refreshing) {
          setIsRefreshing(false);
        }
        isRequestsFetchInFlightRef.current = false;
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    fetchRequestsData();
  }, [fetchRequestsData]);

  useEffect(() => {
    if (!managedBuildings.length) {
      setSelectedBuildingId('all');
      return;
    }

    if (
      selectedBuildingId !== 'all' &&
      !managedBuildings.some((building) => building.id === selectedBuildingId)
    ) {
      setSelectedBuildingId('all');
    }
  }, [managedBuildings, selectedBuildingId]);

  useEffect(() => {
    setStatusFilter(normalizeStatusFilter(statusFilterParam));
  }, [statusFilterParam]);

  const priorityOptions = useMemo(() => {
    const priorities = new Set<Request['priority']>();
    buildingRequests.forEach((request) => {
      if (request.priority) {
        priorities.add(request.priority);
      }
    });
    return ['all', ...Array.from(priorities)] as PriorityFilter[];
  }, [buildingRequests]);

  const typeOptions = useMemo(() => {
    const types = new Set<NonNullable<Request['type']>>();
    buildingRequests.forEach((request) => {
      if (request.type) {
        types.add(request.type);
      }
    });
    return ['all', ...Array.from(types)] as TypeFilter[];
  }, [buildingRequests]);

  const scopedRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const buildingScope =
      selectedBuildingId === 'all'
        ? managedBuildings.map((building) => building.id)
        : [selectedBuildingId];

    return buildingRequests
      .filter((request) => {
        if (!request.buildingId) return false;
        return buildingScope.includes(request.buildingId);
      })
      .filter((request) => {
        if (priorityFilter === 'all') return true;
        return request.priority === priorityFilter;
      })
      .filter((request) => {
        if (typeFilter === 'all') return true;
        return request.type === typeFilter;
      })
      .filter((request) => {
        if (statusFilter === 'all') return true;
        return request.status === statusFilter;
      })
      .filter((request) => {
        if (!query) return true;
        const haystack = `${request.title} ${request.description} ${
          request.apartment || ''
        } ${request.type || ''}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [
    buildingRequests,
    managedBuildings,
    selectedBuildingId,
    statusFilter,
    priorityFilter,
    typeFilter,
    searchQuery,
  ]);

  const paginatedRequests = useMemo(
    () => scopedRequests.slice(0, currentPage * ITEMS_PER_PAGE),
    [scopedRequests, currentPage],
  );

  const hasMoreRequests = paginatedRequests.length < scopedRequests.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBuildingId, statusFilter, priorityFilter, typeFilter]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUserId,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  const shouldAnimateHeader = !hasAnimatedHeaderRef.current;

  useEffect(() => {
    hasAnimatedHeaderRef.current = true;
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreRequests) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setIsLoadingMore(false);
      }, 300);
    }
  };

  const handleRefresh = async () => {
    if (!currentUserId) return;

    setIsRefreshing(true);
    setCurrentPage(1);
    await fetchRequestsData({ force: true, refreshing: true });
  };

  return {
    managedBuildings,
    buildingRequests,
    setBuildingRequests,
    loadingData,
    showSideMenu,
    setShowSideMenu,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    typeFilter,
    setTypeFilter,
    selectedBuildingId,
    setSelectedBuildingId,
    hasUnreadNotifications,
    buildingFilterOptions: managedBuildings,
    priorityOptions,
    typeOptions,
    paginatedRequests,
    hasMoreRequests,
    scopedRequests,
    isLoadingMore,
    isRefreshing,
    shouldAnimateHeader,
    handleLoadMore,
    handleRefresh,
  };
};
