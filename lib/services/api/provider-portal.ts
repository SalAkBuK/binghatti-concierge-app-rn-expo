import { BaseApiService } from './base';
import { API_ENDPOINTS } from '../../utils/constants';
import { mapRequestContractFields } from '../../utils/request-contract';
import type {
  ProviderPortalActor,
  ProviderPortalAttachmentInput,
  ProviderPortalCommentAuthor,
  ProviderPortalEstimateInput,
  ProviderPortalEstimateSnapshot,
  ProviderPortalMembership,
  ProviderPortalRequest,
  ProviderPortalRequestAttachment,
  ProviderPortalRequestComment,
  ProviderPortalRequestStatus,
  ProviderPortalRuntime,
  ProviderPortalUnitRef,
  ProviderPortalWorkerStatusAction,
} from '../../types';

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

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

const asNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const getArrayCandidate = <T>(response: any): T[] => {
  const candidate =
    response?.data?.items ??
    response?.items ??
    response?.data?.requests ??
    response?.requests ??
    response?.data ??
    response;

  return Array.isArray(candidate) ? candidate : [];
};

const getObjectCandidate = <T>(response: any): T => {
  const candidate =
    response?.data?.request ??
    response?.request ??
    response?.data?.comment ??
    response?.comment ??
    response?.data?.item ??
    response?.item ??
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

const normalizeActor = (value: unknown): ProviderPortalActor | null => {
  const actor = asRecord(value);
  if (!actor) {
    return null;
  }

  const id = asString(actor.id ?? actor.userId ?? actor.providerUserId);
  const name = asString(actor.name ?? actor.fullName ?? actor.displayName);
  const email = asString(actor.email);
  const phone = asString(actor.phone ?? actor.phoneNumber);

  if (!id && !name && !email) {
    return null;
  }

  return {
    id: id ?? null,
    name: name ?? null,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  };
};

const normalizeMembership = (
  value: unknown,
  index: number,
): ProviderPortalMembership => {
  const membership = asRecord(value) ?? {};
  const id =
    asString(
      membership.id ??
        membership.providerId ??
        membership.serviceProviderId ??
        membership.membershipId,
    ) ?? `provider-${index + 1}`;
  const name =
    asString(
      membership.name ??
        membership.providerName ??
        membership.serviceProviderName ??
        membership.companyName,
    ) ?? `Provider ${index + 1}`;

  return {
    id,
    name,
    ...(asString(membership.orgId) ? { orgId: asString(membership.orgId) } : {}),
    ...(asString(membership.orgName) ? { orgName: asString(membership.orgName) } : {}),
    ...(asBoolean(membership.isActive) != null
      ? { isActive: Boolean(membership.isActive) }
      : {}),
  };
};

const normalizeUnit = (request: Record<string, any>): ProviderPortalUnitRef => {
  const unit = asRecord(request.unit) ?? {};

  return {
    id: asString(unit.id ?? request.unitId) ?? null,
    label:
      asString(
        unit.label ??
          unit.unitLabel ??
          unit.number ??
          unit.unitNumber ??
          request.unitLabel ??
          request.apartment,
      ) ?? null,
    floor:
      unit.floor ??
      unit.floorNumber ??
      request.floor ??
      request.floorNumber ??
      null,
  };
};

const normalizeAttachments = (value: unknown): ProviderPortalRequestAttachment[] =>
  asArray<any>(value)
    .map((attachment) => {
      const record = asRecord(attachment);
      if (!record) {
        const url = asString(attachment);
        if (!url) {
          return null;
        }

        return { url };
      }

      return {
        ...(asString(record.id) ? { id: asString(record.id) } : {}),
        ...(asString(record.name) ? { name: asString(record.name) } : {}),
        ...(asString(record.fileName) ? { fileName: asString(record.fileName) } : {}),
        ...(asString(record.mimeType) ? { mimeType: asString(record.mimeType) } : {}),
        ...(asNumber(record.sizeBytes) != null
          ? { sizeBytes: asNumber(record.sizeBytes) }
          : {}),
        ...(asString(record.url) ? { url: asString(record.url) } : {}),
        ...(asString(record.fileUrl) ? { fileUrl: asString(record.fileUrl) } : {}),
        ...(asString(record.uri) ? { uri: asString(record.uri) } : {}),
      };
    })
    .filter(
      (attachment): attachment is ProviderPortalRequestAttachment =>
        attachment != null,
    );

const normalizeEstimate = (
  source: Record<string, any>,
): ProviderPortalEstimateSnapshot | null => {
  const estimate = asRecord(source.estimate) ?? source;
  const estimatedAmount = asNumber(
    estimate.estimatedAmount ?? estimate.amount ?? estimate.total,
  );
  const estimatedCurrency = asString(
    estimate.estimatedCurrency ?? estimate.currency,
  );
  const approvalRequiredReason = asString(
    estimate.approvalRequiredReason ?? estimate.requiredReason ?? estimate.reason,
  );
  const isEmergency = asBoolean(estimate.isEmergency);
  const isLikeForLike = asBoolean(estimate.isLikeForLike);
  const isUpgrade = asBoolean(estimate.isUpgrade);
  const submittedAt = asString(
    estimate.submittedAt ?? estimate.createdAt ?? estimate.updatedAt,
  );

  if (
    estimatedAmount == null &&
    !estimatedCurrency &&
    !approvalRequiredReason &&
    isEmergency == null &&
    isLikeForLike == null &&
    isUpgrade == null &&
    !submittedAt
  ) {
    return null;
  }

  return {
    ...(estimatedAmount != null ? { estimatedAmount } : {}),
    ...(estimatedCurrency ? { estimatedCurrency } : {}),
    ...(approvalRequiredReason ? { approvalRequiredReason } : {}),
    ...(isEmergency != null ? { isEmergency } : {}),
    ...(isLikeForLike != null ? { isLikeForLike } : {}),
    ...(isUpgrade != null ? { isUpgrade } : {}),
    ...(submittedAt ? { submittedAt } : {}),
  };
};

const normalizeRequest = (value: unknown): ProviderPortalRequest => {
  const request = asRecord(value) ?? {};
  const contractFields = mapRequestContractFields(request);

  return {
    ...request,
    ...contractFields,
    id: asString(request.id ?? request.requestId) ?? 'unknown-request',
    orgId: asString(request.orgId),
    orgName: asString(request.orgName),
    buildingId: asString(request.buildingId ?? request.building?.id),
    buildingName:
      asString(request.buildingName ?? request.building?.name) ?? 'Unknown building',
    unit: normalizeUnit(request),
    createdBy: normalizeActor(request.createdBy ?? request.createdByUser),
    serviceProvider: normalizeActor(request.serviceProvider),
    serviceProviderAssignedTo: normalizeActor(
      request.serviceProviderAssignedTo ??
        request.assignedProviderWorker ??
        request.providerWorker ??
        request.assignedWorker ??
        request.assignedTo,
    ),
    title:
      asString(request.title ?? request.category ?? request.subject) ??
      'Maintenance request',
    description:
      asString(request.description ?? request.requestDescription) ??
      'No description provided.',
    status: asString(request.status) ?? 'OPEN',
    priority: asString(request.priority) ?? 'MEDIUM',
    type: asString(request.type) ?? 'MAINTENANCE',
    attachments: normalizeAttachments(request.attachments),
    estimate: normalizeEstimate(request),
    createdAt:
      asString(request.createdAt ?? request.created_at) ?? new Date().toISOString(),
    updatedAt:
      asString(request.updatedAt ?? request.updated_at ?? request.createdAt) ??
      new Date().toISOString(),
  };
};

const normalizeCommentAuthor = (value: unknown): ProviderPortalCommentAuthor | null => {
  const author = asRecord(value);
  const normalized = normalizeActor(value);

  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    ...(asString(author?.type) ? { type: asString(author?.type) } : {}),
    ...(asString(author?.role) ? { role: asString(author?.role) } : {}),
  };
};

