import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
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
  routePatterns?: string[];
  subItems?: SubMenuItem[];
  expandable?: boolean;
  badge?: number;
}

type RouterPushInput = Parameters<typeof router.push>[0];

const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#41555D",
  primarySoft: "#D0E6EF",
  accent: "#F8EFE4",
  accentText: "#7A5A2B",
  dangerBg: "#FCE3E0",
  dangerText: "#B24A41",
};

const formatRoleLabel = (role?: User["role"]) => {
  if (!role) return "Resident Portal";
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const matchesRoutePattern = (pathname: string, pattern: string) =>
  pathname === pattern ||
  pathname === `${pattern}/index` ||
  pathname.startsWith(`${pattern}/`);

export function SideMenu({ isVisible, onClose, userRole }: SideMenuProps) {
  const { currentUser, actions } = useAuth();
  const { totalUnreadCount: messagingUnreadCount } = useMessaging();
  const pathname = usePathname();
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
      routePatterns: ["/(tenant)/requests"],
      action: () => navigateAndClose("/(tenant)/requests"),
    },
    ...(canCreateMaintenanceRequest
      ? [
          {
            id: "tenant-new-request",
            title: "New",
            icon: "add-circle-outline" as const,
            routePatterns: ["/(tenant)/new-request"],
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
            routePatterns: ["/(tenant)/visitors", "/(modals)/register-visitor"],
            action: () => navigateAndClose("/(tenant)/visitors"),
          },
        ]
      : []),
    {
      id: "tenant-messages",
      title: "Messages",
      icon: "chatbubbles-outline",
      badge: messagingUnreadCount,
      routePatterns: ["/(tenant)/messages", "/(modals)/conversation-detail", "/(modals)/new-conversation"],
      action: () => navigateAndClose("/(tenant)/messages"),
    },
    {
      id: "tenant-profile",
      title: "Profile",
      icon: "person-outline",
      routePatterns: ["/(tenant)/profile"],
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

  const ownerMenu: MenuItem[] = [
    {
      id: "owner-dashboard",
      title: "Portfolio Home",
      icon: "grid-outline",
      routePatterns: ["/(owner)", "/(owner)/index"],
      action: () => navigateAndClose("/(owner)", true),
    },
    {
      id: "owner-units",
      title: "Units",
      icon: "business-outline",
      routePatterns: ["/(owner)/units"],
      action: () => navigateAndClose("/(owner)/units"),
    },
    {
      id: "owner-requests",
      title: "Requests",
      icon: "clipboard-outline",
      routePatterns: ["/(owner)/requests"],
      action: () => navigateAndClose("/(owner)/requests"),
    },
    {
      id: "owner-messages",
      title: "Messages",
      icon: "chatbubbles-outline",
      routePatterns: ["/(owner)/messages"],
      action: () => navigateAndClose("/(owner)/messages"),
    },
    {
      id: "owner-notifications",
      title: "Notifications",
      icon: "notifications-outline",
      routePatterns: ["/(owner)/notifications"],
      action: () => navigateAndClose("/(owner)/notifications"),
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
      routePatterns: ["/(management)", "/(management)/index"],
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
      routePatterns: ["/(management)/requests"],
      action: () => navigateAndClose("/(management)/requests"),
    },
    {
      id: "management-notices",
      title: "Notices & Alerts",
      icon: "alert-circle-outline",
      routePatterns: ["/(modals)/admin-notifications"],
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
      routePatterns: ["/(management)/profile"],
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
      routePatterns: ["/(buildingEmployee)", "/(buildingEmployee)/index"],
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
      routePatterns: ["/(buildingEmployee)/jobs"],
      action: () => navigateAndClose("/(buildingEmployee)/jobs"),
    },
    {
      id: "be-messages",
      title: "Messages",
      icon: "chatbubbles-outline",
      badge: messagingUnreadCount,
      routePatterns: ["/(buildingEmployee)/messages", "/(modals)/conversation-detail", "/(modals)/new-conversation"],
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
      routePatterns: ["/(buildingEmployee)/profile"],
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

  const providerWorkerMenu: MenuItem[] = [
    {
      id: "provider-queue",
      title: "Request Queue",
      icon: "clipboard-outline",
      routePatterns: [
        "/(serviceProvider)",
        "/(serviceProvider)/index",
        "/(serviceProvider)/requests",
      ],
      action: () => navigateAndClose("/(serviceProvider)", true),
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
      routePatterns: ["/portal-unavailable"],
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
      routePatterns: roleHasMountedPortal && roleHomeHref ? [roleHomeHref] : ["/portal-unavailable"],
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
      : effectiveRole === "owner"
        ? ownerMenu
      : effectiveRole === "building_employee"
        ? buildingEmployeeMenu
        : effectiveRole === "service_provider"
          ? providerWorkerMenu
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
        <View style={[styles.menuHeader, { paddingTop: insets.top + 18 }]}>
          <View style={styles.menuHeaderTopRow}>
            {/* <Text style={styles.menuEyebrow}>Concierge Menu</Text> */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={P.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(currentUser?.name || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName} numberOfLines={1}>
                  {currentUser?.name || "User"}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {currentUser?.email || "user@example.com"}
                </Text>
                <View style={styles.profileMetaRow}>
                  <View style={styles.profileMetaPill}>
                    <Ionicons name="sparkles-outline" size={14} color={P.primaryDark} />
                    <Text style={styles.profileMetaPillText}>
                      {formatRoleLabel(effectiveRole)}
                    </Text>
                  </View>
                  {messagingUnreadCount > 0 ? (
                    <View style={[styles.profileMetaPill, styles.profileMetaPillWarm]}>
                      <Text style={styles.profileMetaPillWarmText}>
                        {messagingUnreadCount > 99 ? "99+" : messagingUnreadCount} unread
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
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
            const isActive = Boolean(
              item.routePatterns?.some((pattern) =>
                matchesRoutePattern(pathname, pattern),
              ),
            );

            return (
              <View key={item.id}>
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    isActive ? styles.menuItemActive : null,
                    item.color ? styles.menuItemDanger : null,
                  ]}
                  onPress={() => {
                    if (item.expandable) {
                      setExpandedItem(isExpanded ? null : item.id);
                    } else if (item.action) {
                      item.action();
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.menuIconShell,
                      isActive ? styles.menuIconShellActive : null,
                      item.color ? styles.menuIconShellDanger : null,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.color || (isActive ? P.surface : P.primary)}
                    />
                  </View>
                  <Text
                    style={[
                      styles.menuItemText,
                      isActive ? styles.menuItemTextActive : null,
                      item.color
                        ? ({ color: item.color } as TextStyle)
                        : null,
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.badge != null && item.badge > 0 && (
                    <View style={[styles.menuBadge, isActive ? styles.menuBadgeActive : null]}>
                      <Text style={[styles.menuBadgeText, isActive ? styles.menuBadgeTextActive : null]}>
                        {item.badge > 99 ? "99+" : item.badge}
                      </Text>
                    </View>
                  )}
                  {item.expandable && (
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={isActive ? P.surface : P.muted}
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
                          color={P.muted}
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
    backgroundColor: "#0C0F10",
  },
  menuPanel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: MENU_WIDTH,
    backgroundColor: P.bg,
    shadowColor: "#0C0F10",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 18,
  },
  menuHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  menuHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  menuEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: P.primary,
  },
  profileCard: {
    backgroundColor: P.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: "#2B3437",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    minWidth: 0,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: P.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: P.primaryDark,
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: P.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: P.muted,
  },
  profileMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    maxWidth: "100%",
  },
  profileMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: P.primarySoft,
    maxWidth: "100%",
    flexShrink: 1,
    alignSelf: "flex-start",
  },
  profileMetaPillWarm: {
    backgroundColor: P.accent,
  },
  profileMetaPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.primaryDark,
    flexShrink: 1,
  },
  profileMetaPillWarmText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.accentText,
    flexShrink: 1,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
  },
  menuItems: {
    flex: 1,
    paddingTop: 8,
  },
  menuItemsContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 10,
  },
  menuItemActive: {
    backgroundColor: P.primary,
    borderColor: P.primary,
    shadowColor: P.primaryDark,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  menuItemDanger: {
    backgroundColor: P.dangerBg,
    borderColor: "#F2CBC5",
  },
  menuIconShell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.primarySoft,
    marginRight: 14,
  },
  menuIconShellActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  menuIconShellDanger: {
    backgroundColor: "#F8D8D3",
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: P.text,
    flex: 1,
  },
  menuItemTextActive: {
    color: P.surface,
  },
  expandIcon: {
    marginLeft: "auto",
  },
  menuBadge: {
    backgroundColor: P.primary,
    borderRadius: 999,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginLeft: 8,
  },
  menuBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  menuBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  menuBadgeTextActive: {
    color: P.surface,
  },
  subItemsContainer: {
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    marginTop: -2,
    marginBottom: 10,
    marginHorizontal: 8,
    paddingVertical: 8,
  },
  subMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  subMenuItemText: {
    fontSize: 14,
    fontWeight: "500",
    color: P.muted,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: P.border,
    marginHorizontal: 6,
    marginVertical: 8,
  },
  menuFooter: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
  },
  appVersion: {
    fontSize: 12,
    color: P.soft,
    textAlign: "center",
  },
});
