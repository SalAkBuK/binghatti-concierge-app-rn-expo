import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Job } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/notifications-hub";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function EmployeeScheduleScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const calendarWidth = width - pagePadding * 2;
  const daySize = Math.floor((calendarWidth - 12) / 7); // 12 for gaps

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Get employee's jobs
  const allJobs = useMemo(() => actions.getJobs?.() ?? [], [actions]);
  const myJobs = useMemo(() => {
    return allJobs.filter((job) => job.assignedToEmployeeId === currentUser?.id);
  }, [allJobs, currentUser?.id]);

  // Get jobs for a specific date
  const getJobsForDate = useCallback((date: Date) => {
    const dateStr = date.toDateString();
    return myJobs.filter((job) => {
      if (!job.scheduledDate) return false;
      return new Date(job.scheduledDate).toDateString() === dateStr;
    });
  }, [myJobs]);

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate]);

  // Get month stats
  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthJobs = myJobs.filter((job) => {
      if (!job.scheduledDate) return false;
      const jobDate = new Date(job.scheduledDate);
      return jobDate.getFullYear() === year && jobDate.getMonth() === month;
    });

    const scheduled = monthJobs.filter((j) =>
      j.status === "assigned" || j.status === "in-progress"
    ).length;
    const completed = monthJobs.filter((j) => j.status === "completed").length;
    const total = monthJobs.length;

    return { scheduled, completed, total };
  }, [myJobs, currentDate]);

  // Get selected day jobs
  const selectedDayJobs = useMemo(() => {
    if (!selectedDate) return [];
    return getJobsForDate(selectedDate);
  }, [selectedDate, getJobsForDate]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === new Date().toDateString();
  };

  const getJobStatusColor = (status: Job["status"]) => {
    switch (status) {
      case "assigned":
        return "#F59E0B";
      case "in-progress":
        return "#3B82F6";
      case "completed":
        return "#10B981";
      default:
        return "#64748B";
    }
  };

  const getPriorityColor = (priority: Job["priority"]) => {
    switch (priority) {
      case "urgent":
        return "#DC2626";
      case "high":
        return "#F97316";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#64748B";
    }
  };

  const renderDayCell = useCallback((date: Date | null, index: number) => {
    if (!date) {
      return <View key={`empty-${index}`} style={[styles.dayCell, { width: daySize, height: daySize }]} />;
    }

    const dayJobs = getJobsForDate(date);
    const hasJobs = dayJobs.length > 0;
    const today = isToday(date);
    const selected =
      !!date &&
      !!selectedDate &&
      date.toDateString() === selectedDate.toDateString();

    // Count jobs by status for indicators
    const hasUrgent = dayJobs.some((j) => j.priority === "urgent" || j.priority === "high");
    const hasInProgress = dayJobs.some((j) => j.status === "in-progress");
    const hasAssigned = dayJobs.some((j) => j.status === "assigned");

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={[
          styles.dayCell,
          { width: daySize, height: daySize },
          today && styles.todayCell,
          selected && styles.selectedCell,
        ]}
        onPress={() => setSelectedDate(date)}
      >
        <Text
          style={[
            styles.dayText,
            today && styles.todayText,
            selected && styles.selectedText,
          ]}
        >
          {date.getDate()}
        </Text>
        {hasJobs && (
          <View style={styles.jobIndicators}>
            {hasUrgent && <View style={[styles.jobDot, { backgroundColor: "#DC2626" }]} />}
            {hasInProgress && <View style={[styles.jobDot, { backgroundColor: "#3B82F6" }]} />}
            {hasAssigned && !hasInProgress && <View style={[styles.jobDot, { backgroundColor: "#F59E0B" }]} />}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [daySize, getJobsForDate, selectedDate]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
        <HeaderBar
          title="Schedule"
          subtitle="View your job schedule"
          hasUnreadNotifications={hasUnreadNotifications}
          onNotificationPress={() => router.push(NOTIFICATION_ROUTE as any)}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Month Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{monthStats.total}</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#F59E0B" }]}>{monthStats.scheduled}</Text>
              <Text style={styles.statLabel}>Scheduled</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: "#10B981" }]}>{monthStats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          {/* Calendar */}
          <View style={styles.calendarContainer}>
            {/* Month Navigation */}
            <View style={styles.monthHeader}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth(-1)}
              >
                <Ionicons name="chevron-back" size={24} color="#0F172A" />
              </TouchableOpacity>
              <TouchableOpacity onPress={goToToday}>
                <Text style={styles.monthTitle}>
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => navigateMonth(1)}
              >
                <Ionicons name="chevron-forward" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map((day) => (
                <View key={day} style={[styles.weekdayCell, { width: daySize }]}>
                  <Text style={styles.weekdayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => renderDayCell(date, index))}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#DC2626" }]} />
                <Text style={styles.legendText}>Urgent/High</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
                <Text style={styles.legendText}>In Progress</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.legendText}>Assigned</Text>
              </View>
            </View>
          </View>

          {/* Selected Day Jobs */}
          <View style={styles.selectedDayContainer}>
            <Text style={styles.selectedDayTitle}>
              {selectedDate
                ? selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "Select a day"}
            </Text>

            {selectedDayJobs.length === 0 ? (
              <View style={styles.noJobsContainer}>
                <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
                <Text style={styles.noJobsText}>No jobs scheduled</Text>
                <Text style={styles.noJobsSubtext}>
                  {isToday(selectedDate)
                    ? "You have no jobs today"
                    : "Select a different day to see scheduled jobs"}
                </Text>
              </View>
            ) : (
              <View style={styles.jobsList}>
                {selectedDayJobs.map((job) => (
                  <TouchableOpacity
                    key={job.id}
                    style={styles.jobCard}
                    onPress={() => router.push(`/(employee)/job-details?id=${job.id}`)}
                  >
                    <View style={styles.jobCardHeader}>
                      <View style={styles.jobCardInfo}>
                        <Text style={styles.jobCardTitle} numberOfLines={1}>
                          {job.title}
                        </Text>
                        <Text style={styles.jobCardId}>#{job.id.slice(0, 8)}</Text>
                      </View>
                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: `${getPriorityColor(job.priority)}15` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityText,
                            { color: getPriorityColor(job.priority) },
                          ]}
                        >
                          {job.priority.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.jobCardDetails}>
                      <View style={styles.jobDetailRow}>
                        <Ionicons name="business-outline" size={14} color="#64748B" />
                        <Text style={styles.jobDetailText}>
                          {job.buildingName || "Building"}
                        </Text>
                      </View>
                      {job.unitNumber && (
                        <View style={styles.jobDetailRow}>
                          <Ionicons name="home-outline" size={14} color="#64748B" />
                          <Text style={styles.jobDetailText}>Unit {job.unitNumber}</Text>
                        </View>
                      )}
                      <View style={styles.jobDetailRow}>
                        <Ionicons name="time-outline" size={14} color="#64748B" />
                        <Text style={styles.jobDetailText}>
                          {job.scheduledDate
                            ? new Date(job.scheduledDate).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "Time TBD"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.jobCardFooter}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${getJobStatusColor(job.status)}15` },
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: getJobStatusColor(job.status) },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: getJobStatusColor(job.status) },
                          ]}
                        >
                          {job.status === "in-progress"
                            ? "In Progress"
                            : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Text>
                      </View>
                      {job.estimatedCost && (
                        <Text style={styles.jobCost}>
                          AED {job.estimatedCost.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser?.role}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 4,
  },
  calendarContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekdayCell: {
    alignItems: "center",
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    marginBottom: 4,
  },
  todayCell: {
    backgroundColor: "#D1FAE5",
  },
  selectedCell: {
    backgroundColor: "#10B981",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  todayText: {
    color: "#065F46",
  },
  selectedText: {
    color: "#FFFFFF",
  },
  jobIndicators: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  jobDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  selectedDayContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  selectedDayTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  noJobsContainer: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
  noJobsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 12,
  },
  noJobsSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },
  jobsList: {
    gap: 12,
  },
  jobCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  jobCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  jobCardId: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  jobCardDetails: {
    gap: 6,
    marginBottom: 12,
  },
  jobDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  jobDetailText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  jobCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  jobCost: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
});
