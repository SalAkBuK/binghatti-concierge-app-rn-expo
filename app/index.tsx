import { Redirect, type Href } from "expo-router";
import React, { useEffect, useState } from "react";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useApp } from "../lib/context/connected-app-provider";

export default function IndexScreen() {
  const { isAuthenticated, currentUser } = useApp();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const managementHomeHref = "/(management)" as Href;
  const tenantHomeHref = "/(tenant)" as Href;
  const buildingEmployeeHomeHref = "/(buildingEmployee)" as Href;

  // Initial load timer
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log("[Index] Initial load complete");
      setInitialLoadComplete(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Log whenever auth state changes
  useEffect(() => {
    console.log("[Index] Component rendered - Auth state:", {
      isAuthenticated,
      role: currentUser?.role,
      userEmail: currentUser?.email
    });
  }, [isAuthenticated, currentUser]);

  // Show loading during initial load
  if (!initialLoadComplete) {
    return <LoadingScreen message="Loading..." useLottie={false} />;
  }

  // Not authenticated - redirect to auth
  if (!isAuthenticated || !currentUser) {
    console.log("[Index] Not authenticated, redirecting to /auth");
    return <Redirect href="/auth" />;
  }

  if (currentUser.mustChangePassword) {
    console.log("[Index] Password change required, redirecting to /change-password");
    return <Redirect href="/change-password" />;
  }

  // Authenticated - redirect based on role
  if (currentUser.role === "management") {
    console.log("[Index] Management user, redirecting to /(management)");
    return <Redirect href={managementHomeHref} />;
  }

  if (currentUser.role === "building_employee") {
    console.log("[Index] Building employee user, redirecting to /(buildingEmployee)");
    return <Redirect href={buildingEmployeeHomeHref} />;
  }

  console.log("[Index] Regular user, redirecting to /(tenant)");
  return <Redirect href={tenantHomeHref} />;
}
