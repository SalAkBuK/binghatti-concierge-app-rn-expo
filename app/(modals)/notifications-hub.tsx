import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { useApp } from "../../lib/context/connected-app-provider";
import type { Notification } from "../../lib/types";
import { isNotificationUnread } from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function NotificationsHubScreen() {
  const insets = useSafeAreaInsets();
  const {
    currentUser,
    userRole,
    notifications,
    unreadCount,
    requests,
    notices,
    activeNoticesCount,
    actions,
  } = useApp();

  const [activeTab, setActiveTab] = useState<"notifications" | "notices">(
    "notifications",
  );

  const handleMarkAsRead = async (id: string) => {
    try {
      await actions.markNotificationAsRead(id);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;

    try {
      await actions.markAllNotificationsAsRead(currentUser.id);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleDismissNotification = async (id: string) => {
    try {
      await actions.dismissNotification(id);
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await actions.deleteNotice(id);
    } catch (error) {
      console.error("Error deleting notice:", error);
    }
  };

  const handleAddNotice = () => {
    // First dismiss the modal, then navigate to management dashboard
    router.back();
    // Use setTimeout to ensure modal is dismissed before navigating
    setTimeout(() => {
      router.push({
        pathname: "/(management)/index" as any,
        params: { openBroadcastModal: "true" },
      });
    }, 100);
  };

  const handleRefresh = async () => {
    // Simulate refresh - in real app you'd fetch from API
    return new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });
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

    if (userRole === "tenant") {
      const request = requests.find((item) => item.id === normalizedRequestId);
      if (request) {
        actions.setSelectedRequest(request);
        router.back();
        setTimeout(() => {
          router.push("/(modals)/request-details" as any);
        }, 120);
        return;
      }

      router.back();
      setTimeout(() => {
        router.push({
          pathname: "/(tenant)/requests" as any,
          params: { requestId: normalizedRequestId },
        });
      }, 120);
      return;
    }

    if (userRole === "management" || userRole === "admin") {
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
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 60) }]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Notifications & Notices</Text>
            <Text style={styles.headerSubtitle}>
              Stay updated with your requests and building notices
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBarContainer}>
          <NotificationsTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unreadCount={unreadCount}
            activeNoticesCount={activeNoticesCount}
          />
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === "notifications" ? (
            <NotificationsList
              notifications={notifications}
              userId={currentUser.id}
              userRole={
                (userRole || "tenant") as
                  | "tenant"
                  | "admin"
                  | "management"
                  | "service_provider"
                  | "employee"
              }
              onPress={handleNotificationPress}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onDismiss={handleDismissNotification}
              onRefresh={handleRefresh}
            />
          ) : (
            <NoticesList
              notices={notices}
              userRole={
                (userRole || "tenant") as
                  | "tenant"
                  | "admin"
                  | "management"
                  | "service_provider"
                  | "employee"
              }
              onDelete={
                userRole === "admin" || userRole === "management"
                  ? handleDeleteNotice
                  : undefined
              }
              onAddNotice={
                userRole === "admin" || userRole === "management"
                  ? handleAddNotice
                  : undefined
              }
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
    backgroundColor: "#F9FAFB",
  },
  content: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
  tabBarContainer: {
    marginBottom: 20,
  },
  tabContent: {
    flex: 1,
  },
});
