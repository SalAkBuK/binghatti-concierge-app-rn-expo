import React from "react";
import Svg, { Rect, Path } from "react-native-svg";

interface RequestsTabIconProps {
  color?: string;
  focused?: boolean;
}

export default function RequestsTabIcon({
  color = "#8296C4",
  focused = false,
}: RequestsTabIconProps) {
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

      {/* Icon positioned in center */}
      <Path
        d="M11.325,2.25a9.073,9.073,0,0,0-7.749,13.8.237.237,0,0,1,.035.168l-.421,2.44a.7.7,0,0,0,.8.807s1.715-.283,2.469-.4a.223.223,0,0,1,.16.031,9.075,9.075,0,1,0,4.7-16.836ZM4.733,17.923l1.5-.246a1.623,1.623,0,0,1,1.116.219,7.691,7.691,0,1,0-2.587-2.584,1.629,1.629,0,0,1,.223,1.138l-.254,1.473Z"
        transform={`translate(${(containerWidth - 18) / 2 - 2}, ${(containerHeight - 18) / 2 - 2})`}
        fill={iconFill}
        stroke={iconColor}
        strokeWidth="0.5"
        fillRule="evenodd"
      />
    </Svg>
  );
}
