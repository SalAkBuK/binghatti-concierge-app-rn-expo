// Admin API service

import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import {
  mapCreateUserToApi,
  mapUpdateUserToApi,
  mapUserFromApi,
  mapBuildingFromApi,
  mapCreateBuildingToApi,
  mapUpdateBuildingToApi
} from "./mappers";
import type {
  Building,
  Job,
  Analytics,
  RolePermissions,
  User,
  UnitType,
  CreateUserDTO,
  UpdateUserDTO,
  CreateBuildingDTO,
  UpdateBuildingDTO,
  CreateJobDTO,
  UpdateJobDTO,
  AssignJobDTO,
  CreateUnitTypeDTO,
  UpdateUnitTypeDTO,
  ApiResponse,
} from "../../types";

/**
 * Admin API Service
 * Handles all admin-specific operations (users, buildings, jobs, analytics, permissions)
 * Connected to live backend (16.171.240.211)
 */
export class AdminApiService extends BaseApiService {
  // User Management
  async getUsers(): Promise<ApiResponse<User[]>> {
    try {
      const response = await this.get<ApiResponse<User[]>>("/api/admin/users");
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await this.get<ApiResponse<User>>(`/api/admin/users/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createUser(userData: CreateUserDTO): Promise<ApiResponse<User>> {
    // Validate admin user creation permissions
    if (userData.role === "admin" || userData.role === "super_admin") {
      // This check will work with real backend
      // For mock mode, we'll add a warning but allow it for testing
      console.warn("⚠️ Creating admin user - ensure proper authorization on backend");

      // When backend is ready, uncomment this:
      // const currentUserRole = await this.getCurrentUserRole();
      // if (currentUserRole !== 'super_admin') {
      //   throw new Error('Permission denied: Only super administrators can create admin users');
      // }

      // Prevent super_admin creation entirely
      if (userData.role === "super_admin") {
        throw new Error("Permission denied: Creating super admin users is not allowed");
      }
    }

    try {
      // Map frontend DTO to backend API format
      const apiPayload = mapCreateUserToApi(userData);

      // Use correct backend endpoint
      const response = await this.post<ApiResponse<User>>("/api/Admin/create", apiPayload);
      if (response.success && response.data) {
        response.data = {
          role: userData.role || "admin",
          ...mapUserFromApi(response.data as any),
        };
      }
      return response as ApiResponse<User>;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to get current user role (for when backend is ready)
  // private async getCurrentUserRole(): Promise<UserRole> {
  //   // Implementation will depend on how auth token is decoded
  //   // For now, placeholder
  //   return 'admin';
  // }

  async updateUser(id: string, updates: UpdateUserDTO): Promise<ApiResponse<User>> {
    try {
      // Map frontend DTO to backend API format
      const apiPayload = mapUpdateUserToApi(updates);

      // Use correct backend endpoint
      const response = await this.put<ApiResponse<User>>(`/api/Admin/update/${id}`, apiPayload);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    try {
      const response = await this.delete<ApiResponse>(`/api/admin/users/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a manager user
   * POST /Manager/create
   * Used for creating users with "management" role
   */
  async createManager(userData: CreateUserDTO): Promise<ApiResponse<User>> {
    try {
      const payload = {
        fullName: userData.fullName,
        email: userData.email,
        password: userData.password,
        phoneNumber: userData.phoneNumber,
        address: userData.address,
        nationality: userData.nationality,
      };

      console.log('[AdminApi] Creating manager:', payload);
      const response = await this.post<ApiResponse<any>>("/Manager/create", payload);

      // Map backend response to User type if needed
      if (response.success && response.data) {
        const user = mapUserFromApi(response.data);
        // Backend omits role/profile; provide safe defaults so UI badges render
        user.role = user.role || "management";
        user.profile = user.profile || {};
        if (userData.buildingId) {
          user.profile.buildingId = user.profile.buildingId || userData.buildingId;
        }
        return { ...response, data: user };
      }

      return response as ApiResponse<User>;
    } catch (error) {
      console.error('[AdminApi] Failed to create manager:', error);
      throw error;
    }
  }

  /**
   * Create a maintenance staff (employee) user
   * POST /MaintenanceStaff/create
   * Used for creating users with "employee" role
   */
  async createMaintenanceStaff(userData: CreateUserDTO): Promise<ApiResponse<User>> {
    try {
      const payload = {
        fullName: userData.fullName,
        email: userData.email,
        password: userData.password,
        phoneNumber: userData.phoneNumber,
        address: userData.address,
        nationality: userData.nationality,
      };

      console.log('[AdminApi] Creating maintenance staff:', payload);
      const response = await this.post<ApiResponse<any>>("/MaintenanceStaff/create", payload);

      // Map backend response to User type if needed
      if (response.success && response.data) {
        const user = mapUserFromApi(response.data);
        user.role = user.role || "employee";
        user.profile = user.profile || {};
        if (userData.buildingId) {
          user.profile.buildingId = user.profile.buildingId || userData.buildingId;
        }
        return { ...response, data: user };
      }

      return response as ApiResponse<User>;
    } catch (error) {
      console.error('[AdminApi] Failed to create maintenance staff:', error);
      throw error;
    }
  }

  /**
   * Create a service provider user/company
   * POST /ServiceProvider/create
   */
  async createServiceProvider(providerData: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber: string;
    address: string;
    nationality: string;
    companyName: string;
    specialization: string;
    jobTitle: string;
    skills: string;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('[AdminApi] Creating service provider:', providerData);
      const response = await this.post<ApiResponse<any>>("/ServiceProvider/create", providerData);
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to create service provider:', error);
      throw error;
    }
  }

  /**
   * Update a service provider
   * PUT /ServiceProvider/update/{id}
   */
  async updateServiceProvider(providerId: number | string, payload: {
    fullName?: string;
    phoneNumber?: string;
    address?: string;
    nationality?: string;
    companyName?: string;
    specialization?: string;
    jobTitle?: string;
    skills?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const providerIdNum = typeof providerId === 'string'
        ? parseInt(providerId.replace(/\D/g, ''), 10)
        : providerId;

      console.log('[AdminApi] Updating service provider:', providerIdNum, payload);
      const response = await this.put<ApiResponse<any>>(
        `/ServiceProvider/update/${providerIdNum}`,
        payload,
      );
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to update service provider:', error);
      throw error;
    }
  }

  /**
   * Assign service provider to building
   * POST /BuildingServiceProvider/assign
   */
  async assignServiceProviderToBuilding(payload: {
    providerId: number;
    buildingId: number;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('[AdminApi] Assigning provider to building:', payload);
      const response = await this.post<ApiResponse<any>>("/BuildingServiceProvider/assign", payload);
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to assign service provider to building:', error);
      throw error;
    }
  }

  /**
   * Get all service providers assigned to a building
   * GET /BuildingServiceProvider/building/{buildingId}
   */
  async getServiceProvidersByBuilding(buildingId: number | string): Promise<ApiResponse<any[]>> {
    try {
      const buildingIdNum = typeof buildingId === 'string'
        ? parseInt(buildingId.replace(/\D/g, ''), 10)
        : buildingId;

      console.log('[AdminApi] Fetching service providers for building:', buildingIdNum);
      const response = await this.get<ApiResponse<any[]>>(`/BuildingServiceProvider/building/${buildingIdNum}`);
      console.log('[AdminApi] Service providers fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to fetch service providers for building:', error);
      throw error;
    }
  }

  /**
   * Remove service provider from building
   * DELETE /BuildingServiceProvider/remove
   */
  async removeServiceProviderFromBuilding(payload: {
    providerId: number;
    buildingId: number;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('[AdminApi] Removing provider from building:', payload);
      const response = await this.delete<ApiResponse<any>>("/BuildingServiceProvider/remove", payload);
      console.log('[AdminApi] Provider removed successfully');
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to remove service provider from building:', error);
      throw error;
    }
  }

  /**
   * Assign maintenance staff to building
   * POST /BuildingMaintenanceStaff/assign
   * @param staffId - The ID of the maintenance staff (from createMaintenanceStaff response)
   * @param buildingId - The ID of the building to assign to
   */
  async assignMaintenanceStaffToBuilding(payload: {
    staffId: number;
    buildingId: number;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('[AdminApi] Assigning maintenance staff to building:', payload);
      const response = await this.post<ApiResponse<any>>("/BuildingMaintenanceStaff/assign", payload);
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to assign maintenance staff to building:', error);
      throw error;
    }
  }

  /**
   * Get maintenance staff assigned to a building
   * GET /BuildingMaintenanceStaff/building/{buildingId}
   */
  async getMaintenanceStaffByBuilding(buildingId: number | string): Promise<ApiResponse<any[]>> {
    try {
      const buildingIdNum = typeof buildingId === 'string'
        ? parseInt(buildingId.replace(/\D/g, ''), 10)
        : buildingId;

      console.log('[AdminApi] Fetching maintenance staff for building:', buildingIdNum);
      const response = await this.get<ApiResponse<any[]>>(`/BuildingMaintenanceStaff/building/${buildingIdNum}`);
      console.log('[AdminApi] Maintenance staff fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to fetch maintenance staff for building:', error);
      throw error;
    }
  }

  /**
   * Get all tenants by building ID
   * GET /Tenant/getall-by-building/{buildingId}
   * @param buildingId - The ID of the building
   */
  async getTenantsByBuilding(buildingId: number | string): Promise<ApiResponse<User[]>> {
    try {
      const buildingIdNum = typeof buildingId === 'string'
        ? parseInt(buildingId.replace(/\D/g, ''), 10)
        : buildingId;

      console.log('[AdminApi] Fetching tenants for building:', buildingIdNum);
      const response = await this.get<ApiResponse<User[]>>(`/Tenant/getall-by-building/${buildingIdNum}`);
      console.log('[AdminApi] Tenants fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to fetch tenants for building:', error);
      throw error;
    }
  }

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

      console.log('[AdminApi] Fetching tenant by ID:', tenantIdNum);
      const response = await this.get<ApiResponse<any>>(`/Tenant/get/${tenantIdNum}`);
      console.log('[AdminApi] Tenant fetched:', response.data);
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to fetch tenant:', error);
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
      if (userData.buildingId == null || String(userData.buildingId).trim() === '') {
        throw new Error("buildingId is required for tenant creation");
      }
      if (!userData.unitNumber || userData.unitNumber.trim() === '') {
        throw new Error("unitNumber is required for tenant creation");
      }
      if (userData.floorNumber == null || String(userData.floorNumber).trim() === '') {
        throw new Error("floorNumber is required for tenant creation");
      }

      // Parse and validate numeric fields (backend requires numbers)
      const normalizeNumberField = (
        value: string | number | undefined,
        fieldName: "buildingId" | "floorNumber",
      ): number => {
        if (typeof value === "number" && !isNaN(value)) return value;

        const raw = String(value ?? "").trim();
        const match = raw.match(/(\d+)/); // tolerate IDs like "building-1"
        const parsed = match ? parseInt(match[1], 10) : NaN;

        if (isNaN(parsed)) {
          throw new Error(`Invalid ${fieldName}: "${raw}" - must include a number`);
        }

        return parsed;
      };

      const buildingIdNum = normalizeNumberField(userData.buildingId, "buildingId");
      const floorNumberNum = normalizeNumberField(userData.floorNumber, "floorNumber");

      const payload = {
        fullName: userData.fullName,
        email: userData.email,
        password: userData.password,
        phoneNumber: userData.phoneNumber,
        address: userData.address,
        nationality: userData.nationality,
        buildingId: buildingIdNum,
        unitNumber: userData.unitNumber,
        floorNumber: floorNumberNum,
        entranceDate: userData.entranceDate || new Date().toISOString(),
      };

      console.log('[AdminApi] Creating tenant with payload:', JSON.stringify(payload, null, 2));
      const response = await this.post<ApiResponse<any>>("/Tenant/create", payload);

      // Map backend response to User type if needed
      if (response.success && response.data) {
        const user = mapUserFromApi(response.data);

        // Backend returns minimal tenant data; enrich with role/profile so UI tables do not crash
        user.role = user.role || "tenant";
        user.profile = user.profile || {};
        user.profile.buildingId = user.profile.buildingId || String(buildingIdNum);
        user.profile.apartment = user.profile.apartment || payload.unitNumber;
        user.profile.floor = user.profile.floor || String(payload.floorNumber);

        return { ...response, data: user };
      }

      return response as ApiResponse<User>;
    } catch (error) {
      console.error('[AdminApi] Failed to create tenant:', error);
      throw error;
    }
  }

