import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonCard } from './SkeletonCard';
import { SkeletonText } from './SkeletonText';

const P = {
  bg: '#F8F9FA',
};

export function HomeScreenSkeleton() {
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
          <SkeletonText width={40} height={40} borderRadius={20} />
        </View>

        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <SkeletonText width={92} height={12} borderRadius={999} />
            <SkeletonText width="76%" height={34} borderRadius={14} />
            <SkeletonText width="62%" height={34} borderRadius={14} />
            <SkeletonText width="88%" height={14} borderRadius={8} />
            <SkeletonText width="68%" height={14} borderRadius={8} />
          </View>
          <SkeletonCard width={58} height={58} borderRadius={20} />
        </View>

        <View style={styles.profileStrip}>
          <SkeletonText width={164} height={40} borderRadius={999} />
          <SkeletonText width={122} height={40} borderRadius={999} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionCopy}>
              <SkeletonText width={110} height={22} borderRadius={10} />
              <SkeletonText width={168} height={12} borderRadius={8} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            <SkeletonCard width={284} height={206} borderRadius={28} />
            <SkeletonCard width={284} height={206} borderRadius={28} />
            <SkeletonCard width={284} height={206} borderRadius={28} />
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionCopy}>
              <SkeletonText width={164} height={22} borderRadius={10} />
              <SkeletonText width={190} height={12} borderRadius={8} />
            </View>
            <SkeletonText width={56} height={14} borderRadius={8} />
          </View>

          <View style={styles.stack}>
            <SkeletonCard width="100%" height={110} borderRadius={24} />
            <SkeletonCard width="100%" height={110} borderRadius={24} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionCopy}>
              <SkeletonText width={182} height={22} borderRadius={10} />
              <SkeletonText width={208} height={12} borderRadius={8} />
            </View>
            <SkeletonText width={44} height={14} borderRadius={8} />
          </View>

          <View style={styles.stack}>
            <SkeletonCard width="100%" height={232} borderRadius={24} />
            <SkeletonCard width="100%" height={232} borderRadius={24} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionCopy}>
              <SkeletonText width={126} height={22} borderRadius={10} />
              <SkeletonText width={176} height={12} borderRadius={8} />
            </View>
          </View>

          <View style={styles.quickGrid}>
            <SkeletonCard width="47%" height={108} borderRadius={22} />
            <SkeletonCard width="47%" height={108} borderRadius={22} />
            <SkeletonCard width="47%" height={108} borderRadius={22} />
            <SkeletonCard width="47%" height={108} borderRadius={22} />
          </View>
        </View>

        <SkeletonCard width="100%" height={92} borderRadius={24} style={styles.footerCard} />
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
    paddingBottom: 26,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  heroCopy: {
    flex: 1,
    gap: 8,
    paddingTop: 4,
  },
  profileStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sectionCopy: {
    gap: 8,
  },
  rail: {
    paddingRight: 20,
    gap: 14,
  },
  stack: {
    gap: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerCard: {
    marginTop: 4,
  },
});
