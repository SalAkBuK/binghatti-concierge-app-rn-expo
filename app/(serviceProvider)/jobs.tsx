import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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
import { useApp } from "../../lib/context/connected-app-provider";
import type { Job } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type JobStatus = "all" | "pending" | "assigned" | "in-progress" | "completed" | "cancelled";
type JobPriority = "all" | "urgent" | "high" | "medium" | "low";

const STATUS_OPTIONS: { label: string; value: JobStatus }[] = [
  { label: "All Status", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const PRIORITY_OPTIONS: { label: string; value: JobPriority }[] = [
  { label: "All Priority", value: "all" },
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

export default function JobsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>("all");
  const [selectedPriority, setSelectedPriority] = useState<JobPriority>("all");
  const [showFilters, setShowFilters] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isTablet = width >= 768;

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Get service provider's jobs
  const allJobs = actions.getJobs?.() ?? [];
  const myJobs = allJobs.filter((job) => job.assignedTo === currentUser?.id);

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return myJobs.filter((job) => {
      // Status filter
      if (selectedStatus !== "all" && job.status !== selectedStatus) {
        return false;
      }

      // Priority filter
      if (selectedPriority !== "all" && job.priority !== selectedPriority) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          job.title.toLowerCase().includes(query) ||
          job.description?.toLowerCase().includes(query) ||
          job.buildingName?.toLowerCase().includes(query) ||
          job.unitNumber?.toLowerCase().includes(query) ||
          job.id.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [myJobs, selectedStatus, selectedPriority, searchQuery]);

  // Sort jobs: pending first, then by scheduled date
  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      // Pending jobs first
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;

      // Then by scheduled date
      const dateA = new Date(a.scheduledDate || "").getTime();
      const dateB = new Date(b.scheduledDate || "").getTime();
      return dateA - dateB;
    });
  }, [filteredJobs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusStyle = (status: Job["status"]) => {
    switch (status) {
      case "pending":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "assigned":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      case "in-progress":
        return { bg: "#BFDBFE", text: "#1E3A8A" };
      case "completed":
        return { bg: "#D1FAE5", text: "#065F46" };
      case "cancelled":
        return { bg: "#FEE2E2", text: "#991B1B" };
      default:
        return { bg: "#F1F5F9", text: "#475569" };
    }
  };

  const getPriorityStyle = (priority: Job["priority"]) => {
    switch (priority) {
      case "urgent":
        return { color: "#DC2626", label: "Urgent" };
      case "high":
        return { color: "#F97316", label: "High" };
      case "medium":
        return { color: "#F59E0B", label: "Medium" };
      case "low":
        return { color: "#10B981", label: "Low" };
      default:
        return { color: "#64748B", label: "Normal" };
    }
  };

  const formatStatusLabel = (status: Job["status"]) => {
    return status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
        <HeaderBar
          title="Jobs"
        subtitle={`${filteredJobs.length} ${filteredJobs.length === 1 ? "job" : "jobs"}`}
        hasUnreadNotifications={hasUnreadNotifications}
        onNotificationPress={() => router.push(NOTIFICATION_ROUTE as any)}
        showSideMenu={showSideMenu}
        onSideMenuToggle={setShowSideMenu}
      />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              showFilters && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="options-outline"
              size={20}
              color={showFilters ? "#FFFFFF" : "#64748B"}
            />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.filtersContainer}
          >
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipsScroll}
              >
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      selectedStatus === option.value &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedStatus(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedStatus === option.value &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Priority</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipsScroll}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      selectedPriority === option.value &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedPriority(option.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedPriority === option.value &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setSelectedStatus("all");
                setSelectedPriority("all");
                setSearchQuery("");
              }}
            >
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Jobs List */}
        <ScrollView
          style={styles.jobsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {sortedJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>No jobs found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || selectedStatus !== "all" || selectedPriority !== "all"
                  ? "Try adjusting your filters"
                  : "New jobs will appear here"}
              </Text>
            </View>
          ) : (
            <View style={styles.jobsContainer}>
              {sortedJobs.map((job, index) => {
                const statusStyle = getStatusStyle(job.status);
                const priorityStyle = getPriorityStyle(job.priority);

                return (
                  <Animated.View
                    key={job.id}
                    entering={FadeInDown.duration(400).delay(index * 50)}
                  >
                    <TouchableOpacity
                      style={styles.jobCard}
                      onPress={() =>
                        router.push(`/(serviceProvider)/job-details?id=${job.id}`)
                      }
                    >
                      {/* Header */}
                      <View style={styles.jobCardHeader}>
                        <View style={styles.jobCardHeaderLeft}>
                          <Text style={styles.jobTitle} numberOfLines={1}>
                            {job.title}
                          </Text>
                          <View style={styles.jobMeta}>
                            <Text style={styles.jobId}>#{job.id.slice(0, 8)}</Text>
                            <View style={styles.jobMetaDivider} />
                            <View style={styles.priorityBadge}>
                              <View
                                style={[
                                  styles.priorityDot,
                                  { backgroundColor: priorityStyle.color },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.priorityText,
                                  { color: priorityStyle.color },
                                ]}
                              >
                                {priorityStyle.label}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusStyle.bg },
                          ]}
                        >
                          <Text style={[styles.statusText, { color: statusStyle.text }]}>
                            {formatStatusLabel(job.status)}
                          </Text>
                        </View>
                      </View>

                      {/* Body */}
                      <View style={styles.jobCardBody}>
                        <View style={styles.jobInfo}>
                          <Ionicons name="business-outline" size={16} color="#64748B" />
                          <Text style={styles.jobInfoText} numberOfLines={1}>
                            {job.buildingName || "N/A"}
                            {job.unitNumber ? ` • Unit ${job.unitNumber}` : ""}
                          </Text>
                        </View>
                        {job.scheduledDate && (
                          <View style={styles.jobInfo}>
                            <Ionicons name="calendar-outline" size={16} color="#64748B" />
                            <Text style={styles.jobInfoText}>
                              {new Date(job.scheduledDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                              {" at "}
                              {new Date(job.scheduledDate).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          </View>
                        )}
                        {job.estimatedCost && (
                          <View style={styles.jobInfo}>
                            <Ionicons name="cash-outline" size={16} color="#64748B" />
                            <Text style={styles.jobInfoText}>
                              AED {job.estimatedCost.toLocaleString()}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Footer - Quick Actions */}
                      {job.status === "pending" && (
                        <View style={styles.jobCardFooter}>
                          <TouchableOpacity
                            style={styles.quickActionButtonSecondary}
                            onPress={() =>
                              router.push(`/(serviceProvider)/job-details?id=${job.id}`)
                            }
                          >
                            <Text style={styles.quickActionTextSecondary}>
                              View Details
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.quickActionButtonPrimary}
                            onPress={() =>
                              router.push(`/(serviceProvider)/job-details?id=${job.id}`)
                            }
                          >
                            <Text style={styles.quickActionTextPrimary}>Accept</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser?.role}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#1E293B",
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: "#2563EB",
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 12,
  },
  filterChipsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  clearFiltersButton: {
    alignSelf: "center",
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  jobsList: {
    flex: 1,
    marginTop: 16,
  },
  jobsContainer: {
    gap: 12,
  },
  jobCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  jobCardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 6,
  },
  jobMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  jobId: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  jobMetaDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#E2E8F0",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  jobCardBody: {
    gap: 8,
  },
  jobInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  jobInfoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  jobCardFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  quickActionButtonSecondary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  quickActionTextSecondary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  quickActionButtonPrimary: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  quickActionTextPrimary: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
  },
});
