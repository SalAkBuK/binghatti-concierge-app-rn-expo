import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Building, Lease, User } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

interface TenantFormData {
  name: string;
  email: string;
  phone: string;
  buildingId: string;
  tower: string;
  floor: string;
  apartment: string;
}

export default function ManagementTenantsScreen() {
  const { currentUser, notifications, actions, leases } = useApp();
  const { getBuildings, getManagedBuildings, getUsers } = actions;
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
    buildingId: "",
    tower: "",
    floor: "",
    apartment: "",
  });

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;

  const managedBuildings = useMemo(
    () => getManagedBuildings?.() ?? getBuildings(),
    [getManagedBuildings, getBuildings],
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    managedBuildings.length === 1 ? managedBuildings[0].id : "all",
  );

  useEffect(() => {
    if (!managedBuildings.length) {
      setSelectedBuildingId("all");
      return;
    }

    if (
      selectedBuildingId !== "all" &&
      !managedBuildings.some((building) => building.id === selectedBuildingId)
    ) {
      setSelectedBuildingId("all");
    }
  }, [managedBuildings, selectedBuildingId]);

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    managedBuildings.forEach((building) => {
      map.set(building.id, building);
    });
    return map;
  }, [managedBuildings]);

  const tenants = useMemo(
    () => getUsers().filter((user) => user.role === "tenant"),
    [getUsers],
  );

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

        return managedBuildings.some(
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
  }, [tenants, searchQuery, selectedBuildingId, managedBuildings]);

  const occupancySnapshot = useMemo(() => {
    const buildingsScope =
      selectedBuildingId !== "all" && buildingMap.get(selectedBuildingId)
        ? [buildingMap.get(selectedBuildingId)!]
        : managedBuildings;

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
  }, [selectedBuildingId, buildingMap, managedBuildings, activeLeases]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const activeLeasesInScope = useMemo(() => {
    if (selectedBuildingId === "all") {
      const scopeIds = managedBuildings.map((building) => building.id);
      return activeLeases.filter((lease) =>
        scopeIds.includes(lease.buildingId),
      ).length;
    }

    return activeLeases.filter(
      (lease) => lease.buildingId === selectedBuildingId,
    ).length;
  }, [selectedBuildingId, managedBuildings, activeLeases]);

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
        buildingId: managedBuildings[0]?.id || "",
        tower: "",
        floor: "",
        apartment: "",
      });
    }
  }, [showCreateModal, editingTenant, managedBuildings]);

  // Initialize form when editing
  useEffect(() => {
    if (editingTenant) {
      setFormData({
        name: editingTenant.name || "",
        email: editingTenant.email || "",
        phone: editingTenant.phone || "",
        buildingId: editingTenant.profile?.buildingId || managedBuildings[0]?.id || "",
        tower: editingTenant.profile?.tower || "",
        floor: editingTenant.profile?.floor || "",
        apartment: editingTenant.profile?.apartment || "",
      });
      setShowCreateModal(true);
    }
  }, [editingTenant, managedBuildings]);

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
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: "tenant" as const,
        profile: {
          buildingId: formData.buildingId,
          tower: formData.tower.trim() || undefined,
          floor: formData.floor.trim() || undefined,
          apartment: formData.apartment.trim() || undefined,
        },
      };

      if (editingTenant) {
        await actions.adminUpdateUser?.(editingTenant.id, payload as any);
        Alert.alert("Success", "Tenant updated successfully");
      } else {
        await actions.createUser(payload as any);
        Alert.alert("Success", "Tenant created successfully");
      }

      setShowCreateModal(false);
      setEditingTenant(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        buildingId: managedBuildings[0]?.id || "",
        tower: "",
        floor: "",
        apartment: "",
      });
    } catch (error) {
      console.error("Failed to save tenant:", error);
      Alert.alert("Error", editingTenant ? "Failed to update tenant" : "Failed to create tenant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    Alert.alert(
      "Delete Tenant",
      "Are you sure you want to delete this tenant? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await actions.adminDeleteUser?.(tenantId);
              Alert.alert("Success", "Tenant deleted successfully");
              setSelectedTenant(null);
            } catch (error) {
              console.error("Failed to delete tenant:", error);
              Alert.alert("Error", "Failed to delete tenant");
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: 200 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Tenant Directory"
          subtitle="Manage occupants, leases, and unit assignments"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(40).duration(280)}
          style={[
            styles.summaryRow,
            isCompact && styles.summaryRowCompact,
          ]}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Occupancy</Text>
            <Text style={styles.summaryValue}>
              {occupancySnapshot.occupancyRate}%
            </Text>
          <Text style={styles.summaryMeta}>
            {occupancySnapshot.occupiedUnits}/{occupancySnapshot.totalUnits} units
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Vacant Units</Text>
          <Text style={styles.summaryValue}>
            {occupancySnapshot.vacantUnits}
          </Text>
          <Text style={styles.summaryMeta}>
            Across selected management scope
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Active Leases</Text>
          <Text style={styles.summaryValue}>{activeLeasesInScope}</Text>
          <Text style={styles.summaryMeta}>In selected scope</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Residents</Text>
          <Text style={styles.summaryValue}>{filteredTenants.length}</Text>
          <Text style={styles.summaryMeta}>Tenants in scope</Text>
        </View>
        </Animated.View>

        {managedBuildings.length > 1 ? (
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
              {managedBuildings.map((building) => (
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

        <Animated.View
          entering={FadeInDown.delay(160).duration(320)}
          style={styles.tenantList}
        >
          {filteredTenants.length ? (
            filteredTenants.map((tenant) => {
              const building = tenant.profile?.buildingId
                ? buildingMap.get(tenant.profile.buildingId)
                : undefined;
              const tenantLease = leaseByTenant.get(tenant.id);
              return (
                <TouchableOpacity
                  key={tenant.id}
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
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color="#CBD5F5" />
              <Text style={styles.emptyStateTitle}>No tenants found</Text>
              <Text style={styles.emptyStateBody}>
                Try adjusting your building scope or search query.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

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
              <Text style={styles.formLabel}>Building *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.buildingSelector}
              >
                {managedBuildings.map((building) => (
                  <TouchableOpacity
                    key={building.id}
                    style={[
                      styles.buildingChip,
                      formData.buildingId === building.id && styles.buildingChipActive,
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, buildingId: building.id }))
                    }
                  >
                    <Text
                      style={[
                        styles.buildingChipText,
                        formData.buildingId === building.id &&
                          styles.buildingChipTextActive,
                      ]}
                    >
                      {building.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.formLabel}>Tower</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., A, B, C"
                  value={formData.tower}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, tower: text }))}
                />
              </View>

              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.formLabel}>Floor</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., 5, 12"
                  value={formData.floor}
                  onChangeText={(text) => setFormData((prev) => ({ ...prev, floor: text }))}
                  keyboardType="number-pad"
                />
              </View>
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
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    padding: 24,
    gap: 24,
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
    marginBottom: 20,
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
});
