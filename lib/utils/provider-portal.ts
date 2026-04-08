import type {
  OwnerApprovalStatus,
  ProviderPortalActor,
  ProviderPortalRequest,
  ProviderPortalRequestAttachment,
} from '../types';

import { normalizeOwnerApprovalStatus } from './owner-portal';

export const PROVIDER_PALETTE = {
  bg: '#F7F8F4',
  surface: '#FFFFFF',
  surfaceLow: '#EEF1EA',
  border: '#D9DED4',
  text: '#233128',
  muted: '#5E6B61',
  soft: '#7A867D',
  primary: '#4F6A58',
  primaryDark: '#3E5646',
  primarySoft: '#D9E7DA',
  accent: '#EDF1E2',
  accentText: '#5F683E',
  successBg: '#E3F2E7',
  successText: '#266040',
  warningBg: '#F7EED9',
  warningText: '#8C6430',
  dangerBg: '#F9E2DD',
  dangerText: '#B25143',
  infoBg: '#E4ECE7',
  infoText: '#38564A',
} as const;

export const formatProviderLabel = (value?: string | null): string => {
  if (!value) return 'Not provided';

  return value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatProviderDateTime = (value?: string | null): string => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatProviderRelativeTime = (value?: string | null): string => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatProviderMoney = (
  amount?: number | string | null,
  currency?: string | null,
): string => {
  if (amount == null || amount === '') return 'Not provided';
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return String(amount);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'AED',
    maximumFractionDigits: 0,
  }).format(numeric);
};

export const getProviderRequestStatusTone = (status?: string | null) => {
  const normalized = status?.toUpperCase();

  switch (normalized) {
    case 'OPEN':
      return { bg: PROVIDER_PALETTE.warningBg, text: PROVIDER_PALETTE.warningText };
    case 'ASSIGNED':
    case 'IN_PROGRESS':
      return { bg: PROVIDER_PALETTE.infoBg, text: PROVIDER_PALETTE.infoText };
    case 'COMPLETED':
      return { bg: PROVIDER_PALETTE.successBg, text: PROVIDER_PALETTE.successText };
    case 'CANCELED':
    case 'CANCELLED':
      return { bg: PROVIDER_PALETTE.dangerBg, text: PROVIDER_PALETTE.dangerText };
    default:
      return { bg: PROVIDER_PALETTE.surfaceLow, text: PROVIDER_PALETTE.muted };
  }
};

export const resolveProviderApprovalStatus = (
  request?: Pick<ProviderPortalRequest, 'ownerApproval' | 'ownerApprovalStatus'> | null,
): OwnerApprovalStatus =>
  normalizeOwnerApprovalStatus(
    request?.ownerApproval?.status ?? request?.ownerApprovalStatus,
  );

export const getProviderApprovalTone = (status?: OwnerApprovalStatus | null) => {
  switch (resolveProviderApprovalStatus({ ownerApprovalStatus: status ?? null })) {
    case 'PENDING':
      return { bg: PROVIDER_PALETTE.warningBg, text: PROVIDER_PALETTE.warningText };
    case 'APPROVED':
      return { bg: PROVIDER_PALETTE.successBg, text: PROVIDER_PALETTE.successText };
    case 'REJECTED':
      return { bg: PROVIDER_PALETTE.dangerBg, text: PROVIDER_PALETTE.dangerText };
    default:
      return { bg: PROVIDER_PALETTE.surfaceLow, text: PROVIDER_PALETTE.muted };
  }
};

export const getProviderActorDisplayName = (
  actor?: ProviderPortalActor | null,
): string => actor?.name || actor?.email || actor?.id || 'Not provided';

export const getAssignedProviderWorkerId = (
  request?: ProviderPortalRequest | null,
): string | null => request?.serviceProviderAssignedTo?.id ?? null;

export const isProviderRequestClosed = (request?: ProviderPortalRequest | null): boolean =>
  ['COMPLETED', 'CANCELED', 'CANCELLED'].includes(
    request?.status?.toUpperCase() ?? '',
  );

export const isProviderExecutionBlocked = (
  request?: ProviderPortalRequest | null,
): boolean => {
  const approvalStatus = resolveProviderApprovalStatus(request);
  return approvalStatus === 'PENDING' || approvalStatus === 'REJECTED';
};

export const canProviderWorkerManageRequest = (
  request: ProviderPortalRequest | null | undefined,
  currentUserId?: string | null,
): boolean => {
  if (!request || !currentUserId) {
    return false;
  }

  return getAssignedProviderWorkerId(request) === currentUserId;
};

export const getProviderAttachmentUrl = (
  attachment?: ProviderPortalRequestAttachment | string | null,
): string | null => {
  if (typeof attachment === 'string') {
    const trimmed = attachment.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!attachment || typeof attachment !== 'object') {
    return null;
  }

  const candidate =
    attachment.url ?? attachment.fileUrl ?? attachment.uri ?? null;

  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim()
    : null;
};

export const getProviderAttachmentLabel = (
  attachment: ProviderPortalRequestAttachment | string,
  index: number,
): string => {
  if (attachment && typeof attachment === 'object') {
    const explicitName = attachment.fileName ?? attachment.name;
    if (typeof explicitName === 'string' && explicitName.trim().length > 0) {
      return explicitName.trim();
    }
  }

  const url = getProviderAttachmentUrl(attachment);
  if (!url) {
    return `Attachment ${index + 1}`;
  }

  const segments = url.split('/');
  const rawFileName = segments[segments.length - 1]?.split('?')[0] ?? '';
  const decodedFileName = rawFileName ? decodeURIComponent(rawFileName) : '';

  return decodedFileName || `Attachment ${index + 1}`;
};
