import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { HomeScreenSkeleton } from "../../components/ui/HomeScreenSkeleton";
import { PortalLoadErrorScreen } from "../../components/ui/PortalLoadErrorScreen";
import { ScreenEntrance } from "../../components/ui/ScreenEntrance";
import { SideMenu } from "../../components/ui/SideMenu";
import { TenantLockedFeatureCard } from "../../components/ui/TenantLockedFeatureCard";
import {
  TenantAnnouncementModal,
  type TenantAnnouncementPreview,
} from "../../components/ui/TenantAnnouncementModal";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { useRequests } from "../../lib/context/requests-context";
import { useBroadcastNotifications } from "../../lib/hooks/useBroadcastNotifications";
import { useResidentParkingAllocation } from "../../lib/hooks/useResidentParkingAllocation";
import { useResidentContract } from "../../lib/hooks/useResidentSelfService";
import { useResidentRequests } from "../../lib/hooks/useResidentRequests";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import type { ResidentMoveRequest, ResidentMoveRequestStatus } from "../../lib/types";
import { RESIDENT_HISTORY_UNAVAILABLE_MESSAGE } from "../../lib/utils/resident-history-access";
import {
  getResidentRequestOwnerRejectionReason,
  isResidentRequestOwnerApprovalPending,
  isResidentRequestOwnerRejected,
} from "../../lib/utils/resident-request-approval";
import { classifyTenantRequestByTenancyCycle } from "../../lib/utils/tenant-request-tenancy-display";
import {
  filterNotificationsByUser,
  getNotificationBody,
  getUnreadNotificationsCount,
  isNotificationUnread,
} from "../../lib/utils/helpers";

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
  secondary: "#DDE8F1",
  accent: "#F8EFE4",
  successBg: "#E4F4EA",
  successText: "#25674A",
  warningBg: "#FDF1DB",
  warningText: "#9A5B00",
  dangerBg: "#FCE3E0",
  dangerText: "#B24A41",
  infoBg: "#E7EEF9",
  infoText: "#3C5A8C",
  shadow: "rgba(43, 52, 55, 0.06)",
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
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatParkingLevel = (value?: string | null) => {
  if (!value) return "Level unavailable";
  const normalized = value.trim();
  if (!normalized) return "Level unavailable";
  return /^level\b/i.test(normalized) ? normalized : `Level ${normalized}`;
};

