// Authentication API service

import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type { AuthApi } from "./types";
import type {
  LoginDTO,
  ChangePasswordDTO,
  ForgotPasswordDTO,
  ResetPasswordWithTokenDTO,
  UpdateProfileDTO,
  AuthResponse,
  ApiResponse,
  User,
} from "../../types";

export class AuthApiService extends BaseApiService implements AuthApi {
  constructor() {
    super();

    // Add response interceptor to handle auth tokens from login/refresh
    this.addResponseInterceptor(async (response: any) => {
      const accessToken = response?.accessToken ?? response?.data?.accessToken;
      const refreshToken = response?.refreshToken ?? response?.data?.refreshToken;

      if (accessToken && refreshToken) {
        await this.setAuthTokens(accessToken, refreshToken);
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
      const response = await this.request<AuthResponse>({
        method: "POST",
        url: API_ENDPOINTS.auth.login,
        data: credentials,
        skipAuth: true,
        skipAuthRefresh: true,
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      // Clear local auth tokens regardless of server response
      await this.clearAuthToken();

      return {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error) {
      // Clear tokens even if logout fails
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
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error("Refresh token is missing");
      }

      const response = await this.request<AuthResponse>({
        method: "POST",
        url: API_ENDPOINTS.auth.refresh,
        data: { refreshToken },
        skipAuth: true,
        skipAuthRefresh: true,
      });

      return response;
    } catch (error) {
      // Clear token if refresh fails
      await this.clearAuthToken();
      throw error;
    }
  }

  async changePassword(data: ChangePasswordDTO): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        API_ENDPOINTS.auth.changePassword,
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async forgotPassword(data: ForgotPasswordDTO): Promise<ApiResponse> {
    try {
      const response = await this.request<ApiResponse>({
        method: "POST",
        url: API_ENDPOINTS.auth.forgotPassword,
        data,
        skipAuth: true,
        skipAuthRefresh: true,
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(data: ResetPasswordWithTokenDTO): Promise<ApiResponse> {
    try {
      const response = await this.request<ApiResponse>({
        method: "POST",
        url: API_ENDPOINTS.auth.resetPassword,
        data,
        skipAuth: true,
        skipAuthRefresh: true,
      });

      return response;
    } catch (error) {
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

  async updateProfile(userData: UpdateProfileDTO): Promise<ApiResponse<User>> {
    try {
      const response = await this.patch<ApiResponse<User>>(
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
