import React from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { SkeletonBlock } from './SkeletonBlock';

interface SkeletonTextProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonText({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonTextProps) {
  return (
    <SkeletonBlock
      width={width}
      height={height}
      borderRadius={borderRadius}
      style={style}
    />
  );
}
