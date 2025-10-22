import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";

export default function EmployeeScheduleScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <HeaderBar
          title="Schedule"
          subtitle="View your job schedule"
        />

        <View style={styles.comingSoon}>
          <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
          <Text style={styles.comingSoonText}>Schedule Coming Soon</Text>
          <Text style={styles.comingSoonSubtext}>
            View your upcoming jobs in a calendar format
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  comingSoon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 16,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
