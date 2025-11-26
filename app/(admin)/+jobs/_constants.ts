import type { JobStatus } from "../../../lib/types";

export const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications" as const;

export const FILTER_OPTIONS: { label: string; value: JobStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
];

export const STATUS_COLORS: Record<JobStatus, { bg: string; text: string }> = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  assigned: { bg: "#DBEAFE", text: "#1E40AF" },
  "in-progress": { bg: "#E0E7FF", text: "#4338CA" },
  completed: { bg: "#D1FAE5", text: "#065F46" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626" },
};
