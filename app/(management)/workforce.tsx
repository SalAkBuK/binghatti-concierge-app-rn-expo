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
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import apiService from "../../lib/services/api";
import { getUserErrorMessage } from "../../lib/services/api/errors";
import type {
  Building,
  BuildingEmployee
} from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";
const SHIFT_SEQUENCE: NonNullable<BuildingEmployee["shift"]>[] = [
  "morning",
  "evening",
  "night",
];

export default function WorkforceManagementScreen() {
  const { currentUser, notifications, actions } = useApp();
  const {
    getBuildingEmployees,
    getServiceProviderBuildingAssignments,
    updateBuildingEmployee,
    removeBuildingEmployee,
  } = actions;
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
    password: "",
    address: "",
    nationality: "",
    shift: "morning" as NonNullable<BuildingEmployee["shift"]>,
    buildingId: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [maintenanceStaff, setMaintenanceStaff] = useState<{
    id: number;
    fullName: string;
    email: string;
    phoneNumber: string;
    isActive: boolean;
  }[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);
  const [serviceProviders, setServiceProviders] = useState<{
    id: number;
    fullName: string;
    email: string;
    phoneNumber: string;
    isActive: boolean;
  }[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [managedBuildings, setManagedBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(true);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 900;
  const isManagement = currentUser?.role === "management";

  // Fetch buildings assigned to this manager from the API (same as dashboard)
  useEffect(() => {
    const fetchBuildings = async () => {
      if (!currentUser?.id) {
        setLoadingBuildings(false);
        return;
      }

      setLoadingBuildings(true);
      try {
        console.log('[Workforce] Fetching buildings for manager:', currentUser.id);
        const response = await apiService.admin.getBuildingsByManagerId(currentUser.id);

        if (response.success && response.data) {
          console.log('[Workforce] Buildings fetched:', response.data.length);
          console.log('[Workforce] Building data:', response.data);
          setManagedBuildings(response.data);
        } else {
          console.log('[Workforce] No buildings assigned to this manager');
          setManagedBuildings([]);
        }
      } catch (error) {
        console.error('[Workforce] Failed to fetch buildings:', error);
        setManagedBuildings([]);
      } finally {
        setLoadingBuildings(false);
      }
    };

    fetchBuildings();
  }, [currentUser?.id]);

  const allBuildings = useMemo(() => managedBuildings, [managedBuildings]);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    isManagement && managedBuildings.length === 1 ? managedBuildings[0].id : "all",
  );

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

  // Fetch maintenance staff from API when building selection changes
  useEffect(() => {
    const fetchMaintenanceStaff = async () => {
      if (selectedBuildingId === "all") {
        // Fetch staff for all managed buildings
        setIsLoadingStaff(true);
        try {
          const scopedBuildingIds = isManagement && managedBuildings.length
            ? managedBuildings.map((building) => building.id)
            : allBuildings.map((building) => building.id);

          const staffPromises = scopedBuildingIds.map(async (buildingId) => {
            const buildingIdNum = typeof buildingId === 'string'
              ? parseInt(buildingId.replace(/\D/g, ''), 10)
              : buildingId;
            try {
              const response = await apiService.maintenance.getMaintenanceStaffByBuilding(buildingIdNum);
              return response.success ? response.data : [];
            } catch (error) {
              console.error(`Failed to fetch staff for building ${buildingId}:`, error);
              return [];
            }
          });

          const staffArrays = await Promise.all(staffPromises);
          const allStaff = staffArrays.flat();
          setMaintenanceStaff(allStaff);
        } catch (error) {
          console.error('Failed to fetch maintenance staff:', error);
          setMaintenanceStaff([]);
        } finally {
          setIsLoadingStaff(false);
        }
      } else {
        // Fetch staff for selected building
        setIsLoadingStaff(true);
        try {
          const buildingIdNum = typeof selectedBuildingId === 'string'
            ? parseInt(selectedBuildingId.replace(/\D/g, ''), 10)
            : selectedBuildingId;
          const response = await apiService.maintenance.getMaintenanceStaffByBuilding(buildingIdNum);
          setMaintenanceStaff(response.success ? response.data : []);
        } catch (error) {
          console.error('Failed to fetch maintenance staff:', error);
          setMaintenanceStaff([]);
        } finally {
          setIsLoadingStaff(false);
        }
      }
    };

    fetchMaintenanceStaff();
  }, [selectedBuildingId, isManagement, managedBuildings, allBuildings]);

  // Fetch service providers from API when building selection changes
  useEffect(() => {
    const fetchServiceProviders = async () => {
      if (selectedBuildingId === "all") {
        // Fetch providers for all managed buildings
        setIsLoadingProviders(true);
        try {
          const scopedBuildingIds = isManagement && managedBuildings.length
            ? managedBuildings.map((building) => building.id)
            : allBuildings.map((building) => building.id);

          const providerPromises = scopedBuildingIds.map(async (buildingId) => {
            const buildingIdNum = typeof buildingId === 'string'
              ? parseInt(buildingId.replace(/\D/g, ''), 10)
              : buildingId;
            try {
              const response = await apiService.maintenance.getServiceProvidersByBuilding(buildingIdNum);
              return response.success ? response.data : [];
            } catch (error) {
              console.error(`Failed to fetch providers for building ${buildingId}:`, error);
              return [];
            }
          });

          const providerArrays = await Promise.all(providerPromises);
          const allProviders = providerArrays.flat();
          // Remove duplicates by id
          const uniqueProviders = Array.from(
            new Map(allProviders.map(p => [p.id, p])).values()
          );
          setServiceProviders(uniqueProviders);
        } catch (error) {
          console.error('Failed to fetch service providers:', error);
          setServiceProviders([]);
        } finally {
          setIsLoadingProviders(false);
        }
      } else {
        // Fetch providers for selected building
        setIsLoadingProviders(true);
        try {
          const buildingIdNum = typeof selectedBuildingId === 'string'
            ? parseInt(selectedBuildingId.replace(/\D/g, ''), 10)
            : selectedBuildingId;
          const response = await apiService.maintenance.getServiceProvidersByBuilding(buildingIdNum);
          setServiceProviders(response.success ? response.data : []);
        } catch (error) {
          console.error('Failed to fetch service providers:', error);
          setServiceProviders([]);
        } finally {
          setIsLoadingProviders(false);
        }
      }
    };

    fetchServiceProviders();
  }, [selectedBuildingId, isManagement, managedBuildings, allBuildings]);

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    allBuildings.forEach((building) => map.set(building.id, building));
    return map;
  }, [allBuildings]);

  const employees = useMemo(() => {
    if (selectedBuildingId === "all") {
      const scopedBuildingIds =
        isManagement && managedBuildings.length
          ? managedBuildings.map((building) => building.id)
          : allBuildings.map((building) => building.id);

      return scopedBuildingIds.flatMap((buildingId) =>
        getBuildingEmployees(buildingId),
      );
    }

    return getBuildingEmployees(selectedBuildingId);
  }, [
    selectedBuildingId,
    managedBuildings,
    allBuildings,
    isManagement,
    getBuildingEmployees,
  ]);

  const staffSummary = useMemo(() => {
    const contextTotal = employees.length;
    const apiTotal = maintenanceStaff.filter(staff => staff.isActive).length;
    const total = contextTotal + apiTotal;
    const avgRating =
      employees.reduce((acc, employee) => acc + (employee.rating || 0), 0) /
      (employees.length || 1);
    const nightShift = employees.filter((employee) => employee.shift === "night")
      .length;

    return {
      total,
      nightShift,
      avgRating: avgRating ? avgRating.toFixed(1) : "N/A",
    };
  }, [employees, maintenanceStaff]);

  const providerSummary = useMemo(() => {
    const activeProviders = serviceProviders.filter(p => p.isActive);
    return {
      total: serviceProviders.length,
      activeCount: activeProviders.length,
    };
  }, [serviceProviders]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const buildingFilterOptions = useMemo(() => {
    const scope = isManagement ? managedBuildings : allBuildings;
    if (scope.length <= 1) return scope;
    return scope;
  }, [isManagement, managedBuildings, allBuildings]);

  const selectedBuildingName =
    selectedBuildingId !== "all"
      ? buildingMap.get(selectedBuildingId)?.name
      : "All Buildings";

  const cycleEmployeeShift = async (employee: BuildingEmployee) => {
    const currentIndex = SHIFT_SEQUENCE.indexOf(employee.shift || "morning");
    const nextShift = SHIFT_SEQUENCE[(currentIndex + 1) % SHIFT_SEQUENCE.length];
    try {
      await updateBuildingEmployee(employee.id, {
        shift: nextShift,
      });
      Alert.alert(
        "Shift updated",
        `${employee.name} reassigned to the ${nextShift} shift.`,
      );
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Update failed", errorMessage);
    }
  };

  const removeEmployee = (employee: BuildingEmployee) => {
    Alert.alert(
      "Remove employee",
      `Remove ${employee.name} from ${buildingMap.get(employee.buildingId)?.name || "this building"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeBuildingEmployee(employee.id);
            } catch (error) {
              const errorMessage = getUserErrorMessage(error);
              Alert.alert("Removal failed", errorMessage);
            }
          },
        },
      ],
    );
  };

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      phone: "",
      email: "",
      password: "",
      address: "",
      nationality: "",
      shift: "morning",
      buildingId:
        selectedBuildingId !== "all" ? selectedBuildingId : managedBuildings[0]?.id || "",
    });
  };

  useEffect(() => {
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuildingId, managedBuildings.length]);

  const handleCreateEmployee = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim() || !formData.password.trim()) {
      Alert.alert("Validation", "Name, phone, email, and password are required.");
      return;
    }

    const targetBuildingId =
      formData.buildingId ||
      (selectedBuildingId !== "all" ? selectedBuildingId : "");

    if (!targetBuildingId) {
      Alert.alert("Validation", "Select a building for the employee.");
      return;
    }

    setIsSaving(true);
    try {
      // Step 1: Create the maintenance staff
      const createResponse = await apiService.maintenance.createMaintenanceStaff({
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password.trim(),
        phoneNumber: formData.phone.trim(),
        address: formData.address.trim() || "N/A",
        nationality: formData.nationality.trim() || "N/A",
      });

      if (!createResponse.success || !createResponse.data?.id) {
        throw new Error(createResponse.message || "Failed to create maintenance staff");
      }

      const staffId = createResponse.data.id;

      // Step 2: Assign the staff to the building
      const buildingIdNum = typeof targetBuildingId === 'string'
        ? parseInt(targetBuildingId.replace(/\D/g, ''), 10)
        : targetBuildingId;

      await apiService.maintenance.assignMaintenanceStaffToBuilding({
        buildingId: buildingIdNum,
        staffId: staffId,
      });

      Alert.alert("Employee added", `${formData.name} has been created and assigned to the building.`);
      setShowAddModal(false);
      resetForm();

      // Refresh the maintenance staff list
      try {
        const response = await apiService.maintenance.getMaintenanceStaffByBuilding(buildingIdNum);
        if (response.success) {
          if (selectedBuildingId === targetBuildingId) {
            setMaintenanceStaff(response.data);
          } else {
            // If viewing all buildings, refetch all
            const scopedBuildingIds = isManagement && managedBuildings.length
              ? managedBuildings.map((building) => building.id)
              : allBuildings.map((building) => building.id);

            const staffPromises = scopedBuildingIds.map(async (bId) => {
              const bIdNum = typeof bId === 'string' ? parseInt(bId.replace(/\D/g, ''), 10) : bId;
              try {
                const res = await apiService.maintenance.getMaintenanceStaffByBuilding(bIdNum);
                return res.success ? res.data : [];
              } catch {
                return [];
              }
            });

            const staffArrays = await Promise.all(staffPromises);
            setMaintenanceStaff(staffArrays.flat());
          }
        }
      } catch (error) {
        console.error('Failed to refresh staff list:', error);
      }
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Creation failed", errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HeaderBar
          title="Workforce Planning"
          subtitle={selectedBuildingName}
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(40).duration(320)}
          style={[styles.summaryRow, isCompact && styles.summaryRowCompact]}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Building Staff</Text>
            <Text style={styles.summaryValue}>{staffSummary.total}</Text>
            <Text style={styles.summaryMeta}>Active employees</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Night Shift</Text>
            <Text style={styles.summaryValue}>{staffSummary.nightShift}</Text>
            <Text style={styles.summaryMeta}>Current coverage</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg Rating</Text>
            <Text style={styles.summaryValue}>{staffSummary.avgRating}</Text>
            <Text style={styles.summaryMeta}>Service quality</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(320)}
          style={[styles.providersCard, isCompact && styles.providersCardCompact]}
        >
          <View style={styles.providersCardHeader}>
            <View>
              <Text style={styles.providersTitle}>Service Providers</Text>
              <Text style={styles.providersSubtitle}>
                {providerSummary.total} vendor{providerSummary.total !== 1 ? 's' : ''} assigned
              </Text>
            </View>
            <View style={styles.providerBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.providerBadgeText}>
                {providerSummary.activeCount} active
              </Text>
            </View>
          </View>
        </Animated.View>

        {buildingFilterOptions.length > 1 && (
          <Animated.View
            entering={FadeInDown.delay(120).duration(320)}
            style={styles.filterRow}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterChips}
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
                  All
                </Text>
              </TouchableOpacity>
              {buildingFilterOptions.map((building) => {
                const active = building.id === selectedBuildingId;
                return (
                  <TouchableOpacity
                    key={building.id}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedBuildingId(building.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {building.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(160).duration(320)}
          style={styles.actionsRow}
        >
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Add Building Employee</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Maintenance Staff Section (from API) */}
        <View style={styles.employeesList}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Maintenance Staff</Text>
            <Text style={styles.sectionSubtitle}>
              {isLoadingStaff ? 'Loading...' : `${maintenanceStaff.length} staff member${maintenanceStaff.length !== 1 ? 's' : ''}`}
            </Text>
          </View>

          {isLoadingStaff ? (
            <Animated.View
              entering={FadeInDown.delay(200).duration(320)}
              style={styles.emptyState}
            >
              <Ionicons name="hourglass-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Loading staff...</Text>
            </Animated.View>
          ) : maintenanceStaff.length === 0 ? (
            <Animated.View
              entering={FadeInDown.delay(200).duration(320)}
              style={styles.emptyState}
            >
              <Ionicons name="people-circle-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No maintenance staff found</Text>
              <Text style={styles.emptySubtitle}>
                Add staff members using the button above.
              </Text>
            </Animated.View>
          ) : (
            maintenanceStaff.map((staff, index) => (
              <Animated.View
                key={staff.id}
                entering={FadeInDown.delay(200 + index * 40).duration(300)}
              >
                <View style={styles.employeeCard}>
                  <View style={styles.employeeHeader}>
                    <View style={styles.employeeAvatar}>
                      <Text style={styles.employeeAvatarText}>
                        {staff.fullName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.employeeName}>{staff.fullName}</Text>
                      <Text style={styles.employeeRole}>
                        Maintenance Staff
                        {!staff.isActive && ' · Inactive'}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      staff.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive
                    ]}>
                      <Text style={[
                        styles.statusBadgeText,
                        staff.isActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive
                      ]}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.employeeMetaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="mail-outline" size={16} color="#2563EB" />
                      <Text style={styles.metaChipText}>{staff.email}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="call-outline" size={16} color="#10B981" />
                      <Text style={styles.metaChipText}>{staff.phoneNumber}</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </View>

        {/* Legacy Employees Section (from Context) */}
        <View style={styles.employeesList}>
          {employees.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Legacy Employees</Text>
              <Text style={styles.sectionSubtitle}>
                {employees.length} employee{employees.length !== 1 ? 's' : ''} (from context)
              </Text>
            </View>
          )}

          {employees.length === 0 ? null : (
            employees.map((employee, index) => (
              <Animated.View
                key={employee.id}
                entering={FadeInDown.delay(200 + index * 40).duration(300)}
              >
                <View style={styles.employeeCard}>
                  <View style={styles.employeeHeader}>
                    <View style={styles.employeeAvatar}>
                      <Text style={styles.employeeAvatarText}>
                        {employee.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.employeeName}>{employee.name}</Text>
                      <Text style={styles.employeeRole}>
                        {employee.role} ·{" "}
                        {buildingMap.get(employee.buildingId)?.name || "Building"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => cycleEmployeeShift(employee)}
                    >
                      <Ionicons name="repeat-outline" size={18} color="#2563EB" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => removeEmployee(employee)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.employeeMetaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="call-outline" size={16} color="#10B981" />
                      <Text style={styles.metaChipText}>{employee.phone}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="time-outline" size={16} color="#2563EB" />
                      <Text style={styles.metaChipText}>
                        {employee.shift
                          ? `${employee.shift.charAt(0).toUpperCase()}${employee.shift.slice(
                              1,
                            )} shift`
                          : "Shift TBD"}
                      </Text>
                    </View>
                    {employee.rating ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="star" size={16} color="#F59E0B" />
                        <Text style={styles.metaChipText}>
                          {employee.rating.toFixed(1)} ★
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </View>

        <View style={styles.providersList}>
          <View style={[styles.providersHeader, isCompact && styles.providersHeaderCompact]}>
            <View>
              <Text style={styles.providersHeading}>Vendor Directory</Text>
              <Text style={styles.providersSubheading}>
                View all service providers
              </Text>
            </View>
            <Text style={styles.debugText}>
              {serviceProviders.length} service provider{serviceProviders.length !== 1 ? 's' : ''} available
            </Text>
          </View>
          {isLoadingProviders ? (
            <View style={styles.providerCard}>
              <Text style={styles.emptyBuildingText}>Loading service providers...</Text>
            </View>
          ) : serviceProviders.length === 0 ? (
            <View style={styles.providerCard}>
              <Text style={styles.emptyBuildingText}>No service providers assigned to this building</Text>
            </View>
          ) : (
            <View style={[styles.providersGrid, isCompact && styles.providersGridCompact]}>
              {serviceProviders.map((provider) => {
                return (
                  <View
                    key={provider.id}
                    style={[
                      styles.providerCard,
                      isCompact ? styles.providerCardCompact : styles.providerCardExpanded
                    ]}
                  >
                    <View style={styles.providerCardContent}>
                      <View style={styles.providerInfo}>
                        <Text style={styles.providerName} numberOfLines={2}>
                          {provider.fullName}
                        </Text>
                        <Text style={styles.providerSpecialty} numberOfLines={1}>
                          Service Provider
                        </Text>
                        <Text style={styles.providerContact} numberOfLines={1}>
                          {provider.phoneNumber}
                        </Text>
                      </View>
                      <View style={styles.providerStats}>
                        <View style={styles.providerStatChip}>
                          <Ionicons name="mail-outline" size={16} color="#2563EB" />
                          <Text style={styles.providerStatText} numberOfLines={1} ellipsizeMode="tail">
                            {provider.email}
                          </Text>
                        </View>
                        <View style={[
                          styles.providerStatChip,
                          provider.isActive && styles.providerStatChipActive
                        ]}>
                          <Ionicons
                            name={provider.isActive ? "checkmark-circle" : "close-circle"}
                            size={16}
                            color={provider.isActive ? "#10B981" : "#EF4444"}
                          />
                          <Text
                            style={[
                              styles.providerStatText,
                              provider.isActive && styles.providerStatTextActive
                            ]}
                            numberOfLines={1}
                          >
                            {provider.isActive ? "Active" : "Inactive"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { marginHorizontal: pagePadding }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Building Employee</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Assign to building *</Text>
              {loadingBuildings ? (
                <View style={styles.buildingSelectRow}>
                  <Text style={styles.emptyBuildingText}>Loading buildings...</Text>
                </View>
              ) : managedBuildings.length > 0 ? (
                <View style={styles.buildingSelectRow}>
                  {managedBuildings.map((building) => {
                    const active = formData.buildingId === building.id;
                    console.log('[Workforce Modal] Building:', building.name, 'ID:', building.id, 'Active:', active);
                    return (
                      <TouchableOpacity
                        key={building.id}
                        style={[
                          styles.buildingChip,
                          active && styles.buildingChipActive,
                        ]}
                        onPress={() =>
                          setFormData((prev) => ({
                            ...prev,
                            buildingId: building.id,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.buildingChipText,
                            active && styles.buildingChipTextActive,
                          ]}
                        >
                          {building.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyBuildingNotice}>
                  <Text style={styles.emptyBuildingText}>
                    No buildings available. Please contact your administrator.
                  </Text>
                  <Text style={styles.debugInfo}>
                    Debug: isManagement={String(isManagement)},
                    managedBuildings.length={managedBuildings.length},
                    allBuildings.length={allBuildings.length}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Employee name"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, name: text }))
                }
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Email *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="employee@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, email: text }))
                }
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Password *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Minimum 6 characters"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, password: text }))
                }
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Phone *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="+971 50 000 0000"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, phone: text }))
                }
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Address</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Address (optional)"
                value={formData.address}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, address: text }))
                }
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Nationality</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Nationality (optional)"
                value={formData.nationality}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, nationality: text }))
                }
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Role</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Concierge, Technician..."
                value={formData.role}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, role: text }))
                }
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Shift</Text>
              <View style={styles.shiftRow}>
                {SHIFT_SEQUENCE.map((shift) => {
                  const active = formData.shift === shift;
                  return (
                    <TouchableOpacity
                      key={shift}
                      style={[
                        styles.shiftChip,
                        active && styles.shiftChipActive,
                      ]}
                      onPress={() =>
                        setFormData((prev) => ({ ...prev, shift }))
                      }
                    >
                      <Text
                        style={[
                          styles.shiftChipText,
                          active && styles.shiftChipTextActive,
                        ]}
                      >
                        {shift.charAt(0).toUpperCase() + shift.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { justifyContent: "center" },
                isSaving && styles.primaryButtonDisabled,
              ]}
              onPress={handleCreateEmployee}
              disabled={isSaving}
            >
              <Ionicons name="save-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {isSaving ? "Saving..." : "Save Employee"}
              </Text>
            </TouchableOpacity>
          </View>
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
    marginTop: 16,
    gap: 12,
  },
  summaryRowCompact: {
    flexDirection: "column",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
  providersCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    marginTop: 20,
    gap: 14,
  },
  providersCardCompact: {
    flexDirection: "column",
  },
  providersCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  providersTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  providersSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  providerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  providerBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#C2410C",
  },
  topProvider: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  topProviderLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  topProviderName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  topProviderMeta: {
    fontSize: 13,
    color: "#4B5563",
  },
  filterRow: {
    marginTop: 20,
  },
  filterChips: {
    paddingRight: 12,
    gap: 10,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  actionsRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  employeesList: {
    marginTop: 22,
    gap: 14,
  },
  employeeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    gap: 14,
  },
  employeeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  employeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  employeeAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  employeeRole: {
    fontSize: 13,
    color: "#6B7280",
  },
  iconButton: {
    padding: 8,
  },
  employeeMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  providersList: {
    marginTop: 30,
    gap: 12,
  },
  providersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  providersHeaderCompact: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
  },
  providersHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  providersSubheading: {
    fontSize: 13,
    color: "#6B7280",
  },
  providersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  providersGridCompact: {
    flexDirection: "column",
  },
  debugText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
    marginTop: 4,
  },
  requestAccessButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  requestAccessButtonDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  requestAccessButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  requestAccessButtonTextDisabled: {
    color: "#10B981",
  },
  providerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  providerCardCompact: {
    width: "100%",
  },
  providerCardExpanded: {
    width: "48%",
    minWidth: 280,
  },
  providerCardContent: {
    gap: 12,
  },
  providerInfo: {
    gap: 4,
  },
  providerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  providerSpecialty: {
    fontSize: 13,
    color: "#6B7280",
  },
  providerContact: {
    fontSize: 12,
    color: "#4B5563",
  },
  providerStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  providerStatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 1,
  },
  providerStatChipActive: {
    backgroundColor: "#D1FAE5",
  },
  providerStatText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    flexShrink: 1,
  },
  providerStatTextActive: {
    color: "#059669",
  },
  assignedBuildingsRow: {
    gap: 8,
  },
  assignedLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  assignedBuildingTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  buildingTag: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  buildingTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1E40AF",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 36,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    gap: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalSection: {
    gap: 6,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  buildingSelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  buildingChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buildingChipActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EEF2FF",
  },
  buildingChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  buildingChipTextActive: {
    color: "#312E81",
  },
  shiftRow: {
    flexDirection: "row",
    gap: 10,
  },
  shiftChip: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
  },
  shiftChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  shiftChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4B5563",
  },
  shiftChipTextActive: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeActive: {
    backgroundColor: "#D1FAE5",
    borderColor: "#10B981",
  },
  statusBadgeInactive: {
    backgroundColor: "#FEE2E2",
    borderColor: "#EF4444",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadgeTextActive: {
    color: "#059669",
  },
  statusBadgeTextInactive: {
    color: "#DC2626",
  },
  emptyBuildingNotice: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  emptyBuildingText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
  },
  debugInfo: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: "monospace",
  },
});
