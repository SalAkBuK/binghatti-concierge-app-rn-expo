import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import { useApp } from "../../../lib/context/connected-app-provider";
import type { Building } from "../../../lib/types";
import { filterNotificationsByUser } from "../../../lib/utils/helpers";

const SUPERADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function SuperAdminBuildingsScreen() {
  const { currentUser, notifications, buildings } = useApp();
  const { width } = useWindowDimensions();
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const [searchQuery, setSearchQuery] = useState("");
  const [showSideMenu, setShowSideMenu] = useState(false);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Get all buildings
  const allBuildings = useMemo(() => {
    return buildings || [];
  }, [buildings]);

  // Filter buildings based on search
  const filteredBuildings = useMemo(() => {
    if (!searchQuery.trim()) return allBuildings;
    const query = searchQuery.toLowerCase();
    return allBuildings.filter(
      (building) =>
        building.name.toLowerCase().includes(query) ||
        building.address?.toLowerCase().includes(query) ||
        building.emirate?.toLowerCase().includes(query)
    );
  }, [allBuildings, searchQuery]);

  const handleCreateBuilding = useCallback(() => {
    Alert.alert(
      "Coming Soon",
      "Building creation functionality will be available soon. This will allow you to create new buildings with full details including location, amenities, and unit breakdowns."
    );
  }, []);

  const handleEditBuilding = useCallback((building: Building) => {
    Alert.alert(
      "Coming Soon",
      `Building editing for "${building.name}" will be available soon. You'll be able to update all building details, amenities, and management information.`
    );
  }, []);

  const handleDeleteBuilding = useCallback((building: Building) => {
    Alert.alert(
      "Delete Building",
      `Are you sure you want to delete "${building.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Coming Soon",
              "Building deletion functionality will be implemented soon with proper validation to ensure no active tenants or units."
            );
          },
        },
      ]
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Buildings Management"
          subtitle="Manage all buildings in the system"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={SUPERADMIN_NOTIFICATION_ROUTE}
        />

        {/* Search Bar and Create Button */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          style={styles.topBar}
        >
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search buildings..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          {/* <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateBuilding}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Building</Text>
          </TouchableOpacity> */}
        </Animated.View>

        {/* Stats Card */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(300)}
          style={styles.statsCard}
        >
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{allBuildings.length}</Text>
            <Text style={styles.statLabel}>Total Buildings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredBuildings.length}</Text>
            <Text style={styles.statLabel}>Filtered</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {allBuildings.filter((b) => b.status === "active").length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </Animated.View>

        {/* Buildings List */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(300)}
          style={styles.listSection}
        >
          <Text style={styles.sectionTitle}>Buildings</Text>
          {filteredBuildings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                {searchQuery ? "No buildings found" : "No buildings yet"}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? "Try adjusting your search"
                  : "Create your first building to get started"}
              </Text>
            </View>
          ) : (
            <View style={styles.buildingsList}>
              {filteredBuildings.map((building, index) => (
                <Animated.View
                  key={building.id}
                  entering={FadeInDown.delay(250 + index * 50).duration(300)}
                >
                  <View style={styles.buildingCard}>
                    <View style={styles.buildingIconContainer}>
                      <Ionicons name="business" size={24} color="#F59E0B" />
                    </View>
                    <View style={styles.buildingInfo}>
                      <Text style={styles.buildingName}>{building.name}</Text>
                      <View style={styles.buildingMeta}>
                        {building.emirate && (
                          <View style={styles.metaItem}>
                            <Ionicons name="location" size={12} color="#6B7280" />
                            <Text style={styles.metaText}>{building.emirate}</Text>
                          </View>
                        )}
                        {building.totalUnits !== undefined && (
                          <View style={styles.metaItem}>
                            <Ionicons name="grid" size={12} color="#6B7280" />
                            <Text style={styles.metaText}>
                              {building.totalUnits} units
                            </Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          building.status === "active"
                            ? styles.statusActive
                            : building.status === "maintenance"
                            ? styles.statusMaintenance
                            : styles.statusInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            building.status === "active"
                              ? styles.statusTextActive
                              : building.status === "maintenance"
                              ? styles.statusTextMaintenance
                              : styles.statusTextInactive,
                          ]}
                        >
                          {building.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {/* <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditBuilding(building)}
                      >
                        <Ionicons name="pencil-outline" size={20} color="#7034FF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteBuilding(building)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View> */}
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  topBar: {
    marginTop: 24,
    gap: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7034FF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#F59E0B",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
  },
  listSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  buildingsList: {
    gap: 12,
  },
  buildingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
  },
  buildingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F59E0B15",
    alignItems: "center",
    justifyContent: "center",
  },
  buildingInfo: {
    flex: 1,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  buildingMeta: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  statusActive: {
    backgroundColor: "#10B98115",
  },
  statusMaintenance: {
    backgroundColor: "#F59E0B15",
  },
  statusInactive: {
    backgroundColor: "#EF444415",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextActive: {
    color: "#10B981",
  },
  statusTextMaintenance: {
    color: "#F59E0B",
  },
  statusTextInactive: {
    color: "#EF4444",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
});
