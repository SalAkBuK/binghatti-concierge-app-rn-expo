import type { BuildingEmployee } from "../../../lib/types";

export const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export const SHIFT_SEQUENCE: NonNullable<BuildingEmployee["shift"]>[] = [
  "morning",
  "evening",
  "night",
];
