import { Dimensions } from "react-native";
import { STATUS_COLORS, PRIORITY_COLORS } from "./constants";
import type {
  Request,
  Notification,
  User,
  RequestStatus,
  RequestPriority,
  NotificationType,
} from "../types";

// Helper function to get status color classes (legacy support)
export const getStatusColor = (status: RequestStatus): string => {
  return STATUS_COLORS[status] || "text-gray-600 bg-gray-100";
};

// Helper function to get priority color classes (legacy support)
export const getPriorityColor = (priority: RequestPriority): string => {
  return PRIORITY_COLORS[priority] || "text-gray-600 bg-gray-100";
};

// Modern status class mapping for new CSS system
export const getModernStatusClass = (status: RequestStatus): string => {
  const statusClasses = {
    pending: "tenant-badge-pending",
    "in-progress": "tenant-badge-progress",
    completed: "tenant-badge-success",
    cancelled: "tenant-badge-error",
  };
  return statusClasses[status] || "tenant-badge-pending";
};

// Modern priority class mapping for new CSS system
export const getModernPriorityClass = (priority: RequestPriority): string => {
  const priorityClasses = {
    high: "tenant-badge-error",
    urgent: "tenant-badge-error",
    medium: "tenant-badge-pending",
    low: "tenant-badge-success",
  };
  return priorityClasses[priority] || "tenant-badge-pending";
};

export const getRoleHomeView = (role: User["role"]): string => {
  const roleViews = {
    tenant: "tenant-home",
    management: "management-dashboard",
    admin: "management-dashboard",
    super_admin: "management-dashboard",
    service_provider: "service-provider-dashboard",
    building_employee: "be-dashboard",
    employee: "be-dashboard",
  };
  return roleViews[role] || "tenant-home";
};

// Generate unique ID
export const generateId = (
  existingItems: { id: string | number }[],
): number => {
  const ids = existingItems
    .map((item) => {
      if (item.id == null) return NaN;
      const parsed = typeof item.id === "string" ? parseInt(item.id, 10) : item.id;
      return isNaN(parsed) ? NaN : parsed;
    })
    .filter((id) => !isNaN(id));

  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
};

// Format date for display
export const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return "Invalid Date";
  }
};

// Format datetime for display
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return "Invalid Date";
  }
};

// Get user by ID from users object
export const getUserById = (
  users: Record<string, User>,
  userId: string,
): User | undefined => {
  return Object.values(users).find((u) => u.id === userId);
};

// Filter requests by user
export const filterRequestsByUser = (
  requests: Request[],
  userId: string,
): Request[] => {
  if (!requests || !Array.isArray(requests)) return [];
  return requests.filter((req) => req.tenantId === userId);
};

// Notification helpers
export const getNotificationBody = (notification: Notification): string => {
  if (notification.body) return notification.body;
  if (notification.message) return notification.message;
  return "";
};

export const isNotificationDismissed = (
  notification: Notification,
): boolean => {
  return Boolean(notification.dismissedAt);
};

export const isNotificationRead = (notification: Notification): boolean => {
  if (notification.readAt) return true;
  return Boolean(notification.read);
};

export const isNotificationUnread = (notification: Notification): boolean => {
  return !isNotificationRead(notification);
};

export const normalizeNotification = (
  notification: Notification,
): Notification => {
  const body = getNotificationBody(notification);
  const normalizedUserId =
    notification.userId != null ? String(notification.userId) : undefined;
  return {
    ...notification,
    userId: normalizedUserId,
    body: notification.body ?? body,
    message: notification.message || body,
    read: isNotificationRead(notification),
  };
};

export const normalizeNotifications = (
  notifications: Notification[],
): Notification[] => {
  if (!notifications || !Array.isArray(notifications)) return [];
  return notifications.map(normalizeNotification);
};

// Filter notifications by user
export const filterNotificationsByUser = (
  notifications: Notification[],
  userId?: string,
): Notification[] => {
  if (!notifications || !Array.isArray(notifications)) return [];
  return notifications.filter((notification) => {
    if (isNotificationDismissed(notification)) return false;
    return true;
  });
};

