// Notifications API service

import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type {
  NotificationsApi,
  NotificationListParams,
  PushDevicePayload,
} from "./types";
import type { ApiResponse, Notification } from "../../types";

export class NotificationsApiService
  extends BaseApiService
  implements NotificationsApi
{
  private buildPushPayloadCandidates(payload: PushDevicePayload) {
    const token = payload.token?.trim();
    if (!token) return [];

    const provider = payload.provider?.trim();
    const platform = payload.platform?.trim();
    const deviceId = payload.deviceId?.trim();
    const providerLower = provider?.toLowerCase();
    const platformLower = platform?.toLowerCase();

    const fullPayload = {
      token,
      ...(provider ? { provider } : {}),
      ...(platform ? { platform } : {}),
      ...(deviceId ? { deviceId } : {}),
    };

    const fullPushTokenPayload = {
      pushToken: token,
      ...(provider ? { provider } : {}),
      ...(platform ? { platform } : {}),
      ...(deviceId ? { deviceId } : {}),
    };

    const fullLowercasePayload = {
      token,
      ...(providerLower ? { provider: providerLower } : {}),
      ...(platformLower ? { platform: platformLower } : {}),
      ...(deviceId ? { deviceId } : {}),
    };

    const fullAliasKeysPayload = {
      pushToken: token,
      ...(provider ? { pushProvider: provider } : {}),
      ...(platform ? { pushPlatform: platform } : {}),
      ...(deviceId ? { deviceId } : {}),
    };

    const tokenOnlyPayload = { token };
    const pushTokenOnlyPayload = { pushToken: token };
    const deviceTokenOnlyPayload = { deviceToken: token };

    return [
      fullPayload,
      fullPushTokenPayload,
      fullLowercasePayload,
      fullAliasKeysPayload,
      tokenOnlyPayload,
      pushTokenOnlyPayload,
      deviceTokenOnlyPayload,
    ];
  }

  private async postPushDeviceWithFallback(
    endpoint: string,
    payload: PushDevicePayload,
  ): Promise<ApiResponse> {
    const candidates = this.buildPushPayloadCandidates(payload);
    if (candidates.length === 0) {
      throw new Error("Push token is required");
    }

    let lastError: unknown = null;
    for (const candidate of candidates) {
      try {
        return await this.post<ApiResponse>(endpoint, candidate);
      } catch (error: any) {
        const status = error?.status;
        lastError = error;
        if (status !== 400 && status !== 404 && status !== 422) {
          throw error;
        }
      }
    }

    throw lastError;
  }

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
      const response = await this.post<ApiResponse>(
        API_ENDPOINTS.notifications.markRead(id),
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async markAllAsRead(): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        API_ENDPOINTS.notifications.markAllRead,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async dismissNotification(id: string): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        API_ENDPOINTS.notifications.dismiss(id),
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async undismissNotification(id: string): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        API_ENDPOINTS.notifications.undismiss(id),
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async registerPushDevice(payload: PushDevicePayload): Promise<ApiResponse> {
    return this.postPushDeviceWithFallback(
      API_ENDPOINTS.notifications.registerPushDevice,
      payload,
    );
  }

  async unregisterPushDevice(payload: PushDevicePayload): Promise<ApiResponse> {
    return this.postPushDeviceWithFallback(
      API_ENDPOINTS.notifications.unregisterPushDevice,
      payload,
    );
  }

  // Helper methods for filtering notifications
  async getUnreadNotifications(
    params?: Omit<NotificationListParams, "read" | "unreadOnly">,
  ): Promise<ApiResponse<Notification[]>> {
    return this.getNotifications({ ...params, unreadOnly: true });
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
