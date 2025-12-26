// Users API service

import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type { UsersApi, UserListParams } from "./types";
import type { ApiResponse, User } from "../../types";

export class UsersApiService extends BaseApiService implements UsersApi {
  async getUsers(params?: UserListParams): Promise<ApiResponse<User[]>> {
    try {
      const response = await this.get<ApiResponse<User[]>>(
        API_ENDPOINTS.users.list,
        params,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async getUser(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await this.get<ApiResponse<User>>(
        `${API_ENDPOINTS.users.list}/${id}`,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateUser(
    id: string,
    data: Partial<User>,
  ): Promise<ApiResponse<User>> {
    try {
      const response = await this.put<ApiResponse<User>>(
        `${API_ENDPOINTS.users.list}/${id}`,
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(id: string): Promise<ApiResponse> {
    try {
      const response = await this.delete<ApiResponse>(
        `${API_ENDPOINTS.users.list}/${id}`,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Helper methods for user management
  async getUsersByRole(
    role: User["role"],
    params?: Omit<UserListParams, "role">,
  ): Promise<ApiResponse<User[]>> {
    return this.getUsers({ ...params, role });
  }

  async searchUsers(
    search: string,
    params?: Omit<UserListParams, "search">,
  ): Promise<ApiResponse<User[]>> {
    return this.getUsers({ ...params, search });
  }

  async getTenants(
    params?: Omit<UserListParams, "role">,
  ): Promise<ApiResponse<User[]>> {
    return this.getUsersByRole("tenant", params);
  }

  async getManagementStaff(
    params?: Omit<UserListParams, "role">,
  ): Promise<ApiResponse<User[]>> {
    return this.getUsersByRole("management", params);
  }

  async getServiceProviders(
    params?: Omit<UserListParams, "role">,
  ): Promise<ApiResponse<User[]>> {
    return this.getUsersByRole("service_provider", params);
  }

  async getEmployees(
    params?: Omit<UserListParams, "role">,
  ): Promise<ApiResponse<User[]>> {
    return this.getUsersByRole("employee", params);
  }

  async getAdmins(
    params?: Omit<UserListParams, "role">,
  ): Promise<ApiResponse<User[]>> {
    return this.getUsersByRole("admin", params);
  }

  // User activation/deactivation
  async activateUser(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await this.patch<ApiResponse<User>>(
        `${API_ENDPOINTS.users.list}/${id}/activate`,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async deactivateUser(id: string): Promise<ApiResponse<User>> {
    try {
      const response = await this.patch<ApiResponse<User>>(
        `${API_ENDPOINTS.users.list}/${id}/deactivate`,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Change user role
  async changeUserRole(
    id: string,
    role: User["role"],
  ): Promise<ApiResponse<User>> {
    return this.updateUser(id, { role });
  }

  // Reset user password
  async resetPassword(id: string): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        `${API_ENDPOINTS.users.list}/${id}/reset-password`,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // Role-Specific Profile Methods (Option B)
  // ============================================

  /**
   * Get Admin Profile
   */
  async getAdminProfile(): Promise<ApiResponse<any>> {
    try {
      const response = await this.get<ApiResponse<any>>(
        API_ENDPOINTS.profile.admin.get
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update Admin Profile
   * Required fields: companyName, phone
   */
  async updateAdminProfile(profileData: {
    companyName: string;
    phone: string;
    companyWebsite?: string;
    companyDescription?: string;
    companyAddress?: string;
    companyLogoUrl?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.put<ApiResponse<any>>(
        API_ENDPOINTS.profile.admin.update,
        profileData
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload Admin Profile File (Logo)
   */
  async uploadAdminFile(file: FormData): Promise<ApiResponse<{ url: string }>> {
    try {
      const response = await this.post<ApiResponse<{ url: string }>>(
        API_ENDPOINTS.profile.admin.upload,
        file,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Management Profile
   */
  async getManagementProfile(): Promise<ApiResponse<any>> {
    try {
      const response = await this.get<ApiResponse<any>>(
        API_ENDPOINTS.profile.management.get
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update Management Profile
   * Required fields: name, phone, buildingId, managedBuildingIds
   */
  async updateManagementProfile(profileData: {
    name: string;
    phone: string;
    buildingId: string;
    managedBuildingIds: string[];
    jobTitle?: string;
    department?: string;
    bio?: string;
    avatar?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.put<ApiResponse<any>>(
        API_ENDPOINTS.profile.management.update,
        profileData
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload Management Profile File (Avatar)
   */
  async uploadManagementFile(file: FormData): Promise<ApiResponse<{ url: string }>> {
    try {
      const response = await this.post<ApiResponse<{ url: string }>>(
        API_ENDPOINTS.profile.management.upload,
        file,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get Tenant Profile
   */
  async getTenantProfile(): Promise<ApiResponse<any>> {
    try {
      const response = await this.get<ApiResponse<any>>(
        API_ENDPOINTS.profile.tenant.get
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update Tenant Profile
   * Required fields: name, phone, buildingId, apartment, floor
   */
  async updateTenantProfile(profileData: {
    name: string;
    phone: string;
    buildingId: string;
    apartment: string;
    floor: string;
    tower?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    emiratesId?: string;
    avatar?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.put<ApiResponse<any>>(
        API_ENDPOINTS.profile.tenant.update,
        profileData
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload Tenant Profile File (Avatar)
   */
  async uploadTenantFile(file: FormData): Promise<ApiResponse<{ url: string }>> {
    try {
      const response = await this.post<ApiResponse<{ url: string }>>(
        API_ENDPOINTS.profile.tenant.upload,
        file,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }
}
