import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedButton } from "../../components/ui/AnimatedButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { RequestsScreenSkeleton } from "../../components/ui/RequestsScreenSkeleton";
import { SideMenu } from "../../components/ui/SideMenu";
import { TenantLockedFeatureCard } from "../../components/ui/TenantLockedFeatureCard";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { useRequests } from "../../lib/context/requests-context";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import { useResidentRequests } from "../../lib/hooks/useResidentRequests";
import type { Request, RequestStatus } from "../../lib/types";
import {
  getResidentRequestOwnerRejectionReason,
  isResidentRequestOwnerRejected,
} from "../../lib/utils/resident-request-approval";
import {
  classifyTenantRequestByTenancyCycle,
  getTenantLifecycleChip,
  groupTenantRequestsByTenancyCycle,
  TENANT_REQUEST_SECTION_COPY,
  type TenantLifecycleChipTone,
  type TenantRequestSectionKey,
} from "../../lib/utils/tenant-request-tenancy-display";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import { RESIDENT_HISTORY_UNAVAILABLE_MESSAGE } from "../../lib/utils/resident-history-access";

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
type TenantRequestsView = "current" | "history";
type TenantRequestListRow =
  | {
      type: "section";
      key: string;
      sectionKey: TenantRequestSectionKey;
      title: string;
      subtitle: string;
    }
  | {
      type: "request";
      key: string;
      request: Request;
    };

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

const formatCount = (value: number) => String(value).padStart(2, "0");
const getTenantRequestsRoute = (view: TenantRequestsView) =>
  view === "current" ? "/(tenant)/requests" : "/(tenant)/request-history";

const getStatusMeta = (request: Request) => {
  if (isResidentRequestOwnerRejected(request)) {
    return {
      label: "Owner Rejected",
      bg: P.dangerBg,
      text: P.dangerText,
      icon: "alert-circle-outline" as const,
    };
  }

  const status = request.status;
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
        label: "Canceled",
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
        label: "Submitted",
        bg: P.warningBg,
        text: P.warningText,
        icon: "time-outline" as const,
      };
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
      return { label: "Plumbing / AC / Heating", icon: "snow-outline" as const };
    case "repair":
    case "maintenance":
      return { label: "Maintenance", icon: "construct-outline" as const };
    default:
      return { label: "General", icon: "apps-outline" as const };
  }
};

const lifecycleBadgeTone = (tone: TenantLifecycleChipTone) => {
  switch (tone) {
    case "success":
      return { bg: P.successBg, text: P.successText };
    case "warning":
      return { bg: P.warningBg, text: P.warningText };
    default:
      return { bg: P.surfaceLow, text: P.text };
  }
};

type TenantRequestsScreenProps = {
  mode?: TenantRequestsView;
};

