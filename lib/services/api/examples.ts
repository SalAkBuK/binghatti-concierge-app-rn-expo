// Concrete usage examples for the new API service layer

import { apiService } from "./index";
import { useAuth } from "../../context/auth-context";
import { useRequests } from "../../context/requests-context";

// ============================================================================
// 1. COMPONENT USAGE EXAMPLES
// ============================================================================

/**
 * Login Component Example
 * Shows how to use the new API service through context
 */
export function LoginComponentExample() {
  const { actions: authActions, loading, error } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      // This now calls apiService.login() under the hood
      await authActions.login({ email, password });
      console.log("✅ Login successful - user is now authenticated");
    } catch (error: any) {
      console.error("❌ Login failed:", error.message);
      // Error is automatically set in auth context
    }
  };

  return { handleLogin, loading, error };
}

/**
 * Requests Component Example
 * Shows how to use requests through context
 */
export function RequestsComponentExample() {
  const { requests, actions: requestActions, loading } = useRequests();

  const createMaintenanceRequest = async () => {
    try {
      // This now calls apiService.requests.createRequest() under the hood
      const newRequest = await requestActions.createRequest(
        {
          title: "Leaky Faucet",
          description: "Kitchen faucet is dripping constantly",
          type: "plumbing",
          priority: "medium",
          apartment: "101",
          tower: "A",
        },
        "current-user-id",
      );

      console.log("✅ Request created:", newRequest);
    } catch (error: any) {
      console.error("❌ Request creation failed:", error.message);
    }
  };

  const refreshRequests = async () => {
    try {
      await requestActions.loadRequests();
      console.log("✅ Requests refreshed");
    } catch (error: any) {
      console.error("❌ Failed to refresh requests:", error.message);
    }
  };

  return {
    requests,
    createMaintenanceRequest,
    refreshRequests,
    loading,
  };
}

// ============================================================================
// 2. DIRECT API SERVICE USAGE (when not using contexts)
// ============================================================================

/**
 * Direct API Usage Examples
 * For components that need direct API access
 */
export class DirectApiExamples {
  // Auth examples
  static async loginExample() {
    try {
      const response = await apiService.login({
        email: "tenant@example.com",
        password: "password123",
      });

      if (response.accessToken) {
        console.log("User logged in:", response.user);
        console.log("Token stored automatically");
      }
    } catch (error: any) {
      console.error("Login error:", error.message);
    }
  }
  // Requests examples
  static async getRequestsExample() {
    try {
      const response = await apiService.requests.getRequests({
        status: "pending",
        priority: "high",
        limit: 20,
      });

      if (response.success) {
        console.log("✅ Got requests:", response.data);
      }
    } catch (error: any) {
      console.error("❌ Failed to get requests:", error.message);
    }
  }

  static async updateRequestStatusExample() {
    try {
      const requestId = "req-123";

      // Mark as in progress
      const response = await apiService.requests.markAsInProgress(requestId);

      if (response.success) {
        console.log("✅ Request status updated:", response.data);
      }
    } catch (error: any) {
      console.error("❌ Failed to update request:", error.message);
    }
  }

  // Notifications examples
  static async getNotificationsExample() {
    try {
      // Get unread notifications
      const response = await apiService.notifications.getUnreadNotifications({
        limit: 10,
      });

      if (response.success) {
        console.log("✅ Unread notifications:", response.data);

        // Mark all as read
        await apiService.notifications.markAllAsRead();
        console.log("✅ All notifications marked as read");
      }
    } catch (error: any) {
      console.error("❌ Notifications error:", error.message);
    }
  }

  // User management examples
  static async getUsersExample() {
    try {
      // Get all tenants
      const tenantsResponse = await apiService.users.getTenants({ limit: 50 });

      // Search for specific user
      const searchResponse = await apiService.users.searchUsers("john");

      console.log("✅ Tenants:", tenantsResponse.data);
      console.log("✅ Search results:", searchResponse.data);
    } catch (error: any) {
      console.error("❌ Users error:", error.message);
    }
  }
}

// ============================================================================
// 3. ERROR HANDLING PATTERNS
// ============================================================================

