import type {
  OwnerApprovalStatus,
  OwnerConversation,
  OwnerNotification,
  OwnerPortfolioRequest,
} from '../types';

export type OwnerNotificationTarget =
  | {
      kind: 'request';
      id: string;
    }
  | {
      kind: 'conversation';
      id: string;
    };

export const OWNER_PALETTE = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceLow: '#F1F4F6',
  border: '#D9E0E4',
  text: '#2B3437',
  muted: '#667176',
  soft: '#7A8488',
  primary: '#4D6169',
  primaryDark: '#34474D',
  primarySoft: '#D6E4E8',
  accent: '#F8EFE4',
  accentText: '#7A5A2B',
  successBg: '#E4F4EA',
  successText: '#25674A',
  warningBg: '#FDF1DB',
  warningText: '#9A5B00',
  dangerBg: '#FCE3E0',
  dangerText: '#B24A41',
  infoBg: '#E7EEF9',
  infoText: '#3C5A8C',
} as const;

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

const getFirstString = (...values: unknown[]): string | null => {
  for (const value of values) {
    const candidate = asString(value);
    if (candidate) {
      return candidate;
    }
  }

  return null;
};

export const formatOwnerLabel = (value?: string | null): string => {
  if (!value) return 'Not provided';

  return value
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatOwnerDate = (value?: string | null): string => {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatOwnerDateTime = (value?: string | null): string => {
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

export const formatOwnerRelativeTime = (value?: string | null): string => {
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

  return formatOwnerDate(value);
};

export const formatOwnerMoney = (
  amount?: string | null,
  currency?: string | null,
): string => {
  if (!amount) return 'Not provided';
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return amount;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'AED',
    maximumFractionDigits: 0,
  }).format(numeric);
};

export const getOwnerRequestStatusTone = (status?: string | null) => {
  const normalized = status?.toUpperCase();

  switch (normalized) {
    case 'OPEN':
    case 'PENDING':
      return { bg: OWNER_PALETTE.warningBg, text: OWNER_PALETTE.warningText };
    case 'ASSIGNED':
    case 'IN_PROGRESS':
      return { bg: OWNER_PALETTE.infoBg, text: OWNER_PALETTE.infoText };
    case 'COMPLETED':
    case 'APPROVED':
      return { bg: OWNER_PALETTE.successBg, text: OWNER_PALETTE.successText };
    case 'REJECTED':
    case 'CANCELED':
    case 'CANCELLED':
      return { bg: OWNER_PALETTE.dangerBg, text: OWNER_PALETTE.dangerText };
    default:
      return { bg: OWNER_PALETTE.surfaceLow, text: OWNER_PALETTE.muted };
  }
};

export const normalizeOwnerApprovalStatus = (
  status?: OwnerApprovalStatus | string | null,
): OwnerApprovalStatus => {
  const normalized = status?.toString().trim().toUpperCase();

  switch (normalized) {
    case 'PENDING':
      return 'PENDING';
    case 'APPROVED':
      return 'APPROVED';
    case 'REJECTED':
      return 'REJECTED';
    default:
      return 'NOT_REQUIRED';
  }
};

export const resolveOwnerRequestApprovalStatus = (
  request?: Pick<OwnerPortfolioRequest, 'ownerApproval' | 'ownerApprovalStatus'> | null,
): OwnerApprovalStatus =>
  normalizeOwnerApprovalStatus(
    request?.ownerApproval?.status ?? request?.ownerApprovalStatus,
  );

export const getOwnerNotificationTarget = (
  payload: unknown,
): OwnerNotificationTarget | null => {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const data = asRecord(root.data);
  const nestedData = asRecord(data?.data);
  const candidates = [root, data, nestedData].filter(
    (candidate): candidate is Record<string, unknown> => candidate != null,
  );

  const conversationId = getFirstString(
    ...candidates.flatMap((candidate) => [
      candidate.conversationId,
      candidate.conversation_id,
    ]),
  );
  if (conversationId) {
    return {
      kind: 'conversation',
      id: conversationId,
    };
  }

  const requestId = getFirstString(
    ...candidates.flatMap((candidate) => [candidate.requestId, candidate.request_id]),
  );
  if (requestId) {
    return {
      kind: 'request',
      id: requestId,
    };
  }

  return null;
};

export const getOwnerApprovalTone = (status?: OwnerApprovalStatus | null) => {
  switch (normalizeOwnerApprovalStatus(status)) {
    case 'PENDING':
      return { bg: OWNER_PALETTE.warningBg, text: OWNER_PALETTE.warningText };
    case 'APPROVED':
      return { bg: OWNER_PALETTE.successBg, text: OWNER_PALETTE.successText };
    case 'REJECTED':
      return { bg: OWNER_PALETTE.dangerBg, text: OWNER_PALETTE.dangerText };
    default:
      return { bg: OWNER_PALETTE.surfaceLow, text: OWNER_PALETTE.muted };
  }
};

export const getOwnerRequestDisplayTitle = (
  request: OwnerPortfolioRequest,
): string => request.title?.trim() || 'Maintenance request';

export const getOwnerConversationDisplayName = (
  conversation: OwnerConversation,
  currentUserId?: string,
): string => {
  const others = conversation.participants.filter(
    (participant) => participant.id !== currentUserId,
  );

  if (others.length > 0) {
    return others.map((participant) => participant.name).join(', ');
  }

  return conversation.subject?.trim() || 'Conversation';
};

export const getOwnerNotificationTone = (notification: OwnerNotification) => {
  const type = notification.type?.toUpperCase();

  if (type?.includes('APPROVAL')) {
    return { bg: OWNER_PALETTE.warningBg, text: OWNER_PALETTE.warningText };
  }

  if (type?.includes('MESSAGE') || type?.includes('CONVERSATION')) {
    return { bg: OWNER_PALETTE.infoBg, text: OWNER_PALETTE.infoText };
  }

  if (type?.includes('CANCELED') || type?.includes('REJECTED')) {
    return { bg: OWNER_PALETTE.dangerBg, text: OWNER_PALETTE.dangerText };
  }

  return { bg: OWNER_PALETTE.surfaceLow, text: OWNER_PALETTE.muted };
};
