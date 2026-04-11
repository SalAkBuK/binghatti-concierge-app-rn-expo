import type {
  OwnerApprovalStatus,
  RequestLeaseCycleLabel,
  RequestPolicy,
  RequestQueue,
  RequestRecommendation,
  RequestTenancyCycleLabel,
  RequestTenancyContext,
  RequestTenancyContextSource,
  RequesterContext,
  RequesterResidentInviteStatus,
  RequesterResidentOccupancyStatus,
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

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOccupancyStatus = (
  value?: unknown,
): RequesterResidentOccupancyStatus | null => {
  const normalized = asString(value)?.toUpperCase() ?? null;

  switch (normalized) {
    case 'ACTIVE':
    case 'NONE':
    case 'FORMER':
      return normalized;
    default:
      return null;
  }
};

const normalizeInviteStatus = (
  value?: unknown,
): RequesterResidentInviteStatus | null => {
  const normalized = asString(value)?.toUpperCase() ?? null;

  switch (normalized) {
    case 'PENDING':
    case 'ACCEPTED':
    case 'FAILED':
    case 'EXPIRED':
      return normalized;
    default:
      return null;
  }
};

const normalizeTenancyCycleLabel = (
  value?: unknown,
): RequestTenancyCycleLabel | null => {
  const normalized = asString(value)?.toUpperCase() ?? null;

  switch (normalized) {
    case 'CURRENT_OCCUPANCY':
    case 'PREVIOUS_OCCUPANCY':
    case 'NO_ACTIVE_OCCUPANCY':
    case 'UNKNOWN_TENANCY_CYCLE':
      return normalized;
    default:
      return null;
  }
};

const normalizeLeaseCycleLabel = (
  value?: unknown,
): RequestLeaseCycleLabel | null => {
  const normalized = asString(value)?.toUpperCase() ?? null;

  switch (normalized) {
    case 'CURRENT_LEASE':
    case 'PREVIOUS_LEASE':
    case 'NO_ACTIVE_LEASE':
    case 'UNKNOWN_LEASE_CYCLE':
      return normalized;
    default:
      return null;
  }
};

const normalizeTenancyContextSource = (
  value?: unknown,
): RequestTenancyContextSource | null => {
  const normalized = asString(value)?.toUpperCase() ?? null;

  switch (normalized) {
    case 'SNAPSHOT':
    case 'HISTORICAL_INFERENCE':
    case 'UNRESOLVED':
      return normalized;
    default:
      return null;
  }
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

export const mapRequesterContext = (
  source: any,
): RequesterContext | null => {
  const requesterContext =
    source?.requesterContext != null && typeof source.requesterContext === 'object'
      ? source.requesterContext
      : null;

  if (!requesterContext) {
    return null;
  }

  const currentUnitOccupant = asRecord(requesterContext.currentUnitOccupant);
  const normalized: RequesterContext = {
    isResident: requesterContext.isResident === true,
    residentOccupancyStatus: normalizeOccupancyStatus(
      requesterContext.residentOccupancyStatus,
    ),
    residentInviteStatus: normalizeInviteStatus(
      requesterContext.residentInviteStatus,
    ),
    isFormerResident:
      toBooleanOrUndefined(requesterContext.isFormerResident) ?? null,
    currentUnitOccupiedByRequester:
      toBooleanOrUndefined(requesterContext.currentUnitOccupiedByRequester) ?? null,
    currentUnitOccupant: currentUnitOccupant
      ? {
          userId:
            asString(
              currentUnitOccupant.userId ?? currentUnitOccupant.id,
            ) ?? '',
          name: asString(currentUnitOccupant.name),
        }
      : null,
  };

  const hasCurrentUnitOccupant =
    normalized.currentUnitOccupant != null &&
    normalized.currentUnitOccupant.userId.length > 0;

  if (
    !normalized.isResident &&
    normalized.residentOccupancyStatus == null &&
    normalized.residentInviteStatus == null &&
    normalized.isFormerResident == null &&
    normalized.currentUnitOccupiedByRequester == null &&
    !hasCurrentUnitOccupant
  ) {
    return null;
  }

  return {
    ...normalized,
    ...(hasCurrentUnitOccupant ? {} : { currentUnitOccupant: null }),
  };
};

export const mapRequestTenancyContext = (
  source: any,
): RequestTenancyContext | null => {
  const tenancyContext =
    source?.requestTenancyContext != null &&
    typeof source.requestTenancyContext === 'object'
      ? source.requestTenancyContext
      : null;

  if (!tenancyContext) {
    return null;
  }

  const label = normalizeTenancyCycleLabel(tenancyContext.label);
  const leaseLabel = normalizeLeaseCycleLabel(tenancyContext.leaseLabel);
  const tenancyContextSource = normalizeTenancyContextSource(
    tenancyContext.tenancyContextSource,
  );
  const leaseContextSource = normalizeTenancyContextSource(
    tenancyContext.leaseContextSource,
  );

  if (label == null && leaseLabel == null) {
    return null;
  }

  return {
    occupancyIdAtCreation: asString(tenancyContext.occupancyIdAtCreation),
    leaseIdAtCreation: asString(tenancyContext.leaseIdAtCreation),
    currentOccupancyId: asString(tenancyContext.currentOccupancyId),
    currentLeaseId: asString(tenancyContext.currentLeaseId),
    isCurrentOccupancy:
      toBooleanOrUndefined(tenancyContext.isCurrentOccupancy) ?? null,
    isCurrentLease:
      toBooleanOrUndefined(tenancyContext.isCurrentLease) ?? null,
    label: label ?? 'UNKNOWN_TENANCY_CYCLE',
    leaseLabel: leaseLabel ?? 'UNKNOWN_LEASE_CYCLE',
    ...(tenancyContextSource != null ? { tenancyContextSource } : {}),
    ...(leaseContextSource != null ? { leaseContextSource } : {}),
  };
};

export const mapRequestContractFields = (source: any) => {
  const policy = mapRequestPolicy(source);
  const ownerApprovalStatus = normalizeOwnerApprovalStatusOptional(
    source?.ownerApprovalStatus ?? source?.ownerApproval?.status,
  );
  const queue = normalizeRequestQueue(source?.queue);
  const requesterContext = mapRequesterContext(source);
  const requestTenancyContext = mapRequestTenancyContext(source);

  return {
    ...(source?.ownerApproval != null ? { ownerApproval: source.ownerApproval } : {}),
    ...(ownerApprovalStatus != null ? { ownerApprovalStatus } : {}),
    ...(requesterContext != null ? { requesterContext } : {}),
    ...(requestTenancyContext != null ? { requestTenancyContext } : {}),
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
