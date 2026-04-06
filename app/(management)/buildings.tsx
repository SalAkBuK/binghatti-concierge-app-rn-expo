import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type ReactElement } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
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
import { useAuth } from "../../lib/context/auth-context";
import { useAppDomain } from "../../lib/context/connected-app-provider";
import { useNotifications } from "../../lib/context/notifications-context";
import { getUserErrorMessage } from "../../lib/services/api/errors";
import type {
  Building,
  BuildingEmployee,
  BuildingStatus,
  BuildingUnit,
  ServiceProviderProfile,
  UnitType,
  VisitorLog
} from "../../lib/types";
import {
  filterNotificationsByUser,
  formatDate,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function BuildingsScreen() {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const { admin, amenityVisitor, operations, property } = useAppDomain();
  const { unitTypes } = property;
  const { width } = useWindowDimensions();
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [detailsBuilding, setDetailsBuilding] = useState<Building | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const isManagement = currentUser?.role === "management";
  const hasScopedBuildings = currentUser?.role === "management";
  const managedBuildingIds = useMemo(
    () => (hasScopedBuildings ? property.getManagedBuildingIds?.() ?? [] : []),
    [hasScopedBuildings, property],
  );
  const canManageBuildings = currentUser?.role === "management";

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

  const allBuildings = property.getBuildings();
  const allUsers = admin.getUsers();

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
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

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
      await property.updateBuilding(selectedBuilding.id, {
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
    return property.getUnitTypeById?.(id) || unitTypes?.find((type) => type.id === id);
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
      property.getUnitsByBuilding?.(detailsBuilding.id) || [];
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
      property.getBuildingEmployees?.(detailsBuilding.id) || [];
    const visitorEntries =
      amenityVisitor.getVisitorLogsByBuilding?.(detailsBuilding.id) || [];
    const providerSummaries =
      operations.getRatingSummaries?.("service_provider") || [];
    const providers =
      property.getServiceProviders?.() as ServiceProviderProfile[] | undefined;
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

    const occupancyRate = buildingUnitsData.length > 0 
      ? Math.round((occupiedUnits / buildingUnitsData.length) * 100)
      : 0;

    const statusColors = getStatusColor(detailsBuilding.status);

    return (
      <SafeAreaView style={styles.detailsModalContainer}>
        {/* Fixed Header with Gradient */}
        <View style={styles.detailsModalHeader}>
          <View style={styles.detailsHeaderTop}>
            <TouchableOpacity 
              onPress={closeDetailsModal} 
              style={styles.detailsCloseButton}
            >
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={[styles.detailsStatusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.detailsStatusText, { color: statusColors.text }]}>
                {detailsBuilding.status.toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.detailsHeaderContent}>
            <View style={styles.buildingIconContainer}>
              <Ionicons name="business" size={32} color="#2563EB" />
            </View>
            <Text style={styles.detailsBuildingName}>{detailsBuilding.name}</Text>
            <View style={styles.detailsLocationRow}>
              <Ionicons name="location" size={16} color="#9CA3AF" />
              <Text style={styles.detailsLocation}>
                {detailsBuilding.address}, {detailsBuilding.city}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.detailsModalScrollContent}
        >
          {/* Manager Card */}
          <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.detailsManagerCard}>
            <View style={styles.detailsManagerHeader}>
              <View style={styles.detailsManagerIconWrapper}>
                <Ionicons name="person-circle" size={24} color="#2563EB" />
              </View>
              <View style={styles.detailsManagerInfo}>
                <Text style={styles.detailsManagerLabel}>Building Manager</Text>
                <Text style={styles.detailsManagerName}>
                  {detailsBuilding.managerName || "Not assigned"}
                </Text>
              </View>
            </View>
            {canManageBuildings && (
              <TouchableOpacity
                style={styles.detailsAssignButton}
                onPress={() => {
                  setShowDetailsModal(false);
                  openManagerModal(detailsBuilding);
                }}
              >
                <Ionicons name="people-outline" size={18} color="#2563EB" />
                <Text style={styles.detailsAssignButtonText}>
                  {detailsBuilding.managerName ? "Change" : "Assign"}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Stats Grid */}
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.detailsStatsGrid}>
            <View style={[styles.detailsStatCard, styles.detailsStatCardPrimary]}>
              <View style={styles.detailsStatIconWrapper}>
                <Ionicons name="home" size={24} color="#2563EB" />
              </View>
              <Text style={styles.detailsStatValue}>{buildingUnitsData.length}</Text>
              <Text style={styles.detailsStatLabel}>Total Units</Text>
            </View>
            
            <View style={[styles.detailsStatCard, styles.detailsStatCardSuccess]}>
              <View style={styles.detailsStatIconWrapper}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <Text style={styles.detailsStatValue}>{occupiedUnits}</Text>
              <Text style={styles.detailsStatLabel}>Occupied</Text>
              <View style={styles.detailsOccupancyBar}>
                <View style={[styles.detailsOccupancyFill, { width: `${occupancyRate}%` }]} />
              </View>
              <Text style={styles.detailsOccupancyText}>{occupancyRate}% Occupancy</Text>
            </View>
            
            <View style={[styles.detailsStatCard, styles.detailsStatCardInfo]}>
              <View style={styles.detailsStatIconWrapper}>
                <Ionicons name="key" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.detailsStatValue}>{vacantUnits}</Text>
              <Text style={styles.detailsStatLabel}>Vacant</Text>
            </View>
            
            <View style={[styles.detailsStatCard, styles.detailsStatCardWarning]}>
              <View style={styles.detailsStatIconWrapper}>
                <Ionicons name="construct" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.detailsStatValue}>{maintenanceUnits}</Text>
              <Text style={styles.detailsStatLabel}>Maintenance</Text>
            </View>
          </Animated.View>

          {/* Units Section */}
          <Animated.View entering={FadeInDown.delay(150).duration(300)} style={styles.detailsSection}>
            <View style={styles.detailsSectionHeader}>
              <Ionicons name="grid" size={20} color="#1F2937" />
              <Text style={styles.detailsSectionTitle}>Unit Inventory</Text>
              <View style={styles.detailsCountBadge}>
                <Text style={styles.detailsCountBadgeText}>{buildingUnitsData.length}</Text>
              </View>
            </View>
            <View style={styles.detailsSectionContent}>
              {buildingUnitsData.length > 0 ? (
                buildingUnitsData.slice(0, 10).map(renderUnitItem)
              ) : (
                <View style={styles.detailsEmptyState}>
                  <Ionicons name="home-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.detailsEmptyText}>No units recorded yet</Text>
                </View>
              )}
              {buildingUnitsData.length > 10 && (
                <Text style={styles.detailsShowMoreText}>
                  + {buildingUnitsData.length - 10} more units
                </Text>
              )}
            </View>
          </Animated.View>

          {/* Employees Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.detailsSection}>
            <View style={styles.detailsSectionHeader}>
              <Ionicons name="people" size={20} color="#1F2937" />
              <Text style={styles.detailsSectionTitle}>Building Employees</Text>
              <View style={styles.detailsCountBadge}>
                <Text style={styles.detailsCountBadgeText}>{employees.length}</Text>
              </View>
            </View>
            <View style={styles.detailsSectionContent}>
              {employees.length > 0 ? (
                employees.map(renderEmployeeItem)
              ) : (
                <View style={styles.detailsEmptyState}>
                  <Ionicons name="people-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.detailsEmptyText}>No employees assigned</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Service Providers Section */}
          <Animated.View entering={FadeInDown.delay(250).duration(300)} style={styles.detailsSection}>
            <View style={styles.detailsSectionHeader}>
              <Ionicons name="construct" size={20} color="#1F2937" />
              <Text style={styles.detailsSectionTitle}>Service Providers</Text>
              <View style={styles.detailsCountBadge}>
                <Text style={styles.detailsCountBadgeText}>{providerCards.length}</Text>
              </View>
            </View>
            <View style={styles.detailsSectionContent}>
              {providerCards.length > 0 ? (
                providerCards
              ) : (
                <View style={styles.detailsEmptyState}>
                  <Ionicons name="hammer-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.detailsEmptyText}>No service providers yet</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Visitor Logs Section */}
          <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.detailsSection}>
            <View style={styles.detailsSectionHeader}>
              <Ionicons name="log-in" size={20} color="#1F2937" />
              <Text style={styles.detailsSectionTitle}>Recent Visitors & Deliveries</Text>
              <View style={styles.detailsCountBadge}>
                <Text style={styles.detailsCountBadgeText}>{visitorEntries.length}</Text>
              </View>
            </View>
            <View style={styles.detailsSectionContent}>
              {visitorEntries.length > 0 ? (
                visitorEntries.slice(0, 5).map(renderVisitorLogItem)
              ) : (
                <View style={styles.detailsEmptyState}>
                  <Ionicons name="log-in-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.detailsEmptyText}>No visitor activity recorded</Text>
                </View>
              )}
            </View>
          </Animated.View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
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
        animationType="slide"
        onRequestClose={closeDetailsModal}
      >
        <Animated.View entering={FadeIn.duration(200)} style={styles.detailsModalFullScreen}>
          {renderDetailsModalContent()}
        </Animated.View>
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
  // Enhanced Details Modal Styles
  detailsModalFullScreen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  detailsModalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  detailsModalHeader: {
    backgroundColor: "#2563EB",
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  detailsHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  detailsCloseButton: {
    padding: 4,
  },
  detailsStatusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  detailsStatusText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  detailsHeaderContent: {
    alignItems: "center",
  },
  buildingIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  detailsBuildingName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  detailsLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailsLocation: {
    fontSize: 14,
    color: "#DBEAFE",
  },
  detailsModalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  detailsManagerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  detailsManagerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  detailsManagerIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsManagerInfo: {
    flex: 1,
  },
  detailsManagerLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  detailsManagerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  detailsAssignButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  detailsAssignButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  detailsStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  detailsStatCard: {
    flexBasis: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  detailsStatCardPrimary: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  detailsStatCardSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  detailsStatCardInfo: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  detailsStatCardWarning: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
  },
  detailsStatIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  detailsStatValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  detailsStatLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  detailsOccupancyBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginTop: 8,
    overflow: "hidden",
  },
  detailsOccupancyFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 3,
  },
  detailsOccupancyText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#059669",
    marginTop: 4,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  detailsCountBadge: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailsCountBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailsSectionContent: {
    gap: 10,
  },
  detailsEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailsEmptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
  detailsShowMoreText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    textAlign: "center",
    paddingVertical: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    marginTop: 4,
  },
});
