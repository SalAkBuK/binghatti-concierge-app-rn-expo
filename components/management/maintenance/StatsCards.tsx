import React from "react";
import { Text, View } from "react-native";

import type { MaintenanceSummary } from "./_types";
import { styles } from "./_styles";

interface StatsCardsProps {
  summary: MaintenanceSummary;
}

export function StatsCards({ summary }: StatsCardsProps) {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{summary.upcoming}</Text>
        <Text style={styles.statLabel}>Upcoming</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{summary.completed}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>{summary.inProgress}</Text>
        <Text style={styles.statLabel}>In Progress</Text>
      </View>
    </View>
  );
}
