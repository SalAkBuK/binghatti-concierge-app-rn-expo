import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface TrendDeltaProps {
  value: number;
  isPositive: boolean;
  label?: string;
}

export const TrendDelta: React.FC<TrendDeltaProps> = ({
  value,
  isPositive,
  label,
}) => {
  const iconName = isPositive ? "trending-up" : "trending-down";
  const color = isPositive ? "#059669" : "#DC2626";

  return (
    <View style={styles.container}>
      <Ionicons name={iconName} size={12} color={color} />
      <Text style={[styles.valueText, { color }]}>
        {isPositive ? "+" : "-"}
        {Math.abs(value)}%
      </Text>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  valueText: {
    fontSize: 11,
    fontWeight: "600",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
});
