import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedButton } from "../../components/ui/AnimatedButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { RequestsScreenSkeleton } from "../../components/ui/RequestsScreenSkeleton";
import { SideMenu } from "../../components/ui/SideMenu";
import { useAppDomain } from "../../lib/context/connected-app-provider";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { useRequests } from "../../lib/context/requests-context";
import { useResidentRequests } from "../../lib/hooks/useResidentRequests";
import type { Job, Request, RequestPriority, RequestStatus } from "../../lib/types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";

const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#34474D",
  primarySoft: "#D6E4E8",
  accent: "#F7EEDF",
  accentBorder: "#EBD8BB",
  successBg: "#E4F4EA",
  successText: "#25674A",
  warningBg: "#FDF1DB",
  warningText: "#9A5B00",
  dangerBg: "#FCE3E0",
  dangerText: "#B24A41",
  infoBg: "#E7EEF9",
  infoText: "#3C5A8C",
  shadow: "rgba(43, 52, 55, 0.08)",
};

type FilterStatus = "all" | RequestStatus;

const REQUESTS_PER_PAGE = 10;

const getRequestTimestamp = (request: Request): number => {
  const timestamp = request.createdAt || request.updatedAt || "";
  const parsed = Date.parse(timestamp);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatDate = (value?: string | null) => {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Pending";
  return `${parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}, ${parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const formatCurrency = (value?: number | null) => {
  if (value == null) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCount = (value: number) => String(value).padStart(2, "0");

const getStatusMeta = (status: RequestStatus) => {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        bg: P.successBg,
        text: P.successText,
        icon: "checkmark-circle-outline" as const,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        bg: P.dangerBg,
        text: P.dangerText,
        icon: "close-circle-outline" as const,
      };
    case "assigned":
      return {
        label: "Assigned",
        bg: P.infoBg,
        text: P.infoText,
        icon: "person-outline" as const,
      };
    case "in-progress":
      return {
        label: "In Progress",
        bg: P.infoBg,
        text: P.infoText,
        icon: "construct-outline" as const,
      };
    case "on-hold":
      return {
        label: "On Hold",
        bg: P.accent,
        text: P.warningText,
        icon: "pause-circle-outline" as const,
      };
    default:
      return {
        label: "Pending",
        bg: P.warningBg,
        text: P.warningText,
        icon: "time-outline" as const,
      };
  }
};

const getPriorityMeta = (priority: RequestPriority) => {
  switch (priority) {
    case "urgent":
      return { label: "Urgent", bg: P.dangerBg, text: P.dangerText };
    case "high":
      return { label: "High", bg: "#FFEDD5", text: "#B45309" };
    case "medium":
      return { label: "Normal", bg: P.warningBg, text: P.warningText };
    default:
      return { label: "Low", bg: P.successBg, text: P.successText };
  }
};

const getRequestTypeMeta = (type?: Request["type"] | string | null) => {
  switch (type) {
    case "plumbing":
      return { label: "Plumbing", icon: "water-outline" as const };
    case "electrical":
      return { label: "Electrical", icon: "flash-outline" as const };
    case "cleaning":
      return { label: "Cleaning", icon: "sparkles-outline" as const };
    case "hvac":
      return { label: "HVAC", icon: "snow-outline" as const };
    case "repair":
    case "maintenance":
      return { label: "Maintenance", icon: "construct-outline" as const };
    default:
      return { label: "General", icon: "apps-outline" as const };
  }
};

export default function RequestsScreen() {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const { actions: requestActions } = useRequests();
  const {
    operations: { jobs, reviewJobEstimateAsTenant },
  } = useAppDomain();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const handledRequestIdRef = useRef<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();

  const {
    requests: backendRequests,
    isLoading,
    isRefreshing,
    refreshRequests,
  } = useResidentRequests({ currentUser, notifications });

  const allRequestsByNewest = useMemo(
    () => [...backendRequests].sort((a, b) => getRequestTimestamp(b) - getRequestTimestamp(a)),
    [backendRequests],
  );

  const allUserRequests = useMemo(() => {
    const filteredRequests =
      filterStatus === "all"
        ? allRequestsByNewest
        : allRequestsByNewest.filter((req) => req.status === filterStatus);
    return filteredRequests;
  }, [allRequestsByNewest, filterStatus]);

  const userRequests = useMemo(
    () => allUserRequests.slice(0, page * REQUESTS_PER_PAGE),
    [allUserRequests, page],
  );

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

  const stats = useMemo(() => {
    const statusCounts = backendRequests.reduce(
      (counts, req) => {
        counts[req.status] = (counts[req.status] || 0) + 1;
        return counts;
      },
      {} as Record<RequestStatus, number>,
    );

    const open =
      (statusCounts.pending || 0) +
      (statusCounts.assigned || 0) +
      (statusCounts["in-progress"] || 0) +
      (statusCounts["on-hold"] || 0);

    return {
      total: backendRequests.length,
      open,
      pending: statusCounts.pending || 0,
      assigned: statusCounts.assigned || 0,
      inProgress: statusCounts["in-progress"] || 0,
      onHold: statusCounts["on-hold"] || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
    };
  }, [backendRequests]);

  const latestRequest = allRequestsByNewest[0];

  const statusFilters = useMemo(
    () => [
      { label: "All", value: "all" as const, count: stats.total },
      { label: "Pending", value: "pending" as const, count: stats.pending },
      { label: "Assigned", value: "assigned" as const, count: stats.assigned },
      { label: "In Progress", value: "in-progress" as const, count: stats.inProgress },
      { label: "On Hold", value: "on-hold" as const, count: stats.onHold },
      { label: "Completed", value: "completed" as const, count: stats.completed },
      { label: "Cancelled", value: "cancelled" as const, count: stats.cancelled },
    ],
    [stats],
  );

  const activeFilterLabel =
    statusFilters.find((option) => option.value === filterStatus)?.label || "All";

  const summaryCards = [
    {
      key: "open",
      label: "Open Requests",
      value: formatCount(stats.open),
      tone: "primary" as const,
    },
    {
      key: "progress",
      label: "In Progress",
      value: formatCount(stats.inProgress + stats.assigned),
      tone: "neutral" as const,
    },
    {
      key: "completed",
      label: "Completed",
      value: formatCount(stats.completed),
      tone: "accent" as const,
    },
  ];

  const onRefresh = async (): Promise<void> => {
    if (!currentUser?.id) return;
    setPage(1);
    await refreshRequests({ asRefresh: true, reason: "manual" });
  };

  const loadMoreRequests = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setPage((prevPage) => prevPage + 1);
        setIsLoadingMore(false);
      }, 300);
    }
  };

  const handleApproveEstimate = (jobId: string) => {
    Alert.alert("Approve Estimate", "Do you want to proceed with the proposed costs?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          try {
            await reviewJobEstimateAsTenant?.(jobId, { decision: "approve" });
            showSuccessAlert("Thank you for confirming the estimate.");
          } catch (error: any) {
            showErrorAlert(error);
          }
        },
      },
    ]);
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
              Alert.alert("Reason Required", "Please explain why you're declining the estimate.");
              return;
            }
            try {
              await reviewJobEstimateAsTenant?.(jobId, {
                decision: "decline",
                notes: reason.trim(),
              });
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
    requestActions.setSelectedRequest(request);
    router.push("/(modals)/request-details");
  };

  useEffect(() => {
    const requestId = params.requestId ? String(params.requestId) : null;
    if (!requestId || handledRequestIdRef.current === requestId) return;

    const request = backendRequests.find((item) => item.id === requestId);
    if (!request) return;

    handledRequestIdRef.current = requestId;
    requestActions.setSelectedRequest(request);
    router.push("/(modals)/request-details");
  }, [backendRequests, params.requestId, requestActions]);

  const userNotifications = filterNotificationsByUser(notifications || [], currentUser?.id);
  const hasUnreadNotifications = getUnreadNotificationsCount(userNotifications) > 0;

  const renderRequestCard = ({ item: request }: { item: Request }) => {
    const statusMeta = getStatusMeta(request.status);
    const priorityMeta = getPriorityMeta(request.priority);
    const typeMeta = getRequestTypeMeta(request.type);
    const isBackendRequest = (request as any)._source === "backend";
    const job = isBackendRequest ? undefined : jobsByRequestId[request.id];
    const estimate = job?.estimate;
    const awaitingCompletionApproval = job?.completionStatus === "awaiting_tenant_approval";
    const estimateAwaitingTenant = estimate?.status === "sp_approved";

    return (
      <AnimatedButton style={styles.requestCard} onPress={() => handleRequestPress(request)}>
        <View style={styles.requestTopRow}>
          <View style={styles.requestIconWrap}>
            <Ionicons name={typeMeta.icon} size={18} color={P.primary} />
          </View>
          <View style={styles.requestTitleWrap}>
            <Text style={styles.requestTitle} numberOfLines={1}>
              {request.title}
            </Text>
            <Text style={styles.requestMetaText} numberOfLines={1}>
              {typeMeta.label} • Updated {formatDate(request.updatedAt || request.createdAt)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={P.soft} />
        </View>

        <View style={styles.pillRow}>
          <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
            <Ionicons name={statusMeta.icon} size={12} color={statusMeta.text} />
            <Text style={[styles.statusPillText, { color: statusMeta.text }]}>
              {statusMeta.label}
            </Text>
          </View>
          <View style={[styles.priorityPill, { backgroundColor: priorityMeta.bg }]}>
            <Text style={[styles.priorityPillText, { color: priorityMeta.text }]}>
              {priorityMeta.label}
            </Text>
          </View>
        </View>

        <Text style={styles.requestDescription} numberOfLines={2}>
          {request.description}
        </Text>

        <View style={styles.requestInfoRow}>
          <Text style={styles.requestInfoText}>{formatDate(request.createdAt)}</Text>
          <Text style={styles.requestInfoText}>
            {request.assignedTo ? `Assigned to ${request.assignedTo}` : "Awaiting assignment"}
          </Text>
        </View>

        {estimate && (
          <View style={styles.estimateCard}>
            <View style={styles.estimateHeader}>
              <View style={styles.estimateTitleRow}>
                <Ionicons name="receipt-outline" size={14} color={P.primary} />
                <Text style={styles.estimateHeaderText}>Estimate ready</Text>
              </View>
              <Text style={styles.estimateAmountText}>{formatCurrency(estimate.subtotal)}</Text>
            </View>
            <Text style={styles.estimateMetaText}>
              Submitted {formatDateTime(estimate.createdAt)}
            </Text>

            {estimateAwaitingTenant && job?.id ? (
              <View style={styles.estimateActionRow}>
                <TouchableOpacity
                  style={[styles.estimateActionButton, styles.estimateDeclineButton]}
                  onPress={() => handleDeclineEstimate(job.id)}
                >
                  <Text style={styles.estimateDeclineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.estimateActionButton, styles.estimateApproveButton]}
                  onPress={() => handleApproveEstimate(job.id)}
                >
                  <Text style={styles.estimateApproveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {awaitingCompletionApproval && job?.id ? (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() =>
              router.push({
                pathname: "/(modals)/approve-job-completion",
                params: { jobId: job.id },
              })
            }
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={P.surface} />
            <Text style={styles.reviewButtonText}>Review Completion</Text>
          </TouchableOpacity>
        ) : null}
      </AnimatedButton>
    );
  };

  const renderListHeader = () => (
    <>
      <Animated.View entering={FadeIn.duration(400)}>
        <HeaderBar
          title="My Requests"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          textColor={P.text}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(40).duration(400)} style={styles.heroCard}>
        <LinearGradient
          colors={[P.primary, P.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Service Desk</Text>
            <Text style={styles.heroTitle}>Request Tracking</Text>
            <Text style={styles.heroSubtitle}>
              {filterStatus === "all"
                ? `${stats.open} active requests need attention across your residence.`
                : `${allUserRequests.length} request${allUserRequests.length === 1 ? "" : "s"} in ${activeFilterLabel.toLowerCase()}.`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.heroAction}
            activeOpacity={0.88}
            onPress={() => router.push("/(tenant)/new-request" as any)}
          >
            <Ionicons name="add-outline" size={16} color={P.surface} />
            <Text style={styles.heroActionText}>New Request</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(70).duration(400)} style={styles.summaryRow}>
        {summaryCards.map((card) => (
          <View
            key={card.key}
            style={[
              styles.summaryCard,
              card.tone === "primary" && styles.summaryCardPrimary,
              card.tone === "accent" && styles.summaryCardAccent,
            ]}
          >
            <Text
              style={[
                styles.summaryValue,
                card.tone === "primary" && styles.summaryValuePrimary,
              ]}
            >
              {card.value}
            </Text>
            <Text
              style={[
                styles.summaryLabel,
                card.tone === "primary" && styles.summaryLabelPrimary,
              ]}
            >
              {card.label}
            </Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(95).duration(400)} style={styles.spotlightCard}>
        <View style={styles.spotlightHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Latest Update</Text>
            <Text style={styles.spotlightTitle}>
              {latestRequest ? latestRequest.title : "No requests yet"}
            </Text>
          </View>
          <View style={styles.spotlightBadge}>
            <Text style={styles.spotlightBadgeText}>{formatCount(stats.total)}</Text>
          </View>
        </View>
        <Text style={styles.spotlightText}>
          {latestRequest
            ? `${getStatusMeta(latestRequest.status).label} • Updated ${formatDate(latestRequest.updatedAt)}`
            : "Once you create a request, its latest status will appear here."}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.filterSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Browse Requests</Text>
            <Text style={styles.sectionSubtitle}>Filter by current status</Text>
          </View>
        </View>

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
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => {
                  setFilterStatus(option.value);
                  setPage(1);
                }}
                activeOpacity={0.88}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {option.label}
                </Text>
                <View style={[styles.filterCountPill, active && styles.filterCountPillActive]}>
                  <Text
                    style={[
                      styles.filterCountText,
                      active && styles.filterCountTextActive,
                    ]}
                  >
                    {option.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </>
  );

  const renderListFooter = () => {
    if (userRequests.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="document-text-outline" size={26} color={P.soft} />
          </View>
          <Text style={styles.emptyStateTitle}>No requests found</Text>
          <Text style={styles.emptyStateText}>
            {filterStatus === "all"
              ? "Create a new service request to start tracking it here."
              : `There are no requests in ${activeFilterLabel.toLowerCase()} right now.`}
          </Text>
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={() => router.push("/(tenant)/new-request" as any)}
          >
            <Text style={styles.emptyActionText}>Create Request</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (hasMore) {
      return (
        <View style={styles.loadMoreContainer}>
          {isLoadingMore ? (
            <ActivityIndicator size="small" color={P.primary} />
          ) : (
            <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreRequests}>
              <Text style={styles.loadMoreText}>Load More</Text>
              <Ionicons name="chevron-down" size={16} color={P.primary} />
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
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 32 }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={P.primary} />
        }
        onEndReached={loadMoreRequests}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  heroCard: {
    marginBottom: 16,
  },
  heroGradient: {
    borderRadius: 28,
    padding: 20,
    gap: 18,
  },
  heroCopy: {
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: P.surface,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.76)",
    maxWidth: 280,
  },
  heroAction: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  heroActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.surface,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minHeight: 102,
    borderRadius: 22,
    padding: 16,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    justifyContent: "space-between",
  },
  summaryCardPrimary: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  summaryCardAccent: {
    backgroundColor: P.accent,
    borderColor: P.accentBorder,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: P.text,
  },
  summaryValuePrimary: {
    color: P.surface,
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 17,
    color: P.muted,
    fontWeight: "600",
  },
  summaryLabelPrimary: {
    color: "rgba(255,255,255,0.76)",
  },
  spotlightCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: P.border,
  },
  spotlightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  spotlightTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: P.text,
  },
  spotlightBadge: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
  },
  spotlightBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: P.primary,
  },
  spotlightText: {
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
  },
  filterSection: {
    marginBottom: 14,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: P.text,
    marginBottom: 3,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: P.soft,
  },
  filterRowContent: {
    paddingRight: 20,
    gap: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
  },
  filterChipActive: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: P.text,
  },
  filterChipTextActive: {
    color: P.surface,
  },
  filterCountPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  filterCountPillActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: P.primary,
  },
  filterCountTextActive: {
    color: P.surface,
  },
  requestCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  requestTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  requestIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
  },
  requestTitleWrap: {
    flex: 1,
    gap: 3,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: P.text,
  },
  requestMetaText: {
    fontSize: 12,
    color: P.soft,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  priorityPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  requestDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
    marginBottom: 12,
  },
  requestInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: P.border,
    paddingTop: 12,
  },
  requestInfoText: {
    flex: 1,
    fontSize: 12,
    color: P.soft,
  },
  estimateCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
  },
  estimateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  estimateTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  estimateHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.text,
  },
  estimateAmountText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.text,
  },
  estimateMetaText: {
    fontSize: 12,
    color: P.soft,
    marginTop: 6,
  },
  estimateActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  estimateActionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  estimateDeclineButton: {
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: "#E7B4AD",
  },
  estimateApproveButton: {
    backgroundColor: P.primary,
  },
  estimateDeclineText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.dangerText,
  },
  estimateApproveText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.surface,
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    backgroundColor: P.primary,
    borderRadius: 16,
    marginTop: 12,
  },
  reviewButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.surface,
  },
  loadMoreContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: P.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.primary,
  },
  emptyState: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: "center",
    marginTop: 10,
  },
  emptyIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: P.text,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
    textAlign: "center",
    marginBottom: 16,
  },
  emptyAction: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: P.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.surface,
  },
});
