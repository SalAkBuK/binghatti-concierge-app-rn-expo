import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { AnimatedButton } from "../ui/AnimatedButton";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_WIDTH = (SCREEN_WIDTH * 0.9) / 2;

interface NotificationsTabBarProps {
  activeTab: "notifications" | "notices";
  onTabChange: (tab: "notifications" | "notices") => void;
  unreadCount?: number;
  activeNoticesCount?: number;
}

export function NotificationsTabBar({
  activeTab,
  onTabChange,
  unreadCount = 0,
  activeNoticesCount = 0,
}: NotificationsTabBarProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withTiming(activeTab === "notices" ? TAB_WIDTH : 0, {
      duration: 250,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [activeTab, translateX]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Background Slider */}
      <Animated.View style={[styles.slider, indicatorStyle]} />

      {/* Notifications Tab */}
      <AnimatedButton
        style={styles.tab}
        onPress={() => onTabChange("notifications")}
      >
        <View style={styles.tabContent}>
          <Text
            style={[
              styles.tabText,
              activeTab === "notifications" && styles.activeTabText,
            ]}
          >
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </AnimatedButton>

      {/* Notices Tab */}
      <AnimatedButton style={styles.tab} onPress={() => onTabChange("notices")}>
        <View style={styles.tabContent}>
          <Text
            style={[
              styles.tabText,
              activeTab === "notices" && styles.activeTabText,
            ]}
          >
            Notices
          </Text>
          {activeNoticesCount > 0 && (
            <View style={[styles.badge, styles.noticesBadge]}>
              <Text style={styles.badgeText}>
                {activeNoticesCount > 99 ? "99+" : activeNoticesCount}
              </Text>
            </View>
          )}
        </View>
      </AnimatedButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    position: "relative",
  },
  slider: {
    position: "absolute",
    top: 4,
    left: 4,
    width: TAB_WIDTH - 8,
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#1F2937",
  },
  badge: {
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  noticesBadge: {
    backgroundColor: "#F59E0B",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
});