export class ErrorHandlingExamples {
  /**
   * Comprehensive error handling example
   */
  static async handleApiErrors() {
    try {
      const response = await apiService.requests.createRequest({
        title: "Test Request",
        description: "Testing error handling",
        type: "maintenance",
        priority: "low",
      });

      console.log("✅ Success:", response.data);
    } catch (error: any) {
      // Handle specific HTTP status codes
      switch (error.status) {
        case 400:
          console.error("❌ Bad Request - Check your input data");
          break;
        case 401:
          console.error("❌ Unauthorized - Please log in again");
          // User will be automatically logged out by the service
          break;
        case 403:
          console.error("❌ Forbidden - You don't have permission");
          break;
        case 404:
          console.error("❌ Not Found - Resource doesn't exist");
          break;
        case 422:
          console.error("❌ Validation Error:", error.message);
          break;
        case 500:
          console.error("❌ Server Error - Please try again later");
          break;
        default:
          // Handle network errors
          if (error.code === "NETWORK_ERROR") {
            console.error("❌ Network Error - Check your connection");
          } else if (error.code === "TIMEOUT") {
            console.error("❌ Request Timeout - Server is slow");
          } else {
            console.error("❌ Unknown Error:", error.message);
          }
      }
    }
  }

  /**
   * Loading state management example
   */
  static async loadingStateExample() {
    let loading = true;

    try {
      console.log("🔄 Loading requests...");

      const response = await apiService.requests.getRequests();

      if (response.success) {
        console.log("✅ Requests loaded:", response.data?.length, "items");
      }
    } catch (error: any) {
      console.error("❌ Loading failed:", error.message);
    } finally {
      loading = false;
      console.log("🔄 Loading complete");
    }
  }
}

// ============================================================================
// 4. AUTHENTICATION STATE MANAGEMENT
// ============================================================================

export class AuthStateExamples {
  /**
   * Check authentication status
   */
  static async checkAuthStatus() {
    const authState = await apiService.getAuthState();

    if (authState.isAuthenticated) {
      console.log("✅ User is authenticated");

      // Get current user profile
      try {
        const profile = await apiService.getProfile();
        if (profile.success) {
          console.log("👤 Current user:", profile.data);
        }
      } catch (error) {
        console.error("❌ Failed to get profile:", error);
      }
    } else {
      console.log("❌ User is not authenticated");
    }
  }

  /**
   * Update user profile
   */
  static async updateProfileExample() {
    try {
      const updatedUser = await apiService.updateProfile({
        name: "John Smith",
        phone: "+1234567890",
      });

      if (updatedUser.success) {
        console.log("✅ Profile updated:", updatedUser.data);
      }
    } catch (error: any) {
      console.error("❌ Profile update failed:", error.message);
    }
  }

  /**
   * Logout example
   */
  static async logoutExample() {
    try {
      await apiService.logout();
      console.log("✅ User logged out successfully");
      console.log("🔑 Token cleared from secure storage");
    } catch (error: any) {
      console.error("❌ Logout error:", error.message);
      // Even if logout fails, token is cleared locally
    }
  }
}

// ============================================================================
// 5. REAL-TIME DATA PATTERNS
// ============================================================================

export class RealTimeExamples {
  /**
   * Polling pattern for real-time updates
   */
  static startRequestsPolling(intervalMs: number = 30000) {
    return setInterval(async () => {
      try {
        const response = await apiService.requests.getRequests();
        if (response.success) {
          console.log("🔄 Requests updated:", response.data?.length, "items");
          // Update your component state here
        }
      } catch (error) {
        console.warn("⚠️ Polling failed:", error);
      }
    }, intervalMs);
  }

  /**
   * Notification polling pattern
   */
  static startNotificationsPolling(intervalMs: number = 15000) {
    return setInterval(async () => {
      try {
        const response = await apiService.notifications.getUnreadCount();
        if (response.success) {
          console.log("🔔 Unread notifications:", response.data?.count);
          // Update badge count in your UI
        }
      } catch (error) {
        console.warn("⚠️ Notification polling failed:", error);
      }
    }, intervalMs);
  }
}

