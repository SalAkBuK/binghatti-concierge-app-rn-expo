import React from "react";
import Svg, { Path, Line } from "react-native-svg";

interface BusinessTabIconProps {
  color?: string;
  focused?: boolean;
  size?: number;
}

export default function BusinessTabIcon({
  color = "#8296C4",
  focused = false,
  size = 24,
}: BusinessTabIconProps) {
  const iconColor = color;

  if (focused) {
    // Filled version
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Path
          d="M432 176H320V64a48 48 0 00-48-48H80a48 48 0 00-48 48v416h448V224a48 48 0 00-48-48zM104 392H80v-24h24zm0-80H80v-24h24zm0-80H80v-24h24zm0-80H80v-24h24zm64 240h-24v-24h24zm0-80h-24v-24h24zm0-80h-24v-24h24zm0-80h-24v-24h24zm64 240h-24v-24h24zm0-80h-24v-24h24zm0-80h-24v-24h24zm0-80h-24v-24h24zm176 296h-24v-24h24zm0-80h-24v-24h24zm0-80h-24v-24h24z"
          fill={iconColor}
        />
      </Svg>
    );
  }

  // Outline version
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Line
        x1="176"
        y1="416"
        x2="176"
        y2="480"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M80 32h192a32 32 0 0132 32v416a0 0 0 01-0 0H48a0 0 0 01-0-0V64a32 32 0 0132-32z"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M320 192h112a32 32 0 0132 32v256a0 0 0 01-0 0H320a0 0 0 01-0-0V192z"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Line
        x1="112"
        y1="112"
        x2="144"
        y2="112"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Line
        x1="208"
        y1="112"
        x2="240"
        y2="112"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Line
        x1="112"
        y1="208"
        x2="144"
        y2="208"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Line
        x1="208"
        y1="208"
        x2="240"
        y2="208"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Line
        x1="112"
        y1="304"
        x2="144"
        y2="304"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Line
        x1="208"
        y1="304"
        x2="240"
        y2="304"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Line
        x1="384"
        y1="256"
        x2="416"
        y2="256"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Line
        x1="384"
        y1="352"
        x2="416"
        y2="352"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
    </Svg>
  );
}
