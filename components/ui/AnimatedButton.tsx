import React from "react";
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  scaleValue?: number;
  duration?: number;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function AnimatedButton({
  children,
  style,
  scaleValue = 0.95,
  duration = 150,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (event: any) => {
    scale.value = withTiming(scaleValue, {
      duration,
      easing: Easing.inOut(Easing.ease),
    });
    onPressIn?.(event);
  };

  const handlePressOut = (event: any) => {
    scale.value = withTiming(1, {
      duration,
      easing: Easing.inOut(Easing.ease),
    });
    onPressOut?.(event);
  };

  return (
    <AnimatedTouchable
      {...props}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      {children}
    </AnimatedTouchable>
  );
}
