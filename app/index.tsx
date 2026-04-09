import { Redirect, router, type Href } from "expo-router";
import React, { useEffect } from "react";
import { AppBootstrapErrorScreen } from "../components/ui/AppBootstrapErrorScreen";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useAuth } from "../lib/context/auth-context";
import {
  getMountedPortalConfig,
  getPostLoginHrefForRole,
} from "../lib/config/portals";

export default function IndexScreen() {
  const {
    isAuthenticated,
    currentUser,
    bootstrapStatus,
    bootstrapError,
    actions,
  } = useAuth();

  // Log whenever auth state changes
  useEffect(() => {
    console.log("[Index] Component rendered - Auth state:", {
      isAuthenticated,
      bootstrapStatus,
      role: currentUser?.role,
      userEmail: currentUser?.email,
    });
  }, [bootstrapStatus, currentUser, isAuthenticated]);

  if (bootstrapStatus === "restoring") {
    return (
      <LoadingScreen
        message="Restoring your workspace..."
        useLottie={false}
      />
    );
  }

  if (bootstrapStatus === "error") {
    return (
      <AppBootstrapErrorScreen
        message={
          bootstrapError ||
          "We could not restore your workspace. Retry or continue to sign in again."
        }
        onRetry={actions.retryBootstrap}
        onContinueToSignIn={() => {
          void actions.recoverFromBootstrapError().then(() => {
            router.replace("/auth" as any);
          });
        }}
      />
    );
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
