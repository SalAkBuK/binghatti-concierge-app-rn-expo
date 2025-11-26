import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
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
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Building, BuildingUnit, Lease, UnitType } from "../../lib/types";
import { getUserErrorMessage } from "../../lib/services/api/errors";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

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

type UnitStatusFilter = "all" | BuildingUnit["status"];

const UNIT_STATUS_OPTIONS: { label: string; value: UnitStatusFilter }[] = [
  { label: "All Units", value: "all" },
  { label: "Occupied", value: "occupied" },
  { label: "Vacant", value: "vacant" },
  { label: "Maintenance", value: "maintenance" },
];

export default function ManagementUnitsScreen() {
  const { currentUser, notifications, actions, buildingUnits, unitTypes, leases } =
    useApp();
  const { getBuildings, getManagedBuildings, updateUnit, createUnit } = actions;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>("all");
  const [selectedUnit, setSelectedUnit] = useState<BuildingUnit | null>(null);
  const [editedAmenities, setEditedAmenities] = useState<string[]>([]);
  const [editedStatus, setEditedStatus] = useState<BuildingUnit["status"]>("occupied");
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  // Create unit modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    buildingId: "",
    unitNumber: "",
    floor: "",
    tower: "",
    templateId: "",
    areaSqFt: "",
    bedrooms: "",
    bathrooms: "",
    rentAmount: "",
    status: "vacant" as BuildingUnit["status"],
    amenities: [] as string[],
    furnishing: "unfurnished" as "furnished" | "semi_furnished" | "unfurnished",
    managedBy: "" as "building" | "owner" | "",
    billsInclusive: false,
    maintenanceInclusive: false,
    depositAmount: "",
    maintenanceCharges: "",
  });

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 900;
  const isManagement = currentUser?.role === "management";

  const allBuildings = useMemo(() => getBuildings(), [getBuildings]);
  const managedBuildings = useMemo(() => {
    if (!isManagement) return allBuildings;
    return getManagedBuildings?.() ?? [];
  }, [isManagement, getManagedBuildings, allBuildings]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    isManagement && managedBuildings.length === 1
      ? managedBuildings[0].id
      : "all",
  );

  const activeLeaseMap = useMemo(() => {
    const map = new Map<string, Lease>();
    leases
      .filter((lease) => lease.status === "active" || lease.status === "notice")
      .forEach((lease) => {
        map.set(lease.unitId, lease);
      });
    return map;
  }, [leases]);

  useEffect(() => {
    if (!isManagement) {
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
    allBuildings.forEach((building) => map.set(building.id, building));
    return map;
  }, [allBuildings]);

  const unitTypeMap = useMemo(() => {
    const map = new Map<string, UnitType>();
    unitTypes.forEach((type) => map.set(type.id, type));
    return map;
  }, [unitTypes]);

  const filteredUnits = useMemo(() => {
    const buildingScope =
      selectedBuildingId === "all"
        ? managedBuildings.length
          ? managedBuildings.map((building) => building.id)
          : undefined
        : [selectedBuildingId];

    return buildingUnits
      .filter((unit) => {
        if (!unit.buildingId) return false;
        if (buildingScope && buildingScope.length) {
          return buildingScope.includes(unit.buildingId);
        }
        if (isManagement && managedBuildings.length) {
          return managedBuildings.some(
            (building) => building.id === unit.buildingId,
          );
        }
        return true;
      })
      .filter((unit) =>
        statusFilter === "all" ? true : unit.status === statusFilter,
      )
      .sort((a, b) => {
        if (a.floor !== b.floor) return a.floor - b.floor;
        return a.unitNumber.localeCompare(b.unitNumber);
      });
  }, [
    buildingUnits,
    selectedBuildingId,
    managedBuildings,
    statusFilter,
    isManagement,
  ]);

  const statusBreakdown = useMemo(() => {
    const scopeUnits = filteredUnits;
    return {
      occupied: scopeUnits.filter((unit) => unit.status === "occupied").length,
      vacant: scopeUnits.filter((unit) => unit.status === "vacant").length,
      maintenance: scopeUnits.filter(
        (unit) => unit.status === "maintenance",
      ).length,
    };
  }, [filteredUnits]);

  const buildingFilterOptions = useMemo(() => {
    const scope = isManagement ? managedBuildings : allBuildings;
    if (scope.length <= 1) return scope;
    return scope;
  }, [isManagement, managedBuildings, allBuildings]);

  const selectedBuildingName =
    selectedBuildingId !== "all"
      ? buildingMap.get(selectedBuildingId)?.name
      : "All Buildings";

  const toggleAmenity = (amenityId: string, isCreateMode = false) => {
    if (isCreateMode) {
      setCreateFormData((prev) => ({
        ...prev,
        amenities: prev.amenities.includes(amenityId)
          ? prev.amenities.filter((id) => id !== amenityId)
          : [...prev.amenities, amenityId],
      }));
    } else {
      setEditedAmenities((prev) =>
        prev.includes(amenityId)
          ? prev.filter((item) => item !== amenityId)
          : [...prev, amenityId],
      );
    }
  };

  const openUnitEditor = (unit: BuildingUnit) => {
    setSelectedUnit(unit);
    setEditedAmenities(unit.amenities || []);
    setEditedStatus(unit.status);
  };

  const handleSaveUnit = async () => {
    if (!selectedUnit) return;
    setIsSavingUnit(true);
    try {
      await updateUnit(selectedUnit.id, {
        amenities: editedAmenities,
        status: editedStatus,
      });
      Alert.alert("Updated", "Unit details saved successfully.");
      setSelectedUnit(null);
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Update failed", errorMessage);
    } finally {
      setIsSavingUnit(false);
    }
  };

  const handleCreateUnit = async () => {
    // Validation
    if (!createFormData.buildingId) {
      Alert.alert("Validation Error", "Please select a building");
      return;
    }
    if (!createFormData.templateId) {
      Alert.alert("Validation Error", "Please select a unit type");
      return;
    }
    if (!createFormData.unitNumber.trim()) {
      Alert.alert("Validation Error", "Please enter a unit number");
      return;
    }

    const floor = parseInt(createFormData.floor, 10);
    if (isNaN(floor) || floor < 0) {
      Alert.alert("Validation Error", "Please enter a valid floor number");
      return;
    }

    if (!createFormData.managedBy) {
      Alert.alert("Validation Error", "Please select who manages this unit");
      return;
    }

    // Conditional validation based on managedBy
    if (createFormData.managedBy === "building") {
      const deposit = parseFloat(createFormData.depositAmount);
      if (isNaN(deposit) || deposit < 0) {
        Alert.alert("Validation Error", "Please enter a valid deposit amount");
        return;
      }

      const maintenance = parseFloat(createFormData.maintenanceCharges);
      if (isNaN(maintenance) || maintenance < 0) {
        Alert.alert("Validation Error", "Please enter valid maintenance charges");
        return;
      }
    }

    // Check capacity and warn if approaching limit
    const selectedBuilding = buildingMap.get(createFormData.buildingId);
    if (selectedBuilding) {
      const currentUnitsInBuilding = buildingUnits.filter(
        (unit) => unit.buildingId === createFormData.buildingId,
      ).length;
      const capacityPercentage = (currentUnitsInBuilding / selectedBuilding.totalUnits) * 100;

      if (capacityPercentage >= 90) {
        const remaining = selectedBuilding.totalUnits - currentUnitsInBuilding;
        Alert.alert(
          "Capacity Warning",
          `This building is ${Math.round(capacityPercentage)}% full. Only ${remaining} unit slot(s) remaining out of ${selectedBuilding.totalUnits} total.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Continue Anyway", onPress: () => proceedWithCreation() },
          ],
        );
        return;
      }
    }

    proceedWithCreation();
  };

  const proceedWithCreation = async () => {
    const floor = parseInt(createFormData.floor, 10);

    setIsCreating(true);
    try {
      const template = unitTypeMap.get(createFormData.templateId);

      await createUnit(createFormData.buildingId, createFormData.templateId, {
        unitNumber: createFormData.unitNumber,
        floor,
        tower: createFormData.tower || undefined,
        areaSqFt: createFormData.areaSqFt
          ? parseFloat(createFormData.areaSqFt)
          : template?.areaSqFt,
        bedrooms: createFormData.bedrooms
          ? parseInt(createFormData.bedrooms, 10)
          : template?.bedrooms,
        bathrooms: createFormData.bathrooms
          ? parseFloat(createFormData.bathrooms)
          : template?.bathrooms,
        rentAmount: createFormData.rentAmount
          ? parseFloat(createFormData.rentAmount)
          : template?.baseRent,
        status: createFormData.status,
        amenities: createFormData.amenities,
        furnishing: createFormData.furnishing,
        managedBy: createFormData.managedBy as "building" | "owner",
        billsInclusive: createFormData.managedBy === "owner" ? createFormData.billsInclusive : undefined,
        maintenanceInclusive: createFormData.managedBy === "owner" ? createFormData.maintenanceInclusive : undefined,
        depositAmount: createFormData.managedBy === "building" ? parseFloat(createFormData.depositAmount) : undefined,
        maintenanceCharges: createFormData.managedBy === "building" ? parseFloat(createFormData.maintenanceCharges) : undefined,
      });

      Alert.alert("Success", "Unit created successfully");
      setShowCreateModal(false);
      resetCreateForm();
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    const defaultBuilding = managedBuildings.length === 1 ? managedBuildings[0] : null;
    setCreateFormData({
      buildingId: defaultBuilding?.id || "",
      unitNumber: "",
      floor: "",
      tower: defaultBuilding?.name || "",
      templateId: "",
      areaSqFt: "",
      bedrooms: "",
      bathrooms: "",
      rentAmount: "",
      status: "vacant",
      amenities: [],
      furnishing: "unfurnished",
      managedBy: "",
      billsInclusive: false,
      maintenanceInclusive: false,
      depositAmount: "",
      maintenanceCharges: "",
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = unitTypeMap.get(templateId);
    if (template) {
      setCreateFormData((prev) => ({
        ...prev,
        templateId,
        areaSqFt: template.areaSqFt.toString(),
        bedrooms: template.bedrooms.toString(),
        bathrooms: template.bathrooms.toString(),
        rentAmount: template.baseRent?.toString() || "",
        amenities: [...template.amenities],
      }));
    }
  };

  const handleBuildingSelect = (buildingId: string) => {
    const building = buildingMap.get(buildingId);
    setCreateFormData((prev) => ({
      ...prev,
      buildingId,
      tower: building?.name || "",
    }));
  };

  const userNotificationsByBuilding = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnread = userNotificationsByBuilding.some((notif) => !notif.read);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 160 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Building Units"
          subtitle="Manage unit inventory, amenities, and status"
          hasUnreadNotifications={hasUnread}
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
            <Text style={styles.summaryLabel}>Units Created</Text>
            <Text style={styles.summaryValue}>
              {filteredUnits.length}
              {selectedBuildingId !== "all" && (
                <Text style={styles.summaryCapacity}>
                  /{buildingMap.get(selectedBuildingId)?.totalUnits || "?"}
                </Text>
              )}
            </Text>
            <Text style={styles.summaryMeta}>{selectedBuildingName}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Occupied</Text>
            <Text style={styles.summaryValue}>{statusBreakdown.occupied}</Text>
            <Text style={styles.summaryMeta}>
              {filteredUnits.length > 0
                ? `${Math.round((statusBreakdown.occupied / filteredUnits.length) * 100)}% occupancy`
                : "No units"}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Vacant</Text>
            <Text style={styles.summaryValue}>{statusBreakdown.vacant}</Text>
            <Text style={styles.summaryMeta}>Ready for lease</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Maintenance</Text>
            <Text style={styles.summaryValue}>
              {statusBreakdown.maintenance}
            </Text>
            <Text style={styles.summaryMeta}>Offline/renovation</Text>
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
                    selectedBuildingId === "all" &&
                      styles.filterChipTextActive,
                  ]}
                >
                  All buildings
                </Text>
              </TouchableOpacity>
              {buildingFilterOptions.map((building) => (
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
          style={styles.filterRowSecondary}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRowContent}
          >
            {UNIT_STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChipSecondary,
                  statusFilter === option.value &&
                    styles.filterChipSecondaryActive,
                ]}
                onPress={() => setStatusFilter(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipSecondaryText,
                    statusFilter === option.value &&
                      styles.filterChipSecondaryTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(160).duration(320)}
          style={styles.unitGrid}
        >
          {filteredUnits.length ? (
          filteredUnits.map((unit) => {
            const building = unit.buildingId
              ? buildingMap.get(unit.buildingId)
              : undefined;
            const lease = activeLeaseMap.get(unit.id);
            const unitType = unitTypeMap.get(unit.typeId);

            return (
              <TouchableOpacity
                key={unit.id}
                  style={styles.unitCard}
                  onPress={() => openUnitEditor(unit)}
                >
                  <View style={styles.unitHeader}>
                    <View>
                      <Text style={styles.unitNumber}>{unit.unitNumber}</Text>
                      <Text style={styles.unitMeta}>
                        Floor {unit.floor} · {unitType?.name || "Unknown"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.unitStatusBadge,
                        unit.status === "occupied" && styles.unitStatusOccupied,
                        unit.status === "vacant" && styles.unitStatusVacant,
                        unit.status === "maintenance" &&
                          styles.unitStatusMaintenance,
                      ]}
                    >
                      <Text style={styles.unitStatusLabel}>
                        {unit.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  {building ? (
                    <Text style={styles.unitBuilding}>{building.name}</Text>
                  ) : null}
                  {lease ? (
                    <Text style={styles.unitLease}>
                      {lease.status === "notice" ? "Notice" : "Active"} lease · {lease.startDate} → {lease.endDate}
                    </Text>
                  ) : (
                    <Text style={styles.unitLeaseEmpty}>No active lease</Text>
                  )}
                  {((lease?.rentAmount ?? unit.rentAmount) ?? 0) > 0 ? (
                    <Text style={styles.unitRent}>
                      AED {(lease?.rentAmount ?? unit.rentAmount ?? 0).toLocaleString()} / month
                    </Text>
                  ) : null}
                  <View style={styles.unitAmenities}>
                    {(unit.amenities || []).slice(0, 3).map((amenity) => (
                      <View key={amenity} style={styles.unitAmenityTag}>
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#2563EB"
                        />
                        <Text style={styles.unitAmenityLabel}>{amenity}</Text>
                      </View>
                    ))}
                    {unit.amenities && unit.amenities.length > 3 ? (
                      <Text style={styles.unitAmenityOverflow}>
                        +{unit.amenities.length - 3}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={40} color="#CBD5F5" />
              <Text style={styles.emptyStateTitle}>No units match filters</Text>
              <Text style={styles.emptyStateBody}>
                {managedBuildings.length === 0
                  ? "No buildings assigned. Contact admin to get started."
                  : "Tap the + button below to create your first unit."}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button */}
      {managedBuildings.length > 0 && (
        <TouchableOpacity
          style={[
            styles.fab,
            { bottom: Math.max(96, 48 + insets.bottom) },
          ]}
          onPress={() => {
            if (managedBuildings.length === 1) {
              handleBuildingSelect(managedBuildings[0].id);
            }
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      {/* Edit Unit Modal */}
      <Modal
        visible={!!selectedUnit}
        animationType="slide"
        onRequestClose={() => setSelectedUnit(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedUnit ? (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity onPress={() => setSelectedUnit(null)}>
                    <Ionicons name="close" size={24} color="#111827" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>
                    Unit {selectedUnit.unitNumber}
                  </Text>
                  <View style={{ width: 24 }} />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Status</Text>
                  <View style={styles.statusPickerRow}>
                    {UNIT_STATUS_OPTIONS.filter(
                      (option) => option.value !== "all",
                    ).map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.statusPickerChip,
                          editedStatus === option.value &&
                            styles.statusPickerChipActive,
                        ]}
                        onPress={() =>
                          setEditedStatus(
                            option.value as BuildingUnit["status"],
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.statusPickerLabel,
                            editedStatus === option.value &&
                              styles.statusPickerLabelActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Amenities</Text>
                  <View style={styles.amenitiesGrid}>
                    {AMENITY_OPTIONS.map((amenity) => {
                      const active = editedAmenities.includes(amenity.id);
                      return (
                        <TouchableOpacity
                          key={amenity.id}
                          style={[
                            styles.amenityChip,
                            active && styles.amenityChipActive,
                          ]}
                          onPress={() => toggleAmenity(amenity.id, false)}
                        >
                          <Text
                            style={[
                              styles.amenityLabel,
                              active && styles.amenityLabelActive,
                            ]}
                          >
                            {amenity.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveUnit}
                  disabled={isSavingUnit}
                >
                  <Text style={styles.saveButtonText}>
                    {isSavingUnit ? "Saving…" : "Save changes"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Create Unit Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetCreateForm();
        }}
      >
        <View style={styles.createModalOverlay}>
          <Animated.View entering={FadeIn.duration(200)} style={styles.createModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Unit</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Banner when no building selected */}
              {!createFormData.buildingId && (
                <View style={styles.bannerContainer}>
                  <Ionicons name="information-circle" size={20} color="#2563EB" />
                  <Text style={styles.bannerText}>Select a building to continue.</Text>
                </View>
              )}

              {/* Building Selection */}
              {managedBuildings.length > 1 && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Building *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {managedBuildings.map((building) => (
                      <TouchableOpacity
                        key={building.id}
                        style={[
                          styles.selectChip,
                          createFormData.buildingId === building.id &&
                            styles.selectChipActive,
                        ]}
                        onPress={() => handleBuildingSelect(building.id)}
                      >
                        <Text
                          style={[
                            styles.selectChipText,
                            createFormData.buildingId === building.id &&
                              styles.selectChipTextActive,
                          ]}
                        >
                          {building.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Template Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Unit Type Template *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {unitTypes.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.selectChip,
                        createFormData.templateId === template.id &&
                          styles.selectChipActive,
                      ]}
                      onPress={() => handleTemplateSelect(template.id)}
                    >
                      <Text
                        style={[
                          styles.selectChipText,
                          createFormData.templateId === template.id &&
                            styles.selectChipTextActive,
                        ]}
                      >
                        {template.name}
                      </Text>
                      <Text style={styles.selectChipSubtext}>
                        {template.bedrooms}BR · {template.bathrooms}BA
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Unit Details */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Unit Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1205, A-302"
                    value={createFormData.unitNumber}
                    onChangeText={(text) =>
                      setCreateFormData((prev) => ({ ...prev, unitNumber: text }))
                    }
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Floor *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 12"
                    value={createFormData.floor}
                    onChangeText={(text) =>
                      setCreateFormData((prev) => ({ ...prev, floor: text }))
                    }
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tower / Building</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  placeholder="Auto-filled from building selection"
                  value={createFormData.tower}
                  editable={false}
                />
              </View>

              {/* Customizable Specs */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Area (sqft)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Auto-filled"
                    value={createFormData.areaSqFt}
                    onChangeText={(text) =>
                      setCreateFormData((prev) => ({ ...prev, areaSqFt: text }))
                    }
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.label}>Rent (AED/month)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Auto-filled"
                    value={createFormData.rentAmount}
                    onChangeText={(text) =>
                      setCreateFormData((prev) => ({ ...prev, rentAmount: text }))
                    }
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Status */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Initial Status *</Text>
                <View style={styles.statusPickerRow}>
                  {UNIT_STATUS_OPTIONS.filter((option) => option.value !== "all").map(
                    (option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.statusPickerChip,
                          createFormData.status === option.value &&
                            styles.statusPickerChipActive,
                        ]}
                        onPress={() =>
                          setCreateFormData((prev) => ({
                            ...prev,
                            status: option.value as BuildingUnit["status"],
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.statusPickerLabel,
                            createFormData.status === option.value &&
                              styles.statusPickerLabelActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>

              {/* Furnishing */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Furnishing *</Text>
                <View style={styles.statusPickerRow}>
                  {[
                    { label: "Furnished", value: "furnished" },
                    { label: "Semi-furnished", value: "semi_furnished" },
                    { label: "Unfurnished", value: "unfurnished" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusPickerChip,
                        createFormData.furnishing === option.value &&
                          styles.statusPickerChipActive,
                      ]}
                      onPress={() =>
                        setCreateFormData((prev) => ({
                          ...prev,
                          furnishing: option.value as "furnished" | "semi_furnished" | "unfurnished",
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.statusPickerLabel,
                          createFormData.furnishing === option.value &&
                            styles.statusPickerLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Managed By */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Managed By *</Text>
                <View style={styles.statusPickerRow}>
                  {[
                    { label: "Managed by Building", value: "building" },
                    { label: "Managed by Owner-Tenant", value: "owner" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusPickerChip,
                        createFormData.managedBy === option.value &&
                          styles.statusPickerChipActive,
                      ]}
                      onPress={() =>
                        setCreateFormData((prev) => ({
                          ...prev,
                          managedBy: option.value as "building" | "owner",
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.statusPickerLabel,
                          createFormData.managedBy === option.value &&
                            styles.statusPickerLabelActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Conditional Fields - Owner Managed */}
              {createFormData.managedBy === "owner" && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Inclusions</Text>
                  <View style={styles.checkboxContainer}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() =>
                        setCreateFormData((prev) => ({
                          ...prev,
                          billsInclusive: !prev.billsInclusive,
                        }))
                      }
                    >
                      <View style={[styles.checkbox, createFormData.billsInclusive && styles.checkboxChecked]}>
                        {createFormData.billsInclusive && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>Bills inclusive</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() =>
                        setCreateFormData((prev) => ({
                          ...prev,
                          maintenanceInclusive: !prev.maintenanceInclusive,
                        }))
                      }
                    >
                      <View style={[styles.checkbox, createFormData.maintenanceInclusive && styles.checkboxChecked]}>
                        {createFormData.maintenanceInclusive && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>Maintenance inclusive</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Conditional Fields - Building Managed */}
              {createFormData.managedBy === "building" && (
                <>
                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, styles.formGroupHalf]}>
                      <Text style={styles.label}>Deposit (AED) *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., 9200"
                        value={createFormData.depositAmount}
                        onChangeText={(text) =>
                          setCreateFormData((prev) => ({ ...prev, depositAmount: text }))
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={[styles.formGroup, styles.formGroupHalf]}>
                      <Text style={styles.label}>Maintenance (AED/mo) *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., 300"
                        value={createFormData.maintenanceCharges}
                        onChangeText={(text) =>
                          setCreateFormData((prev) => ({ ...prev, maintenanceCharges: text }))
                        }
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Amenities */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Unit Amenities</Text>
                <View style={styles.amenitiesGrid}>
                  {AMENITY_OPTIONS.map((amenity) => {
                    const active = createFormData.amenities.includes(amenity.id);
                    return (
                      <TouchableOpacity
                        key={amenity.id}
                        style={[
                          styles.amenityChip,
                          active && styles.amenityChipActive,
                        ]}
                        onPress={() => toggleAmenity(amenity.id, true)}
                      >
                        <Text
                          style={[
                            styles.amenityLabel,
                            active && styles.amenityLabelActive,
                          ]}
                        >
                          {amenity.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Create Button */}
              <TouchableOpacity
                style={[styles.createButton, isCreating && styles.createButtonDisabled]}
                onPress={handleCreateUnit}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.createButtonText}>Create Unit</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
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
  scrollContent: {
    paddingBottom: 160,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
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
  summaryCapacity: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  summaryMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  filterRow: {
    marginTop: 16,
  },
  filterRowSecondary: {
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
  filterChipSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  filterChipSecondaryActive: {
    backgroundColor: "#1D4ED8",
  },
  filterChipSecondaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterChipSecondaryTextActive: {
    color: "#FFFFFF",
  },
  unitGrid: {
    marginTop: 20,
    gap: 16,
    paddingBottom: 120,
  },
  unitCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  unitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  unitNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  unitMeta: {
    fontSize: 13,
    color: "#6B7280",
  },
  unitStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  unitStatusLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F2937",
  },
  unitStatusOccupied: {
    backgroundColor: "#DCFCE7",
  },
  unitStatusVacant: {
    backgroundColor: "#E0EAFF",
  },
  unitStatusMaintenance: {
    backgroundColor: "#FEF3C7",
  },
  unitBuilding: {
    fontSize: 13,
    color: "#4B5563",
  },
  unitLease: {
    fontSize: 12,
    color: "#2563EB",
  },
  unitLeaseEmpty: {
    fontSize: 12,
    color: "#6B7280",
  },
  unitRent: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
  },
  unitAmenities: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  unitAmenityTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
  },
  unitAmenityLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  unitAmenityOverflow: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1D4ED8",
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
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  modalContent: {
    padding: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  statusPickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusPickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  statusPickerChipActive: {
    backgroundColor: "#1D4ED8",
  },
  statusPickerLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusPickerLabelActive: {
    color: "#FFFFFF",
  },
  amenitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  amenityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  amenityChipActive: {
    backgroundColor: "#1D4ED8",
  },
  amenityLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  amenityLabelActive: {
    color: "#FFFFFF",
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  createModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  createModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  formGroup: {
    marginBottom: 20,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    color: "#9CA3AF",
  },
  selectChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 10,
    minWidth: 100,
  },
  selectChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#2563EB",
  },
  selectChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  selectChipTextActive: {
    color: "#1D4ED8",
  },
  selectChipSubtext: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bannerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  bannerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E40AF",
    flex: 1,
  },
  checkboxContainer: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
});
