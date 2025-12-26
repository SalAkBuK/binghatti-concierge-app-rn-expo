import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntityTable } from "../../../components/admin/EntityTable";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import type { Building, BuildingStatus, BuildingType, UnitBreakdown } from "../../../lib/types";
import apiService from "../../../lib/services/api";

import { AssignManagerModal } from "./_components/AssignManagerModal";
import { BuildingDetailsModal } from "./_components/BuildingDetailsModal";
import { CreateBuildingModal } from "./_components/CreateBuildingModal";
import { ADMIN_NOTIFICATION_ROUTE } from "./_constants";
import { useBuildingsData } from "./_hooks/useBuildingsData";
import { styles } from "./_components/_styles";
import type { BuildingFormState } from "./_types";
import { getStatusColor } from "./utils/buildingHelpers";

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
  const {
    currentUser,
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
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [formData, setFormData] = useState<BuildingFormState>(createInitialFormState());
  const [displayLimit, setDisplayLimit] = useState(20); // Pagination: show 20 items initially
  const [managerNamesMap, setManagerNamesMap] = useState<Record<string, string>>({});
  const [loadingManagers, setLoadingManagers] = useState(false);

  const filteredBuildings = useMemo(
    () =>
      buildings.filter(
        (building) =>
          !searchQuery.trim() ||
          building.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          building.address.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [buildings, searchQuery],
  );

  // Paginated buildings (limit display to improve performance)
  const displayedBuildings = useMemo(
    () => filteredBuildings.slice(0, displayLimit),
    [filteredBuildings, displayLimit],
  );

  const hasMoreBuildings = filteredBuildings.length > displayLimit;
  const hiddenCount = filteredBuildings.length - displayLimit;

  const loadMoreBuildings = () => {
    setDisplayLimit((prev) => prev + 20); // Load 20 more
  };

  // Fetch manager names for all displayed buildings
  useEffect(() => {
    let isMounted = true;

    const fetchManagerNames = async () => {
      const currentDisplayed = filteredBuildings.slice(0, displayLimit);

      if (!currentDisplayed.length) return;

      setLoadingManagers(true);
      const newManagersMap: Record<string, string> = {};

      try {
        // Fetch managers for all buildings in parallel
        const managerPromises = currentDisplayed.map(async (building) => {
          // Use cached manager name if available
          if (building.managerName) {
            newManagersMap[building.id] = building.managerName;
            return;
          }

          // Skip if we already have this manager in the map
          if (managerNamesMap[building.id]) {
            newManagersMap[building.id] = managerNamesMap[building.id];
            return;
          }

          try {
            const buildingIdNum = parseInt(building.id, 10);
            if (isNaN(buildingIdNum)) return;

            const response = await apiService.admin.getBuildingManagers(buildingIdNum);

            if (response.success && response.data && response.data.length > 0) {
              const manager = response.data[0];
              const name = manager.fullName || manager.name || null;
              if (name) {
                newManagersMap[building.id] = name;
              }
            }
            // Silent fail for buildings without managers - they'll show "Not assigned"
          } catch (error: any) {
            // Only log error if it's not a cancellation
            if (error?.code !== 'CANCELLED' && error?.message !== 'Request cancelled') {
              console.error(`[Buildings] Failed to fetch manager for building ${building.id}:`, error);
            }
            // Building without manager - will show "Not assigned"
          }
        });

        await Promise.all(managerPromises);

        // Only update state if component is still mounted
        if (isMounted) {
          setManagerNamesMap(newManagersMap);
        }
      } catch (error) {
        console.error('[Buildings] Failed to fetch manager names:', error);
      } finally {
        if (isMounted) {
          setLoadingManagers(false);
        }
      }
    };

    fetchManagerNames();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [buildings.length, displayLimit, searchQuery]); // Use stable dependencies instead of displayedBuildings array reference

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Clear cache and refetch buildings from API
      await actions.refreshBuildings();
    } catch (error) {
      console.error('[Buildings] Failed to refresh:', error);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
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

      const payload = {
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
      };

      if (editingBuilding) {
        await actions.updateBuilding(editingBuilding.id, payload as any);
      } else {
        const response = await actions.createBuilding(payload as any);
        console.log('[Buildings] Create building response:', JSON.stringify(response, null, 2));

        // Auto-assign the current admin to the building they created
        console.log('[Buildings] Auto-assignment check:', {
          hasResponse: !!response,
          hasData: !!response?.data,
          hasId: !!response?.data?.id,
          responseDataId: response?.data?.id,
          hasCurrentUser: !!currentUser,
          currentUserId: currentUser?.id,
          currentUserRole: currentUser?.role,
          assignFunctionAvailable: typeof actions.assignAdminToBuilding,
        });

        if (response?.data?.id && currentUser?.id) {
          try {
            const buildingId = typeof response.data.id === 'string'
              ? parseInt(response.data.id.replace(/\D/g, ''), 10)
              : response.data.id;

            const adminId = typeof currentUser.id === 'string'
              ? parseInt(currentUser.id.replace(/\D/g, ''), 10)
              : currentUser.id;

            console.log('[Buildings] Extracted IDs for assignment:', {
              buildingId,
              buildingIdType: typeof buildingId,
              buildingIdValid: !isNaN(buildingId),
              adminId,
              adminIdType: typeof adminId,
              adminIdValid: !isNaN(adminId),
            });

            if (!isNaN(buildingId) && !isNaN(adminId)) {
              console.log('[Buildings] Calling assignAdminToBuilding...');

              if (!actions.assignAdminToBuilding) {
                console.error('[Buildings] assignAdminToBuilding function not available!');
              } else {
                const assignResult = await actions.assignAdminToBuilding(buildingId, adminId);
                console.log('[Buildings] Assignment result:', assignResult);
                console.log(`[Buildings] ✅ Admin ${adminId} auto-assigned to building ${buildingId}`);
              }
            } else {
              console.error('[Buildings] Invalid IDs - cannot assign:', { buildingId, adminId });
            }
          } catch (assignError) {
            console.error('[Buildings] ❌ Failed to auto-assign admin to building:', assignError);
            console.error('[Buildings] Assignment error details:', {
              message: assignError instanceof Error ? assignError.message : String(assignError),
              stack: assignError instanceof Error ? assignError.stack : undefined,
            });
            // Don't fail the entire operation if assignment fails
          }
        } else {
          console.warn('[Buildings] ⚠️ Cannot auto-assign - missing data:', {
            missingResponseData: !response?.data?.id,
            missingCurrentUser: !currentUser?.id,
          });
        }
      }

      Alert.alert("Success", editingBuilding ? "Building updated successfully" : "Building created successfully");
      setShowCreateModal(false);
      setShowUnitBreakdown(false);
      setEditingBuilding(null);
      // Reset form
      setFormData(createInitialFormState());
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save building");
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
      // Use the new BuildingManager/assign API endpoint
      await actions.assignManagerToBuilding(selectedBuilding.id, formData.managerId);

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

  const startEditBuilding = (building: Building) => {
    setEditingBuilding(building);
    setShowUnitBreakdown(!!building.unitBreakdown);
    setFormData({
      name: building.name || "",
      buildingType: (building.buildingType as BuildingType) || "residential",
      developer: building.developer || "",
      yearBuilt: building.yearBuilt ? String(building.yearBuilt) : "",
      totalFloors: building.totalFloors ? String(building.totalFloors) : "",
      status: (building.status as BuildingStatus) || "active",
      emirate: building.emirate || building.city || "",
      community: building.community || "",
      street: building.street || "",
      plotNumber: building.plotNumber || "",
      buildingNumber: building.buildingNumber || "",
      makaniNumber: building.makaniNumber || "",
      address: building.address || "",
      city: building.city || "",
      country: building.country || "United Arab Emirates",
      utilityPremisesNumber: building.utilityPremisesNumber || "",
      totalUnits: building.totalUnits ? String(building.totalUnits) : "",
      amenities: building.amenities || [],
      studios: building.unitBreakdown?.studios ? String(building.unitBreakdown.studios) : "",
      oneBedroom: building.unitBreakdown?.oneBedroom ? String(building.unitBreakdown.oneBedroom) : "",
      twoBedroom: building.unitBreakdown?.twoBedroom ? String(building.unitBreakdown.twoBedroom) : "",
      threeBedroom: building.unitBreakdown?.threeBedroom ? String(building.unitBreakdown.threeBedroom) : "",
      fourPlusBedroom: building.unitBreakdown?.fourPlusBedroom ? String(building.unitBreakdown.fourPlusBedroom) : "",
      commercial: building.unitBreakdown?.commercial ? String(building.unitBreakdown.commercial) : "",
      managerId: building.managerId || "",
    });
    setShowCreateModal(true);
  };

  const handleDeleteBuilding = async (building: Building) => {
    if (!canManageBuildings) {
      Alert.alert("Permission Denied", "Only admins can delete buildings");
      return;
    }

    Alert.alert(
      "Delete Building",
      `Are you sure you want to delete "${building.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await actions.deleteBuilding(building.id);
              Alert.alert("Success", `Building "${building.name}" has been deleted`);
            } catch (error: any) {
              Alert.alert("Error", error?.message || "Failed to delete building");
            }
          },
        },
      ]
    );
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
      render: (building: Building) => {
        const managerName = managerNamesMap[building.id] || building.managerName;
        const displayText = loadingManagers && !managerName ? "Loading..." : (managerName || "Not assigned");

        return (
          <Text style={styles.cellTextSmall} numberOfLines={1}>
            {displayText}
          </Text>
        );
      },
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
        const status = (building.status || "active") as BuildingStatus;
        const statusColors = getStatusColor(status);
        return (
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>
              {status.toUpperCase()}
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
              onPress={() => {
                setEditingBuilding(null);
                setFormData(createInitialFormState());
                setShowUnitBreakdown(false);
                setShowCreateModal(true);
              }}
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
            data={displayedBuildings}
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

          {/* Load More Button */}
          {hasMoreBuildings && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={loadMoreBuildings}
            >
              <Ionicons name="chevron-down-circle-outline" size={20} color="#7034FF" />
              <Text style={styles.loadMoreText}>
                Load {Math.min(20, hiddenCount)} more buildings ({hiddenCount} remaining)
              </Text>
            </TouchableOpacity>
          )}
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
        onClose={() => {
          setShowCreateModal(false);
          setEditingBuilding(null);
        }}
        onSubmit={handleCreateBuilding}
        modalTitle={editingBuilding ? "Edit Building" : "Create New Building"}
        submitLabel={editingBuilding ? "Update Building" : "Create Building"}
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
        onEditBuilding={startEditBuilding}
        onDeleteBuilding={handleDeleteBuilding}
      />
    </SafeAreaView>
  );
}