export function TenantRequestsScene({
  mode = "current",
}: TenantRequestsScreenProps) {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const { actions: requestActions } = useRequests();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const handledRequestIdRef = useRef<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [page, setPage] = useState(1);
  const activeView = mode;
  const isHistoryView = activeView === "history";
  const tabBarHeight = useBottomTabBarHeight();
  const {
    canCreateMaintenanceRequest,
    isFormerResident,
    isLoading: isTenancyLoading,
    isPreMoveIn,
    preMoveInActionLabel,
    preMoveInStatusMessage,
    preMoveInStatusTitle,
    refetch: refetchTenancy,
    statusMessage,
    statusTitle,
  } = useResidentTenancy({
    enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id),
  });
  const shouldShowMoveInCTA = preMoveInActionLabel === "Schedule Move-In";

  const {
    requests: backendRequests,
    errorMessage,
    historyUnavailable,
    isLoading,
    isRefreshing,
    refreshRequests,
  } = useResidentRequests({ currentUser, notifications });
  const isResidentHistoryLocked = isFormerResident || historyUnavailable;

  useFocusEffect(
    useCallback(() => {
      if (!isPreMoveIn) {
        return;
      }

      void refetchTenancy({ asRefresh: true, showLoading: false });
    }, [isPreMoveIn, refetchTenancy]),
  );

  const allRequestsByNewest = useMemo(
    () => [...backendRequests].sort((a, b) => getRequestTimestamp(b) - getRequestTimestamp(a)),
    [backendRequests],
  );
  const allGroupedRequests = useMemo(
    () => groupTenantRequestsByTenancyCycle(allRequestsByNewest),
    [allRequestsByNewest],
  );
  const currentRequestCount = allGroupedRequests.current.length;
  const historyRequestCount =
    allGroupedRequests.archived.length + allGroupedRequests.older.length;

  const activeViewRequests = useMemo(() => {
    if (!isHistoryView) {
      return allGroupedRequests.current;
    }

    return [...allGroupedRequests.archived, ...allGroupedRequests.older];
  }, [allGroupedRequests, isHistoryView]);

  const allUserRequests = useMemo(() => {
    const filteredRequests =
      filterStatus === "all"
        ? activeViewRequests
        : activeViewRequests.filter((req) => req.status === filterStatus);
    return filteredRequests;
  }, [activeViewRequests, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(allUserRequests.length / REQUESTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = (currentPage - 1) * REQUESTS_PER_PAGE;
  const userRequests = useMemo(
    () => allUserRequests.slice(pageStartIndex, pageStartIndex + REQUESTS_PER_PAGE),
    [allUserRequests, pageStartIndex],
  );
  const groupedUserRequests = useMemo(
    () => groupTenantRequestsByTenancyCycle(userRequests),
    [userRequests],
  );
  const sectionedUserRequests = useMemo<TenantRequestListRow[]>(
    () => {
      if (activeView === "current") {
        return groupedUserRequests.current.map((request) => ({
          type: "request" as const,
          key: request.id,
          request,
        }));
      }

      return (["archived", "older"] as const).flatMap((sectionKey) => {
        const sectionRequests = groupedUserRequests[sectionKey];
        if (sectionRequests.length === 0) {
          return [];
        }

        return [
          {
            type: "section" as const,
            key: `section-${sectionKey}`,
            sectionKey,
            title: TENANT_REQUEST_SECTION_COPY[sectionKey].title,
            subtitle: TENANT_REQUEST_SECTION_COPY[sectionKey].subtitle,
          },
          ...sectionRequests.map((request) => ({
            type: "request" as const,
            key: request.id,
            request,
          })),
        ];
      });
    },
    [activeView, groupedUserRequests],
  );
  const visibleRangeStart = allUserRequests.length === 0 ? 0 : pageStartIndex + 1;
  const visibleRangeEnd = pageStartIndex + userRequests.length;

  const stats = useMemo(() => {
    const statusCounts = activeViewRequests.reduce(
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
      total: activeViewRequests.length,
      open,
      pending: statusCounts.pending || 0,
      assigned: statusCounts.assigned || 0,
      inProgress: statusCounts["in-progress"] || 0,
      onHold: statusCounts["on-hold"] || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
    };
  }, [activeViewRequests]);

  const statusFilters = useMemo(
    () => [
      { label: 'All', value: 'all' as const, count: stats.total },
      { label: 'Submitted', value: 'pending' as const, count: stats.pending },
      { label: 'Assigned', value: 'assigned' as const, count: stats.assigned },
      {
        label: 'In Progress',
        value: 'in-progress' as const,
        count: stats.inProgress,
      },
      { label: 'On Hold', value: 'on-hold' as const, count: stats.onHold },
      { label: 'Completed', value: 'completed' as const, count: stats.completed },
      { label: 'Canceled', value: 'cancelled' as const, count: stats.cancelled },
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
    },
    {
      key: "progress",
      label: "In Progress",
      value: formatCount(stats.inProgress + stats.assigned),
    },
    {
      key: "completed",
      label: "Completed",
      value: formatCount(stats.completed),
    },
  ];

  const onRefresh = async (): Promise<void> => {
    if (!currentUser?.id) return;
    setPage(1);
    await refreshRequests({ asRefresh: true, reason: "manual" });
  };

  const handleRequestPress = (request: Request): void => {
    requestActions.setSelectedRequest(request);
    router.push("/(modals)/request-details");
  };

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  useEffect(() => {
    const requestId = params.requestId ? String(params.requestId) : null;
    if (
      isPreMoveIn ||
      isResidentHistoryLocked ||
      !requestId ||
      handledRequestIdRef.current === requestId
    ) {
      return;
    }

    const request = backendRequests.find((item) => item.id === requestId);
    if (!request) return;

    const requestView =
      classifyTenantRequestByTenancyCycle(request) === "current"
        ? "current"
        : "history";

    if (requestView !== activeView) {
      handledRequestIdRef.current = requestId;
      router.replace(
        requestView === "current"
          ? ({
              pathname: "/(tenant)/requests",
              params: { requestId },
            } as any)
          : ({
              pathname: "/(tenant)/request-history",
              params: { requestId },
            } as any),
      );
      return;
    }

    handledRequestIdRef.current = requestId;
    requestActions.setSelectedRequest(request);
    router.push("/(modals)/request-details");
  }, [
    activeView,
    backendRequests,
    isPreMoveIn,
    isResidentHistoryLocked,
    params.requestId,
    requestActions,
  ]);

  const userNotifications = filterNotificationsByUser(notifications || [], currentUser?.id);
  const hasUnreadNotifications = getUnreadNotificationsCount(userNotifications) > 0;

  if (!isTenancyLoading && isPreMoveIn) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => {
                void refetchTenancy({ asRefresh: true, showLoading: false });
              }}
            />
          }
        >
          <HeaderBar
            title="My Requests"
            hasUnreadNotifications={hasUnreadNotifications}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            textColor={P.text}
          />

          <View style={styles.lockedSection}>
            <TenantLockedFeatureCard
              title={preMoveInStatusTitle}
              message={`${preMoveInStatusMessage} Maintenance requests will unlock automatically once your move-in is completed.`}
              actionLabel={shouldShowMoveInCTA ? "Request Move In" : preMoveInActionLabel}
              onPress={() =>
                router.push(
                  shouldShowMoveInCTA
                    ? ({
                        pathname: "/(tenant)/lease-details",
                        params: { openMoveModal: "move-in" },
                      } as any)
                    : ("/(tenant)/lease-details" as any),
                )
              }
            />
          </View>
        </ScrollView>

        <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
      </SafeAreaView>
    );
  }

  if (!isTenancyLoading && isResidentHistoryLocked) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => {
                void refetchTenancy({ asRefresh: true, showLoading: false });
              }}
            />
          }
        >
          <HeaderBar
            title="My Requests"
            hasUnreadNotifications={hasUnreadNotifications}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            textColor={P.text}
          />

          <View style={styles.lockedSection}>
            <TenantLockedFeatureCard
              title="Resident history unavailable"
              message={errorMessage ?? RESIDENT_HISTORY_UNAVAILABLE_MESSAGE}
              actionLabel="Review Lease Details"
              onPress={() => router.push("/(tenant)/lease-details" as any)}
            />
          </View>
        </ScrollView>

        <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
      </SafeAreaView>
    );
  }

  const renderRequestCard = (request: Request) => {
    const ownerRejected = isResidentRequestOwnerRejected(request);
    const ownerRejectionReason = getResidentRequestOwnerRejectionReason(request);
    const statusMeta = getStatusMeta(request);
    const typeMeta = getRequestTypeMeta(request.type);
    const lifecycleChip = getTenantLifecycleChip(request);
    const unitLabel =
      request.apartment ||
      currentUser?.profile?.apartment ||
      currentUser?.resident?.unitLabel ||
      "Assigned unit";

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
              {`Unit ${unitLabel} · ${typeMeta.label}`}
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
          {lifecycleChip ? (
            <View
              style={[
                styles.lifecycleBadge,
                { backgroundColor: lifecycleBadgeTone(lifecycleChip.tone).bg },
              ]}
            >
              <Text
                style={[
                  styles.lifecycleBadgeText,
                  { color: lifecycleBadgeTone(lifecycleChip.tone).text },
                ]}
              >
                {lifecycleChip.label}
              </Text>
            </View>
          ) : null}
        </View>

        {ownerRejected ? (
          <Text style={styles.requestAlertText} numberOfLines={2}>
            {ownerRejectionReason
              ? `Owner rejected this request: ${ownerRejectionReason}`
              : "Owner rejected this request. Management will review the next step."}
          </Text>
        ) : null}

        <View style={styles.requestInfoRow}>
          <Text style={styles.requestInfoText}>
            {`Updated ${formatDate(request.updatedAt || request.createdAt)}`}
          </Text>
          <Text
            style={[
              styles.requestInfoText,
              ownerRejected && styles.requestInfoTextAlert,
            ]}
          >
            {ownerRejected
              ? "Execution blocked"
              : request.assignedTo
                ? `Assigned to ${request.assignedTo}`
                : "Awaiting assignment"}
          </Text>
        </View>
      </AnimatedButton>
    );
  };

  const renderSectionHeader = (row: Extract<TenantRequestListRow, { type: "section" }>) => (
    <View style={styles.requestSectionBlock}>
      <Text style={styles.requestSectionTitle}>{row.title}</Text>
      <Text style={styles.requestSectionSubtitle}>{row.subtitle}</Text>
    </View>
  );

  const renderListRow = ({ item }: { item: TenantRequestListRow }) =>
    item.type === "section" ? renderSectionHeader(item) : renderRequestCard(item.request);

  const renderListHeader = () => (
    <>
      <View>
        <HeaderBar
          title={isHistoryView ? "Request History" : "My Requests"}
          showBackButton={isHistoryView}
          showMenu={!isHistoryView}
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          textColor={P.text}
        />
      </View>

      <View style={styles.heroCard}>
        <LinearGradient
          colors={[P.primary, P.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Service Desk</Text>
            <Text style={styles.heroTitle}>
              {isHistoryView ? "Request History" : "Request Tracking"}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isFormerResident
                ? "Review the latest request history from your previous residency."
                : filterStatus === "all"
                ? activeView === "current"
                  ? `${currentRequestCount} current request${currentRequestCount === 1 ? "" : "s"} are visible in your active stay.`
                  : `${historyRequestCount} archived request${historyRequestCount === 1 ? "" : "s"} are available in your history.`
                : `${allUserRequests.length} ${activeView === "current" ? "current" : "history"} request${allUserRequests.length === 1 ? "" : "s"} in ${activeFilterLabel.toLowerCase()}.`}
            </Text>
          </View>

          {!isHistoryView && canCreateMaintenanceRequest ? (
            <TouchableOpacity
              style={styles.heroAction}
              activeOpacity={0.88}
              onPress={() => router.push("/(tenant)/new-request" as any)}
            >
              <Ionicons name="add-outline" size={16} color={P.surface} />
              <Text style={styles.heroActionText}>New Request</Text>
            </TouchableOpacity>
          ) : isHistoryView && currentRequestCount > 0 ? (
            <TouchableOpacity
              style={styles.heroAction}
              activeOpacity={0.88}
              onPress={() => router.push("/(tenant)/requests" as any)}
            >
              <Ionicons name="arrow-back-outline" size={16} color={P.surface} />
              <Text style={styles.heroActionText}>Current Requests</Text>
            </TouchableOpacity>
          ) : null}
        </LinearGradient>
      </View>

      {isFormerResident ? (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={P.warningText} />
          <View style={styles.infoBannerCopy}>
            <Text style={styles.infoBannerTitle}>{statusTitle}</Text>
            <Text style={styles.infoBannerText}>{statusMessage}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.summaryRow}>
        {summaryCards.map((card) => (
          <View key={card.key} style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{card.value}</Text>
            <Text style={styles.summaryLabel}>{card.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filterSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              {activeView === "current" ? "Current Requests" : "Request History"}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {activeView === "current"
                ? "Only requests from your current stay appear here."
                : "Archived requests stay separate from your active work."}
            </Text>
          </View>
          {isHistoryView ? (
            <TouchableOpacity
              style={styles.sectionActionButton}
              onPress={() => router.push("/(tenant)/requests" as any)}
              activeOpacity={0.88}
            >
              <Text style={styles.sectionActionButtonText}>
                {`Current (${currentRequestCount})`}
              </Text>
            </TouchableOpacity>
          ) : null}
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
      </View>
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
              ? activeView === "current"
                ? "You do not have any requests from your current stay right now."
                : "You do not have any archived requests in history right now."
              : `There are no ${activeView === "current" ? "current" : "history"} requests in ${activeFilterLabel.toLowerCase()} right now.`}
          </Text>
          {activeView === "history" && currentRequestCount > 0 ? (
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => {
                router.push(getTenantRequestsRoute("current") as any);
                setPage(1);
              }}
            >
              <Text style={styles.emptyActionText}>Open Current Requests</Text>
            </TouchableOpacity>
          ) : canCreateMaintenanceRequest && activeView === "current" ? (
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => router.push("/(tenant)/new-request" as any)}
            >
              <Text style={styles.emptyActionText}>Create Request</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    if (totalPages > 1) {
      return (
        <View style={styles.paginationContainer}>
          <Text style={styles.paginationSummary}>
            Showing {visibleRangeStart}-{visibleRangeEnd} of {allUserRequests.length}
          </Text>
          <View style={styles.paginationControls}>
            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPage === 1 && styles.paginationButtonDisabled,
              ]}
              onPress={() => setPage((prevPage) => Math.max(1, prevPage - 1))}
              disabled={currentPage === 1}
            >
              <Ionicons
                name="chevron-back"
                size={16}
                color={currentPage === 1 ? P.soft : P.primary}
              />
              <Text
                style={[
                  styles.paginationButtonText,
                  currentPage === 1 && styles.paginationButtonTextDisabled,
                ]}
              >
                Previous
              </Text>
            </TouchableOpacity>

            <View style={styles.paginationPagePill}>
              <Text style={styles.paginationPageText}>
                Page {currentPage} / {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.paginationButton,
                currentPage === totalPages && styles.paginationButtonDisabled,
              ]}
              onPress={() => setPage((prevPage) => Math.min(totalPages, prevPage + 1))}
              disabled={currentPage === totalPages}
            >
              <Text
                style={[
                  styles.paginationButtonText,
                  currentPage === totalPages && styles.paginationButtonTextDisabled,
                ]}
              >
                Next
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={currentPage === totalPages ? P.soft : P.primary}
              />
            </TouchableOpacity>
          </View>
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
        data={sectionedUserRequests}
        renderItem={renderListRow}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 32 }]}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={P.primary} />
        }
        showsVerticalScrollIndicator={false}
      />

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </SafeAreaView>
  );
}

