import type {
  Conversation,
  ConversationDetail,
  ConversationMessage,
  ConversationParticipant,
} from '../types';

const MANAGEMENT_KEYWORDS = [
  'management',
  'operations',
  'admin',
  'leasing',
  'accounts',
  'finance',
  'office',
];

type ConversationLike = Conversation | ConversationDetail;

const getOtherParticipants = (
  conversation: ConversationLike,
  currentUserId?: string | null,
): ConversationParticipant[] =>
  conversation.participants.filter(
    (participant) => participant.id !== currentUserId,
  );

const getRawConversationMarkers = (conversation: ConversationLike): string[] => {
  const raw = conversation as unknown as Record<string, unknown>;
  return [
    raw.target,
    raw.targetType,
    raw.target_type,
    raw.type,
    raw.kind,
    raw.channel,
    raw.scope,
    raw.recipientType,
    raw.recipient_type,
    raw.conversationType,
    raw.conversation_type,
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
};

export const isTenantManagementConversation = (
  conversation: ConversationLike,
  currentUserId?: string | null,
): boolean => {
  const rawMarkers = getRawConversationMarkers(conversation);
  if (rawMarkers.some((value) => value.includes('management'))) {
    return true;
  }
  if (rawMarkers.some((value) => value.includes('owner'))) {
    return false;
  }

  const others = getOtherParticipants(conversation, currentUserId);
  if (others.length > 1) {
    return true;
  }

  const haystack = [
    conversation.subject,
    conversation.lastMessage?.content,
    ...others.map((participant) => participant.name),
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  return MANAGEMENT_KEYWORDS.some((keyword) => haystack.includes(keyword));
};

export const getTenantConversationDisplayName = (
  conversation: ConversationLike,
  currentUserId?: string | null,
): string => {
  if (isTenantManagementConversation(conversation, currentUserId)) {
    return 'Management';
  }

  const others = getOtherParticipants(conversation, currentUserId);
  if (others.length > 0) {
    return others.map((participant) => participant.name).join(', ');
  }

  return conversation.subject || 'Conversation';
};

export const getTenantConversationAvatarLetter = (
  conversation: ConversationLike,
  currentUserId?: string | null,
): string => {
  if (isTenantManagementConversation(conversation, currentUserId)) {
    return 'M';
  }

  const displayName = getTenantConversationDisplayName(conversation, currentUserId);
  return (displayName || '?').charAt(0).toUpperCase();
};

export const getTenantConversationContextLabel = (
  conversation: ConversationLike,
  currentUserId?: string | null,
): string => {
  if (conversation.subject?.trim()) {
    return conversation.subject.trim();
  }

  if (isTenantManagementConversation(conversation, currentUserId)) {
    return 'Management desk';
  }

  const others = getOtherParticipants(conversation, currentUserId);
  return others.length > 1 ? `${others.length} participants` : 'Direct message';
};

export const getTenantLastSenderLabel = (
  conversation: ConversationLike,
  currentUserId?: string | null,
): string | null => {
  if (!conversation.lastMessage?.sender) {
    return null;
  }

  if (conversation.lastMessage.sender.id === currentUserId) {
    return 'You';
  }

  if (isTenantManagementConversation(conversation, currentUserId)) {
    return 'Management';
  }

  return conversation.lastMessage.sender.name;
};

export const getTenantMessageSenderName = (
  conversation: ConversationLike,
  message: ConversationMessage,
  currentUserId?: string | null,
): string => {
  if (message.sender.id === currentUserId) {
    return 'You';
  }

  if (isTenantManagementConversation(conversation, currentUserId)) {
    return 'Management';
  }

  return message.sender.name;
};

export const shouldHideTenantParticipantDetails = (
  conversation: ConversationLike,
  currentUserId?: string | null,
): boolean => isTenantManagementConversation(conversation, currentUserId);
