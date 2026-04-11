import { Redirect, router, type Href } from "expo-router";
import React, { useEffect } from "react";
import { AppBootstrapErrorScreen } from "../components/ui/AppBootstrapErrorScreen";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useAuth } from "../lib/context/auth-context";
import { resolveInitialMobileRoute } from "../lib/config/mobile-workspaces";

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

  const routeDecision = resolveInitialMobileRoute(currentUser);

  if (routeDecision.type === "workspace_selector") {
    console.log("[Index] Multiple mobile workspaces available, redirecting to selector");
    return <Redirect href="/workspace-selector" />;
  }

  if (routeDecision.type === "unsupported") {
    console.log("[Index] No supported mobile workspace found, redirecting to /portal-unavailable");
    return <Redirect href="/portal-unavailable" />;
  }

  console.log(
    `[Index] ${routeDecision.name} resolved for ${routeDecision.workspace}, redirecting to ${routeDecision.href}`,
  );

  return <Redirect href={routeDecision.href as Href} />;
}
