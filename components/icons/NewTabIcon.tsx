import React from "react";

import TenantTabIcon from "./TenantTabIcon";

interface NewTabIconProps {
  color?: string;
  focused?: boolean;
}

export default function NewTabIcon({
  color = "#8A969B",
  focused = false,
}: NewTabIconProps) {
  return (
    <TenantTabIcon
      icon="add"
      activeIcon="add"
      color={color}
      focused={focused}
      accent
    />
  );
}
