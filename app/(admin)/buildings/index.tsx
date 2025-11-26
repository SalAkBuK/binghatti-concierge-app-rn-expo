import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntityTable } from "../../../components/admin/EntityTable";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import type { Building, BuildingStatus, BuildingType, UnitBreakdown } from "../../../lib/types";

import { AssignManagerModal } from "./_components/AssignManagerModal";
import { BuildingDetailsModal } from "./_components/BuildingDetailsModal";
import { CreateBuildingModal } from "./_components/CreateBuildingModal";
import { ADMIN_NOTIFICATION_ROUTE } from "./_constants";
import { useBuildingsData } from "./_hooks/useBuildingsData";
import { styles } from "./_components/_styles";
import type { BuildingFormState } from "./_types";
import { getStatusColor } from "./utils/buildingHelpers";
import {
  useMountLog,
  useRenderLog,
  useScreenFocusLog,
  measure,
} from "../../../utils/adminProfiler";

const createInitialFormState = (): BuildingFormState => ({
  name: "",
  buildingType: "residential" as BuildingType,
  developer: "",
  yearBuilt: "",
  totalFloors: "",
  status: "active" as BuildingStatus,
  emirate: "",
  community: "",
  street: "",
  plotNumber: "",
  buildingNumber: "",
  makaniNumber: "",
  address: "",
  city: "",
  country: "United Arab Emirates",
  utilityPremisesNumber: "",
  totalUnits: "",
  amenities: [],
  studios: "",
  oneBedroom: "",
  twoBedroom: "",
  threeBedroom: "",
  fourPlusBedroom: "",
  commercial: "",
  managerId: "",
});

