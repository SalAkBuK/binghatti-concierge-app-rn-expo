import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApp } from "../../lib/context/connected-app-provider";

export default function BuildingEmployeeProfileScreen() {
  const { isAuthenticated, currentUser, actions } = useApp();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (currentUser.role !== "building_employee") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Ionicons name="lock-closed-outline" size={48} color="#94A3B8" />
          <Text style={styles.title}>Access Restricted</Text>
          <Text style={styles.subtitle}>
            This workspace is only available to building employees.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const buildingEmployee =
    actions.getBuildingEmployeeByUserId?.(currentUser.id);
  const building =
    buildingEmployee?.buildingId &&
    actions.getBuildingById?.(buildingEmployee.buildingId);

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await actions.logout?.();
            router.replace("/auth" as any);
          } catch (error) {
            console.error("Failed to sign out building employee:", error);
            Alert.alert("Error", "Unable to sign out right now. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {currentUser.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <Text style={styles.name}>{currentUser.name}</Text>
      <Text style={styles.roleLabel}>Building Operations</Text>

      <View style={styles.infoCard}>
        <View style={styles.row}>
          <Ionicons name="mail-outline" size={18} color="#6B7280" />
          <Text style={styles.infoText}>{currentUser.email}</Text>
        </View>
        {currentUser.profile?.phone && (
          <View style={styles.row}>
            <Ionicons name="call-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{currentUser.profile.phone}</Text>
          </View>
        )}
        {buildingEmployee?.role && (
          <View style={styles.row}>
            <Ionicons name="briefcase-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{buildingEmployee.role}</Text>
          </View>
        )}
        <View style={styles.row}>
          <Ionicons name="business-outline" size={18} color="#6B7280" />
          <Text style={styles.infoText}>
            {building?.name || "Assigned Building"}
          </Text>
        </View>
        {buildingEmployee?.shift && (
          <View style={styles.row}>
            <Ionicons name="time-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>
              Shift: {buildingEmployee.shift.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

  {buildingEmployee && (
    <View style={styles.performanceCard}>
      <Text style={styles.sectionTitle}>Performance Snapshot</Text>
      <View style={styles.performanceRow}>
        <View style={styles.performanceStat}>
          <Text style={styles.performanceValue}>
            {buildingEmployee.jobsCompleted ?? 0}
          </Text>
          <Text style={styles.performanceLabel}>Tasks Completed</Text>
        </View>
        <View style={styles.performanceStat}>
          <Text style={styles.performanceValue}>
            {buildingEmployee.rating ?? "—"}
          </Text>
          <Text style={styles.performanceLabel}>Avg Rating</Text>
        </View>
      </View>
    </View>
  )}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 24,
    alignItems: "center",
  },
  card: {
    marginTop: 80,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  roleLabel: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 24,
  },
  infoCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#111827",
  },
  performanceCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  performanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  performanceStat: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  performanceLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  logoutButton: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EF4444",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
