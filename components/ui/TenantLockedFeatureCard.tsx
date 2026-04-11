import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const P = {
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  accent: "#F8EFE4",
  accentBorder: "#EFD8BB",
  accentText: "#7A5A2B",
  shadow: "rgba(43, 52, 55, 0.08)",
};

type TenantLockedFeatureCardProps = {
  actionLabel?: string;
  message: string;
  onPress: () => void;
  title: string;
};

export function TenantLockedFeatureCard({
  actionLabel = "Open Lease Details",
  message,
  onPress,
  title,
}: TenantLockedFeatureCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Ionicons name="lock-closed-outline" size={14} color={P.accentText} />
        <Text style={styles.badgeText}>Available after move-in</Text>
      </View>

      <View style={styles.iconWrap}>
        <Ionicons name="home-outline" size={24} color={P.primary} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity style={styles.action} activeOpacity={0.9} onPress={onPress}>
        <Text style={styles.actionText}>{actionLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color={P.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: P.surface,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: P.accent,
    borderWidth: 1,
    borderColor: P.accentBorder,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.accentText,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: P.text,
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
  },
  action: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: P.primary,
  },
});
