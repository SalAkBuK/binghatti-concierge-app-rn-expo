import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    id: "requests",
    title: "Request Operations",
    subtitle: "View and manage all service requests",
    icon: "clipboard",
    route: "/(admin)/requests",
    color: "#7C3AED",
  },
  {
    id: "jobs",
    title: "Jobs",
    subtitle: "Manage jobs and task assignments",
    icon: "construct",
    route: "/(admin)/jobs",
    color: "#2563EB",
  },
  {
    id: "service-providers",
    title: "Service Providers",
    subtitle: "Manage vendors and building assignments",
    icon: "business",
    route: "/(admin)/service-providers",
    color: "#06B6D4",
  },
  {
    id: "tenants",
    title: "Tenant Directory",
    subtitle: "View all tenants across buildings",
    icon: "people",
    route: "/(admin)/tenants",
    color: "#10B981",
  },
  {
    id: "activity",
    title: "Activity",
    subtitle: "Monitor system-wide activity logs",
    icon: "notifications",
    route: "/(admin)/activity",
    color: "#F59E0B",
  },
  {
    id: "workforce",
    title: "Workforce Planning",
    subtitle: "Manage building staff and schedules",
    icon: "briefcase",
    route: "/(admin)/workforce",
    color: "#EC4899",
  },
  {
    id: "permissions",
    title: "Permissions",
    subtitle: "Configure role-based access control",
    icon: "shield-checkmark",
    route: "/(admin)/permissions",
    color: "#8B5CF6",
  },
];

export default function AdminMoreScreen() {
  const { currentUser, notifications } = useApp();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [showSideMenu, setShowSideMenu] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const handleMenuPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="More"
          subtitle="Additional admin tools and settings"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(50).duration(300)}
          style={styles.menuGrid}
        >
          {MENU_ITEMS.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(100 + index * 50).duration(300)}
            >
              <TouchableOpacity
                style={styles.menuCard}
                onPress={() => handleMenuPress(item.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>

        {/* User Info Section */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(300)}
          style={styles.userInfoSection}
        >
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.userInfoCard}>
            <View style={styles.userInfoRow}>
              <Ionicons name="person-circle" size={48} color="#7034FF" />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{currentUser?.name || "Admin User"}</Text>
                <Text style={styles.userRole}>
                  {currentUser?.role === "super_admin" ? "Super Admin" : "Admin"}
                </Text>
                <Text style={styles.userEmail}>{currentUser?.email}</Text>
              </View>
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
  menuGrid: {
    marginTop: 24,
    gap: 12,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  userInfoSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  userInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7034FF",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: "#6B7280",
  },
});
