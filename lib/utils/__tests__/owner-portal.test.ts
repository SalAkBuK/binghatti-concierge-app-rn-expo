import { getOwnerNotificationTarget } from '../owner-portal';

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
});
