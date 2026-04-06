import React from "react";

import TenantTabIcon from "./TenantTabIcon";

interface RequestsTabIconProps {
  color?: string;
  focused?: boolean;
}

export default function RequestsTabIcon({
  color = "#8A969B",
  focused = false,
}: RequestsTabIconProps) {
  return (
    <TenantTabIcon
      icon="receipt-outline"
      activeIcon="receipt"
      color={color}
      focused={focused}
    />
  );
}
