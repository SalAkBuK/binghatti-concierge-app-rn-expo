import React from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SkeletonCard } from "./SkeletonCard";
import { SkeletonText } from "./SkeletonText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function RequestsScreenSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header Skeleton */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <SkeletonText width={40} height={40} borderRadius={20} />
          <SkeletonText width={120} height={24} borderRadius={8} />
          <SkeletonText width={40} height={40} borderRadius={20} />
        </View>

        {/* Stats Cards Skeleton */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <SkeletonCard
              width={(SCREEN_WIDTH * 0.9 - 16) / 2}
              height={132}
              borderRadius={10}
            />
            <SkeletonCard
              width={(SCREEN_WIDTH * 0.9 - 16) / 2}
              height={132}
              borderRadius={10}
            />
          </View>
          <View style={styles.statsRow}>
            <SkeletonCard
              width={(SCREEN_WIDTH * 0.9 - 16) / 2}
              height={132}
              borderRadius={10}
            />
            <SkeletonCard
              width={(SCREEN_WIDTH * 0.9 - 16) / 2}
              height={132}
              borderRadius={10}
            />
          </View>
        </View>

        {/* Past Requests Title Skeleton */}
        <View style={styles.pastRequestsSection}>
          <SkeletonText width={140} height={24} borderRadius={8} />
        </View>

        {/* Request List Items Skeleton */}
        <View style={styles.requestsList}>
          <SkeletonCard
            width="100%"
            height={80}
            borderRadius={16}
            style={styles.requestCard}
          />
          <SkeletonCard
            width="100%"
            height={80}
            borderRadius={16}
            style={styles.requestCard}
          />
          <SkeletonCard
            width="100%"
            height={80}
            borderRadius={16}
            style={styles.requestCard}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 40,
  },
  statsContainer: {
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  pastRequestsSection: {
    marginBottom: 20,
  },
  requestsList: {
    marginBottom: 20,
  },
  requestCard: {
    marginBottom: 8,
  },
});
