import { Ionicons } from "@expo/vector-icons";
import React, { useState, useMemo } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntityTable } from "../../components/admin/EntityTable";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Building, BuildingStatus } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function BuildingsScreen() {
  const { currentUser, notifications, actions } = useApp();
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
  const isManagement = currentUser?.role === "management";
  const managedBuildingIds = isManagement
    ? actions.getManagedBuildingIds?.() ?? []
    : [];
  const canManageBuildings = currentUser?.role === "admin";

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
      Alert.alert("Error", "Failed to create building");
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
      Alert.alert("Error", "Failed to assign manager");
    } finally {
      setIsAssigning(false);
    }
  };

  const openManagerModal = (building: Building) => {
    setSelectedBuilding(building);
    setFormData({ ...formData, managerId: building.managerId || "" });
    setShowManagerModal(true);
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
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
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
              const message = `Address: ${building.address}, ${building.city}, ${building.country}\nManager: ${building.managerName || "Not assigned"}\nTotal Units: ${building.totalUnits}\nOccupied: ${building.occupiedUnits}\nStatus: ${building.status}`;

              if (!canManageBuildings) {
                Alert.alert(building.name, message, [{ text: "Close", style: "cancel" }]);
                return;
              }

              Alert.alert(building.name, message, [
                {
                  text: "Assign Manager",
                  onPress: () => openManagerModal(building),
                },
                { text: "Close", style: "cancel" },
              ]);
            }
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
    backgroundColor: "#7034FF",
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
  closeButton: {
    padding: 4,
  },
  buildingNameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7034FF",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
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
    backgroundColor: "#7034FF",
    borderColor: "#7034FF",
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
    backgroundColor: "#7034FF",
    borderColor: "#7034FF",
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
    backgroundColor: "#7034FF",
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
