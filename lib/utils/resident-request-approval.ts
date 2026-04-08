import type {
  OwnerApprovalDecisionSource,
  OwnerApprovalSnapshot,
  OwnerApprovalStatus,
  Request,
} from '../types';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
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

const normalizeOwnerApprovalStatus = (
  value: unknown,
): OwnerApprovalStatus | null => {
  const normalized = asString(value)?.toUpperCase();

  switch (normalized) {
    case 'NOT_REQUIRED':
      return 'NOT_REQUIRED';
    case 'PENDING':
      return 'PENDING';
    case 'APPROVED':
      return 'APPROVED';
    case 'REJECTED':
      return 'REJECTED';
    default:
      return null;
  }
};

const normalizeDecisionSource = (
  value: unknown,
): OwnerApprovalDecisionSource | null => {
  const normalized = asString(value)?.toUpperCase();

  switch (normalized) {
    case 'OWNER':
      return 'OWNER';
    case 'MANAGEMENT_OVERRIDE':
      return 'MANAGEMENT_OVERRIDE';
    case 'EMERGENCY_OVERRIDE':
      return 'EMERGENCY_OVERRIDE';
    default:
      return null;
  }
};

export const normalizeOwnerApprovalSnapshot = (
  value: unknown,
): OwnerApprovalSnapshot | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const nestedApproval =
    asRecord(record.ownerApproval) ??
    asRecord(record.owner_approval) ??
    record;

  const status = normalizeOwnerApprovalStatus(
    nestedApproval.status ??
      record.ownerApprovalStatus ??
      record.owner_approval_status,
  );

  if (!status) {
    return null;
  }

  return {
    status,
    requestedAt: asString(
      nestedApproval.requestedAt ?? nestedApproval.requested_at,
    ),
    requestedByUserId: asString(
      nestedApproval.requestedByUserId ?? nestedApproval.requested_by_user_id,
    ),
    deadlineAt: asString(
      nestedApproval.deadlineAt ?? nestedApproval.deadline_at,
    ),
    decidedAt: asString(
      nestedApproval.decidedAt ?? nestedApproval.decided_at,
    ),
    decidedByOwnerUserId: asString(
      nestedApproval.decidedByOwnerUserId ??
        nestedApproval.decided_by_owner_user_id,
    ),
    reason: asString(nestedApproval.reason),
    requiredReason: asString(
      nestedApproval.requiredReason ?? nestedApproval.required_reason,
    ),
    estimatedAmount: asString(
      nestedApproval.estimatedAmount ?? nestedApproval.estimated_amount,
    ),
    estimatedCurrency: asString(
      nestedApproval.estimatedCurrency ?? nestedApproval.estimated_currency,
    ),
    decisionSource: normalizeDecisionSource(
      nestedApproval.decisionSource ?? nestedApproval.decision_source,
    ),
    overrideReason: asString(
      nestedApproval.overrideReason ?? nestedApproval.override_reason,
    ),
    overriddenByUserId: asString(
      nestedApproval.overriddenByUserId ?? nestedApproval.overridden_by_user_id,
    ),
  };
};

export const getResidentRequestOwnerApproval = (
  request: Pick<Request, 'ownerApproval' | 'ownerApprovalStatus'> | unknown,
): OwnerApprovalSnapshot | null => {
  const directRequest = request as Pick<
    Request,
    'ownerApproval' | 'ownerApprovalStatus'
  >;
  const directStatus = normalizeOwnerApprovalStatus(
    directRequest?.ownerApprovalStatus,
  );

  if (directRequest?.ownerApproval && directRequest.ownerApproval.status) {
    return {
      ...directRequest.ownerApproval,
      status:
        normalizeOwnerApprovalStatus(directRequest.ownerApproval.status) ??
        directRequest.ownerApproval.status,
    };
  }

  if (directStatus) {
    return {
      status: directStatus,
    };
  }

  return normalizeOwnerApprovalSnapshot(request);
};

export const isResidentRequestOwnerRejected = (
  request: Pick<Request, 'ownerApproval' | 'ownerApprovalStatus'> | unknown,
): boolean =>
  getResidentRequestOwnerApproval(request)?.status === 'REJECTED';

export const getResidentRequestOwnerRejectionReason = (
  request: Pick<Request, 'ownerApproval' | 'ownerApprovalStatus'> | unknown,
): string | null =>
  getResidentRequestOwnerApproval(request)?.reason?.trim() || null;
