import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import { MaintenanceSchedulerApiService } from "../../../lib/services/api/maintenance-scheduler";
import type { MaintenanceSchedule } from "../../../lib/types";
import { ADMIN_NOTIFICATION_ROUTE, MAINTENANCE_TYPE_ICONS } from "./_constants";
import { FiltersPanel } from "./_components/FiltersPanel";
import { CreateScheduleModal } from "./_components/CreateScheduleModal";
import { ScheduleDetailModal } from "./_components/ScheduleDetailModal";
import { ScheduleList } from "./_components/ScheduleList";
import { StatsCards } from "./_components/StatsCards";
import { useMaintenanceData } from "./_hooks/useMaintenanceData";
import { styles } from "./_styles";
import type { MaintenanceFormState, MaintenanceSummary } from "./_types";
import type { StatusFilter, ViewMode } from "./_constants";

const maintenanceService = new MaintenanceSchedulerApiService();

const createInitialFormState = (): MaintenanceFormState => ({
  buildingId: "",
  title: "",
  description: "",
  maintenanceType: "general",
  scheduledDate: "",
  scheduledTime: "09:00",
  duration: 2,
  affectedAreas: [],
  estimatedImpact: "",
  notifyTenants: false,
  notificationMessage: "",
  notes: "",
});

export default function MaintenanceSchedulerScreen() {
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<MaintenanceSchedule | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<MaintenanceFormState>(createInitialFormState());

  const { buildingOptions, hasUnreadNotifications } = useMaintenanceData();

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await maintenanceService.getAllSchedules(
        statusFilter !== "all" ? statusFilter : undefined,
        selectedBuildingId !== "all" ? selectedBuildingId : undefined,
      );
      if (response.success && response.data) {
        setSchedules(response.data);
      }
    } catch {
      Alert.alert("Error", "Failed to load schedules");
    } finally {
      setLoading(false);
    }
  }, [selectedBuildingId, statusFilter]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const summary: MaintenanceSummary = useMemo(() => {
    return {
      upcoming: schedules.filter((s) => s.status === "upcoming").length,
      completed: schedules.filter((s) => s.status === "completed").length,
      inProgress: schedules.filter((s) => s.status === "in_progress").length,
    };
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return schedules;
    return schedules.filter((schedule) => {
      const haystack = `${schedule.title} ${schedule.buildingName} ${schedule.maintenanceType}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [schedules, searchQuery]);

  const getMaintenanceTypeIcon = (type: MaintenanceSchedule["maintenanceType"]) =>
    MAINTENANCE_TYPE_ICONS[type] || "construct-outline";

  const statusColorMap = {
    upcoming: "#FF9800",
    in_progress: "#2196F3",
    completed: "#4CAF50",
    cancelled: "#9E9E9E",
  } as const;

  const getStatusColor = (status: MaintenanceSchedule["status"]) =>
    statusColorMap[status] || "#9E9E9E";

  const handleCreateSchedule = async () => {
    if (!formData.buildingId || !formData.title || !formData.scheduledDate) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await maintenanceService.createSchedule(formData);
      if (response.success) {
        Alert.alert("Success", "Maintenance schedule created successfully");
        setShowCreateModal(false);
        setFormData(createInitialFormState());
        loadSchedules();
      }
    } catch {
      Alert.alert("Error", "Failed to create schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyTenants = async (scheduleId: string) => {
    try {
      const response = await maintenanceService.notifyTenants(scheduleId);
      if (response.success) {
        Alert.alert("Success", "Notifications sent to tenants");
        loadSchedules();
      }
    } catch {
      Alert.alert("Error", "Failed to send notifications");
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    Alert.alert("Cancel Schedule", "Cancel this maintenance schedule?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await maintenanceService.cancelSchedule(scheduleId, "Cancelled by admin");
            if (response.success) {
              Alert.alert("Success", "Schedule cancelled successfully");
              setShowDetailModal(false);
              loadSchedules();
            }
          } catch {
            Alert.alert("Error", "Failed to cancel schedule");
          }
        },
      },
    ]);
  };

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const ListHeader = useCallback(() => (
    <View>
      <StatsCards summary={summary} />
      <FiltersPanel
        buildingOptions={buildingOptions}
        selectedBuildingId={selectedBuildingId}
        onSelectBuilding={setSelectedBuildingId}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreatePress={() => setShowCreateModal(true)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    </View>
  ), [summary, buildingOptions, selectedBuildingId, statusFilter, searchQuery, viewMode]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
        <HeaderBar
          title="Maintenance Scheduler"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00796B" />
          </View>
        ) : viewMode === "list" ? (
          <ScheduleList
            schedules={filteredSchedules}
            onSelect={(schedule) => {
              setSelectedSchedule(schedule);
              setShowDetailModal(true);
            }}
            getMaintenanceTypeIcon={getMaintenanceTypeIcon}
            getStatusColor={getStatusColor}
            ListHeaderComponent={ListHeader}
          />
        ) : (
          <View style={styles.calendarPlaceholder}>
            <Ionicons name="calendar" size={64} color="#ccc" />
            <Text style={styles.placeholderText}>Calendar view coming soon</Text>
          </View>
        )}
      </View>

      <ScheduleDetailModal
        visible={showDetailModal}
        schedule={selectedSchedule}
        isCompact={width < 768}
        getStatusColor={getStatusColor}
        onClose={() => setShowDetailModal(false)}
        onNotifyTenants={handleNotifyTenants}
        onCancelSchedule={handleCancelSchedule}
      />

      <CreateScheduleModal
        visible={showCreateModal}
        buildings={buildingOptions}
        formData={formData}
        isCreating={loading}
        onChange={(updates) => setFormData((prev) => ({ ...prev, ...updates }))}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSchedule}
      />
    </SafeAreaView>
  );
}
