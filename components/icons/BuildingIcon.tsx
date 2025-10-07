import React from "react";
import Svg, { Rect, Path } from "react-native-svg";

interface BuildingIconProps {
  size?: number;
  color?: string;
}

export default function BuildingIcon({
  size = 22,
  color = "#fff",
}: BuildingIconProps) {
  const aspectRatio = 46 / 44; // height/width ratio from XD specs
  const width = size;
  const height = size * aspectRatio;

  return (
    <Svg width={width} height={height} viewBox="0 0 44 46">
      <Rect width="44" height="46" rx="10" fill={color} opacity="0.17" />
      <Path
        d="M9.132,8.014h1.176a.882.882,0,0,0,0-1.764H9.132a.882.882,0,0,0,0,1.764Zm0,4.7h1.176a.882.882,0,1,0,0-1.764H9.132a.882.882,0,1,0,0,1.764Zm5.879-4.7h1.176a.882.882,0,0,0,0-1.764H15.01a.882.882,0,1,0,0,1.764Zm0,4.7h1.176a.882.882,0,1,0,0-1.764H15.01a.882.882,0,1,0,0,1.764Z"
        transform="translate(9.341 10.188)"
        fill={color}
        fillRule="evenodd"
      />
      <Path
        d="M21.994,22.558H23.4a.846.846,0,1,1,0,1.692H3.1a.846.846,0,1,1,0-1.692h1.41V5.353a3.1,3.1,0,0,1,3.1-3.1H18.891a3.1,3.1,0,0,1,3.1,3.1Zm-5.641,0H20.3V5.353a1.413,1.413,0,0,0-1.41-1.41H7.609A1.413,1.413,0,0,0,6.2,5.353V22.558h3.949V17.763a1.976,1.976,0,0,1,1.974-1.974h2.256a1.976,1.976,0,0,1,1.974,1.974Zm-1.692,0V17.763a.282.282,0,0,0-.282-.282H12.122a.282.282,0,0,0-.282.282v4.795Z"
        transform="translate(8.75 9.75)"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
}
