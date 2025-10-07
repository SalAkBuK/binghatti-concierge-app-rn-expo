import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { SkeletonCard } from "./SkeletonCard";
import { SkeletonText } from "./SkeletonText";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function HomeScreenSkeleton() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.fixedContent}>
        {/* Header Skeleton */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <SkeletonText width={40} height={40} borderRadius={20} />
          <SkeletonText width={40} height={40} borderRadius={20} />
        </View>

        {/* Welcome Card Skeleton */}
        <View style={styles.welcomeCardContainer}>
          <SkeletonCard
            width={SCREEN_WIDTH * 0.9}
            height={Math.min(SCREEN_WIDTH * 0.9 * 0.736, SCREEN_HEIGHT * 0.35)}
            borderRadius={10}
          />
        </View>

        {/* Action Buttons Skeleton */}
        <View style={styles.actionButtonsContainer}>
          <SkeletonCard
            width={(SCREEN_WIDTH * 0.9 - 20) / 2}
            height={64}
            borderRadius={10}
          />
          <SkeletonCard
            width={(SCREEN_WIDTH * 0.9 - 20) / 2}
            height={64}
            borderRadius={10}
          />
        </View>
      </View>

      {/* Building Notices Skeleton */}
      <View style={styles.scrollableContent}>
        <View style={styles.buildingNoticesSection}>
          <View style={styles.sectionHeader}>
            <SkeletonText width={32} height={32} borderRadius={16} />
            <SkeletonText
              width={140}
              height={20}
              borderRadius={8}
              style={styles.titleSkeleton}
            />
          </View>
          <SkeletonCard width="100%" height={98} borderRadius={10} />
        </View>

        {/* Recent Activity Skeleton */}
        <View style={styles.recentActivitySection}>
          <SkeletonText
            width={140}
            height={20}
            borderRadius={8}
            style={styles.titleMargin}
          />
          <View style={styles.activityItem}>
            <SkeletonCard width="100%" height={56} borderRadius={8} />
          </View>
          <View style={styles.activityItem}>
            <SkeletonCard width="100%" height={56} borderRadius={8} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  fixedContent: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  scrollableContent: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 15,
  },
  welcomeCardContainer: {
    marginBottom: 30,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 20,
  },
  buildingNoticesSection: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    width: SCREEN_WIDTH * 0.9,
    minHeight: 187,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  titleSkeleton: {
    marginLeft: 4,
  },
  titleMargin: {
    marginBottom: 16,
  },
  recentActivitySection: {
    marginBottom: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    width: SCREEN_WIDTH * 0.9,
    minHeight: 215,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  activityItem: {
    marginBottom: 12,
  },
});
