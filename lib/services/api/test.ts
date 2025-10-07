// Simple test for API service functionality

import { apiService } from "./index";
import type { LoginDTO, RegisterDTO, CreateRequestDTO } from "../../types";

export class ApiServiceTest {
  static async testAuthFlow() {
    console.log("🧪 Testing API Service Auth Flow...");

    try {
      // Test auth state check
      const authState = await apiService.getAuthState();
      console.log("✅ Auth state check:", authState);

      // Test login with mock credentials
      const mockLogin: LoginDTO = {
        email: "test@example.com",
        password: "testpass123",
      };

      console.log("🔑 Testing login...");
      const loginResponse = await apiService.login(mockLogin);
      console.log("✅ Login response:", loginResponse);

      return { success: true, message: "Auth flow test completed" };
    } catch (error) {
      console.error("❌ Auth flow test failed:", error);
      return { success: false, error };
    }
  }

  static async testRequestsFlow() {
    console.log("🧪 Testing API Service Requests Flow...");

    try {
      // Test get requests
      console.log("📋 Testing get requests...");
      const requestsResponse = await apiService.requests.getRequests();
      console.log("✅ Get requests response:", requestsResponse);

      // Test create request
      const mockRequest: CreateRequestDTO = {
        title: "Test Maintenance Request",
        description: "This is a test request for API validation",
        type: "maintenance",
        priority: "medium",
        apartment: "101",
        tower: "A",
      };

      console.log("📝 Testing create request...");
      const createResponse =
        await apiService.requests.createRequest(mockRequest);
      console.log("✅ Create request response:", createResponse);

      return { success: true, message: "Requests flow test completed" };
    } catch (error) {
      console.error("❌ Requests flow test failed:", error);
      return { success: false, error };
    }
  }

  static async testNotificationsFlow() {
    console.log("🧪 Testing API Service Notifications Flow...");

    try {
      // Test get notifications
      console.log("🔔 Testing get notifications...");
      const notificationsResponse =
        await apiService.notifications.getNotifications();
      console.log("✅ Get notifications response:", notificationsResponse);

      // Test get unread count
      console.log("📊 Testing get unread count...");
      const unreadCountResponse =
        await apiService.notifications.getUnreadCount();
      console.log("✅ Unread count response:", unreadCountResponse);

      return { success: true, message: "Notifications flow test completed" };
    } catch (error) {
      console.error("❌ Notifications flow test failed:", error);
      return { success: false, error };
    }
  }

  static async runAllTests() {
    console.log("🚀 Starting API Service Integration Tests...");

    const results = {
      auth: await this.testAuthFlow(),
      requests: await this.testRequestsFlow(),
      notifications: await this.testNotificationsFlow(),
    };

    console.log("📊 Test Results Summary:");
    console.log("Auth:", results.auth.success ? "✅ PASS" : "❌ FAIL");
    console.log("Requests:", results.requests.success ? "✅ PASS" : "❌ FAIL");
    console.log(
      "Notifications:",
      results.notifications.success ? "✅ PASS" : "❌ FAIL",
    );

    const allPassed = Object.values(results).every((result) => result.success);
    console.log(
      "\n🎯 Overall Result:",
      allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED",
    );

    return {
      success: allPassed,
      results,
      summary: {
        total: 3,
        passed: Object.values(results).filter((r) => r.success).length,
        failed: Object.values(results).filter((r) => !r.success).length,
      },
    };
  }

  // Helper method to test connection without auth
  static async testConnection() {
    console.log("🌐 Testing API connection...");

    try {
      // Try a simple GET request to test connectivity
      const response = await fetch("https://1bnx.online/api", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        console.log("✅ API connection successful");
        return { success: true, status: response.status };
      } else {
        console.log("⚠️ API responded with status:", response.status);
        return {
          success: false,
          status: response.status,
          message: "Non-200 response",
        };
      }
    } catch (error) {
      console.error("❌ API connection failed:", error);
      return { success: false, error, message: "Connection failed" };
    }
  }
}

// Export for easy testing
export default ApiServiceTest;
