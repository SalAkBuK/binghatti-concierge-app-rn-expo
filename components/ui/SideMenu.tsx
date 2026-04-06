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
import {
  getRoleHomeHref,
  hasMountedPortal,
} from "../../lib/config/portals";
import { useAuth } from "../../lib/context/auth-context";
import { useMessaging } from "../../lib/context/messaging-context";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
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
  badge?: number;
}

type RouterPushInput = Parameters<typeof router.push>[0];

export function SideMenu({ isVisible, onClose, userRole }: SideMenuProps) {
  const { currentUser, actions } = useAuth();
  const { totalUnreadCount: messagingUnreadCount } = useMessaging();
  const effectiveRole = userRole ?? currentUser?.role;
  const { canCreateMaintenanceRequest, canManageVisitors } = useResidentTenancy({
    enabled: Boolean(effectiveRole === "tenant" && currentUser?.id),
  });
  const insets = useSafeAreaInsets();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(isVisible);
  const roleHomeHref = getRoleHomeHref(effectiveRole);
  const roleHasMountedPortal = hasMountedPortal(effectiveRole);

  // Animation values
  const translateX = useSharedValue(-MENU_WIDTH - 20);
  const overlayOpacity = useSharedValue(0);
  const menuScale = useSharedValue(0.95);

  const closeMenu = () => {
    onClose();
  };

  const navigateAndClose = (
    href: RouterPushInput | string,
    useReplace = false,
  ) => {
    closeMenu();
    if (useReplace) {
      router.replace(href as any);
    } else {
      router.push(href as RouterPushInput);
    }
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
      id: "tenant-requests",
      title: "Requests",
      icon: "list-outline",
      action: () => navigateAndClose("/(tenant)/requests"),
    },
    ...(canCreateMaintenanceRequest
      ? [
          {
            id: "tenant-new-request",
            title: "New",
            icon: "add-circle-outline" as const,
            action: () => navigateAndClose("/(tenant)/new-request"),
          },
        ]
      : []),
    ...(canManageVisitors
      ? [
          {
            id: "tenant-visitors",
            title: "Visitors",
            icon: "people-outline" as const,
            action: () => navigateAndClose("/(tenant)/visitors"),
          },
        ]
      : []),
    {
      id: "tenant-messages",
      title: "Messages",
      icon: "chatbubbles-outline",
      badge: messagingUnreadCount,
      action: () => navigateAndClose("/(tenant)/messages"),
    },
    {
      id: "tenant-profile",
      title: "Profile",
      icon: "person-outline",
      action: () => navigateAndClose("/(tenant)/profile"),
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
      action: () => {
        if (roleHomeHref) {
          navigateAndClose(roleHomeHref, true);
        }
      },
    },
    {
      id: "management-requests",
      title: "Service Requests",
      icon: "clipboard-outline",
      action: () => navigateAndClose("/(management)/requests"),
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
      id: "management-profile",
      title: "My Profile",
      icon: "person-outline",
      action: () => navigateAndClose("/(management)/profile"),
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
      action: () => {
        if (roleHomeHref) {
          navigateAndClose(roleHomeHref, true);
        }
      },
    },
    {
      id: "be-jobs",
      title: "Maintenance Jobs",
      icon: "construct-outline",
      action: () => navigateAndClose("/(buildingEmployee)/jobs"),
    },
    {
      id: "be-messages",
      title: "Messages",
      icon: "chatbubbles-outline",
      badge: messagingUnreadCount,
      action: () => navigateAndClose("/(buildingEmployee)/messages"),
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

  const unsupportedPortalMenu: MenuItem[] = [
    {
      id: "portal-status",
      title: "Portal Status",
      icon: "information-circle-outline",
      action: () => navigateAndClose("/portal-unavailable", true),
    },
    {
      id: "divider-unsupported",
      title: "",
      icon: "remove",
      action: () => {},
    },
    {
      id: "unsupported-role",
      title: roleHasMountedPortal ? "Open Portal" : "Mobile Portal Not Mounted",
      icon: "warning-outline",
      action: () =>
        navigateAndClose(
          roleHasMountedPortal && roleHomeHref
            ? roleHomeHref
            : "/portal-unavailable",
          true,
        ),
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
    effectiveRole === "management"
      ? managementMenu
      : effectiveRole === "building_employee"
        ? buildingEmployeeMenu
        : effectiveRole === "tenant"
          ? tenantMenu
          : unsupportedPortalMenu;

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
          contentContainerStyle={styles.menuItemsContent}
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
                  {item.badge != null && item.badge > 0 && (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>
                        {item.badge > 99 ? "99+" : item.badge}
                      </Text>
                    </View>
                  )}
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
  menuItemsContent: {
    paddingBottom: 100, // Add padding to ensure last items are visible above footer
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
  menuBadge: {
    backgroundColor: "#336BE3",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginLeft: 8,
  },
  menuBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700" as const,
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
