import React from "react";

import TenantTabIcon from "./TenantTabIcon";

interface ProfileIconProps {
  color?: string;
  focused?: boolean;
}

export default function ProfileIcon({
  color = "#8A969B",
  focused = false,
}: ProfileIconProps) {
  return (
    <TenantTabIcon
      icon="person-outline"
      activeIcon="person"
      color={color}
      focused={focused}
    />
  );
}
