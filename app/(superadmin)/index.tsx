import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const SUPERADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type StatCard = {
  id: string;
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
};

export default function SuperAdminDashboard() {
  const { currentUser, notifications, users, buildings } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Calculate statistics
  const stats = useMemo(() => {
    const allUsers = Object.values(users);
    const adminCount = allUsers.filter((u) => u.role === "admin").length;
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter((u) => u.id).length; // Simplified check
    const buildingsCount = buildings?.length || 0;

    const statCards: StatCard[] = [
      {
        id: "admins",
        label: "Admin Users",
        value: adminCount,
        icon: "shield-checkmark",
        color: "#7034FF",
        bgColor: "#7034FF15",
      },
      {
        id: "users",
        label: "Total Users",
        value: totalUsers,
        icon: "people",
        color: "#2563EB",
        bgColor: "#2563EB15",
      },
      {
        id: "active",
        label: "Active Users",
        value: activeUsers,
        icon: "pulse",
        color: "#10B981",
        bgColor: "#10B98115",
      },
      {
        id: "buildings",
        label: "Buildings",
        value: buildingsCount,
        icon: "business",
        color: "#F59E0B",
        bgColor: "#F59E0B15",
      },
    ];

    return statCards;
  }, [users, buildings]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Super Admin Dashboard"
          subtitle="System-wide administration and control"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={SUPERADMIN_NOTIFICATION_ROUTE}
        />

        {/* Welcome Section */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          style={styles.welcomeCard}
        >
          <View style={styles.welcomeHeader}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#7034FF" />
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>
                Welcome, {currentUser?.name || "Super Admin"}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                You have full system access
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Statistics Grid */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(300)}
          style={styles.statsSection}
        >
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <Animated.View
                key={stat.id}
                entering={FadeInDown.delay(250 + index * 50).duration(300)}
                style={styles.statCard}
              >
                <View
                  style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}
                >
                  <Ionicons name={stat.icon} size={24} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(300)}
          style={styles.actionsSection}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <View style={styles.actionCard}>
              <Ionicons name="person-add" size={28} color="#2563EB" />
              <Text style={styles.actionText}>Create Admin</Text>
            </View>
            <View style={styles.actionCard}>
              <Ionicons name="business" size={28} color="#F59E0B" />
              <Text style={styles.actionText}>Add Building</Text>
            </View>
            <View style={styles.actionCard}>
              <Ionicons name="analytics" size={28} color="#8B5CF6" />
              <Text style={styles.actionText}>View Reports</Text>
            </View>
            <View style={styles.actionCard}>
              <Ionicons name="settings" size={28} color="#06B6D4" />
              <Text style={styles.actionText}>System Settings</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
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
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  statsSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  actionsSection: {
    marginTop: 32,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
});
