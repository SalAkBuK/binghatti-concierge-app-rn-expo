import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import LottieView from "lottie-react-native";

interface AnimatedBellIconProps {
  size?: number;
  color?: string;
  hasUnreadNotifications: boolean;
  onAnimationComplete?: () => void;
}

export function AnimatedBellIcon({
  size = 24,
  color = "#000",
  hasUnreadNotifications,
  onAnimationComplete,
}: AnimatedBellIconProps) {
  const lottieRef = useRef<LottieView>(null);
  const animationIntervalRef =
    useRef<ReturnType<typeof setInterval> | null>(null);
  const dotScale = useSharedValue(hasUnreadNotifications ? 1 : 0);
  const dotOpacity = useSharedValue(hasUnreadNotifications ? 1 : 0);

  // Green dot animations
  const animateDotAppear = () => {
    dotScale.value = withSequence(
      withTiming(1.3, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
    dotOpacity.value = withTiming(1, { duration: 300 });
  };

  const animateDotDisappear = () => {
    dotScale.value = withTiming(0, { duration: 200 });
    dotOpacity.value = withTiming(0, { duration: 200 });
  };

  // Continuous pulse effect for unread notifications
  const startPulseAnimation = () => {
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  };

  const stopPulseAnimation = () => {
    // Cancel the repeat animation by setting a final value
    dotScale.value = dotScale.value;
  };

  // Effect to handle notification state changes
  useEffect(() => {
    if (hasUnreadNotifications) {
      // Play initial Lottie animation
      lottieRef.current?.play();
      animateDotAppear();

      // Start subtle pulse after initial animation
      setTimeout(() => {
        startPulseAnimation();
      }, 1500);

      // Set up interval to repeat bell animation every 4 seconds
      animationIntervalRef.current = setInterval(() => {
        lottieRef.current?.reset();
        lottieRef.current?.play();
      }, 4000);
    } else {
      // Clear interval
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }

      // Stop animation and hide dot
      lottieRef.current?.reset();
      stopPulseAnimation();
      animateDotDisappear();
    }

    // Cleanup on unmount
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [hasUnreadNotifications]);

  // Green dot animation style
  const dotAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: dotScale.value }],
      opacity: dotOpacity.value,
    } as ViewStyle;
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        ref={lottieRef}
        source={require("../../assets/lottie/BellIcon.json")}
        style={{ width: size, height: size }}
        autoPlay={false}
        loop={false}
        onAnimationFinish={() => {
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }}
      />

      {/* Animated Green Dot */}
      <Animated.View style={[styles.notificationDot, dotAnimatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#fff",
  },
});
