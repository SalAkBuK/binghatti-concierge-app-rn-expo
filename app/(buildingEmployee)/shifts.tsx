import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Shift, ShiftStatus } from "../../lib/types";
import { getUnreadNotificationsCount } from "../../lib/utils/helpers";

type ViewMode = "week" | "month" | "list";

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

const getTodayString = (): string => getDateString(0);

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

const getMonthStart = (date: string): string => {
  const d = new Date(date + "T00:00:00");
  d.setDate(1);
  return d.toISOString().split("T")[0];
};

const getMonthDates = (monthStart: string): string[] => {
  const dates: string[] = [];
  const start = new Date(monthStart + "T00:00:00");
  const month = start.getMonth();

  let current = new Date(start);
  while (current.getMonth() === month) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const calculateShiftDuration = (startTime: string, endTime: string): string => {
  const [startHours, startMinutes] = startTime.split(":").map(Number);
  const [endHours, endMinutes] = endTime.split(":").map(Number);

  let durationMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);

  // Handle overnight shifts
  if (durationMinutes < 0) {
    durationMinutes += 24 * 60;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};

export default function BuildingEmployeeShiftsScreen() {
  const { isAuthenticated, currentUser, actions, notifications } = useApp();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(getWeekStart(getTodayString()));
  const [monthStart, setMonthStart] = useState(getMonthStart(getTodayString()));

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  const buildingEmployee = useMemo(() => {
    if (!currentUser) return null;
    return actions.getBuildingEmployeeByUserId?.(currentUser.id) ?? null;
  }, [actions, currentUser]);

  const employeeId = buildingEmployee?.id;

  // Mock shifts data - in production, this would come from context/API
  const allShifts: Shift[] = useMemo(() => {
    if (!employeeId) return [];

    // This would normally come from: actions.getEmployeeShifts?.(employeeId) ?? []
    // For now, return mock data for demonstration
    const today = getTodayString();
    return [
      {
        id: "shift-1",
        buildingId: buildingEmployee?.buildingId || "",
        employeeId: employeeId,
        employeeName: currentUser?.name || "",
        role: buildingEmployee?.role || "Staff",
        shiftDate: today,
        startTime: "08:00",
        endTime: "16:00",
        status: "active" as ShiftStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "shift-2",
        buildingId: buildingEmployee?.buildingId || "",
        employeeId: employeeId,
        employeeName: currentUser?.name || "",
        role: buildingEmployee?.role || "Staff",
        shiftDate: getDateString(1),
        startTime: "08:00",
        endTime: "16:00",
        status: "active" as ShiftStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "shift-3",
        buildingId: buildingEmployee?.buildingId || "",
        employeeId: employeeId,
        employeeName: currentUser?.name || "",
        role: buildingEmployee?.role || "Staff",
        shiftDate: getDateString(-1),
        startTime: "08:00",
        endTime: "16:00",
        status: "completed" as ShiftStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "shift-4",
        buildingId: buildingEmployee?.buildingId || "",
        employeeId: employeeId,
        employeeName: currentUser?.name || "",
        role: buildingEmployee?.role || "Staff",
        shiftDate: getDateString(-2),
        startTime: "16:00",
        endTime: "00:00",
        status: "completed" as ShiftStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }, [employeeId, buildingEmployee, currentUser]);

  const todayShift = useMemo(() => {
    const today = getTodayString();
    return allShifts.find(shift => shift.shiftDate === today && shift.status === "active");
  }, [allShifts]);

  const upcomingShifts = useMemo(() => {
    const today = getTodayString();
    return allShifts.filter(shift =>
      shift.shiftDate >= today && shift.status === "active"
    ).sort((a, b) => a.shiftDate.localeCompare(b.shiftDate));
  }, [allShifts]);

  const completedShifts = useMemo(() => {
    return allShifts
      .filter(shift => shift.status === "completed")
      .sort((a, b) => b.shiftDate.localeCompare(a.shiftDate))
      .slice(0, 10); // Last 10 completed shifts
  }, [allShifts]);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const monthDates = useMemo(() => getMonthDates(monthStart), [monthStart]);

  const shiftsInWeek = useMemo(() => {
    return allShifts.filter(shift => weekDates.includes(shift.shiftDate));
  }, [allShifts, weekDates]);

  const shiftsInMonth = useMemo(() => {
    return allShifts.filter(shift => monthDates.includes(shift.shiftDate));
  }, [allShifts, monthDates]);

  const hasUnreadNotifications =
    getUnreadNotificationsCount(notifications || []) > 0;

  const onRefresh = async () => {
    setRefreshing(true);
    // In production: await actions.refreshEmployeeShifts?.()
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleClockIn = async (shift: Shift) => {
    Alert.alert(
      "Clock In",
      `Start your ${shift.role} shift?\n\n${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clock In",
          style: "default",
          onPress: async () => {
            try {
              // In production: await actions.clockInToShift?.(shift.id, new Date().toISOString())
              Alert.alert("Success", "You have clocked in successfully");
            } catch (error) {
              console.error("Failed to clock in:", error);
              Alert.alert("Error", "Failed to clock in. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleClockOut = async (shift: Shift) => {
    Alert.alert(
      "Clock Out",
      `End your ${shift.role} shift?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clock Out",
          style: "default",
          onPress: async () => {
            try {
              // In production: await actions.clockOutFromShift?.(shift.id, new Date().toISOString())
              Alert.alert("Success", "You have clocked out successfully");
            } catch (error) {
              console.error("Failed to clock out:", error);
              Alert.alert("Error", "Failed to clock out. Please try again.");
            }
          },
        },
      ]
    );
  };

  const navigatePreviousWeek = () => {
    const newStart = getDateString(-7);
    const newWeekStart = getWeekStart(newStart);
    setWeekStart(newWeekStart);
  };

  const navigateNextWeek = () => {
    const newStart = getDateString(7);
    const newWeekStart = getWeekStart(newStart);
    setWeekStart(newWeekStart);
  };

  const navigatePreviousMonth = () => {
    const current = new Date(monthStart + "T00:00:00");
    current.setMonth(current.getMonth() - 1);
    setMonthStart(current.toISOString().split("T")[0]);
  };

  const navigateNextMonth = () => {
    const current = new Date(monthStart + "T00:00:00");
    current.setMonth(current.getMonth() + 1);
    setMonthStart(current.toISOString().split("T")[0]);
  };

  const getShiftsForDate = (date: string): Shift[] => {
    return allShifts.filter(shift => shift.shiftDate === date);
  };

  const ShiftCard = ({ shift }: { shift: Shift }) => {
    const isToday = shift.shiftDate === getTodayString();
    const isPast = shift.shiftDate < getTodayString();
    const duration = calculateShiftDuration(shift.startTime, shift.endTime);

    return (
      <View style={[styles.shiftCard, isToday && styles.shiftCardToday]}>
        <View style={styles.shiftHeader}>
          <View style={styles.shiftDateInfo}>
            <Text style={styles.shiftDate}>{formatDateShort(shift.shiftDate)}</Text>
            {isToday && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>}
          </View>
          <View style={[
            styles.statusBadge,
            shift.status === "active" && styles.statusActive,
            shift.status === "completed" && styles.statusCompleted,
            shift.status === "cancelled" && styles.statusCancelled,
          ]}>
            <Text style={styles.statusText}>
              {shift.status === "active" ? "Active" : shift.status === "completed" ? "Completed" : "Cancelled"}
            </Text>
          </View>
        </View>

        <View style={styles.shiftDetails}>
          <View style={styles.shiftTimeRow}>
            <Ionicons name="time-outline" size={18} color="#2563EB" />
            <Text style={styles.shiftTime}>
              {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
            </Text>
            <Text style={styles.shiftDuration}>({duration})</Text>
          </View>

          <View style={styles.shiftRoleRow}>
            <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
            <Text style={styles.shiftRole}>{shift.role}</Text>
          </View>

          {shift.notes && (
            <View style={styles.shiftNotesRow}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.shiftNotes}>{shift.notes}</Text>
            </View>
          )}
        </View>

        {/* Clock-in/Clock-out buttons */}
        {isToday && shift.status === "active" && (
          <View style={styles.shiftActions}>
            <TouchableOpacity
              style={styles.clockInButton}
              onPress={() => handleClockIn(shift)}
            >
              <Ionicons name="play-circle" size={18} color="#FFFFFF" />
              <Text style={styles.clockInButtonText}>Clock In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clockOutButton}
              onPress={() => handleClockOut(shift)}
            >
              <Ionicons name="stop-circle" size={18} color="#FFFFFF" />
              <Text style={styles.clockOutButtonText}>Clock Out</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPast && shift.status === "completed" && (
          <View style={styles.completedInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={styles.completedText}>Shift completed</Text>
          </View>
        )}
      </View>
    );
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (currentUser.role !== "building_employee") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Access Restricted</Text>
          <Text style={styles.emptySubtitle}>
            This workspace is only available to building employees.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <HeaderBar
          title="My Shifts"
          subtitle={`${upcomingShifts.length} upcoming shifts`}
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        {/* View Mode Selector */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.viewModeContainer}
        >
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === "week" && styles.viewModeButtonActive]}
            onPress={() => setViewMode("week")}
          >
            <Text style={[styles.viewModeText, viewMode === "week" && styles.viewModeTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === "month" && styles.viewModeButtonActive]}
            onPress={() => setViewMode("month")}
          >
            <Text style={[styles.viewModeText, viewMode === "month" && styles.viewModeTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === "list" && styles.viewModeButtonActive]}
            onPress={() => setViewMode("list")}
          >
            <Text style={[styles.viewModeText, viewMode === "list" && styles.viewModeTextActive]}>
              List
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Today's Shift Highlight */}
        {todayShift && (
          <Animated.View
            entering={FadeInDown.delay(80).duration(400)}
            style={styles.todayShiftContainer}
          >
            <Text style={styles.sectionTitle}>Current Shift</Text>
            <ShiftCard shift={todayShift} />
          </Animated.View>
        )}

        {/* Week View */}
        {viewMode === "week" && (
          <Animated.View
            entering={FadeInDown.delay(120).duration(400)}
            style={styles.calendarContainer}
          >
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={navigatePreviousWeek} style={styles.navButton}>
                <Ionicons name="chevron-back" size={24} color="#2563EB" />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>
                {formatDateShort(weekDates[0])} - {formatDateShort(weekDates[6])}
              </Text>
              <TouchableOpacity onPress={navigateNextWeek} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={24} color="#2563EB" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekGrid}>
              {weekDates.map((date) => {
                const shiftsForDay = getShiftsForDate(date);
                const isToday = date === getTodayString();

                return (
                  <View key={date} style={[styles.dayCell, isToday && styles.dayCellToday]}>
                    <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                      {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                    </Text>
                    <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                      {new Date(date + "T00:00:00").getDate()}
                    </Text>
                    {shiftsForDay.length > 0 && (
                      <View style={styles.dayShifts}>
                        {shiftsForDay.map((shift) => (
                          <View key={shift.id} style={styles.dayShiftDot}>
                            <Text style={styles.dayShiftTime}>
                              {formatTime(shift.startTime)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {shiftsInWeek.length > 0 && (
              <View style={styles.weekShiftsList}>
                <Text style={styles.sectionTitle}>This Week&apos;s Shifts</Text>
                {shiftsInWeek.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Month View */}
        {viewMode === "month" && (
          <Animated.View
            entering={FadeInDown.delay(120).duration(400)}
            style={styles.calendarContainer}
          >
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={navigatePreviousMonth} style={styles.navButton}>
                <Ionicons name="chevron-back" size={24} color="#2563EB" />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>
                {new Date(monthStart + "T00:00:00").toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric"
                })}
              </Text>
              <TouchableOpacity onPress={navigateNextMonth} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={24} color="#2563EB" />
              </TouchableOpacity>
            </View>

            <View style={styles.monthStats}>
              <View style={styles.monthStatCard}>
                <Text style={styles.monthStatValue}>{shiftsInMonth.length}</Text>
                <Text style={styles.monthStatLabel}>Total Shifts</Text>
              </View>
              <View style={styles.monthStatCard}>
                <Text style={styles.monthStatValue}>
                  {shiftsInMonth.filter(s => s.status === "completed").length}
                </Text>
                <Text style={styles.monthStatLabel}>Completed</Text>
              </View>
              <View style={styles.monthStatCard}>
                <Text style={styles.monthStatValue}>
                  {shiftsInMonth.reduce((total, shift) => {
                    const [startH, startM] = shift.startTime.split(":").map(Number);
                    const [endH, endM] = shift.endTime.split(":").map(Number);
                    let mins = (endH * 60 + endM) - (startH * 60 + startM);
                    if (mins < 0) mins += 24 * 60;
                    return total + mins;
                  }, 0) / 60}h
                </Text>
                <Text style={styles.monthStatLabel}>Total Hours</Text>
              </View>
            </View>

            {shiftsInMonth.length > 0 && (
              <View style={styles.monthShiftsList}>
                {shiftsInMonth.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* List View */}
        {viewMode === "list" && (
          <Animated.View
            entering={FadeInDown.delay(120).duration(400)}
            style={styles.listContainer}
          >
            {/* Upcoming Shifts */}
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Upcoming Shifts ({upcomingShifts.length})</Text>
              {upcomingShifts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
                  <Text style={styles.emptyCardTitle}>No upcoming shifts</Text>
                  <Text style={styles.emptyCardSubtitle}>
                    Your schedule will appear here
                  </Text>
                </View>
              ) : (
                upcomingShifts.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} />
                ))
              )}
            </View>

            {/* Shift History */}
            <View style={styles.listSection}>
              <Text style={styles.sectionTitle}>Shift History</Text>
              {completedShifts.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="time-outline" size={40} color="#CBD5E1" />
                  <Text style={styles.emptyCardTitle}>No completed shifts</Text>
                  <Text style={styles.emptyCardSubtitle}>
                    Your shift history will appear here
                  </Text>
                </View>
              ) : (
                completedShifts.map((shift) => (
                  <ShiftCard key={shift.id} shift={shift} />
                ))
              )}
            </View>
          </Animated.View>
        )}

        {/* Summary Stats */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          style={styles.summaryContainer}
        >
          <Text style={styles.sectionTitle}>This Week Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="calendar-outline" size={24} color="#2563EB" />
              <Text style={styles.summaryValue}>{shiftsInWeek.length}</Text>
              <Text style={styles.summaryLabel}>Shifts</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="time-outline" size={24} color="#10B981" />
              <Text style={styles.summaryValue}>
                {shiftsInWeek.reduce((total, shift) => {
                  const [startH, startM] = shift.startTime.split(":").map(Number);
                  const [endH, endM] = shift.endTime.split(":").map(Number);
                  let mins = (endH * 60 + endM) - (startH * 60 + startM);
                  if (mins < 0) mins += 24 * 60;
                  return total + mins / 60;
                }, 0).toFixed(0)}h
              </Text>
              <Text style={styles.summaryLabel}>Total Hours</Text>
            </View>
            <View style={styles.summaryCard}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#8B5CF6" />
              <Text style={styles.summaryValue}>
                {shiftsInWeek.filter(s => s.status === "completed").length}
              </Text>
              <Text style={styles.summaryLabel}>Completed</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser.role}
      />
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  viewModeContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginTop: 12,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  viewModeButtonActive: {
    backgroundColor: "#2563EB",
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  viewModeTextActive: {
    color: "#FFFFFF",
  },
  todayShiftContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  shiftCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#E5E7EB",
  },
  shiftCardToday: {
    borderLeftColor: "#2563EB",
    backgroundColor: "#F0F9FF",
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  shiftDateInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shiftDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  todayBadge: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  statusActive: {
    backgroundColor: "#DBEAFE",
  },
  statusCompleted: {
    backgroundColor: "#DCFCE7",
  },
  statusCancelled: {
    backgroundColor: "#FEE2E2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  shiftDetails: {
    gap: 10,
  },
  shiftTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shiftTime: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  shiftDuration: {
    fontSize: 14,
    color: "#6B7280",
  },
  shiftRoleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shiftRole: {
    fontSize: 14,
    color: "#4B5563",
  },
  shiftNotesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
  },
  shiftNotes: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  shiftActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  clockInButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 10,
  },
  clockInButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  clockOutButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 10,
  },
  clockOutButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  completedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  completedText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
  },
  calendarContainer: {
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  navButton: {
    padding: 4,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  weekGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  dayCell: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    minHeight: 100,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dayCellToday: {
    backgroundColor: "#2563EB",
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  dayLabelToday: {
    color: "#DBEAFE",
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  dayNumberToday: {
    color: "#FFFFFF",
  },
  dayShifts: {
    width: "100%",
    gap: 4,
  },
  dayShiftDot: {
    backgroundColor: "#DBEAFE",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  dayShiftTime: {
    fontSize: 9,
    fontWeight: "600",
    color: "#1D4ED8",
    textAlign: "center",
  },
  weekShiftsList: {
    gap: 12,
  },
  monthStats: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  monthStatCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monthStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  monthStatLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  monthShiftsList: {
    gap: 12,
  },
  listContainer: {
    gap: 24,
  },
  listSection: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptyCardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
