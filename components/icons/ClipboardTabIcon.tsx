import React from "react";
import Svg, { Path, Rect } from "react-native-svg";

interface ClipboardTabIconProps {
  color?: string;
  focused?: boolean;
  size?: number;
}

export default function ClipboardTabIcon({
  color = "#8296C4",
  focused = false,
  size = 24,
}: ClipboardTabIconProps) {
  const iconColor = color;

  if (focused) {
    // Filled version
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Path
          d="M336 64h32a48 48 0 0148 48v320a48 48 0 01-48 48H144a48 48 0 01-48-48V112a48 48 0 0148-48h32"
          fill={iconColor}
        />
        <Rect
          x="176"
          y="32"
          width="160"
          height="64"
          rx="26.13"
          ry="26.13"
          fill={iconColor}
          stroke={iconColor}
          strokeLinejoin="round"
          strokeWidth="32"
        />
      </Svg>
    );
  }

  // Outline version
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path
        d="M336 64h32a48 48 0 0148 48v320a48 48 0 01-48 48H144a48 48 0 01-48-48V112a48 48 0 0148-48h32"
        fill="none"
        stroke={iconColor}
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Rect
        x="176"
        y="32"
        width="160"
        height="64"
        rx="26.13"
        ry="26.13"
        fill="none"
        stroke={iconColor}
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </Svg>
  );
}
