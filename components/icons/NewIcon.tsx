import React from "react";
import Svg, { Line } from "react-native-svg";

interface NewIconProps {
  size?: number;
  color?: string;
}

export default function NewIcon({ size = 18, color = "#fff" }: NewIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      {/* Plus icon */}
      <Line
        x1={1}
        y1={9}
        x2={17}
        y2={9}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <Line
        x1={9}
        y1={1}
        x2={9}
        y2={17}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </Svg>
  );
}
