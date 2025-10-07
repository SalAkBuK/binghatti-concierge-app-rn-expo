import React, { useMemo, useState } from "react";
import {
  Alert,
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

import { JobCard } from "../../components/admin/JobCard";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { JobStatus } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type FilterType = "all" | JobStatus;

export default function JobsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;
  const isManagement = currentUser?.role === "management";
  const managedBuildingIds = isManagement
    ? actions.getManagedBuildingIds?.() ?? []
    : [];

  const allJobs = actions.getJobs();

  const scopedJobs = useMemo(() => {
    if (!isManagement) return allJobs;
    if (!managedBuildingIds.length) {
      return [];
    }
    return allJobs.filter((job) => managedBuildingIds.includes(job.buildingId));
  }, [allJobs, isManagement, managedBuildingIds]);

  const filteredJobs = useMemo(() => {
    if (filterType === "all") return scopedJobs;
    return scopedJobs.filter((job) => job.status === filterType);
  }, [filterType, scopedJobs]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Assigned", value: "assigned" },
    { label: "In Progress", value: "in-progress" },
    { label: "Completed", value: "completed" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Jobs Management"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        {/* Filter Tabs */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.filtersContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {filterOptions.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  isCompact && styles.filterButtonCompact,
                  filterType === filter.value && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType(filter.value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === filter.value && styles.filterButtonTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Jobs List */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.jobsContainer}
        >
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job, index) => (
              <Animated.View
                key={job.id}
                entering={FadeInDown.delay(150 + index * 50).duration(400)}
              >
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      job.title,
                      `Status: ${job.status}\nRequest: ${job.requestId}\nCost: AED ${job.estimatedCost || "N/A"}`,
                    )
                  }
                  style={styles.jobCardWrapper}
                >
                  <JobCard job={job} />
                </TouchableOpacity>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No jobs found</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
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
  filtersContainer: {
    marginBottom: 20,
  },
  filtersScrollContent: {
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterButtonCompact: {
    paddingHorizontal: 14,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#7034FF",
    borderColor: "#7034FF",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  jobsContainer: {
    paddingBottom: 20,
  },
  jobCardWrapper: {
    marginBottom: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
  },
});
