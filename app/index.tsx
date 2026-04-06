import { Redirect, type Href } from "expo-router";
import React, { useEffect, useState } from "react";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useAuth } from "../lib/context/auth-context";
import {
  getMountedPortalConfig,
  getPostLoginHrefForRole,
} from "../lib/config/portals";

export default function IndexScreen() {
  const { isAuthenticated, currentUser } = useAuth();
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

  if (currentUser.mustChangePassword) {
    console.log("[Index] Password change required, redirecting to /change-password");
    return <Redirect href="/change-password" />;
  }

  const portalConfig = getMountedPortalConfig(currentUser.role);
  const destinationHref = getPostLoginHrefForRole(currentUser.role) as Href;

  if (portalConfig) {
    console.log(
      `[Index] ${currentUser.role} user, redirecting to ${portalConfig.rootHref}`,
    );
  } else {
    console.log(
      `[Index] No mounted portal for role "${currentUser.role}", redirecting to /portal-unavailable`,
    );
  }

  return <Redirect href={destinationHref} />;
}
