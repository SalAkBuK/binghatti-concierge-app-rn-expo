// Notifications API service

import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type { NotificationsApi, NotificationListParams } from "./types";
import type { ApiResponse, Notification } from "../../types";

export class NotificationsApiService
  extends BaseApiService
  implements NotificationsApi
{
  async getNotifications(
    params?: NotificationListParams,
  ): Promise<ApiResponse<Notification[]>> {
    try {
      const response = await this.get<ApiResponse<Notification[]>>(
        API_ENDPOINTS.notifications.list,
        params,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async markAsRead(id: string): Promise<ApiResponse> {
    try {
      const response = await this.patch<ApiResponse>(
        API_ENDPOINTS.notifications.markRead(id),
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async markAllAsRead(): Promise<ApiResponse> {
    try {
      const response = await this.patch<ApiResponse>(
        API_ENDPOINTS.notifications.markAllRead,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteNotification(id: string): Promise<ApiResponse> {
    try {
      const response = await this.delete<ApiResponse>(
        `${API_ENDPOINTS.notifications.list}/${id}`,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Helper methods for filtering notifications
  async getUnreadNotifications(
    params?: Omit<NotificationListParams, "read">,
  ): Promise<ApiResponse<Notification[]>> {
    return this.getNotifications({ ...params, read: false });
  }

  async getReadNotifications(
    params?: Omit<NotificationListParams, "read">,
  ): Promise<ApiResponse<Notification[]>> {
    return this.getNotifications({ ...params, read: true });
  }

  async getNotificationsByType(
    type: Notification["type"],
    params?: Omit<NotificationListParams, "type">,
  ): Promise<ApiResponse<Notification[]>> {
    return this.getNotifications({ ...params, type });
  }

  // Batch operations
  async markMultipleAsRead(ids: string[]): Promise<ApiResponse> {
    try {
      const response = await this.patch<ApiResponse>(
        `${API_ENDPOINTS.notifications.list}/batch-read`,
        { ids },
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteMultiple(ids: string[]): Promise<ApiResponse> {
    try {
      const response = await this.request<ApiResponse>({
        method: "DELETE",
        url: `${API_ENDPOINTS.notifications.list}/batch-delete`,
        data: { ids },
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get notification count
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    try {
      const response = await this.get<ApiResponse<{ count: number }>>(
        `${API_ENDPOINTS.notifications.list}/unread-count`,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }
}
