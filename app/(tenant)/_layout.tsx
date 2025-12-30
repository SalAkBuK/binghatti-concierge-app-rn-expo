import { Tabs, router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NewHomeTabIcon from "../../components/icons/NewHomeTabIcon";
import NewTabIcon from "../../components/icons/NewTabIcon";
import ProfileIcon from "../../components/icons/ProfileIcon";
import RequestsTabIcon from "../../components/icons/RequestsTabIcon";

import { useApp } from "../../lib/context/connected-app-provider";

export default function TabLayout() {
  const { isAuthenticated, currentUser } = useApp();
  const insets = useSafeAreaInsets();
  const hasRedirectedToRole = useRef(false);

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
        tabBarActiveTintColor: "#336BE3",
        tabBarInactiveTintColor: "#8296C4",
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 12,
          height: 74 + Math.max(insets.bottom, 8),
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
