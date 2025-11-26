import { Tabs, router } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BusinessTabIcon from "../../components/icons/BusinessTabIcon";
import GridTabIcon from "../../components/icons/GridTabIcon";
import LayersTabIcon from "../../components/icons/LayersTabIcon";
import MoreTabIcon from "../../components/icons/MoreTabIcon";
import PeopleTabIcon from "../../components/icons/PeopleTabIcon";
import { useApp } from "../../lib/context/connected-app-provider";

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, currentUser } = useApp();
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "super_admin";

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
            <GridTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />

      {/* Users - Admin only */}
      <Tabs.Screen
        name="users/index"
        options={{
          title: "Users",
          tabBarIcon: ({ color, focused }) => (
            <PeopleTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />

      {/* Buildings - Admin only */}
      <Tabs.Screen
        name="buildings/index"
        options={{
          title: "Buildings",
          tabBarIcon: ({ color, focused }) => (
            <BusinessTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />

      {/* Unit Types - Admin only */}
      <Tabs.Screen
        name="unit-types/index"
        options={{
          title: "Unit Types",
          tabBarIcon: ({ color, focused }) => (
            <LayersTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />

      {/* More - Admin only */}
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <MoreTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />

      {/* Hidden routes - not shown in tab bar (+ prefix tells Expo Router to exclude from tabs) */}
      <Tabs.Screen name="+tenants/index" options={{ href: null }} />
      <Tabs.Screen name="+requests/index" options={{ href: null }} />
      <Tabs.Screen name="+workforce/index" options={{ href: null }} />
      <Tabs.Screen name="+activity" options={{ href: null }} />
      <Tabs.Screen name="+jobs/index" options={{ href: null }} />
      <Tabs.Screen name="+permissions" options={{ href: null }} />
      <Tabs.Screen name="+service-providers/index" options={{ href: null }} />
      <Tabs.Screen name="+billing/index" options={{ href: null }} />
      <Tabs.Screen name="+maintenance/index" options={{ href: null }} />
      <Tabs.Screen name="+broadcast-notifications/index" options={{ href: null }} />
      <Tabs.Screen name="+visitors/index" options={{ href: null }} />
      <Tabs.Screen name="+parcels/index" options={{ href: null }} />
    </Tabs>
  );
}
