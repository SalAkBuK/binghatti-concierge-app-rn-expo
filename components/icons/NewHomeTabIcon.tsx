import React from "react";

import TenantTabIcon from "./TenantTabIcon";

interface NewHomeTabIconProps {
  color?: string;
  focused?: boolean;
}

export default function NewHomeTabIcon({
  color = "#8A969B",
  focused = false,
}: NewHomeTabIconProps) {
  return (
    <TenantTabIcon
      icon="home-outline"
      activeIcon="home"
      color={color}
      focused={focused}
    />
  );
}
