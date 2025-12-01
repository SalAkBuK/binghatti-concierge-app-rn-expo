import type { Parcel } from "../../../lib/types";

export const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export const STATUS_OPTIONS = ["all", "pending", "picked_up", "delivered", "lost"] as const;

export const getStatusColor = (status: Parcel["status"]): string => {
  const colorMap = {
    pending: "#FF9800",
    picked_up: "#4CAF50",
    delivered: "#2196F3",
    lost: "#F44336",
  };
  return colorMap[status] || "#9E9E9E";
};

export const getStatusIcon = (status: Parcel["status"]): string => {
  const iconMap = {
    pending: "cube-outline",
    picked_up: "checkmark-circle-outline",
    delivered: "rocket-outline",
    lost: "alert-circle-outline",
  };
  return (iconMap[status] as string) || "help-circle-outline";
};

export const getCourierIcon = (courier?: string): string => {
  if (!courier) return "cube-outline";
  const courierLower = courier.toLowerCase();
  if (courierLower.includes("fedex")) return "airplane-outline";
  if (courierLower.includes("dhl")) return "airplane-outline";
  if (courierLower.includes("ups")) return "car-outline";
  if (courierLower.includes("aramex")) return "car-outline";
  return "cube-outline";
};
