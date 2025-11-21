import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Job } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type ViewMode = "month" | "week" | "day";

export default function ScheduleScreen() {
  const { currentUser, notifications, jobs } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Filter jobs for current service provider
  const myJobs = useMemo(() => {
    return jobs?.filter((job) => job.assignedTo === currentUser?.id) || [];
  }, [jobs, currentUser]);

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay(); // 0 = Sunday

    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(new Date(0)); // Placeholder
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(new Date(year, month, day));
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add remaining days to complete the last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(new Date(0)); // Placeholder
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [selectedDate]);

  // Get jobs for a specific date
  const getJobsForDate = (date: Date): Job[] => {
    if (date.getTime() === 0) return [];
    return myJobs.filter((job) => {
      if (!job.scheduledDate) return false;
      const jobDate = new Date(job.scheduledDate);
      return (
        jobDate.getDate() === date.getDate() &&
        jobDate.getMonth() === date.getMonth() &&
        jobDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Get jobs for selected date
  const selectedDateJobs = useMemo(() => {
    return getJobsForDate(selectedDate);
  }, [selectedDate, myJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date): boolean => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getStatusColor = (status: Job["status"]) => {
    switch (status) {
      case "pending": return "#F59E0B";
      case "assigned": return "#3B82F6";
      case "in-progress": return "#8B5CF6";
      case "completed": return "#10B981";
      case "cancelled": return "#EF4444";
      default: return "#94A3B8";
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
        <HeaderBar
          title="Schedule"
        subtitle="Your job calendar"
        hasUnreadNotifications={hasUnreadNotifications}
        onNotificationPress={() => router.push(NOTIFICATION_ROUTE as any)}
        showSideMenu={showSideMenu}
        onSideMenuToggle={setShowSideMenu}
      />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Calendar Header */}
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.calendarHeader}
          >
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth("prev")}
            >
              <Ionicons name="chevron-back" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.monthYear}>{formatMonthYear(selectedDate)}</Text>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth("next")}
            >
              <Ionicons name="chevron-forward" size={24} color="#1E293B" />
            </TouchableOpacity>
          </Animated.View>

          {/* Calendar Grid */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={styles.calendarCard}
          >
            {/* Week days header */}
            <View style={styles.weekDaysRow}>
              {weekDays.map((day) => (
                <View key={day} style={styles.weekDayCell}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar dates */}
            {calendarData.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.calendarWeek}>
                {week.map((date, dayIndex) => {
                  const isPlaceholder = date.getTime() === 0;
                  const jobsCount = isPlaceholder ? 0 : getJobsForDate(date).length;
                  const hasJobs = jobsCount > 0;
                  const isTodayDate = !isPlaceholder && isToday(date);
                  const isSelectedDate = !isPlaceholder && isSelected(date);

                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={[
                        styles.calendarDay,
                        isPlaceholder && styles.calendarDayPlaceholder,
                        isTodayDate && styles.calendarDayToday,
                        isSelectedDate && styles.calendarDaySelected,
                      ]}
                      onPress={() => !isPlaceholder && setSelectedDate(date)}
                      disabled={isPlaceholder}
                    >
                      {!isPlaceholder && (
                        <>
                          <Text
                            style={[
                              styles.calendarDayText,
                              isTodayDate && styles.calendarDayTextToday,
                              isSelectedDate && styles.calendarDayTextSelected,
                            ]}
                          >
                            {date.getDate()}
                          </Text>
                          {hasJobs && (
                            <View style={styles.jobIndicator}>
                              <Text style={styles.jobIndicatorText}>
                                {jobsCount}
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </Animated.View>

          {/* Selected Date Jobs */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
            style={styles.jobsSection}
          >
            <Text style={styles.jobsSectionTitle}>
              {selectedDate.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
            <Text style={styles.jobsSectionSubtitle}>
              {selectedDateJobs.length} {selectedDateJobs.length === 1 ? "job" : "jobs"} scheduled
            </Text>

            {selectedDateJobs.length > 0 ? (
              <View style={styles.jobsList}>
                {selectedDateJobs.map((job, index) => (
                  <TouchableOpacity
                    key={job.id}
                    style={styles.jobCard}
                    onPress={() =>
                      router.push(`/(serviceProvider)/job-details?id=${job.id}` as any)
                    }
                  >
                    <View
                      style={[
                        styles.jobStatusIndicator,
                        { backgroundColor: getStatusColor(job.status) },
                      ]}
                    />
                    <View style={styles.jobCardContent}>
                      <View style={styles.jobCardHeader}>
                        <Text style={styles.jobTitle}>{job.title}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: `${getStatusColor(job.status)}15` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: getStatusColor(job.status) },
                            ]}
                          >
                            {job.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.jobMeta}>
                        <View style={styles.jobMetaItem}>
                          <Ionicons
                            name="business-outline"
                            size={14}
                            color="#64748B"
                          />
                          <Text style={styles.jobMetaText}>
                            {job.buildingName || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.jobMetaItem}>
                          <Ionicons name="time-outline" size={14} color="#64748B" />
                          <Text style={styles.jobMetaText}>
                            {job.scheduledDate
                              ? new Date(job.scheduledDate).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })
                              : "ASAP"}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyStateText}>No jobs scheduled for this date</Text>
              </View>
            )}
          </Animated.View>

          <View style={{ height: 20 }} />
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
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weekDaysRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  calendarWeek: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    position: "relative",
  },
  calendarDayPlaceholder: {
    backgroundColor: "transparent",
  },
  calendarDayToday: {
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
    borderColor: "#3B82F6",
  },
  calendarDaySelected: {
    backgroundColor: "#3B82F6",
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  calendarDayTextToday: {
    color: "#3B82F6",
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
  },
  jobIndicator: {
    position: "absolute",
    bottom: 4,
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  jobIndicatorText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  jobsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  jobsSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  jobsSectionSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 16,
  },
  jobsList: {
    gap: 12,
  },
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  jobStatusIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  jobCardContent: {
    flex: 1,
  },
  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  jobMeta: {
    flexDirection: "row",
    gap: 16,
  },
  jobMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  jobMetaText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
    marginTop: 12,
  },
});
