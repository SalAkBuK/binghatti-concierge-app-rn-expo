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
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color: string;
}

const menuItems: MenuItem[] = [
  {
    id: "units",
    title: "Units",
    description: "Manage building units and occupancy",
    icon: "home",
    route: "/(management)/units",
    color: "#F97316",
  },
  {
    id: "amenities",
    title: "Amenities",
    description: "Control amenity availability and rules",
    icon: "fitness",
    route: "/(management)/amenities",
    color: "#10B981",
  },
  {
    id: "billing",
    title: "Billing & Meter Readings",
    description: "Manage bills and utility meters",
    icon: "receipt",
    route: "/(management)/billing",
    color: "#0EA5E9",
  },
  {
    id: "maintenance",
    title: "Maintenance Scheduler",
    description: "Schedule and manage maintenance",
    icon: "construct",
    route: "/(management)/maintenance",
    color: "#10B981",
  },
  {
    id: "parcels",
    title: "Parcels",
    description: "Track and manage deliveries",
    icon: "cube",
    route: "/(management)/parcels",
    color: "#F59E0B",
  },
  {
    id: "visitors",
    title: "Visitors",
    description: "Approve and manage visitor passes",
    icon: "people",
    route: "/(management)/visitors",
    color: "#8B5CF6",
  },
  {
    id: "shifts",
    title: "Shifts",
    description: "Manage employee work schedules",
    icon: "time",
    route: "/(management)/shifts",
    color: "#06B6D4",
  },
  {
    id: "buildings",
    title: "Buildings",
    description: "View and edit building information",
    icon: "business",
    route: "/(management)/buildings",
    color: "#2563EB",
  },
  {
    id: "workforce",
    title: "Workforce",
    description: "Manage building staff and providers",
    icon: "briefcase",
    route: "/(management)/workforce",
    color: "#0EA5E9",
  },
  {
    id: "managers",
    title: "Building Managers",
    description: "View and create managers for your buildings",
    icon: "person-circle",
    route: "/(management)/managers",
    color: "#7C3AED",
  },
  {
    id: "activity",
    title: "Activity",
    description: "Recent activity and notifications",
    icon: "notifications",
    route: "/(management)/activity",
    color: "#EC4899",
  },
];

export default function MoreScreen() {
  const { currentUser, notifications } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;

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
      <ScrollView style={[styles.scrollView, { paddingHorizontal: pagePadding }]}>
        <HeaderBar
          title="More"
          subtitle="Additional management tools"
        hasUnreadNotifications={hasUnreadNotifications}
        onNotificationPress={() => router.push(MANAGEMENT_NOTIFICATION_ROUTE)}
        showSideMenu={showSideMenu}
        onSideMenuToggle={setShowSideMenu}
      />

        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuCard,
                isCompact && styles.menuCardFull,
              ]}
              onPress={() => handleMenuPress(item.route)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Tower Desk Management Suite</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />
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
    gap: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuCardFull: {
    width: "100%",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  footer: {
    marginTop: 40,
    marginBottom: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
    color: "#D1D5DB",
  },
});
