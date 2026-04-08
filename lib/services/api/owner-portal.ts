import { BaseApiService } from './base';
import { API_ENDPOINTS } from '../../utils/constants';
import { mapRequestContractFields } from '../../utils/request-contract';
import type {
  CreateOwnerManagementConversationDTO,
  CreateOwnerTenantConversationDTO,
  OwnerConversation,
  OwnerConversationDetail,
  OwnerConversationListResponse,
  OwnerNotification,
  OwnerNotificationListResponse,
  OwnerNotificationsListParams,
  OwnerPortfolioRequest,
  OwnerPortfolioSummary,
  OwnerPortfolioUnit,
  OwnerUnitTenant,
  OwnerRequestComment,
} from '../../types';
import type { PushDevicePayload } from './types';

type CursorList<T> = {
  items: T[];
  nextCursor: string | null;
};

const getArrayCandidate = <T>(response: any): T[] => {
  const candidate =
    response?.data?.items ??
    response?.items ??
    response?.data ??
    response;

  return Array.isArray(candidate) ? candidate : [];
};

const getCursorListCandidate = <T>(response: any): CursorList<T> => {
  const data = response?.data ?? response;
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(response?.items)
      ? response.items
      : [];

  return {
    items,
    nextCursor:
      typeof data?.nextCursor === 'string'
        ? data.nextCursor
        : data?.nextCursor == null
          ? null
          : String(data.nextCursor),
  };
};

const getObjectCandidate = <T>(response: any): T => {
  const candidate =
    response?.data?.conversation ??
    response?.conversation ??
    response?.data?.request ??
    response?.request ??
    response?.data?.comment ??
    response?.comment ??
    response?.data?.notification ??
    response?.notification ??
    response?.data?.item ??
    response?.data ??
    response;

  return candidate as T;
};

const getUnreadCountCandidate = (response: any): number => {
  const candidate =
    response?.data?.unreadCount ??
    response?.unreadCount ??
    response?.data?.count ??
    response?.count ??
    0;

  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : 0;
};

const normalizeOwnerPortfolioRequest = (
  request: OwnerPortfolioRequest,
): OwnerPortfolioRequest => ({
  ...request,
  ...mapRequestContractFields(request),
});

export class OwnerPortalApiService extends BaseApiService {
  async getSummary(): Promise<OwnerPortfolioSummary> {
    const response = await this.get(API_ENDPOINTS.owner.summary);
    return getObjectCandidate<OwnerPortfolioSummary>(response);
  }

  async getUnits(): Promise<OwnerPortfolioUnit[]> {
    const response = await this.get(API_ENDPOINTS.owner.units);
    return getArrayCandidate<OwnerPortfolioUnit>(response);
  }

  async getUnitTenant(unitId: string): Promise<OwnerUnitTenant | null> {
    const response = await this.get(API_ENDPOINTS.owner.unitTenant(unitId));
    const candidate =
      response?.data?.tenant ??
      response?.tenant ??
      response?.data ??
      response ??
      null;

    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    return candidate as OwnerUnitTenant;
  }

  async getRequests(): Promise<OwnerPortfolioRequest[]> {
    const response = await this.get(API_ENDPOINTS.owner.requests);
    return getArrayCandidate<OwnerPortfolioRequest>(response).map(
      normalizeOwnerPortfolioRequest,
    );
  }

  async getRequest(requestId: string): Promise<OwnerPortfolioRequest> {
    const response = await this.get(API_ENDPOINTS.owner.requestDetail(requestId));
    return normalizeOwnerPortfolioRequest(
      getObjectCandidate<OwnerPortfolioRequest>(response),
    );
  }

  async getUnreadRequestCommentCount(): Promise<number> {
    const response = await this.get(API_ENDPOINTS.owner.requestCommentsUnreadCount);
    return getUnreadCountCandidate(response);
  }

  async approveRequest(
    requestId: string,
    approvalReason?: string,
  ): Promise<OwnerPortfolioRequest> {
    const response = await this.post(
      API_ENDPOINTS.owner.requestApprove(requestId),
      approvalReason ? { approvalReason } : {},
    );
    return getObjectCandidate<OwnerPortfolioRequest>(response);
  }

