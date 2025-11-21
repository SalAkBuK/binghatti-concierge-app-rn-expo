import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { JobCard } from "../../components/admin/JobCard";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Job, JobStatus } from "../../lib/types";
import { getUserErrorMessage } from "../../lib/services/api/errors";
import { filterNotificationsByUser, formatDateTime } from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type FilterType = "all" | JobStatus;

export default function JobsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<
    "service_provider" | "building_employee"
  >("service_provider");
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";
  const isManagement = currentUser?.role === "management";
  const managedBuildingIds = useMemo(
    () => (isManagement ? actions.getManagedBuildingIds?.() ?? [] : []),
    [actions, isManagement],
  );

  const allJobs = useMemo(() => actions.getJobs(), [actions]);

  const scopedJobs = useMemo(() => {
    if (!isManagement) return allJobs;
    if (!managedBuildingIds.length) {
      return [];
    }
    return allJobs.filter((job) => managedBuildingIds.includes(job.buildingId));
  }, [allJobs, isManagement, managedBuildingIds]);

  const filteredJobs = useMemo(() => {
    if (filterType === "all") return scopedJobs;
    return scopedJobs.filter((job) => job.status === filterType);
  }, [filterType, scopedJobs]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Get service providers assigned to the selected job's building
  const serviceProviders = useMemo(() => {
    if (!selectedJob?.buildingId) {
      return [];
    }
    return actions.getServiceProvidersForBuilding?.(selectedJob.buildingId) ?? [];
  }, [actions, selectedJob]);

  const buildingEmployees = useMemo(() => {
    if (!selectedJob?.buildingId) {
      return [];
    }
    return actions.getBuildingEmployees?.(selectedJob.buildingId) ?? [];
  }, [actions, selectedJob]);

  const isBuildingManagerForJob = useCallback(
    (job?: Job | null) => {
      if (!job || !currentUser || !isManagement) {
        return false;
      }
      const building = actions.getBuildingById?.(job.buildingId);
      return building?.managerId === currentUser.id;
    },
    [actions, currentUser, isManagement],
  );

  const canAssignSelectedJob =
    !!selectedJob &&
    (isAdmin || isBuildingManagerForJob(selectedJob));

  const canUpdateJobStatus = useCallback(
    (job?: Job | null) => {
      if (!job || !currentUser) return false;

      // ONLY the assigned worker can update job status
      // Check if current user is the assigned service provider
      if (job.assignedTo === currentUser.id) return true;

      // Check if current user is the assigned building employee
      if (job.assignedBuildingEmployeeId === currentUser.id) return true;

      // Managers and admins CANNOT update status - only assign workers
      return false;
    },
    [currentUser],
  );

  // Track if we've already handled the deep link param
  const handledDeepLinkRef = useRef<string | null>(null);

  // Handle deep linking from requests screen - only once per jobId
  useEffect(() => {
    if (params.jobId && typeof params.jobId === "string") {
      // Only handle if we haven't already processed this jobId
      if (handledDeepLinkRef.current !== params.jobId) {
        const job = allJobs.find((j) => j.id === params.jobId);
        if (job) {
          handledDeepLinkRef.current = params.jobId;
          setSelectedJob(job);
        }
      }
    }
  }, [params.jobId, allJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleAssignJob = async (providerId: string) => {
    if (!selectedJob) return;
    if (!canAssignSelectedJob) {
      Alert.alert(
        "Permission denied",
        "Only the assigned building manager can schedule service providers for this job.",
      );
      return;
    }

    setIsAssigning(true);
    try {
      await actions.assignJob(selectedJob.id, { serviceProviderId: providerId });
      // Close both modals first
      setShowAssignModal(false);
      setSelectedJob(null);
      // Then show success message
      Alert.alert("Success", "Job assigned successfully to service provider");
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Assignment failed", errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignBuildingEmployee = async (employeeId: string) => {
    if (!selectedJob) return;
    if (!canAssignSelectedJob) {
      Alert.alert(
        "Permission denied",
        "Only the assigned building manager can schedule building employees for this job.",
      );
      return;
    }

    setIsAssigning(true);
    try {
      await actions.assignJobToBuildingEmployee(selectedJob.id, employeeId);
      // Close both modals first
      setShowAssignModal(false);
      setSelectedJob(null);
      // Then show success message
      Alert.alert("Success", "Job assigned successfully to building employee");
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Assignment failed", errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  const openAssignModal = () => {
    if (!selectedJob) return;
    if (!canAssignSelectedJob) {
      Alert.alert(
        "Permission denied",
        "Only the assigned building manager can assign this job.",
      );
      return;
    }
    // Set initial mode based on current assignment
    if (selectedJob.assignmentTargetType === "building_employee") {
      setAssignmentMode("building_employee");
    } else {
      setAssignmentMode("service_provider");
    }
    setShowAssignModal(true);
  };

  const handleUpdateJobStatus = async (status: JobStatus) => {
    if (!selectedJob) return;

    try {
      await actions.updateJobStatus(selectedJob.id, status);
      Alert.alert("Status Updated", `Job status changed to ${status}`);
      setSelectedJob(null);
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Update failed", errorMessage);
    }
  };

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Assigned", value: "assigned" },
    { label: "In Progress", value: "in-progress" },
    { label: "Completed", value: "completed" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Jobs Management"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        {/* Filter Tabs */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.filtersContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {filterOptions.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  isCompact && styles.filterButtonCompact,
                  filterType === filter.value && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType(filter.value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === filter.value && styles.filterButtonTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Jobs List */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.jobsContainer}
        >
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job, index) => (
              <Animated.View
                key={job.id}
                entering={FadeInDown.delay(150 + index * 50).duration(400)}
              >
                <TouchableOpacity
                  onPress={() => setSelectedJob(job)}
                  style={styles.jobCardWrapper}
                >
                  <JobCard job={job} />
                </TouchableOpacity>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No jobs found</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Job Detail Modal */}
      <Modal
        visible={!!selectedJob}
        animationType="slide"
        onRequestClose={() => setSelectedJob(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedJob(null)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Job Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedJob && (
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Title:</Text>
                  <Text style={styles.detailValue}>{selectedJob.title}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>{selectedJob.description}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[styles.detailValue, styles.statusText]}>
                    {selectedJob.status}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Priority:</Text>
                  <Text style={styles.detailValue}>{selectedJob.priority}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>{selectedJob.type}</Text>
                </View>
                {selectedJob.buildingName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Building:</Text>
                    <Text style={styles.detailValue}>{selectedJob.buildingName}</Text>
                  </View>
                )}
                {selectedJob.unitNumber && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Unit:</Text>
                    <Text style={styles.detailValue}>{selectedJob.unitNumber}</Text>
                  </View>
                )}
                {selectedJob.assignedToName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Assigned To:</Text>
                    <Text style={styles.detailValue}>{selectedJob.assignedToName}</Text>
                  </View>
                )}
                {selectedJob.estimatedCost && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Estimated Cost:</Text>
                    <Text style={styles.detailValue}>
                      AED {selectedJob.estimatedCost.toFixed(2)}
                    </Text>
                  </View>
                )}
                {selectedJob.scheduledDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Scheduled:</Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime(selectedJob.scheduledDate)}
                    </Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedJob.createdAt)}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {selectedJob.status !== "completed" && (
                    <>
                      {/* Assign/Reassign Button - Only for Managers/Admins */}
                      {canAssignSelectedJob && (
                        <TouchableOpacity
                          style={[
                            styles.assignButton,
                            isAssigning && styles.assignButtonDisabled,
                          ]}
                          onPress={openAssignModal}
                          disabled={isAssigning}
                        >
                          <Ionicons name="person-add" size={18} color="#FFFFFF" />
                          <Text style={styles.assignButtonText}>
                            {selectedJob.assignedTo || selectedJob.assignedBuildingEmployeeId
                              ? "Reassign Job"
                              : "Assign Job"}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Start/Complete Buttons - Only for Assigned Workers */}
                      {canUpdateJobStatus(selectedJob) && (
                        <View style={styles.statusButtonsRow}>
                          {selectedJob.status !== "in-progress" && (
                            <TouchableOpacity
                              style={styles.statusButton}
                              onPress={() => handleUpdateJobStatus("in-progress")}
                            >
                              <Text style={styles.statusButtonText}>Start Job</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.statusButton, styles.completeButton]}
                            onPress={() => handleUpdateJobStatus("completed")}
                          >
                            <Text style={styles.statusButtonText}>Mark Complete</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Info message for managers - they can only assign */}
                      {!canUpdateJobStatus(selectedJob) && !canAssignSelectedJob && (
                        <View style={styles.statusRestriction}>
                          <Ionicons name="information-circle" size={18} color="#6B7280" />
                          <Text style={styles.statusRestrictionText}>
                            Only the assigned service provider or building employee can start and complete this job.
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {selectedJob.status === "completed" && (
                    <View style={styles.completedBanner}>
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                      <View style={styles.completedBannerContent}>
                        <Text style={styles.completedBannerTitle}>Job Completed</Text>
                        <Text style={styles.completedBannerText}>
                          This job has been marked as completed and cannot be modified.
                          {selectedJob.completedDate &&
                            ` Completed on ${new Date(selectedJob.completedDate).toLocaleDateString()}`}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Work Assignment Modal */}
      <Modal
        visible={showAssignModal && canAssignSelectedJob}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.assignModalOverlay}>
          <View style={styles.assignModalContent}>
            <Text style={styles.assignModalTitle}>Assign Work</Text>

            {/* Assignment Mode Selector */}
            <View style={styles.assignmentModeRow}>
              {[
                { label: "Service Provider", value: "service_provider" as const },
                { label: "Building Team", value: "building_employee" as const },
              ].map((option) => {
                const active = assignmentMode === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.assignmentModeButton,
                      active && styles.assignmentModeButtonActive,
                    ]}
                    onPress={() => setAssignmentMode(option.value)}
                  >
                    <Text
                      style={[
                        styles.assignmentModeText,
                        active && styles.assignmentModeTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* List of Providers or Employees */}
            <ScrollView style={styles.providersList} showsVerticalScrollIndicator={false}>
              {assignmentMode === "service_provider" ? (
                serviceProviders.length > 0 ? (
                  serviceProviders.map((provider) => (
                    <TouchableOpacity
                      key={provider.id}
                      style={styles.providerItem}
                      onPress={() => handleAssignJob(provider.id)}
                      disabled={isAssigning}
                    >
                      <View>
                        <Text style={styles.providerName}>{provider.name}</Text>
                        <Text style={styles.providerMeta}>
                          {provider.specialty} · {provider.rating.toFixed(1)} ★ ·{" "}
                          {provider.jobsCompleted} jobs completed
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyAssignment}>
                    <Ionicons name="alert-circle-outline" size={20} color="#94A3B8" />
                    <Text style={styles.emptyAssignmentText}>
                      No service providers are assigned to this building. Contact admin to assign vendors.
                    </Text>
                  </View>
                )
              ) : buildingEmployees.length > 0 ? (
                buildingEmployees.map((employee) => (
                  <TouchableOpacity
                    key={employee.id}
                    style={styles.providerItem}
                    onPress={() => handleAssignBuildingEmployee(employee.id)}
                    disabled={isAssigning}
                  >
                    <View>
                      <Text style={styles.providerName}>{employee.name}</Text>
                      <Text style={styles.providerMeta}>
                        {employee.role || "Team member"}
                        {employee.phone ? ` · ${employee.phone}` : ""}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyAssignment}>
                  <Ionicons name="people-outline" size={20} color="#94A3B8" />
                  <Text style={styles.emptyAssignmentText}>
                    No building employees are registered for this property.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAssignModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filtersScrollContent: {
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterButtonCompact: {
    paddingHorizontal: 14,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  jobsContainer: {
    paddingBottom: 20,
  },
  jobCardWrapper: {
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailsSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: "row",
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    minWidth: 110,
  },
  detailValue: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  statusText: {
    textTransform: "capitalize",
    fontWeight: "500",
  },
  actionButtons: {
    marginTop: 24,
    gap: 16,
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  assignButtonDisabled: {
    backgroundColor: "#93C5FD",
  },
  assignButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  assignRestriction: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  statusRestriction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusRestrictionText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  statusButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statusButton: {
    flex: 1,
    backgroundColor: "#F97316",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  completeButton: {
    backgroundColor: "#10B981",
  },
  statusButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ECFDF5",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  completedBannerContent: {
    flex: 1,
    gap: 4,
  },
  completedBannerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#065F46",
  },
  completedBannerText: {
    fontSize: 13,
    color: "#047857",
    lineHeight: 18,
  },
  assignModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  assignModalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
  },
  assignModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  providersList: {
    maxHeight: 400,
  },
  providerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  providerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
  providerMeta: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  assignmentModeRow: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    padding: 4,
    gap: 4,
    marginTop: 16,
    marginBottom: 12,
  },
  assignmentModeButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: "center",
  },
  assignmentModeButtonActive: {
    backgroundColor: "#2563EB",
  },
  assignmentModeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  assignmentModeTextActive: {
    color: "#FFFFFF",
  },
  emptyAssignment: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 32,
  },
  emptyAssignmentText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  cancelButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6B7280",
  },
});
