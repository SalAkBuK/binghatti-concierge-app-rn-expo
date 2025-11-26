import React from "react";
import Svg, { Path, Circle } from "react-native-svg";

interface MoreTabIconProps {
  color?: string;
  focused?: boolean;
  size?: number;
}

export default function MoreTabIcon({
  color = "#8296C4",
  focused = false,
  size = 24,
}: MoreTabIconProps) {
  const iconColor = color;

  if (focused) {
    // Filled version - ellipsis-horizontal-circle
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Path
          d="M256 48C141.13 48 48 141.13 48 256s93.13 208 208 208 208-93.13 208-208S370.87 48 256 48zm-90 234a26 26 0 1126-26 26 26 0 01-26 26zm90 0a26 26 0 1126-26 26 26 0 01-26 26zm90 0a26 26 0 1126-26 26 26 0 01-26 26z"
          fill={iconColor}
        />
      </Svg>
    );
  }

  // Outline version
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Circle
        cx="256"
        cy="256"
        r="208"
        fill="none"
        stroke={iconColor}
        strokeMiterlimit="10"
        strokeWidth="32"
      />
      <Circle cx="166" cy="256" r="18" fill={iconColor} />
      <Circle cx="256" cy="256" r="18" fill={iconColor} />
      <Circle cx="346" cy="256" r="18" fill={iconColor} />
    </Svg>
  );
}
