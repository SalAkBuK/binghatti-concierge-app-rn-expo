// Authentication API service

import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type { AuthApi } from "./types";
import type {
  LoginDTO,
  RegisterDTO,
  AuthResponse,
  ApiResponse,
  User,
} from "../../types";

export class AuthApiService extends BaseApiService implements AuthApi {
  constructor() {
    super();

    // Add response interceptor to handle auth token from login
    this.addResponseInterceptor(async (response: any) => {
      // Auto-store token if it's in the response
      if (response?.token) {
        await this.setAuthToken(response.token);
      }
      return response;
    });

    // Add error handler for 401 responses
    this.addErrorHandler(async (error) => {
      if (error.status === 401) {
        // Clear auth token on unauthorized
        await this.clearAuthToken();
      }
    });
  }

  async login(credentials: LoginDTO): Promise<AuthResponse> {
    try {
      const response = await this.post<AuthResponse>(
        API_ENDPOINTS.auth.login,
        credentials,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async register(userData: RegisterDTO): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        API_ENDPOINTS.auth.register,
        userData,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      // Call logout endpoint if available
      const response = await this.post<ApiResponse>(API_ENDPOINTS.auth.logout);

      // Clear local auth token regardless of server response
      await this.clearAuthToken();

      return response;
    } catch (error) {
      // Clear token even if logout endpoint fails
      await this.clearAuthToken();

      // Return success to not block logout flow
      return {
        success: true,
        message: "Logged out successfully",
      };
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await this.post<AuthResponse>(
        API_ENDPOINTS.auth.refresh,
      );

      return response;
    } catch (error) {
      // Clear token if refresh fails
      await this.clearAuthToken();
      throw error;
    }
  }

  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await this.get<ApiResponse<User>>(
        API_ENDPOINTS.users.profile,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await this.put<ApiResponse<User>>(
        API_ENDPOINTS.users.update,
        userData,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Helper method to check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }

  // Helper method to get current auth state
  async getAuthState(): Promise<{
    isAuthenticated: boolean;
    token: string | null;
  }> {
    const token = await this.getAuthToken();
    return {
      isAuthenticated: !!token,
      token,
    };
  }
}