export default function RequestsScreen() {
  return <TenantRequestsScene mode="current" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lockedSection: {
    paddingTop: 8,
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
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: P.accent,
    borderWidth: 1,
    borderColor: P.accentBorder,
  },
  infoBannerCopy: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: P.warningText,
  },
  infoBannerText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: P.warningText,
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
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: P.text,
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 17,
    color: P.muted,
    fontWeight: "600",
  },
  filterSection: {
    marginBottom: 14,
  },
  viewSwitch: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  viewSwitchOption: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  viewSwitchOptionActive: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  viewSwitchText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.text,
  },
  viewSwitchTextActive: {
    color: P.surface,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
  sectionActionButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionActionButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.primary,
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
  lifecycleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  lifecycleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  requestSectionBlock: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  requestSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: P.text,
  },
  requestSectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: P.soft,
  },
  requestAlertText: {
    marginTop: -2,
    marginBottom: 12,
    fontSize: 12,
    lineHeight: 18,
    color: P.dangerText,
    fontWeight: "600",
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
  requestInfoTextAlert: {
    color: P.dangerText,
    fontWeight: "700",
  },
  paginationContainer: {
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 20,
  },
  paginationSummary: {
    fontSize: 12,
    color: P.soft,
    fontWeight: "600",
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 14,
    backgroundColor: P.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
  },
  paginationButtonDisabled: {
    backgroundColor: P.surfaceLow,
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.primary,
  },
  paginationButtonTextDisabled: {
    color: P.soft,
  },
  paginationPagePill: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
  },
  paginationPageText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.text,
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
