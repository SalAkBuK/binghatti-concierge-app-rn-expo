import { Stack, router, usePathname } from "expo-router";
import React, { useEffect, useRef } from "react";
import { BackHandler } from "react-native";

import { AdminTabBar } from "../../components/ui/AdminTabBar";
import { useAuth } from "../../lib/context/auth-context";

export default function AdminLayout() {
  // Use auth context directly instead of useApp() to avoid re-renders from other contexts
  const { isAuthenticated, currentUser } = useAuth();
  const pathname = usePathname();

  // Compute isAdmin
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  // Check if user is super admin (will be redirected to superadmin portal)
  const isSuperAdmin = currentUser?.role === "super_admin";

  // Use refs to prevent navigation loops
  const hasRedirectedToAuth = useRef(false);
  const hasRedirectedToHome = useRef(false);
  const hasRedirectedSuperAdmin = useRef(false);

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

  // Redirect super admins to Super Admin Portal
  useEffect(() => {
    if (isAuthenticated && isSuperAdmin && !hasRedirectedSuperAdmin.current) {
      hasRedirectedSuperAdmin.current = true;
      // Redirect to dedicated super admin portal
      router.replace("/(superadmin)" as any);
    } else if (!isSuperAdmin) {
      hasRedirectedSuperAdmin.current = false;
    }
  }, [isAuthenticated, isSuperAdmin]);

  // Handle Android back button to prevent navigating to tenant portal
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      // If we're on the admin home screen (first visible screen), prevent default back behavior
      if (
        pathname === "/(admin)" ||
        pathname === "/(admin)/index" ||
        pathname === "/(admin)/users" ||
        pathname === "/(admin)/users/index"
      ) {
        console.log("[AdminLayout] Back button pressed on admin home/users screen - preventing default behavior");
        // Prevent going back - admin should use logout to exit
        return true; // Returning true prevents default back behavior
      }
      // For other admin screens, allow normal back navigation within admin portal
      return false;
    });

    return () => backHandler.remove();
  }, [pathname]);

  // Only allow admin and super_admin users
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

  // Hide tab bar on profile screen for focused editing
  const shouldShowTabBar = pathname !== "/(admin)/profile";

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
        <Stack.Screen name="users/index" />
        <Stack.Screen name="buildings/index" />
        <Stack.Screen name="unit-types/index" />
        <Stack.Screen name="more" />

        {/* Additional screens - accessible via navigation but not in tab bar */}
        <Stack.Screen
          name="profile"
          options={{
            gestureEnabled: false, // Disable swipe back gesture
          }}
        />
        <Stack.Screen name="activity" />
        {/* <Stack.Screen name="permissions" /> */}
        <Stack.Screen name="service-providers/index" />
      </Stack>

      {/* Custom tab bar that only shows the 5 main tabs - hidden on profile screen */}
      {shouldShowTabBar && <AdminTabBar />}
    </>
  );
}
