import { Stack, router } from "expo-router";
import React, { useEffect } from "react";

import { ManagementTabBar } from "../../components/ui/ManagementTabBar";
import { useApp } from "../../lib/context/connected-app-provider";

export default function ManagementLayout() {
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
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none", // Disable animation for instant navigation
        }}
      >
        {/* Main tab screens */}
        <Stack.Screen name="index" />
        <Stack.Screen name="requests" />
        <Stack.Screen name="jobs" />
        <Stack.Screen name="tenants" />
        <Stack.Screen name="more" />

        {/* Additional screens - accessible via navigation but not in tab bar */}
        <Stack.Screen name="units" />
        <Stack.Screen name="amenities" />
        <Stack.Screen name="visitors/index" />
        <Stack.Screen name="buildings" />
        <Stack.Screen name="workforce" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="parcels/index" />
        <Stack.Screen name="shifts" />
        <Stack.Screen name="maintenance/index" />
        <Stack.Screen name="billing/index" />
        <Stack.Screen name="managers/index" />
      </Stack>

      {/* Custom tab bar that only shows the 5 main tabs */}
      <ManagementTabBar />
    </>
  );
}
