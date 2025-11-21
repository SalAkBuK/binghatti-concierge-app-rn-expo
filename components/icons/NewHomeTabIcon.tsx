import React from "react";
import Svg, { Path } from "react-native-svg";

interface NewHomeTabIconProps {
  color?: string;
  focused?: boolean;
}

export default function NewHomeTabIcon({
  color = "#8296C4",
  focused = false,
}: NewHomeTabIconProps) {
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
        d="M19.042,7.579,13.753,3.044a3.381,3.381,0,0,0-4.287,0L4.177,7.579a2.613,2.613,0,0,0-.917,2v8.669a2.624,2.624,0,0,0,2.626,2.626H17.342a2.624,2.624,0,0,0,2.626-2.626V9.574a2.628,2.628,0,0,0-.917-2ZM13.753,19.436h-4.3V15.379a1.194,1.194,0,0,1,1.193-1.193h1.909a1.194,1.194,0,0,1,1.193,1.193Zm4.774-1.193a1.194,1.194,0,0,1-1.193,1.193H15.185V15.379a2.624,2.624,0,0,0-2.626-2.626H10.65a2.624,2.624,0,0,0-2.626,2.626v4.058H5.876a1.194,1.194,0,0,1-1.193-1.193V9.574a1.185,1.185,0,0,1,.42-.907l5.289-4.535a1.863,1.863,0,0,1,2.425,0l5.289,4.535a1.185,1.185,0,0,1,.42.907v8.669Z"
        transform={`translate(${(containerWidth - 18) / 2 - 3}, ${(containerHeight - 18) / 2 - 1.5})`}
        fill={iconFill}
        stroke={iconColor}
        strokeWidth="0.5"
      />
    </Svg>
  );
}
