import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
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
import {
  TenantAnnouncementModal,
  type TenantAnnouncementPreview,
} from "../../components/ui/TenantAnnouncementModal";
import {
  useAuth,
  useMessaging,
  useNotices,
  useNotifications,
  useRequests,
} from "../../lib/context/connected-app-provider";
import type { MaintenanceNotice, Notification } from "../../lib/types";
import {
  filterNotificationsByUser,
  getNotificationBody,
  isChatNotificationType,
  isNotificationUnread,
} from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  shadow: "rgba(43, 52, 55, 0.06)",
};

const isBroadcastNotification = (notification: Notification): boolean =>
  String(notification.type || "").toUpperCase() === "BROADCAST";

const mapBroadcastToNotice = (notification: Notification): MaintenanceNotice => {
  const data = (notification.data ?? {}) as Record<string, any>;
  const buildingName =
    data?.buildingName ??
    data?.building_name ??
    data?.audienceLabel ??
    data?.audience_label ??
    null;

  return {
    id: notification.id,
    title: notification.title || "Building Notice",
    description:
      getNotificationBody(notification).trim() ||
      "No additional details were provided for this building notice.",
    scheduledDate: notification.createdAt,
    status: "scheduled",
    affectedAreas: buildingName ? [String(buildingName)] : [],
    createdBy: "broadcast",
    createdAt: notification.createdAt,
    updatedAt: notification.createdAt,
  };
};

