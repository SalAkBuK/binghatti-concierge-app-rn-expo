import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    id: "analytics",
    title: "Analytics & Reports",
    subtitle: "View performance metrics",
    icon: "stats-chart-outline",
    iconColor: "#8B5CF6",
    route: "/(serviceProvider)/analytics",
  },
  {
    id: "ratings",
    title: "Ratings & Reviews",
    subtitle: "View customer feedback",
    icon: "star-outline",
    iconColor: "#F59E0B",
    route: "/(serviceProvider)/ratings",
  },
  {
    id: "service-areas",
    title: "Service Areas",
    subtitle: "Manage coverage zones",
    icon: "location-outline",
    iconColor: "#10B981",
    route: "/(serviceProvider)/service-areas",
  },
  {
    id: "profile",
    title: "Profile & Settings",
    subtitle: "Manage account details",
    icon: "person-outline",
    iconColor: "#2563EB",
    route: "/(serviceProvider)/profile",
  },
];

export default function MoreScreen() {
  const { currentUser, notifications } = useApp();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showSideMenu, setShowSideMenu] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isTablet = width >= 768;

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const handleMenuPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="More"
        subtitle="Additional tools & settings"
        hasUnreadNotifications={hasUnreadNotifications}
        onNotificationPress={() => router.push(NOTIFICATION_ROUTE as any)}
        showSideMenu={showSideMenu}
        onSideMenuToggle={setShowSideMenu}
      />

        {/* Profile Summary Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.profileCard}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {currentUser?.name?.charAt(0).toUpperCase() || "S"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentUser?.name || "Service Provider"}</Text>
            <Text style={styles.profileEmail}>{currentUser?.email || "provider@example.com"}</Text>
            <View style={styles.profileBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
              <Text style={styles.profileBadgeText}>Verified Provider</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleMenuPress("/(serviceProvider)/profile")}
          >
            <Ionicons name="chevron-forward" size={24} color="#94A3B8" />
          </TouchableOpacity>
        </Animated.View>

        {/* Menu Grid */}
        <View style={styles.menuGrid}>
          {MENU_ITEMS.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.duration(400).delay(200 + index * 100)}
              style={[styles.menuItemWrapper, isTablet && styles.menuItemWrapperTablet]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuPress(item.route)}
              >
                <View style={[styles.menuIcon, { backgroundColor: `${item.iconColor}15` }]}>
                  <Ionicons name={item.icon} size={24} color={item.iconColor} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* App Info */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(600)}
          style={styles.appInfo}
        >
          <Text style={styles.appInfoText}>Tower Desk Service Provider</Text>
          <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
        </Animated.View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser?.role}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 8,
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#065F46",
  },
  menuGrid: {
    marginTop: 24,
    gap: 12,
  },
  menuItemWrapper: {
    width: "100%",
  },
  menuItemWrapperTablet: {
    width: "48%",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: 32,
  },
  appInfoText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#94A3B8",
    marginBottom: 4,
  },
  appInfoVersion: {
    fontSize: 12,
    fontWeight: "500",
    color: "#CBD5E1",
  },
});
