import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React, { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../lib/context/auth-context";
import { getFloatingTabBarLayout } from "../../lib/utils/tab-bar-layout";

export default function BuildingEmployeeLayout() {
  const { isAuthenticated, currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isBuildingEmployee = currentUser?.role === "building_employee";
  const tabBarLayout = getFloatingTabBarLayout({
    bottomInset: insets.bottom,
    screenWidth: width,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && currentUser && !isBuildingEmployee) {
      router.replace("/" as any);
    }
  }, [currentUser, isAuthenticated, isBuildingEmployee]);

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (!isBuildingEmployee) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2B3437",
        tabBarInactiveTintColor: "#8A969B",
        lazy: true,
        freezeOnBlur: true,
        animation: "fade",
        tabBarHideOnKeyboard: true,
        tabBarStyle: tabBarLayout.tabBarStyle,
        tabBarLabelStyle: tabBarLayout.tabBarLabelStyle,
        tabBarItemStyle: tabBarLayout.tabBarItemStyle,
        tabBarIconStyle: tabBarLayout.tabBarIconStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "speedometer" : "speedometer-outline"}
              size={22}
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
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="amenities"
        options={{
          href: null,
          title: "Amenities",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "fitness" : "fitness-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
