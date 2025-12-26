// Tenants API service

import { BaseApiService } from "./base";
import type { ApiResponse, User, CreateUserDTO } from "../../types";

export class TenantsApiService extends BaseApiService {
  /**
   * Get a single tenant by ID
   * GET /Tenant/get/{tenantId}
   * @param tenantId - The ID of the tenant
   */
  async getTenantById(tenantId: number | string): Promise<ApiResponse<any>> {
    try {
      const tenantIdNum = typeof tenantId === 'string'
        ? parseInt(tenantId.replace(/\D/g, ''), 10)
        : tenantId;

      console.log('[TenantsApi] Fetching tenant by ID:', tenantIdNum);
      const response = await this.get<ApiResponse<any>>(`/Tenant/get/${tenantIdNum}`);
      console.log('[TenantsApi] Tenant fetched:', response.data);
      return response;
    } catch (error) {
      console.error('[TenantsApi] Failed to fetch tenant:', error);
      throw error;
    }
  }

  /**
   * Create a tenant user
   * POST /Tenant/create
   * Used for creating users with "tenant" role
   * Requires: buildingId, unitNumber, floorNumber, entranceDate
   */
  async createTenant(userData: CreateUserDTO): Promise<ApiResponse<User>> {
    try {
      // Validate required fields
      if (!userData.buildingId) {
        throw new Error("Building ID is required for tenant creation");
      }

      // Extract tenant-specific profile data
      const buildingId = typeof userData.buildingId === 'string'
        ? parseInt(userData.buildingId.replace(/\D/g, ''), 10)
        : userData.buildingId;

      const unitNumber = userData.apartment || "";
      const floorNumber = userData.floor ? parseInt(userData.floor, 10) : 0;
      const entranceDate = userData.entranceDate || new Date().toISOString();

      // Build the API payload
      const payload = {
        email: userData.email,
        password: userData.password,
        fullName: userData.name,
        phoneNumber: userData.phone || "",
        address: userData.address || "",
        nationality: userData.nationality || "",
        buildingId,
        unitNumber,
        floorNumber,
        entranceDate,
        emergencyContactName: userData.emergencyContact || "",
        emergencyContactPhone: userData.emergencyPhone || "",
      };

      console.log('[TenantsApi] Creating tenant:', payload);
      const response = await this.post<ApiResponse<User>>('/Tenant/create', payload);
      console.log('[TenantsApi] Tenant created:', response.data);

      return response;
    } catch (error) {
      console.error('[TenantsApi] Failed to create tenant:', error);
      throw error;
    }
  }

  /**
   * Update a tenant
   * PUT /Tenant/update/{tenantId}
   */
  async updateTenant(tenantId: number | string, userData: Partial<CreateUserDTO>): Promise<ApiResponse<User>> {
    try {
      const tenantIdNum = typeof tenantId === 'string'
        ? parseInt(tenantId.replace(/\D/g, ''), 10)
        : tenantId;

      // Build the update payload
      const payload: any = {};

      if (userData.name) payload.fullName = userData.name;
      if (userData.phone) payload.phoneNumber = userData.phone;
      if (userData.address) payload.address = userData.address;
      if (userData.nationality) payload.nationality = userData.nationality;
      if (userData.buildingId) {
        payload.buildingId = typeof userData.buildingId === 'string'
          ? parseInt(userData.buildingId.replace(/\D/g, ''), 10)
          : userData.buildingId;
      }
      if (userData.apartment) payload.unitNumber = userData.apartment;
      if (userData.floor) payload.floorNumber = parseInt(userData.floor, 10);
      if (userData.emergencyContact) payload.emergencyContactName = userData.emergencyContact;
      if (userData.emergencyPhone) payload.emergencyContactPhone = userData.emergencyPhone;
      if (userData.entranceDate) payload.entranceDate = userData.entranceDate;

      console.log('[TenantsApi] Updating tenant:', tenantIdNum, payload);
      const response = await this.put<ApiResponse<User>>(`/Tenant/update/${tenantIdNum}`, payload);
      console.log('[TenantsApi] Tenant updated:', response.data);

      return response;
    } catch (error) {
      console.error('[TenantsApi] Failed to update tenant:', error);
      throw error;
    }
  }

  /**
   * Get all tenants for a specific building
   * GET /Tenant/building/{buildingId}
   * @param buildingId - The ID of the building
   */
  async getTenantsForBuilding(buildingId: number | string): Promise<ApiResponse<any[]>> {
    try {
      const buildingIdNum = typeof buildingId === 'string'
        ? parseInt(buildingId.replace(/\D/g, ''), 10)
        : buildingId;

      console.log('[TenantsApi] Fetching tenants for building:', buildingIdNum);
      const response = await this.get<ApiResponse<any[]>>(`/Tenant/building/${buildingIdNum}`);
      console.log('[TenantsApi] Tenants fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[TenantsApi] Failed to fetch tenants for building:', error);
      throw error;
    }
  }

  /**
   * Delete a tenant
   * DELETE /Tenant/delete/{tenantId}
   */
  async deleteTenant(tenantId: number | string): Promise<ApiResponse> {
    try {
      const tenantIdNum = typeof tenantId === 'string'
        ? parseInt(tenantId.replace(/\D/g, ''), 10)
        : tenantId;

      console.log('[TenantsApi] Deleting tenant:', tenantIdNum);
      const response = await this.delete<ApiResponse>(`/Tenant/delete/${tenantIdNum}`);
      console.log('[TenantsApi] Tenant deleted');
      return response;
    } catch (error) {
      console.error('[TenantsApi] Failed to delete tenant:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tenantsApi = new TenantsApiService();
