import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import type {
  Building,
  BuildingEmployee,
  ServiceProviderProfile,
} from "../../lib/types";
import { getUserErrorMessage } from "../../lib/services/api/errors";
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
    getBuildings,
    getManagedBuildings,
    getBuildingEmployees,
    getServiceProviders,
    getServiceProviderBuildingAssignments,
    updateBuildingEmployee,
    removeBuildingEmployee,
    addBuildingEmployee,
  } = actions;
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    phone: "",
    shift: "morning" as NonNullable<BuildingEmployee["shift"]>,
    buildingId: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 900;
  const isManagement = currentUser?.role === "management";

  const allBuildings = useMemo(() => getBuildings(), [getBuildings]);
  const managedBuildings = useMemo(() => {
    if (!isManagement) return allBuildings;
    return getManagedBuildings?.() ?? [];
  }, [isManagement, getManagedBuildings, allBuildings]);

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

  const serviceProviders = useMemo<ServiceProviderProfile[]>(
    () => getServiceProviders(),
    [getServiceProviders],
  );

  const staffSummary = useMemo(() => {
    const total = employees.length;
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
  }, [employees]);

  const providerSummary = useMemo(() => {
    const topPerformer = [...serviceProviders].sort(
      (a, b) => b.rating - a.rating,
    )[0];
    const averageResponse =
      serviceProviders.reduce(
        (acc, provider) => acc + (provider.responseTimeMinutes || 0),
        0,
      ) / (serviceProviders.length || 1);

    return {
      total: serviceProviders.length,
      topPerformer,
      averageResponse: Math.round(averageResponse || 0),
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
    if (!formData.name.trim() || !formData.phone.trim()) {
      Alert.alert("Validation", "Name and phone are required.");
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
      await addBuildingEmployee(targetBuildingId, {
        name: formData.name.trim(),
        role: formData.role.trim() || "Staff",
        phone: formData.phone.trim(),
        shift: formData.shift,
      });
      Alert.alert("Employee added", `${formData.name} added to the roster.`);
      setShowAddModal(false);
      resetForm();
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
                {providerSummary.total} vendors connected
              </Text>
            </View>
            <View style={styles.providerBadge}>
              <Ionicons name="flash-outline" size={16} color="#F97316" />
              <Text style={styles.providerBadgeText}>
                Avg response {providerSummary.averageResponse} mins
              </Text>
            </View>
          </View>

          {providerSummary.topPerformer ? (
            <View style={styles.topProvider}>
              <Text style={styles.topProviderLabel}>Top Rated</Text>
              <Text style={styles.topProviderName}>
                {providerSummary.topPerformer.name}
              </Text>
              <Text style={styles.topProviderMeta}>
                {providerSummary.topPerformer.specialty} ·{" "}
                {providerSummary.topPerformer.rating.toFixed(1)} ★ ·{" "}
                {providerSummary.topPerformer.jobsCompleted} jobs
              </Text>
            </View>
          ) : null}
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

        <View style={styles.employeesList}>
          {employees.length === 0 ? (
            <Animated.View
              entering={FadeInDown.delay(200).duration(320)}
              style={styles.emptyState}
            >
              <Ionicons name="people-circle-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No employees listed</Text>
              <Text style={styles.emptySubtitle}>
                Add staff members or adjust the building filter.
              </Text>
            </Animated.View>
          ) : (
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
          <View style={styles.providersHeader}>
            <Text style={styles.providersHeading}>Vendor Directory</Text>
            <Text style={styles.providersSubheading}>
              View all service providers and request access for your building
            </Text>
            <Text style={styles.debugText}>
              {serviceProviders.length} service provider{serviceProviders.length !== 1 ? 's' : ''} available
            </Text>
          </View>
          {serviceProviders.map((provider) => {
            const providerAssignments = getServiceProviderBuildingAssignments?.(provider.id) ?? [];
            const activeAssignments = providerAssignments.filter((a) => a.status === "active");
            const assignedToSelectedBuilding = selectedBuildingId !== "all"
              ? activeAssignments.some((a) => a.buildingId === selectedBuildingId)
              : activeAssignments.length > 0;

            return (
              <View key={provider.id} style={styles.providerCard}>
                <View style={styles.providerCardContent}>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName} numberOfLines={2}>
                      {provider.name}
                    </Text>
                    <Text style={styles.providerSpecialty} numberOfLines={1}>
                      {provider.specialty}
                    </Text>
                    <Text style={styles.providerContact} numberOfLines={1}>
                      {provider.phone}
                    </Text>
                  </View>
                  <View style={styles.providerStats}>
                    <View style={styles.providerStatChip}>
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Text style={styles.providerStatText} numberOfLines={1}>
                        {provider.rating.toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.providerStatChip}>
                      <Ionicons name="construct-outline" size={16} color="#2563EB" />
                      <Text style={styles.providerStatText} numberOfLines={1}>
                        {provider.jobsCompleted} jobs
                      </Text>
                    </View>
                    <View style={[
                      styles.providerStatChip,
                      assignedToSelectedBuilding && styles.providerStatChipActive
                    ]}>
                      <Ionicons
                        name="business"
                        size={16}
                        color={assignedToSelectedBuilding ? "#10B981" : "#6B7280"}
                      />
                      <Text
                        style={[
                          styles.providerStatText,
                          assignedToSelectedBuilding && styles.providerStatTextActive
                        ]}
                        numberOfLines={1}
                      >
                        {activeAssignments.length} {activeAssignments.length === 1 ? "building" : "buildings"}
                      </Text>
                    </View>
                  </View>
                  {activeAssignments.length > 0 && (
                    <View style={styles.assignedBuildingsRow}>
                      <Text style={styles.assignedLabel}>Assigned to:</Text>
                      <View style={styles.assignedBuildingTags}>
                        {activeAssignments.map((assignment) => {
                          const building = buildingMap.get(assignment.buildingId);
                          return (
                            <View key={assignment.id} style={styles.buildingTag}>
                              <Text style={styles.buildingTagText}>
                                {building?.name || "Unknown"}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.requestAccessButton,
                      assignedToSelectedBuilding && selectedBuildingId !== "all" && styles.requestAccessButtonDisabled
                    ]}
                    onPress={() => {
                      if (selectedBuildingId === "all") {
                        alert("Please select a specific building to request provider access");
                        return;
                      }
                      router.push({
                        pathname: "/(modals)/request-provider-access",
                        params: {
                          providerId: provider.id,
                          buildingId: selectedBuildingId,
                        },
                      });
                    }}
                    disabled={assignedToSelectedBuilding && selectedBuildingId !== "all"}
                  >
                    <Ionicons
                      name={assignedToSelectedBuilding && selectedBuildingId !== "all" ? "checkmark-circle" : "add-circle-outline"}
                      size={18}
                      color={assignedToSelectedBuilding && selectedBuildingId !== "all" ? "#10B981" : "#2563EB"}
                    />
                    <Text style={[
                      styles.requestAccessButtonText,
                      assignedToSelectedBuilding && selectedBuildingId !== "all" && styles.requestAccessButtonTextDisabled
                    ]}>
                      {assignedToSelectedBuilding && selectedBuildingId !== "all" ? "Already Assigned" : "Request Access"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
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

            {selectedBuildingId === "all" && (
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Assign to building</Text>
                <View style={styles.buildingSelectRow}>
                  {managedBuildings.map((building) => {
                    const active = formData.buildingId === building.id;
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
              </View>
            )}

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Name</Text>
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
              <Text style={styles.modalLabel}>Phone</Text>
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
    marginBottom: 12,
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
  debugText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
    marginTop: 8,
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
});
