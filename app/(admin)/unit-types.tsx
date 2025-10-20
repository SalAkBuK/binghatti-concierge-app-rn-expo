import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
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
import type { UnitType } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

const AMENITY_OPTIONS = [
  { id: "balcony", label: "Balcony" },
  { id: "parking", label: "Parking" },
  { id: "sea-view", label: "Sea View" },
  { id: "city-view", label: "City View" },
  { id: "smart-lock", label: "Smart Lock" },
  { id: "maid-room", label: "Maid Room" },
  { id: "built-in-wardrobe", label: "Built-in Wardrobe" },
  { id: "furnished", label: "Furnished" },
  { id: "ensuite-washroom", label: "Ensuite Washroom" },
  { id: "kingsize-bed", label: "King Size Bed" },
];

export default function UnitTypesScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(null);

  const canManageUnitTypes = ["admin", "super_admin"].includes(
    currentUser?.role ?? "",
  );

  // Create form state
  const [formData, setFormData] = useState({
    name: "",
    bedrooms: "",
    bathrooms: "",
    areaSqFt: "",
    baseRent: "",
    amenities: [] as string[],
  });

  const allUnitTypes = actions.getUnitTypes();

  const filteredUnitTypes = useMemo(() => {
    if (!searchQuery.trim()) return allUnitTypes;
    const query = searchQuery.toLowerCase();
    return allUnitTypes.filter(
      (type) =>
        type.name.toLowerCase().includes(query) ||
        type.bedrooms.toString().includes(query) ||
        type.bathrooms.toString().includes(query),
    );
  }, [allUnitTypes, searchQuery]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      bedrooms: "",
      bathrooms: "",
      areaSqFt: "",
      baseRent: "",
      amenities: [],
    });
  };

  const handleCreateUnitType = async () => {
    if (!canManageUnitTypes) {
      Alert.alert("Permission Denied", "Only admins can create unit types");
      return;
    }

    // Validate form
    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Name is required");
      return;
    }

    const bedrooms = parseInt(formData.bedrooms, 10);
    const bathrooms = parseFloat(formData.bathrooms);
    const areaSqFt = parseFloat(formData.areaSqFt);

    if (isNaN(bedrooms) || bedrooms < 0) {
      Alert.alert("Validation Error", "Bedrooms must be a valid number");
      return;
    }

    if (isNaN(bathrooms) || bathrooms < 0) {
      Alert.alert("Validation Error", "Bathrooms must be a valid number");
      return;
    }

    if (isNaN(areaSqFt) || areaSqFt <= 0) {
      Alert.alert("Validation Error", "Area must be a positive number");
      return;
    }

    setIsCreating(true);
    try {
      await actions.createUnitType({
        name: formData.name,
        bedrooms,
        bathrooms,
        areaSqFt,
        baseRent: formData.baseRent ? parseFloat(formData.baseRent) : undefined,
        amenities: formData.amenities,
      });

      Alert.alert("Success", "Unit type created successfully");
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to create unit type");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUnitType = async () => {
    if (!canManageUnitTypes || !selectedUnitType) {
      Alert.alert("Permission Denied", "Only admins can update unit types");
      return;
    }

    // Validate form
    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Name is required");
      return;
    }

    const bedrooms = parseInt(formData.bedrooms, 10);
    const bathrooms = parseFloat(formData.bathrooms);
    const areaSqFt = parseFloat(formData.areaSqFt);

    if (isNaN(bedrooms) || bedrooms < 0) {
      Alert.alert("Validation Error", "Bedrooms must be a valid number");
      return;
    }

    if (isNaN(bathrooms) || bathrooms < 0) {
      Alert.alert("Validation Error", "Bathrooms must be a valid number");
      return;
    }

    if (isNaN(areaSqFt) || areaSqFt <= 0) {
      Alert.alert("Validation Error", "Area must be a positive number");
      return;
    }

    setIsUpdating(true);
    try {
      await actions.updateUnitType(selectedUnitType.id, {
        name: formData.name,
        bedrooms,
        bathrooms,
        areaSqFt,
        baseRent: formData.baseRent ? parseFloat(formData.baseRent) : undefined,
        amenities: formData.amenities,
      });

      Alert.alert("Success", "Unit type updated successfully");
      setShowEditModal(false);
      setSelectedUnitType(null);
      resetForm();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update unit type");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUnitType = (unitType: UnitType) => {
    if (!canManageUnitTypes) {
      Alert.alert("Permission Denied", "Only admins can delete unit types");
      return;
    }

    Alert.alert(
      "Delete Unit Type",
      `Are you sure you want to delete "${unitType.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await actions.deleteUnitType(unitType.id);
              Alert.alert("Success", "Unit type deleted successfully");
            } catch (error: any) {
              Alert.alert("Error", error?.message || "Failed to delete unit type");
            }
          },
        },
      ],
    );
  };

  const openEditModal = (unitType: UnitType) => {
    setSelectedUnitType(unitType);
    setFormData({
      name: unitType.name,
      bedrooms: unitType.bedrooms.toString(),
      bathrooms: unitType.bathrooms.toString(),
      areaSqFt: unitType.areaSqFt.toString(),
      baseRent: unitType.baseRent?.toString() || "",
      amenities: unitType.amenities,
    });
    setShowEditModal(true);
  };

  const toggleAmenity = (amenityId: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter((id) => id !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (unitType: UnitType) => (
        <Text style={styles.cellText}>{unitType.name}</Text>
      ),
      width: isCompact ? undefined : Math.min(200, width * 0.2),
    },
    {
      key: "specs",
      label: "Specifications",
      render: (unitType: UnitType) => (
        <Text style={styles.cellTextSmall}>
          {unitType.bedrooms} Beds • {unitType.bathrooms} Baths • {unitType.areaSqFt} sqft
        </Text>
      ),
      width: isCompact ? undefined : Math.min(280, width * 0.3),
    },
    {
      key: "baseRent",
      label: "Base Rent",
      render: (unitType: UnitType) => (
        <Text style={styles.cellTextSmall}>
          {unitType.baseRent ? `AED ${unitType.baseRent.toLocaleString()}` : "N/A"}
        </Text>
      ),
      width: isCompact ? undefined : 120,
    },
    {
      key: "amenities",
      label: "Amenities",
      render: (unitType: UnitType) => (
        <Text style={styles.cellTextSmall} numberOfLines={1}>
          {unitType.amenities.length > 0
            ? `${unitType.amenities.length} amenity(ies)`
            : "None"}
        </Text>
      ),
      width: isCompact ? undefined : 120,
    },
  ];

  const renderFormModal = (isEditMode: boolean) => (
    <Modal
      visible={isEditMode ? showEditModal : showCreateModal}
      transparent
      animationType="fade"
      onRequestClose={() =>
        isEditMode ? setShowEditModal(false) : setShowCreateModal(false)
      }
    >
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditMode ? "Edit Unit Type" : "Create New Unit Type"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                if (isEditMode) {
                  setShowEditModal(false);
                  setSelectedUnitType(null);
                } else {
                  setShowCreateModal(false);
                }
                resetForm();
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Studio, 1BR, 2BR"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>Bedrooms *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.bedrooms}
                  onChangeText={(text) =>
                    setFormData({ ...formData, bedrooms: text })
                  }
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>Bathrooms *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.bathrooms}
                  onChangeText={(text) =>
                    setFormData({ ...formData, bathrooms: text })
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>Area (sqft) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.areaSqFt}
                  onChangeText={(text) =>
                    setFormData({ ...formData, areaSqFt: text })
                  }
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>Base Rent (AED)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional"
                  value={formData.baseRent}
                  onChangeText={(text) =>
                    setFormData({ ...formData, baseRent: text })
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Default Amenities</Text>
              <View style={styles.amenityGrid}>
                {AMENITY_OPTIONS.map((option) => {
                  const active = formData.amenities.includes(option.id);
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.amenityOption,
                        active && styles.amenityOptionActive,
                      ]}
                      onPress={() => toggleAmenity(option.id)}
                    >
                      <Ionicons
                        name={active ? "checkbox" : "square-outline"}
                        size={18}
                        color={active ? "#7034FF" : "#9CA3AF"}
                      />
                      <Text
                        style={[
                          styles.amenityOptionText,
                          active && styles.amenityOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isEditMode ? isUpdating : isCreating) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={isEditMode ? handleUpdateUnitType : handleCreateUnitType}
              disabled={isEditMode ? isUpdating : isCreating}
            >
              {isEditMode ? (
                isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Update Unit Type</Text>
                  </>
                )
              ) : isCreating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Create Unit Type</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Delete Button (Edit Mode Only) */}
            {isEditMode && selectedUnitType && canManageUnitTypes && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  setShowEditModal(false);
                  handleDeleteUnitType(selectedUnitType);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                <Text style={styles.deleteButtonText}>Delete Unit Type</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.contentWrapper, { paddingHorizontal: pagePadding }]}>
        {/* Header */}
        <HeaderBar
          title="Unit Types Management"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        {/* Create Button */}
        {canManageUnitTypes && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Unit Type</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Entity Table */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.tableContainer}
        >
          <EntityTable
            data={filteredUnitTypes}
            columns={columns}
            onRowPress={(unitType) => openEditModal(unitType)}
            emptyMessage="No unit types found"
            searchPlaceholder="Search unit types..."
            onSearch={setSearchQuery}
            keyExtractor={(unitType) => unitType.id}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </Animated.View>
      </View>

      {/* Side Menu */}
      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

      {/* Create Modal */}
      {canManageUnitTypes && renderFormModal(false)}

      {/* Edit Modal */}
      {canManageUnitTypes && renderFormModal(true)}
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
    maxWidth: 550,
    maxHeight: "85%",
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
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formGroupHalf: {
    flex: 1,
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
  amenityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  amenityOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    minWidth: "48%",
  },
  amenityOptionActive: {
    borderColor: "#7034FF",
    backgroundColor: "#F5F3FF",
  },
  amenityOptionText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
  },
  amenityOptionTextActive: {
    color: "#5B21B6",
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
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
});
