import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type ReactElement } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntityTable } from "../../components/admin/EntityTable";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type {
  AppError,
  Building,
  BuildingStatus,
  BuildingUnit,
  BuildingEmployee,
  ServiceProviderProfile,
  VisitorLog,
  UnitType,
} from "../../lib/types";
import { getUserErrorMessage } from "../../lib/services/api/errors";
import { filterNotificationsByUser, formatDate } from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function BuildingsScreen() {
  const { currentUser, notifications, actions, unitTypes } = useApp();
  const { width } = useWindowDimensions();
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [detailsBuilding, setDetailsBuilding] = useState<Building | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const isManagement = currentUser?.role === "management";
  const hasScopedBuildings =
    currentUser?.role === "management" || currentUser?.role === "super_admin";
  const managedBuildingIds = hasScopedBuildings
    ? actions.getManagedBuildingIds?.() ?? []
    : [];
  const canManageBuildings = ["admin", "super_admin"].includes(
    currentUser?.role ?? "",
  );

  // Create building form state
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    managerId: "",
    totalUnits: "",
    status: "active" as BuildingStatus,
  });

  const allBuildings = actions.getBuildings();
  const allUsers = actions.getUsers();

  // Get management users for manager dropdown
  const managementUsers = useMemo(
    () => allUsers.filter((user) => user.role === "management"),
    [allUsers]
  );

  const buildings = useMemo(() => {
    if (!isManagement) return allBuildings;
    if (!managedBuildingIds.length) {
      return allBuildings.filter(
        (building) => building.managerId === currentUser?.id,
      );
    }
    return allBuildings.filter((building) =>
      managedBuildingIds.includes(building.id),
    );
  }, [allBuildings, currentUser?.id, isManagement, managedBuildingIds]);

  const filteredBuildings = buildings.filter(
    (building) =>
      !searchQuery.trim() ||
      building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      building.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: { bg: "#D1FAE5", text: "#065F46" },
      maintenance: { bg: "#FEF3C7", text: "#92400E" },
      inactive: { bg: "#FEE2E2", text: "#DC2626" },
    };
    return colors[status as keyof typeof colors] || colors.active;
  };

  const handleCreateBuilding = async () => {
    if (!canManageBuildings) {
      Alert.alert("Permission Denied", "Only admins can create buildings");
      return;
    }

    // Validate form
    if (!formData.name.trim() || !formData.address.trim() || !formData.city.trim() || !formData.country.trim()) {
      Alert.alert("Validation Error", "Name, address, city, and country are required");
      return;
    }

    const totalUnits = parseInt(formData.totalUnits, 10);
    if (isNaN(totalUnits) || totalUnits <= 0) {
      Alert.alert("Validation Error", "Total units must be a positive number");
      return;
    }

    setIsCreating(true);
    try {
      await actions.createBuilding({
        name: formData.name,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        totalUnits,
        managerId: formData.managerId || undefined,
      });

      Alert.alert("Success", "Building created successfully");
      setShowCreateModal(false);
      // Reset form
      setFormData({
        name: "",
        address: "",
        city: "",
        country: "",
        managerId: "",
        totalUnits: "",
        status: "active",
      });
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignManager = async () => {
    if (!canManageBuildings) {
      Alert.alert("Permission Denied", "Only admins can assign managers");
      return;
    }

    if (!selectedBuilding || !formData.managerId) {
      Alert.alert("Validation Error", "Please select a manager");
      return;
    }

    setIsAssigning(true);
    try {
      await actions.updateBuilding(selectedBuilding.id, {
        managerId: formData.managerId,
      });

      Alert.alert("Success", "Manager assigned successfully");
      setShowManagerModal(false);
      setSelectedBuilding(null);
      setFormData({ ...formData, managerId: "" });
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  const openManagerModal = (building: Building) => {
    setSelectedBuilding(building);
    setFormData({ ...formData, managerId: building.managerId || "" });
    setShowManagerModal(true);
  };

  const openDetailsModal = (building: Building) => {
    setDetailsBuilding(building);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setDetailsBuilding(null);
    setShowDetailsModal(false);
  };

  const resolveUnitType = (id: string): UnitType | undefined => {
    return actions.getUnitTypeById?.(id) || unitTypes?.find((type) => type.id === id);
  };

  const getUnitStatusStyle = (status: BuildingUnit["status"]): ViewStyle => {
    const statusMap: Record<BuildingUnit["status"], ViewStyle> = {
      occupied: { backgroundColor: "#DCFCE7" },
      vacant: { backgroundColor: "#DBEAFE" },
      maintenance: { backgroundColor: "#FEF3C7" },
    };
    return statusMap[status];
  };

  const getVisitorStatusStyle = (status: VisitorLog["status"]): ViewStyle => {
    const statusMap: Record<VisitorLog["status"], ViewStyle> = {
      expected: { backgroundColor: "#E0EAFF" },
      checked_in: { backgroundColor: "#DCFCE7" },
      completed: { backgroundColor: "#E5E7EB" },
      cancelled: { backgroundColor: "#FEE2E2" },
    };
    return statusMap[status];
  };

  const renderUnitItem = (unit: BuildingUnit) => {
    const unitType = resolveUnitType(unit.typeId);
    return (
      <View key={unit.id} style={styles.detailCardRow}>
        <View style={styles.detailCardRowLeft}>
          <Text style={styles.detailCardTitle}>{unit.unitNumber}</Text>
          <Text style={styles.detailCardSubtitle}>
            {unitType?.name || "Unknown type"} • Floor {unit.floor}
          </Text>
        </View>
        <View style={styles.detailCardRowRight}>
        <View
          style={[styles.statusBadge, getUnitStatusStyle(unit.status)]}
        >
            <Text style={styles.statusBadgeText}>{unit.status.toUpperCase()}</Text>
          </View>
          {unit.lastInspectionDate && (
            <Text style={styles.detailMeta}>
              Last inspection {formatDate(unit.lastInspectionDate)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderEmployeeItem = (employee: BuildingEmployee) => (
    <View key={employee.id} style={styles.detailCardRow}>
      <View style={styles.detailCardRowLeft}>
        <Text style={styles.detailCardTitle}>{employee.name}</Text>
        <Text style={styles.detailCardSubtitle}>
          {employee.role} • Shift: {employee.shift || "N/A"}
        </Text>
      </View>
      <View style={styles.detailCardRowRight}>
        <Text style={styles.detailMeta}>{employee.phone}</Text>
        {employee.rating && (
          <Text style={styles.detailMeta}>
            {employee.rating.toFixed(1)} ★ ({employee.jobsCompleted || 0} jobs)
          </Text>
        )}
      </View>
    </View>
  );

  const renderServiceProviderItem = (provider: ServiceProviderProfile) => (
    <View key={provider.id} style={styles.detailCardRow}>
      <View style={styles.detailCardRowLeft}>
        <Text style={styles.detailCardTitle}>{provider.name}</Text>
        <Text style={styles.detailCardSubtitle}>{provider.specialty}</Text>
      </View>
      <View style={styles.detailCardRowRight}>
        <Text style={styles.detailMeta}>{provider.rating.toFixed(1)} ★</Text>
        <Text style={styles.detailMeta}>{provider.jobsCompleted} jobs</Text>
      </View>
    </View>
  );

  const renderVisitorLogItem = (log: VisitorLog) => (
    <View key={log.id} style={styles.detailCardRow}>
      <View style={styles.detailCardRowLeft}>
        <Text style={styles.detailCardTitle}>{log.name}</Text>
        <Text style={styles.detailCardSubtitle}>
          {log.type === "delivery" ? log.company || "Delivery" : "Visitor"} • Unit{" "}
          {log.unitNumber || "-"}
        </Text>
      </View>
      <View style={styles.detailCardRowRight}>
        <View
          style={[styles.statusBadge, getVisitorStatusStyle(log.status)]}
        >
          <Text style={styles.statusBadgeText}>{log.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.detailMeta}>{formatDate(log.expectedArrival)}</Text>
      </View>
    </View>
  );

  const renderDetailsModalContent = () => {
    if (!detailsBuilding) return null;

    const buildingUnitsData =
      actions.getUnitsByBuilding?.(detailsBuilding.id) || [];
    const occupiedUnits = buildingUnitsData.filter(
      (unit) => unit.status === "occupied",
    ).length;
    const vacantUnits = buildingUnitsData.filter(
      (unit) => unit.status === "vacant",
    ).length;
    const maintenanceUnits = buildingUnitsData.filter(
      (unit) => unit.status === "maintenance",
    ).length;
    const employees =
      actions.getBuildingEmployees?.(detailsBuilding.id) || [];
    const visitorEntries =
      actions.getVisitorLogsByBuilding?.(detailsBuilding.id) || [];
    const providerSummaries =
      actions.getRatingSummaries?.("service_provider") || [];
    const providers =
      actions.getServiceProviders?.() as ServiceProviderProfile[] | undefined;
    const providerCards =
      providerSummaries.length > 0 && providers
        ? (providerSummaries
            .slice(0, 3)
            .map((summary) => {
              const provider =
                providers.find(
                  (sp) =>
                    sp.id === summary.entityId || sp.userId === summary.entityId,
                ) || providers.find((sp) => sp.userId === summary.entityId);
              if (!provider) return null;
              return renderServiceProviderItem(provider);
            })
            .filter(Boolean) as ReactElement[])
        : [];

    return (
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <View>
            <Text style={styles.modalTitle}>{detailsBuilding.name}</Text>
            <Text style={styles.modalSubtitle}>
              {detailsBuilding.address}, {detailsBuilding.city}
            </Text>
          </View>
          <TouchableOpacity onPress={closeDetailsModal} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalScrollContent}
        >
          <View style={styles.managerRow}>
            <Text style={styles.sectionTitle}>Building Manager</Text>
            <Text style={styles.detailMeta}>
              {detailsBuilding.managerName || "Not assigned"}
            </Text>
            {canManageBuildings && (
              <TouchableOpacity
                style={styles.assignButton}
                onPress={() => {
                  setShowDetailsModal(false);
                  openManagerModal(detailsBuilding);
                }}
              >
                <Ionicons name="people-outline" size={16} color="#FFFFFF" />
                <Text style={styles.assignButtonText}>
                  {detailsBuilding.managerName ? "Reassign Manager" : "Assign Manager"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{buildingUnitsData.length}</Text>
              <Text style={styles.summaryLabel}>Total Units</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{occupiedUnits}</Text>
              <Text style={styles.summaryLabel}>Occupied</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{vacantUnits}</Text>
              <Text style={styles.summaryLabel}>Vacant</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{maintenanceUnits}</Text>
              <Text style={styles.summaryLabel}>Maintenance</Text>
            </View>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Unit Inventory</Text>
            {buildingUnitsData.length > 0 ? (
              buildingUnitsData.map(renderUnitItem)
            ) : (
              <Text style={styles.emptyDetailText}>No units recorded yet.</Text>
            )}
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Building Employees</Text>
            {employees.length > 0 ? (
              employees.map(renderEmployeeItem)
            ) : (
              <Text style={styles.emptyDetailText}>
                No employees assigned to this building.
              </Text>
            )}
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Service Providers</Text>
            {providerCards.length > 0 ? (
              providerCards
            ) : (
              <Text style={styles.emptyDetailText}>
                No service provider ratings available.
              </Text>
            )}
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Recent Visitor & Delivery Logs</Text>
            {visitorEntries.length > 0 ? (
              visitorEntries.slice(0, 5).map(renderVisitorLogItem)
            ) : (
              <Text style={styles.emptyDetailText}>
                No visitor or delivery activity recorded.
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (building: Building) => (
        <Text style={styles.cellText}>{building.name}</Text>
      ),
      width: isCompact ? undefined : Math.min(260, width * 0.25),
    },
    {
      key: "manager",
      label: "Manager",
      render: (building: Building) => (
        <Text style={styles.cellTextSmall} numberOfLines={1}>
          {building.managerName || "Not assigned"}
        </Text>
      ),
      width: isCompact ? undefined : Math.min(260, width * 0.25),
    },
    {
      key: "units",
      label: "Units",
      render: (building: Building) => (
        <Text style={styles.cellTextSmall}>{building.totalUnits} units</Text>
      ),
      width: 80,
    },
    {
      key: "status",
      label: "Status",
      render: (building: Building) => {
        const statusColors = getStatusColor(building.status);
        return (
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {building.status.toUpperCase()}
            </Text>
          </View>
        );
      },
      width: 100,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.contentWrapper, { paddingHorizontal: pagePadding }] }>
        {/* Header */}
        <HeaderBar
          title="Buildings Management"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        {/* Create Button */}
        {canManageBuildings && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="business" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Building</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Entity Table */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.tableContainer}
        >
          <EntityTable
            data={filteredBuildings}
            columns={columns}
            onRowPress={(building) => {
              setSelectedBuilding(building);
              openDetailsModal(building);
            }}
            emptyMessage="No buildings found"
            searchPlaceholder="Search buildings..."
            onSearch={setSearchQuery}
            keyExtractor={(building) => building.id}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </Animated.View>
      </View>

      {/* Side Menu */}
      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      {/* Create Building Modal */}
      {canManageBuildings && (
        <Modal
          visible={showCreateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.modalContent}
            >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Building</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Building Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter building name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Address *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter street address"
                  value={formData.address}
                  onChangeText={(text) => setFormData({ ...formData, address: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter city"
                  value={formData.city}
                  onChangeText={(text) => setFormData({ ...formData, city: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Country *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter country"
                  value={formData.country}
                  onChangeText={(text) => setFormData({ ...formData, country: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Total Units *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter total units"
                  value={formData.totalUnits}
                  onChangeText={(text) => setFormData({ ...formData, totalUnits: text })}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Manager</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        !formData.managerId && styles.pickerOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, managerId: "" })}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          !formData.managerId && styles.pickerOptionTextActive,
                        ]}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {managementUsers.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.pickerOption,
                          formData.managerId === user.id && styles.pickerOptionActive,
                        ]}
                        onPress={() => setFormData({ ...formData, managerId: user.id })}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            formData.managerId === user.id && styles.pickerOptionTextActive,
                          ]}
                        >
                          {user.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.statusButtons}>
                  {(["active", "maintenance", "inactive"] as BuildingStatus[]).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        formData.status === status && styles.statusButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, status })}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          formData.status === status && styles.statusButtonTextActive,
                        ]}
                      >
                        {status.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
                onPress={handleCreateBuilding}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Create Building</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Assign Manager Modal */}
      {canManageBuildings && (
        <Modal
          visible={showManagerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowManagerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[styles.modalContent, { maxHeight: 400 }]}
            >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Manager</Text>
              <TouchableOpacity
                onPress={() => setShowManagerModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.buildingNameText}>
              {selectedBuilding?.name}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Select Manager</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity
                      style={[
                        styles.pickerOption,
                        !formData.managerId && styles.pickerOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, managerId: "" })}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          !formData.managerId && styles.pickerOptionTextActive,
                        ]}
                      >
                        None (Remove Manager)
                      </Text>
                    </TouchableOpacity>
                    {managementUsers.map((user) => (
                      <TouchableOpacity
                        key={user.id}
                        style={[
                          styles.pickerOption,
                          formData.managerId === user.id && styles.pickerOptionActive,
                        ]}
                        onPress={() => setFormData({ ...formData, managerId: user.id })}
                      >
                        <Text
                          style={[
                            styles.pickerOptionText,
                            formData.managerId === user.id && styles.pickerOptionTextActive,
                          ]}
                        >
                          {user.name}
                        </Text>
                        <Text style={styles.pickerOptionSubtext}>{user.email}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isAssigning && styles.submitButtonDisabled]}
                onPress={handleAssignManager}
                disabled={isAssigning}
              >
                {isAssigning ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Assign Manager</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Building Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn.duration(200)} style={[styles.modalContent, { width: "90%", maxHeight: "85%" }]}>
            {renderDetailsModalContent()}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentWrapper: {
    flex: 1,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tableContainer: {
    flex: 1,
    marginBottom: 20,
  },
  cellText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  cellTextSmall: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#111827",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  modalScrollContent: {
    paddingBottom: 20,
    gap: 20,
  },
  buildingNameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
    marginBottom: 16,
  },
  managerRow: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assignButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  formGroup: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    flexBasis: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  detailSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  detailCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailCardRowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  detailCardRowRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  detailCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  detailCardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  detailMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyDetailText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  pickerContainer: {
    maxHeight: 200,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
    marginBottom: 8,
  },
  pickerOptionActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  pickerOptionTextActive: {
    color: "#FFFFFF",
  },
  pickerOptionSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  statusButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  statusButtonTextActive: {
    color: "#FFFFFF",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
