import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import type { Job } from "../../../lib/types";

import { FilterTabs } from "./_components/FilterTabs";
import { JobDetailsModal } from "./_components/JobDetailsModal";
import { JobsList } from "./_components/JobsList";
import { ADMIN_NOTIFICATION_ROUTE } from "./_constants";
import { useJobsData } from "./_hooks/useJobsData";
import { styles } from "./_styles";
import type { FilterType } from "./_types";

export default function JobsScreen() {
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { scopedJobs, hasUnreadNotifications } = useJobsData();

  const filteredJobs = useMemo(() => {
    if (filterType === "all") return scopedJobs;
    return scopedJobs.filter((job) => job.status === filterType);
  }, [filterType, scopedJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Jobs Management"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.filtersContainer}
        >
          <FilterTabs filterType={filterType} setFilterType={setFilterType} isCompact={isCompact} />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.jobsContainer}
        >
          <JobsList jobs={filteredJobs} onSelect={setSelectedJob} />
        </Animated.View>
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

      <JobDetailsModal job={selectedJob} pagePadding={pagePadding} onClose={() => setSelectedJob(null)} />
    </SafeAreaView>
  );
}
