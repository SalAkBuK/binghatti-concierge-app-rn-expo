import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { TrendDelta } from "./TrendDelta";

interface MiniTrendCardProps {
  title: string;
  subtitle?: string;
  data: number[];
  insight?: string;
  delta?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  color?: string;
}

export const MiniTrendCard: React.FC<MiniTrendCardProps> = ({
  title,
  subtitle,
  data,
  insight,
  delta,
  color = "#3B82F6",
}) => {
  const maxValue = Math.max(...data, 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {delta ? (
          <TrendDelta
            value={delta.value}
            isPositive={delta.isPositive}
            label={delta.label}
          />
        ) : null}
      </View>

      <View style={styles.chartContainer}>
        {data.map((value, index) => {
          const height = Math.max((value / maxValue) * 100, 10);
          return (
            <View key={index} style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  { height: `${height}%`, backgroundColor: color },
                ]}
              />
            </View>
          );
        })}
      </View>

      {insight ? <Text style={styles.insight}>{insight}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 220,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 80,
    marginBottom: 16,
  },
  barWrapper: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    justifyContent: "flex-end",
  },
  bar: {
    borderRadius: 6,
  },
  insight: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
  },
});
