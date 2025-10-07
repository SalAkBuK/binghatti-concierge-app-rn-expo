import React from "react";
import Svg, { Rect, Path } from "react-native-svg";

interface NewHomeIconProps {
  size?: number;
  color?: string;
}

export default function NewHomeIcon({
  size = 22,
  color = "#fff",
}: NewHomeIconProps) {
  const aspectRatio = 46 / 44; // height/width ratio to match XD specs
  const width = size;
  const height = size * aspectRatio;

  return (
    <Svg width={width} height={height} viewBox="0 0 44 46">
      <Rect width="44" height="46" rx="10" fill={color} opacity="0.17" />
      <Path
        d="M19.042,7.579,13.753,3.044a3.381,3.381,0,0,0-4.287,0L4.177,7.579a2.613,2.613,0,0,0-.917,2v8.669a2.624,2.624,0,0,0,2.626,2.626H17.342a2.624,2.624,0,0,0,2.626-2.626V9.574a2.628,2.628,0,0,0-.917-2ZM13.753,19.436h-4.3V15.379a1.194,1.194,0,0,1,1.193-1.193h1.909a1.194,1.194,0,0,1,1.193,1.193Zm4.774-1.193a1.194,1.194,0,0,1-1.193,1.193H15.185V15.379a2.624,2.624,0,0,0-2.626-2.626H10.65a2.624,2.624,0,0,0-2.626,2.626v4.058H5.876a1.194,1.194,0,0,1-1.193-1.193V9.574a1.185,1.185,0,0,1,.42-.907l5.289-4.535a1.863,1.863,0,0,1,2.425,0l5.289,4.535a1.185,1.185,0,0,1,.42.907v8.669Z"
        transform="translate(11 11)"
        fill={color}
        stroke={color}
        strokeWidth="0.5"
      />
    </Svg>
  );
}
