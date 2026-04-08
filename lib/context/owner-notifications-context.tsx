import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useAuth } from './auth-context';
import apiService from '../services/api';
import { ownerPortalApi } from '../services/api/owner-portal';
import {
  getPushDeviceRegistration,
  isExpoNotificationsSupported,
  type PushDeviceRegistration,
} from '../services/local-notifications';
import {
  connectNotifications,
  subscribeNotificationsSocket,
} from '../services/notificationsSocket';
import { STORAGE_KEYS } from '../utils/constants';
import { getOwnerNotificationTarget } from '../utils/owner-portal';

type OwnerNotificationsContextValue = {
  conversationUnreadCount: number;
  notificationUnreadCount: number;
  requestCommentUnreadCount: number;
  totalUnreadCount: number;
  isLoading: boolean;
  notificationsRefreshKey: number;
  refresh: () => Promise<void>;
};

const OwnerNotificationsContext = createContext<
  OwnerNotificationsContextValue | undefined
>(undefined);

const asRecord = (value: unknown): Record<string, any> | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return value as Record<string, any>;
};

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildPushPayload = (registration: PushDeviceRegistration) => ({
  token: registration.token,
  provider: registration.provider,
  platform: registration.platform,
  ...(registration.appId ? { appId: registration.appId } : {}),
});

const navigateFromNotificationPayload = (payload: unknown) => {
  const target = getOwnerNotificationTarget(payload);
  if (target?.kind === 'conversation') {
    router.push({
      pathname: '/(owner)/messages/[conversationId]',
      params: {
        conversationId: target.id,
        returnTo: '/(modals)/owner-alerts',
      },
    });
    return;
  }

  if (target?.kind === 'request') {
    router.push({
      pathname: '/(owner)/requests/[requestId]',
      params: {
        requestId: target.id,
        returnTo: '/(modals)/owner-alerts',
      },
    });
    return;
  }

  router.push('/(modals)/owner-alerts' as any);
};

