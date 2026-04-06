import { Tabs, router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MessagesTabIcon from "../../components/icons/MessagesTabIcon";
import NewHomeTabIcon from "../../components/icons/NewHomeTabIcon";
import ProfileIcon from "../../components/icons/ProfileIcon";
import RequestsTabIcon from "../../components/icons/RequestsTabIcon";

import { useAuth } from "../../lib/context/auth-context";

export default function TabLayout() {
  const { isAuthenticated, currentUser } = useAuth();
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
        tabBarActiveTintColor: "#2B3437",
        tabBarInactiveTintColor: "#8A969B",
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          bottom: Math.max(insets.bottom, 10),
          left: 16,
          right: 16,
          width: undefined,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          borderRadius: 28,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingTop: 10,
          paddingHorizontal: 10,
          height: 78 + Math.max(insets.bottom, 12),
          shadowColor: "rgba(43, 52, 55, 0.18)",
          shadowOffset: {
            width: 0,
            height: -6,
          },
          shadowOpacity: 1,
          shadowRadius: 24,
          elevation: 18,
          opacity: 1,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.2,
          marginTop: 2,
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
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <MessagesTabIcon color={color} focused={focused} />
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
