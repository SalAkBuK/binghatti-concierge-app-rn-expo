import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonBlockProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonBlockProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 1350,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    );
  }, [progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.35, 0.72, 0.35]),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [-SCREEN_WIDTH * 0.72, SCREEN_WIDTH * 0.72],
        ),
      },
    ],
  }));

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <View style={styles.baseTone} />
      <Animated.View pointerEvents="none" style={[styles.shimmerWrap, shimmerStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.88)', 'rgba(255,255,255,0)']}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmer}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#E6ECEF',
  },
  baseTone: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#DDE6EA',
  },
  shimmerWrap: {
    ...StyleSheet.absoluteFillObject,
    width: '58%',
  },
  shimmer: {
    flex: 1,
  },
});
