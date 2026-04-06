import React from 'react';
import { Dimensions, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { SkeletonBlock } from './SkeletonBlock';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonCardProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonCard({
  width = SCREEN_WIDTH * 0.9,
  height = 200,
  borderRadius = 16,
  style,
}: SkeletonCardProps) {
  return (
    <SkeletonBlock
      width={width}
      height={height}
      borderRadius={borderRadius}
      style={style}
    />
  );
}
