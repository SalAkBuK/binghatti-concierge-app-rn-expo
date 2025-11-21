import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnalyticsSection } from "../../components/admin/AnalyticsSection";
import { ManagementTile } from "../../components/management/ManagementTile";
import { MiniTrendCard } from "../../components/admin/MiniTrendCard";
import { TrendDelta } from "../../components/admin/TrendDelta";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { NotificationType } from "../../lib/types";
import {
  filterNotificationsByUser,
  formatDate,
  formatDateTime,
} from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

const BROADCAST_TYPES: {
  label: string;
  value: NotificationType;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  description: string;
}[] = [
  {
    label: "Info",
    value: "info",
    icon: "information-circle",
    description: "General updates and reminders",
  },
  {
    label: "Success",
    value: "success",
    icon: "checkmark-circle",
    description: "Positive news or confirmations",
  },
  {
    label: "Warning",
    value: "warning",
    icon: "alert-circle",
    description: "Cautionary notices requiring attention",
  },
  {
    label: "Alert",
    value: "error",
    icon: "warning",
    description: "Critical incidents or outages",
  },
];

const BROADCAST_TYPE_VISUALS: Record<
  NotificationType,
  { background: string; border: string; text: string }
> = {
  info: {
    background: "#DBEAFE",
    border: "#BFDBFE",
    text: "#1D4ED8",
  },
  success: {
    background: "#DCFCE7",
    border: "#BBF7D0",
    text: "#15803D",
  },
  warning: {
    background: "#FEF3C7",
    border: "#FDE68A",
    text: "#B45309",
  },
  error: {
    background: "#FEE2E2",
    border: "#FCA5A5",
    text: "#B91C1C",
  },
};

