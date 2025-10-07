import React from "react";
import Svg, { Rect, Path } from "react-native-svg";

interface ProfileIconProps {
  size?: number;
  color?: string;
  focused?: boolean;
}

export default function ProfileIcon({
  size = 18,
  color = "#8296C4",
  focused = false,
}: ProfileIconProps) {
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
        d="M133.112,2008.112a3.645,3.645,0,1,1,3.662-3.645,3.657,3.657,0,0,1-3.662,3.645m3.441.613a5.448,5.448,0,0,0,1.988-5.106,5.5,5.5,0,0,0-10.922.848,5.443,5.443,0,0,0,2.052,4.258,8.687,8.687,0,0,0-5.668,7.488.922.922,0,0,0,.915,1.01.9.9,0,0,0,.9-.812,7.339,7.339,0,0,1,14.577,0,.9.9,0,0,0,.9.812.922.922,0,0,0,.914-1.01,8.684,8.684,0,0,0-5.668-7.488"
        transform={`translate(${containerWidth / 2 - 9.112 - 123.999}, ${containerHeight / 2 - 9.112 - 1999})`}
        fill={iconFill}
        fillRule="evenodd"
      />
    </Svg>
  );
}
