// API service layer types

import type {
  User,
  Request,
  Notification,
  LoginDTO,
  ChangePasswordDTO,
  ForgotPasswordDTO,
  ResetPasswordWithTokenDTO,
  UpdateProfileDTO,
  CreateRequestDTO,
  UpdateRequestDTO,
  ApiResponse,
  AuthResponse,
  Job,
  AcceptJobAssignmentDTO,
  DeclineJobAssignmentDTO,
  StartJobDTO,
  UploadJobPhotoDTO,
  AddJobAdditionalCostDTO,
  CompleteJobDTO,
  EmployeeMessage,
  SendEmployeeMessageDTO,
  EmployeeEarnings,
  ResidentLatestContract,
  ResidentIdentity,
  ResidentParkingAllocation,
  ResidentContract,
  ResidentContractsListResponse,
  ResidentAvatarUploadResponse,
  ListResidentContractsParams,
  CreateResidentMoveRequestDTO,
  ListResidentMoveRequestsParams,
  ResidentMoveRequest,
  CreateResidentContractDocumentUploadUrlDTO,
  ResidentContractDocumentUploadUrlResponse,
  CreateResidentContractDocumentDTO,
  ResidentContractDocument,
  UpdateResidentExtendedProfileDTO,
  ResidentExtendedProfile,
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
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
  retryCount?: number;
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
  logout(): Promise<ApiResponse>;
  refreshToken(): Promise<AuthResponse>;
  changePassword(data: ChangePasswordDTO): Promise<ApiResponse>;
  forgotPassword(data: ForgotPasswordDTO): Promise<ApiResponse>;
  resetPassword(data: ResetPasswordWithTokenDTO): Promise<ApiResponse>;
  getProfile(): Promise<ApiResponse<User>>;
  updateProfile(userData: UpdateProfileDTO): Promise<ApiResponse<User>>;
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
  dismissNotification(id: string): Promise<ApiResponse>;
  undismissNotification(id: string): Promise<ApiResponse>;
  registerPushDevice(payload: PushDevicePayload): Promise<ApiResponse>;
  unregisterPushDevice(payload: PushDevicePayload): Promise<ApiResponse>;
}

// Users API endpoints
export interface UsersApi {
  getUsers(params?: UserListParams): Promise<ApiResponse<User[]>>;
  getUser(id: string): Promise<ApiResponse<User>>;
  updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>>;
  deleteUser(id: string): Promise<ApiResponse>;
  getMyAssignments(): Promise<ApiResponse<any[]>>;
}

// Employee API endpoints
export interface EmployeeApi {
  getJobs(params?: EmployeeJobListParams): Promise<ApiResponse<Job[]>>;
  getJob(id: string): Promise<ApiResponse<Job>>;
  acceptJob(id: string, data: AcceptJobAssignmentDTO): Promise<ApiResponse>;
  declineJob(id: string, data: DeclineJobAssignmentDTO): Promise<ApiResponse>;
  startJob(id: string, data: StartJobDTO): Promise<ApiResponse<Job>>;
  uploadPhoto(id: string, data: UploadJobPhotoDTO): Promise<ApiResponse>;
  addAdditionalCost(id: string, data: AddJobAdditionalCostDTO): Promise<ApiResponse>;
  completeJob(id: string, data: CompleteJobDTO): Promise<ApiResponse<Job>>;
  getMessages(params?: EmployeeMessageListParams): Promise<ApiResponse<EmployeeMessage[]>>;
  sendMessage(data: SendEmployeeMessageDTO): Promise<ApiResponse<EmployeeMessage>>;
  getEarnings(params?: EmployeeEarningsParams): Promise<ApiResponse<EmployeeEarnings>>;
  getProfile(): Promise<ApiResponse<User>>;
  updateProfile(data: Partial<User>): Promise<ApiResponse<User>>;
}

export interface ResidentSelfServiceApi {
  getResidentIdentity(): Promise<ResidentIdentity>;
  getResidentActiveParkingAllocation(): Promise<ResidentParkingAllocation | null>;
  uploadResidentAvatar(file: {
    uri: string;
    type: string;
    name: string;
  }): Promise<ResidentAvatarUploadResponse>;
  getResidentLatestContract(): Promise<ResidentLatestContract>;
  getResidentContractDetail(contractId: string): Promise<ResidentContract>;
  listResidentActiveLeaseDocuments(): Promise<ResidentContractDocument[]>;
  listResidentContracts(
    params?: ListResidentContractsParams,
  ): Promise<ResidentContractsListResponse>;
  createResidentMoveInRequest(
    contractId: string,
    payload: CreateResidentMoveRequestDTO,
  ): Promise<ResidentMoveRequest>;
  createResidentMoveOutRequest(
    contractId: string,
    payload: CreateResidentMoveRequestDTO,
  ): Promise<ResidentMoveRequest>;
  listResidentMoveInRequests(
    contractId: string,
    params?: ListResidentMoveRequestsParams,
  ): Promise<ResidentMoveRequest[]>;
  listResidentMoveOutRequests(
    contractId: string,
    params?: ListResidentMoveRequestsParams,
  ): Promise<ResidentMoveRequest[]>;
  createResidentContractDocumentUploadUrl(
    contractId: string,
    payload: CreateResidentContractDocumentUploadUrlDTO,
  ): Promise<ResidentContractDocumentUploadUrlResponse>;
  createResidentContractDocument(
    contractId: string,
    payload: CreateResidentContractDocumentDTO,
  ): Promise<ResidentContractDocument>;
  updateResidentProfile(
    payload: UpdateResidentExtendedProfileDTO,
  ): Promise<ResidentExtendedProfile>;
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
  cursor?: string;
  unreadOnly?: boolean;
  read?: boolean;
  type?: Notification["type"];
}

export type PushDeviceProvider = "EXPO" | "FCM" | "APNS";
export type PushDevicePlatform = "ANDROID" | "IOS" | "WEB";

export interface PushDevicePayload {
  token: string;
  provider?: PushDeviceProvider;
  platform?: PushDevicePlatform;
  deviceId?: string;
  appId?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: User["role"];
  search?: string;
}

export interface EmployeeJobListParams {
  page?: number;
  limit?: number;
  status?: Job["status"];
  priority?: Job["priority"];
}

export interface EmployeeMessageListParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface EmployeeEarningsParams {
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number;
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
  setAuthTokens(tokens: { accessToken: string; refreshToken: string }): void;
  clearAuthToken(): void;
  getAuthToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
}

// Response interceptor type
export type ResponseInterceptor<T = any> = (response: T) => T | Promise<T>;

// Request interceptor type
export type RequestInterceptor = (
  config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>;

// Error handler type
export type ErrorHandler = (error: ApiError) => void | Promise<void>;