export default function ManagementDashboard() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] =
    useState<NotificationType>("info");
  const [isSending, setIsSending] = useState(false);

  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isLargeDesktop = width >= 1280;

  const pagePadding = isLargeDesktop ? 48 : isDesktop ? 40 : isTablet ? 28 : 20;
  const sectionSpacing = isDesktop ? 28 : isTablet ? 22 : 16;

  const analytics = useMemo(() => actions.getAnalytics(), [actions]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Memoize managed buildings - compute once on mount
  const managedBuildings = useMemo(
    () => actions.getManagedBuildings?.() ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Lazy initialization - only runs once on mount
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(() => {
    const buildings = actions.getManagedBuildings?.() ?? [];
    return buildings.length > 0 ? buildings[0].id : null;
  });

  // Lazy initialization for broadcast scope
  const [broadcastScope, setBroadcastScope] = useState<string[]>(() => {
    const buildings = actions.getManagedBuildings?.() ?? [];
    const firstId = buildings.length > 0 ? buildings[0].id : null;
    return firstId ? [firstId] : [];
  });

  const allManagedBuildingIds = useMemo(
    () => managedBuildings.map((building) => building.id),
    [managedBuildings],
  );

  // Sync state only when building count changes (not on every render)
  useEffect(() => {
    if (managedBuildings.length === 0) {
      setSelectedBuildingId((prev) => (prev !== null ? null : prev));
      setBroadcastScope((prev) => (prev.length > 0 ? [] : prev));
      return;
    }

    setSelectedBuildingId((prev) => {
      if (!prev || !managedBuildings.some((b) => b.id === prev)) {
        return managedBuildings[0].id;
      }
      return prev;
    });

    setBroadcastScope((prev) => {
      const valid = prev.filter((id) =>
        managedBuildings.some((b) => b.id === id),
      );
      if (valid.length > 0) {
        // Only return new array if content actually changed
        if (valid.length === prev.length && valid.every((id, i) => id === prev[i])) {
          return prev;
        }
        return valid;
      }
      const fallbackId = managedBuildings[0]?.id;
      return fallbackId ? [fallbackId] : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedBuildings.length]);

  const managementSnapshot = selectedBuildingId
    ? actions.getManagementAnalytics(selectedBuildingId)
    : null;

  const managementTiles = useMemo(() => {
    if (!managementSnapshot) return [];
    const openRequests =
      (managementSnapshot.metrics.pendingRequests || 0) +
      (managementSnapshot.metrics.inProgressRequests || 0);

    return [
      {
        title: "Open Requests",
        value: openRequests,
        icon: "clipboard-outline" as const,
        iconColor: "#F97316",
      },
      {
        title: "Jobs In Progress",
        value: managementSnapshot.metrics.jobsInProgress,
        icon: "construct-outline" as const,
        iconColor: "#2563EB",
      },
      {
        title: "Bookings Today",
        value: managementSnapshot.metrics.bookingsToday,
        icon: "calendar-outline" as const,
        iconColor: "#10B981",
      },
      {
        title: "Visitors Today",
        value: managementSnapshot.metrics.visitorsToday,
        icon: "people-outline" as const,
        iconColor: "#8B5CF6",
      },
      {
        title: "Completion Rate",
        value: `${managementSnapshot.metrics.completionRate}%`,
        icon: "speedometer-outline" as const,
        iconColor: "#0EA5E9",
      },
      {
        title: "Occupancy",
        value: `${managementSnapshot.metrics.occupancyRate}%`,
        icon: "business-outline" as const,
        iconColor: "#7C3AED",
      },
    ];
  }, [managementSnapshot]);

  const broadcastSelectedBuildings = useMemo(
    () =>
      managedBuildings.filter((building) =>
        broadcastScope.includes(building.id),
      ),
    [broadcastScope, managedBuildings],
  );

  const broadcastAudienceLabel = useMemo(() => {
    if (!broadcastSelectedBuildings.length) {
      return "no buildings selected";
    }
    if (broadcastSelectedBuildings.length === managedBuildings.length) {
      return "all managed buildings";
    }
    return broadcastSelectedBuildings.map((building) => building.name).join(", ");
  }, [broadcastSelectedBuildings, managedBuildings.length]);

  const isBroadcastAudienceEmpty = broadcastScope.length === 0;
  const isAllBroadcastSelected =
    broadcastScope.length > 0 &&
    broadcastScope.length === allManagedBuildingIds.length;

  const broadcastVisual = BROADCAST_TYPE_VISUALS[broadcastType];
  const broadcastTypeIcon =
    BROADCAST_TYPES.find((option) => option.value === broadcastType)?.icon ||
    "information-circle";
  const broadcastPreviewTitle =
    broadcastTitle.trim() || "Notification title";
  const broadcastPreviewMessage =
    broadcastMessage.trim() || "Message preview will appear here.";
  const isBroadcastActionDisabled =
    !broadcastTitle.trim() ||
    !broadcastMessage.trim() ||
    isBroadcastAudienceEmpty ||
    isSending;

  const requestsToday = managementSnapshot?.lists.requestsToday ?? [];
  const upcomingBookings = managementSnapshot?.lists.upcomingBookings ?? [];
  const visitorsToday = managementSnapshot?.lists.visitorsToday ?? [];
  const activeJobs = managementSnapshot?.lists.activeJobs ?? [];

  const performanceBanner = useMemo((): {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    toneColor: string;
    background: string;
    border: string;
    headline: string;
    body: string;
  } => {
    if (analytics.completionRate >= 85) {
      return {
        icon: "shield-checkmark",
        toneColor: "#047857",
        background: "#ECFDF5",
        border: "#A7F3D0",
        headline: "Operations are healthy",
        body: "Job completion is trending upward and response times remain within SLA.",
      };
    }

    if (analytics.completionRate >= 70) {
      return {
        icon: "alert-circle",
        toneColor: "#F59E0B",
        background: "#FFFBEB",
        border: "#FDE68A",
        headline: "Keep an eye on completion rate",
        body: "Response times are slowing slightly. Consider redistributing work orders.",
      };
    }

    return {
      icon: "warning",
      toneColor: "#DC2626",
      background: "#FEF2F2",
      border: "#FECACA",
      headline: "Action required",
      body: "Completion rate dipped below target. Investigate overdue jobs immediately.",
    };
  }, [analytics.completionRate]);

  const bookingsTrend = useMemo(
    () => [6, 7, 5, 9, 8, 10, analytics.bookingsToday],
    [analytics.bookingsToday],
  );

  const completionTrend = useMemo(
    () => [65, 68, 70, 72, 74, 76, analytics.completionRate],
    [analytics.completionRate],
  );

  const occupancyTrend = useMemo(
    () => [88.4, 89.3, 90.1, 90.9, 91.5, 92.0, analytics.occupancyRate],
    [analytics.occupancyRate],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleBroadcastBuilding = (buildingId: string) => {
    setBroadcastScope((prev) => {
      if (prev.includes(buildingId)) {
        return prev.filter((id) => id !== buildingId);
      }
      return [...prev, buildingId];
    });
  };

  const toggleSelectAllBroadcast = () => {
    setBroadcastScope((prev) =>
      prev.length === allManagedBuildingIds.length
        ? []
        : [...allManagedBuildingIds],
    );
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert("Validation Error", "Please enter both title and message");
      return;
    }

    if (isBroadcastAudienceEmpty) {
      Alert.alert(
        "Select audience",
        "Choose at least one building for this announcement.",
      );
      return;
    }

    setIsSending(true);
    try {
      const audienceNames = broadcastSelectedBuildings.map(
        (building) => building.name,
      );
      const audienceTag =
        audienceNames.length === managedBuildings.length
          ? "All Managed Buildings"
          : audienceNames.join(", ");
      const finalMessage = audienceNames.length
        ? `[${audienceTag}] ${broadcastMessage.trim()}`
        : broadcastMessage.trim();

      await actions.broadcastNotificationToRole?.(
        "tenant",
        broadcastTitle.trim(),
        finalMessage,
        broadcastType,
      );

      Alert.alert(
        "Success",
        audienceNames.length
          ? `Notification queued for tenants in ${audienceTag}.`
          : "Notification queued for tenants.",
      );
      setBroadcastTitle("");
      setBroadcastMessage("");
      setShowBroadcastModal(false);
    } catch (error) {
      Alert.alert(
        "Failed",
        error instanceof Error ? error.message : "Unable to send broadcast",
      );
    } finally {
      setIsSending(false);
    }
  };

  const renderManagementView = () => {
    if (!managementSnapshot) {
      return (
        <View style={styles.managementEmptyState}>
          <Ionicons
            name="business"
            size={48}
            color="#CBD5F5"
            style={styles.managementEmptyIcon}
          />
          <Text style={styles.managementEmptyTitle}>No buildings assigned</Text>
          <Text style={styles.managementEmptyText}>
            Once a system administrator links you to a property, you’ll see real-time
            analytics for that building here.
          </Text>
        </View>
      );
    }

    const building = managementSnapshot.building;

    const buildingStatusStyles = (() => {
      if (!building) {
        return { backgroundColor: "#E5E7EB", textColor: "#374151" };
      }
      switch (building.status) {
        case "active":
          return { backgroundColor: "#DCFCE7", textColor: "#166534" };
        case "maintenance":
          return { backgroundColor: "#FEF3C7", textColor: "#92400E" };
        case "inactive":
          return { backgroundColor: "#E5E7EB", textColor: "#1F2937" };
        default:
          return { backgroundColor: "#E5E7EB", textColor: "#374151" };
      }
    })();

    return (
      <>
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.banner,
            {
              backgroundColor: performanceBanner.background,
              borderColor: performanceBanner.border,
            },
          ]}
        >
          <Ionicons
            name={performanceBanner.icon}
            size={24}
            color={performanceBanner.toneColor}
            style={styles.bannerIcon}
          />
          <View style={styles.bannerContent}>
            <Text style={styles.bannerHeadline}>{performanceBanner.headline}</Text>
            <Text style={styles.bannerBody}>{performanceBanner.body}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(320)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.buildingTabsContent}
            style={styles.buildingTabs}
          >
            {managedBuildings.map((buildingOption) => (
              <TouchableOpacity
                key={buildingOption.id}
                style={[
                  styles.buildingTab,
                  selectedBuildingId === buildingOption.id &&
                    styles.buildingTabActive,
                ]}
                onPress={() => setSelectedBuildingId(buildingOption.id)}
              >
                <Text
                  style={[
                    styles.buildingTabLabel,
                    selectedBuildingId === buildingOption.id &&
                      styles.buildingTabLabelActive,
                  ]}
                >
                  {buildingOption.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(320)}
          style={[
            styles.summaryGrid,
            isDesktop ? styles.summaryGridWide : styles.summaryGridStacked,
            { gap: sectionSpacing },
          ]}
        >
          <View
            style={[
              styles.summaryCard,
              !isDesktop && styles.summaryCardFull,
            ]}
          >
            <Text style={styles.summaryTitle}>
              {building ? building.name : "Portfolio overview"}
            </Text>
            {building ? (
              <>
                <Text style={styles.summarySubtitle}>{building.address}</Text>
                <View
                  style={[
                    styles.summaryStatusChip,
                    { backgroundColor: buildingStatusStyles.backgroundColor },
                  ]}
                >
                  <Ionicons
                    name="ellipse"
                    size={8}
                    color={buildingStatusStyles.textColor}
                  />
                  <Text
                    style={[
                      styles.summaryStatusText,
                      { color: buildingStatusStyles.textColor },
                    ]}
                  >
                    {building.status.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.summaryMetaRow}>
                  <View style={styles.summaryPill}>
                    <Ionicons name="home-outline" size={14} color="#2563EB" />
                    <Text style={styles.summaryPillText}>
                      {building.occupiedUnits}/{building.totalUnits} units occupied
                    </Text>
                  </View>
                  <View style={styles.summaryPill}>
                    <Ionicons name="construct-outline" size={14} color="#2563EB" />
                    <Text style={styles.summaryPillText}>
                      {managementSnapshot.metrics.openJobsCount} open jobs
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.summaryPlaceholder}>
                Select a building to view property-level insights.
              </Text>
            )}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(160).duration(320)}
          style={[
            styles.tileGrid,
            {
              gap: isDesktop ? 12 : isTablet ? 10 : 8,
            },
          ]}
        >
          {managementTiles.map((tile) => (
            <View
              key={tile.title}
              style={[
                styles.tileWrapper,
                isDesktop
                  ? styles.tileWrapperDesktop
                  : isTablet
                    ? styles.tileWrapperTablet
                    : styles.tileWrapperMobile,
              ]}
            >
              <ManagementTile
                title={tile.title}
                value={tile.value}
                icon={tile.icon}
                iconColor={tile.iconColor}
              />
            </View>
          ))}
        </Animated.View>

        {/* Broadcast Notification Button */}
        <Animated.View entering={FadeInDown.delay(180).duration(320)}>
          <TouchableOpacity
            style={styles.broadcastButton}
            onPress={() => setShowBroadcastModal(true)}
          >
            <Ionicons name="megaphone" size={20} color="#FFFFFF" />
            <Text style={styles.broadcastButtonText}>Broadcast to Tenants</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(320)}>
          <AnalyticsSection
            title="Performance Trends"
            subtitle={
              building ? `Building Summary · ${building.name}` : "Building Summary"
            }
          >
            <View
              style={[
                styles.trendsRow,
                {
                  gap: isDesktop ? 20 : isTablet ? 16 : 12,
                },
              ]}
            >
              <View
                style={[
                  styles.trendCard,
                  !isTablet && styles.trendCardFull,
                ]}
              >
                <MiniTrendCard
                  title="Bookings"
                  subtitle={`${analytics.bookingsToday} today`}
                  data={bookingsTrend}
                  delta={{ value: 3.4, isPositive: true, label: "vs. last week" }}
                />
              </View>
              <View
                style={[
                  styles.trendCard,
                  !isTablet && styles.trendCardFull,
                ]}
              >
                <MiniTrendCard
                  title="Completion Rate"
                  subtitle={`${analytics.completionRate}%`}
                  data={completionTrend}
                  delta={{ value: 1.2, isPositive: false, label: "change" }}
                />
              </View>
              <View
                style={[
                  styles.trendCard,
                  !isTablet && styles.trendCardFull,
                ]}
              >
                <MiniTrendCard
                  title="Occupancy"
                  subtitle={`${analytics.occupancyRate}%`}
                  data={occupancyTrend}
                  delta={{ value: 0.6, isPositive: true, label: "trend" }}
                />
              </View>
            </View>
          </AnalyticsSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(320)}>
          <View
            style={[
              styles.sectionRow,
              { gap: sectionSpacing },
              !isDesktop && styles.sectionColumn,
            ]}
          >
            <View
              style={[
                styles.sectionCardWrapper,
                !isDesktop && styles.sectionCardWrapperFull,
              ]}
            >
              <AnalyticsSection
                title="Today’s Requests"
                subtitle="New and active maintenance requests"
                actionSlot={
                  requestsToday.length ? (
                    <TouchableOpacity
                      onPress={() => router.push("/(management)/requests")}
                    >
                      <Text style={styles.viewAllLink}>View requests</Text>
                    </TouchableOpacity>
                  ) : undefined
                }
              >
                {requestsToday.length ? (
                  requestsToday.map((request) => (
                    <View key={request.id} style={styles.listCard}>
                      <View style={styles.listCardHeader}>
                        <Text style={styles.listCardTitle}>{request.title}</Text>
                        <Text style={styles.listCardBadge}>
                          {request.status.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.listCardMeta}>
                        {formatDateTime(request.createdAt)} ·{" "}
                        {request.apartment || "Unit"}
                      </Text>
                      {request.description ? (
                        <Text style={styles.listCardDescription} numberOfLines={2}>
                          {request.description}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.listEmpty}>
                    No new requests filed for the managed buildings today.
                  </Text>
                )}
              </AnalyticsSection>
            </View>

            <View
              style={[
                styles.sectionCardWrapper,
                !isDesktop && styles.sectionCardWrapperFull,
              ]}
            >
              <AnalyticsSection
                title="Upcoming Bookings"
                subtitle="Amenity reservations scheduled by residents"
              >
                {upcomingBookings.length ? (
                  upcomingBookings.map((booking) => (
                    <View key={booking.id} style={styles.listCard}>
                      <View style={styles.listCardHeader}>
                        <Text style={styles.listCardTitle}>
                          {booking.amenityName}
                        </Text>
                        <TrendDelta value={6.4} isPositive label="vs. avg" />
                      </View>
                      <Text style={styles.listCardMeta}>
                        {formatDate(booking.slotDate)} · {booking.slotTimeStart} –
                        {booking.slotTimeEnd}
                      </Text>
                      <Text style={styles.listCardDescription}>
                        {booking.tenantName ?? "Resident"} • Unit{" "}
                        {booking.unitNumber ?? "N/A"}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.listEmpty}>
                    No upcoming amenity bookings for the selected building.
                  </Text>
                )}
              </AnalyticsSection>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).duration(320)}>
          <View
            style={[
              styles.sectionRow,
              { gap: sectionSpacing },
              !isDesktop && styles.sectionColumn,
            ]}
          >
            <View
              style={[
                styles.sectionCardWrapper,
                !isDesktop && styles.sectionCardWrapperFull,
              ]}
            >
              <AnalyticsSection
                title="Expected Visitors"
                subtitle="Scheduled arrivals for today"
              >
                {visitorsToday.length ? (
                  visitorsToday.map((visitor) => (
                    <View key={visitor.id} style={styles.listCard}>
                      <View style={styles.listCardHeader}>
                        <Text style={styles.listCardTitle}>
                          {visitor.visitorName}
                        </Text>
                        <Text style={styles.listCardBadgeMuted}>
                          {visitor.status.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.listCardMeta}>
                        {formatDateTime(visitor.expectedArrivalTime)} ·{" "}
                        {visitor.visitPurpose}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.listEmpty}>
                    No visitors expected for the remainder of the day.
                  </Text>
                )}
              </AnalyticsSection>
            </View>

            <View
              style={[
                styles.sectionCardWrapper,
                !isDesktop && styles.sectionCardWrapperFull,
              ]}
            >
              <AnalyticsSection
                title="Active Jobs"
                subtitle="Service orders currently in progress"
                actionSlot={
                  activeJobs.length ? (
                    <TouchableOpacity
                      onPress={() => router.push("/(management)/jobs")}
                    >
                      <Text style={styles.viewAllLink}>View jobs</Text>
                    </TouchableOpacity>
                  ) : undefined
                }
              >
                {activeJobs.length ? (
                  activeJobs.map((job) => (
                    <View key={job.id} style={styles.listCard}>
                      <View style={styles.listCardHeader}>
                        <Text style={styles.listCardTitle}>{job.title}</Text>
                        <Text style={styles.listCardBadge}>
                          {job.status.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.listCardMeta}>
                        {job.unitNumber ? `Unit ${job.unitNumber} · ` : ""}
                        Assigned to {job.assignedToName || "TBD"}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.listEmpty}>
                    No active jobs require attention.
                  </Text>
                )}
              </AnalyticsSection>
            </View>
          </View>
        </Animated.View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Building Operations"
          subtitle="Monitor health across your managed portfolio"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        <View style={[styles.contentWrapper, { gap: sectionSpacing }]}>
          {renderManagementView()}
        </View>
      </ScrollView>

      {/* Broadcast Notification Modal */}
      <Modal
        visible={showBroadcastModal}
        animationType="slide"
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <SafeAreaView style={styles.broadcastModalContainer}>
          <View style={styles.broadcastModalHeader}>
            <TouchableOpacity onPress={() => setShowBroadcastModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.broadcastModalTitle}>Broadcast Notification</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.broadcastModalContent}>
            <Text style={styles.broadcastModalSubtitle}>
              {broadcastSelectedBuildings.length
                ? `Notifying tenants in ${broadcastAudienceLabel}.`
                : "Select one or more buildings to target your message."}
            </Text>

            {managedBuildings.length ? (
              <View style={styles.broadcastAudienceSection}>
                <Text style={styles.broadcastLabel}>Audience</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.broadcastChipsRow}
                >
                  {managedBuildings.map((building) => {
                    const isSelected = broadcastScope.includes(building.id);
                    return (
                      <TouchableOpacity
                        key={building.id}
                        style={[
                          styles.broadcastAudienceChip,
                          isSelected && styles.broadcastAudienceChipActive,
                        ]}
                        onPress={() => toggleBroadcastBuilding(building.id)}
                      >
                        <Text
                          style={[
                            styles.broadcastAudienceChipText,
                            isSelected && styles.broadcastAudienceChipTextActive,
                          ]}
                        >
                          {building.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  {managedBuildings.length > 1 && (
                    <TouchableOpacity
                      style={[
                        styles.broadcastAudienceChip,
                        isAllBroadcastSelected &&
                          styles.broadcastAudienceChipActive,
                      ]}
                      onPress={toggleSelectAllBroadcast}
                    >
                      <Text
                        style={[
                          styles.broadcastAudienceChipText,
                          isAllBroadcastSelected &&
                            styles.broadcastAudienceChipTextActive,
                        ]}
                      >
                        {isAllBroadcastSelected ? "Clear all" : "Select all"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>
            ) : (
              <Text style={styles.broadcastEmptyStateText}>
                No buildings assigned to your profile yet.
              </Text>
            )}

            <View style={styles.broadcastTypeSection}>
              <Text style={styles.broadcastLabel}>Notification Type</Text>
              <View style={styles.broadcastTypeRow}>
                {BROADCAST_TYPES.map((option) => {
                  const isActive = option.value === broadcastType;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.broadcastTypeOption,
                        isActive && styles.broadcastTypeOptionActive,
                      ]}
                      onPress={() => setBroadcastType(option.value)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={isActive ? "#FFFFFF" : "#2563EB"}
                      />
                      <View style={styles.broadcastTypeTextWrapper}>
                        <Text
                          style={[
                            styles.broadcastTypeTitle,
                            isActive && styles.broadcastTypeTitleActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.broadcastTypeDescription,
                            isActive && styles.broadcastTypeDescriptionActive,
                          ]}
                          numberOfLines={2}
                        >
                          {option.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View
              style={[
                styles.broadcastPreview,
                {
                  backgroundColor: broadcastVisual.background,
                  borderColor: broadcastVisual.border,
                },
              ]}
            >
              <Ionicons
                name={broadcastTypeIcon}
                size={24}
                color={broadcastVisual.text}
              />
              <View style={styles.broadcastPreviewTextWrapper}>
                <Text
                  style={[
                    styles.broadcastPreviewTitle,
                    { color: broadcastVisual.text },
                  ]}
                >
                  {broadcastPreviewTitle}
                </Text>
                <Text
                  style={[
                    styles.broadcastPreviewBody,
                    { color: broadcastVisual.text },
                  ]}
                >
                  {broadcastPreviewMessage}
                </Text>
                <Text
                  style={[
                    styles.broadcastPreviewAudience,
                    { color: broadcastVisual.text },
                  ]}
                >
                  {broadcastSelectedBuildings.length
                    ? `Audience: ${broadcastAudienceLabel}`
                    : "Audience pending selection"}
                </Text>
              </View>
            </View>

            <View style={styles.broadcastInputGroup}>
              <Text style={styles.broadcastLabel}>Title</Text>
              <TextInput
                style={styles.broadcastInput}
                placeholder="Enter notification title..."
                value={broadcastTitle}
                onChangeText={setBroadcastTitle}
                maxLength={100}
              />
            </View>

            <View style={styles.broadcastInputGroup}>
              <Text style={styles.broadcastLabel}>Message</Text>
              <TextInput
                style={[styles.broadcastInput, styles.broadcastTextArea]}
                placeholder="Enter notification message..."
                value={broadcastMessage}
                onChangeText={setBroadcastMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.broadcastCharCount}>
                {broadcastMessage.length}/500 characters
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.broadcastSendButton,
                isBroadcastActionDisabled && styles.broadcastSendButtonDisabled,
              ]}
              onPress={handleBroadcast}
              disabled={isBroadcastActionDisabled}
            >
              {isSending ? (
                <Text style={styles.broadcastSendButtonText}>Sending...</Text>
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.broadcastSendButtonText}>Send Broadcast</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingBottom: 56,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    gap: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  bannerIcon: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  bannerContent: {
    flex: 1,
    gap: 6,
  },
  bannerHeadline: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  bannerBody: {
    fontSize: 14,
    color: "#475569",
  },
  buildingTabs: {
    marginTop: 20,
    marginBottom: 8,
  },
  buildingTabsContent: {
    gap: 12,
    paddingVertical: 4,
  },
  buildingTab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "transparent",
  },
  buildingTabActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  buildingTabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  buildingTabLabelActive: {
    color: "#FFFFFF",
  },
  summaryGrid: {
    alignItems: "stretch",
  },
  summaryGridWide: {
    flexDirection: "row",
  },
  summaryGridStacked: {
    flexDirection: "column",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 4,
    flex: 1,
    minWidth: 280,
  },
  summaryCardFull: {
    width: "100%",
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  summarySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
  },
  summaryStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 16,
  },
  summaryStatusText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  summaryMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  summaryPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1D4ED8",
  },
  summaryPlaceholder: {
    marginTop: 18,
    fontSize: 13,
    color: "#6B7280",
  },
  summaryStatsGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryStat: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minWidth: 150,
    flexGrow: 1,
    marginBottom: 12,
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryStatLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tileWrapper: {
    marginBottom: 12,
  },
  tileWrapperDesktop: {
    width: "49%",
  },
  tileWrapperTablet: {
    width: "49%",
  },
  tileWrapperMobile: {
    width: "48%",
  },
  trendsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  trendCard: {
    flexGrow: 1,
    minWidth: 220,
    marginBottom: 16,
  },
  trendCardFull: {
    width: "100%",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  sectionColumn: {
    flexDirection: "column",
  },
  sectionCardWrapper: {
    flex: 1,
  },
  sectionCardWrapperFull: {
    width: "100%",
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    marginBottom: 12,
  },
  listCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 12,
  },
  listCardBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  listCardBadgeMuted: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  listCardMeta: {
    fontSize: 13,
    color: "#4B5563",
  },
  listCardDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
  listEmpty: {
    fontSize: 13,
    color: "#6B7280",
    paddingVertical: 12,
    textAlign: "center",
  },
  managementEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  managementEmptyIcon: {
    marginBottom: 16,
  },
  managementEmptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  managementEmptyText: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
  },
  broadcastButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  broadcastButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  broadcastModalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  broadcastModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  broadcastModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  broadcastModalContent: {
    flex: 1,
    padding: 20,
  },
  broadcastModalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  broadcastAudienceSection: {
    marginBottom: 24,
    gap: 12,
  },
  broadcastChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  broadcastAudienceChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    backgroundColor: "#F8FAFC",
  },
  broadcastAudienceChipActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  broadcastAudienceChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  broadcastAudienceChipTextActive: {
    color: "#FFFFFF",
  },
  broadcastEmptyStateText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 16,
  },
  broadcastTypeSection: {
    marginBottom: 24,
    gap: 12,
  },
  broadcastTypeRow: {
    flexDirection: "column",
    gap: 12,
  },
  broadcastTypeOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#EFF6FF",
  },
  broadcastTypeOptionActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  broadcastTypeTextWrapper: {
    flex: 1,
    gap: 4,
  },
  broadcastTypeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  broadcastTypeTitleActive: {
    color: "#FFFFFF",
  },
  broadcastTypeDescription: {
    fontSize: 12,
    color: "#1E3A8A",
  },
  broadcastTypeDescriptionActive: {
    color: "#E0E7FF",
  },
  broadcastPreview: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  broadcastPreviewTextWrapper: {
    flex: 1,
    gap: 4,
  },
  broadcastPreviewTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  broadcastPreviewBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  broadcastPreviewAudience: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  broadcastInputGroup: {
    marginBottom: 20,
  },
  broadcastLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  broadcastInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  broadcastTextArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  broadcastCharCount: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "right",
  },
  broadcastSendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 12,
  },
  broadcastSendButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  broadcastSendButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
