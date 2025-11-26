import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnalyticsSection } from "../../components/admin/AnalyticsSection";
import { AnalyticsTile } from "../../components/admin/AnalyticsTile";
import { MiniTrendCard } from "../../components/admin/MiniTrendCard";
import { TrendDelta } from "../../components/admin/TrendDelta";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { formatDate, formatDateTime } from "../../lib/utils/helpers";

import { ADMIN_NOTIFICATION_ROUTE } from "./dashboard/_constants";
import { useDashboardData } from "./dashboard/_hooks/useDashboardData";
import { styles } from "./dashboard/_styles";
import {
  useMountLog,
  useRenderLog,
  useScreenFocusLog,
  measure,
} from "../../utils/adminProfiler";

export default function AdminDashboard() {
  // Profiler hooks - track lifecycle and performance
  useMountLog("Admin/Dashboard");
  useRenderLog("Admin/Dashboard");
  useScreenFocusLog("Admin/Dashboard");

  const {
    currentUser,
    analytics,
    managedBuildings,
    hasUnreadNotifications,
    isManagement,
    managementBaseRoute,
    actions,
  } = useDashboardData();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const reduceMotionEnabled = useReducedMotion();

  const pagePadding = Math.max(16, Math.min(32, width * 0.05));
  const isCompact = width < 768;
  const shouldAnimate = !reduceMotionEnabled && !isCompact;

  const getEnteringAnimation = useCallback(
    (delay = 0) =>
      shouldAnimate ? FadeInDown.delay(delay).duration(260) : undefined,
    [shouldAnimate],
  );

  const scrollViewStyle = useMemo(
    () => [styles.scrollView, { paddingHorizontal: pagePadding }],
    [pagePadding],
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(
    isManagement && managedBuildings.length ? managedBuildings[0].id : null,
  );

  useEffect(() => {
    if (!isManagement) {
      if (selectedBuildingId !== null) {
        setSelectedBuildingId(null);
      }
      return;
    }

    if (!managedBuildings.length) {
      if (selectedBuildingId !== null) {
        setSelectedBuildingId(null);
      }
      return;
    }

    if (
      !selectedBuildingId ||
      !managedBuildings.some((building) => building.id === selectedBuildingId)
    ) {
      setSelectedBuildingId(managedBuildings[0].id);
    }
  }, [isManagement, managedBuildings, selectedBuildingId]);

  const managementSnapshot =
    isManagement && selectedBuildingId
      ? actions.getManagementAnalytics(selectedBuildingId)
      : null;

  const managementTiles = useMemo(() => {
    return measure("Build Admin/Dashboard managementTiles", () => {
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
    });
  }, [managementSnapshot]);

  const requestsToday = managementSnapshot?.lists.requestsToday ?? [];
  const upcomingBookings = managementSnapshot?.lists.upcomingBookings ?? [];
  const visitorsToday = managementSnapshot?.lists.visitorsToday ?? [];
  const activeJobs = managementSnapshot?.lists.activeJobs ?? [];

  const performanceBanner = useMemo(() => {
    return measure("Build Admin/Dashboard performanceBanner", () => {
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
    });
  }, [analytics.completionRate]);

  const performanceBannerStyles = useMemo(
    () => ({
      container: [
        styles.banner,
        {
          backgroundColor: performanceBanner.background,
          borderColor: performanceBanner.border,
        },
      ],
      icon: [
        styles.bannerIconWrapper,
        { backgroundColor: performanceBanner.toneColor + "15" },
      ],
      headline: [
        styles.bannerHeadline,
        { color: performanceBanner.toneColor },
      ],
    }),
    [performanceBanner],
  );

  const bookingsTrend = useMemo(
    () => measure("Build Admin/Dashboard bookingsTrend", () =>
      [6, 7, 5, 9, 8, 10, analytics.bookingsToday]
    ),
    [analytics.bookingsToday],
  );

  const completionTrend = useMemo(
    () => measure("Build Admin/Dashboard completionTrend", () =>
      [65, 68, 70, 72, 74, 76, analytics.completionRate]
    ),
    [analytics.completionRate],
  );

  const occupancyTrend = useMemo(
    () => measure("Build Admin/Dashboard occupancyTrend", () =>
      [88.4, 89.3, 90.1, 90.9, 91.5, 92.0, analytics.occupancyRate]
    ),
    [analytics.occupancyRate],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

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
            Once an administrator links you to a property, you’ll see real-time
            activity here.
          </Text>
        </View>
      );
    }

    return (
      <>
        <Animated.View entering={getEnteringAnimation()} style={styles.managementIntro}>
          <Text style={styles.managementGreeting}>
            Welcome back, {currentUser?.name || "Manager"}
          </Text>
          <Text style={styles.managementSubtitle}>
            Here’s what’s happening across your building today.
          </Text>
        </Animated.View>

        {managedBuildings.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.managementChipRow}
            style={styles.managementChipScroll}
          >
            {managedBuildings.map((building) => {
              const active = building.id === selectedBuildingId;
              return (
                <TouchableOpacity
                  key={building.id}
                  onPress={() => setSelectedBuildingId(building.id)}
                  style={[
                    styles.managementChip,
                    active && styles.managementChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.managementChipText,
                      active && styles.managementChipTextActive,
                    ]}
                  >
                    {building.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <Animated.View entering={getEnteringAnimation(60)}>
          <AnalyticsSection
            title={
              managementSnapshot.building
                ? `Building Summary · ${managementSnapshot.building.name}`
                : "Building Summary"
            }
            subtitle="Live indicators for your property"
          >
            <View style={[styles.kpiGrid, styles.kpiGridCompact]}>
              {managementTiles.map((tile) => (
                <AnalyticsTile
                  key={tile.title}
                  title={tile.title}
                  value={tile.value}
                  icon={tile.icon}
                  iconColor={tile.iconColor}
                />
              ))}
            </View>
          </AnalyticsSection>
        </Animated.View>

        <Animated.View entering={getEnteringAnimation(100)}>
          <AnalyticsSection
            title="Today's Requests"
            subtitle="New tenant submissions in the last 24 hours"
          >
            {requestsToday.length > 0 ? (
              requestsToday.map((request) => (
                <View key={request.id} style={styles.listCard}>
                  <View style={styles.listCardHeader}>
                    <Text style={styles.listCardTitle}>{request.title}</Text>
                    <Text style={styles.listCardBadge}>
                      {request.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.listCardMeta}>
                    {formatDateTime(request.createdAt)} · Priority{" "}
                    {request.priority.toUpperCase()}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.listEmpty}>
                No new requests submitted today.
              </Text>
            )}
          </AnalyticsSection>
        </Animated.View>

        <Animated.View entering={getEnteringAnimation(140)}>
          <AnalyticsSection
            title="Upcoming Amenity Bookings"
            subtitle="Reservations scheduled for the next few days"
            actionSlot={
              upcomingBookings.length > 0 ? (
                <TouchableOpacity
                  onPress={() => router.push("/(tenant)/my-bookings")}
                >
                  <Text style={styles.viewAllLink}>View bookings</Text>
                </TouchableOpacity>
              ) : undefined
            }
          >
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => (
                <View key={booking.id} style={styles.listCard}>
                  <View style={styles.listCardHeader}>
                    <Text style={styles.listCardTitle}>
                      {booking.amenityName}
                    </Text>
                    <Text style={styles.listCardBadgeMuted}>
                      {booking.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.listCardMeta}>
                    {formatDate(booking.slotDate)} · {booking.slotTimeStart} -{" "}
                    {booking.slotTimeEnd}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.listEmpty}>
                No upcoming bookings scheduled.
              </Text>
            )}
          </AnalyticsSection>
        </Animated.View>

        <Animated.View entering={getEnteringAnimation(180)}>
          <AnalyticsSection
            title="Expected Visitors"
            subtitle="Who is scheduled to arrive today"
          >
            {visitorsToday.length > 0 ? (
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
        </Animated.View>

        <Animated.View entering={getEnteringAnimation(220)}>
          <AnalyticsSection
            title="Active Jobs"
            subtitle="Maintenance tasks currently in motion"
            actionSlot={
              activeJobs.length > 0 ? (
                <TouchableOpacity
                  onPress={() => router.push(`${managementBaseRoute}/jobs` as any)}
                >
                  <Text style={styles.viewAllLink}>View jobs</Text>
                </TouchableOpacity>
              ) : undefined
            }
          >
            {activeJobs.length > 0 ? (
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
        </Animated.View>
      </>
    );
  };

  const renderAdminView = () => (
    <>
      <Animated.View
        entering={getEnteringAnimation()}
        style={performanceBannerStyles.container}
      >
        <View style={performanceBannerStyles.icon}>
          <Ionicons
            name={performanceBanner.icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={performanceBanner.toneColor}
          />
        </View>
        <View style={styles.bannerCopy}>
          <Text
            style={performanceBannerStyles.headline}
          >
            {performanceBanner.headline}
          </Text>
          <Text style={styles.bannerBody}>{performanceBanner.body}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={getEnteringAnimation(80)}>
        <AnalyticsSection
          title="Performance Overview"
          subtitle="Snapshot of live KPIs across the portfolio"
          actionSlot={<TrendDelta value={3} isPositive label="vs last week" />}
        >
          <View style={[styles.kpiGrid, isCompact && styles.kpiGridCompact]}>
            <AnalyticsTile
              title="Open Jobs"
              value={analytics.openJobsCount}
              icon="construct-outline"
              iconColor="#F59E0B"
              trend={{ value: 12, isPositive: false }}
            />
            <AnalyticsTile
              title="Pending Requests"
              value={analytics.pendingRequestsCount}
              icon="clipboard-outline"
              iconColor="#EF4444"
              trend={{ value: 6, isPositive: false }}
            />
            <AnalyticsTile
              title="Completion Rate"
              value={`${analytics.completionRate}%`}
              icon="checkmark-circle-outline"
              iconColor="#10B981"
              trend={{ value: 3, isPositive: true }}
            />
          </View>

          <View style={[styles.kpiGrid, isCompact && styles.kpiGridCompact]}>
            <AnalyticsTile
              title="Revenue This Month"
              value={`AED ${analytics.revenueThisMonth.toLocaleString()}`}
              icon="cash-outline"
              iconColor="#059669"
              trend={{ value: 8, isPositive: true }}
            />
            <AnalyticsTile
              title="Average Completion Time"
              value={`${analytics.averageCompletionTime}h`}
              icon="time-outline"
              iconColor="#3B82F6"
              trend={{ value: 5, isPositive: true }}
            />
            <AnalyticsTile
              title="Occupancy"
              value={`${analytics.occupancyRate}%`}
              icon="business-outline"
              iconColor="#8B5CF6"
            />
          </View>
        </AnalyticsSection>
      </Animated.View>

      <Animated.View entering={getEnteringAnimation(120)}>
        <AnalyticsSection
          title="Activity Trends"
          subtitle="Trailing 7-day trend across key signals"
        >
          <View style={[styles.trendGrid, isCompact && styles.trendGridCompact]}>
            <MiniTrendCard
              title="Amenity Bookings"
              subtitle="Daily reservations"
              data={bookingsTrend}
              delta={{ value: 9, isPositive: true, label: "week growth" }}
              insight="Peak demand occurred yesterday. Consider extending pool hours over the weekend."
              color="#2563EB"
            />
            <MiniTrendCard
              title="Job Completion %"
              subtitle="Work orders closed"
              data={completionTrend}
              delta={{ value: 4, isPositive: true, label: "vs target" }}
              insight="Technicians cleared the HVAC backlog; completion rate is back above SLA threshold."
              color="#10B981"
            />
          </View>
          <View
            style={[
              styles.trendGrid,
              { marginTop: 16 },
              isCompact && styles.trendGridCompact,
            ]}
          >
            <MiniTrendCard
              title="Occupancy Rate"
              subtitle="Portfolio fill"
              data={occupancyTrend}
              delta={{ value: 1, isPositive: true, label: "MoM" }}
              insight="Leasing team secured two new corporate tenants keeping occupancy north of 92%."
              color="#8B5CF6"
            />
          </View>
        </AnalyticsSection>
      </Animated.View>

      <Animated.View entering={getEnteringAnimation(160)}>
        <AnalyticsSection
          title="Operational Snapshot"
          subtitle="Where to focus next"
        >
          <View
            style={[
              styles.operationsGrid,
              isCompact && styles.operationsGridCompact,
            ]}
          >
            <View style={styles.operationCard}>
              <View style={styles.operationHeader}>
                <Ionicons name="hammer-outline" size={20} color="#2563EB" />
                <Text style={styles.operationTitle}>Backlog Watch</Text>
              </View>
              <Text style={styles.operationMetric}>
                {analytics.openJobsCount} open jobs
              </Text>
              <Text style={styles.operationBody}>
                Redistribute HVAC work orders to the night shift to avoid SLA
                breaches.
              </Text>
            </View>

            <View style={styles.operationCard}>
              <View style={styles.operationHeader}>
                <Ionicons name="megaphone-outline" size={20} color="#D97706" />
                <Text style={styles.operationTitle}>Active Notices</Text>
              </View>
              <Text style={styles.operationMetric}>
                {analytics.activeMaintenanceNotices} live notices
              </Text>
              <Text style={styles.operationBody}>
                Water system maintenance goes live tomorrow; ensure lobby
                displays are updated.
              </Text>
            </View>

            <View style={styles.operationCard}>
              <View style={styles.operationHeader}>
                <Ionicons name="people-outline" size={20} color="#7C3AED" />
                <Text style={styles.operationTitle}>Tenant Health</Text>
              </View>
              <Text style={styles.operationMetric}>
                {analytics.averageRating.toFixed(1)} ★ average rating
              </Text>
              <Text style={styles.operationBody}>
                Satisfaction remains high. Encourage technicians to request
                ratings after closure.
              </Text>
            </View>
          </View>
        </AnalyticsSection>
      </Animated.View>

      <Animated.View entering={getEnteringAnimation(200)}>
        <AnalyticsSection
          title="Top Service Providers"
          subtitle="Performance over the last 30 days"
        >
          {analytics.topServiceProviders.map((provider, index) => (
            <View key={provider.id} style={styles.providerCard}>
              <View style={styles.providerLeft}>
                <View
                  style={[
                    styles.rankBadge,
                    { backgroundColor: index === 0 ? "#FACC15" : "#CBD5F5" },
                  ]}
                >
                  <Text
                    style={[
                      styles.rankText,
                      { color: index === 0 ? "#92400E" : "#1F2937" },
                    ]}
                  >
                    #{index + 1}
                  </Text>
                </View>
                <View style={styles.providerDetails}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerMeta}>
                    {provider.jobsCompleted} jobs ·{" "}
                    {provider.averageRating.toFixed(1)} ★ rating
                  </Text>
                </View>
              </View>
              <TrendDelta
                value={provider.averageRating >= 4.5 ? 2 : 1}
                isPositive
                label="CSAT"
              />
            </View>
          ))}
        </AnalyticsSection>
      </Animated.View>

      <Animated.View entering={getEnteringAnimation(240)}>
        <AnalyticsSection title="Recent Activity Timeline">
          <View style={styles.timeline}>
            {analytics.recentActivity.slice(0, 6).map((activity, index) => {
              const color = getTimelineColor(activity.type);
              const icon = getTimelineIcon(activity.type);
              return (
                <View key={activity.id} style={styles.timelineRow}>
                  <View style={styles.timelineIndicator}>
                    <View
                      style={[styles.timelineDot, { borderColor: color }]}
                    >
                      <Ionicons name={icon} size={14} color={color} />
                    </View>
                    {index < analytics.recentActivity.length - 1 ? (
                      <View
                        style={[
                          styles.timelineLine,
                          { backgroundColor: color + "40" },
                        ]}
                      />
                    ) : null}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>
                      {activity.description}
                    </Text>
                    <Text style={styles.timelineTimestamp}>
                      {formatDateTime(activity.timestamp)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </AnalyticsSection>
      </Animated.View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={scrollViewStyle}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title={
            isManagement ? "Building Operations" : " Admin Control Center"
          }
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        {isManagement ? renderManagementView() : renderAdminView()}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />
    </SafeAreaView>
  );
}

const getTimelineColor = (
  type:
    | "job"
    | "request"
    | "booking"
    | "notice"
    | "job_completed"
    | "new_request"
    | "new_tenant",
) => {
  switch (type) {
    case "job_completed":
    case "job":
      return "#10B981";
    case "new_request":
    case "request":
      return "#2563EB";
    case "booking":
      return "#8B5CF6";
    case "notice":
      return "#F59E0B";
    case "new_tenant":
      return "#0EA5E9";
    default:
      return "#6B7280";
  }
};

const getTimelineIcon = (
  type:
    | "job"
    | "request"
    | "booking"
    | "notice"
    | "job_completed"
    | "new_request"
    | "new_tenant",
): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case "job_completed":
    case "job":
      return "construct-outline";
    case "new_request":
    case "request":
      return "clipboard-outline";
    case "booking":
      return "calendar-outline";
    case "notice":
      return "alert-circle-outline";
    case "new_tenant":
      return "person-add-outline";
    default:
      return "time-outline";
  }
};
