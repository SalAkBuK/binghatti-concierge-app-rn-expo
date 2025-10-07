import React from "react";
import Svg, { Path } from "react-native-svg";

interface ChevronIconProps {
  size?: number;
  color?: string;
  opacity?: number;
}

export default function ChevronIcon({
  size = 11,
  color = "#000000",
  opacity = 0.5,
}: ChevronIconProps) {
  // Original SVG dimensions: width="5.935" height="10.791"
  const aspectRatio = 10.791 / 5.935; // height/width ratio from SVG
  const width = size * (5.935 / 10.791); // Scale to match height-based sizing
  const height = size;

  return (
    <Svg width={width} height={height} viewBox="0 0 5.935 10.791">
      <Path
        id="Path_20"
        d="M.2.157a.574.574,0,0,1,.79,0l4.62,4.459a1.052,1.052,0,0,1,0,1.525L.954,10.633a.574.574,0,0,1-.784.005A.526.526,0,0,1,.165,9.87L4.423,5.76a.526.526,0,0,0,0-.763L.2.92A.526.526,0,0,1,.2.157"
        transform="translate(0)"
        fill={color}
        fillRule="evenodd"
        opacity={opacity}
      />
    </Svg>
  );
}