import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ManagementTile } from "../../components/management/ManagementTile";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { orgBuildingsApi } from "../../lib/services/api/org-buildings";
import type { Building, NotificationType, Request, RequestPriority, RequestStatus } from "../../lib/types";
import {
  filterNotificationsByUser,
} from "../../lib/utils/helpers";

// Helper function to map backend status to frontend status
const mapStatusFromApi = (status: any): RequestStatus => {
  if (typeof status === "number") {
    switch (status) {
      case 0:
      case 1:
        return "pending";
      case 2:
        return "assigned";
      case 3:
        return "in-progress";
      case 4:
        return "on-hold";
      case 5:
        return "completed";
      case 6:
        return "cancelled";
      default:
        return "pending";
    }
  }

  const normalized = String(status || "").toUpperCase();
  if (["OPEN"].includes(normalized)) return "pending";
  if (["ASSIGNED"].includes(normalized)) return "assigned";
  if (["IN_PROGRESS"].includes(normalized)) return "in-progress";
  if (["ON_HOLD"].includes(normalized)) return "on-hold";
  if (["COMPLETED"].includes(normalized)) return "completed";
  if (["CANCELED", "CANCELLED"].includes(normalized)) return "cancelled";
  return "pending";
};

// Helper function to map backend priority to frontend priority
const mapPriorityFromApi = (priority: any): RequestPriority => {
  if (typeof priority === "number") {
    switch (priority) {
      case 1:
        return "low";
      case 2:
        return "medium";
      case 3:
        return "high";
      case 4:
        return "urgent";
      default:
        return "medium";
    }
  }

  const normalized = String(priority || "").toUpperCase();
  if (normalized === "LOW") return "low";
  if (normalized === "NORMAL" || normalized === "MEDIUM") return "medium";
  if (normalized === "HIGH") return "high";
  if (normalized === "URGENT") return "urgent";
  return "medium";
};

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

const BROADCAST_TYPES: {
  label: string;
  value: NotificationType;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  description: string;
}[] = [
  {
    label: "Info",
    value: "info",
    icon: "information-circle",
    description: "General updates and reminders",
  },
  {
    label: "Success",
    value: "success",
    icon: "checkmark-circle",
    description: "Positive news or confirmations",
  },
  {
    label: "Warning",
    value: "warning",
    icon: "alert-circle",
    description: "Cautionary notices requiring attention",
  },
  {
    label: "Alert",
    value: "error",
    icon: "warning",
    description: "Critical incidents or outages",
  },
];

const BROADCAST_TYPE_VISUALS: Record<
  NotificationType,
  { background: string; border: string; text: string }
> = {
  info: {
    background: "#DBEAFE",
    border: "#BFDBFE",
    text: "#1D4ED8",
  },
  success: {
    background: "#DCFCE7",
    border: "#BBF7D0",
    text: "#15803D",
  },
  warning: {
    background: "#FEF3C7",
    border: "#FDE68A",
    text: "#B45309",
  },
  error: {
    background: "#FEE2E2",
    border: "#FCA5A5",
    text: "#B91C1C",
  },
};

