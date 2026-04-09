import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { Notification, UserRole } from "../../lib/types";
import {
  filterNotificationsByUser,
  isNotificationUnread,
} from "../../lib/utils/helpers";
import { AnimatedButton } from "../ui/AnimatedButton";
import { SkeletonCard } from "../ui/SkeletonCard";
import { NotificationItem } from "./NotificationItem";

interface NotificationsListProps {
  notifications: Notification[];
  userId: string;
  userRole: UserRole;
  onPress?: (notification: Notification) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  onClearAll?: () => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
  variant?: "default" | "tenant";
  clearingAll?: boolean;
}

const TENANT = {
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#34474D",
  border: "#D9E0E4",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
};

export function NotificationsList({
  notifications,
  userId,
  userRole,
  onPress,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClearAll,
  onRefresh,
  loading = false,
  variant = "default",
  clearingAll = false,
}: NotificationsListProps) {
  const [refreshing, setRefreshing] = useState(false);
  const isTenant = variant === "tenant";
  const userNotifications = useMemo(() => {
    return filterNotificationsByUser(notifications, userId).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [notifications, userId]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter(isNotificationUnread).length;
  }, [userNotifications]);
  const showClearAll = Boolean(onClearAll && userNotifications.length > 0);

  const handleRefresh = async () => {
    if (!onRefresh) return;

    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;

    Alert.alert(
      "Mark All as Read",
      `Mark all ${unreadCount} notifications as read?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark All",
          onPress: onMarkAllAsRead,
        },
      ],
    );
  };

  const handleDismiss = (id: string) => {
    Alert.alert(
      "Dismiss Notification",
      "Dismiss this notification? You can restore it later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Dismiss",
          style: "destructive",
          onPress: () => onDismiss(id),
        },
      ],
    );
  };

  // Loading State
  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonCard
          width="100%"
          height={100}
          borderRadius={12}
          style={styles.skeletonItem}
        />
        <SkeletonCard
          width="100%"
          height={100}
          borderRadius={12}
          style={styles.skeletonItem}
        />
        <SkeletonCard
          width="100%"
          height={100}
          borderRadius={12}
          style={styles.skeletonItem}
        />
        <SkeletonCard
          width="100%"
          height={100}
          borderRadius={12}
          style={styles.skeletonItem}
        />
      </View>
    );
  }

  // Empty State
  if (userNotifications.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={isTenant ? TENANT.primary : undefined}
            />
          ) : undefined
        }
      >
        <Ionicons
          name="notifications-off-outline"
          size={64}
          color={isTenant ? TENANT.soft : "#D1D5DB"}
        />
        <Text style={[styles.emptyTitle, isTenant && styles.tenantEmptyTitle]}>
          No Notifications
        </Text>
        <Text style={[styles.emptyText, isTenant && styles.tenantEmptyText]}>
          {"You don't have any notifications yet. When you receive notifications about your requests, they'll appear here."}
        </Text>

      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mark All as Read Button */}
      {(unreadCount > 0 || showClearAll) && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.headerActions}
        >
          {unreadCount > 0 ? (
            <AnimatedButton
              style={[styles.markAllButton, isTenant && styles.tenantMarkAllButton]}
              onPress={handleMarkAllAsRead}
            >
              <Ionicons
                name="checkmark-done"
                size={18}
                color={isTenant ? TENANT.primary : "#3B82F6"}
              />
              <Text style={[styles.markAllText, isTenant && styles.tenantMarkAllText]}>
                Mark all as read ({unreadCount})
              </Text>
            </AnimatedButton>
          ) : null}
          {showClearAll ? (
            <AnimatedButton
              style={[
                styles.clearAllButton,
                isTenant && styles.tenantClearAllButton,
                clearingAll && styles.clearAllButtonDisabled,
              ]}
              onPress={() => {
                if (!clearingAll) {
                  onClearAll?.();
                }
              }}
            >
              <Text
                style={[
                  styles.clearAllText,
                  isTenant && styles.tenantClearAllText,
                ]}
              >
                {clearingAll ? "Clearing..." : `Clear all (${userNotifications.length})`}
              </Text>
            </AnimatedButton>
          ) : null}
        </Animated.View>
      )}

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={isTenant ? TENANT.primary : undefined}
            />
          ) : undefined
        }
      >
        {userNotifications.map((notification, index) => (
          <Animated.View
            key={notification.id}
            entering={FadeInDown.delay(index * 50).duration(400)}
          >
            <NotificationItem
              notification={notification}
              onPress={onPress ? () => onPress(notification) : undefined}
              onMarkAsRead={onMarkAsRead}
              onDismiss={handleDismiss}
              variant={variant}
            />
          </Animated.View>
        ))}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerActions: {
    marginBottom: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignSelf: "flex-start",
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  tenantMarkAllButton: {
    backgroundColor: TENANT.surfaceLow,
    borderColor: TENANT.border,
    borderRadius: 999,
  },
  tenantMarkAllText: {
    color: TENANT.primaryDark,
  },
  clearAllButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    alignSelf: "flex-start",
  },
  clearAllButtonDisabled: {
    opacity: 0.7,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B91C1C",
  },
  tenantClearAllButton: {
    backgroundColor: "#FFF1F0",
    borderColor: "#F2D4CF",
    borderRadius: 999,
  },
  tenantClearAllText: {
    color: "#B24A41",
  },
  skeletonItem: {
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  tenantEmptyTitle: {
    color: TENANT.text,
  },
  tenantEmptyText: {
    color: TENANT.muted,
  },
  bottomSpacing: {
    height: 40,
  },
});
