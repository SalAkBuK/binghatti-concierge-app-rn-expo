import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonCard } from './SkeletonCard';
import { SkeletonText } from './SkeletonText';

const P = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#D9E0E4',
};

export function RequestsScreenSkeleton() {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <SkeletonText width={40} height={40} borderRadius={20} />
          <SkeletonText width={120} height={24} borderRadius={8} />
          <SkeletonText width={40} height={40} borderRadius={20} />
        </View>

        <SkeletonCard width="100%" height={178} borderRadius={28} style={styles.heroCard} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <SkeletonText width={42} height={32} borderRadius={12} />
            <SkeletonText width={78} height={12} borderRadius={8} />
          </View>
          <View style={styles.summaryCard}>
            <SkeletonText width={42} height={32} borderRadius={12} />
            <SkeletonText width={78} height={12} borderRadius={8} />
          </View>
          <View style={styles.summaryCard}>
            <SkeletonText width={42} height={32} borderRadius={12} />
            <SkeletonText width={78} height={12} borderRadius={8} />
          </View>
        </View>

        <View style={styles.spotlightCard}>
          <View style={styles.spotlightTop}>
            <View style={styles.spotlightCopy}>
              <SkeletonText width={88} height={12} borderRadius={8} />
              <SkeletonText width="68%" height={22} borderRadius={10} />
            </View>
            <SkeletonText width={42} height={42} borderRadius={21} />
          </View>
          <SkeletonText width="84%" height={14} borderRadius={8} />
        </View>

        <View style={styles.filterSection}>
          <View style={styles.sectionCopy}>
            <SkeletonText width={132} height={22} borderRadius={10} />
            <SkeletonText width={148} height={12} borderRadius={8} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <SkeletonText width={88} height={42} borderRadius={999} />
            <SkeletonText width={104} height={42} borderRadius={999} />
            <SkeletonText width={118} height={42} borderRadius={999} />
            <SkeletonText width={110} height={42} borderRadius={999} />
          </ScrollView>
        </View>

        <View style={styles.requestsList}>
          <SkeletonCard width="100%" height={188} borderRadius={24} />
          <SkeletonCard width="100%" height={188} borderRadius={24} />
          <SkeletonCard width="100%" height={188} borderRadius={24} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 24,
  },
  heroCard: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minHeight: 102,
    borderRadius: 22,
    padding: 16,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    justifyContent: 'space-between',
  },
  spotlightCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: P.border,
    gap: 12,
  },
  spotlightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  spotlightCopy: {
    flex: 1,
    gap: 8,
  },
  filterSection: {
    marginBottom: 18,
    gap: 14,
  },
  sectionCopy: {
    gap: 8,
  },
  filterRow: {
    paddingRight: 20,
    gap: 10,
  },
  requestsList: {
    gap: 12,
  },
});
