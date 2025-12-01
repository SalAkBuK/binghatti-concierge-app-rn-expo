import type { User, UserRole } from "../types";

/**
 * Check if current user can create a specific role
 *
 * @param currentUserRole - The role of the current user
 * @param targetRole - The role being created
 * @returns true if the current user can create the target role
 */
export function canCreateRole(
  currentUserRole: UserRole,
  targetRole: UserRole
): boolean {
  // Super admins can create admin users (but NOT other super_admins)
  if (currentUserRole === "super_admin") {
    return targetRole !== "super_admin"; // Can create all roles except super_admin
  }

  // Regular admins cannot create admin or super_admin users
  if (currentUserRole === "admin") {
    return targetRole !== "admin" && targetRole !== "super_admin";
  }

  return false;
}

/**
 * Check if current user can manage (edit/delete) a target user
 *
 * @param currentUser - The current user object
 * @param targetUser - The target user object
 * @returns true if the current user can manage the target user
 */
export function canManageUser(currentUser: User, targetUser: User): boolean {
  // Super admins can manage admin users (but NOT other super_admins)
  if (currentUser.role === "super_admin") {
    return targetUser.role !== "super_admin";
  }

  // Regular admins cannot manage admin or super_admin users
  if (currentUser.role === "admin") {
    return targetUser.role !== "admin" && targetUser.role !== "super_admin";
  }

  return false;
}

/**
 * Check if user is super admin
 *
 * @param user - The user object to check
 * @returns true if the user is a super admin
 */
export function isSuperAdmin(user: User | null): boolean {
  return user?.role === "super_admin";
}

/**
 * Check if user is admin or super admin
 *
 * @param user - The user object to check
 * @returns true if the user is an admin or super admin
 */
export function isAdminOrAbove(user: User | null): boolean {
  return user?.role === "admin" || user?.role === "super_admin";
}
