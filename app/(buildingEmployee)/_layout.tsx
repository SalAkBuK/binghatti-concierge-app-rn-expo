import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React, { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../lib/context/auth-context";

export default function BuildingEmployeeLayout() {
  const { isAuthenticated, currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const isBuildingEmployee = currentUser?.role === "building_employee";
  const hasBottomGestureInset = insets.bottom > 0;
  const tabBarBottomOffset = hasBottomGestureInset ? 14 : 10;
  const tabBarPaddingBottom = hasBottomGestureInset ? 12 : 10;
  const tabBarHeight = 60 + tabBarPaddingBottom;

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
        tabBarStyle: {
          position: "absolute",
          bottom: tabBarBottomOffset,
          left: 16,
          right: 16,
          width: undefined,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          borderRadius: 28,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
          paddingHorizontal: 10,
          minHeight: tabBarHeight,
          height: tabBarHeight,
          shadowColor: "rgba(43, 52, 55, 0.18)",
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 1,
          shadowRadius: 24,
          elevation: 18,
          opacity: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.2,
          marginTop: 0,
        },
        tabBarItemStyle: {
          paddingTop: 0,
        },
        tabBarIconStyle: {
          marginBottom: 7,
        },
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
        name="shifts"
        options={{
          href: null,
          title: "Shifts",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
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
