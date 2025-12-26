import { router, usePathname } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BusinessTabIcon from "../icons/BusinessTabIcon";
import LayersTabIcon from "../icons/LayersTabIcon";
import MoreTabIcon from "../icons/MoreTabIcon";
import GridTabIcon from "../icons/GridTabIcon";
import PeopleTabIcon from "../icons/PeopleTabIcon";

interface TabItem {
  name: string;
  label: string;
  icon: React.ComponentType<{ color: string; focused: boolean; size: number }>;
  route: string;
}

const TABS: TabItem[] = [
  {
    name: "home",
    label: "Dashboard",
    icon: GridTabIcon,
    route: "/(admin)",
  },
  {
    name: "users",
    label: "Users",
    icon: PeopleTabIcon,
    route: "/(admin)/users",
  },
  {
    name: "buildings",
    label: "Buildings",
    icon: BusinessTabIcon,
    route: "/(admin)/buildings",
  },
  {
    name: "unit-types",
    label: "Unit Types",
    icon: LayersTabIcon,
    route: "/(admin)/unit-types",
  },
  {
    name: "more",
    label: "More",
    icon: MoreTabIcon,
    route: "/(admin)/more",
  },
];

export function AdminTabBar() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const handleTabPress = (route: string) => {
    router.push(route as any);
  };

  const normalizePath = (value: string) =>
    value
      .replace(/\([^)]+\)/g, "") // Remove route groups like (admin)
      .replace(/\/+/g, "/") // Clean up double slashes: // → /
      .replace(/\/index$/, "") // Remove trailing /index
      .replace(/\/$/, "") || "/";

  const isTabActive = (tab: TabItem) => {
    const normalizedPathname = normalizePath(pathname);
    const normalizedRoute = normalizePath(tab.route);

    // Home/dashboard tab: only active on root admin screens
    if (tab.name === "home") {
      return (
        normalizedPathname === normalizedRoute ||
        normalizedPathname === "/" // handle normalized root
      );
    }

    // Check if current path matches the tab route (support both formats and /index suffix)
    return (
      pathname.startsWith(tab.route) ||
      pathname === `${tab.route}/index` ||
      normalizedPathname === normalizedRoute ||
      normalizedPathname.startsWith(normalizedRoute)
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          height: 74 + Math.max(insets.bottom, 8),
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = isTabActive(tab);
        const IconComponent = tab.icon;
        const color = isActive ? "#7034FF" : "#8296C4";

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab.route)}
            activeOpacity={0.7}
          >
            <IconComponent color={color} focused={isActive} size={24} />
            <Text
              style={[
                styles.label,
                { color },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    borderTopWidth: 0,
    paddingTop: 12,
    shadowColor: "#9CAFD9",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.102,
    shadowRadius: 20,
    elevation: 20,
    opacity: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