// Get unread notifications count
export const getUnreadNotificationsCount = (
  notifications: Notification[],
  userId?: string,
): number => {
  if (!notifications || !Array.isArray(notifications)) return 0;
  return notifications.filter(
    (notification) =>
      !isNotificationDismissed(notification) &&
      isNotificationUnread(notification),
  ).length;
};

// React Native screen size helpers (replacing web-specific ones)
export const getScreenDimensions = () => {
  return Dimensions.get("window");
};

export const isSmallScreen = (): boolean => {
  const { width } = Dimensions.get("window");
  return width < 640;
};

export const isMediumScreen = (): boolean => {
  const { width } = Dimensions.get("window");
  return width >= 640 && width < 1024;
};

export const isLargeScreen = (): boolean => {
  const { width } = Dimensions.get("window");
  return width >= 1024;
};

// Form validation helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 10;
};

// File upload helpers
export const validateFileType = (
  file: { type: string },
  allowedTypes: string[],
): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (
  file: { size: number },
  maxSizeMB: number,
): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// Performance optimization helpers
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): T => {
  let timeout: number;
  return ((...args: Parameters<T>) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait) as any;
  }) as T;
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): T => {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

// Additional helper functions for enhanced functionality
export const getRelativeTime = (dateString: string): string => {
  if (!dateString) return "Unknown";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return formatDate(dateString);
  } catch (error) {
    return "Unknown";
  }
};

export const getStatusIcon = (status: RequestStatus): string => {
  const icons = {
    pending: "clock",
    "in-progress": "refresh-cw",
    completed: "check-circle",
    cancelled: "x",
  };
  return icons[status] || "clock";
};

export const getPriorityIcon = (priority: RequestPriority): string => {
  const icons = {
    low: "chevron-down",
    medium: "minus",
    high: "chevron-up",
    urgent: "alert-triangle",
  };
  return icons[priority] || "minus";
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substr(0, maxLength) + "...";
};

export const capitalizeWords = (str: string): string => {
  if (!str) return "";
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
  );
};

export const searchInObject = (obj: any, query: string): boolean => {
  if (!query) return true;

  const searchQuery = query.toLowerCase();
  const searchRecursive = (value: any): boolean => {
    if (typeof value === "string") {
      return value.toLowerCase().includes(searchQuery);
    }
    if (typeof value === "number") {
      return value.toString().includes(searchQuery);
    }
    if (Array.isArray(value)) {
      return value.some((item) => searchRecursive(item));
    }
    if (typeof value === "object" && value !== null) {
      return Object.values(value).some((val) => searchRecursive(val));
    }
    return false;
  };

  return searchRecursive(obj);
};

export const sortRequests = (
  requests: Request[],
  sortBy: string,
): Request[] => {
  return [...requests].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "oldest":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "priority":
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      case "status":
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });
};

export const isRequestEditable = (request: Request): boolean => {
  return request.status === "pending";
};

export const isRequestDeletable = (request: Request): boolean => {
  return request.status === "pending" || request.status === "cancelled";
};

export const getRequestProgress = (status: RequestStatus): number => {
  const progress = {
    pending: 25,
    "in-progress": 75,
    completed: 100,
    cancelled: 0,
  };
  return progress[status] || 0;
};

// Notification helpers
export const createSystemNotification = (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "info",
): Notification => {
  return {
    id: (Date.now() + Math.random()).toString(),
    userId,
    title,
    message,
    body: message,
    type,
    read: false,
    readAt: null,
    dismissedAt: null,
    createdAt: new Date().toISOString(),
  };
};

export const getNotificationTypeColor = (type: NotificationType): string => {
  const colors = {
    success: "bg-green-50 border-green-200 text-green-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    error: "bg-red-50 border-red-200 text-red-800",
  };
  return colors[type] || colors.info;
};

// Request type helpers
export const getRequestTypeIcon = (type: Request["type"]): string => {
  const icons = {
    maintenance: "tool",
    repair: "wrench",
    cleaning: "droplets",
    electrical: "zap",
    plumbing: "droplet",
    hvac: "wind",
    other: "message-circle",
  };
  return icons[type] || "message-circle";
};
