import { Tabs, router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MessagesTabIcon from "../../components/icons/MessagesTabIcon";
import NewHomeTabIcon from "../../components/icons/NewHomeTabIcon";
import ProfileIcon from "../../components/icons/ProfileIcon";
import RequestsTabIcon from "../../components/icons/RequestsTabIcon";
import TenantTabIcon from "../../components/icons/TenantTabIcon";

import { getResidentWorkspaceAccessLevel } from "../../lib/config/mobile-workspaces";
import { useAuth } from "../../lib/context/auth-context";
import { getFloatingTabBarLayout } from "../../lib/utils/tab-bar-layout";

export default function TabLayout() {
  const { isAuthenticated, currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const hasRedirectedToRole = useRef(false);
  const tabBarLayout = getFloatingTabBarLayout({
    bottomInset: insets.bottom,
    screenWidth: width,
  });
  const residentWorkspaceAccessLevel = getResidentWorkspaceAccessLevel(
    currentUser?.persona,
  );
  const isLimitedResidentShell =
    currentUser?.role === "tenant" && residentWorkspaceAccessLevel !== "active";

  // Redirect non-tenant users to their appropriate portal
  useEffect(() => {
    if (isAuthenticated && currentUser && currentUser.role !== "tenant" && !hasRedirectedToRole.current) {
      hasRedirectedToRole.current = true;
      console.log("[TenantLayout] Non-tenant user detected, redirecting to appropriate portal");
      // Redirect to index which will handle role-based routing
      router.replace("/" as any);
    } else if (!currentUser || currentUser.role === "tenant") {
      hasRedirectedToRole.current = false;
    }
  }, [isAuthenticated, currentUser]);

  // Only render tabs if authenticated and user is tenant
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  // Don't render if user is not a tenant
  if (currentUser.role !== "tenant") {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2B3437",
        tabBarInactiveTintColor: "#8A969B",
        headerShown: false,
        lazy: true,
        freezeOnBlur: true,
        animation: "fade",
        tabBarHideOnKeyboard: true,
        tabBarStyle: tabBarLayout.tabBarStyle,
        tabBarItemStyle: tabBarLayout.tabBarItemStyle,
        tabBarIconStyle: tabBarLayout.tabBarIconStyle,
        tabBarLabelStyle: tabBarLayout.tabBarLabelStyle,
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
          ...(isLimitedResidentShell
            ? { href: null }
            : {
                title: "Requests",
                tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                  <RequestsTabIcon color={color} focused={focused} />
                ),
              }),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          ...(isLimitedResidentShell
            ? { href: null }
            : {
                title: "Messages",
                tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                  <MessagesTabIcon color={color} focused={focused} />
                ),
              }),
        }}
      />
      <Tabs.Screen
        name="visitors"
        options={{
          ...(isLimitedResidentShell
            ? { href: null }
            : {
                title: "Visitors",
                tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                  <TenantTabIcon
                    icon="people-outline"
                    activeIcon="people"
                    color={color}
                    focused={focused}
                  />
                ),
              }),
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
      <Tabs.Screen
        name="new-request"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="lease-details"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
