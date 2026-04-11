import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '../../components/ui/HeaderBar';
import { PortalLoadErrorScreen } from '../../components/ui/PortalLoadErrorScreen';
import { ScreenEntrance } from '../../components/ui/ScreenEntrance';
import { SideMenu } from '../../components/ui/SideMenu';
import { useAuth } from '../../lib/context/auth-context';
import { useOwnerUnreadSummary } from '../../lib/hooks/owner/useOwnerUnreadSummary';
import { useOwnerUnauthorized } from '../../lib/hooks/owner/useOwnerUnauthorized';
import { ownerPortalApi } from '../../lib/services/api/owner-portal';
import type {
  OwnerConversation,
  OwnerPortfolioRequest,
  OwnerPortfolioSummary,
  OwnerPortfolioUnit,
} from '../../lib/types';
import {
  formatOwnerLabel,
  formatOwnerRelativeTime,
  getOwnerConversationDisplayName,
  getOwnerApprovalTone,
  getOwnerRequestStatusTone,
  resolveOwnerRequestApprovalStatus,
  OWNER_PALETTE as P,
} from '../../lib/utils/owner-portal';
import { groupOwnerRequestsByTenancyCycle } from '../../lib/utils/owner-request-grouping';
import {
  getOwnerCurrentOccupantName,
  getOwnerPrimaryLifecycleBadge,
  getOwnerRequesterName,
  getOwnerSecondaryLifecycleBadge,
  OWNER_REQUEST_SECTION_COPY,
  type OwnerTenancyBadgeTone,
} from '../../lib/utils/owner-request-tenancy-display';

type DashboardState = {
  summary: OwnerPortfolioSummary | null;
  units: OwnerPortfolioUnit[];
  requests: OwnerPortfolioRequest[];
  conversations: OwnerConversation[];
};

const EMPTY_STATE: DashboardState = {
  summary: null,
  units: [],
  requests: [],
  conversations: [],
};

const OWNER_HOME_RECENT_REQUESTS_PER_SECTION = 2;

const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || 'Owner';

const lifecycleBadgeTone = (tone: OwnerTenancyBadgeTone) => {
  switch (tone) {
    case 'success':
      return { bg: P.successBg, text: P.successText };
    case 'warning':
      return { bg: P.warningBg, text: P.warningText };
    case 'info':
      return { bg: P.infoBg, text: P.infoText };
    default:
      return { bg: P.surfaceLow, text: P.muted };
  }
};

