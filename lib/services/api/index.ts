// Main API service - combines all API modules

import { AuthApiService } from "./auth";
import { RequestsApiService } from "./requests";
import { NotificationsApiService } from "./notifications";
import { UsersApiService } from "./users";
import { AdminApiService } from "./admin";
import { EmployeeApiService } from "./employee";
import { ParcelsApiService } from "./parcels";
import { ShiftsApiService } from "./shifts";
import { MaintenanceApiService } from "./maintenance";
import { BillingApiService } from "./billing";
import { MaintenanceSchedulerApiService } from "./maintenance-scheduler";
import { BroadcastApiService } from "./broadcast";
import { VisitorsApiService } from "./visitors";
import { BuildingsApiService } from "./buildings";
import { TenantsApiService } from "./tenants";
import { ConversationsApiService } from "./conversations";
import { ResidentSelfServiceApiService } from "./resident-self-service";
import type { ApiService } from "./types";

export class MainApiService implements ApiService {
  public requests: RequestsApiService;
  public notifications: NotificationsApiService;
  public users: UsersApiService;
  public admin: AdminApiService;
  public employee: EmployeeApiService;
  public parcels: ParcelsApiService;
  public shifts: ShiftsApiService;
  public maintenance: MaintenanceApiService;
  public billing: BillingApiService;
  public maintenanceScheduler: MaintenanceSchedulerApiService;
  public broadcast: BroadcastApiService;
  public visitors: VisitorsApiService;
  public buildings: BuildingsApiService;
  public tenants: TenantsApiService;
  public conversations: ConversationsApiService;
  public residentSelfService: ResidentSelfServiceApiService;
  private authService: AuthApiService;

  constructor() {
    this.authService = new AuthApiService();
    this.requests = new RequestsApiService();
    this.notifications = new NotificationsApiService();
    this.users = new UsersApiService();
    this.admin = new AdminApiService();
    this.employee = new EmployeeApiService();
    this.parcels = new ParcelsApiService();
    this.shifts = new ShiftsApiService();
    this.maintenance = new MaintenanceApiService();
    this.billing = new BillingApiService();
    this.maintenanceScheduler = new MaintenanceSchedulerApiService();
    this.broadcast = new BroadcastApiService();
    this.visitors = new VisitorsApiService();
    this.buildings = new BuildingsApiService();
    this.tenants = new TenantsApiService();
    this.conversations = new ConversationsApiService();
    this.residentSelfService = new ResidentSelfServiceApiService();
  }

  // Auth methods (delegated to AuthApiService)
  async login(credentials: any) {
    return this.authService.login(credentials);
  }

  async logout() {
    return this.authService.logout();
  }

  async refreshToken() {
    return this.authService.refreshToken();
  }

  async changePassword(data: any) {
    return this.authService.changePassword(data);
  }

  async forgotPassword(data: any) {
    return this.authService.forgotPassword(data);
  }

  async resetPassword(data: any) {
    return this.authService.resetPassword(data);
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
    await this.employee.setAuthToken(token);
    await this.parcels.setAuthToken(token);
    await this.shifts.setAuthToken(token);
    await this.maintenance.setAuthToken(token);
    await this.billing.setAuthToken(token);
    await this.maintenanceScheduler.setAuthToken(token);
    await this.broadcast.setAuthToken(token);
    await this.visitors.setAuthToken(token);
    await this.buildings.setAuthToken(token);
    await this.tenants.setAuthToken(token);
    await this.conversations.setAuthToken(token);
    await this.residentSelfService.setAuthToken(token);
  }

  async setAuthTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    await this.authService.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.requests.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.notifications.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.users.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.admin.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.employee.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.parcels.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.shifts.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.maintenance.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.billing.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.maintenanceScheduler.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.broadcast.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.visitors.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.buildings.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.tenants.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.conversations.setAuthTokens(tokens.accessToken, tokens.refreshToken);
    await this.residentSelfService.setAuthTokens(tokens.accessToken, tokens.refreshToken);
  }

  async clearAuthToken(): Promise<void> {
    await this.authService.clearAuthToken();
    // Clear token from all services
    await this.requests.clearAuthToken();
    await this.notifications.clearAuthToken();
    await this.users.clearAuthToken();
    await this.admin.clearAuthToken();
    await this.employee.clearAuthToken();
    await this.parcels.clearAuthToken();
    await this.shifts.clearAuthToken();
    await this.maintenance.clearAuthToken();
    await this.billing.clearAuthToken();
    await this.maintenanceScheduler.clearAuthToken();
    await this.broadcast.clearAuthToken();
    await this.visitors.clearAuthToken();
    await this.buildings.clearAuthToken();
    await this.tenants.clearAuthToken();
    await this.conversations.clearAuthToken();
    await this.residentSelfService.clearAuthToken();
  }

  async getAuthToken(): Promise<string | null> {
    return this.authService.getAuthToken();
  }

  async getRefreshToken(): Promise<string | null> {
    return this.authService.getRefreshToken();
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
export { EmployeeApiService } from "./employee";
export { ParcelsApiService } from "./parcels";
export { ShiftsApiService } from "./shifts";
export { MaintenanceApiService } from "./maintenance";
export { BillingApiService } from "./billing";
export { MaintenanceSchedulerApiService } from "./maintenance-scheduler";
export { BroadcastApiService } from "./broadcast";
export { VisitorsApiService } from "./visitors";
export { BuildingsApiService } from "./buildings";
export { TenantsApiService } from "./tenants";
export { ConversationsApiService } from "./conversations";
export { ResidentSelfServiceApiService, residentSelfServiceApi } from "./resident-self-service";
export { OwnerPortalApiService, ownerPortalApi } from "./owner-portal";
export { BaseApiService } from "./base";

// Default export
export default apiService;
