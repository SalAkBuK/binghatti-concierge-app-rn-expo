import type { UserRole } from "../../../lib/types";

export const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications" as const;

// Regular admins can create these roles (NO admin or super_admin)
export const ADMIN_USER_ROLE_OPTIONS: UserRole[] = [
  "tenant",
  "service_provider",
  "employee",
  "management",
];

// Super admins can create admin role (but NOT super_admin)
export const SUPER_ADMIN_USER_ROLE_OPTIONS: UserRole[] = [
  "tenant",
  "service_provider",
  "employee",
  "management",
  "admin", // Only super_admin can create admin users
];

// Keep for backward compatibility (use conditionally)
export const USER_ROLE_OPTIONS: UserRole[] = [
  "tenant",
  "service_provider",
  "employee",
  "management",
  "admin",
];
