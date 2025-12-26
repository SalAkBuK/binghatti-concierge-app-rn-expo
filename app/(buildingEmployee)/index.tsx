import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
import apiService from "../../lib/services/api";
import { maintenanceApi } from "../../lib/services/api/maintenance";

type MaintenanceRequest = {
  id: number;
  title: string;
  description?: string;
  priority: number;
  status: number;
  createdAt: string;
  updatedAt?: string;
  buildingId?: number;
  buildingName?: string;
};

type BuildingAssignment = {
  id: number;
  name: string;
  address?: string;
};

export default function BuildingEmployeeDashboard() {
  const { isAuthenticated, currentUser, notifications } = useApp();
  const tabBarHeight = useBottomTabBarHeight();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assignedBuildings, setAssignedBuildings] = useState<BuildingAssignment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [myAssignedRequests, setMyAssignedRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  // Fetch assigned buildings and maintenance requests
  useEffect(() => {
    const fetchData = async () => {
      console.log('[BuildingEmployee] fetchData useEffect triggered');

      if (!currentUser?.id) {
        console.log('[BuildingEmployee] No currentUser.id, skipping fetch');
        setIsLoading(false);
        return;
      }

      console.log('[BuildingEmployee] Starting data fetch for user:', currentUser.id);
      setIsLoading(true);
      try {
        console.log('[BuildingEmployee] Fetching assigned buildings for staff:', currentUser.id);

        // Get staff ID (similar to jobs.tsx logic)
        const staffId = Number(
          (currentUser as any).staffId ||
            (currentUser as any).maintenanceStaffId ||
            (currentUser.profile as any)?.staffId ||
            currentUser.id,
        );

        // Fetch buildings assigned to this maintenance staff
        const buildingsResponse = await apiService.maintenance.getBuildingsByStaffId(currentUser.id);
        if (buildingsResponse.success && buildingsResponse.data) {
          console.log('[BuildingEmployee] Assigned buildings fetched:', buildingsResponse.data.length);
          console.log('[BuildingEmployee] Building IDs:', buildingsResponse.data.map((b: any) => b.id));
          setAssignedBuildings(buildingsResponse.data);

          // Fetch maintenance requests for each building (building-level stats)
          console.log('[BuildingEmployee] Fetching requests for', buildingsResponse.data.length, 'buildings');
          const requestPromises = buildingsResponse.data.map(async (building) => {
            try {
              const response = await apiService.maintenance.getMaintenanceRequestsByBuildingId(building.id);
              if (response.success && response.data) {
                return response.data.map((request: any) => ({
                  ...request,
                  buildingId: building.id,
                  buildingName: building.name,
                }));
              }
              return [];
            } catch (error) {
              console.error(`[BuildingEmployee] Failed to fetch requests for building ${building.id}:`, error);
              return [];
            }
          });

          const requestArrays = await Promise.all(requestPromises);
          const allRequests = requestArrays.flat();
          console.log('[BuildingEmployee] All building requests fetched:', allRequests.length);
          setMaintenanceRequests(allRequests);
          console.log('[BuildingEmployee] State updated - Total maintenance requests:', allRequests.length);
        } else {
          console.log('[BuildingEmployee] No buildings assigned to this staff');
          setAssignedBuildings([]);
          setMaintenanceRequests([]);
        }

        // Fetch requests assigned specifically to this staff member
        console.log('[BuildingEmployee] Fetching staff-specific requests for staffId:', staffId);
        if (Number.isFinite(staffId)) {
          try {
            const myRequestsResponse = await maintenanceApi.getMaintenanceRequestsByStaffId(staffId);
            if (myRequestsResponse.success && Array.isArray(myRequestsResponse.data)) {
              const mappedRequests = myRequestsResponse.data.map((item: any) => ({
                id: item.id,
                title: item.title || "Maintenance request",
                description: item.description || "",
                priority: item.priority,
                status: item.status,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                buildingId: item.buildingId ?? item.building?.id,
                buildingName: item.buildingName,
              }));
              console.log('[BuildingEmployee] Staff requests fetched:', mappedRequests.length);
              setMyAssignedRequests(mappedRequests);
              console.log('[BuildingEmployee] State updated - My assigned requests:', mappedRequests.length);
            } else {
              console.log('[BuildingEmployee] No staff requests found or invalid response');
              setMyAssignedRequests([]);
            }
          } catch (error) {
            console.error('[BuildingEmployee] Failed to fetch my assigned requests:', error);
            setMyAssignedRequests([]);
          }
        } else {
          console.log('[BuildingEmployee] Invalid staffId, skipping staff-specific requests');
        }
      } catch (error) {
        console.error('[BuildingEmployee] Failed to fetch dashboard data:', error);
        setAssignedBuildings([]);
        setMaintenanceRequests([]);
        setMyAssignedRequests([]);
      } finally {
        console.log('[BuildingEmployee] Data fetch completed, setIsLoading(false)');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id]);

  const openRequests = useMemo(
    () =>
      maintenanceRequests.filter((request) =>
        request.status === 1 || request.status === 2 || request.status === 3 // New, Assigned, In Progress
      ),
    [maintenanceRequests],
  );

  const priorityRequests = useMemo(() => {
    return myAssignedRequests
      .filter((request) => request.priority === 4 || request.priority === 3) // Urgent or High
      .sort((a, b) => b.priority - a.priority) // Sort by priority descending
      .slice(0, 3);
  }, [myAssignedRequests]);

  const totalJobsInProgress = useMemo(
    () => maintenanceRequests.filter((request) => request.status === 3).length, // In Progress
    [maintenanceRequests],
  );

  const pendingJobs = useMemo(
    () => maintenanceRequests.filter((request) => request.status === 1 || request.status === 2).length, // New or Assigned
    [maintenanceRequests],
  );

  const completedJobs = useMemo(
    () => maintenanceRequests.filter((request) => request.status === 5).length, // Completed
    [maintenanceRequests],
  );

  const buildingName = assignedBuildings.length > 0 ? assignedBuildings[0].name : "Building";

  const hasUnreadNotifications =
    notifications?.some((notification) => !notification.read) ?? false;

  const onRefresh = async () => {
    console.log('[BuildingEmployee] Refresh triggered');

    if (!currentUser?.id) {
      console.log('[BuildingEmployee] No currentUser.id, skipping refresh');
      return;
    }

    setRefreshing(true);
    try {
      // Get staff ID
      const staffId = Number(
        (currentUser as any).staffId ||
          (currentUser as any).maintenanceStaffId ||
          (currentUser.profile as any)?.staffId ||
          currentUser.id,
      );
      console.log('[BuildingEmployee] Refresh - staffId:', staffId);

      // Refetch buildings and building-level requests
      console.log('[BuildingEmployee] Refresh - fetching buildings');
      const buildingsResponse = await apiService.maintenance.getBuildingsByStaffId(currentUser.id);
      if (buildingsResponse.success && buildingsResponse.data) {
        console.log('[BuildingEmployee] Refresh - buildings fetched:', buildingsResponse.data.length);
        setAssignedBuildings(buildingsResponse.data);

        const requestPromises = buildingsResponse.data.map(async (building) => {
          try {
            const response = await apiService.maintenance.getMaintenanceRequestsByBuildingId(building.id);
            if (response.success && response.data) {
              return response.data.map((request: any) => ({
                ...request,
                buildingId: building.id,
                buildingName: building.name,
              }));
            }
            return [];
          } catch (error) {
            console.error(`Failed to fetch requests for building ${building.id}:`, error);
            return [];
          }
        });

        const requestArrays = await Promise.all(requestPromises);
        const allRequests = requestArrays.flat();
        console.log('[BuildingEmployee] Refresh - building requests fetched:', allRequests.length);
        setMaintenanceRequests(allRequests);
      }

      // Refetch my assigned requests
      console.log('[BuildingEmployee] Refresh - fetching staff-specific requests');
      if (Number.isFinite(staffId)) {
        try {
          const myRequestsResponse = await maintenanceApi.getMaintenanceRequestsByStaffId(staffId);
          if (myRequestsResponse.success && Array.isArray(myRequestsResponse.data)) {
            const mappedRequests = myRequestsResponse.data.map((item: any) => ({
              id: item.id,
              title: item.title || "Maintenance request",
              description: item.description || "",
              priority: item.priority,
              status: item.status,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              buildingId: item.buildingId ?? item.building?.id,
              buildingName: item.buildingName,
            }));
            console.log('[BuildingEmployee] Refresh - staff requests fetched:', mappedRequests.length);
            setMyAssignedRequests(mappedRequests);
          } else {
            console.log('[BuildingEmployee] Refresh - no staff requests found');
            setMyAssignedRequests([]);
          }
        } catch (error) {
          console.error('[BuildingEmployee] Failed to refresh my assigned requests:', error);
          setMyAssignedRequests([]);
        }
      }
    } catch (error) {
      console.error('[BuildingEmployee] Failed to refresh:', error);
    } finally {
      console.log('[BuildingEmployee] Refresh completed, setRefreshing(false)');
      setRefreshing(false);
    }
  };

  // Helper to get priority label
  const getPriorityLabel = (priority: number): string => {
    const priorityMap: Record<number, string> = {
      1: 'Low',
      2: 'Medium',
      3: 'High',
      4: 'Urgent',
    };
    return priorityMap[priority] || 'Unknown';
  };

  // Helper to get status label
  const getStatusLabel = (status: number): string => {
    const statusMap: Record<number, string> = {
      1: 'New',
      2: 'Assigned',
      3: 'In Progress',
      4: 'On Hold',
      5: 'Completed',
      6: 'Cancelled',
    };
    return statusMap[status] || 'Unknown';
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (currentUser.role !== "building_employee") {
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight + 32 },
        ]}
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
              {assignedBuildings.length > 0
                ? `Assigned to ${assignedBuildings.length} building${assignedBuildings.length > 1 ? 's' : ''}. Stay ahead by reviewing the urgent tasks below.`
                : 'Loading your assignments...'}
            </Text>
          </View>
        </Animated.View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading dashboard data...</Text>
          </View>
        ) : (
          <>
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
                <Text style={styles.statValue}>{completedJobs}</Text>
                <Text style={styles.statLabel}>Completed Jobs</Text>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(120).duration(400)}
              style={styles.sectionCard}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Priority Requests</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(buildingEmployee)/jobs")}
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
                        pathname: "/(buildingEmployee)/jobs",
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
                        {getStatusLabel(request.status)} · {getPriorityLabel(request.priority)}
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
                  <Text style={styles.jobSummaryValue}>{completedJobs}</Text>
                  <Text style={styles.jobSummaryLabel}>Completed</Text>
                </View>
              </View>
            </Animated.View>
          </>
        )}
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
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
