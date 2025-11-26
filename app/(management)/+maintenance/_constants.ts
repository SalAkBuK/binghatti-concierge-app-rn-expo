import type { MaintenanceType } from "../../../lib/types";

export const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications" as const;

export const STATUS_FILTERS = ["all", "upcoming", "in_progress", "completed", "cancelled"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const VIEW_MODES = ["list", "calendar"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const MAINTENANCE_TYPES: MaintenanceType[] = [
  "hvac",
  "elevator",
  "plumbing",
  "electrical",
  "fire_safety",
  "water_system",
  "cleaning",
  "pest_control",
  "landscaping",
  "general",
  "other",
];

export const MAINTENANCE_TYPE_ICONS: Record<MaintenanceType, string> = {
  hvac: "snow-outline",
  elevator: "arrow-up-outline",
  plumbing: "water-outline",
  electrical: "flash-outline",
  fire_safety: "flame-outline",
  water_system: "water-outline",
  cleaning: "sparkles-outline",
  pest_control: "bug-outline",
  landscaping: "leaf-outline",
  general: "construct-outline",
  other: "ellipsis-horizontal-outline",
};
