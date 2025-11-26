import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import type { User } from "../../../lib/types";

import { TenantDetailsModal } from "./_components/TenantDetailsModal";
import { ADMIN_NOTIFICATION_ROUTE } from "./_constants";
import { useTenantsData } from "./_hooks/useTenantsData";
import { styles } from "./_styles";
import {
  useMountLog,
  useRenderLog,
  useScreenFocusLog,
  measure,
} from "../../../utils/adminProfiler";

export default function TenantsScreen() {
  // Profiler hooks - track lifecycle and performance
  useMountLog("Admin/Tenants");
  useRenderLog("Admin/Tenants");
  useScreenFocusLog("Admin/Tenants");

  const {
    allBuildings,
    managedBuildings,
    tenants,
    buildingMap,
    hasUnreadNotifications,
    isManagement,
  } = useTenantsData();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    isManagement && managedBuildings.length === 1 ? managedBuildings[0].id : "all",
  );

  useEffect(() => {
    if (!isManagement) {
      return;
    }

    if (!managedBuildings.length) {
      return;
    }

    if (managedBuildings.length === 1) {
      setSelectedBuildingId(managedBuildings[0].id);
      return;
    }

    // Only reset to "all" if the currently selected building is no longer in the managed list
    setSelectedBuildingId((currentId) => {
      if (currentId === "all") return currentId;
      const stillValid = managedBuildings.some((building) => building.id === currentId);
      return stillValid ? currentId : "all";
    });
  }, [isManagement, managedBuildings]);

  const tenantIndex = useMemo(
    () =>
      tenants.map((tenant) => {
        const buildingId = tenant.profile?.buildingId || "";
        const apartment = tenant.profile?.apartment || "";
        const tower = tenant.profile?.tower || "";
        const haystack = `${tenant.name} ${tenant.email} ${apartment} ${tower}`.toLowerCase();
        return { tenant, buildingId, apartment, haystack };
      }),
    [tenants],
  );

  const filteredTenants = useMemo(() => {
    return measure("Build Admin/Tenants filteredTenants", () => {
      const query = searchQuery.trim().toLowerCase();
      const buildingScope = isManagement && managedBuildings.length ? managedBuildings : null;

      return tenantIndex
        .filter((item) => {
          if (!item.buildingId) return false;
          if (selectedBuildingId !== "all" && item.buildingId !== selectedBuildingId) {
            return false;
          }
          if (buildingScope) {
            const inScope = buildingScope.some((building) => building.id === item.buildingId);
            if (!inScope) return false;
          }
          if (!query) return true;
          return item.haystack.includes(query);
        })
        .sort((a, b) => a.apartment.localeCompare(b.apartment))
        .map((item) => item.tenant);
    });
  }, [tenantIndex, searchQuery, selectedBuildingId, isManagement, managedBuildings]);

  const occupancySnapshot = useMemo(() => {
    return measure("Build Admin/Tenants occupancySnapshot", () => {
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
    });
  }, [selectedBuildingId, buildingMap, managedBuildings, allBuildings]);

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
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: 200 + insets.bottom },
        ]}
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

      <TenantDetailsModal
        tenant={selectedTenant}
        visible={Boolean(selectedTenant)}
        pagePadding={pagePadding}
        buildingMap={buildingMap}
        onClose={() => setSelectedTenant(null)}
      />
    </SafeAreaView>
  );
}
