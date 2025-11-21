import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
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
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/notifications-hub";

type PeriodFilter = "this_month" | "last_month" | "last_3_months" | "all";
type StatusFilter = "all" | "pending" | "paid";

interface EarningItem {
  id: string;
  jobId: string;
  jobTitle: string;
  buildingName: string;
  completedDate: string;
  amount: number;
  status: "pending" | "paid";
  paidDate?: string;
}

const PERIOD_OPTIONS: { label: string; value: PeriodFilter }[] = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 3 Months", value: "last_3_months" },
  { label: "All Time", value: "all" },
];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
];

export default function EmployeeEarningsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("this_month");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Get employee's completed jobs and convert to earnings
  const allJobs = useMemo(() => actions.getJobs?.() ?? [], [actions]);
  const myCompletedJobs = useMemo(() => {
    return allJobs.filter(
      (job) =>
        job.assignedToEmployeeId === currentUser?.id && job.status === "completed"
    );
  }, [allJobs, currentUser?.id]);

  // Convert jobs to earnings (employee gets 60% of job cost - mock)
  const earnings: EarningItem[] = useMemo(() => {
    return myCompletedJobs.map((job) => {
      const jobCost = job.actualCost || job.estimatedCost || 0;
      const employeeShare = jobCost * 0.6;

      // Mock payment status based on completion date
      const completedDate = new Date(job.completedDate || "");
      const daysSinceCompletion = Math.floor(
        (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isPaid = daysSinceCompletion > 7; // Paid after 7 days (mock)

      return {
        id: `earning-${job.id}`,
        jobId: job.id,
        jobTitle: job.title,
        buildingName: job.buildingName || "Building",
        completedDate: job.completedDate || "",
        amount: employeeShare,
        status: isPaid ? "paid" : "pending",
        paidDate: isPaid
          ? new Date(
              completedDate.getTime() + 7 * 24 * 60 * 60 * 1000
            ).toISOString()
          : undefined,
      };
    });
  }, [myCompletedJobs]);

  // Filter earnings by period
  const filteredByPeriod = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return earnings.filter((earning) => {
      const completedDate = new Date(earning.completedDate);
      const completedMonth = completedDate.getMonth();
      const completedYear = completedDate.getFullYear();

      switch (periodFilter) {
        case "this_month":
          return completedMonth === currentMonth && completedYear === currentYear;
        case "last_month":
          const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return completedMonth === lastMonth && completedYear === lastMonthYear;
        case "last_3_months":
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          return completedDate >= threeMonthsAgo;
        case "all":
        default:
          return true;
      }
    });
  }, [earnings, periodFilter]);

  // Filter by status and search
  const filteredEarnings = useMemo(() => {
    return filteredByPeriod.filter((earning) => {
      // Status filter
      if (statusFilter !== "all" && earning.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          earning.jobTitle.toLowerCase().includes(query) ||
          earning.buildingName.toLowerCase().includes(query) ||
          earning.jobId.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [filteredByPeriod, statusFilter, searchQuery]);

  // Sort by completion date (newest first)
  const sortedEarnings = useMemo(() => {
    return [...filteredEarnings].sort(
      (a, b) =>
        new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
    );
  }, [filteredEarnings]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = filteredByPeriod.reduce((sum, e) => sum + e.amount, 0);
    const pending = filteredByPeriod
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + e.amount, 0);
    const paid = filteredByPeriod
      .filter((e) => e.status === "paid")
      .reduce((sum, e) => sum + e.amount, 0);
    const jobCount = filteredByPeriod.length;

    return { total, pending, paid, jobCount };
  }, [filteredByPeriod]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const totalEarned = earnings.reduce((sum, e) => sum + e.amount, 0);
    const totalPending = earnings
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + e.amount, 0);
    const totalPaid = earnings
      .filter((e) => e.status === "paid")
      .reduce((sum, e) => sum + e.amount, 0);
    const avgPerJob = earnings.length > 0 ? totalEarned / earnings.length : 0;

    return { totalEarned, totalPending, totalPaid, avgPerJob };
  }, [earnings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const periodLabel = useMemo(() => {
    switch (periodFilter) {
      case "this_month":
        return new Date().toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      case "last_month": {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return lastMonth.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }
      case "last_3_months":
        return "Last 3 Months";
      case "all":
        return "All Time";
      default:
        return "";
    }
  }, [periodFilter]);

  const renderEarningItem = useCallback(
    ({ item }: { item: EarningItem }) => (
      <TouchableOpacity
        style={styles.earningCard}
        onPress={() => router.push(`/(employee)/job-details?id=${item.jobId}`)}
      >
        <View style={styles.earningCardHeader}>
          <View style={styles.earningCardInfo}>
            <Text style={styles.earningJobTitle} numberOfLines={1}>
              {item.jobTitle}
            </Text>
            <Text style={styles.earningJobId}>#{item.jobId.slice(0, 8)}</Text>
          </View>
          <View style={styles.earningAmountContainer}>
            <Text style={styles.earningAmount}>
              AED {Math.round(item.amount).toLocaleString()}
            </Text>
            <View
              style={[
                styles.earningStatusBadge,
                {
                  backgroundColor:
                    item.status === "paid" ? "#D1FAE5" : "#FEF3C7",
                },
              ]}
            >
              <Text
                style={[
                  styles.earningStatusText,
                  {
                    color: item.status === "paid" ? "#065F46" : "#92400E",
                  },
                ]}
              >
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.earningCardDetails}>
          <View style={styles.earningDetailRow}>
            <Ionicons name="business-outline" size={14} color="#64748B" />
            <Text style={styles.earningDetailText}>{item.buildingName}</Text>
          </View>
          <View style={styles.earningDetailRow}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
            <Text style={styles.earningDetailText}>
              Completed: {new Date(item.completedDate).toLocaleDateString()}
            </Text>
          </View>
          {item.paidDate && (
            <View style={styles.earningDetailRow}>
              <Ionicons name="wallet-outline" size={14} color="#2563EB" />
              <Text style={[styles.earningDetailText, { color: "#2563EB" }]}>
                Paid: {new Date(item.paidDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    []
  );

  const ListHeader = useCallback(
    () => (
      <View>
        {/* Overall Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryLabel}>Total Earnings</Text>
              <Text style={styles.summaryValue}>
                AED {Math.round(overallStats.totalEarned).toLocaleString()}
              </Text>
            </View>
            <View style={styles.avgBadge}>
              <Ionicons name="trending-up" size={16} color="#10B981" />
              <Text style={styles.avgText}>
                Avg: AED {Math.round(overallStats.avgPerJob).toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryFooter}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Pending</Text>
              <Text style={[styles.summaryItemValue, { color: "#F59E0B" }]}>
                AED {Math.round(overallStats.totalPending).toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Paid Out</Text>
              <Text style={[styles.summaryItemValue, { color: "#10B981" }]}>
                AED {Math.round(overallStats.totalPaid).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Period Stats */}
        <View style={styles.periodHeader}>
          <Text style={styles.periodTitle}>{periodLabel}</Text>
          <Text style={styles.periodSubtitle}>
            {stats.jobCount} {stats.jobCount === 1 ? "job" : "jobs"} completed
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#EEF2FF" }]}>
              <Ionicons name="cash-outline" size={24} color="#6366F1" />
            </View>
            <Text style={styles.statValue}>
              AED {Math.round(stats.total).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="time-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>
              AED {Math.round(stats.pending).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: "#D1FAE5" }]}>
              <Ionicons name="checkmark-done-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>
              AED {Math.round(stats.paid).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Paid</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          {/* Period Filter */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Period</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChipsScroll}
            >
              {PERIOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterChip,
                    periodFilter === option.value && styles.filterChipActive,
                  ]}
                  onPress={() => setPeriodFilter(option.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      periodFilter === option.value && styles.filterChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Status Filter */}
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterChipsRow}>
              {STATUS_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterChip,
                    statusFilter === option.value && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter(option.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === option.value && styles.filterChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
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
        </View>

        {/* Payment History Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <Text style={styles.sectionCount}>
            {sortedEarnings.length} {sortedEarnings.length === 1 ? "entry" : "entries"}
          </Text>
        </View>
      </View>
    ),
    [
      overallStats,
      stats,
      periodLabel,
      statusFilter,
      searchQuery,
      sortedEarnings.length,
    ]
  );

  const ListEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Ionicons name="wallet-outline" size={64} color="#CBD5E1" />
        <Text style={styles.emptyStateText}>No earnings found</Text>
        <Text style={styles.emptyStateSubtext}>
          {searchQuery || statusFilter !== "all"
            ? "Try adjusting your filters"
            : "Complete jobs to start earning"}
        </Text>
      </View>
    ),
    [searchQuery, statusFilter]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
        <HeaderBar
          title="Earnings"
          subtitle="Track your payments"
          hasUnreadNotifications={hasUnreadNotifications}
          onNotificationPress={() => router.push(NOTIFICATION_ROUTE as any)}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        <FlatList
          data={sortedEarnings}
          keyExtractor={(item) => item.id}
          renderItem={renderEarningItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
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
  listContainer: {
    paddingBottom: 24,
  },
  summaryCard: {
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
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
  },
  avgBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  avgText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 16,
  },
  summaryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  periodHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  periodTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  periodSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
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
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  filterChipsScroll: {
    flexDirection: "row",
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#0F172A",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionCount: {
    fontSize: 14,
    color: "#64748B",
  },
  earningCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  earningCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  earningCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  earningJobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  earningJobId: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  earningAmountContainer: {
    alignItems: "flex-end",
  },
  earningAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  earningStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  earningStatusText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  earningCardDetails: {
    gap: 6,
  },
  earningDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  earningDetailText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
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
});
