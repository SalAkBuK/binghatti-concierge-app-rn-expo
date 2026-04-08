import { BaseApiService } from './base';
import { API_ENDPOINTS } from '../../utils/constants';
import { mapRequestContractFields } from '../../utils/request-contract';
import type {
  ConversationMessage,
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
  OwnerSelfServiceProfile,
  OwnerSelfServiceRuntime,
  OwnerSelfServiceUser,
  OwnerUnitTenant,
  OwnerRequestComment,
  UpdateOwnerProfileDTO,
  UpdateOwnerSelfProfileDTO,
} from '../../types';
import type { PushDevicePayload } from './types';

type CursorList<T> = {
  items: T[];
  nextCursor: string | null;
};

type OwnerProfileApiCallOptions<TResponse, TResult> = {
  action: 'getMe' | 'updateMeProfile' | 'updateOwnerProfile';
  method: 'GET' | 'PATCH';
  endpoint: string;
  payload?: unknown;
  request: () => Promise<TResponse>;
  normalize: (response: TResponse) => TResult;
};

const logOwnerProfileApi = (
  stage: 'request' | 'response' | 'normalized' | 'error',
  details: Record<string, unknown>,
): void => {
  if (!__DEV__) {
    return;
  }

  const logger = stage === 'error' ? console.error : console.log;
  logger(`[OwnerProfileApi] ${stage}`, details);
};

const stringifyOwnerProfileLogValue = (value: unknown): string | undefined => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return undefined;
  }
};

const extractOwnerProfileValidationErrors = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return (
    record.errors ??
    asRecord(record.error)?.errors ??
    asRecord(record.error)?.details ??
    undefined
  );
};

const serializeOwnerProfileApiError = (error: unknown): Record<string, unknown> => {
  const record = asRecord(error) ?? {};
  const status = typeof record.status === 'number' ? record.status : undefined;
  const code = asString(record.code) ?? undefined;
  const details = record.details;
  const requestId =
    asString(asRecord(details)?.requestId) ??
    asString(asRecord(asRecord(details)?.error)?.requestId) ??
    undefined;
  const backendError =
    asRecord(details)?.error ??
    asRecord(asRecord(details)?.data)?.error ??
    undefined;
  const validationErrors = extractOwnerProfileValidationErrors(details);

  return {
    message:
      (error instanceof Error ? error.message : null) ??
      asString(record.message) ??
      'Unknown error',
    ...(status !== undefined ? { status } : {}),
    ...(code ? { code } : {}),
    ...(requestId ? { requestId } : {}),
    ...(backendError !== undefined ? { backendError } : {}),
    ...(validationErrors !== undefined ? { validationErrors } : {}),
    ...(details !== undefined ? { details } : {}),
    ...(details !== undefined
      ? { detailsJson: stringifyOwnerProfileLogValue(details) }
      : {}),
    ...(error instanceof Error && error.stack ? { stack: error.stack } : {}),
  };
};

const executeOwnerProfileApiCall = async <TResponse, TResult>({
  action,
  method,
  endpoint,
  payload,
  request,
  normalize,
}: OwnerProfileApiCallOptions<TResponse, TResult>): Promise<TResult> => {
  logOwnerProfileApi('request', {
    action,
    method,
    endpoint,
    ...(payload !== undefined ? { payload } : {}),
  });

  try {
    const response = await request();
    logOwnerProfileApi('response', {
      action,
      method,
      endpoint,
      response,
    });

    const normalized = normalize(response);
    logOwnerProfileApi('normalized', {
      action,
      method,
      endpoint,
      normalized,
    });

    return normalized;
  } catch (error) {
    logOwnerProfileApi('error', {
      action,
      method,
      endpoint,
      ...(payload !== undefined ? { payload } : {}),
      error: serializeOwnerProfileApiError(error),
    });
    throw error;
  }
};

const asRecord = (value: unknown): Record<string, any> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, any>;
};

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const asBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  return undefined;
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

