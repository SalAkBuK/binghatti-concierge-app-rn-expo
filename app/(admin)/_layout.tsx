import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "../../lib/context/connected-app-provider";

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useApp();
  const isManagement = currentUser?.role === "management";

  // Debug: Log current user role
  console.log("🔍 AdminLayout - Current User Role:", currentUser?.role);
  console.log("🔍 AdminLayout - isManagement:", isManagement);

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
      {/* Dashboard/Operations - Always visible */}
      <Tabs.Screen
        name="index"
        options={{
          title: isManagement ? "Operations" : "Dashboard",
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
        name="users"
        options={
          isManagement
            ? { href: null }
            : {
                title: "Users",
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={focused ? "people" : "people-outline"}
                    size={24}
                    color={color}
                  />
                ),
              }
        }
      />

      {/* Buildings - Admin only */}
      <Tabs.Screen
        name="buildings"
        options={
          isManagement
            ? { href: null }
            : {
                title: "Buildings",
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={focused ? "business" : "business-outline"}
                    size={24}
                    color={color}
                  />
                ),
              }
        }
      />

      {/* Unit Types - Admin only */}
      <Tabs.Screen
        name="unit-types"
        options={
          isManagement
            ? { href: null }
            : {
                title: "Unit Types",
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={focused ? "layers" : "layers-outline"}
                    size={24}
                    color={color}
                  />
                ),
              }
        }
      />

      {/* More - Admin only */}
      <Tabs.Screen
        name="more"
        options={
          isManagement
            ? { href: null }
            : {
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
              }
        }
      />

      {/* Tenants - Management only */}
      <Tabs.Screen
        name="tenants"
        options={
          isManagement
            ? {
                title: "Tenants",
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={focused ? "people" : "people-outline"}
                    size={24}
                    color={color}
                  />
                ),
              }
            : { href: null }
        }
      />

      {/* Requests - Management only (Admin accesses via More) */}
      <Tabs.Screen
        name="requests"
        options={
          isManagement
            ? {
                title: "Requests",
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={focused ? "clipboard" : "clipboard-outline"}
                    size={24}
                    color={color}
                  />
                ),
              }
            : { href: null }
        }
      />

      {/* Workforce - Management only */}
      <Tabs.Screen
        name="workforce"
        options={
          isManagement
            ? {
                title: "Workforce",
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={focused ? "briefcase" : "briefcase-outline"}
                    size={24}
                    color={color}
                  />
                ),
              }
            : { href: null }
        }
      />

      {/* Activity - Management only */}
      <Tabs.Screen
        name="activity"
        options={
          isManagement
            ? {
                title: "Activity",
                tabBarIcon: ({ color, focused }) => (
                  <Ionicons
                    name={focused ? "notifications" : "notifications-outline"}
                    size={24}
                    color={color}
                  />
                ),
              }
            : { href: null }
        }
      />

      {/* Jobs - Hidden from bottom nav (Admin accesses via More) */}
      <Tabs.Screen name="jobs" options={{ href: null }} />

      {/* Permissions - Hidden from bottom nav (Admin accesses via More) */}
      <Tabs.Screen name="permissions" options={{ href: null }} />
    </Tabs>
  );
}
