import type { Notification } from '../../types';
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
  isNotificationForUser,
} from '../helpers';

const buildNotification = (
  overrides?: Partial<Notification>,
): Notification => ({
  id: 'notification-1',
  userId: 'tenant-1',
  title: 'Visitor Registered',
  message: 'A guest was registered.',
  body: 'A guest was registered.',
  type: 'info',
  read: false,
  readAt: null,
  dismissedAt: null,
  createdAt: '2026-04-08T12:00:00.000Z',
  ...overrides,
});

describe('notification recipient scoping', () => {
  it('matches notifications only for the requested user', () => {
    expect(isNotificationForUser(buildNotification(), 'tenant-1')).toBe(true);
    expect(isNotificationForUser(buildNotification(), 'owner-1')).toBe(false);
  });

  it('filters inbox notifications to the current user only', () => {
    const notifications = [
      buildNotification({ id: 'tenant-visible', userId: 'tenant-1' }),
      buildNotification({ id: 'tenant-dismissed', userId: 'tenant-1', dismissedAt: '2026-04-08T13:00:00.000Z' }),
      buildNotification({ id: 'owner-visible', userId: 'owner-1' }),
    ];

    expect(filterNotificationsByUser(notifications, 'tenant-1')).toEqual([
      notifications[0],
    ]);
    expect(filterNotificationsByUser(notifications, 'owner-1')).toEqual([
      notifications[2],
    ]);
  });

  it('counts unread notifications for the current user only', () => {
    const notifications = [
      buildNotification({ id: 'tenant-unread', userId: 'tenant-1' }),
      buildNotification({ id: 'tenant-read', userId: 'tenant-1', read: true, readAt: '2026-04-08T12:30:00.000Z' }),
      buildNotification({ id: 'owner-unread', userId: 'owner-1' }),
    ];

    expect(getUnreadNotificationsCount(notifications, 'tenant-1')).toBe(1);
    expect(getUnreadNotificationsCount(notifications, 'owner-1')).toBe(1);
  });

  it('does not count unread chat notifications in the generic notification badge', () => {
    const notifications = [
      buildNotification({ id: 'tenant-alert', userId: 'tenant-1', type: 'info' }),
      buildNotification({ id: 'tenant-message', userId: 'tenant-1', type: 'MESSAGE_CREATED' as any }),
      buildNotification({ id: 'tenant-conversation', userId: 'tenant-1', type: 'CONVERSATION_CREATED' as any }),
    ];

    expect(getUnreadNotificationsCount(notifications, 'tenant-1')).toBe(1);
  });
});
