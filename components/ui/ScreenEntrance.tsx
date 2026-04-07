import React from 'react';
import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

type ScreenEntranceProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function ScreenEntrance({ children, style }: ScreenEntranceProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(360).delay(40)}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </Animated.View>
  );
}
