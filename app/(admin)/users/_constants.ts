import type { UserRole } from "../../../lib/types";

export const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications" as const;

// Regular admins can create these roles (NO admin or super_admin)
// NOTE: service_provider removed - created via Service Provider Management screen
export const ADMIN_USER_ROLE_OPTIONS: UserRole[] = [
  "tenant",
  "employee",
  "management",
];

// Super admins can create admin role (but NOT super_admin)
// NOTE: service_provider removed - created via Service Provider Management screen
export const SUPER_ADMIN_USER_ROLE_OPTIONS: UserRole[] = [
  "tenant",
  "employee",
  "management",
  "admin", // Only super_admin can create admin users
];

// Keep for backward compatibility (use conditionally)
// NOTE: service_provider removed - created via Service Provider Management screen
export const USER_ROLE_OPTIONS: UserRole[] = [
  "tenant",
  "employee",
  "management",
  "admin",
];
