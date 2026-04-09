import {
  getTenantConversationAvatarUrl,
  getTenantConversationDisplayName,
  getTenantLastSenderLabel,
  getTenantMessageSenderName,
  isTenantManagementConversation,
  shouldHideTenantParticipantDetails,
} from '../tenant-messaging-privacy';
import type { ConversationDetail } from '../../types';

const currentUserId = 'resident-1';

const buildConversation = (
  overrides?: Partial<ConversationDetail>,
): ConversationDetail => ({
  id: 'conv-1',
  subject: null,
  buildingId: 'building-1',
  participants: [
    { id: currentUserId, name: 'Resident User', avatarUrl: null },
    { id: 'manager-1', name: 'Sarah Ahmed', avatarUrl: 'https://example.com/a.png' },
    { id: 'manager-2', name: 'John Khan', avatarUrl: 'https://example.com/b.png' },
  ],
  unreadCount: 1,
  lastMessage: {
    id: 'msg-1',
    content: 'We will check this today.',
    sender: { id: 'manager-1', name: 'Sarah Ahmed', avatarUrl: 'https://example.com/a.png' },
    createdAt: '2026-04-08T12:00:00.000Z',
  },
  createdAt: '2026-04-08T11:00:00.000Z',
  updatedAt: '2026-04-08T12:00:00.000Z',
  messages: [],
  ...overrides,
});

describe('tenant messaging privacy helpers', () => {
  it('masks management conversations as Management', () => {
    const conversation = buildConversation();

    expect(isTenantManagementConversation(conversation, currentUserId)).toBe(true);
    expect(getTenantConversationDisplayName(conversation, currentUserId)).toBe(
      'Management',
    );
    expect(getTenantConversationAvatarUrl(conversation, currentUserId)).toBeNull();
    expect(getTenantLastSenderLabel(conversation, currentUserId)).toBe('Management');
    expect(
      getTenantMessageSenderName(
        conversation,
        conversation.lastMessage!,
        currentUserId,
      ),
    ).toBe('Management');
    expect(shouldHideTenantParticipantDetails(conversation, currentUserId)).toBe(
      true,
    );
  });

  it('keeps owner/direct threads identifiable when there is no management marker', () => {
    const conversation = buildConversation({
      participants: [
        { id: currentUserId, name: 'Resident User', avatarUrl: null },
        { id: 'owner-1', name: 'Owner User', avatarUrl: 'https://example.com/owner.png' },
      ],
      lastMessage: {
        id: 'msg-2',
        content: 'Please confirm the renewal details.',
        sender: { id: 'owner-1', name: 'Owner User', avatarUrl: 'https://example.com/owner.png' },
        createdAt: '2026-04-08T12:00:00.000Z',
      },
    });

    expect(isTenantManagementConversation(conversation, currentUserId)).toBe(false);
    expect(getTenantConversationDisplayName(conversation, currentUserId)).toBe(
      'Owner User',
    );
    expect(getTenantConversationAvatarUrl(conversation, currentUserId)).toBe(
      'https://example.com/owner.png',
    );
    expect(getTenantLastSenderLabel(conversation, currentUserId)).toBe('Owner User');
    expect(
      getTenantMessageSenderName(
        conversation,
        conversation.lastMessage!,
        currentUserId,
      ),
    ).toBe('Owner User');
    expect(shouldHideTenantParticipantDetails(conversation, currentUserId)).toBe(
      false,
    );
  });
});
