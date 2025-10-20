import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;
  const isManagement = currentUser?.role === "management";
  const managedBuildingIds = isManagement
    ? actions.getManagedBuildingIds?.() ?? []
    : [];

  const allJobs = actions.getJobs();

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

  const serviceProviders = actions.getServiceProviders?.() ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleAssignJob = async (providerId: string) => {
    if (!selectedJob) return;

    setIsAssigning(true);
    try {
      await actions.assignJob(selectedJob.id, providerId);
      Alert.alert("Success", "Job assigned successfully");
      setShowAssignModal(false);
      setSelectedJob(null);
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Assignment failed", errorMessage);
    } finally {
      setIsAssigning(false);
    }
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
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => {
                      setShowAssignModal(true);
                    }}
                  >
                    <Ionicons name="person-add" size={18} color="#FFFFFF" />
                    <Text style={styles.assignButtonText}>
                      {selectedJob.assignedTo ? "Reassign" : "Assign Provider"}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.statusButtonsRow}>
                    {selectedJob.status !== "in-progress" && (
                      <TouchableOpacity
                        style={styles.statusButton}
                        onPress={() => handleUpdateJobStatus("in-progress")}
                      >
                        <Text style={styles.statusButtonText}>Start</Text>
                      </TouchableOpacity>
                    )}
                    {selectedJob.status !== "completed" && (
                      <TouchableOpacity
                        style={[styles.statusButton, styles.completeButton]}
                        onPress={() => handleUpdateJobStatus("completed")}
                      >
                        <Text style={styles.statusButtonText}>Complete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Service Provider Assignment Modal */}
      <Modal
        visible={showAssignModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.assignModalOverlay}>
          <View style={styles.assignModalContent}>
            <Text style={styles.assignModalTitle}>Assign Service Provider</Text>
            <ScrollView style={styles.providersList} showsVerticalScrollIndicator={false}>
              {serviceProviders.map((provider) => (
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
              ))}
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
  assignButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
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
