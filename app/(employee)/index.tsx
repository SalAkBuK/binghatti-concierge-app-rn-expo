import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
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

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { Job } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/notifications-hub";

export default function EmployeeDashboard() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isTablet = width >= 768;
  const cardGap = 12;
  const cardWidth = Math.floor((width - pagePadding * 2 - cardGap) / 2);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Get employee's assigned jobs (jobs where assignedToEmployeeId matches current user)
  const allJobs = useMemo(() => actions.getJobs?.() ?? [], [actions]);
  const myJobs = useMemo(() => {
    // For now, we'll use a mock employee ID based on current user
    // In production, this would come from ServiceProviderEmployee.userId
    return allJobs.filter(
      (job) => job.assignedToEmployeeId === currentUser?.id
    );
  }, [allJobs, currentUser?.id]);

  // Calculate stats
  const stats = useMemo(() => {
    // Jobs Assigned: Jobs assigned to this employee but not started
    const assigned = myJobs.filter(
      (j) => j.status === "assigned" && !j.startedAt
    ).length;

    // In Progress: Jobs actively being worked on by this employee
    const inProgress = myJobs.filter((j) => j.status === "in-progress").length;

    // Completed This Month: Jobs completed this month by this employee
    const completedThisMonth = myJobs.filter(
      (j) =>
        j.status === "completed" &&
        new Date(j.completedDate || "").getMonth() === new Date().getMonth()
    ).length;

    // Calculate earnings for this employee (mock calculation)
    // In production, this would be based on employee's share or fixed payment per job
    const earningsThisMonth = myJobs
      .filter(
        (j) =>
          j.status === "completed" &&
          new Date(j.completedDate || "").getMonth() === new Date().getMonth()
      )
      .reduce((sum, j) => {
        // Assume employee gets 60% of job cost (mock)
        const jobCost = j.actualCost || j.estimatedCost || 0;
        return sum + jobCost * 0.6;
      }, 0);

    const pendingPayments = myJobs
      .filter((j) => j.status === "completed" && !(j as any).paidToEmployee)
      .reduce((sum, j) => {
        const jobCost = j.actualCost || j.estimatedCost || 0;
        return sum + jobCost * 0.6;
      }, 0);

    // On-time completion rate: % of jobs completed before or on scheduled date
    const completedJobs = myJobs.filter((j) => j.status === "completed");
    const onTimeJobs = completedJobs.filter((j) => {
      if (!j.scheduledDate || !j.completedDate) return false;
      return new Date(j.completedDate) <= new Date(j.scheduledDate);
    });
    const onTimeRate =
      completedJobs.length > 0
        ? Math.round((onTimeJobs.length / completedJobs.length) * 100)
        : 100;

    // Get average rating (from employee profile or calculated from job ratings)
    const rating = (currentUser?.profile as any)?.rating || 4.7;

    return {
      assigned,
      inProgress,
      completedThisMonth,
      earningsThisMonth,
      pendingPayments,
      onTimeRate,
      rating,
      totalCompleted: completedJobs.length,
    };
  }, [myJobs, currentUser]);

  // Get upcoming jobs (next 5 jobs sorted by scheduled date)
  const upcomingJobs = useMemo(() => {
    return myJobs
      .filter((j) => j.status === "assigned" || j.status === "in-progress")
      .sort(
        (a, b) =>
          new Date(a.scheduledDate || "").getTime() -
          new Date(b.scheduledDate || "").getTime()
      )
      .slice(0, 5);
  }, [myJobs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh - in production, this would fetch latest data
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Stat tiles data
  const statTiles = [
    {
      title: "Assigned Jobs",
      value: stats.assigned,
      icon: "clipboard-outline" as const,
      color: "#F97316",
      onPress: () => router.push("/(employee)/jobs"),
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: "construct-outline" as const,
      color: "#2563EB",
      onPress: () => router.push("/(employee)/jobs"),
    },
    {
      title: "Completed",
      value: stats.completedThisMonth,
      icon: "checkmark-circle-outline" as const,
      color: "#10B981",
      onPress: () => router.push("/(employee)/earnings"),
    },
    {
      title: "On-Time Rate",
      value: `${stats.onTimeRate}%`,
      icon: "time-outline" as const,
      color: "#8B5CF6",
    },
  ];

  const getJobStatusColor = (job: Job) => {
    if (job.status === "assigned") return "#F97316";
    if (job.status === "in-progress") return "#2563EB";
    if (job.status === "completed") return "#10B981";
    return "#64748B";
  };

  const getJobStatusLabel = (job: Job) => {
    if (job.status === "assigned" && !job.startedAt) return "Not Started";
    if (job.status === "in-progress") return "In Progress";
    if (job.status === "completed") return "Completed";
    return job.status;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#DC2626";
      case "high":
        return "#EA580C";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#64748B";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <HeaderBar
          title="Dashboard"
          subtitle={`Welcome back, ${currentUser?.name?.split(" ")[0] || "Employee"}`}
          hasUnreadNotifications={hasUnreadNotifications}
          onNotificationPress={() => router.push(NOTIFICATION_ROUTE as any)}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        {/* Earnings Summary */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.earningsCard}
        >
          <View style={styles.earningsHeader}>
            <View>
              <Text style={styles.earningsLabel}>This Month Earnings</Text>
              <Text style={styles.earningsValue}>
                AED {Math.round(stats.earningsThisMonth).toLocaleString()}
              </Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>{stats.rating.toFixed(1)}</Text>
            </View>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsFooter}>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsSubLabel}>Pending Payments</Text>
              <Text style={styles.earningsSubValue}>
                AED {Math.round(stats.pendingPayments).toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewEarningsButton}
              onPress={() => router.push("/(employee)/earnings")}
            >
              <Text style={styles.viewEarningsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#10B981" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statTiles.map((stat, index) => (
            <Animated.View
              key={stat.title}
              entering={FadeInDown.duration(400).delay(200 + index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.statTile,
                  { width: isTablet ? "23%" : cardWidth },
                ]}
                onPress={stat.onPress}
                disabled={!stat.onPress}
              >
                <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                  <Ionicons name={stat.icon} size={28} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.title}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(600)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(employee)/jobs")}
            >
              <Ionicons name="briefcase-outline" size={24} color="#10B981" />
              <Text style={styles.quickActionText}>My Jobs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(employee)/earnings")}
            >
              <Ionicons name="cash-outline" size={24} color="#10B981" />
              <Text style={styles.quickActionText}>Earnings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(employee)/messages")}
            >
              <Ionicons name="chatbubbles-outline" size={24} color="#10B981" />
              <Text style={styles.quickActionText}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(employee)/profile")}
            >
              <Ionicons name="person-outline" size={24} color="#10B981" />
              <Text style={styles.quickActionText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Upcoming Jobs */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(700)}
          style={[styles.section, { marginBottom: 24 }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Jobs</Text>
            <TouchableOpacity onPress={() => router.push("/(employee)/jobs")}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {upcomingJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No upcoming jobs</Text>
              <Text style={styles.emptyStateSubtext}>
                Your assigned jobs will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {upcomingJobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() =>
                    router.push(`/(employee)/job-details?id=${job.id}`)
                  }
                >
                  <View style={styles.jobCardHeader}>
                    <View style={styles.jobCardTitleRow}>
                      <Text style={styles.jobCardTitle} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: `${getPriorityColor(job.priority)}15` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityText,
                            { color: getPriorityColor(job.priority) },
                          ]}
                        >
                          {job.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.jobCardId}>#{job.id.slice(0, 8)}</Text>
                  </View>

                  <View style={styles.jobCardDetails}>
                    <View style={styles.jobDetailItem}>
                      <Ionicons name="business-outline" size={14} color="#64748B" />
                      <Text style={styles.jobDetailText} numberOfLines={1}>
                        {job.buildingName || "Building"}
                      </Text>
                    </View>
                    {job.unitNumber && (
                      <View style={styles.jobDetailItem}>
                        <Ionicons name="home-outline" size={14} color="#64748B" />
                        <Text style={styles.jobDetailText}>
                          Unit {job.unitNumber}
                        </Text>
                      </View>
                    )}
                    <View style={styles.jobDetailItem}>
                      <Ionicons name="calendar-outline" size={14} color="#64748B" />
                      <Text style={styles.jobDetailText}>
                        {job.scheduledDate
                          ? new Date(job.scheduledDate).toLocaleDateString()
                          : "Not scheduled"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.jobCardFooter}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${getJobStatusColor(job)}15` },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: getJobStatusColor(job) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: getJobStatusColor(job) },
                        ]}
                      >
                        {getJobStatusLabel(job)}
                      </Text>
                    </View>
                    {job.estimatedCost && (
                      <Text style={styles.jobCost}>
                        AED {job.estimatedCost.toLocaleString()}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  earningsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  earningsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  earningsLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  earningsDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },
  earningsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  earningsItem: {
    flex: 1,
  },
  earningsSubLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  earningsSubValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  viewEarningsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewEarningsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  statTile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  jobsList: {
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
  jobDetailItem: {
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
});
