import { router, Redirect } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../lib/context/auth-context";
import {
  getMobileWorkspaceLabel,
  resolveInitialMobileRoute,
} from "../lib/config/mobile-workspaces";

const formatRoleLabel = (role?: string | null) => {
  if (!role) {
    return "Unknown";
  }

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export default function PortalUnavailableScreen() {
  const { isAuthenticated, currentUser, actions } = useAuth();

  if (!isAuthenticated || !currentUser) {
    return <Redirect href="/auth" />;
  }

  const routeDecision = resolveInitialMobileRoute(currentUser);

  if (routeDecision.type === "route") {
    return <Redirect href={routeDecision.href as any} />;
  }

  if (routeDecision.type === "workspace_selector") {
    return <Redirect href="/workspace-selector" />;
  }

  const handleSignOut = async () => {
    try {
      await actions.logout();
      router.replace("/auth" as any);
    } catch (error) {
      console.error("[PortalUnavailable] Failed to sign out:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>Portal Unavailable</Text>
        <Text style={styles.title}>
          This account is not enabled for the mobile app
        </Text>
        <Text style={styles.body}>
          Signed in as {formatRoleLabel(currentUser.role)}. The account is
          authenticated, but none of its personas currently map to a supported
          mobile workspace.
        </Text>
        <Text style={styles.meta}>Role: {currentUser.role}</Text>
        {Array.isArray(currentUser.persona?.keys) &&
        currentUser.persona.keys.length > 0 ? (
          <Text style={styles.meta}>
            Persona keys: {currentUser.persona.keys.join(", ")}
          </Text>
        ) : null}
        {Array.isArray(currentUser.mobileWorkspaces) &&
        currentUser.mobileWorkspaces.length > 0 ? (
          <Text style={styles.meta}>
            Supported workspaces:{" "}
            {currentUser.mobileWorkspaces
              .map((workspace) => getMobileWorkspaceLabel(workspace))
              .join(", ")}
          </Text>
        ) : null}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSignOut}>
          <Text style={styles.primaryButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#2563EB",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4B5563",
    marginBottom: 12,
  },
  meta: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
