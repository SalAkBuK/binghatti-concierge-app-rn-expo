import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { NoticesList } from "../../components/notifications/NoticesList";
import { NotificationsList } from "../../components/notifications/NotificationsList";
import { NotificationsTabBar } from "../../components/notifications/NotificationsTabBar";
import { ConversationsTab } from "../../components/notifications/ConversationsTab";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Notification, UserRole } from "../../lib/types";
import { isNotificationUnread } from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function AdminNotificationsModal() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ initialTab?: string }>();
  const {
    currentUser,
    userRole,
    notifications,
    unreadCount,
    notices,
    activeNoticesCount,
    messagingUnreadCount,
    actions,
  } = useApp();

  const defaultTab =
    params.initialTab === "notices"
      ? "notices"
      : params.initialTab === "messages"
        ? "messages"
        : "notifications";

  const [activeTab, setActiveTab] = useState<
    "notifications" | "notices" | "messages"
  >(
    defaultTab,
  );

  const headerCopy = useMemo(() => {
    if (activeTab === "notifications") {
      return {
        title: "Operational Alerts",
        subtitle:
          "Stay ahead of escalations, SLA breaches, and system-wide events.",
      };
    }

    if (activeTab === "messages") {
      return {
        title: "Inbox Messages",
        subtitle: "Review ongoing conversations with tenants and staff.",
      };
    }

    return {
      title: "Portfolio Notices",
      subtitle:
        "Review live maintenance notices and communication blasts to residents.",
    };
  }, [activeTab]);

  if (!currentUser) {
    return null;
  }

  const handleMarkAsRead = async (id: string) => {
    await actions.markNotificationAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await actions.markAllNotificationsAsRead(currentUser.id);
  };

  const handleDismissNotification = async (id: string) => {
    await actions.dismissNotification(id);
  };

  const handleDeleteNotice = async (id: string) => {
    await actions.deleteNotice(id);
  };

  const handleAddNotice = () => {
    console.log("Admin add notice tapped");
  };

  const handleRefresh = async () => {
    await actions.refreshNotifications?.();
  };

  const handleNotificationPress = (notification: Notification) => {
    const data = notification.data as Record<string, any> | undefined;
    const requestId =
      data?.requestId ?? data?.request_id ?? data?.requestID ?? null;
    if (!requestId) return;

    const normalizedRequestId = String(requestId);
    const buildingId =
      data?.buildingId ?? data?.building_id ?? data?.buildingID ?? null;

    if (isNotificationUnread(notification)) {
      actions.markNotificationAsRead(notification.id);
    }

    const params: Record<string, string> = {
      requestId: normalizedRequestId,
    };
    if (buildingId != null) {
      params.buildingId = String(buildingId);
    }

    router.back();
    setTimeout(() => {
      router.push({
        pathname: "/(management)/requests" as any,
        params,
      });
    }, 120);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(250)} style={styles.content}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 60) }]}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{headerCopy.title}</Text>
            <Text style={styles.headerSubtitle}>{headerCopy.subtitle}</Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color="#1F2937" />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Ionicons name="shield-outline" size={16} color="#4338CA" />
            <Text style={styles.metaText}>Role: {(userRole || "admin").toUpperCase()}</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="notifications-outline" size={16} color="#2563EB" />
            <Text style={styles.metaText}>Unread: {unreadCount}</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
            <Text style={styles.metaText}>Active notices: {activeNoticesCount}</Text>
          </View>
        </View>

        <View style={styles.tabBarContainer}>
          <NotificationsTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unreadCount={unreadCount}
            activeNoticesCount={activeNoticesCount}
            messagesUnreadCount={messagingUnreadCount}
          />
        </View>

        <View style={styles.tabContent}>
          {activeTab === "notifications" ? (
            <NotificationsList
              notifications={notifications}
              userId={currentUser.id}
              userRole={(userRole || "admin") as UserRole}
              onPress={handleNotificationPress}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onDismiss={handleDismissNotification}
              onRefresh={handleRefresh}
            />
          ) : activeTab === "messages" ? (
            <ConversationsTab userId={currentUser.id} onRefresh={handleRefresh} />
          ) : (
            <NoticesList
              notices={notices}
              userRole={(userRole || "admin") as UserRole}
              onDelete={handleDeleteNotice}
              onAddNotice={handleAddNotice}
              onRefresh={handleRefresh}
            />
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF2FF",
  },
  content: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
    marginBottom: 16,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metaText: {
    fontSize: 12,
    color: "#374151",
  },
  tabBarContainer: {
    marginBottom: 16,
  },
  tabContent: {
    flex: 1,
  },
});