export default function OwnerHomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { currentUser, actions: authActions } = useAuth();
  const handleUnauthorized = useOwnerUnauthorized();
  const {
    conversationUnreadCount,
    notificationUnreadCount,
    requestCommentUnreadCount,
    refresh: refreshUnreadSummary,
  } = useOwnerUnreadSummary({
    enabled: currentUser?.role === 'owner',
  });
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasLoadedDashboard, setHasLoadedDashboard] = useState(false);
  const [state, setState] = useState<DashboardState>(EMPTY_STATE);

  useEffect(() => {
    setState(EMPTY_STATE);
    setErrorMessage(null);
    setHasLoadedDashboard(false);
    setIsLoading(true);
    setIsRefreshing(false);
  }, [currentUser?.id]);

  const handleReturnToSignIn = useCallback(async () => {
    try {
      await authActions.logout();
    } catch (error) {
      console.warn('[OwnerHome] Failed to clear session after portal load failure:', error);
    } finally {
      router.replace('/auth' as any);
    }
  }, [authActions]);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [summary, units, requests, conversations] = await Promise.all([
          ownerPortalApi.getSummary(),
          ownerPortalApi.getUnits(),
          ownerPortalApi.getRequests(),
          ownerPortalApi.getConversations({ limit: 5 }),
        ]);

        setState({
          summary,
          units,
          requests,
          conversations: conversations.items,
        });
        setErrorMessage(null);
        setHasLoadedDashboard(true);

        try {
          await refreshUnreadSummary();
        } catch (error) {
          console.warn('[OwnerHome] Failed to refresh unread summary:', error);
        }
      } catch (error) {
        if (await handleUnauthorized(error)) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load your owner portfolio right now.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [handleUnauthorized, refreshUnreadSummary],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const recentRequests = useMemo(
    () =>
      [...state.requests].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [state.requests],
  );

  const groupedRecentRequests = useMemo(() => {
    const grouped = groupOwnerRequestsByTenancyCycle(recentRequests);

    return (['current', 'historical', 'uncategorized'] as const)
      .map((key) => ({
        key,
        title: OWNER_REQUEST_SECTION_COPY[key].title,
        items: grouped[key].slice(0, OWNER_HOME_RECENT_REQUESTS_PER_SECTION),
      }))
      .filter((section) => section.items.length > 0);
  }, [recentRequests]);

  const recentConversations = useMemo(
    () =>
      [...state.conversations]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 3),
    [state.conversations],
  );

  const uniqueBuildings = useMemo(
    () => new Set(state.units.map((unit) => unit.buildingId)).size,
    [state.units],
  );

  if (isLoading && !hasLoadedDashboard) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading owner portfolio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasLoadedDashboard && errorMessage) {
    return (
      <PortalLoadErrorScreen
        portalLabel="Owner Workspace"
        message={errorMessage}
        onRetry={() => {
          void load();
        }}
        secondaryActionLabel="Return to Sign In"
        onSecondaryAction={() => {
          void handleReturnToSignIn();
        }}
      />
    );
  }

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 34 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void load(true)} />
          }
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar
            showTitle={false}
            hasUnreadNotifications={notificationUnreadCount > 0}
            messagingUnreadCount={conversationUnreadCount}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            notificationRoute="/(modals)/owner-alerts"
            textColor={P.text}
            horizontalPadding={0}
            menuMargin={0}
            notificationMargin={0}
          />

          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>Owner Portfolio</Text>
            <Text style={styles.heroTitle}>Welcome back, {firstName(currentUser?.name)}.</Text>
            <Text style={styles.heroSubtitle}>
              Your active unit scope controls everything shown here. Units, requests,
              comments, conversations, and notifications all follow current ownership
              in real time.
            </Text>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaPill}>
                <Ionicons name="business-outline" size={15} color={P.primary} />
                <Text style={styles.heroMetaPillText}>
                  {state.summary?.buildingCount ?? uniqueBuildings} buildings
                </Text>
              </View>
              <View style={styles.heroMetaPill}>
                <Ionicons name="home-outline" size={15} color={P.primary} />
                <Text style={styles.heroMetaPillText}>
                  {state.summary?.unitCount ?? state.units.length} units
                </Text>
              </View>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color={P.dangerText} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.metricsGrid}>
            <MetricCard
              label="Units"
              value={String(state.summary?.unitCount ?? state.units.length)}
              helper="Inside your active scope"
              icon="business-outline"
              onPress={() => router.push('/(owner)/units' as any)}
            />
            <MetricCard
              label="Unread Comments"
              value={String(requestCommentUnreadCount)}
              helper="Shared request threads"
              icon="chatbubble-ellipses-outline"
              onPress={() => router.push('/(owner)/requests' as any)}
            />
            <MetricCard
              label="Unread Messages"
              value={String(conversationUnreadCount)}
              helper="Owner conversations"
              icon="mail-unread-outline"
              onPress={() => router.push('/(owner)/messages' as any)}
            />
            <MetricCard
              label="Alerts"
              value={String(notificationUnreadCount)}
              helper="Unread notifications"
              icon="notifications-outline"
              onPress={() => router.push('/(modals)/owner-alerts' as any)}
            />
          </View>

          <SectionHeader
            eyebrow="Current Scope"
            title="Accessible units"
            actionLabel="View all"
            onPress={() => router.push('/(owner)/units' as any)}
          />

          {state.units.length === 0 ? (
            <EmptyCard
              icon="business-outline"
              title="No active units"
              body="This owner account does not currently have any units inside active scope."
            />
          ) : (
            state.units.slice(0, 3).map((unit) => (
              <TouchableOpacity
                key={unit.unitId}
                style={styles.listCard}
                activeOpacity={0.88}
                onPress={() => router.push('/(owner)/units')}
              >
                <View style={styles.listCardIcon}>
                  <Ionicons name="business-outline" size={18} color={P.primary} />
                </View>
                <View style={styles.listCardBody}>
                  <Text style={styles.listCardTitle}>{unit.unitLabel}</Text>
                  <Text style={styles.listCardMeta}>
                    {unit.buildingName} - {unit.orgName}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={P.soft} />
              </TouchableOpacity>
            ))
          )}

          <SectionHeader
            eyebrow="Maintenance"
            title="Recent requests"
            actionLabel="Open requests"
            onPress={() => router.push('/(owner)/requests' as any)}
          />

          {recentRequests.length === 0 ? (
            <EmptyCard
              icon="clipboard-outline"
              title="No requests in scope"
              body="Requests appear here only while their unit remains in your current owner scope."
            />
          ) : (
            groupedRecentRequests.map((section) => (
              <View key={section.key} style={styles.requestSectionBlock}>
                <Text style={styles.requestSectionTitle}>{section.title}</Text>
                {section.items.map((request) => {
                  const statusTone = getOwnerRequestStatusTone(request.status);
                  const approvalStatus = resolveOwnerRequestApprovalStatus(request);
                  const approvalTone = getOwnerApprovalTone(approvalStatus);
                  const requesterName = getOwnerRequesterName(request);
                  const currentOccupantName = getOwnerCurrentOccupantName(request);
                  const primaryLifecycleBadge = getOwnerPrimaryLifecycleBadge(request);
                  const secondaryLifecycleBadge = getOwnerSecondaryLifecycleBadge(request);

                  return (
                    <TouchableOpacity
                      key={request.id}
                      style={styles.requestCard}
                      activeOpacity={0.9}
                      onPress={() =>
                        router.push({
                          pathname: '/(owner)/requests/[requestId]',
                          params: {
                            requestId: request.id,
                            returnTo: '/(owner)',
                          },
                        })
                      }
                    >
                      <View style={styles.requestTopRow}>
                        <View style={styles.requestTitleWrap}>
                          <Text style={styles.requestTitle} numberOfLines={1}>
                            {request.title}
                          </Text>
                          <Text style={styles.requestMeta}>
                            Unit {request.unit?.label || 'Unknown unit'} · {request.buildingName}
                          </Text>
                          <Text style={styles.requestSubMeta} numberOfLines={1}>
                            {`Requester: ${requesterName}`}
                          </Text>
                          {currentOccupantName ? (
                            <Text style={styles.requestSubMeta} numberOfLines={1}>
                              {`Current tenant: ${currentOccupantName}`}
                            </Text>
                          ) : null}
                        </View>
                        <View style={[styles.statusPill, { backgroundColor: statusTone.bg }]}>
                          <Text style={[styles.statusPillText, { color: statusTone.text }]}>
                            {formatOwnerLabel(request.status)}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.requestDescription} numberOfLines={2}>
                        {request.description}
                      </Text>

                      {primaryLifecycleBadge || secondaryLifecycleBadge ? (
                        <View style={styles.lifecycleBadgeRow}>
                          {primaryLifecycleBadge ? (
                            <View
                              style={[
                                styles.lifecycleBadge,
                                styles.lifecycleBadgePrimary,
                                {
                                  backgroundColor: lifecycleBadgeTone(primaryLifecycleBadge.tone).bg,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.lifecycleBadgeText,
                                  {
                                    color: lifecycleBadgeTone(primaryLifecycleBadge.tone).text,
                                  },
                                ]}
                              >
                                {primaryLifecycleBadge.label}
                              </Text>
                            </View>
                          ) : null}
                          {secondaryLifecycleBadge ? (
                            <View
                              style={[
                                styles.lifecycleBadge,
                                {
                                  backgroundColor:
                                    lifecycleBadgeTone(secondaryLifecycleBadge.tone).bg,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.lifecycleBadgeText,
                                  {
                                    color:
                                      lifecycleBadgeTone(secondaryLifecycleBadge.tone).text,
                                  },
                                ]}
                              >
                                {secondaryLifecycleBadge.label}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      <View style={styles.requestFooter}>
                        <View
                          style={[
                            styles.subtlePill,
                            { backgroundColor: approvalTone.bg },
                          ]}
                        >
                          <Text style={[styles.subtlePillText, { color: approvalTone.text }]}>
                            Approval {formatOwnerLabel(approvalStatus)}
                          </Text>
                        </View>
                        <Text style={styles.requestFooterText}>
                          Updated {formatOwnerRelativeTime(request.updatedAt)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}

          <SectionHeader
            eyebrow="Inbox"
            title="Recent conversations"
            actionLabel="Open inbox"
            onPress={() => router.push('/(owner)/messages' as any)}
          />

          {recentConversations.length === 0 ? (
            <EmptyCard
              icon="chatbubbles-outline"
              title="No conversations yet"
              body="Messages to management and existing private threads will surface here."
            />
          ) : (
            recentConversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                style={styles.listCard}
                activeOpacity={0.88}
                onPress={() =>
                  router.push({
                    pathname: '/(owner)/messages/[conversationId]',
                    params: {
                      conversationId: conversation.id,
                      returnTo: '/(owner)',
                    },
                  })
                }
              >
                <View style={styles.listCardIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={P.primary} />
                </View>
                <View style={styles.listCardBody}>
                  <Text style={styles.listCardTitle} numberOfLines={1}>
                    {getOwnerConversationDisplayName(conversation, currentUser?.id)}
                  </Text>
                  <Text style={styles.listCardMeta} numberOfLines={1}>
                    {conversation.buildingName || 'Portfolio conversation'} -{' '}
                    {conversation.lastMessage?.content || conversation.subject || 'No messages yet'}
                  </Text>
                </View>
                <View style={styles.trailingMeta}>
                  {conversation.unreadCount > 0 ? (
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadDotText}>
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.trailingMetaText}>
                    {formatOwnerRelativeTime(
                      conversation.lastMessage?.createdAt || conversation.updatedAt,
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
      </SafeAreaView>
    </ScreenEntrance>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  helper: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.metricCard} activeOpacity={0.88} onPress={onPress}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={18} color={P.primary} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricHelper}>{helper}</Text>
      <View style={styles.metricActionRow}>
        <Text style={styles.metricActionText}>Open</Text>
        <Ionicons name="chevron-forward" size={14} color={P.primary} />
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({
  eyebrow,
  title,
  actionLabel,
  onPress,
}: {
  eyebrow: string;
  title: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <TouchableOpacity onPress={onPress}>
        <Text style={styles.sectionAction}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyCard({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name={icon} size={26} color={P.soft} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
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
  heroCard: {
    backgroundColor: P.surface,
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: P.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: P.text,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  heroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  heroMetaPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.text,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: P.dangerBg,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: P.dangerText,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    width: '48%',
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: P.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: P.soft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  metricValue: {
    marginTop: 8,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    color: P.text,
  },
  metricHelper: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: P.muted,
  },
  metricActionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: P.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: P.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: P.text,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '700',
    color: P.primary,
  },
  emptyCard: {
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '700',
    color: P.text,
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
    textAlign: 'center',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: P.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
    marginBottom: 12,
  },
  listCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: P.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardBody: {
    flex: 1,
  },
  listCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: P.text,
  },
  listCardMeta: {
    marginTop: 4,
    fontSize: 12,
    color: P.muted,
  },
  requestSectionBlock: {
    marginBottom: 10,
  },
  requestSectionTitle: {
    marginBottom: 10,
    paddingHorizontal: 4,
    fontSize: 14,
    fontWeight: '800',
    color: P.text,
  },
  requestCard: {
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
    marginBottom: 12,
  },
  requestTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    justifyContent: 'space-between',
  },
  requestTitleWrap: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: P.text,
  },
  requestMeta: {
    marginTop: 4,
    fontSize: 12,
    color: P.muted,
  },
  requestSubMeta: {
    marginTop: 4,
    fontSize: 12,
    color: P.soft,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  requestDescription: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: P.text,
  },
  lifecycleBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  lifecycleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lifecycleBadgePrimary: {
    borderWidth: 1,
    borderColor: P.border,
  },
  lifecycleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  requestFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  requestFooterText: {
    fontSize: 12,
    color: P.soft,
  },
  subtlePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  subtlePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  trailingMeta: {
    alignItems: 'flex-end',
    gap: 8,
  },
  trailingMetaText: {
    fontSize: 11,
    color: P.soft,
  },
  unreadDot: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: P.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadDotText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