  // Building Management
  /**
   * Get all buildings from backend
   * Uses /Buildings/getall endpoint with field mapping
   */
  async getBuildings(): Promise<ApiResponse<Building[]>> {
    try {
      const response = await this.get<ApiResponse<any[]>>("/Buildings/getall");

      // Map backend buildings to frontend format
      if (response.success && response.data) {
        response.data = response.data.map((building: any) => mapBuildingFromApi(building));
      }

      return response as ApiResponse<Building[]>;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get building by ID
   * Note: Backend endpoint not available yet - using getBuildings and filtering
   */
  async getBuildingById(id: string): Promise<ApiResponse<Building>> {
    try {
      // TODO: Replace with proper endpoint when backend adds /Buildings/get/{id}
      const allBuildings = await this.getBuildings();
      if (allBuildings.success && allBuildings.data) {
        const building = allBuildings.data.find(b => b.id === id);
        if (building) {
          return {
            success: true,
            data: building,
            message: "Building fetched successfully"
          };
        }
      }
      return {
        success: false,
        message: "Building not found"
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new building
   * Uses /Buildings/create endpoint with field mapping
   */
  async createBuilding(buildingData: CreateBuildingDTO): Promise<ApiResponse<Building>> {
    try {
      // Map frontend DTO to backend API format
      const apiPayload = mapCreateBuildingToApi(buildingData);

      const response = await this.post<ApiResponse<any>>("/Buildings/create", apiPayload);

      // Map backend response to frontend format
      if (response.success && response.data) {
        response.data = mapBuildingFromApi(response.data);
      }

      return response as ApiResponse<Building>;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing building
   * Uses /Buildings/update/{id} endpoint with field mapping
   */
  async updateBuilding(id: string, updates: UpdateBuildingDTO): Promise<ApiResponse<Building>> {
    try {
      // Map frontend DTO to backend API format
      const apiPayload = mapUpdateBuildingToApi(updates);

      const response = await this.put<ApiResponse<any>>(`/Buildings/update/${id}`, apiPayload);

      // Map backend response to frontend format
      if (response.success && response.data) {
        response.data = mapBuildingFromApi(response.data);
      }

      return response as ApiResponse<Building>;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a building
   * Uses /Buildings/delete/{id} endpoint
   */
  async deleteBuilding(id: string): Promise<ApiResponse> {
    try {
      const response = await this.delete<ApiResponse>(`/Buildings/delete/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get managers assigned to a building
   * GET /BuildingManager/building/{buildingId}
   * Returns array of managers with their details
   */
  async getBuildingManagers(buildingId: number | string): Promise<ApiResponse<any[]>> {
    try {
      const buildingIdentifier = String(buildingId).trim();
      console.log('[AdminApi] Fetching managers for building:', buildingIdentifier);
      const response = await this.get<ApiResponse<any[]>>(
        `/BuildingManager/building/${buildingIdentifier}`
      );

      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to fetch building managers:', error);
      throw error;
    }
  }

  /**
   * Assign a manager to a building
   * POST /BuildingManager/assign
   * @param buildingId - The ID of the building (must be a number)
   * @param managerId - The ID of the manager user (must be a number)
   */
  async assignManagerToBuilding(buildingId: number, managerId: number): Promise<ApiResponse<any>> {
    try {
      const payload = {
        buildingId,
        managerId,
      };

      console.log('[AdminApi] Assigning manager to building:', payload);
      const response = await this.post<ApiResponse<any>>("/BuildingManager/assign", payload);

      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to assign manager to building:', error);
      throw error;
    }
  }

  /**
   * Assign an admin to a building
   * POST /BuildingAdmin/assign
   * @param buildingId - The ID of the building (must be a number)
   * @param adminId - The ID of the admin user (must be a number)
   */
  async assignAdminToBuilding(buildingId: number, adminId: number): Promise<ApiResponse<any>> {
    try {
      const payload = {
        buildingId,
        adminId,
      };

      console.log('[AdminApi] Assigning admin to building:', payload);
      const response = await this.post<ApiResponse<any>>("/BuildingAdmin/assign", payload);

      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to assign admin to building:', error);
      throw error;
    }
  }

  /**
   * Get admins assigned to a building
   * GET /BuildingAdmin/building/{buildingId}
   * Returns array of admins assigned to the building
   */
  async getBuildingAdmins(buildingId: number): Promise<ApiResponse<any[]>> {
    try {
      console.log('[AdminApi] Fetching admins for building:', buildingId);
      const response = await this.get<ApiResponse<any[]>>(`/BuildingAdmin/building/${buildingId}`);

      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to fetch building admins:', error);
      throw error;
    }
  }

  /**
   * Get buildings assigned to a manager
   * GET /BuildingManager/manager/{managerId}
   * Returns array of buildings assigned to the manager
   */
  async getBuildingsByManagerId(managerId: number | string): Promise<ApiResponse<Building[]>> {
    try {
      const managerIdNum = typeof managerId === 'string'
        ? parseInt(managerId.replace(/\D/g, ''), 10)
        : managerId;

      console.log('[AdminApi] Fetching buildings for manager:', managerIdNum);
      const response = await this.get<ApiResponse<any[]>>(`/BuildingManager/manager/${managerIdNum}`);

      // Map backend building data to frontend format
      if (response.success && response.data) {
        response.data = response.data.map((building: any) => mapBuildingFromApi(building));
      }

      console.log('[AdminApi] Buildings fetched for manager:', response.data?.length || 0);
      return response as ApiResponse<Building[]>;
    } catch (error) {
      console.error('[AdminApi] Failed to fetch buildings for manager:', error);
      throw error;
    }
  }

  /**
   * Get buildings assigned to an admin
   * GET /BuildingAdmin/admin/{adminId}
   * Returns array of buildings the admin is assigned to
   */
  async getAdminBuildings(adminId: number): Promise<ApiResponse<any[]>> {
    try {
      console.log('[AdminApi] Fetching buildings for admin:', adminId);
      const response = await this.get<ApiResponse<any[]>>(`/BuildingAdmin/admin/${adminId}`);

      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to fetch admin buildings:', error);
      throw error;
    }
  }

  /**
   * Remove admin assignment from a building
   * DELETE /BuildingAdmin/remove or /BuildingAdmin/unassign
   * @param buildingId - The ID of the building
   * @param adminId - The ID of the admin user
   */
  async removeAdminFromBuilding(buildingId: number, adminId: number): Promise<ApiResponse<any>> {
    try {
      const payload = {
        buildingId,
        adminId,
      };

      console.log('[AdminApi] Removing admin from building:', payload);
      // Note: Adjust endpoint based on actual backend implementation
      const response = await this.post<ApiResponse<any>>("/BuildingAdmin/remove", payload);

      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to remove admin from building:', error);
      throw error;
    }
  }

  // Job Management
  async getJobs(params?: {
    status?: Job["status"];
    buildingId?: string;
    assignedTo?: string;
  }): Promise<ApiResponse<Job[]>> {
    try {
      const response = await this.get<ApiResponse<Job[]>>("/api/admin/jobs", params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getJobById(id: string): Promise<ApiResponse<Job>> {
    try {
      const response = await this.get<ApiResponse<Job>>(`/api/admin/jobs/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createJob(jobData: CreateJobDTO): Promise<ApiResponse<Job>> {
    try {
      const response = await this.post<ApiResponse<Job>>("/api/admin/jobs", jobData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateJob(id: string, updates: UpdateJobDTO): Promise<ApiResponse<Job>> {
    try {
      const response = await this.put<ApiResponse<Job>>(`/api/admin/jobs/${id}`, updates);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateJobStatus(id: string, status: Job["status"]): Promise<ApiResponse<Job>> {
    try {
      const response = await this.patch<ApiResponse<Job>>(`/api/admin/jobs/${id}/status`, { status });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async assignJob(assignData: AssignJobDTO): Promise<ApiResponse<Job>> {
    try {
      const response = await this.post<ApiResponse<Job>>(
        `/api/admin/jobs/${assignData.jobId}/assign`,
        assignData
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteJob(id: string): Promise<ApiResponse> {
    try {
      const response = await this.delete<ApiResponse>(`/api/admin/jobs/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Analytics
  async getAnalytics(): Promise<ApiResponse<Analytics>> {
    try {
      const response = await this.get<ApiResponse<Analytics>>("/api/admin/analytics");
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Permissions
  async getPermissions(): Promise<ApiResponse<RolePermissions[]>> {
    try {
      const response = await this.get<ApiResponse<RolePermissions[]>>("/api/admin/permissions");
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updatePermissions(role: string, permissions: string[]): Promise<ApiResponse<RolePermissions>> {
    try {
      const response = await this.put<ApiResponse<RolePermissions>>(
        `/api/admin/permissions/${role}`,
        { permissions }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Helper methods for specific job operations
  async getJobsByStatus(status: Job["status"]): Promise<ApiResponse<Job[]>> {
    return this.getJobs({ status });
  }

  async getJobsByBuilding(buildingId: string): Promise<ApiResponse<Job[]>> {
    return this.getJobs({ buildingId });
  }

  async getJobsByServiceProvider(serviceProviderId: string): Promise<ApiResponse<Job[]>> {
    return this.getJobs({ assignedTo: serviceProviderId });
  }

  // Helper methods for specific user operations
  async getUsersByRole(role: User["role"]): Promise<ApiResponse<User[]>> {
    try {
      const response = await this.get<ApiResponse<User[]>>(`/api/admin/users?role=${role}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Admin User Management (Super Admin only)
  // These methods are specifically for managing admin users from the superadmin portal

  /**
   * Get all admin users
   * Super Admin only endpoint
   */
  async getAdmins(): Promise<ApiResponse<User[]>> {
    try {
      const response = await this.get<ApiResponse<User[]>>("/Admin/getall");

      // Map backend user data to frontend format
      if (response.success && response.data) {
        response.data = response.data.map((user: any) => mapUserFromApi(user));

        // Ensure roles are present for UI rendering
        response.data = response.data.map((user: any) => ({
          role: "admin",
          ...user,
        }));
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a single admin user by ID
   * Super Admin only endpoint
   */
  async getAdminById(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await this.get<ApiResponse<User>>(`/Admin/get/${id}`);

      // Map backend user data to frontend format
      if (response.success && response.data) {
        const mapped = mapUserFromApi(response.data);
        response.data = {
          role: response.data.role || "admin",
          ...mapped,
        };
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new admin user
   * Super Admin only endpoint
   * Note: This uses the same endpoint as createUser but is explicitly for admin creation
   */
  async createAdmin(adminData: CreateUserDTO): Promise<ApiResponse<User>> {
    try {
      // Map frontend DTO to backend API format
      const apiPayload = mapCreateUserToApi(adminData);

      // Use the admin creation endpoint
      const response = await this.post<ApiResponse<User>>("/Admin/create", apiPayload);

      // Map backend user data to frontend format
      if (response.success && response.data) {
        response.data = mapUserFromApi(response.data);
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing admin user
   * Super Admin only endpoint
   */
  async updateAdmin(id: string, updates: UpdateUserDTO): Promise<ApiResponse<User>> {
    try {
      // Map frontend DTO to backend API format
      const apiPayload = mapUpdateUserToApi(updates);

      // Use the admin update endpoint
      const response = await this.put<ApiResponse<User>>(`/Admin/update/${id}`, apiPayload);

      // Map backend user data to frontend format
      if (response.success && response.data) {
        response.data = mapUserFromApi(response.data);
      }

      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete an admin user
   * Super Admin only endpoint
   */
  async deleteAdmin(id: string): Promise<ApiResponse> {
    try {
      const response = await this.delete<ApiResponse>(`/Admin/delete/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Unit Type Management
  async getUnitTypes(): Promise<ApiResponse<UnitType[]>> {
    try {
      const response = await this.get<ApiResponse<UnitType[]>>("/api/admin/unit-types");
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getUnitTypeById(id: string): Promise<ApiResponse<UnitType>> {
    try {
      const response = await this.get<ApiResponse<UnitType>>(`/api/admin/unit-types/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createUnitType(unitTypeData: CreateUnitTypeDTO): Promise<ApiResponse<UnitType>> {
    try {
      const response = await this.post<ApiResponse<UnitType>>("/api/admin/unit-types", unitTypeData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateUnitType(id: string, updates: UpdateUnitTypeDTO): Promise<ApiResponse<UnitType>> {
    try {
      const response = await this.put<ApiResponse<UnitType>>(`/api/admin/unit-types/${id}`, updates);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteUnitType(id: string): Promise<ApiResponse> {
    try {
      const response = await this.delete<ApiResponse>(`/api/admin/unit-types/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a maintenance request
   * POST /MaintenanceRequest/create
   * Used by tenants to submit maintenance requests
   * @param requestData - The maintenance request data
   * @param requestData.buildingId - Building ID (number)
   * @param requestData.createdById - Tenant ID (number)
   * @param requestData.title - Request title (string)
   * @param requestData.description - Request description (string)
   * @param requestData.priority - Priority level (1=Low, 2=Medium, 3=High, 4=Urgent)
   */
  async createMaintenanceRequest(requestData: {
    buildingId: number;
    createdById: number;
    title: string;
    description: string;
    priority: number;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('[AdminApi] Creating maintenance request:', requestData);
      const response = await this.post<ApiResponse<any>>(
        '/MaintenanceRequest/create',
        requestData
      );
      console.log('[AdminApi] Maintenance request created:', response.data);
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to create maintenance request:', error);
      throw error;
    }
  }

  /**
   * Get maintenance requests by tenant ID
   * GET /MaintenanceRequest/createdby/{tenantId}
   * Returns all maintenance requests created by a specific tenant
   * @param tenantId - The ID of the tenant
   */
  async getMaintenanceRequestsByTenantId(tenantId: number | string): Promise<ApiResponse<any[]>> {
    try {
      const tenantIdNum = typeof tenantId === 'string'
        ? parseInt(tenantId.replace(/\D/g, ''), 10)
        : tenantId;

      console.log('[AdminApi] Fetching maintenance requests for tenant:', tenantIdNum);
      const response = await this.get<ApiResponse<any[]>>(`/MaintenanceRequest/createdby/${tenantIdNum}`);
      console.log('[AdminApi] Maintenance requests fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[AdminApi] Failed to fetch maintenance requests:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const adminApi = new AdminApiService();
