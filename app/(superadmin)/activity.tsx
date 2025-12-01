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

export default function SuperAdminActivityScreen() {
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
          title="System Activity"
          subtitle="Monitor system-wide activity logs"
          hasUnreadNotifications={hasUnreadNotifications}
          notificationRoute={SUPERADMIN_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          style={styles.placeholderCard}
        >
          <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
          <Text style={styles.placeholderTitle}>Activity Logs</Text>
          <Text style={styles.placeholderText}>
            System activity monitoring will be available soon
          </Text>
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
  placeholderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 60,
    marginTop: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  placeholderText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
