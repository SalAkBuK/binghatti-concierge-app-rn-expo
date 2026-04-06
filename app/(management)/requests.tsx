import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { orgBuildingsApi } from "../../lib/services/api/org-buildings";
import type {
  Building,
  Request,
  RequestStatus,
} from "../../lib/types";
import {
  filterNotificationsByUser,
  formatDateTime,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import {
  getResponseItems,
  mapOrgBuildingRequestSummary,
} from "./_hooks/management-request-helpers";
import { ManagementRequestAssignmentModal } from "./_components/management-request-assignment-modal";
import { ManagementRequestDetailModal } from "./_components/management-request-detail-modal";
import { useManagementRequestDetails } from "./_hooks/useManagementRequestDetails";
import { useRequestAssignmentFlow } from "./_hooks/useRequestAssignmentFlow";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type StatusFilter = "all" | RequestStatus;
type PriorityFilter = "all" | Request["priority"];
type TypeFilter = "all" | NonNullable<Request["type"]>;

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const REQUESTS_REFETCH_COOLDOWN_MS = 15000;

export default function ManagementRequestsScreen() {
  const params = useLocalSearchParams<{
    statusFilter?: string;
    requestId?: string;
    buildingId?: string;
  }>();
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();

  // State for API-fetched data
  const [managedBuildings, setManagedBuildings] = useState<Building[]>([]);
  const [buildingRequests, setBuildingRequests] = useState<Request[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (params.statusFilter as StatusFilter) || "all"
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Pagination state
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasAnimatedHeaderRef = useRef(false);
  const lastRequestsFetchAtRef = useRef(0);
  const isRequestsFetchInFlightRef = useRef(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const {
    selectedRequest,
    detailTab,
    setDetailTab,
    newMessage,
    setNewMessage,
    isRequestDetailLoading,
    requestComments,
    requestAttachments,
    isSendingMessage,
    isRequestClosed,
    openRequestDetails,
    closeRequestDetails,
    handleAddMessage,
    handleMarkAsCompleted,
    handleCancelRequest,
  } = useManagementRequestDetails({
    buildingRequests,
    currentUser,
    preselectedBuildingId: params.buildingId
      ? String(params.buildingId)
      : undefined,
    preselectedRequestId: params.requestId
      ? String(params.requestId)
      : undefined,
    setBuildingRequests,
  });
  const {
    showAssignModal,
    closeAssignModal,
    assignmentMode,
    setAssignmentMode,
    maintenanceStaff,
    serviceProviders,
    isAssigning,
    isLoadingWorkers,
    openAssignModal,
    handleAssignRequest,
  } = useRequestAssignmentFlow({
    closeRequestDetails,
    currentUser,
    managedBuildings,
    selectedRequest,
    setBuildingRequests,
  });

  // Fetch buildings and requests from API
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.id) {
        setLoadingData(false);
        return;
      }

      const now = Date.now();
      if (isRequestsFetchInFlightRef.current) {
        return;
      }
      if (now - lastRequestsFetchAtRef.current < REQUESTS_REFETCH_COOLDOWN_MS) {
        return;
      }

      isRequestsFetchInFlightRef.current = true;
      lastRequestsFetchAtRef.current = now;
      setLoadingData(true);
      try {
        // Fetch buildings for this manager
        console.log("[ManagementRequests] Fetching assigned buildings for manager:", currentUser.id);
        const buildingsResponse = await orgBuildingsApi.getAssignedBuildings();
        const buildingsPayload = getResponseItems(buildingsResponse);

        if (buildingsPayload.length > 0) {
          const buildings = buildingsPayload.map((building: any): Building => ({
            id: String(building?.id ?? building?.buildingId ?? ""),
            name:
              building?.name ||
              building?.buildingName ||
              building?.title ||
              "Building",
            address: building?.address || "",
            city: building?.city || "",
            country: building?.country || "",
            emirate: building?.emirate,
            community: building?.community,
            street: building?.street,
            plotNumber: building?.plotNumber,
            buildingNumber: building?.buildingNumber,
            makaniNumber: building?.makaniNumber,
            buildingType: building?.buildingType,
            developer: building?.developer,
            yearBuilt: building?.yearBuilt,
            totalFloors: building?.totalFloors,
            utilityPremisesNumber: building?.utilityPremisesNumber,
            managerId: building?.managerId,
            managerName: building?.managerName,
            totalUnits: building?.totalUnits ?? 0,
            occupiedUnits: building?.occupiedUnits ?? 0,
            unitBreakdown: building?.unitBreakdown,
            amenities: building?.amenities ?? [],
            status: building?.status ?? "active",
            createdAt: building?.createdAt ?? new Date().toISOString(),
            updatedAt: building?.updatedAt ?? new Date().toISOString(),
            location: building?.location,
            units: building?.units,
          }));

          setManagedBuildings(buildings);
          console.log("[ManagementRequests] Buildings fetched:", buildings.length);

          // Fetch requests for all buildings in parallel
          if (buildings.length > 0) {
            const requestsPromises = buildings.map((building) =>
              orgBuildingsApi.getBuildingRequests(building.id),
            );

            const requestsResponses = await Promise.all(requestsPromises);

            // Combine all requests from all buildings
            const allRequests: Request[] = [];
            requestsResponses.forEach((response, index) => {
              const payload = getResponseItems(response);

              if (payload.length > 0) {
                const buildingId = buildings[index].id;
                const buildingName = buildings[index].name;
                const mappedRequests = payload.map((item: any) =>
                  mapOrgBuildingRequestSummary(item, {
                    buildingId,
                    buildingName,
                  }),
                );
                allRequests.push(...mappedRequests);
              }
            });

            console.log('[ManagementRequests] Total requests fetched:', allRequests.length);
            setBuildingRequests(allRequests);
          } else {
            setBuildingRequests([]);
          }
        } else {
          setManagedBuildings([]);
          setBuildingRequests([]);
        }
      } catch (error) {
        console.error('[ManagementRequests] Failed to fetch data:', error);
        setManagedBuildings([]);
        setBuildingRequests([]);
      } finally {
        setLoadingData(false);
        isRequestsFetchInFlightRef.current = false;
      }
    };

    fetchData();
  }, [currentUser?.id]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    managedBuildings.length === 1 ? managedBuildings[0].id : "all",
  );

  useEffect(() => {
    if (!managedBuildings.length) {
      setSelectedBuildingId("all");
      return;
    }

    if (
      selectedBuildingId !== "all" &&
      !managedBuildings.some((building) => building.id === selectedBuildingId)
    ) {
      setSelectedBuildingId("all");
    }
  }, [managedBuildings, selectedBuildingId]);

  // Update status filter when navigation params change
  useEffect(() => {
    if (params.statusFilter) {
      setStatusFilter(params.statusFilter as StatusFilter);
    }
  }, [params.statusFilter]);

  const priorityOptions = useMemo(() => {
    const priorities = new Set<Request["priority"]>();
    buildingRequests.forEach((request) => {
      if (request.priority) {
        priorities.add(request.priority);
      }
    });
    return ["all", ...Array.from(priorities)] as PriorityFilter[];
  }, [buildingRequests]);

  const typeOptions = useMemo(() => {
    const types = new Set<NonNullable<Request["type"]>>();
    buildingRequests.forEach((request) => {
      if (request.type) {
        types.add(request.type);
      }
    });
    return ["all", ...Array.from(types)] as TypeFilter[];
  }, [buildingRequests]);

  // Removed jobs and getJobForRequest - no longer needed after Jobs screen consolidation

  const scopedRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const buildingScope =
      selectedBuildingId === "all"
        ? managedBuildings.map((building) => building.id)
        : [selectedBuildingId];

    return buildingRequests
      .filter((request) => {
        if (!request.buildingId) return false;
        return buildingScope.includes(request.buildingId);
      })
      .filter((request) => {
        if (priorityFilter === "all") return true;
        return request.priority === priorityFilter;
      })
      .filter((request) => {
        if (typeFilter === "all") return true;
        return request.type === typeFilter;
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
    buildingRequests,
    managedBuildings,
    selectedBuildingId,
    statusFilter,
    priorityFilter,
    typeFilter,
    searchQuery,
  ]);

  // Paginated requests - only show items up to current page
  const paginatedRequests = useMemo(() => {
    return scopedRequests.slice(0, currentPage * ITEMS_PER_PAGE);
  }, [scopedRequests, currentPage, ITEMS_PER_PAGE]);

  const hasMoreRequests = paginatedRequests.length < scopedRequests.length;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBuildingId, statusFilter, priorityFilter, typeFilter]);

  // Removed jobForSelectedRequest - no longer needed since we handle assignment directly

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  const buildingFilterOptions = useMemo(() => {
    if (!managedBuildings.length) return [];
    return managedBuildings;
  }, [managedBuildings]);

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
    if (!currentUser?.id) return;

    setIsRefreshing(true);
    setCurrentPage(1);
    if (isRequestsFetchInFlightRef.current) {
      setIsRefreshing(false);
      return;
    }

    lastRequestsFetchAtRef.current = 0;
    try {
      console.log("[ManagementRequests] Refreshing assigned buildings for manager:", currentUser.id);
      const buildingsResponse = await orgBuildingsApi.getAssignedBuildings();
      const buildingsPayload = getResponseItems(buildingsResponse);

      if (buildingsPayload.length > 0) {
        const buildings = buildingsPayload.map((building: any): Building => ({
          id: String(building?.id ?? building?.buildingId ?? ""),
          name:
            building?.name ||
            building?.buildingName ||
            building?.title ||
            "Building",
          address: building?.address || "",
          city: building?.city || "",
          country: building?.country || "",
          emirate: building?.emirate,
          community: building?.community,
          street: building?.street,
          plotNumber: building?.plotNumber,
          buildingNumber: building?.buildingNumber,
          makaniNumber: building?.makaniNumber,
          buildingType: building?.buildingType,
          developer: building?.developer,
          yearBuilt: building?.yearBuilt,
          totalFloors: building?.totalFloors,
          utilityPremisesNumber: building?.utilityPremisesNumber,
          managerId: building?.managerId,
          managerName: building?.managerName,
          totalUnits: building?.totalUnits ?? 0,
          occupiedUnits: building?.occupiedUnits ?? 0,
          unitBreakdown: building?.unitBreakdown,
          amenities: building?.amenities ?? [],
          status: building?.status ?? "active",
          createdAt: building?.createdAt ?? new Date().toISOString(),
          updatedAt: building?.updatedAt ?? new Date().toISOString(),
          location: building?.location,
          units: building?.units,
        }));

        setManagedBuildings(buildings);

        if (buildings.length > 0) {
          const requestsPromises = buildings.map((building) =>
            orgBuildingsApi.getBuildingRequests(building.id),
          );

          const requestsResponses = await Promise.all(requestsPromises);
          const allRequests: Request[] = [];

          requestsResponses.forEach((response, index) => {
            const payload = getResponseItems(response);

            if (payload.length > 0) {
              const buildingId = buildings[index].id;
              const buildingName = buildings[index].name;
              const mappedRequests = payload.map((item: any) =>
                mapOrgBuildingRequestSummary(item, {
                  buildingId,
                  buildingName,
                }),
              );
              allRequests.push(...mappedRequests);
            }
          });

          console.log("[ManagementRequests] Refreshed requests:", allRequests.length);
          setBuildingRequests(allRequests);
        } else {
          setBuildingRequests([]);
        }
      } else {
        setManagedBuildings([]);
        setBuildingRequests([]);
      }
    } catch (error) {
      console.error("[ManagementRequests] Failed to refresh:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderHeader = () => {
    const shouldAnimateHeader = !hasAnimatedHeaderRef.current;
    hasAnimatedHeaderRef.current = true;

    const getHeaderEntering = (delay: number) =>
      shouldAnimateHeader ? FadeInDown.delay(delay).duration(280) : undefined;

    return (
    <>
      <HeaderBar
          title="Service Requests"
          subtitle="Track and resolve maintenance across your buildings"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        {managedBuildings.length > 1 ? (
          <Animated.View
            entering={getHeaderEntering(80)}
            style={styles.filterRow}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRowContent}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedBuildingId === "all" && styles.filterChipActive,
                ]}
                onPress={() => setSelectedBuildingId("all")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedBuildingId === "all" &&
                      styles.filterChipTextActive,
                  ]}
                >
                  All buildings
                </Text>
              </TouchableOpacity>
              {buildingFilterOptions.map((building) => (
                <TouchableOpacity
                  key={building.id}
                  style={[
                    styles.filterChip,
                    selectedBuildingId === building.id &&
                      styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedBuildingId(building.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedBuildingId === building.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {building.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={getHeaderEntering(120)}
          style={styles.searchRow}
        >
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search requests, units, descriptions…"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFiltersScroll}
            style={styles.statusFiltersWrapper}
          >
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusFilterButton,
                  statusFilter === option.value &&
                    styles.statusFilterButtonActive,
                ]}
                onPress={() => setStatusFilter(option.value)}
              >
                <Text
                  style={[
                    styles.statusFilterLabel,
                    statusFilter === option.value &&
                      styles.statusFilterLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {priorityOptions.length > 1 && (
          <Animated.View
            entering={getHeaderEntering(140)}
            style={styles.secondaryFilterRow}
          >
            <Text style={styles.secondaryFilterLabel}>Priority</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.secondaryFilterPills}
            >
              {(priorityOptions as PriorityFilter[]).map((option) => (
                <TouchableOpacity
                  key={`priority-${option}`}
                  style={[
                    styles.secondaryPill,
                    priorityFilter === option && styles.secondaryPillActive,
                  ]}
                  onPress={() => setPriorityFilter(option)}
                >
                  <Text
                    style={[
                      styles.secondaryPillText,
                      priorityFilter === option &&
                        styles.secondaryPillTextActive,
                    ]}
                  >
                    {option === "all"
                      ? "All"
                      : option.replace(/_/g, " ").toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {typeOptions.length > 1 && (
          <Animated.View
            entering={getHeaderEntering(160)}
            style={styles.secondaryFilterRow}
          >
            <Text style={styles.secondaryFilterLabel}>Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.secondaryFilterPills}
            >
              {(typeOptions as TypeFilter[]).map((option) => (
                <TouchableOpacity
                  key={`type-${option}`}
                  style={[
                    styles.secondaryPill,
                    typeFilter === option && styles.secondaryPillActive,
                  ]}
                  onPress={() => setTypeFilter(option)}
                >
                  <Text
                    style={[
                      styles.secondaryPillText,
                      typeFilter === option &&
                        styles.secondaryPillTextActive,
                    ]}
                  >
                    {option === "all"
                      ? "All"
                      : option.replace(/_/g, " ").toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}
    </>
  );
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.emptyState, { paddingTop: 100 }]}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.emptyStateTitle}>Loading requests...</Text>
          <Text style={styles.emptyStateBody}>
            Fetching data from the server
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
        {renderHeader()}

        {paginatedRequests.length === 0 ? (
          <View style={[styles.emptyState, styles.emptyStateStandalone]}>
            <Ionicons name="clipboard-outline" size={40} color="#CBD5F5" />
            <Text style={styles.emptyStateTitle}>No requests found</Text>
            <Text style={styles.emptyStateBody}>
              Adjust your filters or select another building to see requests.
            </Text>
          </View>
        ) : (
          <FlatList
            data={paginatedRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item: request }) => {
              return (
                <TouchableOpacity
                  style={styles.requestCard}
                  onPress={() => openRequestDetails(request)}
                >
                  <View style={styles.requestCardHeader}>
                    <View style={styles.requestHeaderLeft}>
                      <Text style={styles.requestTitle}>{request.title}</Text>
                      <Text style={styles.requestMeta}>
                        Unit {request.apartment || "N/A"} ·{" "}
                        {request.type?.toUpperCase()}
                      </Text>
                    </View>
                    {requestStatusBadge(request.status)}
                  </View>

                  {request.description ? (
                    <Text style={styles.requestDescription} numberOfLines={2}>
                      {request.description}
                    </Text>
                  ) : null}

                  <View style={styles.requestFooter}>
                    <View style={styles.footerMetaRow}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color="#64748B"
                      />
                      <Text style={styles.footerMetaText}>
                        {formatDateTime(request.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.footerMetaRow}>
                    <Ionicons
                      name="construct-outline"
                      size={14}
                      color="#64748B"
                    />
                    <Text style={styles.footerMetaText}>
                      {request.status === "completed"
                        ? request.assignedTo
                          ? `Completed by ${request.assignedTo}`
                          : "Completed"
                        : request.assignedTo
                          ? `Assigned to ${request.assignedTo}`
                          : "Not assigned"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
            }}
            ListFooterComponent={() => {
              if (isLoadingMore) {
                return (
                  <View style={styles.loadingFooter}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.loadingFooterText}>Loading more...</Text>
                  </View>
                );
              }
              if (hasMoreRequests && paginatedRequests.length > 0) {
                return (
                  <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                    <Text style={styles.loadMoreButtonText}>
                      Load More ({scopedRequests.length - paginatedRequests.length} remaining)
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#2563EB" />
                  </TouchableOpacity>
                );
              }
              if (paginatedRequests.length > 0 && !hasMoreRequests) {
                return (
                  <View style={styles.endReachedFooter}>
                    <Text style={styles.endReachedText}>
                      Showing all {paginatedRequests.length} requests
                    </Text>
                  </View>
                );
              }
              return null;
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#2563EB"
                colors={["#2563EB"]}
              />
            }
            contentContainerStyle={[
              styles.requestList,
              { paddingBottom: 120 },
            ]}
            style={styles.flatList}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={5}
          />
        )}
      </View>

      <ManagementRequestAssignmentModal
        visible={showAssignModal}
        onClose={closeAssignModal}
        selectedRequest={selectedRequest}
        assignmentMode={assignmentMode}
        setAssignmentMode={setAssignmentMode}
        maintenanceStaff={maintenanceStaff}
        serviceProviders={serviceProviders}
        isAssigning={isAssigning}
        isLoadingWorkers={isLoadingWorkers}
        onAssignRequest={handleAssignRequest}
      />

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      <ManagementRequestDetailModal
        selectedRequest={selectedRequest}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        isRequestDetailLoading={isRequestDetailLoading}
        isRequestClosed={isRequestClosed}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        isSendingMessage={isSendingMessage}
        requestComments={requestComments}
        requestAttachments={requestAttachments}
        onClose={closeRequestDetails}
        onAddMessage={handleAddMessage}
        onOpenAssignModal={openAssignModal}
        onMarkAsCompleted={handleMarkAsCompleted}
        onCancelRequest={handleCancelRequest}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 120,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 20,
  },
  summaryRowCompact: {
    flexDirection: "column",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  summaryMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  filterRow: {
    marginTop: 16,
  },
  filterRowContent: {
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#1D4ED8",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  searchRow: {
    marginTop: -10,
    gap: 16,
  },
  secondaryFilterRow: {
    marginTop: 16,
    gap: 10,
  },
  secondaryFilterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  secondaryFilterPills: {
    gap: 10,
    paddingTop: 4,
  },
  secondaryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  secondaryPillActive: {
    backgroundColor: "#1D4ED8",
  },
  secondaryPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  secondaryPillTextActive: {
    color: "#FFFFFF",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  statusFiltersWrapper: {
    marginTop: 4,
  },
  statusFiltersScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 4,
  },
  statusFilterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  statusFilterButtonActive: {
    backgroundColor: "#1D4ED8",
  },
  statusFilterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusFilterLabelActive: {
    color: "#FFFFFF",
  },
  requestList: {
    marginTop: 16,
    gap: 16,
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  requestCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  requestHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  requestMeta: {
    fontSize: 13,
    color: "#6B7280",
  },
  requestDescription: {
    fontSize: 14,
    color: "#4B5563",
  },
  requestFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  footerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerMetaText: {
    fontSize: 12,
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  detailLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  detailLoadingText: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 64,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  emptyStateBody: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.2)",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  modalContent: {
    padding: 24,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563EB",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  overviewSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: "row",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  assignmentSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  assignmentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  assignmentMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  jobStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
  },
  jobStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  notesSection: {
    gap: 16,
  },
  messagesSection: {
    gap: 16,
  },
  timelineSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: -8,
  },
  inputGroup: {
    gap: 12,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    minHeight: 80,
  },
  addButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.5,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  noteCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  noteTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  noteBody: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  noteFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
    marginTop: 4,
  },
  noteVisibility: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  messageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  messageRole: {
    fontSize: 12,
    color: "#6B7280",
  },
  messageBody: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
  },
  messageAttachments: {
    marginTop: 8,
  },
  messageAttachmentImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  messageAttachmentPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentsSection: {
    gap: 8,
    marginTop: 8,
  },
  attachmentCard: {
    width: 140,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  attachmentImage: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  attachmentPlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    position: "relative",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    marginTop: 4,
  },
  timelineLine: {
    position: "absolute",
    left: 4.5,
    top: 14,
    bottom: -16,
    width: 1,
    backgroundColor: "#D1D5DB",
  },
  timelineContent: {
    flex: 1,
    gap: 4,
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  timelineDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  timelineActor: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  timelineTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 24,
    fontStyle: "italic",
  },
  jobDetailsCard: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  jobDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobDetailLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  jobDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E40AF",
  },
  noJobCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  noJobText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  noJobHint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  flatList: {
    flex: 1,
  },
  emptyStateStandalone: {
    marginTop: 16,
    paddingVertical: 24,
  },
  requestListEmpty: {
    paddingVertical: 24,
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 24,
  },
  loadingFooterText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginVertical: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  endReachedFooter: {
    alignItems: "center",
    paddingVertical: 20,
    paddingBottom: 40,
  },
  endReachedText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  assignButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  reassignButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  reassignButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  completeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16A34A",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  assignmentModeSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  modeTabActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  modeTabTextActive: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  workersList: {
    gap: 12,
  },
  workerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  workerInfo: {
    flex: 1,
    gap: 4,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  workerMeta: {
    fontSize: 13,
    color: "#6B7280",
  },
  emptyWorkers: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyWorkersText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
  },
});

