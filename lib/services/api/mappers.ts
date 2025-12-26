/**
 * API Field Mappers
 *
 * These functions map between frontend DTOs and backend API payloads.
 * Needed because frontend uses different field names than backend for historical reasons.
 *
 * Frontend -> Backend mappings:
 * - name -> fullName
 * - phone -> phoneNumber
 */

import type {
  CreateUserDTO,
  UpdateUserDTO,
  CreateAdminApiDTO,
  UpdateAdminApiDTO,
  Building,
  CreateBuildingDTO,
  UpdateBuildingDTO
} from '@/lib/types';

/**
 * Maps frontend CreateUserDTO to backend API format for Admin user creation
 *
 * @param userData - Frontend user creation data
 * @returns API payload matching backend expectations
 *
 * @example
 * const frontendData = {
 *   name: "John Doe",
 *   email: "john@example.com",
 *   password: "password123",
 *   phone: "+1234567890",
 *   address: "123 Main St",
 *   nationality: "US",
 *   role: "admin"  // Not sent to backend (client-side only)
 * };
 *
 * const apiPayload = mapCreateUserToApi(frontendData);
 * // Returns: { fullName: "John Doe", email: "john@example.com", ... }
 */
export function mapCreateUserToApi(userData: CreateUserDTO): CreateAdminApiDTO {
  return {
    // Map field names from frontend to backend format
    fullName: (userData as any).name || userData.fullName,  // Support both during transition
    email: userData.email,
    password: userData.password || '',
    phoneNumber: (userData as any).phone || userData.phoneNumber || '',
    address: userData.address || '',
    nationality: userData.nationality || '',
  };
}

/**
 * Maps frontend UpdateUserDTO to backend API format for Admin user updates
 *
 * @param updates - Frontend user update data (partial)
 * @returns API payload matching backend expectations (only includes provided fields)
 *
 * @example
 * const frontendUpdates = {
 *   name: "John Smith",
 *   phone: "+9876543210"
 * };
 *
 * const apiPayload = mapUpdateUserToApi(frontendUpdates);
 * // Returns: { fullName: "John Smith", phoneNumber: "+9876543210" }
 */
export function mapUpdateUserToApi(updates: UpdateUserDTO): UpdateAdminApiDTO {
  const mapped: UpdateAdminApiDTO = {};

  // Only include fields that are actually being updated
  // Support both old (name/phone) and new (fullName/phoneNumber) field names
  if ((updates as any).name !== undefined) {
    mapped.fullName = (updates as any).name;
  }
  if (updates.fullName !== undefined) {
    mapped.fullName = updates.fullName;
  }
  if ((updates as any).phone !== undefined) {
    mapped.phoneNumber = (updates as any).phone;
  }
  if (updates.phoneNumber !== undefined) {
    mapped.phoneNumber = updates.phoneNumber;
  }
  if (updates.address !== undefined) {
    mapped.address = updates.address;
  }
  if (updates.nationality !== undefined) {
    mapped.nationality = updates.nationality;
  }

  // Note: Backend doesn't support updating:
  // - email (immutable)
  // - role (not supported yet)
  // - apartment/tower/buildingId (not supported yet)
  // - status (no endpoint for activation/deactivation)
  // These fields are ignored if present in the updates object

  return mapped;
}

/**
 * Maps backend User response to frontend User type
 * Handles field name differences in responses if needed
 *
 * Maps root-level address and nationality fields to profile object
 * so they can be accessed consistently in the frontend.
 */
export function mapUserFromApi(apiUser: any): any {
  if (!apiUser) return apiUser;

  // Create a copy to avoid mutating the original
  const mappedUser = { ...apiUser };

  // Initialize profile object if it doesn't exist
  if (!mappedUser.profile) {
    mappedUser.profile = {};
  }

  // Map backend fullName to frontend name if needed
  if (apiUser.fullName && !mappedUser.name) {
    mappedUser.name = apiUser.fullName;
  }

  // Map backend phoneNumber to frontend phone if needed
  if (apiUser.phoneNumber && !mappedUser.phone) {
    mappedUser.phone = apiUser.phoneNumber;
  }

  // Move root-level address and nationality into profile object
  // Backend returns these at root level, frontend expects them in profile
  if (apiUser.address) {
    mappedUser.profile.address = apiUser.address;
  }

  if (apiUser.nationality) {
    mappedUser.profile.nationality = apiUser.nationality;
  }

  return mappedUser;
}

