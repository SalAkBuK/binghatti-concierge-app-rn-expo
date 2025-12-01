// Admin API service

import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
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

// Mock mode flag - set to false when backend is ready
const USE_MOCK = true;

// Mock delay to simulate network requests
const MOCK_DELAY = 500;

/**
 * Admin API Service
 * Handles all admin-specific operations (users, buildings, jobs, analytics, permissions)
 *
 * Currently using mock data with simulated delays.
 * Set USE_MOCK to false when backend is ready.
 */
export class AdminApiService extends BaseApiService {
  // User Management
  async getUsers(): Promise<ApiResponse<User[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: [],
            message: "Users fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<User[]>>("/api/admin/users");
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id: string): Promise<ApiResponse<User>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "User fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

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

    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "User created successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<User>>("/api/admin/users", userData);
      return response;
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
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "User updated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<User>>(`/api/admin/users/${id}`, updates);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "User deleted successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.delete<ApiResponse>(`/api/admin/users/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Building Management
  async getBuildings(): Promise<ApiResponse<Building[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: [],
            message: "Buildings fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<Building[]>>("/api/admin/buildings");
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getBuildingById(id: string): Promise<ApiResponse<Building>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Building fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<Building>>(`/api/admin/buildings/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createBuilding(buildingData: CreateBuildingDTO): Promise<ApiResponse<Building>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Building created successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<Building>>("/api/admin/buildings", buildingData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateBuilding(id: string, updates: UpdateBuildingDTO): Promise<ApiResponse<Building>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Building updated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<Building>>(`/api/admin/buildings/${id}`, updates);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteBuilding(id: string): Promise<ApiResponse> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "Building deleted successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.delete<ApiResponse>(`/api/admin/buildings/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Job Management
  async getJobs(params?: {
    status?: Job["status"];
    buildingId?: string;
    assignedTo?: string;
  }): Promise<ApiResponse<Job[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: [],
            message: "Jobs fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<Job[]>>("/api/admin/jobs", params);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getJobById(id: string): Promise<ApiResponse<Job>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Job fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<Job>>(`/api/admin/jobs/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createJob(jobData: CreateJobDTO): Promise<ApiResponse<Job>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Job created successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<Job>>("/api/admin/jobs", jobData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateJob(id: string, updates: UpdateJobDTO): Promise<ApiResponse<Job>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Job updated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<Job>>(`/api/admin/jobs/${id}`, updates);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateJobStatus(id: string, status: Job["status"]): Promise<ApiResponse<Job>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Job status updated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.patch<ApiResponse<Job>>(`/api/admin/jobs/${id}/status`, { status });
      return response;
    } catch (error) {
      throw error;
    }
  }

  async assignJob(assignData: AssignJobDTO): Promise<ApiResponse<Job>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Job assigned successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

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
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "Job deleted successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.delete<ApiResponse>(`/api/admin/jobs/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Analytics
  async getAnalytics(): Promise<ApiResponse<Analytics>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Analytics fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<Analytics>>("/api/admin/analytics");
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Permissions
  async getPermissions(): Promise<ApiResponse<RolePermissions[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: [],
            message: "Permissions fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<RolePermissions[]>>("/api/admin/permissions");
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updatePermissions(role: string, permissions: string[]): Promise<ApiResponse<RolePermissions>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Permissions updated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

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
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: [],
            message: `Users with role ${role} fetched successfully (mock)`,
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<User[]>>(`/api/admin/users?role=${role}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Unit Type Management
  async getUnitTypes(): Promise<ApiResponse<UnitType[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: [],
            message: "Unit types fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<UnitType[]>>("/api/admin/unit-types");
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getUnitTypeById(id: string): Promise<ApiResponse<UnitType>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Unit type fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<UnitType>>(`/api/admin/unit-types/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createUnitType(unitTypeData: CreateUnitTypeDTO): Promise<ApiResponse<UnitType>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Unit type created successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<UnitType>>("/api/admin/unit-types", unitTypeData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateUnitType(id: string, updates: UpdateUnitTypeDTO): Promise<ApiResponse<UnitType>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: undefined,
            message: "Unit type updated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<UnitType>>(`/api/admin/unit-types/${id}`, updates);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteUnitType(id: string): Promise<ApiResponse> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "Unit type deleted successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.delete<ApiResponse>(`/api/admin/unit-types/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export const adminApi = new AdminApiService();
