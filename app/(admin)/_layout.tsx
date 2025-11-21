import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "../../lib/context/connected-app-provider";

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, currentUser } = useApp();
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";
  const hiddenTabOptions = {
    href: null as const,
    tabBarItemStyle: { display: "none" as const },
  };

  // Debug: Log current user role
  console.log("🔍 AdminLayout - Current User Role:", currentUser?.role);
  console.log("🔍 AdminLayout - isAdmin:", isAdmin);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Redirect non-admin users back to home
    if (isAuthenticated && currentUser && !isAdmin) {
      console.log("🔍 AdminLayout - Non-admin user detected, redirecting to /");
      router.replace("/" as any);
    }
  }, [isAuthenticated, currentUser, isAdmin]);

  // Only allow admin and super_admin users
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#7034FF",
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
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 0,
        },
      }}
    >
      {/* Dashboard - Admin only */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Users - Admin only */}
      <Tabs.Screen
        name="users/index"
        options={{
          title: "Users",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Buildings - Admin only */}
      <Tabs.Screen
        name="buildings/index"
        options={{
          title: "Buildings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "business" : "business-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Unit Types - Admin only */}
      <Tabs.Screen
        name="unit-types/index"
        options={{
          title: "Unit Types",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "layers" : "layers-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* More - Admin only */}
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? "ellipsis-horizontal-circle"
                  : "ellipsis-horizontal-circle-outline"
              }
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Hidden tabs - These are now in (management) route group */}
      <Tabs.Screen name="tenants/index" options={hiddenTabOptions} />
      <Tabs.Screen name="requests/index" options={hiddenTabOptions} />
      <Tabs.Screen name="workforce/index" options={hiddenTabOptions} />
      <Tabs.Screen name="activity" options={hiddenTabOptions} />

      {/* Hidden from bottom nav - All accessible via More tab */}
      <Tabs.Screen name="jobs/index" options={hiddenTabOptions} />
      <Tabs.Screen name="permissions" options={hiddenTabOptions} />
      <Tabs.Screen name="service-providers/index" options={hiddenTabOptions} />
      <Tabs.Screen name="billing/index" options={hiddenTabOptions} />
      <Tabs.Screen name="maintenance/index" options={hiddenTabOptions} />
      <Tabs.Screen name="broadcast-notifications/index" options={hiddenTabOptions} />
      <Tabs.Screen name="visitors/index" options={hiddenTabOptions} />
      <Tabs.Screen name="parcels/index" options={hiddenTabOptions} />
    </Tabs>
  );
}
