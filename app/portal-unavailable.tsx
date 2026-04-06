import { router, Redirect } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../lib/context/auth-context";
import { getRoleHomeHref } from "../lib/config/portals";

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
  const mountedPortalHref = getRoleHomeHref(currentUser?.role);

  if (!isAuthenticated || !currentUser) {
    return <Redirect href="/auth" />;
  }

  if (mountedPortalHref) {
    return <Redirect href={mountedPortalHref as any} />;
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
          No mounted mobile portal for the current role
        </Text>
        <Text style={styles.body}>
          Signed in as {formatRoleLabel(currentUser.role)}. This role exists in
          the broader product model, but its mobile workspace is not mounted in
          this app yet.
        </Text>
        <Text style={styles.meta}>Role: {currentUser.role}</Text>

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
