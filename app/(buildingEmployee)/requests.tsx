import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { TextStyle, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Request, RequestStatus } from "../../lib/types";

type StatusFilter = "all" | RequestStatus;

export default function BuildingEmployeeRequestsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [isUpdating, setIsUpdating] = useState(false);

  const buildingEmployee = useMemo(() => {
    if (!currentUser) return null;
    return actions.getBuildingEmployeeByUserId?.(currentUser.id) ?? null;
  }, [actions, currentUser]);

  const buildingId = buildingEmployee?.buildingId;

  const requests = useMemo(() => {
    if (!buildingId) return [];
    return actions.getRequestsByBuilding?.(buildingId) ?? [];
  }, [actions, buildingId]);

  const filteredRequests = useMemo(() => {
    if (selectedStatus === "all") {
      return requests;
    }
    return requests.filter((request) => request.status === selectedStatus);
  }, [requests, selectedStatus]);

  const hasUnreadNotifications =
    notifications?.some((notification) => !notification.read) ?? false;

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filters: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "In Progress", value: "in-progress" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const statusMeta: Record<
    RequestStatus,
    { label: string; bg: string; color: string }
  > = {
    pending: {
      label: "Pending",
      bg: "#FEF3C7",
      color: "#92400E",
    },
    "in-progress": {
      label: "In progress",
      bg: "#DBEAFE",
      color: "#1D4ED8",
    },
    completed: {
      label: "Completed",
      bg: "#DCFCE7",
      color: "#047857",
    },
    cancelled: {
      label: "Cancelled",
      bg: "#FEE2E2",
      color: "#B91C1C",
    },
  };

  const updateRequestStatus = (request: Request, status: RequestStatus) => {
    if (request.status === status) {
      return;
    }

    Alert.alert(
      "Update Status",
      `Mark this request as ${status.replace("-", " ")}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          onPress: async () => {
            try {
              setIsUpdating(true);
              await actions.updateRequest?.(request.id, { status });
              Alert.alert("Updated", "Request status updated successfully.");
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message || "Unable to update request status.",
              );
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ],
    );
  };

  const quickActionForStatus = (request: Request) => {
    if (request.status === "pending") {
      return {
        label: "Start Work",
        icon: "play-circle",
        nextStatus: "in-progress" as RequestStatus,
        color: "#2563EB",
      };
    }

    if (request.status === "in-progress") {
      return {
        label: "Mark Complete",
        icon: "checkmark-circle",
        nextStatus: "completed" as RequestStatus,
        color: "#047857",
      };
    }

    if (request.status === "completed") {
      return {
        label: "Reopen",
        icon: "refresh-circle",
        nextStatus: "in-progress" as RequestStatus,
        color: "#F97316",
      };
    }

    return null;
  };

  if (!currentUser || currentUser.role !== "building_employee") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Access Restricted</Text>
          <Text style={styles.emptySubtitle}>
            This workspace is only available to building employees.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <HeaderBar
          title="Service Requests"
          subtitle="Monitor and action tenant submissions"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.filtersContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {filters.map((filter) => {
              const active = selectedStatus === filter.value;
              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedStatus(filter.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(400)}
          style={styles.summaryRow}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {requests.filter((request) => request.status === "pending").length}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {
                requests.filter((request) => request.status === "in-progress")
                  .length
              }
            </Text>
            <Text style={styles.summaryLabel}>In Progress</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {requests.filter((request) => request.status === "completed").length}
            </Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(400)}
          style={styles.listContainer}
        >
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="clipboard-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyCardTitle}>No requests found</Text>
              <Text style={styles.emptyCardSubtitle}>
                Adjust your filters or check back later.
              </Text>
            </View>
          ) : (
            filteredRequests.map((request) => {
              const meta = statusMeta[request.status];
              const quickAction = quickActionForStatus(request);

              return (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View
                      style={[
                        styles.statusChip,
                        { backgroundColor: meta.bg },
                      ]}
                    >
                      <Text
                        style={[styles.statusChipText, { color: meta.color }]}
                      >
                        {meta.label}
                      </Text>
                    </View>
                    <Text style={styles.priorityText}>
                      Priority · {request.priority.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.requestTitle}>{request.title}</Text>
                  <Text style={styles.requestDescription} numberOfLines={3}>
                    {request.description}
                  </Text>
                  <View style={styles.footerRow}>
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.metaText}>
                        {request.tower || "Tower"} · {request.apartment || "Unit"}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="time-outline"
                        size={16}
                        color="#6B7280"
                      />
                      <Text style={styles.metaText}>
                        {new Date(request.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {quickAction && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: quickAction.color },
                      ]}
                      disabled={isUpdating}
                      onPress={() => updateRequestStatus(request, quickAction.nextStatus)}
                    >
                      <Ionicons
                        name={quickAction.icon as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.actionButtonText}>
                        {quickAction.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser.role}
      />
    </SafeAreaView>
  );
}

type Styles = {
  container: ViewStyle;
  scrollView: ViewStyle;
  scrollContent: ViewStyle;
  filtersContainer: ViewStyle;
  filtersScrollContent: ViewStyle;
  filterChip: ViewStyle;
  filterChipActive: ViewStyle;
  filterChipText: TextStyle;
  filterChipTextActive: TextStyle;
  summaryRow: ViewStyle;
  summaryCard: ViewStyle;
  summaryValue: TextStyle;
  summaryLabel: TextStyle;
  listContainer: ViewStyle;
  emptyCard: ViewStyle;
  emptyCardTitle: TextStyle;
  emptyCardSubtitle: TextStyle;
  requestCard: ViewStyle;
  requestHeader: ViewStyle;
  statusChip: ViewStyle;
  statusChipText: TextStyle;
  priorityText: TextStyle;
  requestTitle: TextStyle;
  requestDescription: TextStyle;
  footerRow: ViewStyle;
  metaRow: ViewStyle;
  metaText: TextStyle;
  actionButton: ViewStyle;
  actionButtonText: TextStyle;
  emptyState: ViewStyle;
  emptyTitle: TextStyle;
  emptySubtitle: TextStyle;
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  filtersContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  filtersScrollContent: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  listContainer: {
    gap: 16,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    paddingHorizontal: 24,
    textAlign: "center",
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  requestDescription: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 19,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
