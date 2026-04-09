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
import type { MaintenanceNotice, UserRole } from "../../lib/types";
import { AnimatedButton } from "../ui/AnimatedButton";
import { SkeletonCard } from "../ui/SkeletonCard";
import { NoticeItem } from "./NoticeItem";

interface NoticesListProps {
  notices: MaintenanceNotice[];
  userRole: UserRole;
  onPress?: (notice: MaintenanceNotice) => void;
  onDelete?: (id: string) => void;
  onAddNotice?: () => void;
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
  surfaceLow: "#F1F4F6",
};

export function NoticesList({
  notices,
  userRole,
  onPress,
  onDelete,
  onAddNotice,
  onClearAll,
  onRefresh,
  loading = false,
  variant = "default",
  clearingAll = false,
}: NoticesListProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active">("all");
  const isTenant = variant === "tenant";

  const isAdmin = userRole === "admin" || userRole === "management";
  const showClearAll = Boolean(onClearAll && notices.length > 0);

  // Filter and sort notices
  const filteredNotices = useMemo(() => {
    let filtered = notices;

    if (filter === "active") {
      filtered = notices.filter(
        (notice) =>
          notice.status === "scheduled" || notice.status === "in-progress",
      );
    }

    return filtered.sort((a, b) => {
      // Sort by status priority first
      const statusPriority = {
        "in-progress": 0,
        scheduled: 1,
        completed: 2,
        cancelled: 3,
      };
      const aPriority = statusPriority[a.status];
      const bPriority = statusPriority[b.status];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Then by date
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [notices, filter]);

  const activeCount = useMemo(() => {
    return notices.filter(
      (n) => n.status === "scheduled" || n.status === "in-progress",
    ).length;
  }, [notices]);

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

  const handleDelete = (id: string) => {
    if (!onDelete) return;

    Alert.alert(
      "Delete Notice",
      "Are you sure you want to delete this maintenance notice?",
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
          height={160}
          borderRadius={12}
          style={styles.skeletonItem}
        />
        <SkeletonCard
          width="100%"
          height={160}
          borderRadius={12}
          style={styles.skeletonItem}
        />
        <SkeletonCard
          width="100%"
          height={160}
          borderRadius={12}
          style={styles.skeletonItem}
        />
      </View>
    );
  }

  // Empty State
  if (filteredNotices.length === 0) {
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
          name="megaphone-outline"
          size={64}
          color={isTenant ? TENANT.soft : "#D1D5DB"}
        />
        <Text style={[styles.emptyTitle, isTenant && styles.tenantEmptyTitle]}>
          {filter === "active" ? "No Active Notices" : "No Notices"}
        </Text>
        <Text style={[styles.emptyText, isTenant && styles.tenantEmptyText]}>
          {filter === "active"
            ? `There are no active maintenance notices at this time.`
            : `No building-wide notices have been posted yet.`}
        </Text>

        {isAdmin && onAddNotice && (
          <AnimatedButton style={styles.addButton} onPress={onAddNotice}>
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Create Notice</Text>
          </AnimatedButton>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <AnimatedButton
          style={[
            styles.filterButton,
            filter === "all" && styles.filterButtonActive,
            isTenant && styles.tenantFilterButton,
            filter === "all" && isTenant && styles.tenantFilterButtonActive,
          ]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
              isTenant && styles.tenantFilterText,
              filter === "all" && isTenant && styles.tenantFilterTextActive,
            ]}
          >
            All ({notices.length})
          </Text>
        </AnimatedButton>

        {!isTenant ? (
          <AnimatedButton
            style={[
              styles.filterButton,
              filter === "active" && styles.filterButtonActive,
              styles.tenantFilterButton,
              filter === "active" && styles.tenantFilterButtonActive,
            ]}
            onPress={() => setFilter("active")}
          >
            <Text
              style={[
                styles.filterText,
                filter === "active" && styles.filterTextActive,
                styles.tenantFilterText,
                filter === "active" && styles.tenantFilterTextActive,
              ]}
            >
              Active ({activeCount})
            </Text>
          </AnimatedButton>
        ) : null}

        {(isAdmin && onAddNotice) || showClearAll ? <View style={styles.spacer} /> : null}

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
                styles.clearAllButtonText,
                isTenant && styles.tenantClearAllButtonText,
              ]}
            >
              {clearingAll ? "Clearing..." : "Clear All"}
            </Text>
          </AnimatedButton>
        ) : null}

        {isAdmin && onAddNotice && (
          <AnimatedButton style={styles.addIconButton} onPress={onAddNotice}>
            <Ionicons
              name="add-circle"
              size={24}
              color={isTenant ? TENANT.primary : "#3B82F6"}
            />
          </AnimatedButton>
        )}
      </View>

      {/* Notices List */}
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
        {filteredNotices.map((notice, index) => (
          <Animated.View
            key={notice.id}
            entering={FadeInDown.delay(index * 50).duration(400)}
          >
            <NoticeItem
              notice={notice}
              userRole={userRole}
              onPress={() => onPress?.(notice)}
              onDelete={isAdmin ? handleDelete : undefined}
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
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    alignItems: "center",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterButtonActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  tenantFilterButton: {
    backgroundColor: TENANT.surfaceLow,
    borderColor: TENANT.border,
    borderRadius: 999,
  },
  tenantFilterButtonActive: {
    backgroundColor: "#E8F1F4",
    borderColor: TENANT.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  tenantFilterText: {
    color: TENANT.muted,
    fontWeight: "700",
  },
  filterTextActive: {
    color: "#3B82F6",
  },
  tenantFilterTextActive: {
    color: TENANT.primaryDark,
  },
  spacer: {
    flex: 1,
  },
  addIconButton: {
    padding: 4,
  },
  clearAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  clearAllButtonDisabled: {
    opacity: 0.7,
  },
  clearAllButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
  },
  tenantClearAllButton: {
    backgroundColor: "#FFF1F0",
    borderColor: "#F2D4CF",
  },
  tenantClearAllButtonText: {
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
    marginBottom: 24,
  },
  tenantEmptyTitle: {
    color: TENANT.text,
  },
  tenantEmptyText: {
    color: TENANT.muted,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottomSpacing: {
    height: 40,
  },
});
