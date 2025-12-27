import type { User, UserRole } from "../types";

/**
 * Check if user has management role
 *
 * @param user - The user object to check
 * @returns true if the user is a management user
 */
export function isManagement(user: User | null): boolean {
  return user?.role === "management";
}

/**
 * Check if user is a building employee
 *
 * @param user - The user object to check
 * @returns true if the user is a building employee
 */
export function isBuildingEmployee(user: User | null): boolean {
  return user?.role === "building_employee";
}

/**
 * Check if user is a tenant
 *
 * @param user - The user object to check
 * @returns true if the user is a tenant
 */
export function isTenant(user: User | null): boolean {
  return user?.role === "tenant";
}