const normalizeOwnerSelfServiceUser = (
  value: unknown,
): OwnerSelfServiceUser => {
  const user = asRecord(value) ?? {};

  return {
    id: asString(user.id ?? user.userId) ?? 'unknown-owner-user',
    email: asString(user.email) ?? '',
    name:
      asString(user.name ?? user.fullName ?? user.displayName) ??
      asString(user.email) ??
      'Owner',
    ...(asString(user.avatarUrl ?? user.avatar)
      ? { avatarUrl: asString(user.avatarUrl ?? user.avatar) }
      : {}),
    ...(asString(user.phone ?? user.phoneNumber)
      ? { phone: asString(user.phone ?? user.phoneNumber) }
      : {}),
  };
};

const normalizeOwnerSelfServiceProfile = (
  value: unknown,
  index: number,
): OwnerSelfServiceProfile => {
  const profile = asRecord(value) ?? {};

  return {
    ownerId: asString(profile.ownerId ?? profile.id) ?? `owner-${index + 1}`,
    orgId: asString(profile.orgId) ?? '',
    orgName: asString(profile.orgName) ?? 'Unknown organization',
    name:
      asString(profile.name ?? profile.displayName) ??
      `Owner ${index + 1}`,
    email: asString(profile.email) ?? '',
    ...(asString(profile.phone ?? profile.phoneNumber)
      ? { phone: asString(profile.phone ?? profile.phoneNumber) }
      : {}),
    ...(asString(profile.address) ? { address: asString(profile.address) } : {}),
    isActive: asBoolean(profile.isActive) ?? true,
  };
};

const normalizeOwnerSelfServiceRuntime = (
  response: unknown,
): OwnerSelfServiceRuntime => {
  const payload = getObjectCandidate<Record<string, any>>(response);
  const ownersCandidate = Array.isArray(payload?.owners)
    ? payload.owners
    : Array.isArray((response as any)?.data?.owners)
      ? (response as any).data.owners
      : [];

  return {
    user: normalizeOwnerSelfServiceUser(payload?.user ?? payload),
    owners: ownersCandidate.map(normalizeOwnerSelfServiceProfile),
  };
};

const trimStringFields = <T extends object>(payload: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).flatMap(([key, value]) => {
      if (typeof value !== 'string') {
        return [];
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? [[key, trimmed]] : [];
    }),
  ) as Partial<T>;

export class OwnerPortalApiService extends BaseApiService {
  async getMe(): Promise<OwnerSelfServiceRuntime> {
    return executeOwnerProfileApiCall({
      action: 'getMe',
      method: 'GET',
      endpoint: API_ENDPOINTS.owner.me,
      request: () => this.get(API_ENDPOINTS.owner.me),
      normalize: normalizeOwnerSelfServiceRuntime,
    });
  }

  async updateMeProfile(
    payload: UpdateOwnerSelfProfileDTO,
  ): Promise<OwnerSelfServiceRuntime> {
    const nextPayload = trimStringFields(payload);
    return executeOwnerProfileApiCall({
      action: 'updateMeProfile',
      method: 'PATCH',
      endpoint: API_ENDPOINTS.owner.meProfile,
      payload: nextPayload,
      request: () => this.patch(API_ENDPOINTS.owner.meProfile, nextPayload),
      normalize: normalizeOwnerSelfServiceRuntime,
    });
  }

  async updateOwnerProfile(
    ownerId: string,
    payload: UpdateOwnerProfileDTO,
  ): Promise<OwnerSelfServiceProfile> {
    const endpoint = API_ENDPOINTS.owner.profile(ownerId);
    const nextPayload = trimStringFields(payload);

    return executeOwnerProfileApiCall({
      action: 'updateOwnerProfile',
      method: 'PATCH',
      endpoint,
      payload: nextPayload,
      request: () => this.patch(endpoint, nextPayload),
      normalize: (response) => {
        const candidate =
          response?.data?.owner ??
          response?.owner ??
          response?.data?.profile ??
          response?.profile ??
          response?.data?.item ??
          response?.item ??
          response?.data ??
          response;

        return normalizeOwnerSelfServiceProfile(candidate, 0);
      },
    });
  }

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
  ): Promise<ConversationMessage | null> {
    const response = await this.post(
      API_ENDPOINTS.owner.conversationMessages(conversationId),
      { content },
    );

    const candidate =
      response?.data?.message ??
      response?.message ??
      response?.data ??
      response ??
      null;

    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    if (!('id' in candidate) || !('content' in candidate) || !('createdAt' in candidate)) {
      return null;
    }

    return candidate as ConversationMessage;
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
