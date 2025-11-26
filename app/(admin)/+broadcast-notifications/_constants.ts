import type { Announcement, AnnouncementPriority } from "../../../lib/types";

export const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export const PRIORITY_COLORS = {
  low: "#4CAF50",
  normal: "#2196F3",
  high: "#FF9800",
  urgent: "#F44336",
} as const;

export const STATUS_COLORS = {
  draft: "#9E9E9E",
  scheduled: "#FF9800",
  sent: "#4CAF50",
  cancelled: "#757575",
} as const;

export const getPriorityColor = (priority: AnnouncementPriority): string => {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS.normal;
};

export const getStatusColor = (status: Announcement["status"]): string => {
  return STATUS_COLORS[status] || STATUS_COLORS.draft;
};
