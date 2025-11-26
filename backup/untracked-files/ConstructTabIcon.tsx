import React from "react";
import Svg, { Path } from "react-native-svg";

interface ConstructTabIconProps {
  color?: string;
  focused?: boolean;
  size?: number;
}

export default function ConstructTabIcon({
  color = "#8296C4",
  focused = false,
  size = 24,
}: ConstructTabIconProps) {
  const iconColor = color;

  if (focused) {
    // Filled version
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Path
          d="M497.14 111.38l-96.53-58.31a16 16 0 00-15.89-.23L256 116.31a16 16 0 00-8.13 13.93v141.52L132.38 340.08l-31.76-19.17a16 16 0 00-16.26.37L14 366.16A16 16 0 007 383.91l53.88 109.42a16 16 0 0021.54 6.92l80.38-44.87a16 16 0 007.94-13.91v-80.4l75.56-43.07a168.14 168.14 0 0010.57 13.75c28.62 33.09 68.28 51.39 111.67 51.39a18.5 18.5 0 0018.36-18.5v-10.27l87.82-50.05a16 16 0 008.24-14V128.07a16 16 0 00-7.82-13.81z"
          fill={iconColor}
        />
        <Path
          d="M312.54 285.92a134.29 134.29 0 01-27.78-48.14l68.28-38.91a16 16 0 008-13.86v-78.74l85 51.33v94.42z"
          fill={iconColor}
        />
      </Svg>
    );
  }

  // Outline version
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path
        d="M393.72 242.77L378 255.49c-10.44 8.33-23.44 12.51-37.6 12.51-38 0-69.82-31.39-69.82-69.69a68.46 68.46 0 0114.22-42.11l18.67-24.78"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M321.14 154.41L275.4 163.5a47.88 47.88 0 00-28.15 17l-16.45 21.79-47.32-56.37 37.83-50.07a47.88 47.88 0 0133.57-18.28l50.55-3.75a47.88 47.88 0 0148.75 41.15l5.32 39.63"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M140.27 285.08L97.15 337.4a47.88 47.88 0 00-10.18 38.67l8.13 55.27a47.88 47.88 0 0041.07 40.87l55.3 7.95a47.88 47.88 0 0038.6-10.24l52.31-43.07"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M330.43 164.86L177.58 341.64"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M475.86 112.64l-23.78-15a8 8 0 00-9.11.52l-84.4 67.62a8 8 0 00-1.1 11.15l21.88 27.37a8 8 0 0011.14 1.28l72.54-53.79a48.06 48.06 0 0112.83-65.15z"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </Svg>
  );
}
