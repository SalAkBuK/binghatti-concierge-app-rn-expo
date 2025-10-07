// API service layer types

import type {
  User,
  Request,
  Notification,
  LoginDTO,
  RegisterDTO,
  CreateRequestDTO,
  UpdateRequestDTO,
  ApiResponse,
  AuthResponse,
} from "../../types";

// Base API configuration
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers?: Record<string, string>;
}

// HTTP methods
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Request configuration
export interface RequestConfig {
  method: HttpMethod;
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

// API Error types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

// Auth API endpoints
export interface AuthApi {
  login(credentials: LoginDTO): Promise<AuthResponse>;
  register(userData: RegisterDTO): Promise<ApiResponse>;
  logout(): Promise<ApiResponse>;
  refreshToken(): Promise<AuthResponse>;
  getProfile(): Promise<ApiResponse<User>>;
  updateProfile(userData: Partial<User>): Promise<ApiResponse<User>>;
}

// Requests API endpoints
export interface RequestsApi {
  getRequests(params?: RequestListParams): Promise<ApiResponse<Request[]>>;
  getRequest(id: string): Promise<ApiResponse<Request>>;
  createRequest(data: CreateRequestDTO): Promise<ApiResponse<Request>>;
  updateRequest(
    id: string,
    data: UpdateRequestDTO,
  ): Promise<ApiResponse<Request>>;
  deleteRequest(id: string): Promise<ApiResponse>;
  addComment(requestId: string, message: string): Promise<ApiResponse>;
}

// Notifications API endpoints
export interface NotificationsApi {
  getNotifications(
    params?: NotificationListParams,
  ): Promise<ApiResponse<Notification[]>>;
  markAsRead(id: string): Promise<ApiResponse>;
  markAllAsRead(): Promise<ApiResponse>;
  deleteNotification(id: string): Promise<ApiResponse>;
}

// Users API endpoints
export interface UsersApi {
  getUsers(params?: UserListParams): Promise<ApiResponse<User[]>>;
  getUser(id: string): Promise<ApiResponse<User>>;
  updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>>;
  deleteUser(id: string): Promise<ApiResponse>;
}

// List parameters
export interface RequestListParams {
  page?: number;
  limit?: number;
  status?: Request["status"];
  priority?: Request["priority"];
  type?: Request["type"];
  tenantId?: string;
  assignedTo?: string;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  read?: boolean;
  type?: Notification["type"];
}

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: User["role"];
  search?: string;
}

// Main API service interface
export interface ApiService extends AuthApi {
  requests: RequestsApi;
  notifications: NotificationsApi;
  users: UsersApi;

  // Base methods
  request<T = any>(config: RequestConfig): Promise<T>;
  get<T = any>(url: string, params?: any): Promise<T>;
  post<T = any>(url: string, data?: any): Promise<T>;
  put<T = any>(url: string, data?: any): Promise<T>;
  patch<T = any>(url: string, data?: any): Promise<T>;
  delete<T = any>(url: string): Promise<T>;

  // Token management
  setAuthToken(token: string): void;
  clearAuthToken(): void;
  getAuthToken(): Promise<string | null>;
}

// Response interceptor type
export type ResponseInterceptor<T = any> = (response: T) => T | Promise<T>;

// Request interceptor type
export type RequestInterceptor = (
  config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>;

// Error handler type
export type ErrorHandler = (error: ApiError) => void | Promise<void>;
