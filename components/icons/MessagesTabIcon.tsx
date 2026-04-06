import React from "react";

import TenantTabIcon from "./TenantTabIcon";

interface MessagesTabIconProps {
  color?: string;
  focused?: boolean;
}

export default function MessagesTabIcon({
  color = "#8A969B",
  focused = false,
}: MessagesTabIconProps) {
  return (
    <TenantTabIcon
      icon="chatbubble-ellipses-outline"
      activeIcon="chatbubble-ellipses"
      color={color}
      focused={focused}
    />
  );
}
