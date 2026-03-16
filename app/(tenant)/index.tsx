import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import BuildingIcon from "../../components/icons/BuildingIcon";
import FireIcon from "../../components/icons/FireIcon";
import NewHomeIcon from "../../components/icons/NewHomeIcon";
import NewIcon from "../../components/icons/NewIcon";
import RequestsIcon from "../../components/icons/RequestsIcon";
import { AnimatedButton } from "../../components/ui/AnimatedButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { HomeScreenSkeleton } from "../../components/ui/HomeScreenSkeleton";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { useResidentContract } from "../../lib/hooks/useResidentSelfService";
import { useResidentRequests } from "../../lib/hooks/useResidentRequests";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function TenantHomeScreen() {
  const {
    currentUser,
    notifications,
    notices,
    actions,
    isAuthenticated,
  } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  const isHandlingUnauthorizedRef = useRef(false);

  const handleUnauthorized = useCallback(async () => {
    if (isHandlingUnauthorizedRef.current) {
      return;
    }

    isHandlingUnauthorizedRef.current = true;
    try {
      await actions.logout();
    } catch (error) {
      console.warn("[TenantHome] Failed to clear session after 401:", error);
    } finally {
      router.replace("/auth" as any);
      isHandlingUnauthorizedRef.current = false;
    }
  }, [actions]);

  const {
    data: contractData,
    refetch: refetchContract,
    isRefreshing: isContractRefreshing,
  } = useResidentContract({
    enabled: Boolean(currentUser?.id && isAuthenticated),
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

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Simulate minimum loading time for smooth animation
    const timer = setTimeout(() => {
      if (currentUser) {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentUser]);

  const onRefreshHome = useCallback(async () => {
    await Promise.all([
      refreshRequests({ asRefresh: true, reason: "manual" }),
      refetchContract({ asRefresh: true, showLoading: false }),
    ]);
  }, [refetchContract, refreshRequests]);

  const isHomeRefreshing = isRequestsRefreshing || isContractRefreshing;

  const profileBuildingName = currentUser?.profile?.buildingName;
  const unitLabel = currentUser?.profile?.apartment;
  const floorLabel = currentUser?.profile?.floor;
  const profileUnitInfo =
    unitLabel || floorLabel
      ? [unitLabel, floorLabel ? `Floor ${floorLabel}` : null]
          .filter(Boolean)
          .join(" - ")
      : "-";
  const buildingName = contractData.contract?.buildingName || profileBuildingName || "-";
  const unitInfo = contractData.contract?.unitLabel || profileUnitInfo;

  const recentRequests = useMemo(() => {
    return [...residentRequests]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 3);
  }, [residentRequests]);

  const handleNoticePress = (notice: any) => {
    actions.setSelectedNotice(notice);
    router.push("/(modals)/notice-details");
  };

  if (isLoading || !currentUser) {
    return <HomeScreenSkeleton />;
  }

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        entering={FadeIn.duration(400)}
        style={styles.fixedContent}
      >
        {/* Header */}
        <HeaderBar
          showTitle={false}
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        {/* Welcome Card */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.welcomeCardContainer}
        >
          <LinearGradient
            colors={["#7034FF", "#1B28B1"]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 0 }}
            style={styles.welcomeCard}
          >
            <Text style={styles.welcomeTitle}>
              Welcome back, {currentUser?.name || "Ahmed"}!
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Your premium living experience
            </Text>

            <View style={styles.buildingInfo}>
              <View style={styles.infoRow}>
                <BuildingIcon size={44} color="rgba(255,255,255,0.8)" />
                <View>
                  <Text style={styles.infoLabel}>Building</Text>
                  <Text style={styles.infoValue}>{buildingName}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <NewHomeIcon size={44} color="rgba(255,255,255,0.8)" />
                <View>
                  <Text style={styles.infoLabel}>Your Unit</Text>
                  <Text style={styles.infoValue}>{unitInfo}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.actionButtonsContainer}
        >
          <AnimatedButton
            style={[styles.actionButton, styles.newRequestButton]}
            onPress={() => router.push("/(tenant)/new-request")}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionButtonIcon, styles.newRequestIcon]}>
                <NewIcon size={18} color="#fff" />
              </View>
              <Text
                style={styles.actionButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                New Request
              </Text>
            </View>
          </AnimatedButton>

          <AnimatedButton
            style={[styles.actionButton, styles.myRequestsButton]}
            onPress={() => router.push("/(tenant)/requests")}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionButtonIcon, styles.myRequestsIcon]}>
                <RequestsIcon size={18} color="#fff" />
              </View>
              <Text
                style={styles.actionButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                My Requests
              </Text>
            </View>
          </AnimatedButton>
        </Animated.View>

      </Animated.View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollableContent}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}
        refreshControl={
          <RefreshControl refreshing={isHomeRefreshing} onRefresh={onRefreshHome} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Building Notices Section */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(400)}
          style={styles.buildingNoticesSection}
        >
          <View style={styles.buildingNoticesHeader}>
            <View style={styles.noticesIcon}>
              <FireIcon size={20} color="#FF5722" />
            </View>
            <Text style={styles.buildingNoticesTitle}>Building Notices</Text>
          </View>

          {notices && notices.length > 0 ? (
            notices
              .filter(notice => notice.status === "scheduled" || notice.status === "in-progress")
              .slice(0, 2)
              .map((notice) => (
                <TouchableOpacity
                  key={notice.id}
                  style={styles.noticeCard}
                  onPress={() => handleNoticePress(notice)}
                  activeOpacity={0.7}
                >
                  <View style={styles.noticeCardHeader}>
                    <Text style={styles.noticeCardTitle}>{notice.title}</Text>
                    <View style={[
                      styles.noticeStatusBadge,
                      notice.status === "in-progress"
                        ? styles.inProgressBadge
                        : styles.scheduledBadge
                    ]}>
                      <Text style={[
                        styles.noticeStatusText,
                        notice.status === "in-progress"
                          ? styles.inProgressText
                          : styles.scheduledText
                      ]}>
                        {notice.status === "in-progress" ? "In Progress" : "Scheduled"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.noticeCardDescription} numberOfLines={2}>
                    {notice.description}
                  </Text>
                  {notice.affectedAreas && notice.affectedAreas.length > 0 && (
                    <Text style={styles.noticeAreas}>
                      Affects: {notice.affectedAreas.slice(0, 2).join(", ")}
                      {notice.affectedAreas.length > 2 && ` +${notice.affectedAreas.length - 2} more`}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
          ) : (
            <View style={styles.noNoticesCard}>
              <Text style={styles.noNoticesText}>No active notices at this time</Text>
            </View>
          )}
        </Animated.View>

        {/* Recent Activity Section */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.recentActivitySection}
        >
          <Text style={styles.recentActivityTitle}>Recent Activity</Text>

          {recentRequests
            .map((request) => {
              const statusConfig = {
                pending: {
                  bg: "#FFEDD5",
                  text: "#EA5846",
                  label: "Pending",
                },
                assigned: {
                  bg: "#DBEAFE",
                  text: "#1E40AF",
                  label: "Assigned",
                },
                "in-progress": {
                  bg: "#DBEAFE",
                  text: "#1E40AF",
                  label: "Progress",
                },
                "on-hold": {
                  bg: "#FEE2E2",
                  text: "#BE123C",
                  label: "On Hold",
                },
                completed: {
                  bg: "#D1FAE5",
                  text: "#065F46",
                  label: "Completed",
                },
                cancelled: {
                  bg: "#FEE2E2",
                  text: "#DC2626",
                  label: "Cancelled",
                },
              };

              const status =
                statusConfig[request.status] ?? statusConfig.pending;

              return (
                <TouchableOpacity
                  key={request.id}
                  style={styles.activityItem}
                  onPress={() => {
                    actions.setSelectedRequest(request);
                    router.push("/(modals)/request-details");
                  }}
                >
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle} numberOfLines={1}>
                      {request.title}
                    </Text>
                    <Text style={styles.activityDate}>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[styles.statusBadge, { backgroundColor: status.bg }]}
                  >
                    <Text style={[styles.statusText, { color: status.text }]}>
                      {status.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

          {residentRequests.length === 0 && (
            <View style={styles.emptyActivityState}>
              <Text style={styles.emptyActivityText}>
                No recent activity to display
              </Text>
            </View>
          )}
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
    backgroundColor: "#F9FAFB",
  },
  fixedContent: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  scrollableContent: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
  },
  menuButton: {
    padding: 8,
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
  welcomeCardContainer: {
    marginBottom: 30,
  },
  welcomeCard: {
    borderRadius: 10,
    padding: SCREEN_WIDTH * 0.055, // Responsive padding ~24px on 430px screens
    justifyContent: "center",
    width: SCREEN_WIDTH * 0.9,
    minHeight: Math.min(SCREEN_WIDTH * 0.9 * 0.736, SCREEN_HEIGHT * 0.35), // Max 35% of screen height
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 32,
    lineHeight: 22,
  },
  buildingInfo: {
    gap: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    borderWidth: 1,
    justifyContent: "center",
  },
  newRequestButton: {
    backgroundColor: "#DBEAFE",
    borderColor: "#BCD7FB",
  },
  myRequestsButton: {
    backgroundColor: "#DCFCE7",
    borderColor: "#8EEEAF",
  },
  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  newRequestIcon: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: "#356FEC",
  },
  myRequestsIcon: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: "#16A34A",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  buildingNoticesSection: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    width: SCREEN_WIDTH * 0.9,
    minHeight: 187,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  buildingNoticesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  noticesIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  buildingNoticesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  noticeCard: {
    backgroundColor: "#FFF8EC",
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EEDAB8",
    width: "100%",
    minHeight: 98,
    marginTop: 12,
  },
  noticeCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  noticeCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
    marginRight: 8,
    textAlign: "left",
    lineHeight: 19,
    letterSpacing: 0,
  },
  noticeCardDescription: {
    fontSize: 12,
    fontWeight: "normal",
    color: "#000000",
    lineHeight: 20,
    textAlign: "left",
    letterSpacing: 0,
    marginBottom: 8,
  },
  noticeAreas: {
    fontSize: 11,
    color: "#FF5722",
    fontWeight: "500",
  },
  noticeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduledBadge: {
    backgroundColor: "#FEF3C7",
  },
  inProgressBadge: {
    backgroundColor: "#DBEAFE",
  },
  noticeStatusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  scheduledText: {
    color: "#92400E",
  },
  inProgressText: {
    color: "#1E40AF",
  },
  noNoticesCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    width: "100%",
    minHeight: 98,
    justifyContent: "center",
    alignItems: "center",
  },
  noNoticesText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    fontStyle: "italic",
  },
  recentActivitySection: {
    marginBottom: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    width: SCREEN_WIDTH * 0.9,
    minHeight: 215,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  recentActivityTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  activityItem: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    width: "100%",
    minHeight: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activityContent: {
    flex: 1,
    justifyContent: "space-between",
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#000000",
    textAlign: "left",
    lineHeight: 18,
    letterSpacing: 0,
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    fontWeight: "normal",
    color: "#000000",
    textAlign: "left",
    lineHeight: 20,
    letterSpacing: 0,
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    minWidth: 68,
    minHeight: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 17,
    letterSpacing: 0,
  },
  emptyActivityState: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyActivityText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
