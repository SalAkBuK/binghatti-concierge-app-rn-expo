import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '../../components/ui/HeaderBar';
import { ScreenEntrance } from '../../components/ui/ScreenEntrance';
import { SideMenu } from '../../components/ui/SideMenu';
import { useAuth } from '../../lib/context/auth-context';
import { useProviderPortalContext } from '../../lib/context/provider-portal-context';
import { useProviderUnauthorized } from '../../lib/hooks/provider/useProviderUnauthorized';
import { useProviderUnreadSummary } from '../../lib/hooks/provider/useProviderUnreadSummary';
import { providerPortalApi } from '../../lib/services/api/provider-portal';
import type {
  ProviderPortalRequest,
  ProviderPortalRequestStatus,
} from '../../lib/types';
import {
  PROVIDER_PALETTE as P,
  formatProviderLabel,
  formatProviderRelativeTime,
  getProviderActorDisplayName,
  getProviderApprovalTone,
  getProviderRequestStatusTone,
  resolveProviderApprovalStatus,
} from '../../lib/utils/provider-portal';
import {
  getRequestLifecycleBadges,
  type RequestLifecycleBadgeTone,
} from '../../lib/utils/request-tenancy-context';

type RequestFilter = ProviderPortalRequestStatus;

const lifecycleBadgeTone = (tone: RequestLifecycleBadgeTone) => {
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

const FILTERS: Array<{
  key: RequestFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'OPEN', label: 'Open', icon: 'mail-unread-outline' },
  { key: 'ASSIGNED', label: 'Assigned', icon: 'person-outline' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: 'construct-outline' },
  { key: 'COMPLETED', label: 'Completed', icon: 'checkmark-done-outline' },
];

export default function ServiceProviderQueueScreen() {
  const { currentUser } = useAuth();
  const { activeProvider } = useProviderPortalContext();
  const handleUnauthorized = useProviderUnauthorized();
  const { requestCommentUnreadCount, refresh: refreshUnreadSummary } =
    useProviderUnreadSummary({
      enabled: currentUser?.role === 'service_provider',
    });
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [requests, setRequests] = useState<ProviderPortalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RequestFilter>('OPEN');

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await providerPortalApi.getRequests({
          status: activeFilter,
          serviceProviderId: activeProvider.id,
        });
        setRequests(data);
        setErrorMessage(null);
        await refreshUnreadSummary();
      } catch (error) {
        if (await handleUnauthorized(error)) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load provider requests.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeFilter, activeProvider.id, handleUnauthorized, refreshUnreadSummary],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return requests.filter((request) => {
      if (!query) {
        return true;
      }

      return [
        request.title,
        request.description,
        request.buildingName,
        request.unit.label,
        request.priority,
        request.type,
        request.serviceProviderAssignedTo?.name,
      ]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [requests, searchQuery]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading provider request queue...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void load(true)} />
          }
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar
            title="Request Queue"
            subtitle={`${activeProvider.name} | ${requestCommentUnreadCount} unread shared comments`}
            showNotifications={false}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            textColor={P.text}
          />

          <View style={styles.providerCard}>
            <View style={styles.providerBadge}>
              <Ionicons name="business-outline" size={16} color={P.primary} />
              <Text style={styles.providerBadgeText}>Provider context locked</Text>
            </View>
            <Text style={styles.providerName}>{activeProvider.name}</Text>
            <Text style={styles.providerCopy}>
              The worker portal is scoped to this provider membership. Queue reads stay inside this provider, and write actions remain restricted to requests assigned to you.
            </Text>
          </View>

          <View style={styles.searchCard}>
            <Ionicons name="search-outline" size={18} color={P.soft} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search requests, units, or priorities"
              placeholderTextColor={P.soft}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((filter) => {
              const active = activeFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  activeOpacity={0.85}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Ionicons
                    name={filter.icon}
                    size={14}
                    color={active ? '#FFFFFF' : P.muted}
                  />
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color={P.dangerText} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {filteredRequests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="clipboard-outline" size={28} color={P.soft} />
              <Text style={styles.emptyTitle}>No requests in this lane</Text>
              <Text style={styles.emptyText}>
                Switch queue tabs or refresh if you expect more provider work to appear.
              </Text>
            </View>
          ) : (
            filteredRequests.map((request) => {
              const statusTone = getProviderRequestStatusTone(request.status);
              const approvalStatus = resolveProviderApprovalStatus(request);
              const approvalTone = getProviderApprovalTone(approvalStatus);
              const lifecycleBadges = getRequestLifecycleBadges(request);

              return (
                <TouchableOpacity
                  key={request.id}
                  style={styles.requestCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({
                      pathname: '/(serviceProvider)/requests/[requestId]',
                      params: { requestId: request.id },
                    })
                  }
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.requestIconWrap}>
                      <Ionicons name="construct-outline" size={18} color={P.primary} />
                    </View>
                    <View style={styles.cardCopy}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {request.title}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {request.buildingName} | Unit {request.unit.label || 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: statusTone.bg }]}>
                      <Text style={[styles.pillText, { color: statusTone.text }]}>
                        {formatProviderLabel(request.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {request.description}
                  </Text>

                  {lifecycleBadges.length > 0 ? (
                    <View style={styles.lifecycleBadgeRow}>
                      {lifecycleBadges.map((badge) => {
                        const tone = lifecycleBadgeTone(badge.tone);
                        return (
                          <View
                            key={`${request.id}-${badge.key}-${badge.label}`}
                            style={[styles.lifecycleBadge, { backgroundColor: tone.bg }]}
                          >
                            <Text style={[styles.lifecycleBadgeText, { color: tone.text }]}>
                              {badge.label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={[styles.subtlePill, { backgroundColor: approvalTone.bg }]}>
                      <Text style={[styles.subtlePillText, { color: approvalTone.text }]}>
                        Approval {formatProviderLabel(approvalStatus)}
                      </Text>
                    </View>
                    <View style={styles.metaInline}>
                      <Ionicons name="flag-outline" size={13} color={P.soft} />
                      <Text style={styles.footerText}>
                        {formatProviderLabel(request.priority)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.footerText}>
                      Assigned to {getProviderActorDisplayName(request.serviceProviderAssignedTo)}
                    </Text>
                    <Text style={styles.footerText}>
                      Updated {formatProviderRelativeTime(request.updatedAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <SideMenu
          isVisible={showSideMenu}
          onClose={() => setShowSideMenu(false)}
          userRole="service_provider"
        />
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
  scrollContent: {
    paddingBottom: 34,
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
  providerCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    padding: 18,
    marginBottom: 14,
  },
  providerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: P.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: P.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  providerName: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '800',
    color: P.text,
  },
  providerCopy: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: P.text,
  },
  filterRow: {
    gap: 10,
    paddingBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.text,
  },
  filterChipTextActive: {
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
  requestCard: {
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  requestIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: P.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: P.text,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    color: P.muted,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardDescription: {
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
  lifecycleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  metaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardFooter: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: P.border,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: P.soft,
  },
});
