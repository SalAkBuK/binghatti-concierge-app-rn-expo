import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../lib/context/connected-app-provider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MENU_WIDTH = SCREEN_WIDTH * 0.8; // 80% of screen width

interface SideMenuProps {
  isVisible: boolean;
  onClose: () => void;
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

  const navigateAndClose = (pathname: string, params?: Record<string, any>) => {
    closeMenu();
    if (params) {
      router.push({ pathname, params });
    } else {
      router.push(pathname);
    }
  };

  const tenantMenu: MenuItem[] = [
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
          action: () => navigateAndClose("/(tabs)/amenities", { filter: "pool" }),
        },
        {
          id: "gym",
          title: "Gym",
          icon: "fitness",
          action: () => navigateAndClose("/(tabs)/amenities", { filter: "gym" }),
        },
        {
          id: "sauna",
          title: "Sauna",
          icon: "flame",
          action: () => navigateAndClose("/(tabs)/amenities", { filter: "sauna" }),
        },
        {
          id: "bbq",
          title: "BBQ",
          icon: "restaurant",
          action: () => navigateAndClose("/(tabs)/amenities", { filter: "bbq" }),
        },
      ],
    },
    {
      id: "visitors",
      title: "Visitor Booking",
      icon: "people-outline",
      action: () => navigateAndClose("/(tabs)/visitors"),
    },
    {
      id: "logout",
      title: "Logout",
      icon: "log-out-outline",
      color: "#ef4444",
      action: () => {
        closeMenu();
        handleLogout();
      },
    },
  ];

  const adminMenu: MenuItem[] = [
    {
      id: "admin-dashboard",
      title: "Admin Dashboard",
      icon: "grid-outline",
      action: () => navigateAndClose("/(admin)/index"),
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
      id: "jobs",
      title: "Jobs & Work Orders",
      icon: "construct-outline",
      action: () => navigateAndClose("/(admin)/jobs"),
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
      action: () => navigateAndClose("/(modals)/admin-notifications", { initialTab: "notices" }),
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
      title: "Management Dashboard",
      icon: "analytics-outline",
      action: () => navigateAndClose("/(admin)/index"),
    },
    {
      id: "requests",
      title: "Service Requests",
      icon: "clipboard-outline",
      action: () => navigateAndClose("/(tabs)/requests"),
    },
    {
      id: "buildings",
      title: "Buildings",
      icon: "business-outline",
      action: () => navigateAndClose("/(admin)/buildings"),
    },
    {
      id: "team",
      title: "Service Providers",
      icon: "briefcase-outline",
      action: () => navigateAndClose("/(admin)/jobs"),
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

  const menuItems: MenuItem[] =
    currentUser?.role === "admin"
      ? adminMenu
      : currentUser?.role === "management"
        ? managementMenu
        : tenantMenu;


  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await actions.logout();
            router.replace("/auth");
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  // Animation effects
  useEffect(() => {
    if (isVisible) {
      setIsRendered(true);

      translateX.value = withSpring(0, {
        damping: 18,
        stiffness: 180,
      });
      overlayOpacity.value = withTiming(0.5, {
        duration: 250,
        easing: Easing.out(Easing.cubic),
      });
      menuScale.value = withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      setExpandedItem(null);
      overlayOpacity.value = withTiming(0, {
        duration: 220,
        easing: Easing.out(Easing.quad),
      });
      menuScale.value = withTiming(0.95, {
        duration: 240,
        easing: Easing.in(Easing.quad),
      });
      translateX.value = withTiming(
        -MENU_WIDTH - 20,
        {
          duration: 260,
          easing: Easing.inOut(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(setIsRendered)(false);
          }
        }
      );
    }
  }, [isVisible, menuScale, overlayOpacity, translateX]);

  // Animated styles
  const menuAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: menuScale.value },
      ],
    };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
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
        <View style={styles.menuItems}>
          {menuItems.map((item) => {
            if (item.id === "divider") {
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
                      item.color && { color: item.color },
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
        </View>

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
