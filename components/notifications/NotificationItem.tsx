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
  variant?: "default" | "tenant";
}

const TENANT = {
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#34474D",
  infoBg: "#E7EEF9",
  infoText: "#3C5A8C",
  successBg: "#E4F4EA",
  successText: "#25674A",
  warningBg: "#FDF1DB",
  warningText: "#9A5B00",
  dangerBg: "#FCE3E0",
  dangerText: "#B24A41",
  shadow: "rgba(43, 52, 55, 0.06)",
};

const getTypeConfig = (
  type: Notification["type"],
  variant: "default" | "tenant",
) => {
  const isTenant = variant === "tenant";
  switch (type) {
    case "CONVERSATION_CREATED":
    case "MESSAGE_CREATED":
      return {
        icon: "chatbubble-ellipses" as const,
        iconColor: isTenant ? TENANT.infoText : "#2563EB",
        bgColor: isTenant ? TENANT.infoBg : "#EFF6FF",
        borderColor: isTenant ? TENANT.border : "#DBEAFE",
      };
    case "success":
      return {
        icon: "checkmark-circle" as const,
        iconColor: isTenant ? TENANT.successText : "#10B981",
        bgColor: isTenant ? TENANT.successBg : "#ECFDF5",
        borderColor: isTenant ? TENANT.border : "#D1FAE5",
      };
    case "error":
      return {
        icon: "close-circle" as const,
        iconColor: isTenant ? TENANT.dangerText : "#EF4444",
        bgColor: isTenant ? TENANT.dangerBg : "#FEF2F2",
        borderColor: isTenant ? TENANT.border : "#FECACA",
      };
    case "warning":
      return {
        icon: "alert-circle" as const,
        iconColor: isTenant ? TENANT.warningText : "#F59E0B",
        bgColor: isTenant ? TENANT.warningBg : "#FFFBEB",
        borderColor: isTenant ? TENANT.border : "#FDE68A",
      };
    case "info":
    default:
      return {
        icon: "information-circle" as const,
        iconColor: isTenant ? TENANT.primary : "#3B82F6",
        bgColor: isTenant ? TENANT.surface : "#EFF6FF",
        borderColor: isTenant ? TENANT.border : "#DBEAFE",
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
  variant = "default",
}: NotificationItemProps) {
  const config = getTypeConfig(notification.type, variant);
  const isUnread = isNotificationUnread(notification);
  const notificationBody = getNotificationBody(notification);
  const isTenant = variant === "tenant";

  return (
    <AnimatedButton
      style={[
        styles.container,
        isUnread && styles.unreadContainer,
        isTenant && styles.tenantContainer,
        isUnread && isTenant && styles.tenantUnreadContainer,
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
            {isUnread && <View style={[styles.unreadDot, isTenant && styles.tenantUnreadDot]} />}
          </View>

          <Text style={[styles.message, isTenant && styles.tenantMessage]} numberOfLines={2}>
            {notificationBody}
          </Text>

          <Text style={[styles.time, isTenant && styles.tenantTime]}>
            {formatTime(notification.createdAt)}
          </Text>
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
              <Ionicons
                name="checkmark-done"
                size={20}
                color={isTenant ? TENANT.primary : "#6B7280"}
              />
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
              <Ionicons
                name="eye-off-outline"
                size={20}
                color={isTenant ? TENANT.dangerText : "#EF4444"}
              />
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
  tenantContainer: {
    borderRadius: 22,
    marginBottom: 12,
  },
  unreadContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tenantUnreadContainer: {
    shadowColor: TENANT.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
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
  tenantUnreadDot: {
    backgroundColor: TENANT.primary,
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 6,
  },
  tenantMessage: {
    color: TENANT.muted,
  },
  time: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  tenantTime: {
    color: TENANT.soft,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
});
