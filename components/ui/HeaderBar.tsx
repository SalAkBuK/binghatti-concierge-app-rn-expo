import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedBellIcon } from "./AnimatedBellIcon";
import { useMessaging } from "../../lib/context/messaging-context";

type RouterPushInput = Parameters<typeof router.push>[0];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HeaderBarProps {
  title?: string;
  subtitle?: string;
  showTitle?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  hasUnreadNotifications?: boolean;
  messagingUnreadCount?: number;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
  style?: any;
  menuMargin?: number;
  notificationMargin?: number;
  horizontalPadding?: number;
  showSideMenu?: boolean;
  onSideMenuToggle?: (isVisible: boolean) => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
  notificationRoute?: RouterPushInput | string;
  notificationParams?: Record<string, any>;
}

export function HeaderBar({
  title,
  showTitle = true,
  showMenu = true,
  showNotifications = true,
  hasUnreadNotifications = false,
  messagingUnreadCount = 0,
  onMenuPress,
  onNotificationPress,
  backgroundColor = "transparent",
  textColor = "#000",
  subtitle,
  style,
  menuMargin,
  notificationMargin,
  horizontalPadding,
  showSideMenu = false,
  onSideMenuToggle,
  showBackButton = false,
  onBackPress,
  notificationRoute,
  notificationParams,
}: HeaderBarProps) {
  const insets = useSafeAreaInsets();
  const messaging = useMessaging();
  const resolvedMessagingUnread = messagingUnreadCount > 0 ? messagingUnreadCount : messaging.totalUnreadCount;

  // Calculate responsive spacing based on screen width
  const getResponsiveSpacing = () => {
    if (SCREEN_WIDTH <= 375) {
      // iPhone SE, small phones
      return {
        menuMargin: menuMargin ?? 15,
        notificationMargin: notificationMargin ?? 15,
        horizontalPadding: horizontalPadding ?? 5,
      };
    } else if (SCREEN_WIDTH <= 414) {
      // iPhone 11/12/13, standard phones
      return {
        menuMargin: menuMargin ?? -20,
        notificationMargin: notificationMargin ?? -20,
        horizontalPadding: horizontalPadding ?? 10,
      };
    } else {
      // Large phones, tablets
      return {
        menuMargin: menuMargin ?? 25,
        notificationMargin: notificationMargin ?? 25,
        horizontalPadding: horizontalPadding ?? 15,
      };
    }
  };

  const spacing = getResponsiveSpacing();

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      if (notificationRoute) {
        if (
          notificationParams &&
          typeof notificationRoute === "string"
        ) {
          router.push({
            pathname: notificationRoute,
            params: notificationParams,
          } as RouterPushInput);
        } else {
          router.push(notificationRoute as RouterPushInput);
        }
      } else {
        router.push("/(modals)/notifications-hub" as RouterPushInput);
      }
    }
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    } else if (onSideMenuToggle) {
      onSideMenuToggle(!showSideMenu);
    } else {
      // Default menu action - you can implement drawer/menu logic here
      console.log("Menu pressed");
    }
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[
        styles.header,
        {
          paddingTop: Math.max(insets.top, 20),
          backgroundColor,
          paddingHorizontal: spacing.horizontalPadding,
        },
        style,
      ]}
    >
      {/* Menu/Back Button */}
      {showBackButton ? (
        <TouchableOpacity style={[styles.menuButton, { marginLeft: spacing.menuMargin }]} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
      ) : showMenu ? (
        <TouchableOpacity style={[styles.menuButton, { marginLeft: spacing.menuMargin }]} onPress={handleMenuPress}>
          <Ionicons name="menu" size={24} color={textColor} />
          {resolvedMessagingUnread > 0 && (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>
                {resolvedMessagingUnread > 9 ? "9+" : resolvedMessagingUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={[styles.menuButton, { marginLeft: spacing.menuMargin }]} />
      )}

      {/* Title */}
      <View style={styles.titleContainer}>
        {showTitle && title ? (
          <>
            <Text style={[styles.headerTitle, { color: textColor }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.headerSubtitle, { color: textColor }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </>
        ) : null}
      </View>

      {/* Notification Button */}
      {showNotifications ? (
        <TouchableOpacity
          style={[styles.notificationButton, { marginRight: spacing.notificationMargin }]}
          onPress={handleNotificationPress}
        >
          <AnimatedBellIcon
            size={24}
            color={textColor}
            hasUnreadNotifications={hasUnreadNotifications || resolvedMessagingUnread > 0}
          />
        </TouchableOpacity>
      ) : (
        <View style={[styles.notificationButton, { marginRight: spacing.notificationMargin }]} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 30,
  },
  menuButton: {
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  menuBadge: {
    position: "absolute",
    top: 4,
    right: 2,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  menuBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700" as const,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    opacity: 0.75,
  },
  notificationButton: {
    padding: 8,
    position: "relative",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