const formatParkingType = (value?: string | null) => {
  if (!value) return "Type unavailable";
  return value
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || "Resident";
const initials = (name?: string | null) =>
  name?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "R";

const requestStatusMeta = (request: { status?: string | null; ownerApproval?: unknown; ownerApprovalStatus?: unknown }) => {
  if (isResidentRequestOwnerRejected(request)) {
    return { label: "Owner Rejected", bg: P.dangerBg, text: P.dangerText };
  }

  const status = request.status;
  switch (status) {
    case "completed":
      return { label: "Completed", bg: P.successBg, text: P.successText };
    case "cancelled":
      return { label: "Canceled", bg: P.dangerBg, text: P.dangerText };
    case "assigned":
      return { label: "Assigned", bg: P.infoBg, text: P.infoText };
    case "in-progress":
      return { label: "In Progress", bg: P.infoBg, text: P.infoText };
    case "on-hold":
      return { label: "On Hold", bg: P.warningBg, text: P.warningText };
    default:
      return { label: "Submitted", bg: P.warningBg, text: P.warningText };
  }
};

const isActiveRequest = (request: {
  status?: string | null;
  ownerApproval?: unknown;
  ownerApprovalStatus?: unknown;
}) => {
  if (isResidentRequestOwnerRejected(request)) {
    return false;
  }

  return (
    request.status === "pending" ||
    request.status === "assigned" ||
    request.status === "in-progress" ||
    request.status === "on-hold"
  );
};

const getRequestTimestamp = (request: { createdAt?: string | null; updatedAt?: string | null }) => {
  const parsed = Date.parse(request.updatedAt || request.createdAt || "");
  return Number.isNaN(parsed) ? 0 : parsed;
};

const moveRequestStatusMeta = (status: ResidentMoveRequestStatus) => {
  switch (status) {
    case "APPROVED":
      return { label: "Approved", bg: P.successBg, text: P.successText };
    case "REJECTED":
      return { label: "Rejected", bg: P.dangerBg, text: P.dangerText };
    case "CANCELLED":
      return { label: "Cancelled", bg: P.dangerBg, text: P.dangerText };
    case "COMPLETED":
      return { label: "Completed", bg: P.infoBg, text: P.infoText };
    case "PENDING":
      return { label: "Pending", bg: P.warningBg, text: P.warningText };
    default:
      return { label: "Submitted", bg: P.warningBg, text: P.warningText };
  }
};

const getMoveRequestTimestamp = (request: ResidentMoveRequest) => {
  const parsed = Date.parse(
    request.requestedMoveAt || request.updatedAt || request.createdAt || "",
  );
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function TenantHomeScreen() {
  const { currentUser, isAuthenticated, actions: authActions } = useAuth();
  const { notifications, actions: notificationActions } = useNotifications();
  const { actions: requestActions } = useRequests();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<TenantAnnouncementPreview | null>(null);
  const [clearingAnnouncementId, setClearingAnnouncementId] = useState<string | null>(null);
  const [hasLoadedCriticalPortalData, setHasLoadedCriticalPortalData] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  const isHandlingUnauthorizedRef = useRef(false);
  const lastAutoRefreshAtRef = useRef(0);

  const handleUnauthorized = useCallback(async () => {
    if (isHandlingUnauthorizedRef.current) return;
    isHandlingUnauthorizedRef.current = true;
    try {
      await authActions.logout();
    } catch (error) {
      console.warn("[TenantHome] Failed to clear session after 401:", error);
    } finally {
      router.replace("/auth" as any);
      isHandlingUnauthorizedRef.current = false;
    }
  }, [authActions]);

  const {
    data: contractData,
    errorMessage: contractErrorMessage,
    isLoading: isContractLoading,
    moveOutHistory,
    refetch: refetchContract,
    refetchHistory,
    isRefreshing: isContractRefreshing,
  } = useResidentContract({
    enabled: Boolean(currentUser?.id && isAuthenticated),
    onUnauthorized: handleUnauthorized,
  });

  const {
    resident,
    latestContract,
    canCreateMaintenanceRequest,
    canManageVisitors,
    displayBuildingName,
    displayUnitLabel,
    errorMessage: tenancyErrorMessage,
    isFormerResident,
    isPreMoveIn,
    isLoading: isTenancyLoading,
    preMoveInActionLabel,
    preMoveInStatusMessage,
    preMoveInStatusTitle,
    statusMessage,
    statusTitle,
  } = useResidentTenancy({
    enabled: Boolean(currentUser?.id && isAuthenticated),
    latestContractData: contractData,
    onUnauthorized: handleUnauthorized,
  });

  const {
    requests: residentRequests,
    refreshRequests,
    isRefreshing: isRequestsRefreshing,
  } = useResidentRequests({
    currentUser,
    notifications,
    onUnauthorized: handleUnauthorized,
  });
  const {
    data: activeParkingAllocation,
    errorMessage: parkingErrorMessage,
    isLoading: isParkingLoading,
    refetch: refetchParkingAllocation,
  } = useResidentParkingAllocation({
    enabled: Boolean(
      currentUser?.id &&
        isAuthenticated &&
        !isTenancyLoading &&
        !isFormerResident &&
        !isPreMoveIn,
    ),
    onUnauthorized: handleUnauthorized,
  });

  const {
    notifications: broadcastNotifications,
    isLoading: isBroadcastNoticesLoading,
    isRefreshing: isBroadcastNoticesRefreshing,
    errorMessage: broadcastNoticesError,
    refetch: refetchBroadcastNotices,
  } = useBroadcastNotifications({
    enabled: Boolean(currentUser?.id && isAuthenticated),
    realtimeNotifications: notifications,
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth");
  }, [isAuthenticated]);

  useEffect(() => {
    setHasLoadedCriticalPortalData(false);
  }, [currentUser?.id]);

  useEffect(() => {
    if (
      currentUser &&
      !isTenancyLoading &&
      !isContractLoading &&
      !tenancyErrorMessage &&
      !contractErrorMessage
    ) {
      setHasLoadedCriticalPortalData(true);
    }
  }, [
    contractErrorMessage,
    currentUser,
    isContractLoading,
    isTenancyLoading,
    tenancyErrorMessage,
  ]);

  useEffect(() => {
    const contractId = contractData.contract?.id;
    if (!contractId) {
      return;
    }

    void refetchHistory(contractId).catch((error) => {
      console.warn("[TenantHome] Failed to load move request history:", error);
    });
  }, [contractData.contract?.id, refetchHistory]);

  useFocusEffect(
    useCallback(() => {
      if (!currentUser?.id || !isAuthenticated) {
        return;
      }

      const now = Date.now();
      if (now - lastAutoRefreshAtRef.current < 15_000) {
        return;
      }
      lastAutoRefreshAtRef.current = now;

      void Promise.all([
        refetchContract({ asRefresh: true, showLoading: false }),
        refreshRequests({ asRefresh: true, showLoading: false, reason: "manual" }),
        refetchBroadcastNotices({ asRefresh: true, showLoading: false }),
        !isFormerResident && !isPreMoveIn
          ? refetchParkingAllocation({ asRefresh: true, showLoading: false })
          : Promise.resolve(),
        contractData.contract?.id
          ? refetchHistory(contractData.contract.id).catch((error) => {
              console.warn("[TenantHome] Failed to refresh move request history on focus:", error);
            })
          : Promise.resolve(),
      ]).catch((error) => {
        console.warn("[TenantHome] Failed to refresh tenant home on focus:", error);
      });
    }, [
      contractData.contract?.id,
      currentUser?.id,
      isAuthenticated,
      isFormerResident,
      isPreMoveIn,
      refetchBroadcastNotices,
      refetchContract,
      refetchHistory,
      refetchParkingAllocation,
      refreshRequests,
    ]),
  );

  const handleReturnToSignIn = useCallback(async () => {
    try {
      await authActions.logout();
    } catch (error) {
      console.warn("[TenantHome] Failed to clear session after portal load failure:", error);
    } finally {
      router.replace("/auth" as any);
    }
  }, [authActions]);

  const retryCriticalPortalLoad = useCallback(() => {
    void refetchContract({ asRefresh: false, showLoading: true });
  }, [refetchContract]);

  const onRefreshHome = useCallback(async () => {
    await Promise.all([
      refreshRequests({ asRefresh: true, reason: "manual" }),
      refetchContract({ asRefresh: true, showLoading: false }),
      refetchParkingAllocation({ asRefresh: true, showLoading: false }),
      refetchBroadcastNotices({ asRefresh: true, showLoading: false }),
      contractData.contract?.id ? refetchHistory(contractData.contract.id) : Promise.resolve(),
    ]);
  }, [
    contractData.contract?.id,
    refetchParkingAllocation,
    refetchBroadcastNotices,
    refetchContract,
    refetchHistory,
    refreshRequests,
  ]);

  const isHomeRefreshing =
    isRequestsRefreshing || isContractRefreshing || isBroadcastNoticesRefreshing;

  const buildingName =
    displayBuildingName || currentUser?.profile?.buildingName || "Towerdesk Residence";
  const unitLabel =
    displayUnitLabel || currentUser?.profile?.apartment || null;
  const unitFloor =
    resident?.occupancy?.floorNumber ||
    latestContract?.contract?.unit?.floor != null
      ? String(
          resident?.occupancy?.floorNumber ??
            latestContract?.contract?.unit?.floor,
        )
      : currentUser?.profile?.floor || null;
  const unitInfo =
    unitLabel || unitFloor
      ? [
          unitLabel,
          unitFloor ? `Floor ${unitFloor}` : null,
        ]
          .filter(Boolean)
          .join(" - ")
      : "Not assigned";
  const avatarUri =
    currentUser?.profile?.avatarUrl || currentUser?.profile?.avatar || null;

  const userNotifications = useMemo(
    () => filterNotificationsByUser(notifications || [], currentUser?.id),
    [currentUser?.id, notifications],
  );
  const hasUnreadNotifications = getUnreadNotificationsCount(userNotifications) > 0;

  const activeRequests = useMemo(
    () =>
      [...residentRequests]
        .filter(
          (request) =>
            classifyTenantRequestByTenancyCycle(request) === "current" &&
            isActiveRequest(request),
        )
        .sort((a, b) => getRequestTimestamp(b) - getRequestTimestamp(a))
        .slice(0, 3),
    [residentRequests],
  );
  const latestMoveOutRequest = useMemo(
    () =>
      [...moveOutHistory]
        .sort((a, b) => getMoveRequestTimestamp(b) - getMoveRequestTimestamp(a))[0] || null,
    [moveOutHistory],
  );
  const isResidentHistoryLocked = isPreMoveIn || isFormerResident;
  const canRequestMoveIn = isPreMoveIn && Boolean(contractData.canRequestMoveIn);
  const shouldShowMoveInCTA =
    isPreMoveIn && preMoveInActionLabel === "Schedule Move-In";
  const openLeaseDetails = useCallback(
    () => router.push("/(tenant)/lease-details" as any),
    [],
  );
  const openMoveInRequest = useCallback(() => {
    router.push({
      pathname: "/(tenant)/lease-details",
      params: { openMoveModal: "move-in" },
    } as any);
  }, []);

  const activeContract = contractData.contract;
  const quickActions = useMemo(
    () =>
      isResidentHistoryLocked
        ? [
            {
              key: shouldShowMoveInCTA ? "move-in" : "lease-details",
              label:
                shouldShowMoveInCTA ? "Request Move In" : "Lease Details",
              icon:
                shouldShowMoveInCTA
                  ? "enter-outline"
                  : "document-text-outline",
              onPress:
                canRequestMoveIn ? openMoveInRequest : openLeaseDetails,
            },
            {
              key: "profile",
              label: "Profile",
              icon: "person-outline",
              onPress: () => router.push("/(tenant)/profile" as any),
            },
            {
              key: "announcements",
              label: "Announcements",
              icon: "notifications-outline",
              onPress: () => router.push("/(modals)/notifications-hub" as any),
            },
          ]
        : [
            {
              key: "main",
              label: canCreateMaintenanceRequest ? "New Request" : "Lease Details",
              icon: canCreateMaintenanceRequest ? "add-outline" : "document-text-outline",
              onPress: () =>
                router.push(
                  (canCreateMaintenanceRequest
                    ? "/(tenant)/new-request"
                    : "/(tenant)/lease-details") as any,
                ),
            },
            {
              key: "requests",
              label: isFormerResident ? "History" : "My Requests",
              icon: "receipt-outline",
              onPress: () => router.push("/(tenant)/requests" as any),
            },
            {
              key: "messages",
              label: isFormerResident ? "Message History" : "Messages",
              icon: "chatbubble-ellipses-outline",
              onPress: () => router.push("/(tenant)/messages" as any),
            },
            {
              key: canManageVisitors ? "visitors" : "profile",
              label: canManageVisitors ? "Visitors" : "Profile",
              icon: canManageVisitors ? "people-outline" : "person-outline",
              onPress: () =>
                router.push(
                  (canManageVisitors ? "/(tenant)/visitors" : "/(tenant)/profile") as any,
                ),
            },
          ],
    [
      canCreateMaintenanceRequest,
      canManageVisitors,
      canRequestMoveIn,
      isFormerResident,
      isPreMoveIn,
      preMoveInActionLabel,
      isResidentHistoryLocked,
      openLeaseDetails,
      openMoveInRequest,
      shouldShowMoveInCTA,
    ],
  );

  const handleNoticePress = useCallback(
    (notification: any) => {
      const body = getNotificationBody(notification).trim();
      const data = (notification.data ?? {}) as Record<string, any>;
      const buildingName =
        data?.buildingName ??
        data?.building_name ??
        data?.audienceLabel ??
        data?.audience_label ??
        null;

      if (isNotificationUnread(notification)) {
        notificationActions.markNotificationAsRead?.(notification.id).catch((error: unknown) => {
          console.warn("[TenantHome] Failed to mark notice as read:", error);
        });
      }

      setSelectedAnnouncement({
        id: notification.id,
        title: notification.title || "Building notice",
        body: body || "No additional details were provided for this building notice.",
        scheduledAt: notification.createdAt,
        affectedAreas: buildingName ? [String(buildingName)] : [],
      });
    },
    [notificationActions],
  );

  const handleClearAnnouncement = useCallback(
    async (announcement: TenantAnnouncementPreview) => {
      if (!announcement.id) {
        return;
      }

      try {
        setClearingAnnouncementId(announcement.id);
        await notificationActions.dismissNotification(announcement.id);
        setSelectedAnnouncement(null);
      } catch (error) {
        console.error("[TenantHome] Failed to clear announcement:", error);
      } finally {
        setClearingAnnouncementId(null);
      }
    },
    [notificationActions],
  );

  if (!currentUser || isTenancyLoading || isContractLoading) return <HomeScreenSkeleton />;

  if (!hasLoadedCriticalPortalData && (contractErrorMessage || tenancyErrorMessage)) {
    return (
      <PortalLoadErrorScreen
        portalLabel="Resident Workspace"
        message={
          contractErrorMessage ||
          tenancyErrorMessage ||
          "Unable to load your resident workspace right now."
        }
        onRetry={retryCriticalPortalLoad}
        secondaryActionLabel="Return to Sign In"
        onSecondaryAction={() => {
          void handleReturnToSignIn();
        }}
      />
    );
  }

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={isHomeRefreshing}
            onRefresh={onRefreshHome}
            tintColor={P.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(400)}>
          <HeaderBar
            showTitle={false}
            hasUnreadNotifications={hasUnreadNotifications}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            textColor={P.text}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(400)} style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {greeting()},{"\n"}
              {firstName(currentUser?.name)}
            </Text>
            <Text style={styles.heroSubtitle}>
              {isFormerResident
                ? "Your contract history and resident records stay accessible here."
                : "Access requests, messages, and building updates from one place."}
            </Text>
          </View>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <LinearGradient
              colors={[P.primary, P.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials(currentUser?.name)}</Text>
            </LinearGradient>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.profileStrip}>
          <View style={styles.profilePill}>
            <Ionicons name="business-outline" size={16} color={P.primary} />
            <Text style={styles.profilePillText} numberOfLines={1}>
              {buildingName}
            </Text>
          </View>
          <View style={styles.profilePill}>
            <Ionicons name="home-outline" size={16} color={P.primary} />
            <Text style={styles.profilePillText} numberOfLines={1}>
              {unitInfo}
            </Text>
          </View>
        </Animated.View>

        {isFormerResident || isPreMoveIn ? (
          <Animated.View entering={FadeInDown.delay(110).duration(400)} style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="information-circle-outline" size={18} color={P.warningText} />
            </View>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>
                {isPreMoveIn ? preMoveInStatusTitle : statusTitle}
              </Text>
              <Text style={styles.bannerText}>
                {isPreMoveIn ? preMoveInStatusMessage : statusMessage}
              </Text>
            </View>
          </Animated.View>
        ) : null}

        {!isResidentHistoryLocked ? (
          <Animated.View entering={FadeInDown.delay(125).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Parking Allocation</Text>
                <Text style={styles.sectionSubtitle}>
                  Your currently assigned resident parking slot
                </Text>
              </View>
            </View>

            {isParkingLoading && !activeParkingAllocation ? (
              <View style={styles.emptyCard}>
                <Ionicons name="car-outline" size={26} color={P.soft} />
                <Text style={styles.emptyTitle}>Loading parking allocation</Text>
                <Text style={styles.emptyText}>
                  Pulling your latest active slot assignment.
                </Text>
              </View>
            ) : activeParkingAllocation ? (
              <View style={styles.parkingCard}>
                <View style={styles.parkingTopRow}>
                  <View>
                    <Text style={styles.parkingEyebrow}>Assigned Slot</Text>
                    <Text style={styles.parkingCode}>
                      {activeParkingAllocation.code || "Slot unavailable"}
                    </Text>
                  </View>
                  <View style={styles.parkingIconWrap}>
                    <Ionicons name="car-sport-outline" size={20} color={P.primary} />
                  </View>
                </View>

                <View style={styles.parkingMetaRow}>
                  <View style={styles.parkingMetaPill}>
                    <Ionicons name="layers-outline" size={14} color={P.primary} />
                    <Text style={styles.parkingMetaText}>
                      {formatParkingLevel(activeParkingAllocation.level)}
                    </Text>
                  </View>
                  <View style={styles.parkingMetaPill}>
                    <Ionicons name="bookmark-outline" size={14} color={P.primary} />
                    <Text style={styles.parkingMetaText}>
                      {formatParkingType(activeParkingAllocation.type)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="car-outline" size={26} color={P.soft} />
                <Text style={styles.emptyTitle}>No active parking allocation</Text>
                <Text style={styles.emptyText}>
                  {parkingErrorMessage ||
                    "No active parking slot is assigned to this resident right now."}
                </Text>
              </View>
            )}
          </Animated.View>
        ) : null}

        {isResidentHistoryLocked ? (
          <Animated.View entering={FadeInDown.delay(140).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {isPreMoveIn ? "Before you move in" : "Resident history unavailable"}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {isPreMoveIn
                    ? "Complete move-in to unlock the full resident workspace"
                    : "Requests and messages return automatically when this account has an active occupancy again"}
                </Text>
              </View>
            </View>

            <View style={styles.preMoveInCard}>
              <View style={styles.preMoveInEyebrowRow}>
                <View style={styles.preMoveInEyebrowPill}>
                  <Ionicons name="key-outline" size={14} color={P.primary} />
                  <Text style={styles.preMoveInEyebrowText}>Move-In Access</Text>
                </View>
              </View>
              <Text style={styles.preMoveInTitle}>
                {isPreMoveIn ? preMoveInStatusTitle : statusTitle}
              </Text>
              <Text style={styles.preMoveInText}>
                {isPreMoveIn ? preMoveInStatusMessage : RESIDENT_HISTORY_UNAVAILABLE_MESSAGE}
              </Text>

              <TouchableOpacity
                style={styles.preMoveInAction}
                activeOpacity={0.9}
                onPress={canRequestMoveIn ? openMoveInRequest : openLeaseDetails}
              >
                <Text style={styles.preMoveInActionText}>
                  {isPreMoveIn
                    ? shouldShowMoveInCTA
                      ? "Request Move In"
                      : preMoveInActionLabel
                    : "Review Lease Details"}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={P.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}

        {latestMoveOutRequest ? (
          <Animated.View
            entering={FadeInDown.delay(isPreMoveIn ? 170 : 140).duration(400)}
            style={styles.section}
          >
            <TouchableOpacity
              style={styles.moveOutCard}
              activeOpacity={0.9}
              onPress={() => router.push("/(tenant)/lease-details" as any)}
            >
              <View style={styles.moveOutHeader}>
                <View style={styles.moveOutIconWrap}>
                  <Ionicons name="exit-outline" size={18} color={P.primary} />
                </View>
                <View style={styles.moveOutHeaderCopy}>
                  <Text style={styles.moveOutEyebrow}>Lease Request</Text>
                  <Text style={styles.moveOutTitle}>Move Out Request</Text>
                </View>
                <View
                  style={[
                    styles.moveOutStatusBadge,
                    {
                      backgroundColor: moveRequestStatusMeta(latestMoveOutRequest.status).bg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.moveOutStatusText,
                      { color: moveRequestStatusMeta(latestMoveOutRequest.status).text },
                    ]}
                  >
                    {moveRequestStatusMeta(latestMoveOutRequest.status).label}
                  </Text>
                </View>
              </View>

              <View style={styles.moveOutDetails}>
                <View style={styles.moveOutMetaRow}>
                  <Ionicons name="calendar-outline" size={15} color={P.soft} />
                  <Text style={styles.moveOutMetaText}>
                    {formatDateTime(
                      latestMoveOutRequest.requestedMoveAt || latestMoveOutRequest.createdAt,
                    )}
                  </Text>
                </View>
                <View style={styles.moveOutMetaRow}>
                  <Ionicons name="time-outline" size={15} color={P.soft} />
                  <Text style={styles.moveOutMetaText}>
                    {latestMoveOutRequest.reviewedAt
                      ? `Reviewed ${formatDate(latestMoveOutRequest.reviewedAt)}`
                      : "Awaiting review"}
                  </Text>
                </View>
              </View>

              <View style={styles.moveOutFooter}>
                <Text style={styles.moveOutFooterText}>
                  Open lease details for the full move-out timeline.
                </Text>
                <Ionicons name="chevron-forward" size={16} color={P.soft} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {isResidentHistoryLocked ? (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {isPreMoveIn ? "Features unlock after move-in" : "Resident tools are locked"}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {isPreMoveIn
                    ? "Requests, messages, and visitors become available once occupancy is active"
                    : "This resident workspace needs an active occupancy before history and messaging can be used"}
                </Text>
              </View>
            </View>

            <TenantLockedFeatureCard
              title={isPreMoveIn ? "Resident services are still locked" : "Resident history is unavailable"}
              message={
                isPreMoveIn
                  ? "Once your move-in is completed, you will be able to submit maintenance requests, message the building team, and manage visitor access without reopening the app."
                  : RESIDENT_HISTORY_UNAVAILABLE_MESSAGE
              }
              actionLabel={
                isPreMoveIn
                  ? shouldShowMoveInCTA
                    ? "Request Move In"
                    : preMoveInActionLabel
                  : "Review Lease Details"
              }
              onPress={canRequestMoveIn ? openMoveInRequest : openLeaseDetails}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(170).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Active Service Requests</Text>
                <Text style={styles.sectionSubtitle}>
                  Follow the latest status on your maintenance issues
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/(tenant)/requests" as any)}>
                <Text style={styles.linkText}>View all</Text>
              </TouchableOpacity>
            </View>

            {activeRequests.length > 0 ? (
              activeRequests.map((request) => {
                const status = requestStatusMeta(request);
                const ownerRejected = isResidentRequestOwnerRejected(request);
                const ownerApprovalPending = isResidentRequestOwnerApprovalPending(request);
                const ownerRejectionReason = getResidentRequestOwnerRejectionReason(request);

                return (
                  <TouchableOpacity
                    key={request.id}
                    style={styles.requestCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      requestActions.setSelectedRequest(request);
                      router.push("/(modals)/request-details" as any);
                    }}
                  >
                    <View style={styles.requestTop}>
                      <View style={styles.requestIconWrap}>
                        <Ionicons name="construct-outline" size={18} color={P.primary} />
                      </View>
                      <View style={styles.requestCopy}>
                        <Text style={styles.requestTitle} numberOfLines={1}>
                          {request.title}
                        </Text>
                        <Text style={styles.requestMeta}>
                          Updated {formatDate(request.updatedAt || request.createdAt)}
                        </Text>
                      </View>
                      <View style={[styles.requestBadge, { backgroundColor: status.bg }]}>
                        <Text style={[styles.requestBadgeText, { color: status.text }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.requestBottom}>
                      <View style={styles.requestBottomCopy}>
                        <Text style={styles.requestDescription} numberOfLines={1}>
                          {request.description ||
                            "Tap to review request details and latest updates."}
                        </Text>
                        {ownerRejected ? (
                          <Text style={styles.requestRejectionText} numberOfLines={2}>
                            {ownerRejectionReason
                              ? `Owner rejected this request: ${ownerRejectionReason}`
                              : "Owner rejected this request."}
                          </Text>
                        ) : ownerApprovalPending ? (
                          <Text style={styles.requestApprovalNoticeText} numberOfLines={2}>
                            Awaiting owner approval.
                          </Text>
                        ) : null}
                      </View>
                      {request.isEmergency ? (
                        <View style={styles.requestEmergencyBadge}>
                          <Ionicons name="warning-outline" size={12} color={P.dangerText} />
                          <Text style={styles.requestEmergencyBadgeText}>Emergency</Text>
                        </View>
                      ) : null}
                      <Ionicons name="chevron-forward" size={16} color={P.soft} />
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="clipboard-outline" size={26} color={P.soft} />
                <Text style={styles.emptyTitle}>No active requests</Text>
                <Text style={styles.emptyText}>There are no active requests right now.</Text>
              </View>
            )}
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(230).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Announcements</Text>
              <Text style={styles.sectionSubtitle}>Building-wide updates curated for residents</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(modals)/notifications-hub" as any)}>
              <Text style={styles.linkText}>Inbox</Text>
            </TouchableOpacity>
          </View>

          {broadcastNotifications.length > 0 ? (
            broadcastNotifications.slice(0, 2).map((notice) => {
              const unread = isNotificationUnread(notice);
              const body = getNotificationBody(notice).trim();

              return (
                <TouchableOpacity
                  key={notice.id}
                  style={styles.noticeCard}
                  activeOpacity={0.88}
                  onPress={() => handleNoticePress(notice)}
                >
                  <View style={styles.noticeBody}>
                    <View style={styles.noticeHeader}>
                      <View style={styles.noticeTitleRow}>
                        <View style={styles.noticeIconWrap}>
                          <Ionicons name="megaphone-outline" size={14} color={P.primary} />
                        </View>
                        <Text style={styles.noticeTitle} numberOfLines={1}>
                          {notice.title || "Building notice"}
                        </Text>
                      </View>
                      {unread ? (
                        <View style={styles.noticePill}>
                          <Text style={styles.noticePillText}>New</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.noticeDescription} numberOfLines={2}>
                      {body || "No additional details were provided for this building notice."}
                    </Text>
                    <View style={styles.noticeMeta}>
                      <Text style={styles.noticeMetaText}>{formatDate(notice.createdAt)}</Text>
                      <Ionicons name="arrow-forward" size={16} color={P.soft} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons
                name={isBroadcastNoticesLoading ? "sync-outline" : "notifications-outline"}
                size={26}
                color={P.soft}
              />
              <Text style={styles.emptyTitle}>
                {isBroadcastNoticesLoading ? "Loading announcements" : "No announcements"}
              </Text>
              <Text style={styles.emptyText}>
                {broadcastNoticesError || "Fresh building announcements will show up here."}
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <Text style={styles.sectionSubtitle}>Fast access to your most used tasks</Text>
            </View>
          </View>

          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                style={styles.quickCard}
                activeOpacity={0.88}
                onPress={action.onPress}
              >
                <View style={styles.quickIconWrap}>
                  <Ionicons name={action.icon as any} size={20} color={P.primary} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(290).duration(400)} style={styles.footerCard}>
          <View style={styles.footerIcon}>
            <Ionicons name="document-text-outline" size={18} color={P.surface} />
          </View>
          <View style={styles.footerCopy}>
            <Text style={styles.footerTitle}>Contract Snapshot</Text>
            <Text style={styles.footerText}>
              {activeContract?.endDate
                ? `Lease ends on ${formatDate(activeContract.endDate)}.`
                : "Your lease dates will appear here once contract details are available."}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(tenant)/lease-details" as any)}>
            <Text style={styles.footerLink}>Open</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
      <TenantAnnouncementModal
        announcement={selectedAnnouncement}
        visible={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        onClear={handleClearAnnouncement}
        clearing={selectedAnnouncement?.id === clearingAnnouncementId}
      />
      </SafeAreaView>
    </ScreenEntrance>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20 },
  hero: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },
  heroCopy: { flex: 1, gap: 8 },
  heroTitle: { fontSize: 31, lineHeight: 36, fontWeight: "800", color: P.text },
  heroSubtitle: { fontSize: 14, lineHeight: 22, color: P.muted, maxWidth: 280 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: P.shadow,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: P.surfaceLow,
  },
  avatarText: { color: P.surface, fontSize: 18, fontWeight: "800" },
  profileStrip: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: P.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: P.border,
  },
  profilePillText: { flexShrink: 1, fontSize: 13, fontWeight: "600", color: P.text },
  parkingCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
    gap: 16,
  },
  parkingTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  parkingEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: P.primary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  parkingCode: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: P.text,
  },
  parkingIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: P.border,
  },
  parkingMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  parkingMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: P.surfaceLow,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: P.border,
  },
  parkingMetaText: {
    fontSize: 13,
    fontWeight: "600",
    color: P.text,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: P.accent,
    borderRadius: 22,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#EFD8BB",
  },
  bannerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF8EE",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerCopy: { flex: 1, gap: 4 },
  bannerTitle: { fontSize: 15, fontWeight: "700", color: P.text },
  bannerText: { fontSize: 13, lineHeight: 20, color: P.muted },
  preMoveInCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  preMoveInEyebrowRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  preMoveInEyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: P.surfaceLow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: P.border,
  },
  preMoveInEyebrowText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.primary,
  },
  preMoveInTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: P.text,
  },
  preMoveInText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
  },
  preMoveInAction: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: P.border,
  },
  preMoveInActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: P.primary,
  },
  section: { marginBottom: 28 },
  moveOutCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  moveOutHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  moveOutIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
  },
  moveOutHeaderCopy: { flex: 1, gap: 2 },
  moveOutEyebrow: { fontSize: 11, fontWeight: "700", color: P.soft, letterSpacing: 0.4 },
  moveOutTitle: { fontSize: 16, fontWeight: "700", color: P.text },
  moveOutStatusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  moveOutStatusText: { fontSize: 11, fontWeight: "700" },
  moveOutDetails: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: P.border,
    paddingTop: 12,
  },
  moveOutMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  moveOutMetaText: { flex: 1, fontSize: 13, lineHeight: 20, color: P.muted },
  moveOutFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 14,
  },
  moveOutFooterText: { flex: 1, fontSize: 12, lineHeight: 18, color: P.soft },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 19, fontWeight: "700", color: P.text, marginBottom: 3 },
  sectionSubtitle: { fontSize: 13, lineHeight: 19, color: P.soft },
  linkText: { fontSize: 13, fontWeight: "700", color: P.primary },
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
  requestTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  requestIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
  },
  requestCopy: { flex: 1, gap: 3 },
  requestTitle: { fontSize: 15, fontWeight: "700", color: P.text },
  requestMeta: { fontSize: 12, color: P.soft },
  requestBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  requestBadgeText: { fontSize: 11, fontWeight: "700" },
  requestBottom: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: P.border,
    paddingTop: 12,
  },
  requestBottomCopy: {
    flex: 1,
    gap: 4,
  },
  requestDescription: { fontSize: 13, lineHeight: 20, color: P.muted },
  requestRejectionText: {
    fontSize: 12,
    lineHeight: 18,
    color: P.dangerText,
    fontWeight: "600",
  },
  requestApprovalNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: P.muted,
    fontWeight: "600",
  },
  requestEmergencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: P.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  requestEmergencyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: P.dangerText,
  },
  noticeCard: {
    backgroundColor: P.surface,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.shadow,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  noticeBody: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  noticeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  noticeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
  },
  noticePill: {
    borderRadius: 999,
    backgroundColor: P.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noticePillText: { color: P.primaryDark, fontSize: 10, fontWeight: "700" },
  noticeTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: P.text },
  noticeDescription: { fontSize: 12, lineHeight: 18, color: P.muted },
  noticeMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noticeMetaText: { fontSize: 12, fontWeight: "600", color: P.soft },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickCard: {
    width: "47%",
    minHeight: 108,
    justifyContent: "space-between",
    backgroundColor: P.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 15, fontWeight: "700", color: P.text },
  emptyCard: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: P.border,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: P.text },
  emptyText: { fontSize: 13, lineHeight: 20, color: P.muted, textAlign: "center" },
  footerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#253237",
    borderRadius: 24,
    padding: 18,
  },
  footerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  footerCopy: { flex: 1, gap: 4 },
  footerTitle: { fontSize: 15, fontWeight: "700", color: P.surface },
  footerText: { fontSize: 13, lineHeight: 20, color: "rgba(255,255,255,0.74)" },
  footerLink: { fontSize: 13, fontWeight: "700", color: "#D9EBF1" },
});
