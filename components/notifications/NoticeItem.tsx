import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedButton } from "../ui/AnimatedButton";
import type { MaintenanceNotice, UserRole } from "../../lib/types";

interface NoticeItemProps {
  notice: MaintenanceNotice;
  userRole: UserRole;
  onPress?: (id: string) => void;
  onDelete?: (id: string) => void;
  variant?: "default" | "tenant";
}

const TENANT = {
  surface: "#FFFFFF",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  shadow: "rgba(43, 52, 55, 0.06)",
};

const getStatusConfig = (status: MaintenanceNotice["status"]) => {
  switch (status) {
    case "completed":
      return {
        icon: "checkmark-circle" as const,
        iconColor: "#10B981",
        bgColor: "#ECFDF5",
        borderColor: "#A7F3D0",
        badgeBg: "#D1FAE5",
        badgeText: "#065F46",
        label: "Completed",
      };
    case "in-progress":
      return {
        icon: "sync" as const,
        iconColor: "#3B82F6",
        bgColor: "#EFF6FF",
        borderColor: "#BFDBFE",
        badgeBg: "#DBEAFE",
        badgeText: "#1E40AF",
        label: "In Progress",
      };
    case "cancelled":
      return {
        icon: "close-circle" as const,
        iconColor: "#EF4444",
        bgColor: "#FEF2F2",
        borderColor: "#FECACA",
        badgeBg: "#FEE2E2",
        badgeText: "#991B1B",
        label: "Cancelled",
      };
    case "scheduled":
    default:
      return {
        icon: "calendar" as const,
        iconColor: "#F59E0B",
        bgColor: "#FFFBEB",
        borderColor: "#FDE68A",
        badgeBg: "#FEF3C7",
        badgeText: "#92400E",
        label: "Scheduled",
      };
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "Date TBD";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function NoticeItem({
  notice,
  userRole,
  onPress,
  onDelete,
  variant = "default",
}: NoticeItemProps) {
  const config = getStatusConfig(notice.status);
  const isAdmin = userRole === "admin" || userRole === "management";
  const canInteract = onPress || (isAdmin && onDelete);
  const statusLabel =
    notice.createdBy === "broadcast" ? "Announcement" : config.label;
  const isTenant = variant === "tenant";

  const content = (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={config.icon} size={28} color={config.iconColor} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={1}>
            {notice.title}
          </Text>

          <View style={[styles.badge, { backgroundColor: config.badgeBg }]}>
            <Text style={[styles.badgeText, { color: config.badgeText }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {isAdmin && onDelete && (
          <AnimatedButton
            style={styles.deleteButton}
            onPress={(e) => {
              e?.stopPropagation?.();
              onDelete(notice.id);
            }}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={isTenant ? "#B24A41" : "#EF4444"}
            />
          </AnimatedButton>
        )}
      </View>

      {/* Description */}
      <Text style={[styles.description, isTenant && styles.tenantDescription]} numberOfLines={3}>
        {notice.description}
      </Text>

      {/* Meta Information */}
      <View style={styles.metaContainer}>
        {/* Scheduled Date */}
        {notice.scheduledDate && (
          <View style={styles.metaItem}>
            <Ionicons
              name="time-outline"
              size={16}
              color={isTenant ? TENANT.soft : "#6B7280"}
            />
            <Text style={[styles.metaText, isTenant && styles.tenantMetaText]}>
              {formatDate(notice.scheduledDate)}
            </Text>
          </View>
        )}

        {/* Duration */}
        {notice.estimatedDuration && (
          <View style={styles.metaItem}>
            <Ionicons
              name="hourglass-outline"
              size={16}
              color={isTenant ? TENANT.soft : "#6B7280"}
            />
            <Text style={[styles.metaText, isTenant && styles.tenantMetaText]}>
              {notice.estimatedDuration}
            </Text>
          </View>
        )}
      </View>

      {/* Affected Areas */}
      {notice.affectedAreas && notice.affectedAreas.length > 0 && (
        <View style={[styles.areasContainer, isTenant && styles.tenantAreasContainer]}>
          <Ionicons
            name="location-outline"
            size={16}
            color={isTenant ? TENANT.soft : "#6B7280"}
          />
          <Text style={[styles.areasText, isTenant && styles.tenantAreasText]}>
            {notice.affectedAreas.slice(0, 3).join(", ")}
            {notice.affectedAreas.length > 3 &&
              ` +${notice.affectedAreas.length - 3} more`}
          </Text>
        </View>
      )}
    </>
  );

  if (canInteract) {
    return (
      <AnimatedButton
        style={[
          styles.container,
          isTenant && styles.tenantContainer,
          { backgroundColor: config.bgColor, borderColor: config.borderColor },
        ]}
        onPress={() => onPress?.(notice.id)}
      >
        {content}
      </AnimatedButton>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isTenant && styles.tenantContainer,
        { backgroundColor: config.bgColor, borderColor: config.borderColor },
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  tenantContainer: {
    borderRadius: 22,
    shadowColor: TENANT.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  tenantDescription: {
    color: TENANT.muted,
  },
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: "#6B7280",
  },
  tenantMetaText: {
    color: TENANT.soft,
  },
  areasContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tenantAreasContainer: {
    borderTopColor: TENANT.border,
  },
  areasText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  tenantAreasText: {
    color: TENANT.muted,
  },
});