export default function BuildingsScreen() {
  // Profiler hooks - track lifecycle and performance
  useMountLog("Admin/Buildings");
  useRenderLog("Admin/Buildings");
  useScreenFocusLog("Admin/Buildings");

  const {
    actions,
    unitTypes,
    buildings,
    managementUsers,
    canManageBuildings,
    hasUnreadNotifications,
  } = useBuildingsData();
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
  const [showUnitBreakdown, setShowUnitBreakdown] = useState(false);
  const [formData, setFormData] = useState<BuildingFormState>(createInitialFormState());

  const filteredBuildings = useMemo(
    () =>
      measure("Build Admin/Buildings filteredBuildings", () =>
        buildings.filter(
          (building) =>
            !searchQuery.trim() ||
            building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            building.address.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      ),
    [buildings, searchQuery],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleCreateBuilding = async () => {
    if (!canManageBuildings) {
      Alert.alert("Permission Denied", "Only admins can create buildings");
      return;
    }

    // Validate required fields
    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Building name is required");
      return;
    }

    if (!formData.emirate) {
      Alert.alert("Validation Error", "Emirate is required");
      return;
    }

    if (!formData.community.trim()) {
      Alert.alert("Validation Error", "Community/District is required");
      return;
    }

    const totalUnits = parseInt(formData.totalUnits, 10);
    if (isNaN(totalUnits) || totalUnits <= 0) {
      Alert.alert("Validation Error", "Total units must be a positive number");
      return;
    }

    // Validate optional number fields
    const yearBuilt = formData.yearBuilt.trim() ? parseInt(formData.yearBuilt, 10) : undefined;
    if (yearBuilt !== undefined && (isNaN(yearBuilt) || yearBuilt < 1900 || yearBuilt > new Date().getFullYear() + 5)) {
      Alert.alert("Validation Error", "Please enter a valid year built");
      return;
    }

    const totalFloors = formData.totalFloors.trim() ? parseInt(formData.totalFloors, 10) : undefined;
    if (totalFloors !== undefined && (isNaN(totalFloors) || totalFloors <= 0)) {
      Alert.alert("Validation Error", "Total floors must be a positive number");
      return;
    }

    // Validate and parse unit breakdown (optional)
    let unitBreakdown: UnitBreakdown | undefined = undefined;
    if (showUnitBreakdown) {
      const studios = formData.studios.trim() ? parseInt(formData.studios, 10) : 0;
      const oneBedroom = formData.oneBedroom.trim() ? parseInt(formData.oneBedroom, 10) : 0;
      const twoBedroom = formData.twoBedroom.trim() ? parseInt(formData.twoBedroom, 10) : 0;
      const threeBedroom = formData.threeBedroom.trim() ? parseInt(formData.threeBedroom, 10) : 0;
      const fourPlusBedroom = formData.fourPlusBedroom.trim() ? parseInt(formData.fourPlusBedroom, 10) : 0;
      const commercial = formData.commercial.trim() ? parseInt(formData.commercial, 10) : 0;

      // Validate all are non-negative numbers
      if (
        isNaN(studios) || studios < 0 ||
        isNaN(oneBedroom) || oneBedroom < 0 ||
        isNaN(twoBedroom) || twoBedroom < 0 ||
        isNaN(threeBedroom) || threeBedroom < 0 ||
        isNaN(fourPlusBedroom) || fourPlusBedroom < 0 ||
        isNaN(commercial) || commercial < 0
      ) {
        Alert.alert("Validation Error", "Unit breakdown values must be non-negative numbers");
        return;
      }

      const breakdownTotal = studios + oneBedroom + twoBedroom + threeBedroom + fourPlusBedroom + commercial;

      // Check if breakdown total matches total units (optional warning)
      if (breakdownTotal > 0 && breakdownTotal !== totalUnits) {
        Alert.alert(
          "Unit Breakdown Mismatch",
          `The unit breakdown total (${breakdownTotal}) does not match the total units (${totalUnits}). Do you want to continue anyway?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Continue",
              onPress: () => {
                // Build breakdown object if any values are set
                if (breakdownTotal > 0) {
                  unitBreakdown = {
                    studios: studios > 0 ? studios : undefined,
                    oneBedroom: oneBedroom > 0 ? oneBedroom : undefined,
                    twoBedroom: twoBedroom > 0 ? twoBedroom : undefined,
                    threeBedroom: threeBedroom > 0 ? threeBedroom : undefined,
                    fourPlusBedroom: fourPlusBedroom > 0 ? fourPlusBedroom : undefined,
                    commercial: commercial > 0 ? commercial : undefined,
                  };
                }
                // Continue with building creation
                proceedWithCreation(unitBreakdown);
              },
            },
          ]
        );
        return; // Stop here and wait for user decision
      }

      // Build breakdown object if any values are set
      if (breakdownTotal > 0) {
        unitBreakdown = {
          studios: studios > 0 ? studios : undefined,
          oneBedroom: oneBedroom > 0 ? oneBedroom : undefined,
          twoBedroom: twoBedroom > 0 ? twoBedroom : undefined,
          threeBedroom: threeBedroom > 0 ? threeBedroom : undefined,
          fourPlusBedroom: fourPlusBedroom > 0 ? fourPlusBedroom : undefined,
          commercial: commercial > 0 ? commercial : undefined,
        };
      }
    }

    proceedWithCreation(unitBreakdown);
  };

  const proceedWithCreation = async (unitBreakdown?: UnitBreakdown) => {
    setIsCreating(true);
    try {
      // Construct full address from components
      const addressParts = [
        formData.buildingNumber,
        formData.street,
        formData.community,
        formData.emirate,
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      // Parse totalUnits and yearBuilt
      const totalUnits = parseInt(formData.totalUnits, 10);
      const yearBuilt = formData.yearBuilt.trim() ? parseInt(formData.yearBuilt, 10) : undefined;
      const totalFloors = formData.totalFloors.trim() ? parseInt(formData.totalFloors, 10) : undefined;

      await actions.createBuilding({
        name: formData.name,
        // UAE-specific fields
        emirate: formData.emirate,
        community: formData.community,
        street: formData.street || undefined,
        plotNumber: formData.plotNumber || undefined,
        buildingNumber: formData.buildingNumber || undefined,
        makaniNumber: formData.makaniNumber || undefined,
        buildingType: formData.buildingType,
        developer: formData.developer || undefined,
        yearBuilt,
        totalFloors,
        utilityPremisesNumber: formData.utilityPremisesNumber || undefined,
        // Legacy fields (for backward compatibility)
        address: fullAddress,
        city: formData.emirate, // Use emirate as city for backward compatibility
        country: formData.country,
        // Capacity & Management
        totalUnits,
        unitBreakdown,
        managerId: formData.managerId || undefined,
        amenities: formData.amenities.length ? formData.amenities : undefined,
      });

      Alert.alert("Success", "Building created successfully");
      setShowCreateModal(false);
      setShowUnitBreakdown(false);
      // Reset form
      setFormData(createInitialFormState());
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to create building");
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
      setFormData((prev) => ({ ...prev, managerId: "" }));
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to assign manager");
    } finally {
      setIsAssigning(false);
    }
  };

  const openManagerModal = (building: Building) => {
    setSelectedBuilding(building);
    setFormData((prev) => ({ ...prev, managerId: building.managerId || "" }));
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

      <CreateBuildingModal
        visible={showCreateModal}
        formData={formData}
        setFormData={setFormData}
        showUnitBreakdown={showUnitBreakdown}
        setShowUnitBreakdown={setShowUnitBreakdown}
        managementUsers={managementUsers}
        isLoading={isCreating}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateBuilding}
      />
      <AssignManagerModal
        visible={showManagerModal}
        managementUsers={managementUsers}
        selectedBuilding={selectedBuilding}
        managerId={formData.managerId}
        setManagerId={(managerId) =>
          setFormData((prev) => ({
            ...prev,
            managerId,
          }))
        }
        isAssigning={isAssigning}
        onClose={() => setShowManagerModal(false)}
        onSubmit={handleAssignManager}
      />
      <BuildingDetailsModal
        visible={showDetailsModal}
        building={detailsBuilding}
        onClose={closeDetailsModal}
        actions={actions}
        unitTypes={unitTypes}
        canManageBuildings={canManageBuildings}
        onAssignManager={openManagerModal}
      />
    </SafeAreaView>
  );
}