export function OwnerNotificationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, currentUser } = useAuth();
  const isOwnerRuntime = isAuthenticated && currentUser?.role === 'owner';
  const [conversationUnreadCount, setConversationUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [requestCommentUnreadCount, setRequestCommentUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsRefreshKey, setNotificationsRefreshKey] = useState(0);
  const appState = useRef(AppState.currentState);
  const lastRefreshAtRef = useRef(0);
  const pushResponseIdRef = useRef<string | null>(null);

  const invalidateNotifications = useCallback(() => {
    setNotificationsRefreshKey((current) => current + 1);
  }, []);

  const refresh = useCallback(async () => {
    if (!isOwnerRuntime) {
      setConversationUnreadCount(0);
      setNotificationUnreadCount(0);
      setRequestCommentUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [conversations, notifications, requestComments] = await Promise.all([
        ownerPortalApi.getConversationUnreadCount(),
        ownerPortalApi.getNotificationUnreadCount(),
        ownerPortalApi.getUnreadRequestCommentCount(),
      ]);

      setConversationUnreadCount(conversations);
      setNotificationUnreadCount(notifications);
      setRequestCommentUnreadCount(requestComments);
    } finally {
      setIsLoading(false);
    }
  }, [isOwnerRuntime]);

  const refreshWithCooldown = useCallback(
    (reason: 'bootstrap' | 'foreground' | 'socket' | 'push') => {
      const now = Date.now();
      const cooldownMs = reason === 'socket' ? 800 : 0;
      if (cooldownMs > 0 && now - lastRefreshAtRef.current < cooldownMs) {
        return;
      }

      lastRefreshAtRef.current = now;
      void refresh();
    },
    [refresh],
  );

  useEffect(() => {
    if (!isOwnerRuntime) {
      return;
    }

    refreshWithCooldown('bootstrap');
    invalidateNotifications();
  }, [invalidateNotifications, isOwnerRuntime, refreshWithCooldown]);

  useEffect(() => {
    if (!isOwnerRuntime) {
      return;
    }

    let cancelled = false;

    const syncOwnerDevice = async () => {
      try {
        const registration = await getPushDeviceRegistration();
        if (!registration || cancelled) {
          return;
        }

        const storedDeviceId = await SecureStore.getItemAsync(
          STORAGE_KEYS.owner_push_device_id,
        );
        const payload = buildPushPayload(registration);

        if (storedDeviceId) {
          try {
            const updated = await ownerPortalApi.updateNotificationDevice(
              storedDeviceId,
              payload,
            );
            const resolvedDeviceId = asString(updated?.id) ?? storedDeviceId;
            await SecureStore.setItemAsync(
              STORAGE_KEYS.owner_push_device_id,
              resolvedDeviceId,
            );
            await SecureStore.setItemAsync(
              STORAGE_KEYS.owner_push_device_token,
              registration.token,
            );
            return;
          } catch (error: any) {
            if (__DEV__) {
              console.log('[OwnerNotifications] Failed to update device, retrying register', {
                status: error?.status,
                message: error?.message,
              });
            }
          }
        }

        const created = await ownerPortalApi.registerNotificationDevice(payload);
        const createdDeviceId = asString(created?.id);
        if (createdDeviceId) {
          await SecureStore.setItemAsync(
            STORAGE_KEYS.owner_push_device_id,
            createdDeviceId,
          );
        }
        await SecureStore.setItemAsync(
          STORAGE_KEYS.owner_push_device_token,
          registration.token,
        );
      } catch (error) {
        if (__DEV__) {
          console.log('[OwnerNotifications] Failed to sync owner push device', error);
        }
      }
    };

    void syncOwnerDevice();

    return () => {
      cancelled = true;
    };
  }, [isOwnerRuntime]);

  useEffect(() => {
    if (!isOwnerRuntime) {
      return;
    }

    let isMounted = true;
    let activeSocket: ReturnType<typeof connectNotifications> | null = null;
    const socketHandlers = {
      hello: () => {
        refreshWithCooldown('socket');
      },
      mutation: () => {
        invalidateNotifications();
        refreshWithCooldown('socket');
      },
    };

    const attachSocketHandlers = (socket: ReturnType<typeof connectNotifications>) => {
      socket.off('notifications:hello', socketHandlers.hello);
      socket.on('notifications:hello', socketHandlers.hello);
      socket.off('notifications:new', socketHandlers.mutation);
      socket.on('notifications:new', socketHandlers.mutation);
      socket.off('notifications:read', socketHandlers.mutation);
      socket.on('notifications:read', socketHandlers.mutation);
      socket.off('notifications:read_all', socketHandlers.mutation);
      socket.on('notifications:read_all', socketHandlers.mutation);
      socket.off('notifications:dismiss', socketHandlers.mutation);
      socket.on('notifications:dismiss', socketHandlers.mutation);
      socket.off('notifications:undismiss', socketHandlers.mutation);
      socket.on('notifications:undismiss', socketHandlers.mutation);
    };

    const detachSocketHandlers = (socket: ReturnType<typeof connectNotifications>) => {
      socket.off('notifications:hello', socketHandlers.hello);
      socket.off('notifications:new', socketHandlers.mutation);
      socket.off('notifications:read', socketHandlers.mutation);
      socket.off('notifications:read_all', socketHandlers.mutation);
      socket.off('notifications:dismiss', socketHandlers.mutation);
      socket.off('notifications:undismiss', socketHandlers.mutation);
    };

    const ensureSocket = async () => {
      const token = await apiService.getAuthToken();
      if (!token || !isMounted) {
        return;
      }

      connectNotifications(token, {
        orgId: currentUser?.orgId,
      });
    };

    const unsubscribe = subscribeNotificationsSocket((socketInstance) => {
      if (!isMounted) {
        return;
      }

      if (activeSocket && activeSocket !== socketInstance) {
        detachSocketHandlers(activeSocket);
      }

      if (socketInstance) {
        attachSocketHandlers(socketInstance);
      }

      activeSocket = socketInstance;
    });

    void ensureSocket();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        void ensureSocket();
        refreshWithCooldown('foreground');
        invalidateNotifications();
      }

      appState.current = nextState;
    });

    return () => {
      isMounted = false;
      subscription.remove();
      unsubscribe();
      if (activeSocket) {
        detachSocketHandlers(activeSocket);
      }
    };
  }, [
    currentUser?.orgId,
    invalidateNotifications,
    isOwnerRuntime,
    refreshWithCooldown,
  ]);

  useEffect(() => {
    if (!isOwnerRuntime) {
      return;
    }

    if (!isExpoNotificationsSupported()) {
      return;
    }

    let isMounted = true;
    let receivedSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;

    void (async () => {
      try {
        const Notifications = await import('expo-notifications');
        if (!isMounted) {
          return;
        }

        const handleOpen = (payload: unknown, responseId?: string | null) => {
          if (responseId && pushResponseIdRef.current === responseId) {
            return;
          }
          if (responseId) {
            pushResponseIdRef.current = responseId;
          }

          invalidateNotifications();
          refreshWithCooldown('push');
          navigateFromNotificationPayload(payload);
        };

        receivedSubscription = Notifications.addNotificationReceivedListener(
          (notification) => {
            invalidateNotifications();
            refreshWithCooldown('push');
            const data = asRecord(notification.request.content.data);
            if (data?.type === 'OWNER_APPROVAL_REQUESTED') {
              return;
            }
          },
        );

        responseSubscription = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            handleOpen(
              response.notification.request.content.data,
              response.notification.request.identifier,
            );
          },
        );

        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse && isMounted) {
          handleOpen(
            lastResponse.notification.request.content.data,
            lastResponse.notification.request.identifier,
          );
        }
      } catch {
        // Expo notifications may be unavailable in Expo Go.
      }
    })();

    return () => {
      isMounted = false;
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [invalidateNotifications, isOwnerRuntime, refreshWithCooldown]);

  const value = useMemo<OwnerNotificationsContextValue>(
    () => ({
      conversationUnreadCount,
      notificationUnreadCount,
      requestCommentUnreadCount,
      totalUnreadCount:
        conversationUnreadCount +
        notificationUnreadCount +
        requestCommentUnreadCount,
      isLoading,
      notificationsRefreshKey,
      refresh,
    }),
    [
      conversationUnreadCount,
      isLoading,
      notificationUnreadCount,
      notificationsRefreshKey,
      refresh,
      requestCommentUnreadCount,
    ],
  );

  return (
    <OwnerNotificationsContext.Provider value={value}>
      {children}
    </OwnerNotificationsContext.Provider>
  );
}

export const useOptionalOwnerNotifications = () =>
  useContext(OwnerNotificationsContext);

export const useOwnerNotifications = () => {
  const context = useContext(OwnerNotificationsContext);
  if (!context) {
    throw new Error('useOwnerNotifications must be used within OwnerNotificationsProvider');
  }

  return context;
};
