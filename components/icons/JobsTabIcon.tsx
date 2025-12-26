import React from "react";
import Svg, { Path } from "react-native-svg";

interface JobsTabIconProps {
  color?: string;
  focused?: boolean;
  size?: number;
}

export default function JobsTabIcon({
  color = "#8296C4",
  focused = false,
  size = 24,
}: JobsTabIconProps) {
  const iconColor = color;

  if (focused) {
    // Filled version
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Path
          d="M358.62 129.28l-54.79-54.79a48 48 0 00-10.11-7.37A32 32 0 00272 32h-96a32 32 0 00-32 32v384a32 32 0 0032 32h224a32 32 0 0032-32V166.48a32 32 0 00-9.5-22.82 31.33 31.33 0 00-9.26-6.09 47.42 47.42 0 00-10.62-8.29zM256 56v120h120l-120-120z"
          fill={iconColor}
        />
      </Svg>
    );
  }

  // Outline version
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path
        d="M416 221.25V416a48 48 0 01-48 48H144a48 48 0 01-48-48V96a48 48 0 0148-48h98.75a32 32 0 0122.62 9.37l141.26 141.26a32 32 0 019.37 22.62z"
        fill="none"
        stroke={iconColor}
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M256 56v120a32 32 0 0032 32h120"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </Svg>
  );
}
