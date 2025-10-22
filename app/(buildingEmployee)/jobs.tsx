import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Job } from "../../lib/types";

type JobStatusFilter = "all" | Job["status"];

export default function BuildingEmployeeJobsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobStatusFilter>("all");

  const buildingEmployee = useMemo(() => {
    if (!currentUser) return null;
    return actions.getBuildingEmployeeByUserId?.(currentUser.id) ?? null;
  }, [actions, currentUser]);

  const buildingId = buildingEmployee?.buildingId;

  const jobs = useMemo(() => {
    if (!buildingId) return [];
    return actions.getJobs?.({ buildingId }) ?? [];
  }, [actions, buildingId]);

  const filteredJobs = useMemo(() => {
    if (selectedStatus === "all") {
      return jobs;
    }
    return jobs.filter((job) => job.status === selectedStatus);
  }, [jobs, selectedStatus]);

  const hasUnreadNotifications =
    notifications?.some((notification) => !notification.read) ?? false;

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filters: { label: string; value: JobStatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Assigned", value: "assigned" },
    { label: "In Progress", value: "in-progress" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const statusBadgeStyle = (job: Job) => {
    switch (job.status) {
      case "pending":
        return { bg: "#FEF3C7", color: "#92400E", label: "Pending" };
      case "assigned":
        return { bg: "#E0E7FF", color: "#3730A3", label: "Assigned" };
      case "in-progress":
        return { bg: "#DBEAFE", color: "#1D4ED8", label: "In Progress" };
      case "completed":
        return { bg: "#DCFCE7", color: "#047857", label: "Completed" };
      case "cancelled":
        return { bg: "#FEE2E2", color: "#B91C1C", label: "Cancelled" };
      default:
        return { bg: "#E5E7EB", color: "#374151", label: job.status };
    }
  };

  if (!currentUser || currentUser.role !== "building_employee") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Access Restricted</Text>
          <Text style={styles.emptySubtitle}>
            This workspace is only available to building employees.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <HeaderBar
          title="Maintenance Jobs"
          subtitle="Track work orders across your building"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.filtersContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {filters.map((filter) => {
              const active = selectedStatus === filter.value;
              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedStatus(filter.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(400)}
          style={styles.summaryRow}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {jobs.filter((job) => job.status === "pending").length}
            </Text>
            <Text style={styles.summaryLabel}>Awaiting Assignment</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {jobs.filter((job) => job.status === "in-progress").length}
            </Text>
            <Text style={styles.summaryLabel}>Active Jobs</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {jobs.filter((job) => job.status === "completed").length}
            </Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(400)}
          style={styles.listContainer}
        >
          {filteredJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="construct-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyCardTitle}>No jobs to show</Text>
              <Text style={styles.emptyCardSubtitle}>
                Jobs assigned to your building will appear here.
              </Text>
            </View>
          ) : (
            filteredJobs.map((job) => {
              const statusToken = statusBadgeStyle(job);
              return (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusToken.bg }]}>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: statusToken.color },
                        ]}
                      >
                        {statusToken.label}
                      </Text>
                    </View>
                    {job.priority && (
                      <Text style={styles.priorityText}>
                        {job.priority.toUpperCase()} PRIORITY
                      </Text>
                    )}
                  </View>
                  <Text style={styles.jobTitle}>{job.title}</Text>
                  <Text style={styles.jobDescription} numberOfLines={3}>
                    {job.description}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="home-outline" size={16} color="#6B7280" />
                    <Text style={styles.metaText}>
                      {job.buildingName || "Building"} · {job.unitNumber || "Unit"}
                    </Text>
                  </View>

                  {job.assignedToName && (
                    <View style={styles.metaRow}>
                      <Ionicons name="person-outline" size={16} color="#6B7280" />
                      <Text style={styles.metaText}>
                        {job.assignedToEmployeeName ||
                          job.assignedToName ||
                          "Service team"}
                      </Text>
                    </View>
                  )}

                  {job.scheduledDate && (
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                      <Text style={styles.metaText}>
                        {new Date(job.scheduledDate).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {job.estimate && (
                    <View style={styles.metaRow}>
                      <Ionicons name="receipt-outline" size={16} color="#6B7280" />
                      <Text style={styles.metaText}>
                        Estimate · AED {job.estimate.subtotal.toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser.role}
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  filtersContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  filtersScrollContent: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  listContainer: {
    gap: 16,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    paddingHorizontal: 24,
    textAlign: "center",
  },
  jobCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  jobDescription: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
