import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

interface TenantTabIconProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  activeIcon?: React.ComponentProps<typeof Ionicons>["name"];
  color?: string;
  focused?: boolean;
  accent?: boolean;
}

export default function TenantTabIcon({
  icon,
  activeIcon,
  color = "#8A969B",
  focused = false,
  accent = false,
}: TenantTabIconProps) {
  const iconName = focused && activeIcon ? activeIcon : icon;
  const iconColor = focused ? "#F8F9FA" : accent ? "#4D6169" : color;

  return (
    <View
      style={[
        styles.shell,
        accent && styles.shellAccent,
        focused && styles.shellFocused,
      ]}
    >
      <Ionicons name={iconName} size={20} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  shellAccent: {
    backgroundColor: "#EEF3F6",
  },
  shellFocused: {
    backgroundColor: "#2B3437",
  },
});
