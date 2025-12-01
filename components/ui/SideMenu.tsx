import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import type { TextStyle, ViewStyle } from "react-native";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../lib/context/connected-app-provider";
import type { User } from "../../lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MENU_WIDTH = SCREEN_WIDTH * 0.8; // 80% of screen width

interface SideMenuProps {
  isVisible: boolean;
  onClose: () => void;
  userRole?: User["role"];
}

interface SubMenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: () => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  action?: () => void;
  color?: string;
  subItems?: SubMenuItem[];
  expandable?: boolean;
}

type RouterPushInput = Parameters<typeof router.push>[0];

export function SideMenu({ isVisible, onClose }: SideMenuProps) {
  const { currentUser, actions } = useApp();
  const insets = useSafeAreaInsets();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(isVisible);

  // Animation values
  const translateX = useSharedValue(-MENU_WIDTH - 20);
  const overlayOpacity = useSharedValue(0);
  const menuScale = useSharedValue(0.95);

  const closeMenu = () => {
    onClose();
  };

const navigateAndClose = (href: RouterPushInput | string) => {
  closeMenu();
  router.push(href as RouterPushInput);
};

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await actions.logout();
            router.replace("/auth" as any);
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  const tenantMenu: MenuItem[] = [
    {
      id: "tenant-bookings",
      title: "My Bookings",
      icon: "calendar-outline",
      action: () => navigateAndClose("/(tenant)/my-bookings"),
    },
    {
      id: "visitors",
      title: "Guest Registration",
      icon: "people-outline",
      action: () => navigateAndClose("/(tenant)/visitors"),
    },
    {
      id: "amenities",
      title: "Amenities Booking",
      icon: "fitness-outline",
      expandable: true,
      subItems: [
        {
          id: "pool",
          title: "Pool",
          icon: "water",
          action: () =>
            navigateAndClose({
              pathname: "/(tenant)/amenities",
              params: { filter: "pool" },
            }),
        },
        {
          id: "gym",
          title: "Gym",
          icon: "fitness",
          action: () =>
            navigateAndClose({
              pathname: "/(tenant)/amenities",
              params: { filter: "gym" },
            }),
        },
        {
          id: "sauna",
          title: "Sauna",
          icon: "flame",
          action: () =>
            navigateAndClose({
              pathname: "/(tenant)/amenities",
              params: { filter: "sauna" },
            }),
        },
        {
          id: "bbq",
          title: "BBQ",
          icon: "restaurant",
          action: () =>
            navigateAndClose({
              pathname: "/(tenant)/amenities",
              params: { filter: "bbq" },
            }),
        },
      ],
    },
    {
      id: "tenant-ratings",
      title: "My Ratings & Reviews",
      icon: "star-outline",
      action: () => navigateAndClose("/(tenant)/my-ratings"),
    },
    {
      id: "logout",
      title: "Sign Out",
      icon: "log-out-outline",
      color: "#ef4444",
      action: () => {
        closeMenu();
        handleLogout();
      },
    },
  ];

  // Super Admin Menu - Full Super Admin Portal
  const superAdminMenu: MenuItem[] = [
    {
      id: "superadmin-dashboard",
      title: "Dashboard",
      icon: "grid-outline",
      action: () => navigateAndClose("/(superadmin)"),
    },
    {
      id: "superadmin-admins",
      title: "Admin Users",
      icon: "shield-checkmark-outline",
      action: () => navigateAndClose("/(superadmin)/admins"),
    },
    {
      id: "superadmin-buildings",
      title: "Buildings",
      icon: "business-outline",
      action: () => navigateAndClose("/(superadmin)/buildings"),
    },
    {
      id: "superadmin-activity",
      title: "System Activity",
      icon: "notifications-outline",
      action: () => navigateAndClose("/(superadmin)/activity"),
    },
    {
      id: "divider-super-admin",
      title: "",
      icon: "remove",
      action: () => {},
    },
    {
      id: "superadmin-profile",
      title: "My Profile",
      icon: "person-outline",
      action: () => navigateAndClose("/(superadmin)/profile"),
    },
    {
      id: "logout",
      title: "Sign Out",
      icon: "log-out-outline",
      color: "#ef4444",
      action: () => {
        closeMenu();
        handleLogout();
      },
    },
  ];

  // Regular Admin Menu - Full access
  const adminMenu: MenuItem[] = [
  {
    id: "admin-dashboard",
    title: "Admin Dashboard",
    icon: "grid-outline",
    action: () => navigateAndClose("/(admin)"),
  },
    {
      id: "users",
      title: "User Management",
      icon: "people-circle-outline",
      action: () => navigateAndClose("/(admin)/users"),
    },
    {
      id: "buildings",
      title: "Buildings",
      icon: "business-outline",
      action: () => navigateAndClose("/(admin)/buildings"),
    },
    {
      id: "admin-service-providers",
      title: "Service Providers",
      icon: "construct-outline",
      action: () => navigateAndClose("/(admin)/service-providers"),
    },
    {
      id: "permissions",
      title: "Role Permissions",
      icon: "shield-checkmark-outline",
      action: () => navigateAndClose("/(admin)/permissions"),
    },
    {
      id: "notices",
      title: "Maintenance Notices",
      icon: "alert-circle-outline",
      action: () =>
        navigateAndClose({
          pathname: "/(modals)/admin-notifications",
          params: { initialTab: "notices" },
        }),
    },
    {
      id: "divider-admin",
      title: "",
      icon: "remove",
      action: () => {},
    },
    {
      id: "logout",
      title: "Sign Out",
      icon: "log-out-outline",
      color: "#ef4444",
      action: () => {
        closeMenu();
        handleLogout();
      },
    },
  ];

const managementMenu: MenuItem[] = [
  {
    id: "management-dashboard",
    title: "Operations Dashboard",
    icon: "analytics-outline",
    action: () => navigateAndClose("/(management)"),
  },
  {
    id: "management-requests",
    title: "Service Requests",
    icon: "clipboard-outline",
    action: () => navigateAndClose("/(management)/requests"),
  },
  {
    id: "management-tenants",
    title: "Tenant Directory",
    icon: "people-outline",
    action: () => navigateAndClose("/(management)/tenants"),
  },
  {
    id: "management-units",
    title: "Building Units",
    icon: "home-outline",
    action: () => navigateAndClose("/(management)/units"),
  },
  {
    id: "management-amenities",
    title: "Amenity Policies",
    icon: "fitness-outline",
    action: () => navigateAndClose("/(management)/amenities"),
  },
  {
    id: "management-buildings",
    title: "Buildings",
    icon: "business-outline",
    action: () => navigateAndClose("/(management)/buildings"),
  },
  {
    id: "management-jobs",
    title: "Jobs & Work Orders",
    icon: "hammer-outline",
    action: () => navigateAndClose("/(management)/jobs"),
  },
  {
    id: "management-workforce",
    title: "Building Employees",
    icon: "briefcase-outline",
    action: () => navigateAndClose("/(management)/workforce"),
  },
  {
    id: "management-visitors",
    title: "Visitors & Deliveries",
    icon: "people-outline",
    action: () => navigateAndClose("/(management)/visitors"),
  },
  {
    id: "management-activity",
    title: "Activity Feed",
    icon: "notifications-outline",
    action: () => navigateAndClose("/(management)/activity"),
  },
  {
    id: "management-notices",
    title: "Notices & Alerts",
    icon: "alert-circle-outline",
    action: () =>
      navigateAndClose({
        pathname: "/(modals)/admin-notifications",
        params: { initialTab: "notices" },
      }),
  },
  {
    id: "divider-management",
    title: "",
    icon: "remove",
    action: () => {},
  },
  {
    id: "logout",
    title: "Sign Out",
    icon: "log-out-outline",
    color: "#ef4444",
    action: () => {
      closeMenu();
      handleLogout();
    },
  },
];

  const buildingEmployeeMenu: MenuItem[] = [
    {
      id: "be-dashboard",
      title: "Shift Dashboard",
      icon: "speedometer-outline",
      action: () => navigateAndClose("/(buildingEmployee)"),
    },
    {
      id: "be-jobs",
      title: "Maintenance Jobs",
      icon: "construct-outline",
      action: () => navigateAndClose("/(buildingEmployee)/jobs"),
    },
    {
      id: "be-amenities",
      title: "Amenity Tasks",
      icon: "fitness-outline",
      action: () => navigateAndClose("/(buildingEmployee)/amenities"),
    },
    {
      id: "divider-be",
      title: "",
      icon: "remove",
      action: () => {},
    },
    {
      id: "be-profile",
      title: "My Profile",
      icon: "person-outline",
      action: () => navigateAndClose("/(buildingEmployee)/profile"),
    },
    {
      id: "logout",
      title: "Sign Out",
      icon: "log-out-outline",
      color: "#ef4444",
      action: () => {
        closeMenu();
        handleLogout();
      },
    },
  ];

  const serviceProviderMenu: MenuItem[] = [
    {
      id: "sp-dashboard",
      title: "Dashboard",
      icon: "grid-outline",
      action: () => navigateAndClose("/(serviceProvider)"),
    },
    {
      id: "sp-jobs",
      title: "Jobs",
      icon: "construct-outline",
      action: () => navigateAndClose("/(serviceProvider)/jobs"),
    },
    {
      id: "sp-schedule",
      title: "Schedule",
      icon: "calendar-outline",
      action: () => navigateAndClose("/(serviceProvider)/schedule"),
    },
    {
      id: "sp-team",
      title: "Team",
      icon: "people-outline",
      action: () => navigateAndClose("/(serviceProvider)/team"),
    },
    {
      id: "sp-service-areas",
      title: "Service Areas",
      icon: "location-outline",
      action: () => navigateAndClose("/(serviceProvider)/service-areas"),
    },
    {
      id: "sp-analytics",
      title: "Analytics & Reports",
      icon: "stats-chart-outline",
      action: () => navigateAndClose("/(serviceProvider)/analytics"),
    },
    {
      id: "sp-ratings",
      title: "Ratings & Reviews",
      icon: "star-outline",
      action: () => navigateAndClose("/(serviceProvider)/ratings"),
    },
    {
      id: "divider-sp",
      title: "",
      icon: "remove",
      action: () => {},
    },
    {
      id: "sp-profile",
      title: "Profile & Settings",
      icon: "person-outline",
      action: () => navigateAndClose("/(serviceProvider)/profile"),
    },
    {
      id: "logout",
      title: "Sign Out",
      icon: "log-out-outline",
      color: "#ef4444",
      action: () => {
        closeMenu();
        handleLogout();
      },
    },
  ];

  const employeeMenu: MenuItem[] = [
    {
      id: "emp-dashboard",
      title: "Dashboard",
      icon: "home-outline",
      action: () => navigateAndClose("/(employee)"),
    },
    {
      id: "emp-jobs",
      title: "My Jobs",
      icon: "briefcase-outline",
      action: () => navigateAndClose("/(employee)/jobs"),
    },
    {
      id: "emp-schedule",
      title: "Schedule",
      icon: "calendar-outline",
      action: () => navigateAndClose("/(employee)/schedule"),
    },
    {
      id: "emp-earnings",
      title: "Earnings",
      icon: "cash-outline",
      action: () => navigateAndClose("/(employee)/earnings"),
    },
    {
      id: "emp-messages",
      title: "Messages",
      icon: "chatbubbles-outline",
      action: () => navigateAndClose("/(employee)/messages"),
    },
    {
      id: "divider-emp",
      title: "",
      icon: "remove",
      action: () => {},
    },
    {
      id: "emp-profile",
      title: "Profile",
      icon: "person-outline",
      action: () => navigateAndClose("/(employee)/profile"),
    },
    {
      id: "logout",
      title: "Sign Out",
      icon: "log-out-outline",
      color: "#ef4444",
      action: () => {
        closeMenu();
        handleLogout();
      },
    },
  ];

  const menuItems: MenuItem[] =
    currentUser?.role === "super_admin"
      ? superAdminMenu
      : currentUser?.role === "admin"
        ? adminMenu
        : currentUser?.role === "management"
          ? managementMenu
          : currentUser?.role === "building_employee"
            ? buildingEmployeeMenu
            : currentUser?.role === "service_provider"
              ? serviceProviderMenu
              : currentUser?.role === "employee"
                ? employeeMenu
                : tenantMenu;

  // Animation effects
  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);

      translateX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      overlayOpacity.value = withTiming(0.5, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      menuScale.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      setExpandedItem(null);
      overlayOpacity.value = withTiming(0, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
      menuScale.value = withTiming(0.95, {
        duration: 250,
        easing: Easing.in(Easing.cubic),
      });
      translateX.value = withTiming(
        -MENU_WIDTH - 20,
        {
          duration: 250,
          easing: Easing.in(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(setIsRendered)(false);
          }
        }
      );
    }

    // Cleanup on unmount
    return () => {
      cancelAnimation(translateX);
      cancelAnimation(overlayOpacity);
      cancelAnimation(menuScale);
    };
  }, [isVisible, menuScale, overlayOpacity, translateX]);

  // Animated styles
  const menuAnimatedStyle = useAnimatedStyle<ViewStyle>(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: menuScale.value },
      ] as ViewStyle["transform"],
    };
  });

  const overlayAnimatedStyle = useAnimatedStyle<ViewStyle>(() => {
    return {
      opacity: overlayOpacity.value,
    };
  });

  if (!isRendered) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Overlay */}
      <Animated.View
        style={[styles.overlay, overlayAnimatedStyle]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Menu Panel */}
      <Animated.View style={[styles.menuPanel, menuAnimatedStyle]}>
        {/* Header */}
        <View style={[styles.menuHeader, { paddingTop: insets.top + 20 }]}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(currentUser?.name || "U").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {currentUser?.name || "User"}
              </Text>
              <Text style={styles.userEmail}>
                {currentUser?.email || "user@example.com"}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <ScrollView
          style={styles.menuItems}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {menuItems.map((item) => {
            if (item.id.startsWith("divider")) {
              return <View key={item.id} style={styles.divider} />;
            }

            const isExpanded = expandedItem === item.id;

            return (
              <View key={item.id}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    if (item.expandable) {
                      setExpandedItem(isExpanded ? null : item.id);
                    } else if (item.action) {
                      item.action();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={item.color || "#374151"}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      item.color
                        ? ({ color: item.color } as TextStyle)
                        : null,
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.expandable && (
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#6B7280"
                      style={styles.expandIcon}
                    />
                  )}
                </TouchableOpacity>

                {/* Sub-items */}
                {item.expandable && isExpanded && item.subItems && (
                  <View style={styles.subItemsContainer}>
                    {item.subItems.map((subItem) => (
                      <TouchableOpacity
                        key={subItem.id}
                        style={styles.subMenuItem}
                        onPress={subItem.action}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={subItem.icon}
                          size={18}
                          color="#6B7280"
                        />
                        <Text style={styles.subMenuItemText}>
                          {subItem.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={styles.menuFooter}>
          <Text style={styles.appVersion}>
            Binghatti Concierge v1.0.0
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
  menuPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: "#6b7280",
  },
  closeButton: {
    padding: 4,
  },
  menuItems: {
    flex: 1,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 0,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 16,
    flex: 1,
  },
  expandIcon: {
    marginLeft: "auto",
  },
  subItemsContainer: {
    backgroundColor: "#F9FAFB",
    paddingVertical: 4,
  },
  subMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 48,
    paddingVertical: 12,
  },
  subMenuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#f3f4f6",
    marginHorizontal: 20,
    marginVertical: 8,
  },
  menuFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  appVersion: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
});
