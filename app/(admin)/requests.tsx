import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
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
import { useApp } from "../../lib/context/connected-app-provider";
import type { Building, Job, Request, RequestStatus } from "../../lib/types";
import { filterNotificationsByUser, formatDateTime } from "../../lib/utils/helpers";

const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type StatusFilter = "all" | RequestStatus;

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function RequestsManagementScreen() {
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
    updateRequest,
    assignJob,
    createJob,
    updateJobStatus,
    setSelectedRequest: setSelectedRequestContext,
  } = actions;
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 900;
  const isManagement = currentUser?.role === "management";

  const allBuildings = useMemo(() => getBuildings(), [getBuildings]);
  const managedBuildings = useMemo(() => {
    if (!isManagement) return allBuildings;
    return getManagedBuildings?.() ?? [];
  }, [isManagement, getManagedBuildings, allBuildings]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    isManagement && managedBuildings.length === 1 ? managedBuildings[0].id : "all",
  );

  useEffect(() => {
    // Only enforce constraints for management users
    if (isManagement) {
      if (managedBuildings.length === 1) {
        setSelectedBuildingId(managedBuildings[0].id);
        return;
      }

      if (
        selectedBuildingId !== "all" &&
        !managedBuildings.some((building) => building.id === selectedBuildingId)
      ) {
        setSelectedBuildingId("all");
      }
    }
    // Admin users can freely select any building without constraints
  }, [isManagement, managedBuildings]);

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

    const openRequests = buildingScoped.filter(
      (req) => req.status === "pending" || req.status === "in-progress",
    );
    const resolvedRequests = buildingScoped.filter(
      (req) => req.status === "completed",
    );
    const pendingAssignments = buildingScoped.filter(
      (req) => !req.assignedTo,
    );

    return {
      total: buildingScoped.length,
      open: openRequests.length,
      resolved: resolvedRequests.length,
      unassigned: pendingAssignments.length,
    };
  }, [requestItems, selectedBuildingId, managedBuildings, isManagement]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const buildingFilterOptions = useMemo(() => {
    const scope = isManagement ? managedBuildings : allBuildings;
    if (scope.length <= 1) return scope;
    return scope;
  }, [isManagement, managedBuildings, allBuildings]);

  const selectedBuildingName =
    selectedBuildingId !== "all"
      ? buildingMap.get(selectedBuildingId)?.name
      : "All Buildings";

  const getJobForRequest = (requestId: string): Job | undefined => {
    return jobs.find((job) => job.requestId === requestId);
  };

  const handleStatusUpdate = async (request: Request, status: RequestStatus) => {
    if (request.status === status) return;
    setIsUpdatingStatus(true);
    try {
      await updateRequest(request.id, { status });
      Alert.alert("Status updated", `Request marked as ${status}`);
    } catch (error: any) {
      Alert.alert("Update failed", error?.message || "Unable to update request");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssignProvider = async (providerId: string) => {
    if (!selectedRequest) return;
    setIsAssigning(true);
    try {
      const existingJob = getJobForRequest(selectedRequest.id);
      if (existingJob) {
        await assignJob(existingJob.id, providerId);
      } else {
        await createJob({
          requestId: selectedRequest.id,
          title: selectedRequest.title,
          description: selectedRequest.description,
          type: selectedRequest.type,
          priority: selectedRequest.priority,
          buildingId: selectedRequest.buildingId,
          unitNumber: selectedRequest.apartment,
          assignedTo: providerId,
        });
      }
      Alert.alert("Assigned", "Service provider has been scheduled.");
      setShowProviderModal(false);
    } catch (error: any) {
      Alert.alert(
        "Assignment failed",
        error?.message || "Unable to assign service provider",
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleJobStatusUpdate = async (job: Job, status: Job["status"]) => {
    try {
      await updateJobStatus(job.id, status);
      Alert.alert("Work order updated", `Job now marked as ${status}`);
    } catch (error: any) {
      Alert.alert("Update failed", error?.message || "Unable to update job");
    }
  };

  const requestStatusBadge = (status: RequestStatus) => {
    const palette = {
      pending: { bg: "#FEF3C7", text: "#92400E" },
      "in-progress": { bg: "#DBEAFE", text: "#1D4ED8" },
      completed: { bg: "#D1FAE5", text: "#047857" },
      cancelled: { bg: "#FEE2E2", text: "#B91C1C" },
    } as const;
    const colors = palette[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.statusBadgeText, { color: colors.text }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderRequestCard = (request: Request, index: number) => {
    const building = buildingMap.get(request.buildingId);
    const job = getJobForRequest(request.id);
    return (
      <Animated.View
        key={request.id}
        entering={FadeInDown.delay(180 + index * 60).duration(340)}
      >
        <TouchableOpacity
          style={styles.requestCard}
          onPress={() => {
            setSelectedRequest(request);
            setSelectedRequestContext(request);
          }}
        >
          <View style={styles.requestCardHeader}>
            <Text style={styles.requestTitle}>{request.title}</Text>
            {requestStatusBadge(request.status)}
          </View>
          <Text style={styles.requestMeta}>
            {building?.name || "Building"} · Unit {request.apartment || "-"} ·{" "}
            {request.priority.toUpperCase()}
          </Text>
          <Text style={styles.requestDescription} numberOfLines={2}>
            {request.description}
          </Text>

          <View style={styles.requestFooter}>
            <View style={styles.footerGroup}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.footerText}>
                {formatDateTime(request.createdAt)}
              </Text>
            </View>
            <View style={styles.footerGroup}>
              <Ionicons
                name={job ? "construct-outline" : "alert-circle-outline"}
                size={16}
                color={job ? "#2563EB" : "#B91C1C"}
              />
              <Text
                style={[
                  styles.footerText,
                  job ? styles.footerTextHighlight : styles.footerTextWarning,
                ]}
              >
                {job
                  ? `Job ${job.status.replace("-", " ")}`
                  : "No work order"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Request Operations"
          subtitle={selectedBuildingName}
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(40).duration(320)}
          style={[styles.summaryRow, isCompact && styles.summaryRowCompact]}
        >
          <View style={styles.summaryTile}>
            <Text style={styles.summaryTileLabel}>Total Requests</Text>
            <Text style={styles.summaryTileValue}>{summary.total}</Text>
            <Text style={styles.summaryTileMeta}>In selected scope</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryTileLabel}>Open</Text>
            <Text style={styles.summaryTileValue}>{summary.open}</Text>
            <Text style={styles.summaryTileMeta}>Pending or in-progress</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryTileLabel}>Resolved</Text>
            <Text style={styles.summaryTileValue}>{summary.resolved}</Text>
            <Text style={styles.summaryTileMeta}>Marked completed</Text>
          </View>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryTileLabel}>Unassigned</Text>
            <Text style={styles.summaryTileValue}>{summary.unassigned}</Text>
            <Text style={styles.summaryTileMeta}>Need provider</Text>
          </View>
        </Animated.View>

        {buildingFilterOptions.length > 1 && (
          <Animated.View
            entering={FadeInDown.delay(80).duration(320)}
            style={styles.filtersContainer}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChipRow}
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
                    selectedBuildingId === "all" && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {buildingFilterOptions.map((building) => {
                const active = building.id === selectedBuildingId;
                return (
                  <TouchableOpacity
                    key={building.id}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedBuildingId(building.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {building.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(120).duration(320)}
          style={styles.statusFilterRow}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusChipRow}
          >
            {STATUS_OPTIONS.map((option) => {
              const active = option.value === statusFilter;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusChip,
                    active && styles.statusChipActive,
                  ]}
                  onPress={() => setStatusFilter(option.value)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      active && styles.statusChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(160).duration(320)}
          style={styles.searchContainer}
        >
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests, units, or keywords"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Animated.View>

        <View style={styles.listContainer}>
          {scopedRequests.length === 0 ? (
            <Animated.View
              entering={FadeInDown.delay(200).duration(320)}
              style={styles.emptyState}
            >
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No requests found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting filters or check another building.
              </Text>
            </Animated.View>
          ) : (
            scopedRequests.map((request, index) =>
              renderRequestCard(request, index),
            )
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

      <Modal
        visible={Boolean(selectedRequest)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { marginHorizontal: pagePadding }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {selectedRequest?.title || "Request details"}
                </Text>
                {selectedRequest ? requestStatusBadge(selectedRequest.status) : null}
              </View>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <>
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Submitted</Text>
                  <Text style={styles.modalValue}>
                    {formatDateTime(selectedRequest.createdAt)}
                  </Text>
                  <Text style={styles.modalValue}>
                    Priority: {selectedRequest.priority.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Location</Text>
                  <Text style={styles.modalValue}>
                    {buildingMap.get(selectedRequest.buildingId)?.name || "Building"}
                  </Text>
                  <Text style={styles.modalValue}>
                    Unit {selectedRequest.apartment || "-"} ·{" "}
                    {selectedRequest.tower || "Tower"}
                  </Text>
                  <Text style={styles.modalValue}>
                    Contact: {selectedRequest.contactPhone || "N/A"}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Description</Text>
                  <Text style={styles.modalBody}>{selectedRequest.description}</Text>
                </View>

                {selectedRequest.comments && selectedRequest.comments.length > 0 ? (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Latest Comment</Text>
                    <Text style={styles.modalBody}>
                      {
                        selectedRequest.comments[selectedRequest.comments.length - 1]
                          ?.message
                      }
                    </Text>
                  </View>
                ) : null}

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <View style={styles.statusGrid}>
                    {(["pending", "in-progress", "completed", "cancelled"] as RequestStatus[]).map(
                      (status) => {
                        const active = selectedRequest.status === status;
                        return (
                          <TouchableOpacity
                            key={status}
                            style={[
                              styles.statusOption,
                              active && styles.statusOptionActive,
                            ]}
                            onPress={() => handleStatusUpdate(selectedRequest, status)}
                            disabled={isUpdatingStatus}
                          >
                            <Text
                              style={[
                                styles.statusOptionText,
                                active && styles.statusOptionTextActive,
                              ]}
                            >
                              {status.replace("-", " ")}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Work Order</Text>
                  {(() => {
                    const job = getJobForRequest(selectedRequest.id);
                    if (!job) {
                      return (
                        <View style={styles.workOrderEmpty}>
                          <Text style={styles.modalBody}>
                            No work order created yet.
                          </Text>
                          <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => setShowProviderModal(true)}
                            disabled={isAssigning}
                          >
                            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.primaryButtonText}>
                              Schedule Service Provider
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }

                    return (
                      <View style={styles.workOrderCard}>
                        <View style={styles.workOrderHeader}>
                          <Text style={styles.jobTitle}>{job.title}</Text>
                          <View style={styles.jobBadge}>
                            <Text style={styles.jobBadgeText}>
                              {job.status.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.modalBody}>
                          Assigned to {job.assignedToName || "Unassigned"}
                        </Text>
                        <View style={styles.jobActionsRow}>
                          <TouchableOpacity
                            style={styles.jobActionButton}
                            onPress={() => handleJobStatusUpdate(job, "in-progress")}
                          >
                            <Text style={styles.jobActionText}>Mark In Progress</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.jobActionButton, styles.jobActionButtonPrimary]}
                            onPress={() => handleJobStatusUpdate(job, "completed")}
                          >
                            <Text style={[styles.jobActionText, styles.jobActionTextPrimary]}>
                              Close Job
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={() => setShowProviderModal(true)}
                          disabled={isAssigning}
                        >
                          <Ionicons
                            name="swap-vertical"
                            size={16}
                            color="#4338CA"
                          />
                          <Text style={styles.secondaryButtonText}>
                            Reassign provider
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showProviderModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProviderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.providerModal, { marginHorizontal: pagePadding }]}>
            <View style={styles.providerHeader}>
              <Text style={styles.providerTitle}>Select service provider</Text>
              <TouchableOpacity onPress={() => setShowProviderModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {serviceProviders.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={styles.providerRow}
                  onPress={() =>
                    handleAssignProvider(provider.userId || provider.id)
                  }
                  disabled={isAssigning}
                >
                  <View>
                    <Text style={styles.providerName}>{provider.name}</Text>
                    <Text style={styles.providerMeta}>
                      {provider.specialty} · {provider.jobsCompleted} jobs
                    </Text>
                  </View>
                  <View style={styles.providerRating}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.providerRatingText}>
                      {provider.rating.toFixed(1)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "transparent",
    gap: 12,
    marginTop: 16,
  },
  summaryRowCompact: {
    flexDirection: "column",
  },
  summaryTile: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 6,
  },
  summaryTileLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryTileValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  summaryTileMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  filtersContainer: {
    marginTop: 20,
  },
  filterChipRow: {
    paddingRight: 12,
    gap: 10,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: "#4338CA",
    borderColor: "#4338CA",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  statusFilterRow: {
    marginTop: 16,
  },
  statusChipRow: {
    paddingRight: 12,
    gap: 10,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 10,
  },
  statusChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  listContainer: {
    marginTop: 22,
    gap: 14,
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  requestCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
    marginRight: 12,
  },
  requestMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  requestDescription: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  requestFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: "#6B7280",
  },
  footerTextHighlight: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  footerTextWarning: {
    color: "#B91C1C",
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 40,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "100%",
    maxWidth: 540,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    gap: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  modalSection: {
    gap: 6,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modalValue: {
    fontSize: 14,
    color: "#111827",
  },
  modalBody: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  statusOptionActive: {
    backgroundColor: "#4338CA",
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
    textTransform: "capitalize",
  },
  statusOptionTextActive: {
    color: "#FFFFFF",
  },
  workOrderEmpty: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4338CA",
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  workOrderCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 12,
  },
  workOrderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  jobBadge: {
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  jobBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  jobActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  jobActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  jobActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4338CA",
  },
  jobActionButtonPrimary: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4338CA",
  },
  jobActionTextPrimary: {
    color: "#312E81",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4338CA",
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4338CA",
  },
  providerModal: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  providerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  providerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  providerMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  providerRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  providerRatingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F59E0B",
  },
});