const normalizeComment = (value: unknown): ProviderPortalRequestComment => {
  const comment = asRecord(value) ?? {};

  return {
    ...comment,
    id: asString(comment.id ?? comment.commentId) ?? `comment-${Date.now()}`,
    requestId: asString(comment.requestId) ?? '',
    author: normalizeCommentAuthor(comment.author ?? comment.createdBy),
    message: asString(comment.message ?? comment.commentText ?? comment.body) ?? '',
    visibility: asString(comment.visibility ?? comment.channel) ?? 'SHARED',
    createdAt:
      asString(comment.createdAt ?? comment.created_at) ?? new Date().toISOString(),
    attachments: normalizeAttachments(comment.attachments),
  };
};

const normalizeRuntime = (response: any): ProviderPortalRuntime => {
  const data = getObjectCandidate<Record<string, any>>(response);
  const providers = (
    data?.providers ??
    data?.serviceProviders ??
    data?.memberships ??
    data?.providerMemberships ??
    []
  ) as unknown;

  return {
    user: normalizeActor(data?.user ?? data?.profile ?? data),
    providers: asArray<any>(providers).map(normalizeMembership),
  };
};

export class ProviderPortalApiService extends BaseApiService {
  async getMe(): Promise<ProviderPortalRuntime> {
    const response = await this.get(API_ENDPOINTS.provider.me);
    return normalizeRuntime(response);
  }

