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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface HeaderBarProps {
  title?: string;
  showTitle?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  hasUnreadNotifications?: boolean;
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
  notificationRoute?: string;
  notificationParams?: Record<string, any>;
}

export function HeaderBar({
  title,
  showTitle = true,
  showMenu = true,
  showNotifications = true,
  hasUnreadNotifications = false,
  onMenuPress,
  onNotificationPress,
  backgroundColor = "transparent",
  textColor = "#000",
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
        if (notificationParams) {
          router.push({ pathname: notificationRoute, params: notificationParams });
        } else {
          router.push(notificationRoute);
        }
      } else {
        router.push("/(modals)/notifications-hub");
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
        </TouchableOpacity>
      ) : (
        <View style={[styles.menuButton, { marginLeft: spacing.menuMargin }]} />
      )}

      {/* Title */}
      {showTitle && title && (
        <Text style={[styles.headerTitle, { color: textColor }]}>{title}</Text>
      )}

      {/* Notification Button */}
      {showNotifications ? (
        <TouchableOpacity
          style={[styles.notificationButton, { marginRight: spacing.notificationMargin }]}
          onPress={handleNotificationPress}
        >
          <AnimatedBellIcon
            size={24}
            color={textColor}
            hasUnreadNotifications={hasUnreadNotifications}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
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
