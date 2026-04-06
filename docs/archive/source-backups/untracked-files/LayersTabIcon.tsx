import React from "react";
import Svg, { Path } from "react-native-svg";

interface LayersTabIconProps {
  color?: string;
  focused?: boolean;
  size?: number;
}

export default function LayersTabIcon({
  color = "#8296C4",
  focused = false,
  size = 24,
}: LayersTabIconProps) {
  const iconColor = color;

  if (focused) {
    // Filled version
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Path
          d="M256 256c-13.47 0-26.94-2.39-37.44-7.17l-148-67.49C63.79 178.26 48 169.25 48 152.24s15.79-26 22.58-29.12l148-67.48c20.99-9.57 53.87-9.57 74.86 0l148 67.48C448.21 126.22 464 135.23 464 152.24s-15.79 26-22.58 29.12l-148 67.48c-10.5 4.78-23.97 7.16-37.42 7.16z"
          fill={iconColor}
        />
        <Path
          d="M464 249.93l-37.22-17.01-117.34 53.55c-20.99 9.57-53.87 9.57-74.86 0l-117.34-53.55L80 249.93c-6.79 3.1-32 13.11-32 35.09s25.21 31.99 32 35.09l136.56 62.32c10.5 4.78 23.97 7.17 37.44 7.17s26.94-2.39 37.44-7.17L428 320.11c6.79-3.1 32-13.11 32-35.09s-25.21-31.99-32-35.09z"
          fill={iconColor}
        />
        <Path
          d="M464 353.93l-37.22-17.01-117.34 53.55c-20.99 9.57-53.87 9.57-74.86 0l-117.34-53.55L80 353.93c-6.79 3.1-32 13.11-32 35.09s25.21 31.99 32 35.09l136.56 62.32c10.5 4.78 23.97 7.17 37.44 7.17s26.94-2.39 37.44-7.17L428 424.11c6.79-3.1 32-13.11 32-35.09s-25.21-31.99-32-35.09z"
          fill={iconColor}
        />
      </Svg>
    );
  }

  // Outline version
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path
        d="M434.8 137.65l-149.36-68.1c-16.19-7.4-42.69-7.4-58.88 0L77.3 137.65c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.52-8 17.52-21.09-.08-29.09z"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M160 308.52l-83 38c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.6-8 17.6-21.09 0-29.09l-83-38"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M160 204.48l-83 38c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.6-8 17.6-21.09 0-29.09l-83-38"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </Svg>
  );
}
