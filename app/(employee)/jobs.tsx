import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
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
import { useApp } from "../../lib/context/connected-app-provider";
import type { Job } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/notifications-hub";

type JobStatus = "all" | "assigned" | "in-progress" | "completed";
type JobPriority = "all" | "urgent" | "high" | "medium" | "low";

const STATUS_OPTIONS: { label: string; value: JobStatus }[] = [
  { label: "All", value: "all" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
];

const PRIORITY_OPTIONS: { label: string; value: JobPriority }[] = [
  { label: "All Priority", value: "all" },
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

export default function EmployeeJobsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>("all");
  const [selectedPriority, setSelectedPriority] = useState<JobPriority>("all");
  const [showFilters, setShowFilters] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Get employee's assigned jobs
  const allJobs = actions.getJobs?.() ?? [];
  const myJobs = useMemo(() => {
    return allJobs.filter((job) => job.assignedToEmployeeId === currentUser?.id);
  }, [allJobs, currentUser?.id]);

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

  // Sort jobs: assigned (not started) first, then in-progress, then by scheduled date
  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      // Jobs not started yet come first
      const aNotStarted = a.status === "assigned" && !a.startedAt;
      const bNotStarted = b.status === "assigned" && !b.startedAt;
      if (aNotStarted && !bNotStarted) return -1;
      if (!aNotStarted && bNotStarted) return 1;

      // Then in-progress jobs
      if (a.status === "in-progress" && b.status !== "in-progress") return -1;
      if (a.status !== "in-progress" && b.status === "in-progress") return 1;

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

  const handleAcceptJob = (job: Job) => {
    Alert.alert(
      "Accept Job",
      `Are you sure you want to accept this job?\n\n${job.title}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          style: "default",
          onPress: () => {
            // TODO: Implement accept job action in context
            Alert.alert("Success", "Job accepted successfully");
          },
        },
      ]
    );
  };

  const handleDeclineJob = (job: Job) => {
    Alert.prompt(
      "Decline Job",
      "Please provide a reason for declining this job:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: (reason) => {
            if (reason?.trim()) {
              // TODO: Implement decline job action in context
              Alert.alert("Declined", "Job has been declined");
            }
          },
        },
      ],
      "plain-text",
      "",
      "default"
    );
  };

  const handleStartJob = (job: Job) => {
    Alert.alert(
      "Start Job",
      `Are you ready to start working on this job?\n\n${job.title}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          style: "default",
          onPress: () => {
            // TODO: Implement start job action in context
            Alert.alert("Started", "Job has been started");
          },
        },
      ]
    );
  };

  const getStatusStyle = (status: Job["status"]) => {
    switch (status) {
      case "assigned":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "in-progress":
        return { bg: "#BFDBFE", text: "#1E3A8A" };
      case "completed":
        return { bg: "#D1FAE5", text: "#065F46" };
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

  const formatStatusLabel = (job: Job) => {
    if (job.status === "assigned" && !job.startedAt) {
      return "Not Started";
    }
    return job.status
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getJobActions = (job: Job) => {
    // For newly assigned jobs (not started yet)
    if (job.status === "assigned" && !job.startedAt) {
      return (
        <View style={styles.jobActions}>
          <TouchableOpacity
            style={styles.actionButtonSecondary}
            onPress={() => handleDeclineJob(job)}
          >
            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
            <Text style={styles.actionButtonSecondaryText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButtonPrimary}
            onPress={() => handleStartJob(job)}
          >
            <Ionicons name="play-outline" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonPrimaryText}>Start Job</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // For in-progress jobs
    if (job.status === "in-progress") {
      return (
        <TouchableOpacity
          style={styles.actionButtonFull}
          onPress={() => router.push(`/(employee)/job-details?id=${job.id}`)}
        >
          <Ionicons name="construct-outline" size={16} color="#FFFFFF" />
          <Text style={styles.actionButtonPrimaryText}>Continue Work</Text>
        </TouchableOpacity>
      );
    }

    // For completed jobs
    if (job.status === "completed") {
      return (
        <TouchableOpacity
          style={styles.actionButtonOutline}
          onPress={() => router.push(`/(employee)/job-details?id=${job.id}`)}
        >
          <Text style={styles.actionButtonOutlineText}>View Details</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
        <HeaderBar
          title="My Jobs"
          subtitle={`${filteredJobs.length} ${filteredJobs.length === 1 ? "job" : "jobs"}`}
          hasUnreadNotifications={hasUnreadNotifications}
          onNotificationPress={() => router.push(NOTIFICATION_ROUTE as any)}
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
            entering={FadeInDown.duration(200)}
            style={styles.filtersContainer}
          >
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipsContainer}
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

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Priority</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterChipsContainer}
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
          </Animated.View>
        )}

        {/* Jobs List */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {sortedJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No jobs found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery || selectedStatus !== "all" || selectedPriority !== "all"
                  ? "Try adjusting your filters"
                  : "Your assigned jobs will appear here"}
              </Text>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {sortedJobs.map((job, index) => {
                const statusStyle = getStatusStyle(job.status);
                const priorityStyle = getPriorityStyle(job.priority);

                return (
                  <Animated.View
                    key={job.id}
                    entering={FadeInDown.duration(300).delay(index * 50)}
                  >
                    <TouchableOpacity
                      style={styles.jobCard}
                      onPress={() =>
                        router.push(`/(employee)/job-details?id=${job.id}`)
                      }
                    >
                      {/* Header */}
                      <View style={styles.jobCardHeader}>
                        <View style={styles.jobCardTitleRow}>
                          <Text style={styles.jobCardTitle} numberOfLines={1}>
                            {job.title}
                          </Text>
                          <View
                            style={[
                              styles.priorityBadge,
                              { backgroundColor: `${priorityStyle.color}15` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.priorityText,
                                { color: priorityStyle.color },
                              ]}
                            >
                              {priorityStyle.label.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.jobCardId}>#{job.id.slice(0, 8)}</Text>
                      </View>

                      {/* Details */}
                      <View style={styles.jobCardDetails}>
                        <View style={styles.jobDetailRow}>
                          <Ionicons
                            name="business-outline"
                            size={14}
                            color="#64748B"
                          />
                          <Text style={styles.jobDetailText} numberOfLines={1}>
                            {job.buildingName || "Building"}
                          </Text>
                        </View>
                        {job.unitNumber && (
                          <View style={styles.jobDetailRow}>
                            <Ionicons
                              name="home-outline"
                              size={14}
                              color="#64748B"
                            />
                            <Text style={styles.jobDetailText}>
                              Unit {job.unitNumber}
                            </Text>
                          </View>
                        )}
                        <View style={styles.jobDetailRow}>
                          <Ionicons
                            name="calendar-outline"
                            size={14}
                            color="#64748B"
                          />
                          <Text style={styles.jobDetailText}>
                            {job.scheduledDate
                              ? new Date(job.scheduledDate).toLocaleDateString()
                              : "Not scheduled"}
                          </Text>
                        </View>
                      </View>

                      {/* Footer */}
                      <View style={styles.jobCardFooter}>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusStyle.bg },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: statusStyle.text },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: statusStyle.text },
                            ]}
                          >
                            {formatStatusLabel(job)}
                          </Text>
                        </View>
                        {job.estimatedCost && (
                          <Text style={styles.jobCost}>
                            AED {job.estimatedCost.toLocaleString()}
                          </Text>
                        )}
                      </View>

                      {/* Action Buttons */}
                      {getJobActions(job)}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
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
    gap: 8,
    marginTop: 16,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: "#10B981",
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterChipsContainer: {
    flexDirection: "row",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#10B981",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
  },
  jobsList: {
    gap: 12,
    paddingBottom: 24,
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
    marginBottom: 12,
  },
  jobCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 12,
  },
  jobCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  jobCardId: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  jobCardDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  jobDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  jobDetailText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  jobCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  jobCost: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  jobActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonSecondaryText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  actionButtonFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  actionButtonOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  actionButtonOutlineText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
});
