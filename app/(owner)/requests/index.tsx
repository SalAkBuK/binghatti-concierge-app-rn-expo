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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '../../../components/ui/HeaderBar';
import { ScreenEntrance } from '../../../components/ui/ScreenEntrance';
import { SideMenu } from '../../../components/ui/SideMenu';
import { useAuth } from '../../../lib/context/auth-context';
import { useOwnerUnreadSummary } from '../../../lib/hooks/owner/useOwnerUnreadSummary';
import { useOwnerUnauthorized } from '../../../lib/hooks/owner/useOwnerUnauthorized';
import { ownerPortalApi } from '../../../lib/services/api/owner-portal';
import type { OwnerPortfolioRequest } from '../../../lib/types';
import {
  formatOwnerLabel,
  formatOwnerRelativeTime,
  getOwnerApprovalTone,
  getOwnerRequestStatusTone,
  resolveOwnerRequestApprovalStatus,
  OWNER_PALETTE as P,
} from '../../../lib/utils/owner-portal';

type RequestFilter = 'all' | 'approval' | 'open' | 'completed';

const FILTERS: {
  key: RequestFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'approval', label: 'Approval', icon: 'time-outline' },
  { key: 'open', label: 'Open', icon: 'clipboard-outline' },
  { key: 'completed', label: 'Closed', icon: 'checkmark-done-outline' },
];

export default function OwnerRequestsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { currentUser } = useAuth();
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
  const [requests, setRequests] = useState<OwnerPortfolioRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RequestFilter>('all');

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const data = await ownerPortalApi.getRequests();
        setRequests(data);
        setErrorMessage(null);
        await refreshUnreadSummary();
      } catch (error) {
        if (await handleUnauthorized(error)) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load owner requests.',
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

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        `${request.title} ${request.description} ${request.buildingName} ${request.unit.label} ${request.orgName}`
          .toLowerCase()
          .includes(query);

        if (!matchesSearch) return false;

      const approvalStatus = resolveOwnerRequestApprovalStatus(request);

      switch (activeFilter) {
        case 'approval':
          return approvalStatus === 'PENDING';
        case 'open':
          return !['COMPLETED', 'CANCELED', 'CANCELLED'].includes(
            request.status?.toUpperCase(),
          );
        case 'completed':
          return ['COMPLETED', 'CANCELED', 'CANCELLED'].includes(
            request.status?.toUpperCase(),
          );
        default:
          return true;
      }
    });
  }, [activeFilter, requests, searchQuery]);

  const filterCounts = useMemo(
    () => ({
      all: requests.length,
      approval: requests.filter(
        (request) => resolveOwnerRequestApprovalStatus(request) === 'PENDING',
      ).length,
      open: requests.filter(
        (request) =>
          !['COMPLETED', 'CANCELED', 'CANCELLED'].includes(request.status?.toUpperCase()),
      ).length,
      completed: requests.filter((request) =>
        ['COMPLETED', 'CANCELED', 'CANCELLED'].includes(request.status?.toUpperCase()),
      ).length,
    }),
    [requests],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading owner requests...</Text>
        </View>
      </SafeAreaView>
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
            title="Requests"
            subtitle={`${requestCommentUnreadCount} unread shared comments`}
            hasUnreadNotifications={notificationUnreadCount > 0}
            messagingUnreadCount={conversationUnreadCount}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            notificationRoute="/(modals)/owner-alerts"
            textColor={P.text}
          />

          <View style={styles.searchCard}>
            <Ionicons name="search-outline" size={18} color={P.soft} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search requests, units, or buildings"
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
                  <View style={[styles.filterCount, active && styles.filterCountActive]}>
                    <Text
                      style={[
                        styles.filterCountText,
                        active && styles.filterCountTextActive,
                      ]}
                    >
                      {filterCounts[filter.key]}
                    </Text>
                  </View>
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
              <Text style={styles.emptyTitle}>No matching requests</Text>
              <Text style={styles.emptyText}>
                Owner requests appear only while the unit remains inside current owner scope.
              </Text>
            </View>
          ) : (
            filteredRequests.map((request) => {
              const statusTone = getOwnerRequestStatusTone(request.status);
              const approvalStatus = resolveOwnerRequestApprovalStatus(request);
              const approvalTone = getOwnerApprovalTone(approvalStatus);

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
                        returnTo: '/(owner)/requests',
                      },
                    })
                  }
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.requestIconWrap}>
                      <Ionicons name="clipboard-outline" size={18} color={P.primary} />
                    </View>
                    <View style={styles.cardCopy}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {request.title}
                        </Text>
                      </View>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {request.buildingName} • Unit {request.unit.label} • {request.orgName}
                      </Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: statusTone.bg }]}>
                      <Text style={[styles.pillText, { color: statusTone.text }]}>
                        {formatOwnerLabel(request.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {request.description}
                  </Text>

                  <View style={styles.cardFooter}>
                    <View style={[styles.subtlePill, { backgroundColor: approvalTone.bg }]}>
                      <Text style={[styles.subtlePillText, { color: approvalTone.text }]}>
                        Approval {formatOwnerLabel(approvalStatus)}
                      </Text>
                    </View>
                    <Text style={styles.footerText}>
                      Updated {formatOwnerRelativeTime(request.updatedAt)}
                    </Text>
                  </View>

                  {approvalStatus === 'PENDING' ? (
                    <View style={styles.pendingActionRow}>
                      <Text style={styles.pendingActionHint}>
                        Owner approval is waiting on your decision.
                      </Text>
                      <TouchableOpacity
                        style={styles.pendingActionButton}
                        onPress={() =>
                          router.push({
                            pathname: '/(owner)/requests/[requestId]',
                            params: {
                              requestId: request.id,
                              returnTo: '/(owner)/requests',
                            },
                          })
                        }
                      >
                        <Ionicons name="eye-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.pendingActionButtonText}>Review</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
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
  filterCount: {
    minWidth: 24,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 7,
    paddingVertical: 4,
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: P.muted,
  },
  filterCountTextActive: {
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
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  cardFooter: {
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
  footerText: {
    fontSize: 12,
    color: P.soft,
  },
  pendingActionRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: P.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pendingActionHint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: P.muted,
  },
  pendingActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: P.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pendingActionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
