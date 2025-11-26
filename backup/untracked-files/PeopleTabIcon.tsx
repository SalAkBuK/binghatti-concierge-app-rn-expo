import React from "react";
import Svg, { Path, Circle } from "react-native-svg";

interface PeopleTabIconProps {
  color?: string;
  focused?: boolean;
  size?: number;
}

export default function PeopleTabIcon({
  color = "#8296C4",
  focused = false,
  size = 24,
}: PeopleTabIconProps) {
  const iconColor = color;

  if (focused) {
    // Filled version
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Circle cx="152" cy="184" r="72" fill={iconColor} />
        <Path
          d="M234 296c-28.16-14.3-59.24-20-82-20-44.58 0-136 27.34-136 82v42h150v-16.07c0-19 8-38.05 22-53.93 11.17-12.68 26.81-24.45 46-34z"
          fill={iconColor}
        />
        <Path
          d="M340 288c-52.07 0-156 32.16-156 96v48h312v-48c0-63.84-103.93-96-156-96z"
          fill={iconColor}
        />
        <Circle cx="340" cy="168" r="88" fill={iconColor} />
      </Svg>
    );
  }

  // Outline version
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Path
        d="M402 168c-2.93 40.67-33.1 72-72 72s-69.07-31.33-72-72c-3.1-42.83 33.55-72 72-72s75.1 29.17 72 72z"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M184 256c-2.93 40.67-33.1 72-72 72s-69.07-31.33-72-72c-3.1-42.83 33.55-72 72-72s75.1 29.17 72 72z"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M336 304c-65.17 0-127.84 32.37-143.54 95.41-2.08 8.34 3.15 16.59 11.72 16.59h263.65c8.57 0 13.77-8.25 11.72-16.59C463.85 336.37 401.18 304 336 304z"
        fill="none"
        stroke={iconColor}
        strokeMiterlimit="10"
        strokeWidth="32"
      />
      <Path
        d="M200 185.94c-2.34 32.48-26.72 58.06-58 58.06s-55.66-25.58-58-58.06c-2.53-34.75 26.69-57.94 58-57.94s60.53 23.19 58 57.94z"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
      />
      <Path
        d="M98 358c-24.83 0-68.17 14.2-84 53a12 12 0 0011.71 17h84.29"
        fill="none"
        stroke={iconColor}
        strokeLinecap="round"
        strokeMiterlimit="10"
        strokeWidth="32"
      />
    </Svg>
  );
}
