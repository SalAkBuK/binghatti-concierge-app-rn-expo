import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
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

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Building, User } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function TenantsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { getBuildings, getManagedBuildings, getUsers } = actions;
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;
  const isManagement = currentUser?.role === "management";

  const allBuildings = useMemo(() => getBuildings(), [getBuildings]);
  const managedBuildings = useMemo(() => {
    if (!isManagement) return allBuildings;
    return getManagedBuildings?.() ?? [];
  }, [isManagement, getManagedBuildings, allBuildings]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    isManagement && managedBuildings.length === 1 ? managedBuildings[0].id : "all",
  );

  useEffect(() => {
    if (!isManagement) {
      setSelectedBuildingId("all");
      return;
    }

    if (!managedBuildings.length) {
      setSelectedBuildingId("all");
      return;
    }

    if (managedBuildings.length === 1) {
      setSelectedBuildingId(managedBuildings[0].id);
      return;
    }

    if (
      selectedBuildingId !== "all" &&
      !managedBuildings.some((building) => building.id === selectedBuildingId)
    ) {
      setSelectedBuildingId("all");
    }
  }, [isManagement, managedBuildings, selectedBuildingId]);

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    allBuildings.forEach((building) => {
      map.set(building.id, building);
    });
    return map;
  }, [allBuildings]);

  const allUsers = useMemo(() => getUsers(), [getUsers]);

  const tenants = useMemo(
    () => allUsers.filter((user) => user.role === "tenant"),
    [allUsers],
  );

  const filteredTenants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tenants
      .filter((tenant) => {
        const tenantBuildingId = tenant.profile?.buildingId;

        if (selectedBuildingId !== "all" && tenantBuildingId !== selectedBuildingId) {
          return false;
        }

        if (isManagement && managedBuildings.length) {
          if (!tenantBuildingId) return false;
          const inScope = managedBuildings.some(
            (building) => building.id === tenantBuildingId,
          );
          if (!inScope) return false;
        }

        if (!query) return true;

        const haystack = `${tenant.name} ${tenant.email} ${tenant.profile?.apartment || ""} ${tenant.profile?.tower || ""}`
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((a, b) => {
        const aUnit = a.profile?.apartment || "";
        const bUnit = b.profile?.apartment || "";
        return aUnit.localeCompare(bUnit);
      });
  }, [tenants, searchQuery, selectedBuildingId, isManagement, managedBuildings]);

  const occupancySnapshot = useMemo(() => {
    const buildingsScope =
      selectedBuildingId !== "all" && buildingMap.get(selectedBuildingId)
        ? [buildingMap.get(selectedBuildingId)!]
        : managedBuildings.length
          ? managedBuildings
          : allBuildings;

    const totals = buildingsScope.reduce(
      (acc, building) => ({
        totalUnits: acc.totalUnits + building.totalUnits,
        occupiedUnits: acc.occupiedUnits + building.occupiedUnits,
      }),
      { totalUnits: 0, occupiedUnits: 0 },
    );

    const vacantUnits = Math.max(totals.totalUnits - totals.occupiedUnits, 0);
    const occupancyRate =
      totals.totalUnits > 0
        ? Math.round((totals.occupiedUnits / totals.totalUnits) * 100)
        : 0;

    return {
      totalUnits: totals.totalUnits,
      occupiedUnits: totals.occupiedUnits,
      vacantUnits,
      occupancyRate,
    };
  }, [selectedBuildingId, buildingMap, managedBuildings, allBuildings]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const buildingFilterOptions = useMemo(() => {
    const scope = isManagement ? managedBuildings : allBuildings;
    if (!scope.length) return [];
    if (scope.length === 1) return scope;
    return scope;
  }, [isManagement, managedBuildings, allBuildings]);

  const selectedBuildingName =
    selectedBuildingId !== "all"
      ? buildingMap.get(selectedBuildingId)?.name
      : "All Buildings";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Tenant Directory"
          subtitle={selectedBuildingName}
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(50).duration(350)}
          style={[styles.summaryContainer, isCompact && styles.summaryContainerCompact]}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Active Tenants</Text>
            <Text style={styles.summaryValue}>{filteredTenants.length}</Text>
            <Text style={styles.summaryMeta}>
              {selectedBuildingId === "all" ? "Across portfolio" : "In building"}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Occupancy</Text>
            <Text style={styles.summaryValue}>
              {occupancySnapshot.occupancyRate}%
            </Text>
            <Text style={styles.summaryMeta}>
              {occupancySnapshot.occupiedUnits} of {occupancySnapshot.totalUnits} units
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Vacant Units</Text>
            <Text style={styles.summaryValue}>
              {occupancySnapshot.vacantUnits}
            </Text>
            <Text style={styles.summaryMeta}>Ready for leasing</Text>
          </View>
        </Animated.View>

        {buildingFilterOptions.length > 1 && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(350)}
            style={styles.filterRow}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedBuildingId === "all" && styles.filterChipActive,
                ]}
                onPress={() => setSelectedBuildingId("all")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedBuildingId === "all" && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {buildingFilterOptions.map((building) => {
                const active = selectedBuildingId === building.id;
                return (
                  <TouchableOpacity
                    key={building.id}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedBuildingId(building.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {building.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(140).duration(350)}
          style={styles.searchContainer}
        >
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tenants, units, or towers"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(180).duration(350)}
          style={styles.listContainer}
        >
          {filteredTenants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-circle-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No tenants found</Text>
              <Text style={styles.emptyStateSubtitle}>
                Adjust filters or clear the search query to see more residents.
              </Text>
            </View>
          ) : (
            filteredTenants.map((tenant, index) => {
              const tenantBuilding =
                tenant.profile?.buildingId &&
                buildingMap.get(tenant.profile.buildingId);

              return (
                <Animated.View
                  key={tenant.id}
                  entering={FadeInDown.delay(200 + index * 40).duration(320)}
                >
                  <TouchableOpacity
                    style={styles.tenantCard}
                    onPress={() => setSelectedTenant(tenant)}
                  >
                    <View style={styles.tenantHeader}>
                      <View style={styles.tenantIdentity}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {tenant.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.tenantName}>{tenant.name}</Text>
                          <Text style={styles.tenantRole}>
                            {tenantBuilding ? tenantBuilding.name : "Unassigned"}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </View>

                    <View style={styles.tenantMetaRow}>
                      <View style={styles.metaBadge}>
                        <Ionicons name="home-outline" size={16} color="#4C1D95" />
                        <Text style={styles.metaBadgeText}>
                          Unit {tenant.profile?.apartment || "-"}
                        </Text>
                      </View>
                      <View style={styles.metaBadge}>
                        <Ionicons name="navigate-outline" size={16} color="#2563EB" />
                        <Text style={styles.metaBadgeText}>
                          {tenant.profile?.tower || "Tower"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.tenantFooter}>
                      <Text style={styles.footerLabel}>
                        {tenant.email || "tenant@unknown.com"}
                      </Text>
                      {tenant.profile?.phone ? (
                        <Text style={styles.footerLabel}>
                          {tenant.profile.phone}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

      <Modal
        visible={Boolean(selectedTenant)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedTenant(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { marginHorizontal: pagePadding }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTenant?.name || "Tenant"}
              </Text>
              <TouchableOpacity onPress={() => setSelectedTenant(null)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <Text style={styles.sectionText}>
                {selectedTenant?.email || "Email unavailable"}
              </Text>
              <Text style={styles.sectionText}>
                {selectedTenant?.profile?.phone || "Phone unavailable"}
              </Text>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Residence</Text>
              <Text style={styles.sectionText}>
                Unit {selectedTenant?.profile?.apartment || "-"} ·{" "}
                {selectedTenant?.profile?.tower || "Tower"}
              </Text>
              {selectedTenant?.profile?.buildingId && (
                <Text style={styles.sectionText}>
                  {
                    buildingMap.get(selectedTenant.profile.buildingId)?.name ||
                    "Building"
                  }
                </Text>
              )}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <Text style={styles.sectionText}>
                {selectedTenant?.profile?.emergencyContact || "Not provided"}
              </Text>
              <Text style={styles.sectionText}>
                {selectedTenant?.profile?.emergencyPhone || "Not provided"}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
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
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    marginTop: 16,
    gap: 12,
  },
  summaryContainerCompact: {
    flexDirection: "column",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  summaryMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  filterRow: {
    marginTop: 20,
  },
  filterChips: {
    paddingVertical: 4,
    paddingRight: 12,
    gap: 10,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: "#7034FF",
    borderColor: "#7034FF",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  listContainer: {
    marginTop: 20,
    gap: 14,
  },
  tenantCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tenantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tenantIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EFE9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#5B21B6",
  },
  tenantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  tenantRole: {
    fontSize: 13,
    color: "#6B7280",
  },
  tenantMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#312E81",
  },
  tenantFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  footerLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    gap: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalSection: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sectionText: {
    fontSize: 14,
    color: "#111827",
  },
});
