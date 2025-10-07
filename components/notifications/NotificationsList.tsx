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
import { AnimatedButton } from "../ui/AnimatedButton";
import { SkeletonCard } from "../ui/SkeletonCard";
import { NotificationItem } from "./NotificationItem";

interface NotificationsListProps {
  notifications: Notification[];
  userId: string;
  userRole: UserRole;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onRefresh?: () => Promise<void>;
  loading?: boolean;
}

export function NotificationsList({
  notifications,
  userId,
  userRole,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onRefresh,
  loading = false,
}: NotificationsListProps) {
  const [refreshing, setRefreshing] = useState(false);

  // Filter notifications for current user
  const userNotifications = useMemo(() => {
    return notifications
      .filter((notif) => notif.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [notifications, userId]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter((n) => !n.read).length;
  }, [userNotifications]);

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

  const handleDelete = (id: string) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(id),
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
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          ) : undefined
        }
      >
        <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Notifications</Text>
       <Text style={styles.emptyText}>
  {"You don't have any notifications yet. When you receive notifications about your requests, they'll appear here."}
</Text>

      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mark All as Read Button */}
      {unreadCount > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.headerActions}
        >
          <AnimatedButton
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Ionicons name="checkmark-done" size={18} color="#3B82F6" />
            <Text style={styles.markAllText}>
              Mark all as read ({unreadCount})
            </Text>
          </AnimatedButton>
        </Animated.View>
      )}

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
              onMarkAsRead={onMarkAsRead}
              onDelete={handleDelete}
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
  bottomSpacing: {
    height: 40,
  },
});
