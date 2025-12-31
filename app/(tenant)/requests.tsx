import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import ChevronIcon from "../../components/icons/ChevronIcon";
import { AnimatedButton } from "../../components/ui/AnimatedButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { RequestsScreenSkeleton } from "../../components/ui/RequestsScreenSkeleton";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { useResidentRequests } from "../../lib/hooks/useResidentRequests";
import type { Job, Request, RequestStatus } from "../../lib/types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type FilterStatus = "all" | RequestStatus;

const getRequestTimestamp = (request: Request): number => {
  const timestamp = request.createdAt || request.updatedAt || "";
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function RequestsScreen() {
  const { currentUser, notifications, actions, jobs } = useApp();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const handledRequestIdRef = useRef<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  const {
    requests: backendRequests,
    isLoading,
    isRefreshing,
    refreshRequests,
  } = useResidentRequests({ currentUser, notifications });

  // Pagination state
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const REQUESTS_PER_PAGE = 10;

  // Filter requests from backend
  const allUserRequests = useMemo(() => {
    const filteredRequests =
      filterStatus === "all"
        ? backendRequests
        : backendRequests.filter((req) => req.status === filterStatus);

    return [...filteredRequests].sort(
      (a, b) => getRequestTimestamp(b) - getRequestTimestamp(a),
    );
  }, [backendRequests, filterStatus]);

  // Paginated requests
  const userRequests = useMemo(() => {
    return allUserRequests.slice(0, page * REQUESTS_PER_PAGE);
  }, [allUserRequests, page]);

  const hasMore = userRequests.length < allUserRequests.length;

  const jobsByRequestId = useMemo(() => {
    const map: Record<string, Job> = {};
    jobs.forEach((job) => {
      if (job.requestId) {
        map[job.requestId] = job;
      }
    });
    return map;
  }, [jobs]);

  // Calculate stats based on all backend requests (not affected by filter)
  const stats = useMemo(() => {
    const statusCounts = backendRequests.reduce(
      (counts, req) => {
        counts[req.status] = (counts[req.status] || 0) + 1;
        return counts;
      },
      {} as Record<RequestStatus, number>,
    );

    return {
      total: backendRequests.length,
      pending: statusCounts.pending || 0,
      "in-progress": statusCounts["in-progress"] || 0,
      "on-hold": statusCounts["on-hold"] || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
    };
  }, [backendRequests]);

  const onRefresh = async (): Promise<void> => {
    if (!currentUser?.id) return;

    setPage(1); // Reset pagination on refresh
    await refreshRequests({ asRefresh: true, reason: "manual" });
  };

  const loadMoreRequests = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      // Simulate loading delay for better UX
      setTimeout(() => {
        setPage(prevPage => prevPage + 1);
        setIsLoadingMore(false);
      }, 300);
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return { bg: "#fef3c7", text: "#92400e" };
      case "in-progress":
        return { bg: "#dbeafe", text: "#1d4ed8" };
      case "on-hold":
        return { bg: "#ffe4e6", text: "#be123c" };
      case "completed":
        return { bg: "#d1fae5", text: "#065f46" };
      case "cancelled":
        return { bg: "#fee2e2", text: "#dc2626" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  const statusFilters: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "In Progress", value: "in-progress" },
    { label: "On Hold", value: "on-hold" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const getPriorityBgColor = (priority: Request["priority"]) => {
    switch (priority) {
      case "urgent":
        return "#FBDDDD";
      case "high":
        return "#FFEDD5";
      case "medium":
        return "#FEF3C7";
      case "low":
        return "#D1FAE5";
      default:
        return "#F3F4F6";
    }
  };

  const getPriorityTextColor = (priority: Request["priority"]) => {
    switch (priority) {
      case "urgent":
        return "#dc2626";
      case "high":
        return "#ea580c";
      case "medium":
        return "#d97706";
      case "low":
        return "#065f46";
      default:
        return "#6b7280";
    }
  };

  const handleApproveEstimate = (jobId: string) => {
    Alert.alert(
      "Approve Estimate",
      "Do you want to proceed with the proposed costs?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await actions.reviewJobEstimateAsTenant?.(jobId, { decision: "approve" });
              showSuccessAlert("Thank you for confirming the estimate.");
            } catch (error: any) {
              showErrorAlert(error);
            }
          },
        },
      ],
    );
  };

  const handleDeclineEstimate = (jobId: string) => {
    Alert.prompt(
      "Decline Estimate",
      "Tell us what needs to change before work begins.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          style: "destructive",
          onPress: async (reason) => {
            if (!reason?.trim()) {
              Alert.alert(
                "Reason Required",
                "Please explain why you're declining the estimate.",
              );
              return;
            }
            try {
              await actions.reviewJobEstimateAsTenant?.(
                jobId,
                { decision: "decline", notes: reason.trim() },
              );
              showSuccessAlert("The service provider has been notified of your decline.");
            } catch (error: any) {
              showErrorAlert(error);
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const handleRequestPress = (request: Request): void => {
    actions.setSelectedRequest(request);
    router.push("/(modals)/request-details");
  };

  useEffect(() => {
    const requestId = params.requestId ? String(params.requestId) : null;
    if (!requestId || handledRequestIdRef.current === requestId) return;

    const request = backendRequests.find((item) => item.id === requestId);
    if (!request) return;

    handledRequestIdRef.current = requestId;
    actions.setSelectedRequest(request);
    router.push("/(modals)/request-details");
  }, [backendRequests, params.requestId, actions]);

  // Calculate unread notifications
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  // FilterButton component removed - not used in current UI

  const renderRequestCard = ({ item: request }: { item: Request }) => {
    const statusColors = getStatusColor(request.status);
    // Don't show jobs for backend requests (they don't have job data)
    const isBackendRequest = (request as any)._source === "backend";
    const job = isBackendRequest ? undefined : jobsByRequestId[request.id];
    const estimate = job?.estimate;
    const awaitingCompletionApproval =
      job?.completionStatus === "awaiting_tenant_approval";
    const estimateAwaitingTenant =
      estimate?.status === "sp_approved";

    return (
      <AnimatedButton
        style={styles.requestCard}
        onPress={() => handleRequestPress(request)}
      >
        <View style={styles.requestContent}>
          {/* Header row with title and chevron */}
          <View style={styles.requestHeader}>
            <Text style={styles.requestTitle} numberOfLines={1}>
              {request.title}
            </Text>
            <ChevronIcon
              size={11}
              color="#000000"
              opacity={0.5}
            />
          </View>

          {/* Status containers */}
          <View style={styles.statusContainer}>
            <View style={[styles.statusPill, {backgroundColor: statusColors.bg}]}>
              <Text style={[styles.statusText, {color: statusColors.text}]}>
                {request.status.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
            <View style={[styles.priorityPill, {backgroundColor: getPriorityBgColor(request.priority)}]}>
              <Text style={[styles.priorityText, {color: getPriorityTextColor(request.priority)}]}>
                {request.priority.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Body text */}
          <Text style={styles.requestDescription} numberOfLines={2}>
            {request.description}
          </Text>

          {/* Date and time */}
          <Text style={styles.requestDate}>
            {new Date(request.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>

          {estimate && (
            <View style={styles.requestEstimateCard}>
              <View style={styles.estimateHeader}>
                <Ionicons name="receipt-outline" size={14} color="#2563EB" />
                <Text style={styles.estimateHeaderText}>
                  Estimate
                </Text>
                <Text style={styles.estimateTotalText}>
                  AED {estimate.subtotal.toLocaleString()}
                </Text>
              </View>

              {estimateAwaitingTenant && (
                <View style={styles.requestEstimateActions}>
                  <TouchableOpacity
                    style={[
                      styles.estimateActionButton,
                      styles.estimateDeclineButton,
                    ]}
                    onPress={() => handleDeclineEstimate(job.id)}
                  >
                    <Text style={styles.estimateDeclineText}>
                      Decline
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.estimateActionButton,
                      styles.estimateApproveButton,
                    ]}
                    onPress={() => handleApproveEstimate(job.id)}
                  >
                    <Text style={styles.estimateApproveText}>
                      Approve
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {awaitingCompletionApproval && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() =>
                router.push({
                  pathname: "/(modals)/approve-job-completion",
                  params: { jobId: job!.id },
                })
              }
            >
              <Text style={styles.reviewButtonText}>
                Review Completion
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </AnimatedButton>
    );
  };

  const renderListHeader = () => (
    <>
      {/* Header */}
      <HeaderBar
        title="My Requests"
        hasUnreadNotifications={hasUnreadNotifications}
        showSideMenu={showSideMenu}
        onSideMenuToggle={setShowSideMenu}
      />

      {/* Stats Cards */}
      <Animated.View
        entering={FadeInDown.delay(50).duration(400)}
        style={styles.statsContainer}
      >
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.totalCard]}>
            <Text style={[styles.statNumber, { color: "#1F2937" }]}>
              0{stats.total}
            </Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          <View style={[styles.statCard, styles.completedCard]}>
            <Text style={[styles.statNumber, { color: "#1F2937" }]}>
              0{stats.completed}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.inProgressCard]}>
            <Text style={[styles.statNumber, { color: "#1F2937" }]}>
              0{stats["in-progress"]}
            </Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={[styles.statCard, styles.pendingCard]}>
            <Text style={[styles.statNumber, { color: "#1F2937" }]}>
              0{stats.pending}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </Animated.View>

      {/* Status Filters */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(400)}
        style={styles.filterRow}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRowContent}
        >
          {statusFilters.map((option) => {
            const active = filterStatus === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                onPress={() => {
                  setFilterStatus(option.value);
                  setPage(1);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Past Requests Section Title */}
      <Text style={styles.pastRequestsTitle}>Past Requests</Text>
    </>
  );

  const renderListFooter = () => {
    if (userRequests.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyStateTitle}>No requests found</Text>
          <Text style={styles.emptyStateText}>
            You have not submitted any requests yet
          </Text>
        </View>
      );
    }

    if (hasMore) {
      return (
        <View style={styles.loadMoreContainer}>
          {isLoadingMore ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={loadMoreRequests}
            >
              <Text style={styles.loadMoreText}>Load More</Text>
              <Ionicons name="chevron-down" size={16} color="#2563EB" />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return <View style={{ height: 20 }} />;
  };

  if (isLoading) {
    return <RequestsScreenSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={userRequests}
        renderItem={renderRequestCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + 32 }
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreRequests}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      {/* Side Menu */}
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
    backgroundColor: "#F8F9FA",
  },
  listContent: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 30,
    paddingHorizontal: 10,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  notificationButton: {
    padding: 8,
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#fff",
  },
  statsContainer: {
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 5,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: SCREEN_WIDTH * 0.055,
    minHeight: 132,
    justifyContent: "center",
    maxWidth: SCREEN_WIDTH * 0.45,
  },
  totalCard: {
    backgroundColor: "#E7EFF8",
  },
  completedCard: {
    backgroundColor: "#A7F3D0",
  },
  inProgressCard: {
    backgroundColor: "#FEF3C7",
  },
  pendingCard: {
    backgroundColor: "#FED7AA",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  pastRequestsContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    width: SCREEN_WIDTH * 0.9,
    alignSelf: "center",
  },
  pastRequestsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  requestCard: {
    backgroundColor: "#FBFBFC",
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#D5DEE8",
    width: "100%",
    minHeight: 140,
  },
  requestContent: {
    flex: 1,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingRight: 4,
  },
  requestTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#000000",
    fontFamily: "Manrope",
    lineHeight: 18,
    letterSpacing: 0,
    flex: 1,
    marginRight: 8,
  },
  statusContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  statusPill: {
    width: 68,
    height: 26,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  priorityPill: {
    width: 68,
    height: 26,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Manrope",
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Manrope",
  },
  requestDescription: {
    fontSize: 11,
    fontWeight: "normal",
    color: "#000000",
    fontFamily: "Manrope",
    lineHeight: 16,
    letterSpacing: 0,
    opacity: 0.74,
    marginBottom: 8,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterRowContent: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
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
  requestDate: {
    fontSize: 11,
    fontWeight: "500",
    color: "#000000",
    fontFamily: "Manrope",
    lineHeight: 16,
    letterSpacing: 0,
    opacity: 0.6,
  },
  requestEstimateCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  estimateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  estimateHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  estimateTotalText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F2937",
  },
  requestEstimateItems: {
    gap: 8,
  },
  requestEstimateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestEstimateLabel: {
    fontSize: 12,
    color: "#1F2937",
    flex: 1,
    marginRight: 8,
  },
  requestEstimateAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  requestEstimateMore: {
    fontSize: 11,
    color: "#64748B",
  },
  requestEstimateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  estimateActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
  },
  estimateDeclineButton: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  estimateApproveButton: {
    backgroundColor: "#2563EB",
  },
  estimateDeclineText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B91C1C",
  },
  estimateApproveText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  requestEstimateStatus: {
    fontSize: 11,
    lineHeight: 16,
  },
  requestEstimateStatusSuccess: {
    color: "#166534",
  },
  requestEstimateStatusWarning: {
    color: "#B91C1C",
  },
  requestEstimateStatusInfo: {
    color: "#475569",
  },
  jobStatusCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  jobStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  jobStatusTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  jobStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  jobStatusBadgeDefault: {
    backgroundColor: "#E2E8F0",
  },
  jobStatusBadgePending: {
    backgroundColor: "#FEF3C7",
  },
  jobStatusBadgeApproved: {
    backgroundColor: "#DCFCE7",
  },
  jobStatusBadgeInfo: {
    backgroundColor: "#E0F2FE",
  },
  jobStatusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1F2937",
  },
  jobStatusDescription: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  jobStatusMeta: {
    fontSize: 11,
    color: "#64748B",
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  loadMoreContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
});
