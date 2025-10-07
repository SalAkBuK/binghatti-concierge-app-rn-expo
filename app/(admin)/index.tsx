import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { AnalyticsSection } from "../../components/admin/AnalyticsSection";
import { AnalyticsTile } from "../../components/admin/AnalyticsTile";
import { MiniTrendCard } from "../../components/admin/MiniTrendCard";
import { TrendDelta } from "../../components/admin/TrendDelta";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import {
  filterNotificationsByUser,
  formatDate,
  formatDateTime,
} from "../../lib/utils/helpers";

const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function AdminDashboard() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pagePadding = Math.max(16, Math.min(32, width * 0.05));
  const isCompact = width < 768;
  const isManagement = currentUser?.role === "management";

  const analytics = actions.getAnalytics();

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const managedBuildings = isManagement
    ? actions.getManagedBuildings?.() ?? []
    : [];
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

  const requestsToday = managementSnapshot?.lists.requestsToday ?? [];
  const upcomingBookings = managementSnapshot?.lists.upcomingBookings ?? [];
  const visitorsToday = managementSnapshot?.lists.visitorsToday ?? [];
  const activeJobs = managementSnapshot?.lists.activeJobs ?? [];

  const performanceBanner = useMemo(() => {
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
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.managementIntro}
        >
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

        <Animated.View entering={FadeInDown.delay(60).duration(300)}>
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

        <Animated.View entering={FadeInDown.delay(100).duration(300)}>
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

        <Animated.View entering={FadeInDown.delay(140).duration(300)}>
          <AnalyticsSection
            title="Upcoming Amenity Bookings"
            subtitle="Reservations scheduled for the next few days"
            actionSlot={
              upcomingBookings.length > 0 ? (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/my-bookings")}
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

        <Animated.View entering={FadeInDown.delay(180).duration(300)}>
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

        <Animated.View entering={FadeInDown.delay(220).duration(300)}>
          <AnalyticsSection
            title="Active Jobs"
            subtitle="Maintenance tasks currently in motion"
            actionSlot={
              activeJobs.length > 0 ? (
                <TouchableOpacity onPress={() => router.push("/(admin)/jobs")}>
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
        entering={FadeInDown.duration(300)}
        style={[
          styles.banner,
          {
            backgroundColor: performanceBanner.background,
            borderColor: performanceBanner.border,
          },
        ]}
      >
        <View
          style={[
            styles.bannerIconWrapper,
            { backgroundColor: performanceBanner.toneColor + "15" },
          ]}
        >
          <Ionicons
            name={performanceBanner.icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={performanceBanner.toneColor}
          />
        </View>
        <View style={styles.bannerCopy}>
          <Text
            style={[
              styles.bannerHeadline,
              { color: performanceBanner.toneColor },
            ]}
          >
            {performanceBanner.headline}
          </Text>
          <Text style={styles.bannerBody}>{performanceBanner.body}</Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(300)}>
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

      <Animated.View entering={FadeInDown.delay(120).duration(300)}>
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

      <Animated.View entering={FadeInDown.delay(160).duration(300)}>
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

      <Animated.View entering={FadeInDown.delay(200).duration(300)}>
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

      <Animated.View entering={FadeInDown.delay(240).duration(300)}>
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
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title={
            isManagement ? "Building Operations" : "Super Admin Control Center"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  bannerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bannerCopy: {
    flex: 1,
    gap: 4,
  },
  bannerHeadline: {
    fontSize: 16,
    fontWeight: "700",
  },
  bannerBody: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  managementIntro: {
    marginBottom: 20,
  },
  managementGreeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  managementSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  managementChipScroll: {
    marginBottom: 20,
  },
  managementChipRow: {
    gap: 12,
    paddingRight: 12,
  },
  managementChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  managementChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#7034FF",
  },
  managementChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  managementChipTextActive: {
    color: "#4C1D95",
  },
  managementEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  managementEmptyIcon: {
    marginBottom: 16,
  },
  managementEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  managementEmptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  kpiGridCompact: {
    gap: 8,
  },
  trendGrid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  trendGridCompact: {
    gap: 8,
  },
  operationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  operationsGridCompact: {
    flexDirection: "column",
    gap: 12,
  },
  operationCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  operationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  operationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  operationMetric: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  operationBody: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  providerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "700",
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  providerMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  listCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1,
    paddingRight: 12,
  },
  listCardBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FB923C",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  listCardBadgeMuted: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  listCardMeta: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 20,
  },
  listEmpty: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4C1D95",
  },
  timeline: {
    position: "relative",
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 18,
  },
  timelineIndicator: {
    alignItems: "center",
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  timelineTimestamp: {
    fontSize: 12,
    color: "#6B7280",
  },
});
