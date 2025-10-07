import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useApp } from "../lib/context/connected-app-provider";

export default function IndexScreen() {
  const { isAuthenticated, currentUser } = useApp();
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

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

  // Authenticated - redirect based on role
  if (currentUser.role === "admin" || currentUser.role === "management") {
    console.log("[Index] Admin/Management user, redirecting to /(admin)");
    return <Redirect href="/(admin)" />;
  }

  console.log("[Index] Regular user, redirecting to /(tabs)");
  return <Redirect href="/(tabs)" />;
}
