import { Tabs, router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MessagesTabIcon from "../../components/icons/MessagesTabIcon";
import NewHomeTabIcon from "../../components/icons/NewHomeTabIcon";
import ProfileIcon from "../../components/icons/ProfileIcon";
import RequestsTabIcon from "../../components/icons/RequestsTabIcon";
import TenantTabIcon from "../../components/icons/TenantTabIcon";

import { useAuth } from "../../lib/context/auth-context";

export default function TabLayout() {
  const { isAuthenticated, currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const hasRedirectedToRole = useRef(false);
  const hasBottomGestureInset = insets.bottom > 0;
  const tabBarBottomOffset = hasBottomGestureInset ? 14 : 10;
  const tabBarPaddingBottom = hasBottomGestureInset ? 12 : 10;
  const tabBarHeight = 60 + tabBarPaddingBottom;

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
        tabBarStyle: {
          position: "absolute",
          bottom: tabBarBottomOffset,
          left: 16,
          right: 16,
          width: undefined,
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          borderRadius: 28,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
          paddingHorizontal: 10,
          minHeight: tabBarHeight,
          height: tabBarHeight,
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
          paddingTop: 0,
        },
        tabBarIconStyle: {
          marginBottom: 7,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 0.2,
          marginTop: 0,
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
        name="visitors"
        options={{
          title: "Visitors",
          tabBarIcon: ({ color, focused }) => (
            <TenantTabIcon
              icon="people-outline"
              activeIcon="people"
              color={color}
              focused={focused}
            />
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
