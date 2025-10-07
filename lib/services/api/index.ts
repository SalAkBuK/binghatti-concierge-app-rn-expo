// Main API service - combines all API modules

import { AuthApiService } from "./auth";
import { RequestsApiService } from "./requests";
import { NotificationsApiService } from "./notifications";
import { UsersApiService } from "./users";
import { AdminApiService } from "./admin";
import type { ApiService } from "./types";

export class MainApiService implements ApiService {
  public requests: RequestsApiService;
  public notifications: NotificationsApiService;
  public users: UsersApiService;
  public admin: AdminApiService;
  private authService: AuthApiService;

  constructor() {
    this.authService = new AuthApiService();
    this.requests = new RequestsApiService();
    this.notifications = new NotificationsApiService();
    this.users = new UsersApiService();
    this.admin = new AdminApiService();
  }

  // Auth methods (delegated to AuthApiService)
  async login(credentials: any) {
    return this.authService.login(credentials);
  }

  async register(userData: any) {
    return this.authService.register(userData);
  }

  async logout() {
    return this.authService.logout();
  }

  async refreshToken() {
    return this.authService.refreshToken();
  }

  async getProfile() {
    return this.authService.getProfile();
  }

  async updateProfile(userData: any) {
    return this.authService.updateProfile(userData);
  }

  // Base methods (delegated to AuthService for token management)
  async request<T = any>(config: any): Promise<T> {
    return this.authService.request<T>(config);
  }

  async get<T = any>(url: string, params?: any): Promise<T> {
    return this.authService.get<T>(url, params);
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    return this.authService.post<T>(url, data);
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    return this.authService.put<T>(url, data);
  }

  async patch<T = any>(url: string, data?: any): Promise<T> {
    return this.authService.patch<T>(url, data);
  }

  async delete<T = any>(url: string): Promise<T> {
    return this.authService.delete<T>(url);
  }

  // Token management
  async setAuthToken(token: string): Promise<void> {
    await this.authService.setAuthToken(token);
    // Sync token across all services
    await this.requests.setAuthToken(token);
    await this.notifications.setAuthToken(token);
    await this.users.setAuthToken(token);
    await this.admin.setAuthToken(token);
  }

  async clearAuthToken(): Promise<void> {
    await this.authService.clearAuthToken();
    // Clear token from all services
    await this.requests.clearAuthToken();
    await this.notifications.clearAuthToken();
    await this.users.clearAuthToken();
    await this.admin.clearAuthToken();
  }

  async getAuthToken(): Promise<string | null> {
    return this.authService.getAuthToken();
  }

  // Helper method to check authentication
  async isAuthenticated(): Promise<boolean> {
    return this.authService.isAuthenticated();
  }

  // Helper method to get auth state
  async getAuthState() {
    return this.authService.getAuthState();
  }
}

// Create and export singleton instance
export const apiService = new MainApiService();

// Export types and individual services for advanced usage
export * from "./types";
export { AuthApiService } from "./auth";
export { RequestsApiService } from "./requests";
export { NotificationsApiService } from "./notifications";
export { UsersApiService } from "./users";
export { AdminApiService } from "./admin";
export { BaseApiService } from "./base";

// Default export
export default apiService;
