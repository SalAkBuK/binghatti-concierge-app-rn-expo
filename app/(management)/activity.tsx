import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Notification } from "../../lib/types";
import {
  filterNotificationsByUser,
  formatDateTime,
  getNotificationBody,
  isNotificationUnread,
} from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function ActivityFeedScreen() {
  const { currentUser, notifications, analytics, actions } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const insets = useSafeAreaInsets();

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 900;

  const userNotifications = useMemo(
    () =>
      filterNotificationsByUser(notifications || [], currentUser?.id).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [notifications, currentUser?.id],
  );

  const hasUnreadNotifications = userNotifications.some((notif) =>
    isNotificationUnread(notif),
  );

  const timeline = useMemo(
    () =>
      analytics.recentActivity
        .slice()
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
    [analytics.recentActivity],
  );

  const markNotification = (notification: Notification) => {
    if (!isNotificationUnread(notification)) return;
    actions.markNotificationAsRead(notification.id);
  };

  const markAllNotifications = () => {
    if (!currentUser?.id) return;
    actions.markAllNotificationsAsRead(currentUser.id);
  };

  const notificationIcon = (type: Notification["type"]) => {
    const iconMap = {
      success: { name: "checkmark-circle", color: "#10B981" },
      info: { name: "information-circle", color: "#2563EB" },
      warning: { name: "alert-circle", color: "#F59E0B" },
      error: { name: "close-circle", color: "#DC2626" },
    } as const;
    return iconMap[type] || iconMap.info;
  };

  const timelineIcon = (type: (typeof timeline)[number]["type"]) => {
    switch (type) {
      case "job":
      case "job_completed":
        return { name: "construct-outline", color: "#2563EB" };
      case "request":
      case "new_request":
        return { name: "clipboard-outline", color: "#7C3AED" };
      case "booking":
        return { name: "calendar-outline", color: "#0EA5E9" };
      case "notice":
        return { name: "alert-circle-outline", color: "#F59E0B" };
      case "new_tenant":
        return { name: "person-add-outline", color: "#10B981" };
      default:
        return { name: "time-outline", color: "#6B7280" };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: 160 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Activity Feed"
          subtitle="Live operations timeline"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(40).duration(320)}
          style={[styles.summaryRow, isCompact && styles.summaryRowCompact]}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Recent Signals</Text>
            <Text style={styles.summaryValue}>{timeline.length}</Text>
            <Text style={styles.summaryMeta}>System events tracked</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Inbox</Text>
            <Text style={styles.summaryValue}>{userNotifications.length}</Text>
            <Text style={styles.summaryMeta}>
              {hasUnreadNotifications ? "Unread alerts pending" : "All caught up"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.summaryCard,
              styles.markAllCard,
              !hasUnreadNotifications && styles.markAllCardDisabled,
            ]}
            onPress={markAllNotifications}
            disabled={!hasUnreadNotifications}
          >
            <Ionicons
              name="mail-open-outline"
              size={24}
              color={hasUnreadNotifications ? "#2563EB" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.markAllText,
                !hasUnreadNotifications && styles.markAllTextDisabled,
              ]}
            >
              Mark all as read
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(320)}
          style={styles.timelineCard}
        >
          <Text style={styles.sectionTitle}>Operations Timeline</Text>
          {timeline.map((item, index) => {
            const icon = timelineIcon(item.type);
            const isLast = index === timeline.length - 1;
            return (
              <View key={item.id} style={styles.timelineRow}>
                <View style={styles.timelineIndicator}>
                  <View
                    style={[
                      styles.timelineIconWrapper,
                      { borderColor: icon.color },
                    ]}
                  >
                    <Ionicons
                      name={icon.name as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={icon.color}
                    />
                  </View>
                  {!isLast && <View style={styles.timelineConnector} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineDescription}>
                    {item.description}
                  </Text>
                  <Text style={styles.timelineTimestamp}>
                    {formatDateTime(item.timestamp)}
                  </Text>
                </View>
              </View>
            );
          })}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(320)}
          style={styles.notificationsCard}
        >
          <Text style={styles.sectionTitle}>Notifications Inbox</Text>
          <View style={styles.notificationsList}>
            {userNotifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptySubtitle}>
                  Alerts will appear here as soon as they are generated.
                </Text>
              </View>
            ) : (
              userNotifications.map((notification, index) => {
                const icon = notificationIcon(notification.type);
                return (
                  <Animated.View
                    key={notification.id}
                    entering={FadeInDown.delay(140 + index * 30).duration(260)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.notificationItem,
                        isNotificationUnread(notification) &&
                          styles.notificationUnread,
                      ]}
                      onPress={() => markNotification(notification)}
                    >
                      <View style={styles.notificationIconWrapper}>
                        <Ionicons
                          name={icon.name as keyof typeof Ionicons.glyphMap}
                          size={20}
                          color={icon.color}
                        />
                      </View>
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>
                          {notification.title}
                        </Text>
                        <Text style={styles.notificationMessage}>
                          {getNotificationBody(notification)}
                        </Text>
                        <Text style={styles.notificationFooter}>
                          {formatDateTime(notification.createdAt)}
                        </Text>
                      </View>
                      {isNotificationUnread(notification) && (
                        <View style={styles.unreadDot} />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })
            )}
          </View>
        </Animated.View>

        <View style={{ height: 48 }} />
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
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
  scrollViewContent: {
    paddingBottom: 160,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  summaryRowCompact: {
    flexDirection: "column",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  summaryMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  markAllCard: {
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  markAllCardDisabled: {
    backgroundColor: "#F9FAFB",
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  markAllTextDisabled: {
    color: "#9CA3AF",
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginTop: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  timelineIndicator: {
    alignItems: "center",
  },
  timelineIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    gap: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  timelineDescription: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  timelineTimestamp: {
    fontSize: 12,
    color: "#6B7280",
  },
  notificationsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginTop: 24,
    gap: 14,
  },
  notificationsList: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  notificationUnread: {
    backgroundColor: "#F5F3FF",
    borderColor: "#DDD6FE",
  },
  notificationIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  notificationMessage: {
    fontSize: 13,
    color: "#4B5563",
  },
  notificationFooter: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    marginTop: 4,
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 36,
  },
});
