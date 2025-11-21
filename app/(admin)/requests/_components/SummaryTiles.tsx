import React from "react";
import { Text, View } from "react-native";

import type { RequestSummary } from "../_types";
import { styles } from "../_styles";

interface SummaryTilesProps {
  summary: RequestSummary;
  isCompact: boolean;
}

export function SummaryTiles({ summary, isCompact }: SummaryTilesProps) {
  return (
    <View style={[styles.summaryRow, isCompact && styles.summaryRowCompact]}>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryTileLabel}>Total Requests</Text>
        <Text style={styles.summaryTileValue}>{summary.total}</Text>
        <Text style={styles.summaryTileMeta}>In selected scope</Text>
      </View>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryTileLabel}>Open</Text>
        <Text style={styles.summaryTileValue}>{summary.open}</Text>
        <Text style={styles.summaryTileMeta}>Pending or in-progress</Text>
      </View>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryTileLabel}>Resolved</Text>
        <Text style={styles.summaryTileValue}>{summary.resolved}</Text>
        <Text style={styles.summaryTileMeta}>Marked completed</Text>
      </View>
      <View style={styles.summaryTile}>
        <Text style={styles.summaryTileLabel}>Unassigned</Text>
        <Text style={styles.summaryTileValue}>{summary.unassigned}</Text>
        <Text style={styles.summaryTileMeta}>Need provider</Text>
      </View>
    </View>
  );
}
