import { Stack, router, usePathname } from "expo-router";
import React, { useEffect } from "react";
import { BackHandler } from "react-native";

import { ManagementTabBar } from "../../components/ui/ManagementTabBar";
import { useAuth } from "../../lib/context/auth-context";

export default function ManagementLayout() {
  const { isAuthenticated, currentUser } = useAuth();
  const pathname = usePathname();
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

  // Handle Android back button to prevent navigating to other portals
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      // If we're on the management index screen (dashboard), prevent default back behavior
      if (pathname === "/(management)" || pathname === "/(management)/index") {
        console.log("[ManagementLayout] Back button pressed on dashboard - preventing default behavior");
        // Prevent going back - user should use logout to exit
        return true; // Returning true prevents default back behavior
      }
      // For other management screens, allow normal back navigation within management portal
      return false;
    });

    return () => backHandler.remove();
  }, [pathname]);

  // Only allow management users
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (!isManagement) {
    return null;
  }

  // Hide tab bar on profile screen for focused editing
  const shouldShowTabBar = pathname !== "/(management)/profile";

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
        <Stack.Screen name="more" />

        {/* Profile screen for profile editing */}
        <Stack.Screen
          name="profile"
          options={{
            gestureEnabled: false, // Disable swipe back gesture
          }}
        />

        {/* Additional screens - accessible via navigation but not in tab bar */}
        {/* Hidden for now */}
      </Stack>

      {/* Custom tab bar that only shows the 5 main tabs - hidden on profile screen */}
      {shouldShowTabBar && <ManagementTabBar />}
    </>
  );
}
