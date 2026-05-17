import {
  getOwnerNotificationTarget,
  getOwnerNotificationTone,
  isOwnerApprovalRequestedNotification,
  isOwnerMaintenanceNoticeNotification,
} from '../owner-portal';

describe('owner portal helpers', () => {
  it('extracts a request target from a flat payload', () => {
    expect(
      getOwnerNotificationTarget({
        requestId: 'req-1',
      }),
    ).toEqual({
      kind: 'request',
      id: 'req-1',
    });
  });

  it('extracts a request target from nested payload data', () => {
    expect(
      getOwnerNotificationTarget({
        data: {
          data: {
            requestId: 'req-2',
          },
        },
      }),
    ).toEqual({
      kind: 'request',
      id: 'req-2',
    });
  });

  it('extracts a conversation target from snake case payload keys', () => {
    expect(
      getOwnerNotificationTarget({
        data: {
          conversation_id: 'conv-1',
        },
      }),
    ).toEqual({
      kind: 'conversation',
      id: 'conv-1',
    });
  });

  it('extracts a request target from a notification wrapper object', () => {
    expect(
      getOwnerNotificationTarget({
        id: 'notification-1',
        type: 'REQUEST_COMMENTED',
        data: {
          requestId: 'req-3',
        },
      }),
    ).toEqual({
      kind: 'request',
      id: 'req-3',
    });
  });

  it('recognizes owner maintenance notices as FYI request notifications', () => {
    const notification = {
      id: 'notification-2',
      userId: 'owner-user-1',
      title: 'Maintenance activity',
      type: 'OWNER_MAINTENANCE_NOTICE',
      data: {
        requestId: 'req-4',
        buildingId: 'building-1',
        ownerApprovalStatus: 'NOT_REQUIRED',
        requiresOwnerApproval: false,
      },
      createdAt: '2026-04-11T10:00:00.000Z',
    };

    expect(isOwnerMaintenanceNoticeNotification(notification)).toBe(true);
    expect(isOwnerApprovalRequestedNotification(notification)).toBe(false);
    expect(getOwnerNotificationTarget(notification)).toEqual({
      kind: 'request',
      id: 'req-4',
    });
    expect(getOwnerNotificationTone(notification as any)).toEqual({
      bg: '#E7EEF9',
      text: '#3C5A8C',
    });
  });

  it('keeps OWNER_APPROVAL_REQUESTED as the approval notification type', () => {
    expect(
      isOwnerApprovalRequestedNotification({
        type: 'OWNER_APPROVAL_REQUESTED',
      }),
    ).toBe(true);
  });
});
