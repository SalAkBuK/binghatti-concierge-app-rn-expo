import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type TimePeriod = "week" | "month" | "year";

export default function AnalyticsScreen() {
  const { currentUser, notifications, jobs } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("month");

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isTablet = width >= 768;

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Filter jobs for current service provider
  const myJobs = useMemo(() => {
    return (
      jobs?.filter((job) => job.assignedTo === currentUser?.id) || []
    );
  }, [jobs, currentUser]);

  // Calculate analytics based on selected period
  const analytics = useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (selectedPeriod === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (selectedPeriod === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const periodJobs = myJobs.filter((job) => {
      const jobDate = new Date(job.createdAt || "");
      return jobDate >= startDate && jobDate <= now;
    });

    const totalJobs = periodJobs.length;
    const completedJobs = periodJobs.filter((j) => j.status === "completed").length;
    const cancelledJobs = periodJobs.filter((j) => j.status === "cancelled").length;
    const pendingJobs = periodJobs.filter((j) => j.status === "pending").length;
    const inProgressJobs = periodJobs.filter((j) => j.status === "in-progress").length;

    const totalEarnings = periodJobs
      .filter((j) => j.status === "completed")
      .reduce((sum, j) => sum + (j.actualCost || j.estimatedCost || 0), 0);

    const averageJobValue = completedJobs > 0 ? totalEarnings / completedJobs : 0;

    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
    const acceptanceRate = totalJobs > 0
      ? ((totalJobs - cancelledJobs) / totalJobs) * 100
      : 0;

    // Jobs by building
    const buildingBreakdown = periodJobs.reduce((acc, job) => {
      const building = job.buildingName || "Unknown";
      if (!acc[building]) {
        acc[building] = { count: 0, earnings: 0 };
      }
      acc[building].count++;
      if (job.status === "completed") {
        acc[building].earnings += job.actualCost || job.estimatedCost || 0;
      }
      return acc;
    }, {} as Record<string, { count: number; earnings: number }>);

    const topBuildings = Object.entries(buildingBreakdown)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    // Jobs by priority
    const urgentJobs = periodJobs.filter((j) => j.priority === "urgent").length;
    const highJobs = periodJobs.filter((j) => j.priority === "high").length;
    const mediumJobs = periodJobs.filter((j) => j.priority === "medium").length;
    const lowJobs = periodJobs.filter((j) => j.priority === "low").length;

    return {
      totalJobs,
      completedJobs,
      cancelledJobs,
      pendingJobs,
      inProgressJobs,
      totalEarnings,
      averageJobValue,
      completionRate,
      acceptanceRate,
      topBuildings,
      urgentJobs,
      highJobs,
      mediumJobs,
      lowJobs,
    };
  }, [myJobs, selectedPeriod]);

  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Analytics & Reports</Text>
            <Text style={styles.headerSubtitle}>Performance metrics</Text>
          </View>
        </Animated.View>

        {/* Time Period Selector */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.periodSelector}
        >
          {periodOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.periodButton,
                selectedPeriod === option.value && styles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(option.value)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  selectedPeriod === option.value && styles.periodButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Key Metrics Cards */}
        <View style={styles.metricsGrid}>
          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
            style={[styles.metricCard, styles.metricCardEarnings]}
          >
            <Ionicons name="cash" size={28} color="#10B981" />
            <Text style={styles.metricValue}>
              AED {analytics.totalEarnings.toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>Total Earnings</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(400).delay(250)}
            style={styles.metricCard}
          >
            <Ionicons name="checkmark-done" size={28} color="#8B5CF6" />
            <Text style={styles.metricValue}>{analytics.completedJobs}</Text>
            <Text style={styles.metricLabel}>Completed Jobs</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(400).delay(300)}
            style={styles.metricCard}
          >
            <Ionicons name="trending-up" size={28} color="#3B82F6" />
            <Text style={styles.metricValue}>
              {analytics.completionRate.toFixed(0)}%
            </Text>
            <Text style={styles.metricLabel}>Completion Rate</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(400).delay(350)}
            style={styles.metricCard}
          >
            <Ionicons name="wallet" size={28} color="#F59E0B" />
            <Text style={styles.metricValue}>
              AED {Math.round(analytics.averageJobValue)}
            </Text>
            <Text style={styles.metricLabel}>Avg Job Value</Text>
          </Animated.View>
        </View>

        {/* Job Status Breakdown */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(400)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Job Status Breakdown</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <View style={[styles.statusBar, { flex: analytics.completedJobs }]}>
                <View style={[styles.statusBarFill, { backgroundColor: "#10B981" }]} />
              </View>
              <View style={styles.statusInfo}>
                <View style={styles.statusLabelRow}>
                  <View style={[styles.statusDot, { backgroundColor: "#10B981" }]} />
                  <Text style={styles.statusLabel}>Completed</Text>
                </View>
                <Text style={styles.statusValue}>{analytics.completedJobs}</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={[styles.statusBar, { flex: analytics.inProgressJobs || 0.5 }]}>
                <View style={[styles.statusBarFill, { backgroundColor: "#8B5CF6" }]} />
              </View>
              <View style={styles.statusInfo}>
                <View style={styles.statusLabelRow}>
                  <View style={[styles.statusDot, { backgroundColor: "#8B5CF6" }]} />
                  <Text style={styles.statusLabel}>In Progress</Text>
                </View>
                <Text style={styles.statusValue}>{analytics.inProgressJobs}</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={[styles.statusBar, { flex: analytics.pendingJobs || 0.5 }]}>
                <View style={[styles.statusBarFill, { backgroundColor: "#F59E0B" }]} />
              </View>
              <View style={styles.statusInfo}>
                <View style={styles.statusLabelRow}>
                  <View style={[styles.statusDot, { backgroundColor: "#F59E0B" }]} />
                  <Text style={styles.statusLabel}>Pending</Text>
                </View>
                <Text style={styles.statusValue}>{analytics.pendingJobs}</Text>
              </View>
            </View>

            <View style={styles.statusItem}>
              <View style={[styles.statusBar, { flex: analytics.cancelledJobs || 0.5 }]}>
                <View style={[styles.statusBarFill, { backgroundColor: "#EF4444" }]} />
              </View>
              <View style={styles.statusInfo}>
                <View style={styles.statusLabelRow}>
                  <View style={[styles.statusDot, { backgroundColor: "#EF4444" }]} />
                  <Text style={styles.statusLabel}>Cancelled</Text>
                </View>
                <Text style={styles.statusValue}>{analytics.cancelledJobs}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Priority Distribution */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(450)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Jobs by Priority</Text>
          <View style={styles.priorityGrid}>
            <View style={styles.priorityItem}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <Text style={styles.priorityValue}>{analytics.urgentJobs}</Text>
              <Text style={styles.priorityLabel}>Urgent</Text>
            </View>
            <View style={styles.priorityItem}>
              <Ionicons name="warning" size={24} color="#F59E0B" />
              <Text style={styles.priorityValue}>{analytics.highJobs}</Text>
              <Text style={styles.priorityLabel}>High</Text>
            </View>
            <View style={styles.priorityItem}>
              <Ionicons name="information-circle" size={24} color="#3B82F6" />
              <Text style={styles.priorityValue}>{analytics.mediumJobs}</Text>
              <Text style={styles.priorityLabel}>Medium</Text>
            </View>
            <View style={styles.priorityItem}>
              <Ionicons name="ellipse" size={24} color="#10B981" />
              <Text style={styles.priorityValue}>{analytics.lowJobs}</Text>
              <Text style={styles.priorityLabel}>Low</Text>
            </View>
          </View>
        </Animated.View>

        {/* Top Buildings */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(500)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Top Buildings</Text>
          {analytics.topBuildings.length > 0 ? (
            <View style={styles.buildingsList}>
              {analytics.topBuildings.map(([building, data], index) => (
                <View key={building} style={styles.buildingItem}>
                  <View style={styles.buildingRank}>
                    <Text style={styles.buildingRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.buildingInfo}>
                    <Text style={styles.buildingName}>{building}</Text>
                    <Text style={styles.buildingStats}>
                      {data.count} jobs • AED {data.earnings.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.buildingProgress}>
                    <View
                      style={[
                        styles.buildingProgressBar,
                        {
                          width: `${(data.count / analytics.totalJobs) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No data available for this period</Text>
            </View>
          )}
        </Animated.View>

        {/* Performance Summary */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(550)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Performance Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Jobs</Text>
              <Text style={styles.summaryValue}>{analytics.totalJobs}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Acceptance Rate</Text>
              <Text style={styles.summaryValue}>
                {analytics.acceptanceRate.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Completion Rate</Text>
              <Text style={styles.summaryValue}>
                {analytics.completionRate.toFixed(0)}%
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Avg Earnings/Job</Text>
              <Text style={styles.summaryValue}>
                AED {Math.round(analytics.averageJobValue)}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: "#3B82F6",
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  periodButtonTextActive: {
    color: "#FFFFFF",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricCardEarnings: {
    backgroundColor: "#D1FAE5",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  statusGrid: {
    gap: 16,
  },
  statusItem: {
    gap: 8,
  },
  statusBar: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  statusBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  statusInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  statusValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  priorityGrid: {
    flexDirection: "row",
    gap: 12,
  },
  priorityItem: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  priorityValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  buildingsList: {
    gap: 12,
  },
  buildingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buildingRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  buildingRankText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  buildingInfo: {
    flex: 1,
  },
  buildingName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  buildingStats: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  buildingProgress: {
    width: 60,
    height: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 2,
    overflow: "hidden",
  },
  buildingProgressBar: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 2,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  summaryItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
  },
});
