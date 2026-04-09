import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname } from "expo-router";
import React, { useEffect, useState } from "react";
import type { TextStyle, ViewStyle } from "react-native";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
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
const MENU_WIDTH = Math.min(324, SCREEN_WIDTH * 0.78);

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
  panel: "#EEF2F4",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  surfaceHigh: "#DCE5E8",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#41555D",
  primarySoft: "#D0E6EF",
  accent: "#F8EFE4",
  accentText: "#7A5A2B",
  inverse: "#0C0F10",
  inverseSoft: "#172126",
  onInverse: "#EEF7FB",
  success: "#1E9B63",
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
  const resolvedUnitLabel =
    currentUser?.resident?.unitLabel ||
    currentUser?.resident?.unit?.label ||
    currentUser?.resident?.unitNumber ||
    currentUser?.resident?.unit?.number ||
    currentUser?.resident?.unit?.unitNumber ||
    currentUser?.profile?.apartment;
  const displayName = currentUser?.name || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase() || "U";
  const avatarUri =
    currentUser?.profile?.avatarUrl ||
    currentUser?.profile?.avatar ||
    null;
  const footerBottomPadding = Math.max(insets.bottom, 20) + 24;

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
      title: "Dashboard",
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
      title: "Alerts",
      icon: "notifications-outline",
      routePatterns: ["/(owner)/notifications", "/(modals)/owner-alerts"],
      action: () => navigateAndClose("/(modals)/owner-alerts"),
    },
    {
      id: "owner-profile",
      title: "Profile & Settings",
      icon: "person-outline",
      routePatterns: ["/(owner)/profile"],
      action: () => navigateAndClose("/(owner)/profile"),
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
  const primaryMenuItems = menuItems.filter((item) => item.id !== "logout");
  const footerMenuItems = menuItems.filter((item) => item.id === "logout");

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

  const renderMenuItem = (item: MenuItem) => {
    if (item.id.startsWith("divider")) {
      return <View key={item.id} style={styles.sectionSpacer} />;
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
          activeOpacity={0.8}
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
              size={18}
              color={item.color || (isActive ? P.primary : P.muted)}
            />
          </View>
          <Text
            style={[
              styles.menuItemText,
              isActive ? styles.menuItemTextActive : null,
              item.color ? ({ color: item.color } as TextStyle) : null,
            ]}
          >
            {item.title}
          </Text>
          {item.badge != null && item.badge > 0 ? (
            <View
              style={[
                styles.menuBadge,
                isActive ? styles.menuBadgeActive : null,
              ]}
            >
              <Text
                style={[
                  styles.menuBadgeText,
                  isActive ? styles.menuBadgeTextActive : null,
                ]}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </Text>
            </View>
          ) : null}
          {item.expandable ? (
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={isActive ? P.primary : P.soft}
              style={styles.expandIcon}
            />
          ) : null}
        </TouchableOpacity>

        {item.expandable && isExpanded && item.subItems ? (
          <View style={styles.subItemsContainer}>
            {item.subItems.map((subItem) => (
              <TouchableOpacity
                key={subItem.id}
                style={styles.subMenuItem}
                onPress={subItem.action}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={subItem.icon}
                  size={16}
                  color={P.muted}
                />
                <Text style={styles.subMenuItemText}>{subItem.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
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
          <View style={[styles.menuHeader, { paddingTop: insets.top + 18 }]}>
            <View style={styles.menuHeaderTopRow}>
              <LinearGradient
                colors={[P.primary, P.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{avatarLetter}</Text>
                  </View>
                )}
              </LinearGradient>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={7} color={P.onInverse} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileHero}>
              <View style={styles.userDetails}>
                <View style={styles.identityPillRow}>
                  <View style={styles.roleChip}>
                    <Ionicons
                      name="sparkles-outline"
                      size={12}
                      color={P.onInverse}
                    />
                    <Text style={styles.roleChipText}>
                      {formatRoleLabel(effectiveRole)}
                    </Text>
                  </View>
                  {resolvedUnitLabel ? (
                    <View style={[styles.profileMetaPill, styles.profileMetaPillUnit]}>
                      <Ionicons
                        name="home-outline"
                        size={12}
                        color={P.onInverse}
                      />
                      <Text style={[styles.profileMetaPillText, styles.profileMetaPillTextUnit]}>
                        {resolvedUnitLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.userName} numberOfLines={2}>
                  {displayName}
                </Text>
                <View style={styles.profileMetaRow}>
                  {messagingUnreadCount > 0 ? (
                    <View style={styles.profileMetaPill}>
                      <Text style={styles.profileMetaPillText}>
                        {messagingUnreadCount > 99 ? "99+" : messagingUnreadCount} unread
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.menuItems}
            contentContainerStyle={styles.menuItemsContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {primaryMenuItems.map(renderMenuItem)}
          </ScrollView>

          <View style={[styles.menuFooter, { paddingBottom: footerBottomPadding }]}>
            {footerMenuItems.map(renderMenuItem)}
          </View>
        </Animated.View>
      </View>
    </Modal>
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
    backgroundColor: P.panel,
    borderTopRightRadius: 42,
    borderBottomRightRadius: 42,
    shadowColor: "#0C0F10",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 18,
  },
  menuHeader: {
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  menuHeaderTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  profileHero: {
    gap: 14,
  },
  avatarRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: P.surfaceLow,
  },
  userDetails: {
    minWidth: 0,
    paddingRight: 10,
  },
  userName: {
    fontSize: 31,
    fontWeight: "800",
    color: P.text,
    lineHeight: 34,
    marginTop: 10,
    marginBottom: 6,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: P.primaryDark,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: P.inverseSoft,
  },
  identityPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: P.onInverse,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  profileMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  profileMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.74)",
  },
  profileMetaPillUnit: {
    backgroundColor: P.inverse,
  },
  profileMetaPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: P.primary,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  profileMetaPillTextUnit: {
    color: P.onInverse,
  },
  closeButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.inverse,
  },
  menuItems: {
    flex: 1,
    paddingTop: 4,
  },
  menuItemsContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 6,
  },
  menuItemActive: {
    backgroundColor: "rgba(255,255,255,0.74)",
  },
  menuItemDanger: {
    backgroundColor: "rgba(252, 227, 224, 0.7)",
  },
  menuIconShell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuIconShellActive: {
    backgroundColor: P.surfaceHigh,
  },
  menuIconShellDanger: {
    backgroundColor: "#F8D8D3",
  },
  menuItemText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  menuItemTextActive: {
    color: P.text,
  },
  expandIcon: {
    marginLeft: "auto",
  },
  menuBadge: {
    backgroundColor: P.inverse,
    borderRadius: 999,
    minWidth: 24,
    height: 22,
    paddingHorizontal: 7,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginLeft: 8,
  },
  menuBadgeActive: {
    backgroundColor: P.primary,
  },
  menuBadgeText: {
    color: P.onInverse,
    fontSize: 10,
    fontWeight: "700" as const,
  },
  menuBadgeTextActive: {
    color: P.onInverse,
  },
  subItemsContainer: {
    backgroundColor: "rgba(255,255,255,0.56)",
    borderRadius: 24,
    marginTop: 2,
    marginBottom: 8,
    marginHorizontal: 12,
    paddingVertical: 8,
  },
  subMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  subMenuItemText: {
    fontSize: 12,
    fontWeight: "600",
    color: P.muted,
    marginLeft: 12,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  sectionSpacer: {
    height: 18,
  },
  menuFooter: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
  },
});
