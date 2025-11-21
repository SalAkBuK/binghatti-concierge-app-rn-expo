import type { Visitor } from "../../../lib/types";

export const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export const STATUS_OPTIONS = ["all", "expected", "arrived", "departed", "cancelled"] as const;

export const getStatusColor = (status: Visitor["status"]): string => {
  const colorMap = {
    expected: "#FF9800",
    arrived: "#4CAF50",
    departed: "#9E9E9E",
    cancelled: "#F44336",
  };
  return colorMap[status] || "#9E9E9E";
};

export const getStatusIcon = (status: Visitor["status"]): string => {
  const iconMap = {
    expected: "time-outline",
    arrived: "checkmark-circle-outline",
    departed: "exit-outline",
    cancelled: "close-circle-outline",
  };
  return (iconMap[status] as string) || "help-circle-outline";
};
