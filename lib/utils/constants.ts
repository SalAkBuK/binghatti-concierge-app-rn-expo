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
    { id: "management-tenants", icon: "users", label: "Tenants" },
    { id: "management-units", icon: "building", label: "Units" },
    { id: "management-services", icon: "wrench", label: "Services" },
    { id: "management-activity", icon: "bell", label: "Activity" },
  ],
  admin: [
    { id: "admin-dashboard", icon: "home", label: "Dashboard" },
    { id: "admin-users", icon: "users", label: "Users" },
    { id: "admin-settings", icon: "settings", label: "Settings" },
    { id: "admin-analytics", icon: "bar-chart-3", label: "Analytics" },
  ],
  super_admin: [
    { id: "super-admin-dashboard", icon: "home", label: "Dashboard" },
    { id: "super-admin-users", icon: "users", label: "Users" },
    { id: "super-admin-buildings", icon: "business", label: "Buildings" },
    { id: "super-admin-analytics", icon: "bar-chart-3", label: "Analytics" },
  ],
  service_provider: [
    { id: "provider-dashboard", icon: "home", label: "Dashboard" },
    { id: "provider-jobs", icon: "wrench", label: "Jobs" },
    { id: "provider-schedule", icon: "calendar", label: "Schedule" },
    { id: "provider-profile", icon: "user", label: "Profile" },
  ],
  employee: [
    { id: "employee-dashboard", icon: "home", label: "Dashboard" },
    { id: "employee-tasks", icon: "wrench", label: "Tasks" },
    { id: "employee-schedule", icon: "calendar", label: "Schedule" },
    { id: "employee-profile", icon: "user", label: "Profile" },
  ],
} as const;

// Default views for each role
export const ROLE_HOME_VIEWS: Record<User["role"], string> = {
  tenant: "tenant-home",
  management: "management-dashboard",
  admin: "admin-dashboard",
  super_admin: "super-admin-dashboard",
  service_provider: "provider-dashboard",
  employee: "employee-dashboard",
};

// Status and Priority color mappings
export const STATUS_COLORS: Record<RequestStatus, string> = {
  pending: "text-orange-600 bg-orange-100",
  "in-progress": "text-blue-600 bg-blue-100",
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
  user_data: "binghatti_user_data",
  user_role: "binghatti_user_role",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
  },
  requests: {
    list: "/requests",
    create: "/requests",
    update: (id: string) => `/requests/${id}`,
    delete: (id: string) => `/requests/${id}`,
  },
  users: {
    profile: "/users/profile",
    update: "/users/profile",
    list: "/users",
  },
  notifications: {
    list: "/notifications",
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: "/notifications/read-all",
  },
} as const;

// App configuration
export const APP_CONFIG = {
  api: {
    baseUrl: "https://1bnx.online/api",
    timeout: 10000,
    adminLoginUrl: "http://16.171.240.211/api/Auth/login",
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
