import React from "react";
import Svg, { Rect } from "react-native-svg";

interface GridTabIconProps {
  color?: string;
  focused?: boolean;
  size?: number;
}

export default function GridTabIcon({
  color = "#8296C4",
  focused = false,
  size = 24,
}: GridTabIconProps) {
  const iconColor = color;

  if (focused) {
    // Filled version
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Rect x="48" y="48" width="176" height="176" rx="20" ry="20" fill={iconColor} />
        <Rect x="288" y="48" width="176" height="176" rx="20" ry="20" fill={iconColor} />
        <Rect x="48" y="288" width="176" height="176" rx="20" ry="20" fill={iconColor} />
        <Rect x="288" y="288" width="176" height="176" rx="20" ry="20" fill={iconColor} />
      </Svg>
    );
  }

  // Outline version
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Rect
        x="48"
        y="48"
        width="176"
        height="176"
        rx="20"
        ry="20"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Rect
        x="288"
        y="48"
        width="176"
        height="176"
        rx="20"
        ry="20"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Rect
        x="48"
        y="288"
        width="176"
        height="176"
        rx="20"
        ry="20"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Rect
        x="288"
        y="288"
        width="176"
        height="176"
        rx="20"
        ry="20"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </Svg>
  );
}
