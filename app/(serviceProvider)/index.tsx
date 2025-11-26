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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function ServiceProviderDashboard() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isTablet = width >= 768;
  const cardGap = 12;
  const cardWidth = Math.floor((width - pagePadding * 2 - cardGap) / 2);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Get service provider's jobs
  const allJobs = actions.getJobs?.() ?? [];
  const myJobs = allJobs.filter(
    (job) => job.assignedTo === currentUser?.id
  );

  // Calculate stats
  const stats = useMemo(() => {
    // Pending Jobs: Jobs accepted by SP company but NOT yet assigned to any employee
    const pending = myJobs.filter(
      (j) => j.offerStatus === "accepted" && !j.assignedToEmployeeId
    ).length;

    // Jobs assigned to employees (for reference)
    const assigned = myJobs.filter((j) => j.assignedToEmployeeId).length;

    // In Progress: Jobs actively being worked on by employees
    const inProgress = myJobs.filter(
      (j) => j.status === "in-progress" && j.assignedToEmployeeId
    ).length;

    // Completed This Month: Jobs completed this month
    const completedThisMonth = myJobs.filter(
      (j) =>
        j.status === "completed" &&
        new Date(j.completedDate || "").getMonth() === new Date().getMonth()
    ).length;

    // Calculate earnings (mock calculation)
    const earningsThisMonth = myJobs
      .filter(
        (j) =>
          j.status === "completed" &&
          new Date(j.completedDate || "").getMonth() === new Date().getMonth()
      )
      .reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

    const pendingPayments = myJobs
      .filter((j) => j.status === "completed" && !j.paidDate)
      .reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

    // Acceptance Rate: % of job offers that SP company accepted from management
    const jobOffers = myJobs.filter(
      (j) => j.offerStatus === "offered" || j.offerStatus === "accepted" || j.offerStatus === "declined"
    );
    const acceptedOffers = myJobs.filter((j) => j.offerStatus === "accepted");
    const acceptanceRate =
      jobOffers.length > 0
        ? Math.round((acceptedOffers.length / jobOffers.length) * 100)
        : 100;

    // Get average rating (from service provider profile)
    const rating = currentUser?.profile?.rating || 4.5;

    return {
      pending,
      assigned,
      inProgress,
      completedThisMonth,
      earningsThisMonth,
      pendingPayments,
      acceptanceRate,
      rating,
    };
  }, [myJobs, currentUser]);

  // Get upcoming jobs (next 5 jobs sorted by date)
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
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Stat tiles data
  const statTiles = [
    {
      title: "Pending Jobs",
      value: stats.pending,
      icon: "time-outline" as const,
      color: "#F97316",
      onPress: () => router.push("/(serviceProvider)/jobs"),
    },
    {
      title: "In Progress",
      value: stats.inProgress,
      icon: "construct-outline" as const,
      color: "#2563EB",
      onPress: () => router.push("/(serviceProvider)/jobs"),
    },
    {
      title: "Completed",
      value: stats.completedThisMonth,
      icon: "checkmark-circle-outline" as const,
      color: "#10B981",
      onPress: () => router.push("/(serviceProvider)/analytics"),
    },
    {
      title: "Acceptance Rate",
      value: `${stats.acceptanceRate}%`,
      icon: "trending-up-outline" as const,
      color: "#8B5CF6",
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <HeaderBar
          title="Dashboard"
        subtitle={`Welcome back, ${currentUser?.name?.split(" ")[0] || "Provider"}`}
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
                AED {stats.earningsThisMonth.toLocaleString()}
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
                AED {stats.pendingPayments.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.viewEarningsButton}
              onPress={() => router.push("/(serviceProvider)/analytics")}
            >
              <Text style={styles.viewEarningsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#2563EB" />
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
              onPress={() => router.push("/(serviceProvider)/jobs")}
            >
              <Ionicons name="clipboard-outline" size={24} color="#2563EB" />
              <Text style={styles.quickActionText}>View All Jobs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(serviceProvider)/schedule")}
            >
              <Ionicons name="calendar-outline" size={24} color="#2563EB" />
              <Text style={styles.quickActionText}>My Schedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(serviceProvider)/team")}
            >
              <Ionicons name="people-outline" size={24} color="#2563EB" />
              <Text style={styles.quickActionText}>Manage Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => router.push("/(serviceProvider)/ratings")}
            >
              <Ionicons name="star-outline" size={24} color="#2563EB" />
              <Text style={styles.quickActionText}>My Ratings</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Upcoming Jobs */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(700)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Jobs</Text>
            <TouchableOpacity onPress={() => router.push("/(serviceProvider)/jobs")}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {upcomingJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No upcoming jobs</Text>
            </View>
          ) : (
            <View style={styles.jobsList}>
              {upcomingJobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() =>
                    router.push(`/(serviceProvider)/job-details?id=${job.id}`)
                  }
                >
                  <View style={styles.jobCardHeader}>
                    <View style={styles.jobCardLeft}>
                      <Text style={styles.jobTitle} numberOfLines={1}>
                        {job.title}
                      </Text>
                      <Text style={styles.jobBuilding} numberOfLines={1}>
                        {job.buildingName} • Unit {job.unitNumber}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.jobStatusBadge,
                        job.status === "in-progress"
                          ? styles.jobStatusInProgress
                          : styles.jobStatusAssigned,
                      ]}
                    >
                      <Text
                        style={[
                          styles.jobStatusText,
                          job.status === "in-progress"
                            ? styles.jobStatusTextInProgress
                            : styles.jobStatusTextAssigned,
                        ]}
                      >
                        {job.status === "in-progress" ? "In Progress" : "Assigned"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.jobCardFooter}>
                    <View style={styles.jobCardInfo}>
                      <Ionicons name="calendar-outline" size={14} color="#64748B" />
                      <Text style={styles.jobCardInfoText}>
                        {new Date(job.scheduledDate || "").toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.jobCardInfo}>
                      <Ionicons name="cash-outline" size={14} color="#64748B" />
                      <Text style={styles.jobCardInfoText}>
                        AED {(job.estimatedCost || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>

        <View style={{ height: 20 }} />
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
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
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
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 4,
  },
  earningsSubValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F97316",
  },
  viewEarningsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewEarningsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 20,
    gap: 12,
    justifyContent: "space-between",
  },
  statTile: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    minHeight: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statTileTablet: {
    width: "23%",
  },
  statIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    lineHeight: 18,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    width: "48%",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  jobCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  jobBuilding: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  jobStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  jobStatusInProgress: {
    backgroundColor: "#DBEAFE",
  },
  jobStatusAssigned: {
    backgroundColor: "#FEF3C7",
  },
  jobStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  jobStatusTextInProgress: {
    color: "#1E40AF",
  },
  jobStatusTextAssigned: {
    color: "#92400E",
  },
  jobCardFooter: {
    flexDirection: "row",
    gap: 16,
  },
  jobCardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  jobCardInfoText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
    marginTop: 12,
  },
});
