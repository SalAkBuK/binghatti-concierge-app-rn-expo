import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
  useWindowDimensions,
  Platform,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import type { Shift, ShiftStatus } from "../../lib/types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import { MOCK_SHIFTS } from "../../lib/utils/mockData";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type ViewMode = "week" | "list";
type StatusFilter = "all" | ShiftStatus;

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

// Helper functions
const formatTime = (time: string): string => {
  // Convert 24h format to 12h with AM/PM
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const getDateString = (daysOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split("T")[0];
};

const getWeekDates = (startDate: string): string[] => {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }
  return dates;
};

const getWeekStart = (date: string): string => {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust to Sunday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
};

// Shift Status Badge Component
const ShiftStatusBadge = ({ status }: { status: ShiftStatus }) => {
  const getStatusStyle = () => {
    switch (status) {
      case "active":
        return { bg: "#DBEAFE", text: "#1E40AF", label: "Active" };
      case "completed":
        return { bg: "#D1FAE5", text: "#065F46", label: "Completed" };
      case "cancelled":
        return { bg: "#FEE2E2", text: "#991B1B", label: "Cancelled" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280", label: status };
    }
  };

  const style = getStatusStyle();

  return (
    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
      <Text style={[styles.statusText, { color: style.text }]}>
        {style.label}
      </Text>
    </View>
  );
};

// Shift Card Component
const ShiftCard = ({
  shift,
  onPress,
}: {
  shift: Shift;
  onPress: (shift: Shift) => void;
}) => {
  return (
    <TouchableOpacity
      style={styles.shiftCard}
      onPress={() => onPress(shift)}
      activeOpacity={0.7}
    >
      <View style={styles.shiftCardHeader}>
        <View style={styles.shiftCardMain}>
          <Text style={styles.employeeName}>{shift.employeeName}</Text>
          <Text style={styles.shiftRole}>{shift.role}</Text>
        </View>
        <ShiftStatusBadge status={shift.status} />
      </View>
      <View style={styles.shiftCardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text style={styles.metaText}>{formatDateShort(shift.shiftDate)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text style={styles.metaText}>
            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
          </Text>
        </View>
      </View>
      {shift.notes && (
        <Text style={styles.shiftNotes} numberOfLines={1}>
          {shift.notes}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// Week View Component
const WeekView = ({
  shifts,
  weekDates,
  onShiftPress,
}: {
  shifts: Shift[];
  weekDates: string[];
  onShiftPress: (shift: Shift) => void;
}) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.weekContainer}>
        {weekDates.map((date, index) => {
          const dayShifts = shifts.filter((s) => s.shiftDate === date);
          const isToday = date === getDateString(0);

          return (
            <View key={date} style={styles.dayColumn}>
              <View style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
                <Text
                  style={[styles.dayHeaderText, isToday && styles.dayHeaderTextToday]}
                >
                  {formatDateShort(date)}
                </Text>
              </View>
              <ScrollView style={styles.dayShifts}>
                {dayShifts.length === 0 ? (
                  <View style={styles.noShifts}>
                    <Text style={styles.noShiftsText}>No shifts</Text>
                  </View>
                ) : (
                  dayShifts.map((shift) => (
                    <TouchableOpacity
                      key={shift.id}
                      style={styles.weekShiftCard}
                      onPress={() => onShiftPress(shift)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.weekShiftTime}>
                        {formatTime(shift.startTime)}
                      </Text>
                      <Text style={styles.weekShiftEmployee} numberOfLines={1}>
                        {shift.employeeName}
                      </Text>
                      <Text style={styles.weekShiftRole} numberOfLines={1}>
                        {shift.role}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

// Shift Form Modal
const ShiftFormModal = ({
  visible,
  onClose,
  onSave,
  employees,
  editShift,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (shift: Partial<Shift>) => void;
  employees: { id: string; name: string }[];
  editShift?: Shift | null;
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState(
    editShift?.employeeId || "",
  );
  const [selectedDate, setSelectedDate] = useState(
    editShift?.shiftDate || getDateString(0),
  );
  const [startTime, setStartTime] = useState(editShift?.startTime || "08:00");
  const [endTime, setEndTime] = useState(editShift?.endTime || "16:00");
  const [role, setRole] = useState(editShift?.role || "");
  const [notes, setNotes] = useState(editShift?.notes || "");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = () => {
    if (!selectedEmployee || !role || !startTime || !endTime) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const employee = employees.find((e) => e.id === selectedEmployee);
    if (!employee) {
      Alert.alert("Error", "Please select an employee");
      return;
    }

    onSave({
      employeeId: selectedEmployee,
      employeeName: employee.name,
      role,
      shiftDate: selectedDate,
      startTime,
      endTime,
      notes,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editShift ? "Edit Shift" : "Create Shift"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Employee *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.employeeChips}>
                  {employees.map((emp) => (
                    <TouchableOpacity
                      key={emp.id}
                      style={[
                        styles.employeeChip,
                        selectedEmployee === emp.id && styles.employeeChipSelected,
                      ]}
                      onPress={() => setSelectedEmployee(emp.id)}
                    >
                      <Text
                        style={[
                          styles.employeeChipText,
                          selectedEmployee === emp.id &&
                            styles.employeeChipTextSelected,
                        ]}
                      >
                        {emp.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Role/Position *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Security Guard, Maintenance Technician"
                placeholderTextColor="#9CA3AF"
                value={role}
                onChangeText={setRole}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.formInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: "#111827" }}>{formatDateShort(selectedDate)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(selectedDate + "T00:00:00")}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (date) {
                      setSelectedDate(date.toISOString().split("T")[0]);
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Start Time *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="08:00"
                  placeholderTextColor="#9CA3AF"
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>End Time *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="16:00"
                  placeholderTextColor="#9CA3AF"
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Additional notes about this shift..."
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {editShift ? "Update" : "Create"} Shift
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Shift Details Modal
const ShiftDetailsModal = ({
  shift,
  visible,
  onClose,
  onEdit,
  onCancel,
}: {
  shift: Shift | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (shift: Shift) => void;
  onCancel: (shiftId: string) => void;
}) => {
  if (!shift) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Shift Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Employee</Text>
              <Text style={styles.detailValue}>{shift.employeeName}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Role/Position</Text>
              <Text style={styles.detailValue}>{shift.role}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Status</Text>
              <ShiftStatusBadge status={shift.status} />
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDateShort(shift.shiftDate)}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
              </Text>
            </View>

            {shift.notes && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{shift.notes}</Text>
              </View>
            )}

            {shift.status === "active" && (
              <View style={styles.actionSection}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    onEdit(shift);
                    onClose();
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#2563EB" />
                  <Text style={styles.editButtonText}>Edit Shift</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelShiftButton}
                  onPress={() => {
                    Alert.alert(
                      "Cancel Shift",
                      "Are you sure you want to cancel this shift?",
                      [
                        { text: "No", style: "cancel" },
                        {
                          text: "Yes, Cancel",
                          style: "destructive",
                          onPress: () => {
                            onCancel(shift.id);
                            onClose();
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#991B1B" />
                  <Text style={styles.cancelShiftButtonText}>Cancel Shift</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function ShiftsScreen() {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedDate, setSelectedDate] = useState(getDateString(0));
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - in production, this would come from API/context
  const [shifts, setShifts] = useState<Shift[]>(MOCK_SHIFTS);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  // Extract unique employees from shifts
  const employees = useMemo(() => {
    const uniqueEmployees = new Map<string, { id: string; name: string }>();
    shifts.forEach((shift) => {
      if (!uniqueEmployees.has(shift.employeeId)) {
        uniqueEmployees.set(shift.employeeId, {
          id: shift.employeeId,
          name: shift.employeeName,
        });
      }
    });
    return Array.from(uniqueEmployees.values());
  }, [shifts]);

  // Get week dates for week view
  const weekStart = getWeekStart(selectedDate);
  const weekDates = getWeekDates(weekStart);

  // Filter shifts
  const filteredShifts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return shifts
      .filter((shift) => {
        if (statusFilter !== "all" && shift.status !== statusFilter) {
          return false;
        }
        if (viewMode === "week") {
          return weekDates.includes(shift.shiftDate);
        }
        if (query) {
          const haystack = `${shift.employeeName} ${shift.role} ${shift.notes || ""}`.toLowerCase();
          return haystack.includes(query);
        }
        return true;
      })
      .sort((a, b) => {
        const dateCompare = a.shiftDate.localeCompare(b.shiftDate);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [shifts, statusFilter, viewMode, weekDates, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const today = getDateString(0);
    const todayShifts = shifts.filter((s) => s.shiftDate === today && s.status === "active");
    return {
      total: shifts.filter((s) => s.status === "active").length,
      today: todayShifts.length,
      active: shifts.filter((s) => s.status === "active").length,
      completed: shifts.filter((s) => s.status === "completed").length,
    };
  }, [shifts]);

  const handleShiftPress = (shift: Shift) => {
    setSelectedShift(shift);
    setShowDetailsModal(true);
  };

  const handleCreateShift = () => {
    setEditingShift(null);
    setShowFormModal(true);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShowFormModal(true);
  };

  const handleSaveShift = (shiftData: Partial<Shift>) => {
    if (editingShift) {
      // Update existing shift
      setShifts((prev) =>
        prev.map((s) =>
          s.id === editingShift.id
            ? {
                ...s,
                ...shiftData,
                updatedAt: new Date().toISOString(),
              }
            : s,
        ),
      );
      Alert.alert("Success", "Shift updated successfully");
    } else {
      // Create new shift
      const newShift: Shift = {
        id: `shift-${Date.now()}`,
        buildingId: "building-1",
        employeeId: shiftData.employeeId!,
        employeeName: shiftData.employeeName!,
        role: shiftData.role!,
        shiftDate: shiftData.shiftDate!,
        startTime: shiftData.startTime!,
        endTime: shiftData.endTime!,
        status: "active",
        notes: shiftData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.id,
        createdByName: currentUser?.name,
      };
      setShifts((prev) => [...prev, newShift]);
      Alert.alert("Success", "Shift created successfully");
    }
    setShowFormModal(false);
    setEditingShift(null);
  };

  const handleCancelShift = (shiftId: string) => {
    setShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              status: "cancelled" as ShiftStatus,
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    );
    Alert.alert("Success", "Shift cancelled successfully");
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const offset = direction === "prev" ? -7 : 7;
    const newDate = new Date(selectedDate + "T00:00:00");
    newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate.toISOString().split("T")[0]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={styles.scrollContent}
      >
        <HeaderBar
          title="Shift Management"
          subtitle="Manage employee work schedules"
          hasUnreadNotifications={hasUnreadNotifications}
          onNotificationPress={() => router.push(MANAGEMENT_NOTIFICATION_ROUTE)}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.today}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* View Toggle & Create Button */}
        <View style={styles.controlsContainer}>
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === "list" && styles.toggleButtonActive]}
              onPress={() => setViewMode("list")}
            >
              <Ionicons
                name="list"
                size={20}
                color={viewMode === "list" ? "#FFFFFF" : "#6B7280"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === "week" && styles.toggleButtonActive]}
              onPress={() => setViewMode("week")}
            >
              <Ionicons
                name="calendar"
                size={20}
                color={viewMode === "week" ? "#FFFFFF" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.createButton} onPress={handleCreateShift}>
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Shift</Text>
          </TouchableOpacity>
        </View>

        {/* Week Navigation (shown in week view) */}
        {viewMode === "week" && (
          <View style={styles.weekNavigation}>
            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={() => navigateWeek("prev")}
            >
              <Ionicons name="chevron-back" size={24} color="#2563EB" />
            </TouchableOpacity>
            <Text style={styles.weekNavText}>
              {formatDateShort(weekStart)} - {formatDateShort(weekDates[6])}
            </Text>
            <TouchableOpacity
              style={styles.weekNavButton}
              onPress={() => navigateWeek("next")}
            >
              <Ionicons name="chevron-forward" size={24} color="#2563EB" />
            </TouchableOpacity>
          </View>
        )}

        {/* Search Bar (list view only) */}
        {viewMode === "list" && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by employee or role..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Status Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterPill,
                statusFilter === option.value && styles.filterPillActive,
              ]}
              onPress={() => setStatusFilter(option.value)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === option.value && styles.filterPillTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content View */}
        {viewMode === "week" ? (
          <WeekView
            shifts={filteredShifts}
            weekDates={weekDates}
            onShiftPress={handleShiftPress}
          />
        ) : (
          <View style={styles.listContainer}>
            {filteredShifts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyStateTitle}>No shifts found</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create a shift to get started"}
                </Text>
              </View>
            ) : (
              filteredShifts.map((shift, index) => (
                <Animated.View
                  key={shift.id}
                  entering={FadeInDown.delay(index * 50)}
                >
                  <ShiftCard shift={shift} onPress={handleShiftPress} />
                </Animated.View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

      <ShiftDetailsModal
        shift={selectedShift}
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        onEdit={handleEditShift}
        onCancel={handleCancelShift}
      />

      <ShiftFormModal
        visible={showFormModal}
        onClose={() => {
          setShowFormModal(false);
          setEditingShift(null);
        }}
        onSave={handleSaveShift}
        employees={employees}
        editShift={editingShift}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  controlsContainer: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  toggleButtonActive: {
    backgroundColor: "#2563EB",
  },
  createButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  weekNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  weekNavButton: {
    padding: 8,
  },
  weekNavText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  filterContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  listContainer: {
    marginTop: 16,
    marginBottom: 24,
    gap: 12,
  },
  scrollContent: {
    paddingBottom: 160,
  },
  shiftCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  shiftCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  shiftCardMain: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  shiftRole: {
    fontSize: 14,
    color: "#6B7280",
  },
  shiftCardMeta: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#6B7280",
  },
  shiftNotes: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 8,
    fontStyle: "italic",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  weekContainer: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
  },
  dayColumn: {
    width: 140,
  },
  dayHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginBottom: 8,
  },
  dayHeaderToday: {
    backgroundColor: "#2563EB",
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  dayHeaderTextToday: {
    color: "#FFFFFF",
  },
  dayShifts: {
    maxHeight: 500,
  },
  noShifts: {
    padding: 20,
    alignItems: "center",
  },
  noShiftsText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  weekShiftCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  weekShiftTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 4,
  },
  weekShiftEmployee: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  weekShiftRole: {
    fontSize: 11,
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: "#111827",
  },
  actionSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
    borderColor: "#BFDBFE",
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
  },
  cancelShiftButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 2,
    borderColor: "#FECACA",
  },
  cancelShiftButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#991B1B",
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  employeeChips: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  employeeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  employeeChipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  employeeChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  employeeChipTextSelected: {
    color: "#FFFFFF",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
