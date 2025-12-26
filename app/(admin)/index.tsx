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
import { TrendDelta } from "../../components/admin/TrendDelta";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import apiService from "../../lib/services/api";
import { formatDate, formatDateTime } from "../../lib/utils/helpers";

import { ADMIN_NOTIFICATION_ROUTE } from "./dashboard/_constants";
import { useDashboardData } from "./dashboard/_hooks/useDashboardData";
import { styles } from "./dashboard/_styles";

export default function AdminDashboard() {
  const {
    currentUser,
    analytics,
  managedBuildings,
  adminAssignedBuildings,
  hasUnreadNotifications,
  isManagement,
  managementBaseRoute,
  actions,
} = useDashboardData();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const reduceMotionEnabled = useReducedMotion();
  const [adminRequestsCount, setAdminRequestsCount] = useState<number | null>(null);
  const [adminRequestStatusCounts, setAdminRequestStatusCounts] = useState({
    new: 0,
    assigned: 0,
    inProgress: 0,
    onHold: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loadingAdminRequests, setLoadingAdminRequests] = useState(false);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const isAdminRole =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";

  const adminTenantCount = useMemo(() => {
    if (!isAdminRole || isManagement) return null;
    const assignedIds = new Set((adminAssignedBuildings || []).map((b) => String(b.id)));
    const users = actions.getUsers?.() || [];
    return users.filter(
      (user) =>
        user.role === "tenant" &&
        assignedIds.has(String(user.profile?.buildingId || (user as any).buildingId || "")),
    ).length;
  }, [adminAssignedBuildings, actions.getUsers, isAdminRole, isManagement]);

  useEffect(() => {
    let isMounted = true;

    const fetchAdminRequests = async () => {
      if (!isAdminRole || isManagement) {
        setAdminRequestsCount(null);
        setAdminRequestStatusCounts({
          new: 0,
          assigned: 0,
          inProgress: 0,
          onHold: 0,
          completed: 0,
          cancelled: 0,
        });
        return;
      }

      const assignedBuildings = adminAssignedBuildings || [];
      if (!assignedBuildings.length) {
        setAdminRequestsCount(0);
        setAdminRequestStatusCounts({
          new: 0,
          assigned: 0,
          inProgress: 0,
          onHold: 0,
          completed: 0,
          cancelled: 0,
        });
        return;
      }

      setLoadingAdminRequests(true);
      try {
        const counts = await Promise.all(
          assignedBuildings.map(async (building) => {
            try {
              const response = await apiService.maintenance.getMaintenanceRequestsByBuildingId(
                building.id,
              );
              if (response.success && Array.isArray(response.data)) {
                return response.data;
              }
              return [];
            } catch (error) {
              console.error(
                `[AdminDashboard] Failed to fetch requests for building ${building.id}:`,
                error,
              );
              return [];
            }
          }),
        );

        const allRequests = counts.flat();
        const statusBuckets = {
          new: 0,
          assigned: 0,
          inProgress: 0,
          onHold: 0,
          completed: 0,
          cancelled: 0,
        };

        allRequests.forEach((req) => {
          const statusCode = Number(
            req.status ?? req.requestStatus ?? req.statusId ?? req.state ?? req.Status ?? 0,
          );
          switch (statusCode) {
            case 1:
              statusBuckets.new += 1;
              break;
            case 2:
              statusBuckets.assigned += 1;
              break;
            case 3:
              statusBuckets.inProgress += 1;
              break;
            case 4:
              statusBuckets.onHold += 1;
              break;
            case 5:
              statusBuckets.completed += 1;
              break;
            case 6:
              statusBuckets.cancelled += 1;
              break;
            default:
              statusBuckets.new += 1;
              break;
          }
        });

        const total = allRequests.length;
        if (isMounted) {
          setAdminRequestsCount(total);
          setAdminRequestStatusCounts(statusBuckets);
        }
      } catch (error) {
        console.error("[AdminDashboard] Failed to fetch admin requests:", error);
        if (isMounted) {
          setAdminRequestsCount(0);
          setAdminRequestStatusCounts({
            new: 0,
            assigned: 0,
            inProgress: 0,
            onHold: 0,
            completed: 0,
            cancelled: 0,
          });
        }
      } finally {
        if (isMounted) {
          setLoadingAdminRequests(false);
        }
      }
    };

    fetchAdminRequests();

    return () => {
      isMounted = false;
    };
  }, [adminAssignedBuildings, isAdminRole, isManagement]);

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
          actionSlot={undefined}
        >
          <View style={[styles.kpiGrid, isCompact && styles.kpiGridCompact]}>
            <AnalyticsTile
              title="Total Requests"
              value={
                isAdminRole && !isManagement
                  ? loadingAdminRequests
                    ? "..."
                    : adminRequestsCount ?? 0
                  : analytics.pendingRequestsCount + analytics.openJobsCount
              }
              icon="build-outline"
              iconColor="#3B82F6"
            />
            <AnalyticsTile
              title="Pending Requests"
              value={
                isAdminRole && !isManagement
                  ? loadingAdminRequests
                    ? "..."
                    : adminRequestStatusCounts.new
                  : analytics.pendingRequestsCount
              }
              icon="clipboard-outline"
              iconColor="#EF4444"
            />
            <AnalyticsTile
              title="Completion Rate"
              value={`${analytics.completionRate}%`}
              icon="checkmark-circle-outline"
              iconColor="#10B981"
            />
          </View>

          <View style={[styles.kpiGrid, isCompact && styles.kpiGridCompact]}>
            <AnalyticsTile
              title="Occupancy"
              value={
                isAdminRole && !isManagement
                  ? loadingAdminRequests
                    ? "..."
                    : adminTenantCount ?? 0
                  : `${analytics.occupancyRate}%`
              }
              icon="business-outline"
              iconColor="#8B5CF6"
            />
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
