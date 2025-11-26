import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntityTable } from "../../../components/admin/EntityTable";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import type { UnitType } from "../../../lib/types";

import { UnitTypeFormModal } from "./_components/UnitTypeFormModal";
import { ADMIN_NOTIFICATION_ROUTE } from "./_constants";
import { useUnitTypesData } from "./_hooks/useUnitTypesData";
import { styles } from "./_styles";
import {
  useMountLog,
  useRenderLog,
  useScreenFocusLog,
  measure,
} from "../../../utils/adminProfiler";

export default function UnitTypesScreen() {
  // Profiler hooks - track lifecycle and performance
  useMountLog("Admin/UnitTypes");
  useRenderLog("Admin/UnitTypes");
  useScreenFocusLog("Admin/UnitTypes");

  const { allUnitTypes, hasUnreadNotifications, canManageUnitTypes, actions } =
    useUnitTypesData();
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

  // Create form state
  const [formData, setFormData] = useState({
    name: "",
    bedrooms: "",
    bathrooms: "",
    areaSqFt: "",
    baseRent: "",
    amenities: [] as string[],
  });

  const filteredUnitTypes = useMemo(() => {
    return measure("Build Admin/UnitTypes filteredUnitTypes", () => {
      if (!searchQuery.trim()) return allUnitTypes;
      const query = searchQuery.toLowerCase();
      return allUnitTypes.filter(
        (type) =>
          type.name.toLowerCase().includes(query) ||
          type.bedrooms.toString().includes(query) ||
          type.bathrooms.toString().includes(query),
      );
    });
  }, [allUnitTypes, searchQuery]);

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
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </Animated.View>
      </View>

      {/* Side Menu */}
      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

      {/* Create Modal */}
      {canManageUnitTypes && (
        <UnitTypeFormModal
          visible={showCreateModal}
          isEditMode={false}
          formData={formData}
          isLoading={isCreating}
          canManageUnitTypes={canManageUnitTypes}
          selectedUnitType={null}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          onSubmit={handleCreateUnitType}
          onDelete={() => {}}
          onFormChange={setFormData}
          onToggleAmenity={toggleAmenity}
        />
      )}

      {/* Edit Modal */}
      {canManageUnitTypes && (
        <UnitTypeFormModal
          visible={showEditModal}
          isEditMode={true}
          formData={formData}
          isLoading={isUpdating}
          canManageUnitTypes={canManageUnitTypes}
          selectedUnitType={selectedUnitType}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUnitType(null);
            resetForm();
          }}
          onSubmit={handleUpdateUnitType}
          onDelete={() => {
            setShowEditModal(false);
            selectedUnitType && handleDeleteUnitType(selectedUnitType);
          }}
          onFormChange={setFormData}
          onToggleAmenity={toggleAmenity}
        />
      )}
    </SafeAreaView>
  );
}