export default function NotificationsHubScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, userRole } = useAuth();
  const {
    notifications,
    actions: notificationActions,
  } = useNotifications();
  const { requests, actions: requestActions } = useRequests();
  const {
    notices,
    activeNoticesCount,
    actions: noticeActions,
  } = useNotices();
  const { totalUnreadCount: messagingUnreadCount } = useMessaging();
  const isTenant = userRole === "tenant";

  const [activeTab, setActiveTab] = useState<"notifications" | "notices" | "messages">(
    "notifications",
  );
  const [selectedTenantNotice, setSelectedTenantNotice] =
    useState<TenantAnnouncementPreview | null>(null);
  const [clearingAnnouncementId, setClearingAnnouncementId] = useState<string | null>(null);
  const [isClearingAllTenantNotices, setIsClearingAllTenantNotices] = useState(false);
  const [isClearingAllAlerts, setIsClearingAllAlerts] = useState(false);

  const tenantVisibleNotifications = useMemo(
    () => filterNotificationsByUser(notifications, currentUser?.id),
    [currentUser?.id, notifications],
  );

  const tenantBroadcastNotices = useMemo(
    () =>
      tenantVisibleNotifications
        .filter(isBroadcastNotification)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .map(mapBroadcastToNotice),
    [tenantVisibleNotifications],
  );

  const resolvedNotices = isTenant ? tenantBroadcastNotices : notices;
  const resolvedNoticesCount = isTenant
    ? tenantBroadcastNotices.length
    : activeNoticesCount;
  const alertNotifications = useMemo(
    () =>
      tenantVisibleNotifications.filter(
        (notification) =>
          !isBroadcastNotification(notification) &&
          !isChatNotificationType(notification.type),
      ),
    [tenantVisibleNotifications],
  );
  const alertUnreadCount = useMemo(
    () => alertNotifications.filter(isNotificationUnread).length,
    [alertNotifications],
  );

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationActions.markNotificationAsRead(id);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;

    try {
      const unreadAlerts = alertNotifications.filter(isNotificationUnread);
      await Promise.all(
        unreadAlerts.map((notification) =>
          notificationActions.markNotificationAsRead(notification.id),
        ),
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleDismissNotification = async (id: string) => {
    try {
      await notificationActions.dismissNotification(id);
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await noticeActions.deleteNotice(id);
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
    await notificationActions.refreshNotifications();
  };

  const handleClearAllAlerts = () => {
    if (alertNotifications.length === 0 || isClearingAllAlerts) {
      return;
    }

    Alert.alert(
      "Clear All Alerts",
      "This will remove all alerts from your alerts list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              setIsClearingAllAlerts(true);
              await Promise.all(
                alertNotifications.map((notification) =>
                  notificationActions.dismissNotification(notification.id),
                ),
              );
            } catch (error) {
              console.error("Error clearing all alerts:", error);
            } finally {
              setIsClearingAllAlerts(false);
            }
          },
        },
      ],
    );
  };

  const handleTenantNoticePress = (notice: MaintenanceNotice) => {
    const notification = tenantVisibleNotifications.find((item) => item.id === notice.id);
    if (!notification) {
      return;
    }

    if (isNotificationUnread(notification)) {
      void notificationActions.markNotificationAsRead(notification.id);
    }

    setSelectedTenantNotice({
      id: notice.id,
      title: notice.title,
      body:
        notice.description ||
        "No additional details were provided for this building notice.",
      scheduledAt: notice.scheduledDate || notice.createdAt,
      affectedAreas: notice.affectedAreas,
    });
  };

  const handleClearTenantAnnouncement = async (
    announcement: TenantAnnouncementPreview,
  ) => {
    if (!announcement.id) {
      return;
    }

    try {
      setClearingAnnouncementId(announcement.id);
      await notificationActions.dismissNotification(announcement.id);
      setSelectedTenantNotice(null);
    } catch (error) {
      console.error("Error clearing announcement:", error);
    } finally {
      setClearingAnnouncementId(null);
    }
  };

  const handleClearAllTenantNotices = () => {
    if (tenantBroadcastNotices.length === 0 || isClearingAllTenantNotices) {
      return;
    }

    Alert.alert(
      "Clear All Notices",
      "This will remove all broadcast notices from your notices list.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              setIsClearingAllTenantNotices(true);
              await Promise.all(
                tenantBroadcastNotices.map((notice) =>
                  notificationActions.dismissNotification(notice.id),
                ),
              );
              setSelectedTenantNotice(null);
            } catch (error) {
              console.error("Error clearing all tenant notices:", error);
            } finally {
              setIsClearingAllTenantNotices(false);
            }
          },
        },
      ],
    );
  };

  const handleNotificationPress = (notification: Notification) => {
    const data = notification.data as Record<string, any> | undefined;
    const conversationId =
      data?.conversationId ?? data?.conversation_id ?? data?.conversationID ?? null;
    const requestId =
      data?.requestId ?? data?.request_id ?? data?.requestID ?? null;

    if (isNotificationUnread(notification)) {
      notificationActions.markNotificationAsRead(notification.id);
    }

    if (conversationId) {
      router.back();
      setTimeout(() => {
        router.push({
          pathname: "/(modals)/conversation-detail" as any,
          params: { conversationId: String(conversationId) },
        });
      }, 120);
      return;
    }

    if (!requestId) return;

    const normalizedRequestId = String(requestId);
    const buildingId =
      data?.buildingId ?? data?.building_id ?? data?.buildingID ?? null;

    if (userRole === "tenant") {
      const request = requests.find((item) => item.id === normalizedRequestId);
      if (request) {
        requestActions.setSelectedRequest(request);
        router.back();
        setTimeout(() => {
          router.push({
            pathname: "/(modals)/request-details" as any,
            params: { initialTab: "comments" },
          });
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
            unreadCount={alertUnreadCount}
            activeNoticesCount={resolvedNoticesCount}
            messagesUnreadCount={messagingUnreadCount}
            variant="tenant"
          />
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === "notifications" ? (
            <NotificationsList
              notifications={alertNotifications}
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
              onClearAll={handleClearAllAlerts}
              clearingAll={isClearingAllAlerts}
              onRefresh={handleRefresh}
              variant="tenant"
            />
          ) : activeTab === "messages" ? (
            <ConversationsTab
              userId={currentUser.id}
              onRefresh={handleRefresh}
              variant="tenant"
            />
          ) : (
            <NoticesList
              notices={resolvedNotices}
              userRole={
                (userRole || "tenant") as
                  | "tenant"
                  | "admin"
                  | "management"
                  | "service_provider"
                  | "employee"
              }
              onPress={isTenant ? handleTenantNoticePress : undefined}
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
              onClearAll={isTenant ? handleClearAllTenantNotices : undefined}
              clearingAll={isTenant ? isClearingAllTenantNotices : false}
              onRefresh={handleRefresh}
              variant="tenant"
            />
          )}
        </View>

        <TenantAnnouncementModal
          announcement={selectedTenantNotice}
          visible={Boolean(selectedTenantNotice)}
          onClose={() => setSelectedTenantNotice(null)}
          onClear={handleClearTenantAnnouncement}
          clearing={selectedTenantNotice?.id === clearingAnnouncementId}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
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
    fontSize: 28,
    fontWeight: "800",
    color: P.text,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: P.muted,
    lineHeight: 22,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.shadow,
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 2,
  },
  tabBarContainer: {
    marginBottom: 18,
  },
  tabContent: {
    flex: 1,
    backgroundColor: P.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 16,
    paddingTop: 16,
    shadowColor: P.shadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 3,
  },
});
