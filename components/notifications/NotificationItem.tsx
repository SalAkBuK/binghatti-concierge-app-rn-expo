import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedButton } from "../ui/AnimatedButton";
import type { Notification } from "../../lib/types";
import {
  getNotificationBody,
  isNotificationUnread,
} from "../../lib/utils/helpers";

interface NotificationItemProps {
  notification: Notification;
  onPress?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const getTypeConfig = (type: Notification["type"]) => {
  switch (type) {
    case "success":
      return {
        icon: "checkmark-circle" as const,
        iconColor: "#10B981",
        bgColor: "#ECFDF5",
        borderColor: "#D1FAE5",
      };
    case "error":
      return {
        icon: "close-circle" as const,
        iconColor: "#EF4444",
        bgColor: "#FEF2F2",
        borderColor: "#FECACA",
      };
    case "warning":
      return {
        icon: "alert-circle" as const,
        iconColor: "#F59E0B",
        bgColor: "#FFFBEB",
        borderColor: "#FDE68A",
      };
    case "info":
    default:
      return {
        icon: "information-circle" as const,
        iconColor: "#3B82F6",
        bgColor: "#EFF6FF",
        borderColor: "#DBEAFE",
      };
  }
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMins = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMins < 1) return "Just now";
  if (diffInMins < 60) return `${diffInMins}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function NotificationItem({
  notification,
  onPress,
  onMarkAsRead,
  onDismiss,
}: NotificationItemProps) {
  const config = getTypeConfig(notification.type);
  const isUnread = isNotificationUnread(notification);
  const notificationBody = getNotificationBody(notification);

  return (
    <AnimatedButton
      style={[
        styles.container,
        isUnread && styles.unreadContainer,
        { backgroundColor: config.bgColor, borderColor: config.borderColor },
      ]}
      onPress={() => onPress?.(notification.id)}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name={config.icon} size={24} color={config.iconColor} />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <View style={styles.header}>
            <Text
              style={[styles.title, isUnread && styles.unreadTitle]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {notificationBody}
          </Text>

          <Text style={styles.time}>{formatTime(notification.createdAt)}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {isUnread && onMarkAsRead && (
            <AnimatedButton
              style={styles.actionButton}
              onPress={(e) => {
                e?.stopPropagation?.();
                onMarkAsRead(notification.id);
              }}
            >
              <Ionicons name="checkmark-done" size={20} color="#6B7280" />
            </AnimatedButton>
          )}

          {onDismiss && (
            <AnimatedButton
              style={styles.actionButton}
              onPress={(e) => {
                e?.stopPropagation?.();
                onDismiss(notification.id);
              }}
            >
              <Ionicons name="eye-off-outline" size={20} color="#EF4444" />
            </AnimatedButton>
          )}
        </View>
      </View>
    </AnimatedButton>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  unreadContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "700",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 6,
  },
  time: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
});
