import type { User, RequestStatus, RequestPriority } from "../types";

// Navigation items for different user roles
export const NAVIGATION_ITEMS = {
  tenant: [
    { id: "tenant-home", icon: "home", label: "Home" },
    { id: "tenant-requests", icon: "message-circle", label: "Requests" },
    { id: "tenant-new-request", icon: "plus", label: "New" },
    { id: "tenant-profile", icon: "user", label: "Profile" },
  ],
  management: [
    { id: "management-dashboard", icon: "home", label: "Operations" },
    { id: "management-requests", icon: "clipboard-list", label: "Requests" },
    { id: "management-units", icon: "building", label: "Units" },
    { id: "management-services", icon: "wrench", label: "Services" },
    { id: "management-activity", icon: "bell", label: "Activity" },
  ],
  building_employee: [
    { id: "be-dashboard", icon: "home", label: "Dashboard" },
    { id: "be-jobs", icon: "wrench", label: "Jobs" },
    { id: "be-amenities", icon: "activity", label: "Amenities" },
    { id: "be-profile", icon: "user", label: "Profile" },
  ],
} as const;

// Default views for each role
export const ROLE_HOME_VIEWS: Record<User["role"], string> = {
  tenant: "tenant-home",
  management: "management-dashboard",
  building_employee: "be-dashboard",
  admin: "management-dashboard",
  super_admin: "management-dashboard",
  service_provider: "service-provider-dashboard",
  employee: "be-dashboard",
};

// Status and Priority color mappings
export const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: "text-orange-600 bg-orange-100",
  assigned: "text-blue-600 bg-blue-100",
  "in-progress": "text-blue-600 bg-blue-100",
  "on-hold": "text-orange-600 bg-orange-100",
  completed: "text-green-600 bg-green-100",
  cancelled: "text-red-600 bg-red-100",
};

export const PRIORITY_COLORS: Record<RequestPriority, string> = {
  urgent: "text-red-600 bg-red-100",
  high: "text-red-600 bg-red-100",
  medium: "text-yellow-600 bg-yellow-100",
  low: "text-green-600 bg-green-100",
};

// Local storage keys
export const STORAGE_KEYS = {
  users: "binghatti_users",
  requests: "binghatti_requests",
  notifications: "binghatti_notifications",
  notices: "binghatti_notices",
  auth_token: "binghatti_auth_token",
  refresh_token: "binghatti_refresh_token",
  user_data: "binghatti_user_data",
  user_role: "binghatti_user_role",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    changePassword: "/auth/change-password",
  },
  requests: {
    list: "/requests",
    create: "/requests",
    update: (id: string) => `/requests/${id}`,
    delete: (id: string) => `/requests/${id}`,
  },
  residentRequests: {
    list: "/resident/requests",
    detail: (id: string) => `/resident/requests/${id}`,
    update: (id: string) => `/resident/requests/${id}`,
    cancel: (id: string) => `/resident/requests/${id}/cancel`,
    comments: (id: string) => `/resident/requests/${id}/comments`,
  },
  resident: {
    me: "/resident/me",
  },
  orgBuildings: {
    assigned: "/org/buildings/assigned",
    detail: (buildingId: string | number) => `/org/buildings/${buildingId}`,
    occupancyCount: (buildingId: string | number) =>
      `/org/buildings/${buildingId}/occupancies/count`,
    unitsCount: (buildingId: string | number) =>
      `/org/buildings/${buildingId}/units/count`,
    requests: (buildingId: string | number) => `/org/buildings/${buildingId}/requests`,
    request: (buildingId: string | number, requestId: string | number) =>
      `/org/buildings/${buildingId}/requests/${requestId}`,
    requestAssign: (buildingId: string | number, requestId: string | number) =>
      `/org/buildings/${buildingId}/requests/${requestId}/assign`,
    requestStatus: (buildingId: string | number, requestId: string | number) =>
      `/org/buildings/${buildingId}/requests/${requestId}/status`,
    requestCancel: (buildingId: string | number, requestId: string | number) =>
      `/org/buildings/${buildingId}/requests/${requestId}/cancel`,
    requestComments: (buildingId: string | number, requestId: string | number) =>
      `/org/buildings/${buildingId}/requests/${requestId}/comments`,
    requestAttachments: (buildingId: string | number, requestId: string | number) =>
      `/org/buildings/${buildingId}/requests/${requestId}/attachments`,
    assignments: (buildingId: string | number) =>
      `/org/buildings/${buildingId}/assignments`,
  },
  users: {
    profile: "/users/me",
    update: "/users/me/profile",
    assignments: "/users/me/assignments",
    list: "/users",
  },
  // Role-specific profile endpoints
  profile: {
    admin: {
      get: "/api/Admin/profile",
      update: "/api/Admin/profile",
      upload: "/api/Admin/profile/upload",
    },
    management: {
      get: "/api/Management/profile",
      update: "/api/Management/profile",
      upload: "/api/Management/profile/upload",
    },
    tenant: {
      get: "/api/Tenant/profile",
      update: "/api/Tenant/profile",
      upload: "/api/Tenant/profile/upload",
    },
  },
  notifications: {
    list: "/notifications",
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: "/notifications/read-all",
    dismiss: (id: string) => `/notifications/${id}/dismiss`,
    undismiss: (id: string) => `/notifications/${id}/undismiss`,
  },
  employee: {
    jobs: "/employee/jobs",
    job: (id: string) => `/employee/jobs/${id}`,
    acceptJob: (id: string) => `/employee/jobs/${id}/accept`,
    declineJob: (id: string) => `/employee/jobs/${id}/decline`,
    startJob: (id: string) => `/employee/jobs/${id}/start`,
    uploadPhoto: (id: string) => `/employee/jobs/${id}/photos`,
    addCost: (id: string) => `/employee/jobs/${id}/costs`,
    completeJob: (id: string) => `/employee/jobs/${id}/complete`,
    messages: "/employee/messages",
    sendMessage: "/employee/messages",
    earnings: "/employee/earnings",
    profile: "/employee/profile",
    updateProfile: "/employee/profile",
  },
  admin: {
    createUser: "/api/Admin/create",
    updateUser: (id: string | number) => `/api/Admin/update/${id}`,
    deleteUser: (id: string | number) => `/api/Admin/delete/${id}`,
    getUsers: "/api/Admin/users",
    getUser: (id: string | number) => `/api/Admin/users/${id}`,
  },
} as const;

// App configuration
export const APP_CONFIG = {
  api: {
    baseUrl: "http://13.50.241.81/api",
    timeout: 10000,
    adminLoginUrl: "http://13.50.241.81/api/auth/login",
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  validation: {
    minPasswordLength: 8,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedDocumentTypes: ["application/pdf", "text/plain"],
  },
} as const;