export default function ManagementDashboard() {
  const { currentUser, notifications, actions } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] =
    useState<NotificationType>("info");
  const [isSending, setIsSending] = useState(false);
  const [managedBuildings, setManagedBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [buildingRequests, setBuildingRequests] = useState<Request[]>([]);

  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  const isLargeDesktop = width >= 1280;

  const pagePadding = isLargeDesktop ? 48 : isDesktop ? 40 : isTablet ? 28 : 20;
  const sectionSpacing = isDesktop ? 28 : isTablet ? 22 : 16;
  const broadcastFooterInset = Math.max(insets.bottom, 16);
  const broadcastContentBottomPadding = broadcastFooterInset + 100;

  const analytics = useMemo(() => actions.getAnalytics(), [actions]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const mapAssignedBuildings = (payload: any[]): Building[] =>
    payload.map((building: any): Building => ({
      id: String(building?.id ?? building?.buildingId ?? ""),
      name:
        building?.name ||
        building?.buildingName ||
        building?.title ||
        "Building",
      address: building?.address || "",
      city: building?.city || "",
      country: building?.country || "",
      emirate: building?.emirate,
      community: building?.community,
      street: building?.street,
      plotNumber: building?.plotNumber,
      buildingNumber: building?.buildingNumber,
      makaniNumber: building?.makaniNumber,
      buildingType: building?.buildingType,
      developer: building?.developer,
      yearBuilt: building?.yearBuilt,
      totalFloors: building?.totalFloors,
      utilityPremisesNumber: building?.utilityPremisesNumber,
      managerId: building?.managerId,
      managerName: building?.managerName,
      totalUnits: building?.totalUnits ?? 0,
      occupiedUnits: building?.occupiedUnits ?? 0,
      unitBreakdown: building?.unitBreakdown,
      amenities: building?.amenities ?? [],
      status: building?.status ?? "active",
      createdAt: building?.createdAt ?? new Date().toISOString(),
      updatedAt: building?.updatedAt ?? new Date().toISOString(),
      location: building?.location,
      units: building?.units,
    }));

  const attachBuildingCounts = async (buildings: Building[]) => {
    if (!buildings.length) return buildings;

    const updated = await Promise.all(
      buildings.map(async (building) => {
        if (!building.id) return building;
        try {
          const [occupancyResponse, unitsResponse] = await Promise.all([
            orgBuildingsApi.getOccupancyCount(building.id),
            orgBuildingsApi.getUnitsCount(building.id),
          ]);
          const occupancyPayload =
            (occupancyResponse as any)?.data ?? occupancyResponse ?? {};
          const unitsPayload =
            (unitsResponse as any)?.data ?? unitsResponse ?? {};
          const active =
            typeof occupancyPayload?.active === "number"
              ? occupancyPayload.active
              : undefined;
          const total =
            typeof unitsPayload?.total === "number" ? unitsPayload.total : undefined;
          const vacant =
            typeof unitsPayload?.vacant === "number" ? unitsPayload.vacant : undefined;
          const derivedActive =
            total != null && vacant != null ? Math.max(0, total - vacant) : undefined;

          return {
            ...building,
            totalUnits: total ?? building.totalUnits,
            occupiedUnits:
              active ?? derivedActive ?? building.occupiedUnits,
          };
        } catch (error) {
          console.warn(
            "[Management] Failed to fetch unit/occupancy counts for building:",
            building.id,
            error,
          );
          return building;
        }
      }),
    );

    return updated;
  };

  // Fetch buildings assigned to this manager from the API
  useEffect(() => {
    const fetchBuildings = async () => {
      if (!currentUser?.id) {
        setLoadingBuildings(false);
        return;
      }

      setLoadingBuildings(true);
      try {
        console.log("[Management] Fetching assigned buildings for manager:", currentUser.id);
        const response = await orgBuildingsApi.getAssignedBuildings();
        const buildingsPayload = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        if (buildingsPayload.length > 0) {
          const mappedBuildings = mapAssignedBuildings(buildingsPayload);
          const buildingsWithCounts = await attachBuildingCounts(mappedBuildings);
          console.log("[Management] Buildings fetched:", mappedBuildings.length);
          setManagedBuildings(buildingsWithCounts);
          // Note: selectedBuildingId and broadcastScope are set by the sync useEffect
        } else {
          console.log("[Management] No buildings assigned to this manager");
          setManagedBuildings([]);
          setSelectedBuildingId(null);
          setBroadcastScope([]);
        }
      } catch (error) {
        console.error('[Management] Failed to fetch buildings:', error);
        setManagedBuildings([]);
        setSelectedBuildingId(null);
        setBroadcastScope([]);
      } finally {
        setLoadingBuildings(false);
      }
    };

    fetchBuildings();
  }, [currentUser?.id]);

  // Open broadcast modal if parameter is present
  useEffect(() => {
    if (params.openBroadcastModal === "true") {
      setShowBroadcastModal(true);
      // Clear the parameter to avoid reopening on re-render
      router.setParams({ openBroadcastModal: undefined } as any);
    }
  }, [params.openBroadcastModal, router]);

  // State for selected building and broadcast scope
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [broadcastScope, setBroadcastScope] = useState<string[]>([]);

  // Fetch requests for the selected building
  useEffect(() => {
    const fetchBuildingRequests = async () => {
      if (!selectedBuildingId) {
        setBuildingRequests([]);
        return;
      }

      try {
        console.log("[Management] Fetching requests for building:", selectedBuildingId);
        const response = await orgBuildingsApi.getBuildingRequests(selectedBuildingId);
        const payload = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        if (payload.length > 0) {
          const buildingName = managedBuildings.find(
            (building) => building.id === selectedBuildingId,
          )?.name;
          const mappedRequests: Request[] = payload.map((item: any) => {
            const unit = item.unit || item.unitDetails;
            return {
              id: String(item.id),
              type: "maintenance",
              buildingId: String(item.buildingId ?? selectedBuildingId),
              buildingName: item.buildingName || buildingName,
              tenantId:
                item.createdByUserId != null
                  ? String(item.createdByUserId)
                  : item.createdById != null
                    ? String(item.createdById)
                    : "",
              title: item.title || "Untitled Request",
              description: item.description || "",
              status: mapStatusFromApi(item.status),
              priority: mapPriorityFromApi(item.priority),
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
              apartment:
                unit?.label ||
                item.unitLabel ||
                item.unitNumber ||
                item.apartment ||
                "",
              floor:
                item.floorNumber != null
                  ? String(item.floorNumber)
                  : unit?.floor != null
                    ? String(unit.floor)
                    : "",
              contactPhone: item.contactPhone || "",
              preferredTime: item.preferredTime || "",
              additionalNotes: item.additionalNotes || "",
              assignedTo:
                item.assignedTo?.fullName ||
                item.assignedTo?.name ||
                item.assignedTo?.email ||
                (item.assignedToId ? String(item.assignedToId) : undefined),
              attachments: Array.isArray(item.attachments)
                ? item.attachments
                    .map((att: any) => att.fileUrl || att.url || att.uri || "")
                    .filter(Boolean)
                : [],
              comments: [],
              messages: [],
              notes: [],
              timeline: [],
            } as Request;
          });

          console.log("[Management] Mapped requests:", mappedRequests.length);
          setBuildingRequests(mappedRequests);
        } else {
          setBuildingRequests([]);
        }
      } catch (error) {
        console.error('[Management] Failed to fetch building requests:', error);
        setBuildingRequests([]);
      }
    };

    fetchBuildingRequests();
  }, [selectedBuildingId, managedBuildings]);

  const allManagedBuildingIds = useMemo(
    () => managedBuildings.map((building) => building.id),
    [managedBuildings],
  );

  // Sync state when managed buildings change
  useEffect(() => {
    console.log('[Management] Sync useEffect running, managedBuildings:', managedBuildings.length);

    if (managedBuildings.length === 0) {
      console.log('[Management] No buildings, clearing selection');
      setSelectedBuildingId((prev) => (prev !== null ? null : prev));
      setBroadcastScope((prev) => (prev.length > 0 ? [] : prev));
      return;
    }

    setSelectedBuildingId((prev) => {
      if (!prev || !managedBuildings.some((b) => b.id === prev)) {
        console.log('[Management] Setting selectedBuildingId to first building:', managedBuildings[0].id);
        return managedBuildings[0].id;
      }
      console.log('[Management] Keeping current selectedBuildingId:', prev);
      return prev;
    });

    setBroadcastScope((prev) => {
      const valid = prev.filter((id) =>
        managedBuildings.some((b) => b.id === id),
      );
      if (valid.length > 0) {
        // Only return new array if content actually changed
        if (valid.length === prev.length && valid.every((id, i) => id === prev[i])) {
          return prev;
        }
        return valid;
      }
      const fallbackId = managedBuildings[0]?.id;
      console.log('[Management] Setting broadcastScope to first building:', fallbackId);
      return fallbackId ? [fallbackId] : prev;
    });
  }, [managedBuildings]);

  // Create management snapshot from API-fetched building data
  const managementSnapshot = useMemo(() => {
    console.log('[Management] Calculating snapshot - selectedBuildingId:', selectedBuildingId, 'requests:', buildingRequests.length);

    if (!selectedBuildingId || !managedBuildings.length) {
      console.log('[Management] No selectedBuildingId or buildings, returning null snapshot');
      return null;
    }

    const selectedBuilding = managedBuildings.find(b => b.id === selectedBuildingId);
    if (!selectedBuilding) {
      console.log('[Management] Selected building not found, returning null snapshot');
      return null;
    }

    // Calculate metrics from building requests
    const pendingCount = buildingRequests.filter(r => r.status === "pending").length;
    const inProgressCount = buildingRequests.filter(r => r.status === "in-progress").length;
    const completedCount = buildingRequests.filter(r => r.status === "completed").length;
    const totalRequests = buildingRequests.length;
    const completionRate = totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 0;

    // Get today's requests (created today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestsToday = buildingRequests.filter(r => {
      const createdDate = new Date(r.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      return createdDate.getTime() === today.getTime();
    });

    const snapshot = {
      building: selectedBuilding,
      metrics: {
        pendingRequests: pendingCount,
        inProgressRequests: inProgressCount,
        jobsInProgress: 0, // TODO: Fetch from jobs API when available
        bookingsToday: 0, // TODO: Fetch from bookings API when available
        visitorsToday: 0, // TODO: Fetch from visitors API when available
        completionRate,
        occupancyRate: selectedBuilding.totalUnits
          ? Math.round((selectedBuilding.occupiedUnits / selectedBuilding.totalUnits) * 100)
          : 0,
        openJobsCount: 0, // TODO: Fetch from jobs API when available
      },
      lists: {
        requestsToday,
        upcomingBookings: [],
        visitorsToday: [],
        activeJobs: [],
      },
    };

    console.log('[Management] Created snapshot for building:', selectedBuilding.name, {
      totalRequests,
      pendingCount,
      inProgressCount,
      requestsToday: requestsToday.length,
    });
    return snapshot;
  }, [selectedBuildingId, managedBuildings, buildingRequests]);

  const managementTiles = useMemo(() => {
    if (!managementSnapshot) return [];

    const totalRequests = buildingRequests.length;
    const openRequests = buildingRequests.filter(r => r.status === "in-progress").length;
    const resolvedRequests = buildingRequests.filter(r => r.status === "completed").length;
    const pendingRequests = buildingRequests.filter(r => r.status === "pending").length;

    return [
      {
        title: "Total",
        value: totalRequests,
        icon: "list-outline" as const,
        iconColor: "#6B7280",
        filter: "all" as const,
      },
      {
        title: "Pending",
        value: pendingRequests,
        icon: "time-outline" as const,
        iconColor: "#F59E0B",
        filter: "pending" as const,
      },
      {
        title: "Open",
        value: openRequests,
        icon: "construct-outline" as const,
        iconColor: "#2563EB",
        filter: "in-progress" as const,
      },
      {
        title: "Resolved",
        value: resolvedRequests,
        icon: "checkmark-circle-outline" as const,
        iconColor: "#10B981",
        filter: "completed" as const,
      },
    ];
  }, [managementSnapshot, buildingRequests]);

  const broadcastSelectedBuildings = useMemo(
    () =>
      managedBuildings.filter((building) =>
        broadcastScope.includes(building.id),
      ),
    [broadcastScope, managedBuildings],
  );

  const broadcastAudienceLabel = useMemo(() => {
    if (!broadcastSelectedBuildings.length) {
      return "no buildings selected";
    }
    if (broadcastSelectedBuildings.length === managedBuildings.length) {
      return "all managed buildings";
    }
    return broadcastSelectedBuildings.map((building) => building.name).join(", ");
  }, [broadcastSelectedBuildings, managedBuildings.length]);

  const isBroadcastAudienceEmpty = broadcastScope.length === 0;
  const isAllBroadcastSelected =
    broadcastScope.length > 0 &&
    broadcastScope.length === allManagedBuildingIds.length;

  const broadcastVisual = BROADCAST_TYPE_VISUALS[broadcastType];
  const broadcastTypeIcon =
    BROADCAST_TYPES.find((option) => option.value === broadcastType)?.icon ||
    "information-circle";
  const broadcastPreviewTitle =
    broadcastTitle.trim() || "Notification title";
  const broadcastPreviewMessage =
    broadcastMessage.trim() || "Message preview will appear here.";
  const isBroadcastActionDisabled =
    !broadcastTitle.trim() ||
    !broadcastMessage.trim() ||
    isBroadcastAudienceEmpty ||
    isSending;

  const performanceBanner = useMemo((): {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    toneColor: string;
    background: string;
    border: string;
    headline: string;
    body: string;
  } | null => {
    if (analytics.completionRate >= 85) {
      return {
        icon: "shield-checkmark",
        toneColor: "#047857",
        background: "#ECFDF5",
        border: "#A7F3D0",
        headline: "Operations are healthy",
        body: "Job completion is trending upward and response times remain within SLA.",
      };
    }

    if (analytics.completionRate >= 70) {
      return {
        icon: "alert-circle",
        toneColor: "#F59E0B",
        background: "#FFFBEB",
        border: "#FDE68A",
        headline: "Keep an eye on completion rate",
        body: "Response times are slowing slightly. Consider redistributing work orders.",
      };
    }

    // Don't show banner if completion rate is below 70%
    return null;
  }, [analytics.completionRate]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (currentUser?.id) {
        console.log("[Management] Refreshing assigned buildings for manager:", currentUser.id);
        const response = await orgBuildingsApi.getAssignedBuildings();
        const buildingsPayload = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        if (buildingsPayload.length > 0) {
          const mappedBuildings = mapAssignedBuildings(buildingsPayload);
          const buildingsWithCounts = await attachBuildingCounts(mappedBuildings);
          console.log("[Management] Buildings refreshed:", mappedBuildings.length);
          setManagedBuildings(buildingsWithCounts);
          // Note: selectedBuildingId and broadcastScope are managed by the sync useEffect
        }
      }
    } catch (error) {
      console.error('[Management] Failed to refresh buildings:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleBroadcastBuilding = (buildingId: string) => {
    setBroadcastScope((prev) => {
      if (prev.includes(buildingId)) {
        return prev.filter((id) => id !== buildingId);
      }
      return [...prev, buildingId];
    });
  };

  const toggleSelectAllBroadcast = () => {
    setBroadcastScope((prev) =>
      prev.length === allManagedBuildingIds.length
        ? []
        : [...allManagedBuildingIds],
    );
  };

  const handleTilePress = (filter: string) => {
    router.push({
      pathname: "/(management)/requests",
      params: { statusFilter: filter },
    });
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      Alert.alert("Validation Error", "Please enter both title and message");
      return;
    }

    if (isBroadcastAudienceEmpty) {
      Alert.alert(
        "Select audience",
        "Choose at least one building for this announcement.",
      );
      return;
    }

    setIsSending(true);
    try {
      const audienceNames = broadcastSelectedBuildings.map(
        (building) => building.name,
      );
      const audienceTag =
        audienceNames.length === managedBuildings.length
          ? "All Managed Buildings"
          : audienceNames.join(", ");
      const finalMessage = audienceNames.length
        ? `[${audienceTag}] ${broadcastMessage.trim()}`
        : broadcastMessage.trim();

      await actions.broadcastNotificationToRole?.(
        "tenant",
        broadcastTitle.trim(),
        finalMessage,
        broadcastType,
      );

      Alert.alert(
        "Success",
        audienceNames.length
          ? `Notification queued for tenants in ${audienceTag}.`
          : "Notification queued for tenants.",
      );
      setBroadcastTitle("");
      setBroadcastMessage("");
      setShowBroadcastModal(false);
    } catch (error) {
      Alert.alert(
        "Failed",
        error instanceof Error ? error.message : "Unable to send broadcast",
      );
    } finally {
      setIsSending(false);
    }
  };

  const renderManagementView = () => {
    if (loadingBuildings) {
      return (
        <View style={styles.managementEmptyState}>
          <Ionicons
            name="hourglass-outline"
            size={48}
            color="#CBD5F5"
            style={styles.managementEmptyIcon}
          />
          <Text style={styles.managementEmptyTitle}>Loading buildings...</Text>
          <Text style={styles.managementEmptyText}>
            Fetching your assigned properties from the server.
          </Text>
        </View>
      );
    }

    if (!managedBuildings.length || !managementSnapshot) {
      return (
        <View style={styles.managementEmptyState}>
          <Ionicons
            name="business"
            size={48}
            color="#CBD5F5"
            style={styles.managementEmptyIcon}
          />
          <Text style={styles.managementEmptyTitle}>No buildings assigned</Text>
          <Text style={styles.managementEmptyText}>
            Once a system administrator links you to a property, you&apos;ll see real-time
            analytics for that building here.
          </Text>
        </View>
      );
    }

    const building = managementSnapshot.building;

    const buildingStatusStyles = (() => {
      if (!building) {
        return { backgroundColor: "#E5E7EB", textColor: "#374151" };
      }
      switch (building.status) {
        case "active":
          return { backgroundColor: "#DCFCE7", textColor: "#166534" };
        case "maintenance":
          return { backgroundColor: "#FEF3C7", textColor: "#92400E" };
        case "inactive":
          return { backgroundColor: "#E5E7EB", textColor: "#1F2937" };
        default:
          return { backgroundColor: "#E5E7EB", textColor: "#374151" };
      }
    })();

    return (
      <>
        {performanceBanner && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[
              styles.banner,
              {
                backgroundColor: performanceBanner.background,
                borderColor: performanceBanner.border,
              },
            ]}
          >
            <Ionicons
              name={performanceBanner.icon}
              size={24}
              color={performanceBanner.toneColor}
              style={styles.bannerIcon}
            />
            <View style={styles.bannerContent}>
              <Text style={styles.bannerHeadline}>{performanceBanner.headline}</Text>
              <Text style={styles.bannerBody}>{performanceBanner.body}</Text>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(80).duration(320)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.buildingTabsContent}
            style={styles.buildingTabs}
          >
            {managedBuildings.map((buildingOption) => (
              <TouchableOpacity
                key={buildingOption.id}
                style={[
                  styles.buildingTab,
                  selectedBuildingId === buildingOption.id &&
                    styles.buildingTabActive,
                ]}
                onPress={() => setSelectedBuildingId(buildingOption.id)}
              >
                <Text
                  style={[
                    styles.buildingTabLabel,
                    selectedBuildingId === buildingOption.id &&
                      styles.buildingTabLabelActive,
                  ]}
                >
                  {buildingOption.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(320)}
          style={[
            styles.summaryGrid,
            isDesktop ? styles.summaryGridWide : styles.summaryGridStacked,
            { gap: sectionSpacing },
          ]}
        >
          <View
            style={[
              styles.summaryCard,
              !isDesktop && styles.summaryCardFull,
            ]}
          >
            <Text style={styles.summaryTitle}>
              {building ? building.name : "Portfolio overview"}
            </Text>
            {building ? (
              <>
                <Text style={styles.summarySubtitle}>{building.address}</Text>
                <View
                  style={[
                    styles.summaryStatusChip,
                    { backgroundColor: buildingStatusStyles.backgroundColor },
                  ]}
                >
                  <Ionicons
                    name="ellipse"
                    size={8}
                    color={buildingStatusStyles.textColor}
                  />
                  <Text
                    style={[
                      styles.summaryStatusText,
                      { color: buildingStatusStyles.textColor },
                    ]}
                  >
                    {building.status.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.summaryMetaRow}>
                  <View style={styles.summaryPill}>
                    <Ionicons name="home-outline" size={14} color="#2563EB" />
                    <Text style={styles.summaryPillText}>
                      {building.occupiedUnits}/{building.totalUnits} units occupied
                    </Text>
                  </View>
                  <View style={styles.summaryPill}>
                    <Ionicons name="construct-outline" size={14} color="#2563EB" />
                    <Text style={styles.summaryPillText}>
                      {managementSnapshot.metrics.openJobsCount} open jobs
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.summaryPlaceholder}>
                Select a building to view property-level insights.
              </Text>
            )}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(160).duration(320)}
          style={[
            styles.tileGrid,
            {
              gap: isDesktop ? 12 : isTablet ? 10 : 8,
            },
          ]}
        >
          {managementTiles.map((tile) => (
            <TouchableOpacity
              key={tile.title}
              style={[
                styles.tileWrapper,
                isDesktop
                  ? styles.tileWrapperDesktop
                  : isTablet
                    ? styles.tileWrapperTablet
                    : styles.tileWrapperMobile,
              ]}
              onPress={() => handleTilePress(tile.filter)}
              activeOpacity={0.7}
            >
              <ManagementTile
                title={tile.title}
                value={tile.value}
                icon={tile.icon}
                iconColor={tile.iconColor}
              />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Broadcast Notification Button */}
        <Animated.View entering={FadeInDown.delay(180).duration(320)}>
          <TouchableOpacity
            style={styles.broadcastButton}
            onPress={() => setShowBroadcastModal(true)}
            accessibilityLabel="Send broadcast notification to tenants"
            accessibilityRole="button"
            accessibilityHint="Opens modal to compose and send notification to all tenants"
          >
            <View style={styles.broadcastButtonIconContainer}>
              <Ionicons name="megaphone" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.broadcastButtonTextContainer}>
              <Text style={styles.broadcastButtonText}>Send Broadcast Notification</Text>
              <Text style={styles.broadcastButtonSubtext}>Notify all tenants instantly</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" style={styles.broadcastButtonChevron} />
          </TouchableOpacity>
        </Animated.View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Building Operations"
          subtitle="Centralized oversight for your managed properties"

          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        <View style={[styles.contentWrapper, { gap: sectionSpacing }]}>
          {renderManagementView()}
        </View>
      </ScrollView>

      {/* Broadcast Notification Modal */}
      <Modal
        visible={showBroadcastModal}
        animationType="slide"
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <SafeAreaView style={styles.broadcastModalContainer}>
          <View style={styles.broadcastModalHeader}>
            <TouchableOpacity onPress={() => setShowBroadcastModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.broadcastModalTitle}>Broadcast Notification</Text>
            <View style={{ width: 24 }} />
          </View>

          <KeyboardAvoidingView
            style={styles.broadcastModalFlex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
          >
            <ScrollView
              style={styles.broadcastModalContent}
              contentContainerStyle={[
                styles.broadcastModalContentContainer,
                { paddingBottom: broadcastContentBottomPadding },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.broadcastModalSubtitle}>
                {broadcastSelectedBuildings.length
                  ? `Notifying tenants in ${broadcastAudienceLabel}.`
                  : "Select one or more buildings to target your message."}
              </Text>

              {managedBuildings.length ? (
                <View style={styles.broadcastAudienceSection}>
                  <Text style={styles.broadcastLabel}>Building</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.broadcastChipsRow}
                  >
                    {managedBuildings.map((building) => {
                      const isSelected = broadcastScope.includes(building.id);
                      return (
                        <TouchableOpacity
                          key={building.id}
                          style={[
                            styles.broadcastAudienceChip,
                            isSelected && styles.broadcastAudienceChipActive,
                          ]}
                          onPress={() => toggleBroadcastBuilding(building.id)}
                        >
                          <Text
                            style={[
                              styles.broadcastAudienceChipText,
                              isSelected && styles.broadcastAudienceChipTextActive,
                            ]}
                          >
                            {building.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    {managedBuildings.length > 1 && (
                      <TouchableOpacity
                        style={[
                          styles.broadcastAudienceChip,
                          isAllBroadcastSelected &&
                            styles.broadcastAudienceChipActive,
                        ]}
                        onPress={toggleSelectAllBroadcast}
                      >
                        <Text
                          style={[
                            styles.broadcastAudienceChipText,
                            isAllBroadcastSelected &&
                              styles.broadcastAudienceChipTextActive,
                          ]}
                        >
                          {isAllBroadcastSelected ? "Clear all" : "Select all"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                </View>
              ) : (
                <Text style={styles.broadcastEmptyStateText}>
                  No buildings assigned to your profile yet.
                </Text>
              )}

              <View style={styles.broadcastTypeSection}>
                <Text style={styles.broadcastLabel}>Notification Type</Text>
                <View style={styles.broadcastTypeRow}>
                  {BROADCAST_TYPES.map((option) => {
                    const isActive = option.value === broadcastType;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.broadcastTypeOption,
                          isActive && styles.broadcastTypeOptionActive,
                        ]}
                        onPress={() => setBroadcastType(option.value)}
                      >
                        <Ionicons
                          name={option.icon}
                          size={18}
                          color={isActive ? "#FFFFFF" : "#2563EB"}
                        />
                        <View style={styles.broadcastTypeTextWrapper}>
                          <Text
                            style={[
                              styles.broadcastTypeTitle,
                              isActive && styles.broadcastTypeTitleActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text
                            style={[
                              styles.broadcastTypeDescription,
                              isActive && styles.broadcastTypeDescriptionActive,
                            ]}
                            numberOfLines={2}
                          >
                            {option.description}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View
                style={[
                  styles.broadcastPreview,
                  {
                    backgroundColor: broadcastVisual.background,
                    borderColor: broadcastVisual.border,
                  },
                ]}
              >
                <Ionicons
                  name={broadcastTypeIcon}
                  size={24}
                  color={broadcastVisual.text}
                />
                <View style={styles.broadcastPreviewTextWrapper}>
                  <Text
                    style={[
                      styles.broadcastPreviewTitle,
                      { color: broadcastVisual.text },
                    ]}
                  >
                    {broadcastPreviewTitle}
                  </Text>
                  <Text
                    style={[
                      styles.broadcastPreviewBody,
                      { color: broadcastVisual.text },
                    ]}
                  >
                    {broadcastPreviewMessage}
                  </Text>
                  <Text
                    style={[
                      styles.broadcastPreviewAudience,
                      { color: broadcastVisual.text },
                    ]}
                  >
                    {broadcastSelectedBuildings.length
                      ? `Audience: ${broadcastAudienceLabel}`
                      : "Audience pending selection"}
                  </Text>
                </View>
              </View>

              <View style={styles.broadcastInputGroup}>
                <Text style={styles.broadcastLabel}>Title</Text>
                <TextInput
                  style={styles.broadcastInput}
                  placeholder="Enter notification title..."
                  value={broadcastTitle}
                  onChangeText={setBroadcastTitle}
                  maxLength={100}
                />
              </View>

              <View style={styles.broadcastInputGroup}>
                <Text style={styles.broadcastLabel}>Message</Text>
                <TextInput
                  style={[styles.broadcastInput, styles.broadcastTextArea]}
                  placeholder="Enter notification message..."
                  value={broadcastMessage}
                  onChangeText={setBroadcastMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.broadcastCharCount}>
                  {broadcastMessage.length}/500 characters
                </Text>
              </View>
            </ScrollView>

            <View
              style={[
                styles.broadcastFooter,
                { paddingBottom: broadcastFooterInset },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.broadcastSendButton,
                  isBroadcastActionDisabled && styles.broadcastSendButtonDisabled,
                ]}
                onPress={handleBroadcast}
                disabled={isBroadcastActionDisabled}
              >
                {isSending ? (
                  <Text style={styles.broadcastSendButtonText}>Sending...</Text>
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.broadcastSendButtonText}>Send Broadcast</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

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
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingBottom: 120,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    gap: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  bannerIcon: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  bannerContent: {
    flex: 1,
    gap: 6,
  },
  bannerHeadline: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  bannerBody: {
    fontSize: 14,
    color: "#475569",
  },
  buildingTabs: {
    marginTop: 20,
    marginBottom: 8,
  },
  buildingTabsContent: {
    gap: 12,
    paddingVertical: 4,
  },
  buildingTab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "transparent",
  },
  buildingTabActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  buildingTabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  buildingTabLabelActive: {
    color: "#FFFFFF",
  },
  summaryGrid: {
    alignItems: "stretch",
  },
  summaryGridWide: {
    flexDirection: "row",
  },
  summaryGridStacked: {
    flexDirection: "column",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 4,
    flex: 1,
    minWidth: 280,
  },
  summaryCardFull: {
    width: "100%",
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  summarySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
  },
  summaryStatusChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 16,
  },
  summaryStatusText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  summaryMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  summaryPillText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1D4ED8",
  },
  summaryPlaceholder: {
    marginTop: 18,
    fontSize: 13,
    color: "#6B7280",
  },
  summaryStatsGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryStat: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minWidth: 150,
    flexGrow: 1,
    marginBottom: 12,
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  summaryStatLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tileWrapper: {
    marginBottom: 12,
  },
  tileWrapperDesktop: {
    width: "49%",
  },
  tileWrapperTablet: {
    width: "49%",
  },
  tileWrapperMobile: {
    width: "48%",
  },
  trendsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  trendCard: {
    flexGrow: 1,
    minWidth: 220,
    marginBottom: 16,
  },
  trendCardFull: {
    width: "100%",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
  },
  sectionColumn: {
    flexDirection: "column",
  },
  sectionCardWrapper: {
    flex: 1,
  },
  sectionCardWrapperFull: {
    width: "100%",
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    marginBottom: 12,
  },
  listCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 12,
  },
  listCardBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1D4ED8",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  listCardBadgeMuted: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  listCardMeta: {
    fontSize: 13,
    color: "#4B5563",
  },
  listCardDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
  listEmpty: {
    fontSize: 13,
    color: "#6B7280",
    paddingVertical: 12,
    textAlign: "center",
  },
  managementEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  managementEmptyIcon: {
    marginBottom: 16,
  },
  managementEmptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  managementEmptyText: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "center",
  },
  broadcastButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: "#7034FF",
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 8,
    shadowColor: "#7034FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  broadcastButtonIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  broadcastButtonTextContainer: {
    flex: 1,
    gap: 4,
  },
  broadcastButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  broadcastButtonSubtext: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    fontWeight: "500",
  },
  broadcastButtonChevron: {
    opacity: 0.8,
  },
  broadcastModalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  broadcastModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  broadcastModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  broadcastModalFlex: {
    flex: 1,
  },
  broadcastModalContent: {
    flex: 1,
    padding: 20,
  },
  broadcastModalContentContainer: {
    paddingBottom: 100,
  },
  broadcastModalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  broadcastAudienceSection: {
    marginBottom: 24,
    gap: 12,
  },
  broadcastChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  broadcastAudienceChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    backgroundColor: "#F8FAFC",
  },
  broadcastAudienceChipActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  broadcastAudienceChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  broadcastAudienceChipTextActive: {
    color: "#FFFFFF",
  },
  broadcastEmptyStateText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginBottom: 16,
  },
  broadcastTypeSection: {
    marginBottom: 24,
    gap: 12,
  },
  broadcastTypeRow: {
    flexDirection: "column",
    gap: 12,
  },
  broadcastTypeOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#EFF6FF",
  },
  broadcastTypeOptionActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  broadcastTypeTextWrapper: {
    flex: 1,
    gap: 4,
  },
  broadcastTypeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  broadcastTypeTitleActive: {
    color: "#FFFFFF",
  },
  broadcastTypeDescription: {
    fontSize: 12,
    color: "#1E3A8A",
  },
  broadcastTypeDescriptionActive: {
    color: "#E0E7FF",
  },
  broadcastFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  broadcastPreview: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  broadcastPreviewTextWrapper: {
    flex: 1,
    gap: 4,
  },
  broadcastPreviewTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  broadcastPreviewBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  broadcastPreviewAudience: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  broadcastInputGroup: {
    marginBottom: 20,
  },
  broadcastLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  broadcastInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  broadcastTextArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  broadcastCharCount: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "right",
  },
  broadcastSendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 0,
  },
  broadcastSendButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  broadcastSendButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
