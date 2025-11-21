import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "../../lib/context/connected-app-provider";

export default function ManagementLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, currentUser } = useApp();
  const isManagement = currentUser?.role === "management";

  // Debug: Log current user role
  console.log("🔍 ManagementLayout - Current User Role:", currentUser?.role);
  console.log("🔍 ManagementLayout - isManagement:", isManagement);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Redirect non-management users back to home
    if (isAuthenticated && currentUser && !isManagement) {
      console.log("🔍 ManagementLayout - Non-management user detected, redirecting to /");
      router.replace("/" as any);
    }
  }, [isAuthenticated, currentUser, isManagement]);

  // Only allow management users
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (!isManagement) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",
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
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Operations",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "clipboard" : "clipboard-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "construct" : "construct-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: "Tenants",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "ellipsis-horizontal-circle" : "ellipsis-horizontal-circle-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      {/* Hidden tabs - accessible via navigation but not shown in tab bar */}
      <Tabs.Screen
        name="units"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="amenities"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="visitors/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="buildings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="workforce"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="parcels/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="maintenance/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="billing/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="managers/index"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