  async getRequests(params?: {
    status?: ProviderPortalRequestStatus;
    serviceProviderId?: string;
  }): Promise<ProviderPortalRequest[]> {
    const response = await this.get(API_ENDPOINTS.provider.requests, params);
    return getArrayCandidate<ProviderPortalRequest>(response).map(normalizeRequest);
  }

  async getRequest(requestId: string): Promise<ProviderPortalRequest> {
    const response = await this.get(API_ENDPOINTS.provider.requestDetail(requestId));
    return normalizeRequest(getObjectCandidate<ProviderPortalRequest>(response));
  }

  async updateRequestStatus(
    requestId: string,
    status: ProviderPortalWorkerStatusAction,
  ): Promise<ProviderPortalRequest> {
    const response = await this.post(
      API_ENDPOINTS.provider.requestStatus(requestId),
      { status },
    );
    return normalizeRequest(getObjectCandidate<ProviderPortalRequest>(response));
  }

  async submitEstimate(
    requestId: string,
    input: ProviderPortalEstimateInput,
  ): Promise<ProviderPortalRequest> {
    const response = await this.post(
      API_ENDPOINTS.provider.requestEstimate(requestId),
      input,
    );
    return normalizeRequest(getObjectCandidate<ProviderPortalRequest>(response));
  }

  async getRequestComments(requestId: string): Promise<ProviderPortalRequestComment[]> {
    const response = await this.get(API_ENDPOINTS.provider.requestComments(requestId));
    return getArrayCandidate<ProviderPortalRequestComment>(response).map(normalizeComment);
  }

  async addRequestComment(
    requestId: string,
    message: string,
  ): Promise<ProviderPortalRequestComment> {
    const response = await this.post(
      API_ENDPOINTS.provider.requestComments(requestId),
      { message },
    );
    return normalizeComment(getObjectCandidate<ProviderPortalRequestComment>(response));
  }

  async addRequestAttachments(
    requestId: string,
    attachments: ProviderPortalAttachmentInput[],
  ): Promise<ProviderPortalRequest> {
    const response = await this.post(
      API_ENDPOINTS.provider.requestAttachments(requestId),
      { attachments },
    );
    return normalizeRequest(getObjectCandidate<ProviderPortalRequest>(response));
  }

  async getUnreadRequestCommentCount(): Promise<number> {
    const response = await this.get(API_ENDPOINTS.provider.requestCommentsUnreadCount);
    return getUnreadCountCandidate(response);
  }
}

export const providerPortalApi = new ProviderPortalApiService();
