import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import ChevronIcon from "../../components/icons/ChevronIcon";
import { AnimatedButton } from "../../components/ui/AnimatedButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { RequestsScreenSkeleton } from "../../components/ui/RequestsScreenSkeleton";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Job, Request, RequestStatus } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type FilterStatus = "all" | RequestStatus;

export default function RequestsScreen() {
  const { requests, currentUser, notifications, actions, jobs } = useApp();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showSideMenu, setShowSideMenu] = useState(false);

  useEffect(() => {
    // Simulate minimum loading time for smooth animation
    const timer = setTimeout(() => {
      if (currentUser && requests) {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentUser, requests]);

  // Filter requests for current user
  const userRequests = useMemo(() => {
    const filtered = requests.filter((req) => req.tenantId === currentUser?.id);

    if (filterStatus === "all") {
      return filtered;
    }

    return filtered.filter((req) => req.status === filterStatus);
  }, [requests, currentUser, filterStatus]);

  const jobsByRequestId = useMemo(() => {
    const map: Record<string, Job> = {};
    jobs.forEach((job) => {
      if (job.requestId) {
        map[job.requestId] = job;
      }
    });
    return map;
  }, [jobs]);

  // Calculate stats based on user's requests
  const stats = useMemo(() => {
    const statusCounts = userRequests.reduce(
      (counts, req) => {
        counts[req.status] = (counts[req.status] || 0) + 1;
        return counts;
      },
      {} as Record<RequestStatus, number>,
    );

    return {
      total: userRequests.length,
      pending: statusCounts.pending || 0,
      "in-progress": statusCounts["in-progress"] || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
    };
  }, [userRequests]);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    // Simulate refresh - in real app you'd fetch latest data
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return { bg: "#fef3c7", text: "#92400e" };
      case "in-progress":
        return { bg: "#dbeafe", text: "#1d4ed8" };
      case "completed":
        return { bg: "#d1fae5", text: "#065f46" };
      case "cancelled":
        return { bg: "#fee2e2", text: "#dc2626" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  const getPriorityColor = (priority: Request["priority"]) => {
    switch (priority) {
      case "urgent":
        return "#dc2626";
      case "high":
        return "#ea580c";
      case "medium":
        return "#d97706";
      case "low":
        return "#65a30d";
      default:
        return "#6b7280";
    }
  };

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
              await actions.reviewJobEstimateAsTenant?.(jobId, "approve");
              Alert.alert("Estimate Approved", "Thank you for confirming.");
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ||
                  "Unable to approve the estimate. Please try again.",
              );
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
                "decline",
                reason.trim(),
              );
              Alert.alert(
                "Estimate Declined",
                "The service provider has been notified.",
              );
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ||
                  "Unable to submit your decline. Please try again.",
              );
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

  // Calculate unread notifications
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // FilterButton component removed - not used in current UI

  if (isLoading) {
    return <RequestsScreenSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

        {/* Past Requests Section */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.pastRequestsContainer}
        >
          <Text style={styles.pastRequestsTitle}>Past Requests</Text>

          {/* Requests List */}
          <View style={styles.requestsList}>
          {userRequests.length > 0 ? (
            userRequests.map((request) => {
              const statusColors = getStatusColor(request.status);
              const job = jobsByRequestId[request.id];
              const estimate = job?.estimate;
              const awaitingCompletionApproval =
                job?.completionStatus === "awaiting_tenant_approval";
              const completionApproved =
                job?.completionStatus === "tenant_approved";
              const completionDeclaredByProvider =
                job?.completionStatus === "sp_override_approved";
              const estimateAwaitingTenant =
                estimate?.status === "sp_approved";
              const estimateApproved =
                estimate?.status === "tenant_approved";
              const estimateDeclined =
                estimate?.status === "tenant_declined";

              return (
                <AnimatedButton
                  key={request.id}
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

                    {/* Subtitle text */}
                    <Text style={styles.requestType}>
                      {request.type.toUpperCase()}
                    </Text>

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
                    <Text style={styles.requestDescription} numberOfLines={3}>
                      {request.description}
                    </Text>

                    {/* Date and time */}
                    <Text style={styles.requestDate}>
                      {new Date(request.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}, {new Date(request.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>

                    {estimate && (
                      <View style={styles.requestEstimateCard}>
                        <View style={styles.estimateHeader}>
                          <Ionicons name="receipt-outline" size={16} color="#2563EB" />
                          <Text style={styles.estimateHeaderText}>
                            Estimate Proposal
                          </Text>
                          <Text style={styles.estimateTotalText}>
                            AED {estimate.subtotal.toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.requestEstimateItems}>
                          {estimate.items.slice(0, 3).map((item) => (
                            <View key={item.id} style={styles.requestEstimateRow}>
                              <Text style={styles.requestEstimateLabel}>
                                {item.label}
                              </Text>
                              <Text style={styles.requestEstimateAmount}>
                                AED {item.amount.toLocaleString()}
                              </Text>
                            </View>
                          ))}
                          {estimate.items.length > 3 && (
                            <Text style={styles.requestEstimateMore}>
                              + {estimate.items.length - 3} more items
                            </Text>
                          )}
                        </View>

                        {estimateAwaitingTenant ? (
                          <View style={styles.requestEstimateActions}>
                            <TouchableOpacity
                              style={[
                                styles.estimateActionButton,
                                styles.estimateDeclineButton,
                              ]}
                              onPress={() => handleDeclineEstimate(job.id)}
                            >
                              <Ionicons
                                name="close-circle-outline"
                                size={18}
                                color="#EF4444"
                              />
                              <Text style={styles.estimateDeclineText}>
                                Request Changes
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.estimateActionButton,
                                styles.estimateApproveButton,
                              ]}
                              onPress={() => handleApproveEstimate(job.id)}
                            >
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={18}
                                color="#FFFFFF"
                              />
                              <Text style={styles.estimateApproveText}>
                                Approve
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.requestEstimateStatus,
                              estimateApproved
                                ? styles.requestEstimateStatusSuccess
                                : estimateDeclined
                                ? styles.requestEstimateStatusWarning
                                : styles.requestEstimateStatusInfo,
                            ]}
                          >
                            {estimateApproved
                              ? "Estimate approved – work will begin once scheduled."
                              : estimateDeclined
                              ? "You declined this estimate. The provider will follow up."
                              : estimate.status === "submitted"
                              ? "Service provider reviewing the estimate."
                              : estimate.status === "sp_approved"
                              ? "Waiting for your decision."
                              : "Estimate in draft."}
                          </Text>
                        )}
                      </View>
                    )}

                    {job ? (
                      <View style={styles.jobStatusCard}>
                        <View style={styles.jobStatusHeader}>
                          <Ionicons name="briefcase-outline" size={16} color="#0F172A" />
                          <Text style={styles.jobStatusTitle}>Job Status</Text>
                          <View
                            style={[
                              styles.jobStatusBadge,
                              awaitingCompletionApproval
                                ? styles.jobStatusBadgePending
                                : completionApproved
                                ? styles.jobStatusBadgeApproved
                                : completionDeclaredByProvider
                                ? styles.jobStatusBadgeInfo
                                : styles.jobStatusBadgeDefault,
                            ]}
                          >
                            <Text style={styles.jobStatusBadgeText}>
                              {awaitingCompletionApproval
                                ? "ACTION REQUIRED"
                                : completionApproved
                                ? "APPROVED"
                                : completionDeclaredByProvider
                                ? "COMPLETED"
                                : job.status.replace("-", " ").toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.jobStatusDescription}>
                          Assigned to{" "}
                          {job.assignedToEmployeeName ||
                            job.assignedToName ||
                            "service team"}
                        </Text>
                        {awaitingCompletionApproval ? (
                          <TouchableOpacity
                            style={styles.reviewButton}
                            onPress={() =>
                              router.push({
                                pathname: "/(modals)/approve-job-completion",
                                params: { jobId: job.id },
                              })
                            }
                          >
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={16}
                              color="#FFFFFF"
                            />
                            <Text style={styles.reviewButtonText}>
                              Review Completion
                            </Text>
                          </TouchableOpacity>
                        ) : completionApproved ? (
                          <Text style={styles.jobStatusMeta}>
                            Approved on{" "}
                            {job.completionApprovedAt
                              ? new Date(job.completionApprovedAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  year: "numeric",
                                },
                              )
                              : "recently"}
                          </Text>
                        ) : completionDeclaredByProvider ? (
                          <Text style={styles.jobStatusMeta}>
                            Service provider closed the job due to inactivity.
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </AnimatedButton>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No requests found</Text>
              <Text style={styles.emptyStateText}>
                {filterStatus === "all"
                  ? "You haven't submitted any requests yet"
                  : `No ${filterStatus} requests found`}
              </Text>
            </View>
          )}
          </View>
        </Animated.View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
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
    marginBottom: 20,
  },
  requestsList: {
    // No additional margin needed as it's inside the container
  },
  requestCard: {
    backgroundColor: "#FBFBFC",
    borderRadius: 8,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D5DEE8",
    width: "100%",
    minHeight: 232,
  },
  requestContent: {
    flex: 1,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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
  requestType: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000000",
    fontFamily: "Manrope",
    lineHeight: 20,
    letterSpacing: 0,
    opacity: 0.7,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
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
    fontSize: 12,
    fontWeight: "normal",
    color: "#000000",
    fontFamily: "Manrope",
    lineHeight: 20,
    letterSpacing: 0,
    opacity: 0.74,
    marginBottom: 16,
    height: 61,
  },
  requestDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000000",
    fontFamily: "Manrope",
    lineHeight: 20,
    letterSpacing: 0,
    opacity: 1,
  },
  requestEstimateCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  estimateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  estimateHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  estimateTotalText: {
    fontSize: 12,
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
    gap: 10,
    marginTop: 8,
  },
  estimateActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
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
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },
  estimateApproveText: {
    fontSize: 12,
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
    gap: 6,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 8,
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
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
