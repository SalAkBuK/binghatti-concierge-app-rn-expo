import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import type { BuildingEmployee } from "../../../lib/types";

import { AddEmployeeModal } from "./_components/AddEmployeeModal";
import { ADMIN_NOTIFICATION_ROUTE, SHIFT_SEQUENCE } from "./_constants";
import { useWorkforceData } from "./_hooks/useWorkforceData";
import { styles } from "./_styles";
import type { EmployeeFormData } from "./_types";
import {
  useMountLog,
  useRenderLog,
  useScreenFocusLog,
} from "../../../utils/adminProfiler";

export default function WorkforceManagementScreen() {
  // Profiler hooks - track lifecycle and performance
  useMountLog("Admin/Workforce");
  useRenderLog("Admin/Workforce");
  useScreenFocusLog("Admin/Workforce");

  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    role: "",
    phone: "",
    shift: "morning",
    buildingId: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const {
    hasUnreadNotifications,
    isManagement,
    managedBuildings,
    buildingMap,
    employees,
    serviceProviders,
    staffSummary,
    providerSummary,
    actions,
  } = useWorkforceData(selectedBuildingId);

  const { updateBuildingEmployee, removeBuildingEmployee, addBuildingEmployee } = actions;

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 900;

  // Initialize selectedBuildingId based on management role
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

  const buildingFilterOptions = useMemo(() => {
    const scope = isManagement ? managedBuildings : managedBuildings;
    if (scope.length <= 1) return scope;
    return scope;
  }, [isManagement, managedBuildings]);

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
    } catch (error: any) {
      Alert.alert(
        "Update failed",
        error?.message || "Unable to update employee shift",
      );
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
            } catch (error: any) {
              Alert.alert(
                "Removal failed",
                error?.message || "Unable to remove employee",
              );
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
    } catch (error: any) {
      Alert.alert(
        "Creation failed",
        error?.message || "Unable to add employee",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <HeaderBar
          title="Workforce Planning"
          subtitle={selectedBuildingName}
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
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
          style={styles.providersCard}
        >
          <View style={styles.providersCardHeader}>
            <View>
              <Text style={styles.providersTitle}>Service Providers</Text>
              <Text style={styles.providersSubtitle}>Contracted vendors</Text>
            </View>
            <View style={styles.providerBadge}>
              <Ionicons name="business-outline" size={16} color="#C2410C" />
              <Text style={styles.providerBadgeText}>
                {providerSummary.total} Active
              </Text>
            </View>
          </View>

          {providerSummary.topPerformer && (
            <View style={styles.topProvider}>
              <Text style={styles.topProviderLabel}>Top Performer</Text>
              <Text style={styles.topProviderName}>
                {providerSummary.topPerformer.name}
              </Text>
              <Text style={styles.topProviderMeta}>
                {providerSummary.topPerformer.specialty} ·{" "}
                {providerSummary.topPerformer.rating.toFixed(1)} ★
              </Text>
            </View>
          )}
        </Animated.View>

        {buildingFilterOptions.length > 0 && (
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
                      <Ionicons name="repeat-outline" size={18} color="#4338CA" />
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
          <Text style={styles.providersHeading}>Vendor Directory</Text>
          {serviceProviders.map((provider) => (
            <View key={provider.id} style={styles.providerCard}>
              <View>
                <Text style={styles.providerName}>{provider.name}</Text>
                <Text style={styles.providerSpecialty}>
                  {provider.specialty}
                </Text>
                <Text style={styles.providerContact}>{provider.phone}</Text>
              </View>
              <View style={styles.providerStats}>
                <View style={styles.providerStatChip}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.providerStatText}>
                    {provider.rating.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.providerStatChip}>
                  <Ionicons name="construct-outline" size={16} color="#2563EB" />
                  <Text style={styles.providerStatText}>
                    {provider.jobsCompleted} jobs
                  </Text>
                </View>
                {provider.responseTimeMinutes ? (
                  <View style={styles.providerStatChip}>
                    <Ionicons name="flash-outline" size={16} color="#10B981" />
                    <Text style={styles.providerStatText}>
                      {provider.responseTimeMinutes} mins
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      <AddEmployeeModal
        visible={showAddModal}
        selectedBuildingId={selectedBuildingId}
        formData={formData}
        managedBuildings={managedBuildings}
        isSaving={isSaving}
        pagePadding={pagePadding}
        onClose={() => setShowAddModal(false)}
        onFormChange={setFormData}
        onSubmit={handleCreateEmployee}
      />
    </SafeAreaView>
  );
}
