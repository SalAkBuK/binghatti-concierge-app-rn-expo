import { Tabs, router } from "expo-router";
import React, { useEffect, useMemo, useRef } from "react";
import { Platform, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";

import BusinessTabIcon from "../../components/icons/BusinessTabIcon";
import GridTabIcon from "../../components/icons/GridTabIcon";
import LayersTabIcon from "../../components/icons/LayersTabIcon";
import MoreTabIcon from "../../components/icons/MoreTabIcon";
import PeopleTabIcon from "../../components/icons/PeopleTabIcon";
import { useAuth } from "../../lib/context/auth-context";

export default function AdminLayout() {
  // Profiler hooks - track lifecycle and performance

  const insets = useSafeAreaInsets();

  // Use auth context directly instead of useApp() to avoid re-renders from other contexts
  const { isAuthenticated, currentUser } = useAuth();

  // Compute isAdmin once and cache it
  const isAdmin = useMemo(
    () => currentUser?.role === "admin" || currentUser?.role === "super_admin",
    [currentUser?.role]
  );

  // Use refs to prevent navigation loops
  const hasRedirectedToAuth = useRef(false);
  const hasRedirectedToHome = useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !hasRedirectedToAuth.current) {
      hasRedirectedToAuth.current = true;
      router.replace("/auth" as any);
    } else if (isAuthenticated) {
      hasRedirectedToAuth.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && currentUser && !isAdmin && !hasRedirectedToHome.current) {
      hasRedirectedToHome.current = true;
      router.replace("/" as any);
    } else if (isAdmin) {
      hasRedirectedToHome.current = false;
    }
  }, [isAuthenticated, currentUser, isAdmin]);

  // Only allow admin and super_admin users
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  const tabBarStyle: ViewStyle = useMemo(
    () => ({
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
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
    }),
    [insets.bottom],
  );

  const baseScreenOptions = useMemo<BottomTabNavigationOptions>(
    () => ({
      tabBarActiveTintColor: "#7034FF",
      tabBarInactiveTintColor: "#8296C4",
      headerShown: false,
      tabBarStyle,
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0,
      },
    }),
    [tabBarStyle],
  );

  const dashboardOptions = useMemo(
    () => ({
      title: "Dashboard",
      tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
        <GridTabIcon color={color} focused={focused} size={24} />
      ),
    }),
    [],
  );

  const usersOptions = useMemo(
    () => ({
      title: "Users",
      tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
        <PeopleTabIcon color={color} focused={focused} size={24} />
      ),
    }),
    [],
  );

  const buildingsOptions = useMemo(
    () => ({
      title: "Buildings",
      tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
        <BusinessTabIcon color={color} focused={focused} size={24} />
      ),
    }),
    [],
  );

  const unitTypesOptions = useMemo(
    () => ({
      title: "Unit Types",
      tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
        <LayersTabIcon color={color} focused={focused} size={24} />
      ),
    }),
    [],
  );

  const moreOptions = useMemo(
    () => ({
      title: "More",
      tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
        <MoreTabIcon color={color} focused={focused} size={24} />
      ),
    }),
    [],
  );

  return (
    <>
      <Tabs
        screenOptions={baseScreenOptions}
      >
        {/* Dashboard - Admin only */}
        <Tabs.Screen
        name="index"
        options={dashboardOptions}
      />

      {/* Users - Admin only */}
      <Tabs.Screen
        name="users/index"
        options={usersOptions}
      />

      {/* Buildings - Admin only */}
      <Tabs.Screen
        name="buildings/index"
        options={buildingsOptions}
      />

      {/* Unit Types - Admin only */}
      <Tabs.Screen
        name="unit-types/index"
        options={unitTypesOptions}
      />

      {/* More - Admin only */}
      <Tabs.Screen
        name="more"
        options={moreOptions}
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
    </>
  );
}