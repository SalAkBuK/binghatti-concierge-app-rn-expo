import { Stack, router, usePathname } from "expo-router";
import React, { useEffect, useRef } from "react";
import { BackHandler } from "react-native";

import { SuperAdminTabBar } from "../../components/ui/SuperAdminTabBar";
import { useAuth } from "../../lib/context/auth-context";

export default function SuperAdminLayout() {
  // Use auth context directly instead of useApp() to avoid re-renders from other contexts
  const { isAuthenticated, currentUser } = useAuth();
  const pathname = usePathname();

  // Check if user is super admin
  const isSuperAdmin = currentUser?.role === "super_admin";

  // Use refs to prevent navigation loops
  const hasRedirectedToAuth = useRef(false);
  const hasRedirectedToHome = useRef(false);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !hasRedirectedToAuth.current) {
      hasRedirectedToAuth.current = true;
      router.replace("/auth" as any);
    } else if (isAuthenticated) {
      hasRedirectedToAuth.current = false;
    }
  }, [isAuthenticated]);

  // Redirect non-super-admins to their appropriate home
  useEffect(() => {
    if (isAuthenticated && currentUser && !isSuperAdmin && !hasRedirectedToHome.current) {
      hasRedirectedToHome.current = true;
      // Redirect regular admins to admin portal
      if (currentUser.role === "admin") {
        router.replace("/(admin)" as any);
      } else {
        router.replace("/" as any);
      }
    } else if (isSuperAdmin) {
      hasRedirectedToHome.current = false;
    }
  }, [isAuthenticated, currentUser, isSuperAdmin]);

  // Handle Android back button to prevent navigating to other portals
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      // If we're on the super admin index screen (dashboard), prevent default back behavior
      if (pathname === "/(superadmin)" || pathname === "/(superadmin)/index") {
        console.log("[SuperAdminLayout] Back button pressed on dashboard - preventing default behavior");
        // Prevent going back - super admin should use logout to exit
        return true; // Returning true prevents default back behavior
      }
      // For other super admin screens, allow normal back navigation within super admin portal
      return false;
    });

    return () => backHandler.remove();
  }, [pathname]);

  // Only allow super_admin users
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (!isSuperAdmin) {
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
        <Stack.Screen name="admins/index" />
        <Stack.Screen name="buildings/index" />
        <Stack.Screen name="more" />

        {/* Additional screens - accessible via navigation but not in tab bar */}
        <Stack.Screen name="profile" />
        <Stack.Screen name="activity" />
      </Stack>

      {/* Custom tab bar that only shows the 4 main tabs */}
      <SuperAdminTabBar />
    </>
  );
}