  async rejectRequest(
    requestId: string,
    approvalReason: string,
  ): Promise<OwnerPortfolioRequest> {
    const response = await this.post(
      API_ENDPOINTS.owner.requestReject(requestId),
      { approvalReason },
    );
    return getObjectCandidate<OwnerPortfolioRequest>(response);
  }

  async getRequestComments(requestId: string): Promise<OwnerRequestComment[]> {
    const response = await this.get(API_ENDPOINTS.owner.requestComments(requestId));
    return getArrayCandidate<OwnerRequestComment>(response);
  }

  async addRequestComment(
    requestId: string,
    message: string,
  ): Promise<OwnerRequestComment> {
    const response = await this.post(
      API_ENDPOINTS.owner.requestComments(requestId),
      { message },
    );
    return getObjectCandidate<OwnerRequestComment>(response);
  }

  async createManagementConversation(
    payload: CreateOwnerManagementConversationDTO,
  ): Promise<OwnerConversation> {
    const response = await this.post(
      API_ENDPOINTS.owner.createManagementConversation,
      payload,
    );
    return getObjectCandidate<OwnerConversation>(response);
  }

  async createTenantConversation(
    payload: CreateOwnerTenantConversationDTO,
  ): Promise<OwnerConversation> {
    const response = await this.post(
      API_ENDPOINTS.owner.createTenantConversation,
      payload,
    );
    return getObjectCandidate<OwnerConversation>(response);
  }

  async getConversations(params?: {
    limit?: number;
    cursor?: string | null;
  }): Promise<OwnerConversationListResponse> {
    const response = await this.get(API_ENDPOINTS.owner.conversations, params);
    return getCursorListCandidate<OwnerConversation>(response);
  }

  async getConversationUnreadCount(): Promise<number> {
    const response = await this.get(API_ENDPOINTS.owner.conversationsUnreadCount);
    return getUnreadCountCandidate(response);
  }

  async getConversation(conversationId: string): Promise<OwnerConversationDetail> {
    const response = await this.get(
      API_ENDPOINTS.owner.conversationDetail(conversationId),
    );
    return getObjectCandidate<OwnerConversationDetail>(response);
  }

  async sendConversationMessage(
    conversationId: string,
    content: string,
  ): Promise<void> {
    await this.post(
      API_ENDPOINTS.owner.conversationMessages(conversationId),
      { content },
    );
  }

  async markConversationRead(conversationId: string): Promise<void> {
    await this.post(API_ENDPOINTS.owner.conversationRead(conversationId));
  }

  async getNotifications(
    params?: OwnerNotificationsListParams,
  ): Promise<OwnerNotificationListResponse> {
    const response = await this.get(API_ENDPOINTS.owner.notifications, params);
    return getCursorListCandidate<OwnerNotification>(response);
  }

  async getNotificationUnreadCount(): Promise<number> {
    const response = await this.get(API_ENDPOINTS.owner.notificationsUnreadCount);
    return getUnreadCountCandidate(response);
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.post(API_ENDPOINTS.owner.notificationsReadAll);
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.post(API_ENDPOINTS.owner.notificationRead(notificationId));
  }

  async dismissNotification(notificationId: string): Promise<void> {
    await this.post(API_ENDPOINTS.owner.notificationDismiss(notificationId));
  }

  async undismissNotification(notificationId: string): Promise<void> {
    await this.post(API_ENDPOINTS.owner.notificationUndismiss(notificationId));
  }

  async registerNotificationDevice(
    payload: PushDevicePayload,
  ): Promise<{ id?: string | null }> {
    const response = await this.post(API_ENDPOINTS.owner.notificationDevices, payload);
    return getObjectCandidate<{ id?: string | null }>(response);
  }

  async updateNotificationDevice(
    deviceId: string,
    payload: PushDevicePayload,
  ): Promise<{ id?: string | null }> {
    const response = await this.patch(
      API_ENDPOINTS.owner.notificationDevice(deviceId),
      payload,
    );
    return getObjectCandidate<{ id?: string | null }>(response);
  }

  async deleteNotificationDevice(deviceId: string): Promise<void> {
    await this.delete(API_ENDPOINTS.owner.notificationDevice(deviceId));
  }
}

export const ownerPortalApi = new OwnerPortalApiService();
