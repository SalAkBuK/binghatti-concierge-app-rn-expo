import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import NewHomeTabIcon from "../../components/icons/NewHomeTabIcon";
import NewTabIcon from "../../components/icons/NewTabIcon";
import ProfileIcon from "../../components/icons/ProfileIcon";
import RequestsTabIcon from "../../components/icons/RequestsTabIcon";

import { useApp } from "../../lib/context/connected-app-provider";
// Role normalization helper
const normalizeRole = (r: string) => {
  if (!r) return "tenant";
  const s = String(r).trim().toLowerCase().replace(/\s+/g, "_");
  if (["administrator", "admin_user", "sysadmin"].includes(s)) return "admin";
  if (["service-provider", "serviceprovider"].includes(s))
    return "service_provider";
  return s;
};

export default function TabLayout() {
  const { userRole, isAuthenticated } = useApp();
  const insets = useSafeAreaInsets();

  const role = normalizeRole(userRole || "tenant");

  // Only render tabs if authenticated
  if (!isAuthenticated) {
    return null; // Or a loading component
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#336BE3",
        tabBarInactiveTintColor: "#8296C4",
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          paddingBottom: Platform.OS === "ios" ? insets.bottom : 8,
          paddingTop: 12,
          height: 74 + (Platform.OS === "ios" ? insets.bottom : 8),
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
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: "700",
          letterSpacing: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <NewHomeTabIcon color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, focused }) => (
            <RequestsTabIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="new-request"
        options={{
          title: "New",
          tabBarIcon: ({ color, focused }) => (
            <NewTabIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <ProfileIcon color={color} focused={focused} />
          ),
        }}
      />

      {/* Hide these screens from tab bar - accessible only via side menu */}
      <Tabs.Screen
        name="amenities"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-bookings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-ratings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
