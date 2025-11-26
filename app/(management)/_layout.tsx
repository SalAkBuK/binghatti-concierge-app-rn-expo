import { Tabs, router } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ClipboardTabIcon from "../../components/icons/ClipboardTabIcon";
import ConstructTabIcon from "../../components/icons/ConstructTabIcon";
import GridTabIcon from "../../components/icons/GridTabIcon";
import MoreTabIcon from "../../components/icons/MoreTabIcon";
import PeopleTabIcon from "../../components/icons/PeopleTabIcon";
import { useApp } from "../../lib/context/connected-app-provider";

export default function ManagementLayout() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, currentUser } = useApp();
  const isManagement = currentUser?.role === "management";

  // Debug: Log current user role
  console.log("ManagementLayout - Current User Role:", currentUser?.role);
  console.log("ManagementLayout - isManagement:", isManagement);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Redirect non-management users back to home
    if (isAuthenticated && currentUser && !isManagement) {
      console.log("ManagementLayout - Non-management user detected, redirecting to /");
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
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
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
            <GridTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ color, focused }) => (
            <ClipboardTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: ({ color, focused }) => (
            <ConstructTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: "Tenants",
          tabBarIcon: ({ color, focused }) => (
            <PeopleTabIcon color={color} focused={focused} size={24} />
          ),
        }}
      />
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
      <Tabs.Screen name="+units" options={{ href: null }} />
      <Tabs.Screen name="+amenities" options={{ href: null }} />
      <Tabs.Screen name="+visitors/index" options={{ href: null }} />
      <Tabs.Screen name="+buildings" options={{ href: null }} />
      <Tabs.Screen name="+workforce" options={{ href: null }} />
      <Tabs.Screen name="+activity" options={{ href: null }} />
      <Tabs.Screen name="+parcels/index" options={{ href: null }} />
      <Tabs.Screen name="+shifts" options={{ href: null }} />
      <Tabs.Screen name="+maintenance/index" options={{ href: null }} />
      <Tabs.Screen name="+billing/index" options={{ href: null }} />
      <Tabs.Screen name="+managers/index" options={{ href: null }} />
    </Tabs>
  );
}
