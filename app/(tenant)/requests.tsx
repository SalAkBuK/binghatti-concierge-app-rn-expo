import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import ChevronIcon from "../../components/icons/ChevronIcon";
import { AnimatedButton } from "../../components/ui/AnimatedButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { RequestsScreenSkeleton } from "../../components/ui/RequestsScreenSkeleton";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Request, RequestStatus } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type FilterStatus = "all" | RequestStatus;

export default function RequestsScreen() {
  const { requests, currentUser, notifications, actions } = useApp();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showSideMenu, setShowSideMenu] = useState(false);

  useEffect(() => {
    // Simulate minimum loading time for smooth animation
    const timer = setTimeout(() => {
      if (currentUser && requests) {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentUser, requests]);

  // Filter requests for current user
  const userRequests = useMemo(() => {
    const filtered = requests.filter((req) => req.tenantId === currentUser?.id);

    if (filterStatus === "all") {
      return filtered;
    }

    return filtered.filter((req) => req.status === filterStatus);
  }, [requests, currentUser, filterStatus]);

  // Calculate stats based on user's requests
  const stats = useMemo(() => {
    const statusCounts = userRequests.reduce(
      (counts, req) => {
        counts[req.status] = (counts[req.status] || 0) + 1;
        return counts;
      },
      {} as Record<RequestStatus, number>,
    );

    return {
      total: userRequests.length,
      pending: statusCounts.pending || 0,
      "in-progress": statusCounts["in-progress"] || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
    };
  }, [userRequests]);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    // Simulate refresh - in real app you'd fetch latest data
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return { bg: "#fef3c7", text: "#92400e" };
      case "in-progress":
        return { bg: "#dbeafe", text: "#1d4ed8" };
      case "completed":
        return { bg: "#d1fae5", text: "#065f46" };
      case "cancelled":
        return { bg: "#fee2e2", text: "#dc2626" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  const getPriorityColor = (priority: Request["priority"]) => {
    switch (priority) {
      case "urgent":
        return "#dc2626";
      case "high":
        return "#ea580c";
      case "medium":
        return "#d97706";
      case "low":
        return "#65a30d";
      default:
        return "#6b7280";
    }
  };

  const getPriorityBgColor = (priority: Request["priority"]) => {
    switch (priority) {
      case "urgent":
        return "#FBDDDD";
      case "high":
        return "#FFEDD5";
      case "medium":
        return "#FEF3C7";
      case "low":
        return "#D1FAE5";
      default:
        return "#F3F4F6";
    }
  };

  const getPriorityTextColor = (priority: Request["priority"]) => {
    switch (priority) {
      case "urgent":
        return "#dc2626";
      case "high":
        return "#ea580c";
      case "medium":
        return "#d97706";
      case "low":
        return "#065f46";
      default:
        return "#6b7280";
    }
  };

  const handleRequestPress = (request: Request): void => {
    actions.setSelectedRequest(request);
    router.push("/(modals)/request-details");
  };

  // Calculate unread notifications
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // FilterButton component removed - not used in current UI

  if (isLoading) {
    return <RequestsScreenSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <HeaderBar
          title="My Requests"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        {/* Stats Cards */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.statsContainer}
        >
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.totalCard]}>
              <Text style={[styles.statNumber, { color: "#1F2937" }]}>
                0{stats.total}
              </Text>
              <Text style={styles.statLabel}>Total Requests</Text>
            </View>
            <View style={[styles.statCard, styles.completedCard]}>
              <Text style={[styles.statNumber, { color: "#1F2937" }]}>
                0{stats.completed}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.inProgressCard]}>
              <Text style={[styles.statNumber, { color: "#1F2937" }]}>
                0{stats["in-progress"]}
              </Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={[styles.statCard, styles.pendingCard]}>
              <Text style={[styles.statNumber, { color: "#1F2937" }]}>
                0{stats.pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </Animated.View>

        {/* Past Requests Section */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.pastRequestsContainer}
        >
          <Text style={styles.pastRequestsTitle}>Past Requests</Text>

          {/* Requests List */}
          <View style={styles.requestsList}>
          {userRequests.length > 0 ? (
            userRequests.map((request) => {
              const statusColors = getStatusColor(request.status);
              const priorityColor = getPriorityColor(request.priority);

              return (
                <AnimatedButton
                  key={request.id}
                  style={styles.requestCard}
                  onPress={() => handleRequestPress(request)}
                >
                  <View style={styles.requestContent}>
                    {/* Header row with title and chevron */}
                    <View style={styles.requestHeader}>
                      <Text style={styles.requestTitle} numberOfLines={1}>
                        {request.title}
                      </Text>
                      <ChevronIcon
                        size={11}
                        color="#000000"
                        opacity={0.5}
                      />
                    </View>

                    {/* Subtitle text */}
                    <Text style={styles.requestType}>
                      {request.type.toUpperCase()}
                    </Text>

                    {/* Status containers */}
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusPill, {backgroundColor: statusColors.bg}]}>
                        <Text style={[styles.statusText, {color: statusColors.text}]}>
                          {request.status.replace('-', ' ').toUpperCase()}
                        </Text>
                      </View>
                      <View style={[styles.priorityPill, {backgroundColor: getPriorityBgColor(request.priority)}]}>
                        <Text style={[styles.priorityText, {color: getPriorityTextColor(request.priority)}]}>
                          {request.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {/* Body text */}
                    <Text style={styles.requestDescription} numberOfLines={3}>
                      {request.description}
                    </Text>

                    {/* Date and time */}
                    <Text style={styles.requestDate}>
                      {new Date(request.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}, {new Date(request.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                  </View>
                </AnimatedButton>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyStateTitle}>No requests found</Text>
              <Text style={styles.emptyStateText}>
                {filterStatus === "all"
                  ? "You haven't submitted any requests yet"
                  : `No ${filterStatus} requests found`}
              </Text>
            </View>
          )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Side Menu */}
      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 30,
    paddingHorizontal: 10,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  notificationButton: {
    padding: 8,
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#fff",
  },
  statsContainer: {
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 5,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: SCREEN_WIDTH * 0.055,
    minHeight: 132,
    justifyContent: "center",
    maxWidth: SCREEN_WIDTH * 0.45,
  },
  totalCard: {
    backgroundColor: "#E7EFF8",
  },
  completedCard: {
    backgroundColor: "#A7F3D0",
  },
  inProgressCard: {
    backgroundColor: "#FEF3C7",
  },
  pendingCard: {
    backgroundColor: "#FED7AA",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  pastRequestsContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    width: SCREEN_WIDTH * 0.9,
    alignSelf: "center",
  },
  pastRequestsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 20,
  },
  requestsList: {
    // No additional margin needed as it's inside the container
  },
  requestCard: {
    backgroundColor: "#FBFBFC",
    borderRadius: 8,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D5DEE8",
    width: "100%",
    minHeight: 232,
  },
  requestContent: {
    flex: 1,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingRight: 4,
  },
  requestTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#000000",
    fontFamily: "Manrope",
    lineHeight: 18,
    letterSpacing: 0,
    flex: 1,
    marginRight: 8,
  },
  requestType: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000000",
    fontFamily: "Manrope",
    lineHeight: 20,
    letterSpacing: 0,
    opacity: 0.7,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  statusPill: {
    width: 68,
    height: 26,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  priorityPill: {
    width: 68,
    height: 26,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Manrope",
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "Manrope",
  },
  requestDescription: {
    fontSize: 12,
    fontWeight: "normal",
    color: "#000000",
    fontFamily: "Manrope",
    lineHeight: 20,
    letterSpacing: 0,
    opacity: 0.74,
    marginBottom: 16,
    height: 61,
  },
  requestDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000000",
    fontFamily: "Manrope",
    lineHeight: 20,
    letterSpacing: 0,
    opacity: 1,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
});
