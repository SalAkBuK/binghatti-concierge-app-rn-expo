import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";

export default function BuildingEmployeeDashboard() {
  const { currentUser, notifications, actions } = useApp();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const buildingEmployee = useMemo(() => {
    if (!currentUser) return null;
    return actions.getBuildingEmployeeByUserId?.(currentUser.id) ?? null;
  }, [actions, currentUser]);

  const buildingId = buildingEmployee?.buildingId;

  const requests = useMemo(() => {
    if (!buildingId) return [];
    return actions.getRequestsByBuilding?.(buildingId) ?? [];
  }, [actions, buildingId]);

  const jobs = useMemo(() => {
    if (!buildingId) return [];
    return actions.getJobs?.({ buildingId }) ?? [];
  }, [actions, buildingId]);

  const bookings = useMemo(() => {
    if (!buildingId) return [];
    return actions.getBookingsByBuilding?.(buildingId) ?? [];
  }, [actions, buildingId]);

  const openRequests = useMemo(
    () =>
      requests.filter((request) =>
        request.status === "pending" || request.status === "in-progress"
      ),
    [requests],
  );

  const priorityRequests = useMemo(() => {
    return requests
      .filter((request) => request.priority === "urgent" || request.priority === "high")
      .slice(0, 3);
  }, [requests]);

  const totalJobsInProgress = useMemo(
    () => jobs.filter((job) => job.status === "in-progress").length,
    [jobs],
  );

  const pendingJobs = useMemo(
    () => jobs.filter((job) => job.status === "pending").length,
    [jobs],
  );

  const buildingName = useMemo(() => {
    if (!buildingEmployee?.buildingId) return "Building";
    const building = actions.getBuildingById?.(buildingEmployee.buildingId);
    return building?.name ?? "Building";
  }, [actions, buildingEmployee]);

  const hasUnreadNotifications =
    notifications?.some((notification) => !notification.read) ?? false;

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
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
          title={`${buildingName} Ops`}
          subtitle="Building employee workspace"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.welcomeCard}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {currentUser.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Good day, {currentUser.name}</Text>
            <Text style={styles.welcomeSubtitle}>
              You are on the {buildingEmployee?.shift ?? "day"} shift today. Stay ahead by reviewing the urgent tasks below.
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(400)}
          style={styles.statsGrid}
        >
          <View style={[styles.statCard, styles.statPrimary]}>
            <Ionicons name="alert-circle-outline" size={24} color="#1D4ED8" />
            <Text style={styles.statValue}>{openRequests.length}</Text>
            <Text style={styles.statLabel}>Open Requests</Text>
          </View>
          <View style={[styles.statCard, styles.statSecondary]}>
            <Ionicons name="construct-outline" size={24} color="#047857" />
            <Text style={styles.statValue}>{totalJobsInProgress}</Text>
            <Text style={styles.statLabel}>Jobs in Progress</Text>
          </View>
          <View style={[styles.statCard, styles.statQuaternary]}>
            <Ionicons name="calendar-outline" size={24} color="#9333EA" />
            <Text style={styles.statValue}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Amenity Bookings</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(400)}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Priority Requests</Text>
            <TouchableOpacity
              onPress={() => router.push("/(buildingEmployee)/requests")}
            >
              <Text style={styles.sectionAction}>View all</Text>
            </TouchableOpacity>
          </View>

          {priorityRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#A5B4FC" />
              <Text style={styles.emptyCardText}>No high priority requests</Text>
            </View>
          ) : (
            priorityRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.listItem}
                onPress={() =>
                  router.push({
                    pathname: "/(buildingEmployee)/requests",
                    params: { focusId: request.id },
                  })
                }
              >
                <View style={styles.listItemIcon}>
                  <Ionicons
                    name="warning-outline"
                    size={20}
                    color="#DC2626"
                  />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>
                    {request.title}
                  </Text>
                  <Text style={styles.listItemSubtitle} numberOfLines={1}>
                    {request.type.toUpperCase()} · {request.priority.toUpperCase()}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            ))
          )}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.sectionCard}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Job Queue Snapshot</Text>
            <TouchableOpacity
              onPress={() => router.push("/(buildingEmployee)/jobs")}
            >
              <Text style={styles.sectionAction}>Open jobs</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.jobSummaryRow}>
            <View style={styles.jobSummaryCard}>
              <Text style={styles.jobSummaryValue}>{pendingJobs}</Text>
              <Text style={styles.jobSummaryLabel}>Waiting Assignment</Text>
            </View>
            <View style={styles.jobSummaryCard}>
              <Text style={styles.jobSummaryValue}>{totalJobsInProgress}</Text>
              <Text style={styles.jobSummaryLabel}>In Progress</Text>
            </View>
            <View style={styles.jobSummaryCard}>
              <Text style={styles.jobSummaryValue}>
                {jobs.filter((job) => job.status === "completed").length}
              </Text>
              <Text style={styles.jobSummaryLabel}>Completed</Text>
            </View>
          </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  welcomeContent: {
    flex: 1,
    gap: 6,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    gap: 6,
  },
  statPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
  },
  statSecondary: {
    borderLeftWidth: 4,
    borderLeftColor: "#047857",
  },
  statQuaternary: {
    borderLeftWidth: 4,
    borderLeftColor: "#9333EA",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  emptyCard: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyCardText: {
    fontSize: 13,
    color: "#6B7280",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  listItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  listItemContent: {
    flex: 1,
    gap: 4,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  listItemSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  jobSummaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  jobSummaryCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    gap: 6,
  },
  jobSummaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  jobSummaryLabel: {
    fontSize: 12,
    color: "#6B7280",
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
