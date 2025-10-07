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
}
