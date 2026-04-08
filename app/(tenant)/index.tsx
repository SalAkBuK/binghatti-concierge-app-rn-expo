import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
import { ScreenEntrance } from "../../components/ui/ScreenEntrance";
import { SideMenu } from "../../components/ui/SideMenu";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { useRequests } from "../../lib/context/requests-context";
import { useBroadcastNotifications } from "../../lib/hooks/useBroadcastNotifications";
import { useResidentContract } from "../../lib/hooks/useResidentSelfService";
import { useResidentRequests } from "../../lib/hooks/useResidentRequests";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
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

const requestStatusMeta = (status?: string | null) => {
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

export default function TenantHomeScreen() {
  const { currentUser, isAuthenticated, actions: authActions } = useAuth();
  const { notifications, actions: notificationActions } = useNotifications();
  const { actions: requestActions } = useRequests();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  const isHandlingUnauthorizedRef = useRef(false);

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
    refetch: refetchContract,
    isRefreshing: isContractRefreshing,
  } = useResidentContract({
    enabled: Boolean(currentUser?.id && isAuthenticated),
    onUnauthorized: handleUnauthorized,
  });

  const {
    canCreateMaintenanceRequest,
    canManageVisitors,
    displayBuildingName,
    displayUnitLabel,
    isFormerResident,
    isLoading: isTenancyLoading,
    refetch: refetchTenancy,
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

  const onRefreshHome = useCallback(async () => {
    await Promise.all([
      refreshRequests({ asRefresh: true, reason: "manual" }),
      refetchContract({ asRefresh: true, showLoading: false }),
      refetchTenancy({ asRefresh: true, showLoading: false }),
      refetchBroadcastNotices({ asRefresh: true, showLoading: false }),
    ]);
  }, [refetchBroadcastNotices, refetchContract, refetchTenancy, refreshRequests]);

  const isHomeRefreshing =
    isRequestsRefreshing || isContractRefreshing || isBroadcastNoticesRefreshing;

  const buildingName =
    displayBuildingName || currentUser?.profile?.buildingName || "Towerdesk Residence";
  const profileUnitInfo =
    currentUser?.profile?.apartment || currentUser?.profile?.floor
      ? [
          currentUser?.profile?.apartment,
          currentUser?.profile?.floor ? `Floor ${currentUser.profile.floor}` : null,
        ]
          .filter(Boolean)
          .join(" - ")
      : "Not assigned";
  const unitInfo = displayUnitLabel || profileUnitInfo;

  const userNotifications = useMemo(
    () => filterNotificationsByUser(notifications || [], currentUser?.id),
    [currentUser?.id, notifications],
  );
  const hasUnreadNotifications = getUnreadNotificationsCount(userNotifications) > 0;

  const recentRequests = useMemo(
    () =>
      [...residentRequests]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 3),
    [residentRequests],
  );

  const activeContract = contractData.contract;
  const quickActions = useMemo(
    () => [
      {
        key: "main",
        label: canCreateMaintenanceRequest ? "New Request" : "Lease Details",
        icon: canCreateMaintenanceRequest ? "add-outline" : "document-text-outline",
        onPress: () =>
          router.push(
            (canCreateMaintenanceRequest ? "/(tenant)/new-request" : "/(tenant)/lease-details") as any,
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
        label: "Messages",
        icon: "chatbubble-ellipses-outline",
        onPress: () => router.push("/(tenant)/messages" as any),
      },
      {
        key: canManageVisitors ? "visitors" : "profile",
        label: canManageVisitors ? "Visitors" : "Profile",
        icon: canManageVisitors ? "people-outline" : "person-outline",
        onPress: () =>
          router.push((canManageVisitors ? "/(tenant)/visitors" : "/(tenant)/profile") as any),
      },
    ],
    [canCreateMaintenanceRequest, canManageVisitors, isFormerResident],
  );

  const handleNoticePress = useCallback(
    (notification: any) => {
        const body = getNotificationBody(notification).trim();
        if (isNotificationUnread(notification)) {
        notificationActions.markNotificationAsRead?.(notification.id).catch((error: unknown) => {
          console.warn("[TenantHome] Failed to mark notice as read:", error);
        });
      }
      Alert.alert(
        notification.title || "Building notice",
        body || "No additional details were provided for this building notice.",
        [
          { text: "Close", style: "cancel" },
          { text: "Open Inbox", onPress: () => router.push("/(modals)/notifications-hub" as any) },
        ],
      );
    },
    [notificationActions],
  );

  if (!currentUser || isTenancyLoading) return <HomeScreenSkeleton />;

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
            <Text style={styles.heroEyebrow}>{buildingName}</Text>
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
          <LinearGradient
            colors={[P.primary, P.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials(currentUser?.name)}</Text>
          </LinearGradient>
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

        {isFormerResident ? (
          <Animated.View entering={FadeInDown.delay(110).duration(400)} style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="information-circle-outline" size={18} color={P.warningText} />
            </View>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>{statusTitle}</Text>
              <Text style={styles.bannerText}>{statusMessage}</Text>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(170).duration(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Active Service Requests</Text>
              <Text style={styles.sectionSubtitle}>Follow the latest status on your maintenance issues</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(tenant)/requests" as any)}>
              <Text style={styles.linkText}>View all</Text>
            </TouchableOpacity>
          </View>

          {recentRequests.length > 0 ? (
            recentRequests.map((request) => {
              const status = requestStatusMeta(request.status);

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
                      <Text style={styles.requestMeta}>Updated {formatDate(request.updatedAt || request.createdAt)}</Text>
                    </View>
                    <View style={[styles.requestBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.requestBadgeText, { color: status.text }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.requestBottom}>
                    <Text style={styles.requestDescription} numberOfLines={1}>
                      {request.description || "Tap to review request details and latest updates."}
                    </Text>
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
              <Text style={styles.emptyTitle}>No recent requests</Text>
              <Text style={styles.emptyText}>
                When you submit a maintenance request, it will appear here.
              </Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
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
            broadcastNotifications.slice(0, 2).map((notice, index) => {
              const unread = isNotificationUnread(notice);
              const body = getNotificationBody(notice).trim();
              const colors =
                index % 2 === 0
                  ? ([P.primaryDark, P.primary] as const)
                  : (["#86694B", "#B99673"] as const);

              return (
                <TouchableOpacity
                  key={notice.id}
                  style={styles.noticeCard}
                  activeOpacity={0.88}
                  onPress={() => handleNoticePress(notice)}
                >
                  <LinearGradient
                    colors={colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.noticeVisual}
                  >
                    <View style={styles.noticeVisualBadge}>
                      <Ionicons name="megaphone-outline" size={18} color={P.surface} />
                    </View>
                    {unread ? (
                      <View style={styles.noticeVisualPill}>
                        <Text style={styles.noticeVisualPillText}>New</Text>
                      </View>
                    ) : null}
                  </LinearGradient>

                  <View style={styles.noticeBody}>
                    <Text style={styles.noticeTitle} numberOfLines={1}>
                      {notice.title || "Building notice"}
                    </Text>
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

        <Animated.View entering={FadeInDown.delay(230).duration(400)} style={styles.section}>
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

        <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.footerCard}>
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
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
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
  section: { marginBottom: 28 },
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: P.border,
    paddingTop: 12,
  },
  requestDescription: { flex: 1, fontSize: 13, lineHeight: 20, color: P.muted },
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
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  noticeVisual: { height: 134, padding: 16, justifyContent: "space-between" },
  noticeVisualBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeVisualPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  noticeVisualPillText: { color: P.surface, fontSize: 11, fontWeight: "700" },
  noticeBody: { padding: 16, gap: 8 },
  noticeTitle: { fontSize: 16, fontWeight: "700", color: P.text },
  noticeDescription: { fontSize: 13, lineHeight: 20, color: P.muted },
  noticeMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
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
