import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
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
import { getUserErrorMessage } from "../../lib/services/api/errors";
import type { Building, BuildingAmenityConfig } from "../../lib/types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function ManagementAmenitiesScreen() {
  const { currentUser, notifications, actions, amenityConfigs } = useApp();
  const { getBuildings, getManagedBuildings, updateAmenityConfig, createAmenityConfig } = actions;
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedConfig, setSelectedConfig] =
    useState<BuildingAmenityConfig | null>(null);
  const [editingConfig, setEditingConfig] =
    useState<BuildingAmenityConfig | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showAmenityModal, setShowAmenityModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    startDate: "",
    endDate: "",
    reason: "routine",
    notes: "",
  });
  const [newAmenityForm, setNewAmenityForm] = useState({
    buildingId: "",
    amenityName: "",
    bookingWindowDays: 14,
    maxDurationMinutes: 60,
    maxConcurrentBookings: 1,
    rules: [] as string[],
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
  const [editingDateField, setEditingDateField] = useState<"start" | "end">("start");

  const openDatePicker = (field: "start" | "end", mode: "date" | "time" = "date") => {
    setEditingDateField(field);
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed") {
      return;
    }

    if (selectedDate) {
      const fieldKey = editingDateField === "start" ? "startDate" : "endDate";
      const currentDate = new Date(maintenanceForm[fieldKey] || new Date());

      if (datePickerMode === "date") {
        currentDate.setFullYear(selectedDate.getFullYear());
        currentDate.setMonth(selectedDate.getMonth());
        currentDate.setDate(selectedDate.getDate());
      } else {
        currentDate.setHours(selectedDate.getHours());
        currentDate.setMinutes(selectedDate.getMinutes());
      }

      setMaintenanceForm({
        ...maintenanceForm,
        [fieldKey]: currentDate.toISOString(),
      });

      // On Android, after selecting date, show time picker
      if (Platform.OS === "android" && datePickerMode === "date") {
        setTimeout(() => {
          setDatePickerMode("time");
          setShowDatePicker(true);
        }, 100);
      }
    }
  };

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const managedBuildings = useMemo(
    () => getManagedBuildings?.() ?? getBuildings(),
    [getManagedBuildings, getBuildings],
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    managedBuildings.length === 1 ? managedBuildings[0].id : "all",
  );

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    managedBuildings.forEach((building) => map.set(building.id, building));
    return map;
  }, [managedBuildings]);

  const scopedConfigs = useMemo(() => {
    if (selectedBuildingId === "all") {
      const scopeIds = managedBuildings.map((building) => building.id);
      return amenityConfigs.filter((config) => scopeIds.includes(config.buildingId));
    }

    return amenityConfigs.filter(
      (config) => config.buildingId === selectedBuildingId,
    );
  }, [amenityConfigs, managedBuildings, selectedBuildingId]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  const toggleAmenityStatus = async (config: BuildingAmenityConfig) => {
    const nextStatus = config.status === "active" ? "inactive" : "active";
    const statusLabel = nextStatus === "active" ? "activate" : "deactivate";

    Alert.alert(
      "Confirm Status Change",
      `Are you sure you want to ${statusLabel} "${config.amenityName}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateAmenityConfig(config.id, { status: nextStatus });
              Alert.alert(
                "Success",
                `${config.amenityName} has been ${statusLabel}d successfully.`
              );
            } catch (error) {
              Alert.alert(
                "Error",
                `Failed to update amenity: ${getUserErrorMessage(error)}`
              );
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const openMaintenanceModal = (config: BuildingAmenityConfig) => {
    // Pre-fill with mock data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 3); // 3 days from now

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // 7 days from now

    setMaintenanceForm({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reason: "routine",
      notes: "Annual HVAC system inspection and filter replacement. Facility will undergo thorough cleaning and equipment testing.",
    });

    setSelectedConfig(config);
    setShowMaintenanceModal(true);
  };

  const handleScheduleMaintenance = async () => {
    if (!selectedConfig) return;

    try {
      await updateAmenityConfig(selectedConfig.id, {
        status: "maintenance",
        maintenanceWindow: {
          start: maintenanceForm.startDate,
          end: maintenanceForm.endDate,
          notes: `${maintenanceForm.reason}: ${maintenanceForm.notes}`,
        },
      });
      setShowMaintenanceModal(false);
      setSelectedConfig(null);
    } catch (error) {
      console.warn("Failed to schedule maintenance:", getUserErrorMessage(error));
    }
  };

  const handleAddAmenity = async () => {
    if (!newAmenityForm.amenityName.trim() || !newAmenityForm.buildingId) {
      return;
    }

    try {
      const payload = {
        buildingId: newAmenityForm.buildingId,
        amenityName: newAmenityForm.amenityName,
        bookingWindowDays: newAmenityForm.bookingWindowDays,
        maxDurationMinutes: newAmenityForm.maxDurationMinutes,
        maxConcurrentBookings: newAmenityForm.maxConcurrentBookings,
        rules: newAmenityForm.rules.map((label, index) => ({
          id: `rule-${Date.now()}-${index}`,
          label,
          isActive: true,
        })),
        status: editingConfig?.status ?? "active",
      };

      const isEditing = !!editingConfig;
      const amenityName = newAmenityForm.amenityName;

      if (isEditing) {
        await updateAmenityConfig?.(editingConfig.id, payload);
      } else {
        await createAmenityConfig?.(payload);
      }

      setShowAmenityModal(false);
      setNewAmenityForm({
        buildingId: managedBuildings.length === 1 ? managedBuildings[0].id : "",
        amenityName: "",
        bookingWindowDays: 14,
        maxDurationMinutes: 60,
        maxConcurrentBookings: 1,
        rules: [],
      });
      setEditingConfig(null);

      // Show success message
      Alert.alert(
        "Success",
        `${amenityName} has been ${isEditing ? "updated" : "added"} successfully.`
      );
    } catch (error) {
      Alert.alert(
        "Error",
        `Failed to ${editingConfig ? "update" : "add"} amenity: ${getUserErrorMessage(error)}`
      );
    }
  };

  const startEditAmenity = (config: BuildingAmenityConfig) => {
    setEditingConfig(config);
    setNewAmenityForm({
      buildingId: config.buildingId,
      amenityName: config.amenityName,
      bookingWindowDays: config.bookingWindowDays,
      maxDurationMinutes: config.maxDurationMinutes,
      maxConcurrentBookings: config.maxConcurrentBookings,
      rules: config.rules.map((rule) => rule.label),
    });
    setShowAmenityModal(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Amenity Policies"
          subtitle="Control booking rules and maintenance windows"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(20).duration(260)}
          style={styles.addButtonContainer}
        >
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditingConfig(null);
              setNewAmenityForm({
                buildingId:
                  managedBuildings.length === 1
                    ? managedBuildings[0].id
                    : selectedBuildingId !== "all"
                    ? selectedBuildingId
                    : "",
                amenityName: "",
                bookingWindowDays: 14,
                maxDurationMinutes: 60,
                maxConcurrentBookings: 1,
                rules: [],
              });
              setShowAmenityModal(true);
            }}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Amenity</Text>
          </TouchableOpacity>
        </Animated.View>

        {managedBuildings.length > 1 ? (
          <Animated.View
            entering={FadeInDown.delay(40).duration(260)}
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
                    selectedBuildingId === "all" && styles.filterChipTextActive,
                  ]}
                >
                  All buildings
                </Text>
              </TouchableOpacity>
              {managedBuildings.map((building) => (
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
          entering={FadeInDown.delay(80).duration(300)}
          style={styles.configList}
        >
          {scopedConfigs.length ? (
            scopedConfigs.map((config) => {
              const building = buildingMap.get(config.buildingId);
              return (
                <TouchableOpacity
                  key={config.id}
                  style={styles.configCard}
                  onPress={() => setSelectedConfig(config)}
                >
                  <View style={styles.configHeader}>
                    <View>
                      <Text style={styles.configTitle}>{config.amenityName}</Text>
                      <Text style={styles.configSubtitle}>
                        {building?.name || "Unknown building"}
                      </Text>
                    </View>
                    <View style={styles.statusActions}>
                      <TouchableOpacity
                        style={[
                          styles.statusPill,
                          config.status === "active" && styles.statusPillActive,
                          config.status === "inactive" && styles.statusPillInactive,
                          config.status === "maintenance" && styles.statusPillMaintenance,
                        ]}
                        onPress={() => toggleAmenityStatus(config)}
                      >
                        <Ionicons
                          name={
                            config.status === "active"
                              ? "checkmark-circle"
                              : config.status === "maintenance"
                              ? "construct"
                              : "close-circle"
                          }
                          size={14}
                          color={
                            config.status === "active"
                              ? "#10B981"
                              : config.status === "maintenance"
                              ? "#F59E0B"
                              : "#EF4444"
                          }
                        />
                        <Text
                          style={[
                            styles.statusPillText,
                            config.status === "active" && styles.statusActive,
                            config.status === "maintenance" && styles.statusMaintenance,
                            config.status === "inactive" && styles.statusInactive,
                          ]}
                        >
                          {config.status === "active"
                            ? "Active"
                            : config.status === "maintenance"
                            ? "Maintenance"
                            : "Inactive"}
                        </Text>
                      </TouchableOpacity>
                      {config.status !== "maintenance" && (
                        <TouchableOpacity
                          style={styles.maintenanceIconButton}
                          onPress={() => openMaintenanceModal(config)}
                        >
                          <Ionicons name="hammer-outline" size={18} color="#F59E0B" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.configMetaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                      <Text style={styles.metaChipText}>
                        {config.bookingWindowDays}-day window
                      </Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="time-outline" size={14} color="#7C3AED" />
                      <Text style={styles.metaChipText}>
                        {config.maxDurationMinutes} min slots
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ruleList}>
                    {config.rules.map((rule) => (
                      <View key={rule.id} style={styles.ruleRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.ruleText}>{rule.label}</Text>
                      </View>
                    ))}
                  </View>

                  {config.maintenanceWindow ? (
                    <View style={styles.maintenanceBanner}>
                      <Ionicons name="hammer-outline" size={16} color="#B45309" />
                      <View>
                        <Text style={styles.maintenanceTitle}>Maintenance</Text>
                        <Text style={styles.maintenanceText}>
                          {config.maintenanceWindow.start.slice(0, 10)} →
                          {" "}
                          {config.maintenanceWindow.end.slice(0, 10)}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={40} color="#CBD5F5" />
              <Text style={styles.emptyTitle}>No amenity configs</Text>
              <Text style={styles.emptySubtitle}>
                Add amenity policies once a building is selected.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      <ScrollViewModal
        amenityConfig={selectedConfig}
        onClose={() => setSelectedConfig(null)}
        onOpenMaintenance={() => {
          if (selectedConfig) {
            openMaintenanceModal(selectedConfig);
          }
        }}
        onEditAmenity={(config) => {
          setSelectedConfig(null);
          startEditAmenity(config);
        }}
      />

      {/* Add/Edit Amenity Modal */}
      <Modal
        visible={showAmenityModal}
        animationType="slide"
        onRequestClose={() => {
          setShowAmenityModal(false);
          setEditingConfig(null);
        }}
      >
        <SafeAreaView style={styles.maintenanceModalContainer}>
          <View style={styles.maintenanceModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowAmenityModal(false);
                setEditingConfig(null);
              }}
            >
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.maintenanceModalTitle}>
              {editingConfig ? "Edit Amenity" : "Add New Amenity"}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.maintenanceModalContent}
            contentContainerStyle={styles.maintenanceModalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Building *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.buildingChips}
              >
                {managedBuildings.map((building) => (
                  <TouchableOpacity
                    key={building.id}
                    style={[
                      styles.reasonChip,
                      newAmenityForm.buildingId === building.id && styles.reasonChipActive,
                    ]}
                    onPress={() =>
                      setNewAmenityForm({ ...newAmenityForm, buildingId: building.id })
                    }
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        newAmenityForm.buildingId === building.id &&
                          styles.reasonChipTextActive,
                      ]}
                    >
                      {building.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Amenity Name *</Text>
              <TextInput
                style={styles.notesTextarea}
                value={newAmenityForm.amenityName}
                onChangeText={(text) =>
                  setNewAmenityForm({ ...newAmenityForm, amenityName: text })
                }
                placeholder="e.g., Swimming Pool, Gym, Tennis Court..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Booking Window (Days)</Text>
              <View style={styles.numberInputRow}>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() =>
                    setNewAmenityForm({
                      ...newAmenityForm,
                      bookingWindowDays: Math.max(1, newAmenityForm.bookingWindowDays - 1),
                    })
                  }
                >
                  <Ionicons name="remove" size={20} color="#2563EB" />
                </TouchableOpacity>
                <Text style={styles.numberValue}>{newAmenityForm.bookingWindowDays} days</Text>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() =>
                    setNewAmenityForm({
                      ...newAmenityForm,
                      bookingWindowDays: newAmenityForm.bookingWindowDays + 1,
                    })
                  }
                >
                  <Ionicons name="add" size={20} color="#2563EB" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Slot Duration (Minutes)</Text>
              <View style={styles.numberInputRow}>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() =>
                    setNewAmenityForm({
                      ...newAmenityForm,
                      maxDurationMinutes: Math.max(15, newAmenityForm.maxDurationMinutes - 15),
                    })
                  }
                >
                  <Ionicons name="remove" size={20} color="#2563EB" />
                </TouchableOpacity>
                <Text style={styles.numberValue}>{newAmenityForm.maxDurationMinutes} min</Text>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() =>
                    setNewAmenityForm({
                      ...newAmenityForm,
                      maxDurationMinutes: newAmenityForm.maxDurationMinutes + 15,
                    })
                  }
                >
                  <Ionicons name="add" size={20} color="#2563EB" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Max Concurrent Bookings</Text>
              <View style={styles.numberInputRow}>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() =>
                    setNewAmenityForm({
                      ...newAmenityForm,
                      maxConcurrentBookings: Math.max(1, newAmenityForm.maxConcurrentBookings - 1),
                    })
                  }
                >
                  <Ionicons name="remove" size={20} color="#2563EB" />
                </TouchableOpacity>
                <Text style={styles.numberValue}>{newAmenityForm.maxConcurrentBookings}</Text>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() =>
                    setNewAmenityForm({
                      ...newAmenityForm,
                      maxConcurrentBookings: newAmenityForm.maxConcurrentBookings + 1,
                    })
                  }
                >
                  <Ionicons name="add" size={20} color="#2563EB" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={22} color="#2563EB" />
              <Text style={styles.infoText}>
                This amenity will be available for all residents in the selected building. You
                can add specific rules and configure maintenance windows after creation.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.maintenanceModalFooter}>
            <TouchableOpacity
              style={styles.cancelMaintenanceButton}
              onPress={() => {
                setShowAmenityModal(false);
                setEditingConfig(null);
              }}
            >
              <Text style={styles.cancelMaintenanceText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.scheduleMaintenanceButton,
                (!newAmenityForm.amenityName.trim() || !newAmenityForm.buildingId) &&
                  styles.scheduleMaintenanceButtonDisabled,
              ]}
              onPress={handleAddAmenity}
              disabled={!newAmenityForm.amenityName.trim() || !newAmenityForm.buildingId}
            >
              <Ionicons name="add-circle" size={20} color="#FFF" />
              <Text style={styles.scheduleMaintenanceText}>Create Amenity</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Maintenance Scheduling Modal */}
      <Modal
        visible={showMaintenanceModal}
        animationType="slide"
        onRequestClose={() => setShowMaintenanceModal(false)}
      >
        <SafeAreaView style={styles.maintenanceModalContainer}>
          <View style={styles.maintenanceModalHeader}>
            <TouchableOpacity onPress={() => setShowMaintenanceModal(false)}>
              <Ionicons name="close" size={28} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.maintenanceModalTitle}>
              Schedule Maintenance
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.maintenanceModalContent}
            contentContainerStyle={styles.maintenanceModalContentContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Amenity</Text>
              <View style={styles.amenityNameBox}>
                <Ionicons name="fitness-outline" size={20} color="#2563EB" />
                <Text style={styles.formValue}>
                  {selectedConfig?.amenityName || "N/A"}
                </Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Start Date & Time</Text>
              <View style={styles.datePickerRow}>
                <TouchableOpacity
                  style={[styles.dateDisplay, styles.datePickerButton]}
                  onPress={() => openDatePicker("start", "date")}
                >
                  <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                  <Text style={styles.dateText}>
                    {new Date(maintenanceForm.startDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateDisplay, styles.timePickerButton]}
                  onPress={() => openDatePicker("start", "time")}
                >
                  <Ionicons name="time-outline" size={20} color="#2563EB" />
                  <Text style={styles.dateText}>
                    {new Date(maintenanceForm.startDate).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>End Date & Time</Text>
              <View style={styles.datePickerRow}>
                <TouchableOpacity
                  style={[styles.dateDisplay, styles.datePickerButton]}
                  onPress={() => openDatePicker("end", "date")}
                >
                  <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                  <Text style={styles.dateText}>
                    {new Date(maintenanceForm.endDate).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateDisplay, styles.timePickerButton]}
                  onPress={() => openDatePicker("end", "time")}
                >
                  <Ionicons name="time-outline" size={20} color="#2563EB" />
                  <Text style={styles.dateText}>
                    {new Date(maintenanceForm.endDate).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Maintenance Reason</Text>
              <View style={styles.reasonChips}>
                {["routine", "repair", "upgrade", "inspection", "seasonal"].map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonChip,
                      maintenanceForm.reason === reason && styles.reasonChipActive,
                    ]}
                    onPress={() => setMaintenanceForm({ ...maintenanceForm, reason })}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        maintenanceForm.reason === reason && styles.reasonChipTextActive,
                      ]}
                    >
                      {reason.charAt(0).toUpperCase() + reason.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Maintenance Notes</Text>
              <TextInput
                style={styles.notesTextarea}
                value={maintenanceForm.notes}
                onChangeText={(text) =>
                  setMaintenanceForm({ ...maintenanceForm, notes: text })
                }
                multiline
                numberOfLines={5}
                placeholder="Add details about the maintenance work, expected impact, and any special instructions..."
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={22} color="#2563EB" />
              <Text style={styles.infoText}>
                The amenity will be marked as under maintenance and unavailable for
                booking during this period. All residents will be notified automatically.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.maintenanceModalFooter}>
            <TouchableOpacity
              style={styles.cancelMaintenanceButton}
              onPress={() => setShowMaintenanceModal(false)}
            >
              <Text style={styles.cancelMaintenanceText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.scheduleMaintenanceButton}
              onPress={handleScheduleMaintenance}
            >
              <Ionicons name="hammer-outline" size={20} color="#FFF" />
              <Text style={styles.scheduleMaintenanceText}>Schedule Maintenance</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={new Date(
                editingDateField === "start"
                  ? maintenanceForm.startDate
                  : maintenanceForm.endDate
              )}
              mode={datePickerMode}
              is24Hour={false}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              minimumDate={editingDateField === "end" ? new Date(maintenanceForm.startDate) : new Date()}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const ScrollViewModal: React.FC<{
  amenityConfig: BuildingAmenityConfig | null;
  onClose: () => void;
  onOpenMaintenance: () => void;
  onEditAmenity: (config: BuildingAmenityConfig) => void;
}> = ({ amenityConfig, onClose, onOpenMaintenance, onEditAmenity }) => {
  if (!amenityConfig) return null;

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{amenityConfig.amenityName}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Booking Window</Text>
            <Text style={styles.modalBodyText}>
              Residents can book up to {amenityConfig.bookingWindowDays} days in advance.
            </Text>
            <Text style={styles.modalBodyText}>
              Each slot lasts {amenityConfig.maxDurationMinutes} minutes with a
              maximum of {amenityConfig.maxConcurrentBookings} concurrent bookings.
            </Text>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Rules</Text>
            {amenityConfig.rules.map((rule) => (
              <View key={rule.id} style={styles.modalRuleRow}>
                <Ionicons name="ellipse" size={6} color="#6B7280" />
                <Text style={styles.modalBodyText}>{rule.label}</Text>
              </View>
            ))}
          </View>

          {amenityConfig.maintenanceWindow ? (
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Maintenance Window</Text>
              <Text style={styles.modalBodyText}>
                {amenityConfig.maintenanceWindow.start.slice(0, 16)} →
                {" "}
                {amenityConfig.maintenanceWindow.end.slice(0, 16)}
              </Text>
              {amenityConfig.maintenanceWindow.notes ? (
                <Text style={styles.modalBodyText}>
                  {amenityConfig.maintenanceWindow.notes}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.modalSection}>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => {
                onClose();
                onOpenMaintenance();
              }}
            >
              <Ionicons name="calendar-outline" size={16} color="#FFF" />
              <Text style={styles.modalPrimaryText}>Schedule Maintenance</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalPrimaryButton, { backgroundColor: "#2563EB" }]}
              onPress={() => {
                onClose();
                onEditAmenity(amenityConfig);
              }}
            >
              <Ionicons name="create-outline" size={16} color="#FFF" />
              <Text style={styles.modalPrimaryText}>Edit Amenity</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  filterRow: {
    marginTop: 12,
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
  configList: {
    marginTop: 20,
    gap: 16,
    paddingBottom: 120,
  },
  configCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    gap: 12,
  },
  configHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  configSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EEF2FF",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusActive: {
    color: "#059669",
  },
  statusMaintenance: {
    color: "#B45309",
  },
  configMetaRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2A37",
  },
  ruleList: {
    gap: 6,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ruleText: {
    fontSize: 13,
    color: "#4B5563",
  },
  maintenanceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    padding: 12,
    borderRadius: 14,
  },
  maintenanceTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#92400E",
  },
  maintenanceText: {
    fontSize: 12,
    color: "#B45309",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  modalBodyText: {
    fontSize: 13,
    color: "#4B5563",
  },
  modalRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalPrimaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  maintenanceModalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  maintenanceModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  maintenanceModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  maintenanceModalContent: {
    flex: 1,
  },
  maintenanceModalContentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  amenityNameBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  formValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  dateText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1E40AF",
    flex: 1,
  },
  reasonChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  reasonChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  reasonChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  reasonChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  reasonChipTextActive: {
    color: "#FFFFFF",
  },
  notesTextarea: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    minHeight: 120,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
  },
  maintenanceModalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 24,
    paddingBottom: 32,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelMaintenanceButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelMaintenanceText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  scheduleMaintenanceButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  scheduleMaintenanceText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scheduleMaintenanceButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  addButtonContainer: {
    marginTop: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusPillActive: {
    backgroundColor: "#D1FAE5",
  },
  statusPillInactive: {
    backgroundColor: "#FEE2E2",
  },
  statusPillMaintenance: {
    backgroundColor: "#FEF3C7",
  },
  statusInactive: {
    color: "#DC2626",
  },
  maintenanceIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  numberInputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  numberValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  buildingChips: {
    gap: 10,
    paddingVertical: 4,
  },
  datePickerRow: {
    flexDirection: "row",
    gap: 10,
  },
  datePickerButton: {
    flex: 2,
  },
  timePickerButton: {
    flex: 1,
  },
});
