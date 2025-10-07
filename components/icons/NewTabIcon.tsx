import React from "react";
import Svg, { Path, Line } from "react-native-svg";

interface NewTabIconProps {
  color?: string;
  focused?: boolean;
}

export default function NewTabIcon({
  color = "#8296C4",
  focused = false,
}: NewTabIconProps) {
  // Active state: 70x54 background, inactive state: 54x39 background
  const containerWidth = focused ? 70 : 54;
  const containerHeight = focused ? 64 : 39;

  // Icon colors based on state
  const iconColor = focused ? "#336BE3" : "#8296C4";
  const iconFill = focused ? "#356FEC" : "#8296C4";

  return (
    <Svg
      width={containerWidth}
      height={containerHeight}
      viewBox={`0 0 ${containerWidth} ${containerHeight}`}
    >
      {/* Background - only show for active state */}
      {focused && (
        <Path
          d={`M 6 10 L ${containerWidth - 6} 10 Q ${containerWidth} 10 ${containerWidth} 16 L ${containerWidth} ${containerHeight - 6} Q ${containerWidth} ${containerHeight} ${containerWidth - 6} ${containerHeight} L 6 ${containerHeight} Q 0 ${containerHeight} 0 ${containerHeight - 6} L 0 16 Q 0 10 6 10 Z`}
          fill="#EFF6FF"
          opacity="1"
        />
      )}

      {/* Plus icon positioned in center */}
      <Line
        x1={containerWidth / 2 - 8}
        y1={containerHeight / 2}
        x2={containerWidth / 2 + 8}
        y2={containerHeight / 2}
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <Line
        x1={containerWidth / 2}
        y1={containerHeight / 2 - 8}
        x2={containerWidth / 2}
        y2={containerHeight / 2 + 8}
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}