/**
 * Maps backend Building response to frontend Building type
 * Handles field name differences and provides defaults for missing fields
 *
 * Backend issues:
 * - Uses 'unintsCount' (typo) instead of 'unitsCount' or 'totalUnits'
 * - Uses 'isActive' boolean instead of status enum
 * - Returns id as number instead of string
 * - Missing many fields that frontend expects
 */
export function mapBuildingFromApi(apiBuilding: any): Building {
  if (!apiBuilding) return apiBuilding;

  // Convert ID to string (backend returns number)
  const id = String(apiBuilding.id);

  // Map isActive to status enum
  const status: "active" | "maintenance" | "inactive" = apiBuilding.isActive
    ? "active"
    : "inactive";

  // Handle typo: unintsCount → totalUnits
  const totalUnits = apiBuilding.unintsCount ?? apiBuilding.unitsCount ?? 0;

  return {
    id,
    name: apiBuilding.name || "",
    address: apiBuilding.address || "",
    city: apiBuilding.city || "",
    country: apiBuilding.country || "UAE", // Default for UAE market

    // UAE-specific fields (not in backend yet)
    emirate: apiBuilding.emirate,
    community: apiBuilding.community,
    street: apiBuilding.street,
    plotNumber: apiBuilding.plotNumber,
    buildingNumber: apiBuilding.buildingNumber,
    makaniNumber: apiBuilding.makaniNumber,

    // Building details (not in backend yet)
    buildingType: apiBuilding.buildingType,
    developer: apiBuilding.developer,
    yearBuilt: apiBuilding.yearBuilt,
    totalFloors: apiBuilding.totalFloors,
    utilityPremisesNumber: apiBuilding.utilityPremisesNumber,

    // Management (not in backend yet)
    managerId: apiBuilding.managerId,
    managerName: apiBuilding.managerName,
    totalUnits,
    occupiedUnits: apiBuilding.occupiedUnits ?? 0, // Default to 0
    unitBreakdown: apiBuilding.unitBreakdown,
    amenities: apiBuilding.amenities || [], // Default to empty array

    // Status & metadata
    status,
    createdAt: apiBuilding.createdAt || new Date().toISOString(),
    updatedAt: apiBuilding.updatedAt || apiBuilding.createdAt || new Date().toISOString(),
    location: apiBuilding.location,
    units: apiBuilding.units,
  };
}

/**
 * Maps frontend CreateBuildingDTO to backend API payload
 * Only includes fields that backend currently supports
 */
export function mapCreateBuildingToApi(buildingData: CreateBuildingDTO): any {
  return {
    name: buildingData.name,
    address: buildingData.address,
    city: buildingData.city,
    unitsCount: buildingData.totalUnits, // Backend expects unitsCount
    // Note: Backend doesn't support other fields yet
  };
}

/**
 * Maps frontend UpdateBuildingDTO to backend API payload
 * Only includes fields that backend currently supports
 */
export function mapUpdateBuildingToApi(updates: UpdateBuildingDTO): any {
  const mapped: any = {};

  if (updates.name !== undefined) {
    mapped.name = updates.name;
  }
  if (updates.address !== undefined) {
    mapped.address = updates.address;
  }
  if (updates.city !== undefined) {
    mapped.city = updates.city;
  }
  if (updates.totalUnits !== undefined) {
    mapped.unitsCount = updates.totalUnits; // Backend expects unitsCount
  }

  // Note: Backend doesn't support updating other fields yet
  // These fields are ignored: country, emirate, community, status, etc.

  return mapped;
}
