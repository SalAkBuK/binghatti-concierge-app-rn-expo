import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '../../components/ui/HeaderBar';
import { ScreenEntrance } from '../../components/ui/ScreenEntrance';
import { useAuth } from '../../lib/context/auth-context';
import { useOwnerUnreadSummary } from '../../lib/hooks/owner/useOwnerUnreadSummary';
import { useOwnerUnauthorized } from '../../lib/hooks/owner/useOwnerUnauthorized';
import { ownerPortalApi } from '../../lib/services/api/owner-portal';
import type { OwnerNotification } from '../../lib/types';
import {
  formatOwnerDateTime,
  formatOwnerLabel,
  getOwnerNotificationTarget,
  getOwnerNotificationTone,
  isOwnerApprovalRequestedNotification,
  isOwnerMaintenanceNoticeNotification,
  OWNER_PALETTE as P,
} from '../../lib/utils/owner-portal';

export default function OwnerNotificationsScreen() {
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const handleUnauthorized = useOwnerUnauthorized();
  const {
    conversationUnreadCount,
    notificationUnreadCount,
    notificationsRefreshKey,
    refresh: refreshUnreadSummary,
  } = useOwnerUnreadSummary({
    enabled: currentUser?.role === 'owner',
  });
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUnreadOnly, setIsUnreadOnly] = useState(false);
  const [includeDismissed, setIncludeDismissed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await ownerPortalApi.getNotifications({
          unreadOnly: isUnreadOnly,
          includeDismissed,
          limit: 100,
        });
        setNotifications(response.items);
        setErrorMessage(null);
        await refreshUnreadSummary();
      } catch (error) {
        if (await handleUnauthorized(error)) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load notifications.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [handleUnauthorized, includeDismissed, isUnreadOnly, refreshUnreadSummary],
  );

  useEffect(() => {
    void load();
  }, [load, notificationsRefreshKey]);

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) =>
        includeDismissed ? true : !notification.dismissedAt,
      ),
    [includeDismissed, notifications],
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await ownerPortalApi.markAllNotificationsRead();
      await load(true);
    } catch (error) {
      if (await handleUnauthorized(error)) {
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to mark notifications as read.',
      );
    }
  }, [handleUnauthorized, load]);

  const handleNotificationAction = useCallback(
    async (
      notificationId: string,
      action: 'read' | 'dismiss' | 'undismiss',
    ) => {
      try {
        if (action === 'read') {
          await ownerPortalApi.markNotificationRead(notificationId);
        } else if (action === 'dismiss') {
          await ownerPortalApi.dismissNotification(notificationId);
        } else {
          await ownerPortalApi.undismissNotification(notificationId);
        }

        await load(true);
      } catch (error) {
        if (await handleUnauthorized(error)) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to update notification.',
        );
      }
    },
    [handleUnauthorized, load],
  );

  const handleOpenNotification = useCallback(
    async (notification: OwnerNotification) => {
      const target = getOwnerNotificationTarget(notification);
      if (!target) {
        return;
      }

      if (!notification.readAt) {
        try {
          await ownerPortalApi.markNotificationRead(notification.id);
          await refreshUnreadSummary();
          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id
                ? {
                    ...item,
                    readAt: item.readAt ?? new Date().toISOString(),
                  }
                : item,
            ),
          );
        } catch (error) {
          if (__DEV__) {
            console.log('[OwnerNotifications] Failed to mark notification read before open', error);
          }
        }
      }

      if (target.kind === 'request') {
        router.push({
          pathname: '/(owner)/requests/[requestId]',
          params: {
            requestId: target.id,
            returnTo: '/(modals)/owner-alerts',
          },
        });
        return;
      }

      router.push({
        pathname: '/(owner)/messages/[conversationId]',
        params: {
          conversationId: target.id,
          returnTo: '/(modals)/owner-alerts',
        },
      });
    },
    [refreshUnreadSummary],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 34 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void load(true)} />
          }
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar
            title="Alerts"
            subtitle={`${notificationUnreadCount} unread alerts`}
            showMenu={false}
            showBackButton
            showNotifications={false}
            hasUnreadNotifications={notificationUnreadCount > 0}
            messagingUnreadCount={conversationUnreadCount}
            textColor={P.text}
            horizontalPadding={0}
            menuMargin={0}
            onBackPress={() => router.back()}
          />

          <View style={styles.controlsCard}>
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[styles.controlChip, isUnreadOnly && styles.controlChipActive]}
                onPress={() => setIsUnreadOnly((prev) => !prev)}
              >
                <Text
                  style={[
                    styles.controlChipText,
                    isUnreadOnly && styles.controlChipTextActive,
                  ]}
                >
                  Unread only
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlChip, includeDismissed && styles.controlChipActive]}
                onPress={() => setIncludeDismissed((prev) => !prev)}
              >
                <Text
                  style={[
                    styles.controlChipText,
                    includeDismissed && styles.controlChipTextActive,
                  ]}
                >
                  Include dismissed
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.markAllButton} onPress={() => void handleMarkAllRead()}>
              <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
              <Text style={styles.markAllButtonText}>Mark all read</Text>
            </TouchableOpacity>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color={P.dangerText} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {visibleNotifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="notifications-outline" size={28} color={P.soft} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptyText}>
                Try widening the filter or wait for new owner-scope activity.
              </Text>
            </View>
          ) : (
            visibleNotifications.map((notification) => {
              const tone = getOwnerNotificationTone(notification);
              const unread = !notification.readAt;
              const target = getOwnerNotificationTarget(notification);
              const isApprovalRequest =
                isOwnerApprovalRequestedNotification(notification);
              const isMaintenanceNotice =
                isOwnerMaintenanceNoticeNotification(notification);
              const requestActionLabel = isApprovalRequest
                ? 'Review approval'
                : isMaintenanceNotice
                  ? 'Open request'
                  : 'Open request';

              return (
                <View key={notification.id} style={styles.notificationCard}>
                  <TouchableOpacity
                    style={styles.notificationTopRow}
                    activeOpacity={target ? 0.88 : 1}
                    disabled={!target}
                    onPress={() => void handleOpenNotification(notification)}
                  >
                    <View style={[styles.notificationIconWrap, { backgroundColor: tone.bg }]}>
                      <Ionicons name="notifications-outline" size={18} color={tone.text} />
                    </View>
                    <View style={styles.notificationBody}>
                      <View style={styles.notificationHeader}>
                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                        {unread ? <View style={styles.unreadDot} /> : null}
                      </View>
                      <Text style={styles.notificationMeta}>
                        {formatOwnerLabel(notification.type)} • {notification.orgId || 'Owner scope'}
                      </Text>
                      <Text style={styles.notificationMessage}>
                        {notification.body || notification.message || 'No additional message provided.'}
                      </Text>
                      <Text style={styles.notificationDate}>
                        {formatOwnerDateTime(notification.createdAt)}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.actionRow}>
                    {target ? (
                      <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() => void handleOpenNotification(notification)}
                      >
                        <Text style={styles.actionChipText}>
                          {target.kind === 'request' ? requestActionLabel : 'Open message'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {!notification.readAt ? (
                      <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() => void handleNotificationAction(notification.id, 'read')}
                      >
                        <Text style={styles.actionChipText}>Mark read</Text>
                      </TouchableOpacity>
                    ) : null}
                    {notification.dismissedAt ? (
                      <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() => void handleNotificationAction(notification.id, 'undismiss')}
                      >
                        <Text style={styles.actionChipText}>Undismiss</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() => void handleNotificationAction(notification.id, 'dismiss')}
                      >
                        <Text style={styles.actionChipText}>Dismiss</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenEntrance>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: P.muted,
  },
  controlsCard: {
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
    marginBottom: 14,
  },
  controlRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  controlChip: {
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  controlChipActive: {
    backgroundColor: P.primary,
  },
  controlChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.text,
  },
  controlChipTextActive: {
    color: '#FFFFFF',
  },
  markAllButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  markAllButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: P.dangerBg,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: P.dangerText,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
    textAlign: 'center',
  },
  notificationCard: {
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
    marginBottom: 12,
  },
  notificationTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBody: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: P.text,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: P.primary,
  },
  notificationMeta: {
    marginTop: 4,
    fontSize: 12,
    color: P.muted,
  },
  notificationMessage: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.text,
  },
  notificationDate: {
    marginTop: 10,
    fontSize: 11,
    color: P.soft,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionChip: {
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.primary,
  },
});
