import React from "react";
import Svg, { Path } from "react-native-svg";

interface RequestsIconProps {
  size?: number;
  color?: string;
}

export default function RequestsIcon({
  size = 18,
  color = "#fff",
}: RequestsIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18.651 18.651">
      <Path
        d="M11.325,2.25a9.073,9.073,0,0,0-7.749,13.8.237.237,0,0,1,.035.168l-.421,2.44a.7.7,0,0,0,.8.807s1.715-.283,2.469-.4a.223.223,0,0,1,.16.031,9.075,9.075,0,1,0,4.7-16.836ZM4.733,17.923l1.5-.246a1.623,1.623,0,0,1,1.116.219,7.691,7.691,0,1,0-2.587-2.584,1.629,1.629,0,0,1,.223,1.138l-.254,1.473Z"
        transform="translate(-2 -2)"
        fill={color}
        stroke={color}
        strokeWidth="0.5"
        fillRule="evenodd"
      />
    </Svg>
  );
}
