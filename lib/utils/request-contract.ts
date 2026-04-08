import type {
  OwnerApprovalStatus,
  RequestPolicy,
  RequestQueue,
  RequestRecommendation,
} from '../types';

const toBooleanOrUndefined = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return undefined;
};

export const normalizeOwnerApprovalStatusOptional = (
  status?: unknown,
): OwnerApprovalStatus | null => {
  const normalized =
    typeof status === 'string' && status.trim().length > 0
      ? status.trim().toUpperCase()
      : null;

  switch (normalized) {
    case 'NOT_REQUIRED':
    case 'PENDING':
    case 'APPROVED':
    case 'REJECTED':
      return normalized;
    default:
      return null;
  }
};

export const normalizeRequestRecommendation = (
  value?: unknown,
): RequestRecommendation | null => {
  const normalized =
    typeof value === 'string' && value.trim().length > 0
      ? value.trim().toUpperCase()
      : null;

  switch (normalized) {
    case 'PROCEED_NOW':
    case 'REQUEST_OWNER_APPROVAL':
    case 'PROCEED_AND_NOTIFY':
      return normalized;
    default:
      return null;
  }
};

export const normalizeRequestQueue = (value?: unknown): RequestQueue | null => {
  const normalized =
    typeof value === 'string' && value.trim().length > 0
      ? value.trim().toUpperCase()
      : null;

  switch (normalized) {
    case 'NEW':
    case 'AWAITING_OWNER':
    case 'READY_TO_ASSIGN':
    case 'ASSIGNED':
    case 'IN_PROGRESS':
    case 'OVERDUE':
      return normalized;
    default:
      return null;
  }
};

export const mapRequestPolicy = (source: any): RequestPolicy | null => {
  const policySource =
    source?.policy != null && typeof source.policy === 'object'
      ? source.policy
      : null;

  const recommendation = normalizeRequestRecommendation(
    source?.recommendation ?? policySource?.recommendation,
  );
  const isEmergency = toBooleanOrUndefined(
    source?.isEmergency ?? policySource?.isEmergency,
  );
  const isLikeForLike = toBooleanOrUndefined(
    source?.isLikeForLike ?? policySource?.isLikeForLike,
  );
  const isUpgrade = toBooleanOrUndefined(
    source?.isUpgrade ?? policySource?.isUpgrade,
  );
  const isMajorReplacement = toBooleanOrUndefined(
    source?.isMajorReplacement ?? policySource?.isMajorReplacement,
  );
  const isResponsibilityDisputed = toBooleanOrUndefined(
    source?.isResponsibilityDisputed ?? policySource?.isResponsibilityDisputed,
  );

  if (
    recommendation == null &&
    isEmergency == null &&
    isLikeForLike == null &&
    isUpgrade == null &&
    isMajorReplacement == null &&
    isResponsibilityDisputed == null
  ) {
    return null;
  }

  return {
    ...(isEmergency != null ? { isEmergency } : {}),
    ...(isLikeForLike != null ? { isLikeForLike } : {}),
    ...(isUpgrade != null ? { isUpgrade } : {}),
    ...(isMajorReplacement != null ? { isMajorReplacement } : {}),
    ...(isResponsibilityDisputed != null ? { isResponsibilityDisputed } : {}),
    ...(recommendation != null ? { recommendation } : {}),
  };
};

export const mapRequestContractFields = (source: any) => {
  const policy = mapRequestPolicy(source);
  const ownerApprovalStatus = normalizeOwnerApprovalStatusOptional(
    source?.ownerApprovalStatus ?? source?.ownerApproval?.status,
  );
  const queue = normalizeRequestQueue(source?.queue);

  return {
    ...(source?.ownerApproval != null ? { ownerApproval: source.ownerApproval } : {}),
    ...(ownerApprovalStatus != null ? { ownerApprovalStatus } : {}),
    ...(policy != null ? { policy } : {}),
    ...(policy?.isEmergency != null ? { isEmergency: policy.isEmergency } : {}),
    ...(policy?.isLikeForLike != null
      ? { isLikeForLike: policy.isLikeForLike }
      : {}),
    ...(policy?.isUpgrade != null ? { isUpgrade: policy.isUpgrade } : {}),
    ...(policy?.isMajorReplacement != null
      ? { isMajorReplacement: policy.isMajorReplacement }
      : {}),
    ...(policy?.isResponsibilityDisputed != null
      ? { isResponsibilityDisputed: policy.isResponsibilityDisputed }
      : {}),
    ...(policy?.recommendation != null
      ? { recommendation: policy.recommendation }
      : {}),
    ...(queue != null ? { queue } : {}),
  };
};

export const extractNotificationMetadata = (payload: any) => {
  const ownerApprovalStatus = normalizeOwnerApprovalStatusOptional(
    payload?.ownerApprovalStatus ?? payload?.data?.ownerApprovalStatus,
  );
  const isEmergency = toBooleanOrUndefined(
    payload?.isEmergency ?? payload?.data?.isEmergency,
  );

  const data = {
    ...(payload?.data && typeof payload.data === 'object' ? payload.data : {}),
    ...(payload?.requestId != null ? { requestId: payload.requestId } : {}),
    ...(payload?.request_id != null ? { request_id: payload.request_id } : {}),
    ...(payload?.conversationId != null
      ? { conversationId: payload.conversationId }
      : {}),
    ...(payload?.conversation_id != null
      ? { conversation_id: payload.conversation_id }
      : {}),
    ...(payload?.buildingId != null ? { buildingId: payload.buildingId } : {}),
    ...(payload?.building_id != null ? { building_id: payload.building_id } : {}),
    ...(ownerApprovalStatus != null ? { ownerApprovalStatus } : {}),
    ...(isEmergency != null ? { isEmergency } : {}),
  };

  return {
    ...(Object.keys(data).length > 0 ? { data } : {}),
    ...(ownerApprovalStatus != null ? { ownerApprovalStatus } : {}),
    ...(isEmergency != null ? { isEmergency } : {}),
  };
};

