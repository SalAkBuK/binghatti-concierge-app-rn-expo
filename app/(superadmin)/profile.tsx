import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const SUPERADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function SuperAdminProfileScreen() {
  const { currentUser, notifications } = useApp();
  const { width } = useWindowDimensions();
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Super Admin Profile"
          subtitle="Manage your profile settings"
          hasUnreadNotifications={hasUnreadNotifications}
          notificationRoute={SUPERADMIN_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          style={styles.profileCard}
        >
          <View style={styles.avatarContainer}>
            <Ionicons name="shield-checkmark" size={64} color="#7034FF" />
          </View>
          <Text style={styles.userName}>{currentUser?.name || "Super Admin"}</Text>
          <Text style={styles.userRole}>Super Administrator</Text>
          <Text style={styles.userEmail}>{currentUser?.email}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(300)}
          style={styles.infoSection}
        >
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue}>{currentUser?.id || "N/A"}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>Super Admin</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{currentUser?.phone || "Not set"}</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    marginTop: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#7034FF15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7034FF",
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
});
