import { router, usePathname } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BusinessTabIcon from "../icons/BusinessTabIcon";
import GridTabIcon from "../icons/GridTabIcon";
import LayersTabIcon from "../icons/LayersTabIcon";
import MoreTabIcon from "../icons/MoreTabIcon";
import PeopleTabIcon from "../icons/PeopleTabIcon";

interface TabItem {
  name: string;
  label: string;
  icon: React.ComponentType<{ color: string; focused: boolean; size: number }>;
  route: string;
}

const TABS: TabItem[] = [
  {
    name: "index",
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

  const isTabActive = (tabName: string, route: string) => {
    // Normalize pathname and route by removing route group parentheses
    const normalizedPathname = pathname.replace(/\([^)]+\)/g, "");
    const normalizedRoute = route.replace(/\([^)]+\)/g, "");

    // Exact match for index route
    if (tabName === "index") {
      return (
        pathname === "/(admin)" ||
        pathname === "/(admin)/" ||
        pathname === "/" ||
        normalizedPathname === "/" ||
        normalizedPathname === ""
      );
    }

    // Check if current path matches the tab route (support both formats)
    return pathname.startsWith(route) || normalizedPathname.startsWith(normalizedRoute);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Platform.OS === "ios" ? insets.bottom : 8,
          height: 74 + (Platform.OS === "ios" ? insets.bottom : 8),
        },
      ]}
    >
      {TABS.map((tab) => {
        const isActive = isTabActive(tab.name, tab.route);
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
