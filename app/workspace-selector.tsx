import { Ionicons } from "@expo/vector-icons";
import { router, Redirect } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../lib/context/auth-context";
import {
  canSwitchMobileWorkspace,
  getMobileWorkspaceLabel,
  getMobileWorkspaces,
  getResidentWorkspaceDescription,
} from "../lib/config/mobile-workspaces";
import type { MobileWorkspace, UserPersona } from "../lib/types";

const P = {
  bg: "#F5F7F8",
  panel: "#FFFFFF",
  panelAlt: "#E9EFF2",
  text: "#243033",
  muted: "#667176",
  soft: "#7B878B",
  primary: "#405961",
  primarySoft: "#D8E5EA",
  border: "#D9E2E6",
  active: "#0F172A",
  activeText: "#EFF8FB",
};

const getWorkspaceDescription = (
  workspace: MobileWorkspace,
  currentUserPersona?: UserPersona | null,
): string => {
  if (workspace === "resident") {
    return getResidentWorkspaceDescription(currentUserPersona);
  }

  if (workspace === "owner") {
    return "Portfolio access, approvals, and owner conversations.";
  }

  if (workspace === "provider_worker") {
    return "Provider worker request queue and assigned work.";
  }

  return "Building operations workspace for staff and managers.";
};

export default function WorkspaceSelectorScreen() {
  const { isAuthenticated, currentUser, actions } = useAuth();
  const [isSaving, setIsSaving] = useState<MobileWorkspace | null>(null);

  const availableWorkspaces = useMemo(
    () => getMobileWorkspaces(currentUser),
    [currentUser],
  );
  const canSwitchWorkspace = useMemo(
    () => canSwitchMobileWorkspace(currentUser),
    [currentUser],
  );

  if (!isAuthenticated || !currentUser) {
    return <Redirect href="/auth" />;
  }

  if (currentUser.mustChangePassword) {
    return <Redirect href="/change-password" />;
  }

  if (availableWorkspaces.length === 0) {
    return <Redirect href="/portal-unavailable" />;
  }

  if (!canSwitchWorkspace) {
    return <Redirect href="/" />;
  }

  const handleSelectWorkspace = async (workspace: MobileWorkspace) => {
    if (workspace === currentUser.activeWorkspace) {
      router.replace("/");
      return;
    }

    try {
      setIsSaving(workspace);
      await actions.selectWorkspace(workspace);
      router.replace("/");
    } catch (error) {
      console.error("[WorkspaceSelector] Failed to switch workspace:", error);
    } finally {
      setIsSaving(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Choose Workspace</Text>
          <Text style={styles.title}>Select how you want to enter Towerdesk</Text>
          <Text style={styles.subtitle}>
            This account has more than one mobile workspace. You can switch
            again later from the side menu.
          </Text>
        </View>

        <View style={styles.card}>
          {availableWorkspaces.map((workspace) => {
            const isActive = currentUser.activeWorkspace === workspace;
            const isBusy = isSaving === workspace;

            return (
              <Pressable
                key={workspace}
                accessibilityRole="button"
                onPress={() => void handleSelectWorkspace(workspace)}
                style={[
                  styles.workspaceCard,
                  isActive ? styles.workspaceCardActive : null,
                ]}
              >
                <View
                  style={[
                    styles.iconShell,
                    isActive ? styles.iconShellActive : null,
                  ]}
                >
                  <Ionicons
                    name={
                      workspace === "resident"
                        ? "home-outline"
                        : workspace === "owner"
                          ? "business-outline"
                          : workspace === "provider_worker"
                            ? "construct-outline"
                            : "people-outline"
                    }
                    size={20}
                    color={isActive ? P.activeText : P.primary}
                  />
                </View>

                <View style={styles.workspaceText}>
                  <Text
                    style={[
                      styles.workspaceTitle,
                      isActive ? styles.workspaceTitleActive : null,
                    ]}
                  >
                    {getMobileWorkspaceLabel(workspace)}
                  </Text>
                  <Text
                    style={[
                      styles.workspaceDescription,
                      isActive ? styles.workspaceDescriptionActive : null,
                    ]}
                  >
                    {getWorkspaceDescription(workspace, currentUser.persona)}
                  </Text>
                </View>

                {isBusy ? (
                  <ActivityIndicator
                    size="small"
                    color={isActive ? P.activeText : P.primary}
                  />
                ) : isActive ? (
                  <Text style={styles.activeBadge}>Current</Text>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={P.soft} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  hero: {
    marginTop: 16,
    marginBottom: 28,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: P.primary,
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: P.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: P.muted,
  },
  card: {
    borderRadius: 28,
    backgroundColor: P.panel,
    padding: 16,
    gap: 12,
  },
  workspaceCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.panelAlt,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  workspaceCardActive: {
    backgroundColor: P.active,
    borderColor: P.active,
  },
  iconShell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.primarySoft,
    marginRight: 14,
  },
  iconShellActive: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  workspaceText: {
    flex: 1,
    paddingRight: 12,
  },
  workspaceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: P.text,
    marginBottom: 4,
  },
  workspaceTitleActive: {
    color: P.activeText,
  },
  workspaceDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: P.muted,
  },
  workspaceDescriptionActive: {
    color: "rgba(239,248,251,0.84)",
  },
  activeBadge: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: P.activeText,
  },
});
