import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { adminApi } from "../../lib/services/api/admin";
import type { Building, Lease, User } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

interface TenantFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  nationality: string;
  buildingId: string;
  tower: string;
  floor: string;
  apartment: string;
  entranceDate: string;
}

export default function ManagementTenantsScreen() {
  const { currentUser, notifications, actions, leases } = useApp();
  const { getBuildings, getManagedBuildings, getUsers } = actions;
  const isManagement = currentUser?.role?.toLowerCase() === "management";
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TenantFormData>({
    name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
    nationality: "",
    buildingId: "",
    tower: "",
    floor: "",
    apartment: "",
    entranceDate: new Date().toISOString(),
  });
  const [backendTenants, setBackendTenants] = useState<User[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [managerBuildings, setManagerBuildings] = useState<Building[]>([]);
  const [loadingManagerBuildings, setLoadingManagerBuildings] = useState(false);

  // Pagination state
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;

  const managedBuildings = useMemo(
    () => getManagedBuildings?.() ?? getBuildings(),
    [getManagedBuildings, getBuildings],
  );

  const buildingOptions = useMemo(
    () => (managedBuildings.length > 0 ? managedBuildings : managerBuildings),
    [managedBuildings, managerBuildings],
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    managedBuildings.length === 1 ? managedBuildings[0].id : "all",
  );

  const defaultFormBuildingId = useMemo(() => {
    if (selectedBuildingId !== "all") {
      return selectedBuildingId;
    }
    return buildingOptions[0]?.id || "";
  }, [selectedBuildingId, buildingOptions]);

  useEffect(() => {
    console.log("[ManagementTenants] Managed buildings updated", {
      count: managedBuildings.length,
      ids: managedBuildings.map((b) => b.id),
      names: managedBuildings.map((b) => b.name),
      selectedBuildingId,
      defaultFormBuildingId,
    });
    console.log("[ManagementTenants] Building options snapshot", {
      optionsCount: buildingOptions.length,
      optionIds: buildingOptions.map((b) => b.id),
      optionNames: buildingOptions.map((b) => b.name),
      managerBuildingsCount: managerBuildings.length,
      loadingManagerBuildings,
    });
  }, [managedBuildings, selectedBuildingId, defaultFormBuildingId, buildingOptions, managerBuildings, loadingManagerBuildings]);

  useEffect(() => {
    const shouldFetchManagerBuildings =
      isManagement &&
      managedBuildings.length === 0 &&
      managerBuildings.length === 0 &&
      !!currentUser.id;

    if (!shouldFetchManagerBuildings) return;

    const fetchBuildings = async () => {
      setLoadingManagerBuildings(true);
      try {
        console.log("[ManagementTenants] Fetching manager buildings (fallback) for user", currentUser.id);
        const response = await adminApi.getBuildingsByManagerId(currentUser.id);
        if (response.success && Array.isArray(response.data)) {
          setManagerBuildings(response.data);
          console.log("[ManagementTenants] Manager buildings fetched", {
            count: response.data.length,
            names: response.data.map((b) => b.name),
          });
        } else {
          setManagerBuildings([]);
          console.warn("[ManagementTenants] Manager buildings fetch returned empty or failed", response);
        }
      } catch (error) {
        console.error("[ManagementTenants] Failed to fetch manager buildings", error);
        setManagerBuildings([]);
      } finally {
        setLoadingManagerBuildings(false);
      }
    };

    fetchBuildings();
  }, [currentUser?.id, isManagement, managedBuildings.length, managerBuildings.length]);

  useEffect(() => {
    if (!buildingOptions.length) {
      setSelectedBuildingId("all");
      return;
    }

    if (
      selectedBuildingId !== "all" &&
      !buildingOptions.some((building) => building.id === selectedBuildingId)
    ) {
      setSelectedBuildingId(buildingOptions[0]?.id || "all");
      return;
    }

    if (selectedBuildingId === "all" && buildingOptions.length === 1) {
      setSelectedBuildingId(buildingOptions[0].id);
    }
  }, [buildingOptions, selectedBuildingId]);

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    buildingOptions.forEach((building) => {
      map.set(building.id, building);
    });
    return map;
  }, [buildingOptions]);

  const modalBuilding = useMemo(() => {
    if (formData.buildingId) {
      return buildingMap.get(formData.buildingId);
    }

    if (selectedBuildingId !== "all") {
      return buildingMap.get(selectedBuildingId);
    }

    return buildingOptions[0];
  }, [formData.buildingId, selectedBuildingId, buildingMap, buildingOptions]);

  useEffect(() => {
    if (!showCreateModal) return;
    console.log("[ManagementTenants] Modal building context", {
      showCreateModal,
      formBuildingId: formData.buildingId,
      selectedBuildingId,
      defaultFormBuildingId,
      modalBuildingName: modalBuilding?.name,
      modalBuildingId: modalBuilding?.id,
      managedBuildingsCount: buildingOptions.length,
      managedBuildingNames: buildingOptions.map((b) => `${b.id}:${b.name}`),
    });
  }, [
    showCreateModal,
    formData.buildingId,
    selectedBuildingId,
    defaultFormBuildingId,
    modalBuilding,
    buildingOptions,
  ]);

  const tenants = useMemo(() => {
    // Prefer backend list when available; fall back to cached users
    if (backendTenants.length > 0) {
      return backendTenants;
    }
    return getUsers().filter((user) => user.role === "tenant");
  }, [backendTenants, getUsers]);

  const activeLeases = useMemo(
    () => leases.filter((lease) => lease.status !== "ended"),
    [leases],
  );

  const leaseByTenant = useMemo(() => {
    const map = new Map<string, Lease>();
    activeLeases.forEach((lease) => {
      map.set(lease.tenantId, lease);
    });
    return map;
  }, [activeLeases]);

  const filteredTenants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tenants
      .filter((tenant) => {
        const tenantBuildingId = tenant.profile?.buildingId;

        if (selectedBuildingId !== "all" && tenantBuildingId !== selectedBuildingId) {
          return false;
        }

        if (!tenantBuildingId) return false;

        return buildingOptions.some(
          (building) => building.id === tenantBuildingId,
        );
      })
      .filter((tenant) => {
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
  }, [tenants, searchQuery, selectedBuildingId, buildingOptions]);

  // Paginated tenants - only show items up to current page
  const paginatedTenants = useMemo(() => {
    return filteredTenants.slice(0, currentPage * ITEMS_PER_PAGE);
  }, [filteredTenants, currentPage, ITEMS_PER_PAGE]);

  const hasMoreTenants = paginatedTenants.length < filteredTenants.length;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBuildingId]);

  const fetchTenantsForBuilding = React.useCallback(
    async (buildingId?: string) => {
      const targetBuildingId =
        buildingId || (selectedBuildingId === "all" ? buildingOptions[0]?.id : selectedBuildingId);

      if (!targetBuildingId) {
        setBackendTenants([]);
        return;
      }

      console.log("[ManagementTenants] Fetching tenants for building", {
        targetBuildingId,
        selectedBuildingId,
        optionsCount: buildingOptions.length,
      });

      setLoadingTenants(true);
      try {
        const numericId =
          typeof targetBuildingId === "string"
            ? parseInt(targetBuildingId.replace(/\D/g, ""), 10)
            : targetBuildingId;

        const response = await adminApi.getTenantsByBuilding(numericId);
        if (response.success && Array.isArray(response.data)) {
          const mapped: User[] = response.data.map((item: any) => ({
            id: String(item.id),
            email: item.email || "",
            name: item.fullName || item.email || `Tenant ${item.id}`,
            role: "tenant",
            phone: item.phoneNumber || "",
            profile: {
              buildingId: String(targetBuildingId),
              apartment: item.profile?.unitNumber || "",
              floor: item.profile?.floorNumber != null ? String(item.profile.floorNumber) : "",
              entranceDate: item.profile?.entranceDate,
              address: item.address,
              nationality: item.nationality,
            } as any,
            status: item.isActive ? "active" : "inactive",
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
          setBackendTenants(mapped);
          console.log("[ManagementTenants] Tenants fetched from backend", {
            count: mapped.length,
            buildingId: targetBuildingId,
          });
        } else {
          setBackendTenants([]);
          console.warn("[ManagementTenants] Tenant fetch returned empty or unsuccessful", {
            buildingId: targetBuildingId,
            response,
          });
        }
      } catch (error) {
        console.error("[ManagementTenants] Failed to fetch tenants by building:", error);
        setBackendTenants([]);
      } finally {
        setLoadingTenants(false);
      }
    },
    [buildingOptions, selectedBuildingId],
  );

  // Fetch tenants from backend when building selection changes
  useEffect(() => {
    fetchTenantsForBuilding();
  }, [fetchTenantsForBuilding]);

  const occupancySnapshot = useMemo(() => {
    const buildingsScope =
      selectedBuildingId !== "all" && buildingMap.get(selectedBuildingId)
        ? [buildingMap.get(selectedBuildingId)!]
        : buildingOptions;

    const totals = buildingsScope.reduce(
      (acc, building) => ({
        totalUnits: acc.totalUnits + building.totalUnits,
        occupiedUnits: acc.occupiedUnits + building.occupiedUnits,
      }),
      { totalUnits: 0, occupiedUnits: 0 },
    );

    const scopeIds = buildingsScope.map((building) => building.id);
    const activeLeaseCount = activeLeases.filter((lease) =>
      scopeIds.includes(lease.buildingId)
    ).length;

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
      activeLeases: activeLeaseCount,
    };
  }, [selectedBuildingId, buildingMap, buildingOptions, activeLeases]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const activeLeasesInScope = useMemo(() => {
    if (selectedBuildingId === "all") {
      const scopeIds = buildingOptions.map((building) => building.id);
      return activeLeases.filter((lease) =>
        scopeIds.includes(lease.buildingId),
      ).length;
    }

    return activeLeases.filter(
      (lease) => lease.buildingId === selectedBuildingId,
    ).length;
  }, [selectedBuildingId, buildingOptions, activeLeases]);

  const selectedTenantLease = selectedTenant
    ? leaseByTenant.get(selectedTenant.id)
    : undefined;

  // Reset form data when modal closes
  useEffect(() => {
    if (!showCreateModal && !editingTenant) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        address: "",
        nationality: "",
        buildingId: defaultFormBuildingId,
        tower: "",
        floor: "",
        apartment: "",
        entranceDate: new Date().toISOString(),
      });
    }
  }, [showCreateModal, editingTenant, buildingOptions, defaultFormBuildingId]);

  useEffect(() => {
    if (showCreateModal && !editingTenant && !formData.buildingId && defaultFormBuildingId) {
      console.log("[ManagementTenants] Applying default building to form", {
        defaultFormBuildingId,
      });
      setFormData((prev) => ({ ...prev, buildingId: defaultFormBuildingId }));
    }
  }, [showCreateModal, editingTenant, formData.buildingId, defaultFormBuildingId]);

  // Initialize form when editing
  useEffect(() => {
    if (editingTenant) {
      setFormData({
        name: editingTenant.name || "",
        email: editingTenant.email || "",
        phone: editingTenant.phone || "",
        password: "",
        address: (editingTenant as any).address || editingTenant.profile?.address || "",
        nationality: (editingTenant as any).nationality || editingTenant.profile?.nationality || "",
        buildingId: editingTenant.profile?.buildingId || buildingOptions[0]?.id || "",
        tower: editingTenant.profile?.tower || "",
        floor: editingTenant.profile?.floor || "",
        apartment: editingTenant.profile?.apartment || "",
        entranceDate:
          (editingTenant.profile as any)?.entranceDate ||
          (editingTenant as any).entranceDate ||
          new Date().toISOString(),
      });
      setShowCreateModal(true);
    }
  }, [editingTenant, buildingOptions]);

  const handleCreateTenant = async () => {
    // Validate form
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert("Validation Error", "Name and email are required");
      return;
    }

    if (!formData.buildingId) {
      Alert.alert("Validation Error", "Building assignment is required");
      return;
    }

    setIsSubmitting(true);
    try {
      // Validate required fields for backend API
      if (!editingTenant && !formData.password.trim()) {
        Alert.alert("Validation Error", "Password is required");
        setIsSubmitting(false);
        return;
      }
      if (!formData.address.trim()) {
        Alert.alert("Validation Error", "Address is required");
        setIsSubmitting(false);
        return;
      }
      if (!formData.nationality.trim()) {
        Alert.alert("Validation Error", "Nationality is required");
        setIsSubmitting(false);
        return;
      }
      if (!formData.apartment.trim()) {
        Alert.alert("Validation Error", "Unit/Apartment is required");
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        phoneNumber: formData.phone.trim(),
        address: formData.address.trim(),
        nationality: formData.nationality.trim(),
        buildingId: formData.buildingId,
        unitNumber: formData.apartment.trim(),
        floorNumber: 0, // Send 0 as default floor number
        entranceDate: formData.entranceDate,
        role: "tenant" as const,
      };
      if (editingTenant && !formData.password.trim()) {
        delete payload.password;
      }

      if (editingTenant) {
        await actions.adminUpdateUser?.(editingTenant.id, {
          ...payload,
          ...(formData.password.trim() ? { password: formData.password.trim() } : {}),
          profile: {
            buildingId: payload.buildingId,
            apartment: payload.unitNumber,
            floor: "0", // Send 0 as string for profile
            address: payload.address,
            nationality: payload.nationality,
            entranceDate: payload.entranceDate,
            tower: "", // Always send empty string
          },
        } as any);
        showSuccessAlert("Tenant updated successfully");
      } else {
        await actions.createUser(payload as any);
        showSuccessAlert("Tenant created successfully");
      }

      setShowCreateModal(false);
      setEditingTenant(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        password: "",
        address: "",
        nationality: "",
        buildingId: defaultFormBuildingId,
        tower: "",
        floor: "",
        apartment: "",
        entranceDate: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to save tenant:", error);
      showErrorAlert(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    Alert.alert(
      "Delete Tenant",
      "Are you sure you want to delete this tenant? You cannot undo this action.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await actions.adminDeleteUser?.(tenantId);
              showSuccessAlert("Tenant deleted successfully");
              setSelectedTenant(null);
            } catch (error) {
              console.error("Failed to delete tenant:", error);
              showErrorAlert(error);
            }
          },
        },
      ]
    );
  };

  const handleEditTenant = (tenant: User) => {
    setEditingTenant(tenant);
    setSelectedTenant(null);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreTenants) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setIsLoadingMore(false);
      }, 300);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTenantsForBuilding().finally(() => {
      setCurrentPage(1);
      setIsRefreshing(false);
    });
  };

  const renderHeader = () => (
    <>
      <HeaderBar
          title="Tenant Directory"
          subtitle="Manage occupants, leases, and unit assignments"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        {buildingOptions.length > 1 ? (
          <Animated.View
            entering={FadeInDown.delay(80).duration(280)}
            style={styles.filterRow}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRowContent}
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
                  All buildings
                </Text>
              </TouchableOpacity>
              {buildingOptions.map((building) => (
                <TouchableOpacity
                  key={building.id}
                  style={[
                    styles.filterChip,
                    selectedBuildingId === building.id &&
                      styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedBuildingId(building.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedBuildingId === building.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {building.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInDown.delay(120).duration(280)}
          style={styles.searchRow}
        >
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, unit, or tower"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Add Tenant</Text>
          </TouchableOpacity>
        </Animated.View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
        {renderHeader()}

        {loadingTenants ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.emptyStateBody}>Loading tenants...</Text>
          </View>
        ) : paginatedTenants.length === 0 ? (
          <View style={[styles.emptyState, styles.emptyStateStandalone]}>
            <Ionicons name="people-outline" size={40} color="#CBD5F5" />
            <Text style={styles.emptyStateTitle}>No tenants found</Text>
            <Text style={styles.emptyStateBody}>
              Try adjusting your building scope or search query.
            </Text>
          </View>
        ) : (
          <FlatList
            data={paginatedTenants}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: tenant }) => {
              const building = tenant.profile?.buildingId
                ? buildingMap.get(tenant.profile.buildingId)
                : undefined;
              const tenantLease = leaseByTenant.get(tenant.id);
              return (
                <TouchableOpacity
                  style={styles.tenantCard}
                  onPress={() => setSelectedTenant(tenant)}
                >
                  <View style={styles.tenantAvatar}>
                    <Text style={styles.tenantAvatarLabel}>
                      {tenant.name?.charAt(0) ?? "T"}
                    </Text>
                  </View>
                  <View style={styles.tenantInfo}>
                    <Text style={styles.tenantName}>{tenant.name}</Text>
                    <Text style={styles.tenantMeta}>{tenant.email}</Text>
                    {building ? (
                      <Text style={styles.tenantMetaSecondary}>
                        {building.name}
                      </Text>
                    ) : null}
                    <View style={styles.tenantTags}>
                      {tenant.profile?.apartment ? (
                        <View style={styles.tag}>
                          <Ionicons
                            name="home-outline"
                            size={12}
                            color="#4B5563"
                          />
                          <Text style={styles.tagLabel}>
                            Unit {tenant.profile.apartment}
                          </Text>
                        </View>
                      ) : null}
                      {building ? (
                        <View style={styles.tag}>
                          <Ionicons
                            name="business-outline"
                            size={12}
                            color="#4B5563"
                          />
                          <Text style={styles.tagLabel}>{building.name}</Text>
                        </View>
                      ) : null}
                      {tenantLease ? (
                        <View style={[styles.tag, styles.tagPrimary]}>
                          <Ionicons
                            name="document-text-outline"
                            size={12}
                            color="#2563EB"
                          />
                          <Text style={[styles.tagLabel, styles.tagPrimaryText]}>
                            {tenantLease.status === "notice" ? "Notice" : "Active"} lease
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.tag, styles.tagWarning]}>
                          <Ionicons
                            name="alert-circle-outline"
                            size={12}
                            color="#D97706"
                          />
                          <Text style={[styles.tagLabel, styles.tagWarningText]}>
                            No lease on file
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#CBD5F5"
                  />
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={() => {
              if (isLoadingMore) {
                return (
                  <View style={styles.loadingFooter}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.loadingFooterText}>Loading more...</Text>
                  </View>
                );
              }
              if (hasMoreTenants && paginatedTenants.length > 0) {
                return (
                  <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                    <Text style={styles.loadMoreButtonText}>
                      Load More ({filteredTenants.length - paginatedTenants.length} remaining)
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#2563EB" />
                  </TouchableOpacity>
                );
              }
              if (paginatedTenants.length > 0 && !hasMoreTenants) {
                return (
                  <View style={styles.endReachedFooter}>
                    <Text style={styles.endReachedText}>
                      Showing all {paginatedTenants.length} tenants
                    </Text>
                  </View>
                );
              }
              return null;
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#2563EB"
                colors={["#2563EB"]}
              />
            }
            contentContainerStyle={[
              styles.tenantList,
              { paddingBottom: 120 },
            ]}
            style={styles.flatList}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={5}
          />
        )}
      </View>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      <Modal
        visible={!!selectedTenant}
        animationType="slide"
        onRequestClose={() => setSelectedTenant(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedTenant(null)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tenant Snapshot</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedTenant ? (
              <>
                <View style={styles.modalProfile}>
                  <View style={styles.modalAvatar}>
                    <Text style={styles.modalAvatarLabel}>
                      {selectedTenant.name?.charAt(0) ?? "T"}
                    </Text>
                  </View>
                  <Text style={styles.modalName}>{selectedTenant.name}</Text>
                  <Text style={styles.modalEmail}>{selectedTenant.email}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Lease Overview</Text>
                  {selectedTenantLease ? (
                    <View style={styles.modalLeaseCard}>
                      <Text style={styles.modalLeaseLine}>
                        {selectedTenantLease.startDate} → {selectedTenantLease.endDate}
                      </Text>
                      <Text style={styles.modalLeaseLine}>
                        Status: {selectedTenantLease.status.toUpperCase()}
                      </Text>
                      <Text style={styles.modalLeaseLine}>
                        Rent: AED {selectedTenantLease.rentAmount.toLocaleString()}/month
                      </Text>
                      {selectedTenantLease.depositAmount ? (
                        <Text style={styles.modalLeaseLine}>
                          Deposit: AED {selectedTenantLease.depositAmount.toLocaleString()}
                        </Text>
                      ) : null}
                      {selectedTenantLease.notes ? (
                        <Text style={styles.modalLeaseNotes}>
                          {selectedTenantLease.notes}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={styles.modalPlaceholder}>
                      No active lease for this tenant.
                    </Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditTenant(selectedTenant)}
                  >
                    <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Edit Tenant</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTenant(selectedTenant.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create/Edit Tenant Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => {
          setShowCreateModal(false);
          setEditingTenant(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                setEditingTenant(null);
              }}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTenant ? "Edit Tenant" : "Create New Tenant"}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {modalBuilding ? (
              <View style={styles.buildingContextCard}>
                <View style={styles.buildingContextIcon}>
                  <Ionicons name="business-outline" size={18} color="#1D4ED8" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.buildingContextLabel}>Building</Text>
                  <Text style={styles.buildingContextName}>{modalBuilding.name}</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter tenant's full name"
                value={formData.name}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter email address"
                value={formData.email}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter phone number"
                value={formData.phone}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Password *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter password"
                value={formData.password}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, password: text }))}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Address *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter address"
                value={formData.address}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, address: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nationality *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., UAE, Indian, Pakistani"
                value={formData.nationality}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, nationality: text }))}
              />
            </View>



            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Unit/Apartment</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., 501, A-1204"
                value={formData.apartment}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, apartment: text }))
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Entrance Date</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
                value={formData.entranceDate}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, entranceDate: text }))
                }
              />
              <Text style={styles.helperText}>
                Uses ISO format; defaults to now if left unchanged.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleCreateTenant}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={editingTenant ? "checkmark" : "add"}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitButtonText}>
                    {editingTenant ? "Save Changes" : "Create Tenant"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
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
  scrollViewContent: {
    paddingBottom: 40,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 20,
    flexWrap: "wrap",
  },
  summaryRowCompact: {
    flexDirection: "column",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
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
    marginTop: 16,
  },
  filterRowContent: {
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#1D4ED8",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  searchRow: {
    marginTop: -10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tenantList: {
    marginTop: 16,
    gap: 14,
    paddingBottom: 40,
  },
  tenantCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  tenantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  tenantAvatarLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  tenantInfo: {
    flex: 1,
    gap: 4,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  tenantMeta: {
    fontSize: 13,
    color: "#6B7280",
  },
  tenantMetaSecondary: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  tenantTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  tagPrimary: {
    backgroundColor: "#DBEAFE",
  },
  tagPrimaryText: {
    color: "#1D4ED8",
  },
  tagWarning: {
    backgroundColor: "#FEF3C7",
  },
  tagWarningText: {
    color: "#B45309",
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 64,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  emptyStateBody: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.2)",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  modalProfile: {
    alignItems: "center",
    gap: 12,
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarLabel: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  modalName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalEmail: {
    fontSize: 14,
    color: "#4B5563",
  },
  modalSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    gap: 12,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  modalPlaceholder: {
    fontSize: 13,
    color: "#6B7280",
  },
  buildingContextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  buildingContextIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  buildingContextLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  buildingContextName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  modalLeaseCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    gap: 6,
  },
  modalLeaseLine: {
    fontSize: 13,
    color: "#374151",
  },
  modalLeaseNotes: {
    fontSize: 12,
    color: "#4B5563",
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formGroupHalf: {
    flex: 1,
  },
  buildingSelector: {
    gap: 10,
    paddingVertical: 4,
  },
  buildingChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    backgroundColor: "#F8FAFC",
  },
  buildingChipActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  buildingChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  buildingChipTextActive: {
    color: "#FFFFFF",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  flatList: {
    flex: 1,
  },
  emptyStateStandalone: {
    marginTop: 16,
    paddingVertical: 24,
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 24,
  },
  loadingFooterText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginVertical: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  endReachedFooter: {
    alignItems: "center",
    paddingVertical: 20,
    paddingBottom: 40,
  },
  endReachedText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});
