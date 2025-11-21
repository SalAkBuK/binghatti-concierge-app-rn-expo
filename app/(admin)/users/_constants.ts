import type { UserRole } from "../../../lib/types";

export const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications" as const;

export const USER_ROLE_OPTIONS: UserRole[] = [
  "tenant",
  "service_provider",
  "employee",
  "management",
  "admin",
];
