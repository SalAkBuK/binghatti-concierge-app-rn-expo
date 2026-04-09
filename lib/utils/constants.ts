import type { User, RequestStatus, RequestPriority } from "../types";

// Navigation items for different user roles
export const NAVIGATION_ITEMS = {
  tenant: [
    { id: "tenant-home", icon: "home", label: "Home" },
    { id: "tenant-requests", icon: "message-circle", label: "Requests" },
    { id: "tenant-new-request", icon: "plus", label: "New" },
    { id: "tenant-profile", icon: "user", label: "Profile" },
  ],
  owner: [
    { id: "owner-home", icon: "home", label: "Home" },
    { id: "owner-units", icon: "building", label: "Units" },
    { id: "owner-requests", icon: "clipboard-list", label: "Requests" },
    { id: "owner-messages", icon: "message-circle", label: "Messages" },
    { id: "owner-notifications", icon: "bell", label: "Alerts" },
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
  owner: "owner-home",
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
  resident_requests: "binghatti_resident_requests",
  notifications: "binghatti_notifications",
  notices: "binghatti_notices",
  auth_token: "binghatti_auth_token",
  refresh_token: "binghatti_refresh_token",
  user_data: "binghatti_user_data",
  user_role: "binghatti_user_role",
  conversations: "binghatti_conversations",
  push_device_token: "binghatti_push_device_token",
  owner_push_device_id: "binghatti_owner_push_device_id",
  owner_push_device_token: "binghatti_owner_push_device_token",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    changePassword: "/auth/change-password",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
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
    meProfile: "/resident/me/profile",
    meAvatar: "/resident/me/avatar",
    visitors: "/resident/visitors",
    visitorDetail: (visitorId: string) => `/resident/visitors/${visitorId}`,
    visitorCancel: (visitorId: string) =>
      `/resident/visitors/${visitorId}/cancel`,
    activeLeaseDocuments: "/resident/lease/active/documents",
    contracts: "/resident/contracts",
    contractLatest: "/resident/contracts/latest",
    contractDetail: (contractId: string) => `/resident/contracts/${contractId}`,
    contractMoveInRequests: (contractId: string) =>
      `/resident/contracts/${contractId}/move-in-requests`,
    contractMoveOutRequests: (contractId: string) =>
      `/resident/contracts/${contractId}/move-out-requests`,
    contractDocumentsUploadUrl: (contractId: string) =>
      `/resident/contracts/${contractId}/documents/upload-url`,
    contractDocuments: (contractId: string) =>
      `/resident/contracts/${contractId}/documents`,
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
    registerPushDevice: "/notifications/push-devices/register",
    unregisterPushDevice: "/notifications/push-devices/unregister",
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
  conversations: {
    list: "/org/conversations",
    create: "/org/conversations",
    unreadCount: "/org/conversations/unread-count",
    detail: (id: string) => `/org/conversations/${id}`,
    sendMessage: (id: string) => `/org/conversations/${id}/messages`,
    markRead: (id: string) => `/org/conversations/${id}/read`,
    residentManagementContacts: "/resident/messages/management-contacts",
    createResidentManagement: "/resident/messages/management",
    createResidentOwner: "/resident/messages/owner",
  },
  owner: {
    me: "/owner/me",
    meProfile: "/owner/me/profile",
    profile: (ownerId: string) => `/owner/profiles/${ownerId}`,
    summary: "/owner/portfolio/summary",
    units: "/owner/portfolio/units",
    unitTenant: (unitId: string) => `/owner/portfolio/units/${unitId}/tenant`,
    requests: "/owner/portfolio/requests",
    requestDetail: (requestId: string) => `/owner/portfolio/requests/${requestId}`,
    requestApprove: (requestId: string) => `/owner/portfolio/requests/${requestId}/approve`,
    requestReject: (requestId: string) => `/owner/portfolio/requests/${requestId}/reject`,
    requestComments: (requestId: string) => `/owner/portfolio/requests/${requestId}/comments`,
    requestCommentsUnreadCount: "/owner/portfolio/requests/comments/unread-count",
    conversations: "/owner/conversations",
    conversationsUnreadCount: "/owner/conversations/unread-count",
    conversationDetail: (conversationId: string) => `/owner/conversations/${conversationId}`,
    conversationMessages: (conversationId: string) => `/owner/conversations/${conversationId}/messages`,
    conversationRead: (conversationId: string) => `/owner/conversations/${conversationId}/read`,
    createManagementConversation: "/owner/messages/management",
    createTenantConversation: "/owner/messages/tenants",
    notifications: "/owner/notifications",
    notificationsUnreadCount: "/owner/notifications/unread-count",
    notificationsReadAll: "/owner/notifications/read-all",
    notificationRead: (notificationId: string) => `/owner/notifications/${notificationId}/read`,
    notificationDismiss: (notificationId: string) => `/owner/notifications/${notificationId}/dismiss`,
    notificationUndismiss: (notificationId: string) => `/owner/notifications/${notificationId}/undismiss`,
    notificationDevices: "/owner/notifications/devices",
    notificationDevice: (deviceId: string) => `/owner/notifications/devices/${deviceId}`,
  },
  provider: {
    me: "/provider/me",
    requests: "/provider/requests",
    requestDetail: (requestId: string) => `/provider/requests/${requestId}`,
    requestStatus: (requestId: string) => `/provider/requests/${requestId}/status`,
    requestEstimate: (requestId: string) => `/provider/requests/${requestId}/estimate`,
    requestComments: (requestId: string) => `/provider/requests/${requestId}/comments`,
    requestAttachments: (requestId: string) => `/provider/requests/${requestId}/attachments`,
    requestCommentsUnreadCount: "/provider/requests/comments/unread-count",
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
    baseUrl:
      process.env.EXPO_PUBLIC_API_BASE_URL ??
      "https://api.towerdeskpro.com/api",
    timeout: 10000,
    adminLoginUrl: "https://api.towerdeskpro.com/api/auth/login",
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
