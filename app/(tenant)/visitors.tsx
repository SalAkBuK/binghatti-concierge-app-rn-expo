import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedButton } from "../../components/ui/AnimatedButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useAppDomain } from "../../lib/context/connected-app-provider";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import type { ResidentVisitor, ResidentVisitorStatus } from "../../lib/types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type FilterStatus = "all" | ResidentVisitorStatus;

const formatResidentVisitorType = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDateTime = (value: string | null) => {
  if (!value) return "Flexible";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusColor = (status: ResidentVisitorStatus) => {
  switch (status) {
    case "EXPECTED":
      return { bg: "#FEF3C7", text: "#92400E" };
    case "ARRIVED":
      return { bg: "#DBEAFE", text: "#1D4ED8" };
    case "COMPLETED":
      return { bg: "#DCFCE7", text: "#166534" };
    case "CANCELLED":
      return { bg: "#FEE2E2", text: "#B91C1C" };
    default:
      return { bg: "#E5E7EB", text: "#4B5563" };
  }
};

export default function VisitorsScreen() {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const {
    amenityVisitor: {
      residentVisitors,
      residentVisitorsLoading,
      fetchResidentVisitors,
      cancelResidentVisitor,
    },
  } = useAppDomain();
  const {
    canManageVisitors,
    isLoading: isTenancyLoading,
    statusMessage,
    statusTitle,
  } = useResidentTenancy({
    enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id),
  });
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();

  const loadVisitors = useCallback(
    async (showError = true) => {
      try {
        await fetchResidentVisitors();
      } catch (error) {
        if (showError) {
          Alert.alert(
            "Visitor Access",
            error instanceof Error
              ? error.message
              : "Failed to load visitors.",
          );
        }
      }
    },
    [fetchResidentVisitors],
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentUser?.id || !canManageVisitors) return;
      void loadVisitors(false);
    }, [canManageVisitors, currentUser?.id, loadVisitors]),
  );

  const filteredVisitors = useMemo(() => {
    let filtered = residentVisitors;

    if (filterStatus !== "all") {
      filtered = filtered.filter((visitor) => visitor.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((visitor) => {
        const haystack = [
          visitor.visitorName,
          visitor.phoneNumber,
          visitor.unit.label,
          visitor.tenantName || "",
          formatResidentVisitorType(visitor.type),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [filterStatus, residentVisitors, searchQuery]);

  const stats = useMemo(
    () => ({
      all: residentVisitors.length,
      EXPECTED: residentVisitors.filter((visitor) => visitor.status === "EXPECTED")
        .length,
      ARRIVED: residentVisitors.filter((visitor) => visitor.status === "ARRIVED")
        .length,
      COMPLETED: residentVisitors.filter(
        (visitor) => visitor.status === "COMPLETED",
      ).length,
      CANCELLED: residentVisitors.filter(
        (visitor) => visitor.status === "CANCELLED",
      ).length,
    }),
    [residentVisitors],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVisitors();
    setRefreshing(false);
  };

  const handleCancelVisitor = async (visitor: ResidentVisitor) => {
    Alert.alert(
      "Cancel Visitor",
      `Cancel ${visitor.visitorName}'s visitor registration?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Visitor",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelResidentVisitor(visitor.id);
              Alert.alert("Visitor Cancelled", "The visitor has been cancelled.");
            } catch (error) {
              Alert.alert(
                "Unable to Cancel",
                error instanceof Error
                  ? error.message
                  : "Failed to cancel the visitor.",
              );
            }
          },
        },
      ],
    );
  };

  const handleVisitorPress = (visitor: ResidentVisitor) => {
    const details = [
      `Type: ${formatResidentVisitorType(visitor.type)}`,
      `Status: ${visitor.status}`,
      `Phone: ${visitor.phoneNumber}`,
      `Unit: ${visitor.unit.label || "Assigned by backend"}`,
      `Expected arrival: ${formatDateTime(visitor.expectedArrivalAt)}`,
      `Emirates ID: ${visitor.emiratesId || "Not provided"}`,
      `Vehicle: ${visitor.vehicleNumber || "Not provided"}`,
      `Notes: ${visitor.notes || "No notes"}`,
    ].join("\n\n");

    const actionsList =
      visitor.status === "EXPECTED"
        ? [
            { text: "Close", style: "cancel" as const },
            {
              text: "Edit",
              onPress: () =>
                router.push({
                  pathname: "/(modals)/register-visitor",
                  params: { visitorId: visitor.id },
                } as any),
            },
            {
              text: "Cancel Registration",
              style: "destructive" as const,
              onPress: () => handleCancelVisitor(visitor),
            },
          ]
        : [{ text: "Close", style: "cancel" as const }];

    Alert.alert(visitor.visitorName, details, actionsList);
  };

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  const FilterTab = ({
    label,
    count,
    status,
  }: {
    label: string;
    count: number;
    status: FilterStatus;
  }) => {
    const isActive = filterStatus === status;
    return (
      <TouchableOpacity
        style={[styles.filterTab, isActive && styles.filterTabActive]}
        onPress={() => setFilterStatus(status)}
      >
        <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
          {label} ({count})
        </Text>
      </TouchableOpacity>
    );
  };

  const renderVisitorItem = ({ item: visitor }: { item: ResidentVisitor }) => {
    const statusColors = getStatusColor(visitor.status);

    return (
      <AnimatedButton
        style={styles.visitorCard}
        onPress={() => handleVisitorPress(visitor)}
      >
        <View style={styles.visitorCardHeader}>
          <View style={styles.visitorIdentity}>
            <View style={styles.iconBadge}>
              <Ionicons name="person-outline" size={18} color="#336BE3" />
            </View>
            <View style={styles.visitorNameBlock}>
              <Text style={styles.visitorName} numberOfLines={1}>
                {visitor.visitorName}
              </Text>
              <Text style={styles.visitorPhone}>{visitor.phoneNumber}</Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors.bg },
            ]}
          >
            <Text
              style={[styles.statusBadgeText, { color: statusColors.text }]}
            >
              {visitor.status}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="pricetag-outline" size={15} color="#6B7280" />
          <Text style={styles.metaText}>
            {formatResidentVisitorType(visitor.type)}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={15} color="#6B7280" />
          <Text style={styles.metaText}>
            Unit {visitor.unit.label || "Assigned automatically"}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={15} color="#6B7280" />
          <Text style={styles.metaText}>
            Arrival: {formatDateTime(visitor.expectedArrivalAt)}
          </Text>
        </View>

        {visitor.notes ? (
          <View style={styles.metaRow}>
            <Ionicons
              name="document-text-outline"
              size={15}
              color="#6B7280"
            />
            <Text style={styles.metaText} numberOfLines={2}>
              {visitor.notes}
            </Text>
          </View>
        ) : null}

        {visitor.status === "EXPECTED" ? (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={(event) => {
                event.stopPropagation();
                router.push({
                  pathname: "/(modals)/register-visitor",
                  params: { visitorId: visitor.id },
                } as any);
              }}
            >
              <Ionicons name="create-outline" size={16} color="#1D4ED8" />
              <Text style={styles.secondaryActionText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.destructiveAction}
              onPress={(event) => {
                event.stopPropagation();
                void handleCancelVisitor(visitor);
              }}
            >
              <Ionicons
                name="close-circle-outline"
                size={16}
                color="#B91C1C"
              />
              <Text style={styles.destructiveActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </AnimatedButton>
    );
  };

  const renderListHeader = () => (
    <>
      <HeaderBar
        title="My Visitors"
        hasUnreadNotifications={hasUnreadNotifications}
        showSideMenu={showSideMenu}
        onSideMenuToggle={setShowSideMenu}
      />

      <Animated.View
        entering={FadeInDown.delay(40).duration(320)}
        style={styles.infoBanner}
      >
        <Ionicons name="information-circle-outline" size={18} color="#1D4ED8" />
        <Text style={styles.infoBannerText}>
          Your active unit is determined by the backend. Visitor records are shared
          across residents on that unit.
        </Text>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(70).duration(320)}
        style={styles.registerButtonContainer}
      >
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push("/(modals)/register-visitor")}
        >
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
          <Text style={styles.registerButtonText}>Add Visitor</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(100).duration(320)}
        style={styles.filterContainer}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <FilterTab label="All" count={stats.all} status="all" />
          <FilterTab label="Expected" count={stats.EXPECTED} status="EXPECTED" />
          <FilterTab label="Arrived" count={stats.ARRIVED} status="ARRIVED" />
          <FilterTab label="Completed" count={stats.COMPLETED} status="COMPLETED" />
          <FilterTab label="Cancelled" count={stats.CANCELLED} status="CANCELLED" />
        </ScrollView>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(130).duration(320)}
        style={styles.searchContainer}
      >
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, unit, or type..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(160).duration(320)}
        style={styles.sectionHeader}
      >
        <Text style={styles.visitorsTitle}>Visitor History</Text>
      </Animated.View>
    </>
  );

  if (!isTenancyLoading && !canManageVisitors) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}
        >
          <HeaderBar
            title="My Visitors"
            hasUnreadNotifications={hasUnreadNotifications}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
          />

          <Animated.View
            entering={FadeInDown.delay(40).duration(320)}
            style={styles.disabledState}
          >
            <Ionicons name="lock-closed-outline" size={28} color="#9A3412" />
            <Text style={styles.disabledTitle}>{statusTitle}</Text>
            <Text style={styles.disabledText}>{statusMessage}</Text>
            <Text style={styles.disabledText}>
              Visitor management is only available while your account has an active unit.
            </Text>
          </Animated.View>
        </ScrollView>

        <SideMenu
          isVisible={showSideMenu}
          onClose={() => setShowSideMenu(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredVisitors}
        renderItem={renderVisitorItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          residentVisitorsLoading && residentVisitors.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#336BE3" />
              <Text style={styles.loadingText}>Loading visitors...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No visitors found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? "No visitors match the current search."
                  : filterStatus === "all"
                    ? "You haven't created any visitors yet."
                    : `No ${filterStatus.toLowerCase()} visitors found.`}
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.listSpacer} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + 32 },
          filteredVisitors.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        windowSize={8}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
      />

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
  listContent: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  infoBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#1E3A8A",
  },
  registerButtonContainer: {
    marginBottom: 18,
  },
  registerButton: {
    backgroundColor: "#336BE3",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScrollContent: {
    paddingRight: 8,
  },
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterTabActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterTabTextActive: {
    color: "#1D4ED8",
  },
  searchContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  sectionHeader: {
    marginBottom: 14,
  },
  visitorsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },
  listSpacer: {
    height: 12,
  },
  visitorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  visitorCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  visitorIdentity: {
    flexDirection: "row",
    flex: 1,
    gap: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  visitorNameBlock: {
    flex: 1,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  visitorPhone: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  destructiveAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
  },
  destructiveActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
  },
  loadingState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginTop: 14,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  disabledState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FDBA74",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  disabledTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9A3412",
    marginTop: 14,
    marginBottom: 8,
  },
  disabledText: {
    fontSize: 14,
    color: "#9A3412",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 8,
  },
});
