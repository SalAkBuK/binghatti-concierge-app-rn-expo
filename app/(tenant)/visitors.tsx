import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
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
import { useApp } from "../../lib/context/connected-app-provider";
import type { Visitor, VisitorStatus } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type FilterStatus = "all" | VisitorStatus;

export default function VisitorsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSideMenu, setShowSideMenu] = useState(false);

  // Get visitors from context
  const visitors = actions.getVisitors();

  // Filter visitors for current user
  const filteredVisitors = useMemo(() => {
    let filtered = visitors.filter((v) => v.tenantId === currentUser?.id);

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((v) => v.status === filterStatus);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.visitorName.toLowerCase().includes(query) ||
          v.visitorPhone.toLowerCase().includes(query),
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [visitors, currentUser, filterStatus, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const userVisitors = visitors.filter((v) => v.tenantId === currentUser?.id);
    return {
      all: userVisitors.length,
      expected: userVisitors.filter((v) => v.status === "expected").length,
      arrived: userVisitors.filter((v) => v.status === "arrived").length,
      departed: userVisitors.filter((v) => v.status === "departed").length,
      cancelled: userVisitors.filter((v) => v.status === "cancelled").length,
    };
  }, [visitors, currentUser]);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    // In real app, fetch latest visitor data from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: VisitorStatus) => {
    switch (status) {
      case "expected":
        return { bg: "#FEF3C7", text: "#92400e" };
      case "arrived":
        return { bg: "#DBEAFE", text: "#1d4ed8" };
      case "departed":
        return { bg: "#D1FAE5", text: "#065f46" };
      case "cancelled":
        return { bg: "#FEE2E2", text: "#dc2626" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  const handleCancelVisitor = async (visitor: Visitor) => {
    Alert.alert(
      "Cancel Visitor",
      `Are you sure you want to cancel the registration for ${visitor.visitorName}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await actions.cancelVisitor(visitor.id);
              Alert.alert("Success", "Visitor registration cancelled");
            } catch (error) {
              console.error("Failed to cancel visitor registration:", error);
              Alert.alert("Error", "Failed to cancel visitor registration");
            }
          },
        },
      ],
    );
  };

  const handleVisitorPress = (visitor: Visitor) => {
    // Show detail modal with all visitor information
    Alert.alert(
      visitor.visitorName,
      `Code: ${visitor.visitorCode}\n\nPhone: ${visitor.visitorPhone}\nID Type: ${visitor.visitorIdType.replace("_", " ").toUpperCase()}\nID Number: ${visitor.visitorIdNumber}\n\nPurpose: ${visitor.visitPurpose}\n\nExpected Arrival:\n${new Date(visitor.expectedArrivalTime).toLocaleString()}\n\n${visitor.expectedDepartureTime ? `Expected Departure:\n${new Date(visitor.expectedDepartureTime).toLocaleString()}\n\n` : ""}${visitor.actualArrivalTime ? `Actual Arrival:\n${new Date(visitor.actualArrivalTime).toLocaleString()}\n\n` : ""}${visitor.actualDepartureTime ? `Actual Departure:\n${new Date(visitor.actualDepartureTime).toLocaleString()}` : ""}`,
      visitor.status === "expected"
        ? [
            { text: "Close", style: "cancel" },
            {
              text: "Cancel Registration",
              style: "destructive",
              onPress: () => handleCancelVisitor(visitor),
            },
          ]
        : [{ text: "Close" }],
    );
  };

  const formatDateTime = (isoString: string): string => {
    return new Date(isoString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate unread notifications
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

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
          title="My Visitors"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        {/* Register New Visitor Button */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.registerButtonContainer}
        >
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push("/(modals)/register-visitor")}
          >
            <Ionicons name="person-add" size={20} color="white" />
            <Text style={styles.registerButtonText}>Register New Visitor</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Filter Tabs */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.filterContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <FilterTab label="All" count={stats.all} status="all" />
            <FilterTab label="Expected" count={stats.expected} status="expected" />
            <FilterTab label="Arrived" count={stats.arrived} status="arrived" />
            <FilterTab label="Departed" count={stats.departed} status="departed" />
            <FilterTab label="Cancelled" count={stats.cancelled} status="cancelled" />
          </ScrollView>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(400)}
          style={styles.searchContainer}
        >
          <Ionicons
            name="search"
            size={20}
            color="#6b7280"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Visitors List */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.visitorsContainer}
        >
          <Text style={styles.visitorsTitle}>
            {filterStatus === "all" ? "All Visitors" : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Visitors`}
          </Text>

          <View style={styles.visitorsList}>
            {filteredVisitors.length > 0 ? (
              filteredVisitors.map((visitor, index) => {
                const statusColors = getStatusColor(visitor.status);

                return (
                  <AnimatedButton
                    key={visitor.id}
                    style={styles.visitorCard}
                    onPress={() => handleVisitorPress(visitor)}
                  >
                    <View style={styles.visitorCardContent}>
                      {/* Header Row */}
                      <View style={styles.visitorCardHeader}>
                        <View style={styles.visitorInfoRow}>
                          <Ionicons
                            name="person"
                            size={18}
                            color="#336BE3"
                            style={styles.visitorIcon}
                          />
                          <View style={styles.visitorNameContainer}>
                            <Text style={styles.visitorName} numberOfLines={1}>
                              {visitor.visitorName}
                            </Text>
                            <Text style={styles.visitorPhone}>
                              {visitor.visitorPhone}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusColors.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: statusColors.text },
                            ]}
                          >
                            {visitor.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Visitor Code */}
                      <View style={styles.visitorCodeRow}>
                        <Ionicons name="qr-code" size={16} color="#6b7280" />
                        <Text style={styles.visitorCode}>
                          {visitor.visitorCode}
                        </Text>
                      </View>

                      {/* Expected Arrival */}
                      <View style={styles.visitorDetailRow}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#6b7280"
                        />
                        <Text style={styles.visitorDetailText}>
                          Expected: {formatDateTime(visitor.expectedArrivalTime)}
                        </Text>
                      </View>

                      {/* Purpose */}
                      <View style={styles.visitorDetailRow}>
                        <Ionicons
                          name="document-text-outline"
                          size={16}
                          color="#6b7280"
                        />
                        <Text
                          style={styles.visitorDetailText}
                          numberOfLines={1}
                        >
                          {visitor.visitPurpose}
                        </Text>
                      </View>

                      {/* Cancel Button */}
                      {visitor.status === "expected" && (
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCancelVisitor(visitor);
                          }}
                        >
                          <Ionicons name="close-circle" size={18} color="#dc2626" />
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </AnimatedButton>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateTitle}>No visitors found</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery
                    ? "No visitors match your search"
                    : filterStatus === "all"
                      ? "You haven't registered any visitors yet"
                      : `No ${filterStatus} visitors found`}
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
  registerButtonContainer: {
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: "#336BE3",
    borderRadius: 10,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  registerButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScrollContent: {
    paddingRight: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: "#336BE3",
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterTabTextActive: {
    color: "white",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  visitorsContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    width: SCREEN_WIDTH * 0.9,
    alignSelf: "center",
  },
  visitorsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 20,
  },
  visitorsList: {
    // Container for visitor cards
  },
  visitorCard: {
    backgroundColor: "#FBFBFC",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D5DEE8",
  },
  visitorCardContent: {
    flex: 1,
  },
  visitorCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  visitorInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  visitorIcon: {
    marginRight: 8,
  },
  visitorNameContainer: {
    flex: 1,
  },
  visitorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  visitorPhone: {
    fontSize: 13,
    color: "#6b7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  visitorCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  visitorCode: {
    fontSize: 13,
    color: "#336BE3",
    fontWeight: "600",
    marginLeft: 6,
  },
  visitorDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  visitorDetailText: {
    fontSize: 13,
    color: "#4b5563",
    marginLeft: 6,
    flex: 1,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#dc2626",
    backgroundColor: "#FEE2E2",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
    marginLeft: 6,
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
