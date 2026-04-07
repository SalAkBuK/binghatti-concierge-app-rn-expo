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

import { HeaderBar } from '../../components/ui/HeaderBar';
import { ScreenEntrance } from '../../components/ui/ScreenEntrance';
import { SideMenu } from '../../components/ui/SideMenu';
import { useAuth } from '../../lib/context/auth-context';
import { useOwnerUnreadSummary } from '../../lib/hooks/owner/useOwnerUnreadSummary';
import { useOwnerUnauthorized } from '../../lib/hooks/owner/useOwnerUnauthorized';
import { ownerPortalApi } from '../../lib/services/api/owner-portal';
import type { OwnerPortfolioUnit, OwnerUnitTenant } from '../../lib/types';
import { OWNER_PALETTE as P } from '../../lib/utils/owner-portal';

type UnitTenantState = {
  isLoading: boolean;
  tenant: OwnerUnitTenant | null;
  errorType: 'outside_scope' | 'unknown' | null;
};

export default function OwnerUnitsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { currentUser } = useAuth();
  const handleUnauthorized = useOwnerUnauthorized();
  const { conversationUnreadCount, notificationUnreadCount } = useOwnerUnreadSummary({
    enabled: currentUser?.role === 'owner',
  });
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [units, setUnits] = useState<OwnerPortfolioUnit[]>([]);
  const [unitTenants, setUnitTenants] = useState<Record<string, UnitTenantState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await ownerPortalApi.getUnits();
        setUnits(response);
        setUnitTenants(
          Object.fromEntries(
            response.map((unit) => [
              unit.unitId,
              {
                isLoading: true,
                tenant: null,
                errorType: null,
              } satisfies UnitTenantState,
            ]),
          ),
        );

        const tenantEntries = await Promise.all(
          response.map(async (unit) => {
            try {
              const tenant = await ownerPortalApi.getUnitTenant(unit.unitId);
              return [
                unit.unitId,
                {
                  isLoading: false,
                  tenant,
                  errorType: null,
                } satisfies UnitTenantState,
              ] as const;
            } catch (error) {
              const status =
                error && typeof error === 'object' && 'status' in error
                  ? (error as { status?: unknown }).status
                  : undefined;

              return [
                unit.unitId,
                {
                  isLoading: false,
                  tenant: null,
                  errorType: status === 404 ? 'outside_scope' : 'unknown',
                } satisfies UnitTenantState,
              ] as const;
            }
          }),
        );

        setUnitTenants(Object.fromEntries(tenantEntries));
        setErrorMessage(null);
      } catch (error) {
        if (await handleUnauthorized(error)) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load owner units.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [handleUnauthorized],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filteredUnits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return units;

    return units.filter((unit) =>
      `${unit.unitLabel} ${unit.buildingName} ${unit.orgName}`.toLowerCase().includes(query),
    );
  }, [searchQuery, units]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading accessible units...</Text>
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
            title="Units"
            subtitle="Read-only owner scope"
            hasUnreadNotifications={notificationUnreadCount > 0}
            messagingUnreadCount={conversationUnreadCount}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            textColor={P.text}
          />

          <View style={styles.searchCard}>
            <Ionicons name="search-outline" size={18} color={P.soft} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by unit, building, or org"
              placeholderTextColor={P.soft}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{filteredUnits.length} units currently visible</Text>
            <Text style={styles.summaryText}>
              This list follows active ownership scope only. If ownership changes,
              units disappear from this screen immediately.
            </Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color={P.dangerText} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {filteredUnits.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="business-outline" size={28} color={P.soft} />
              <Text style={styles.emptyTitle}>No units found</Text>
              <Text style={styles.emptyText}>
                Try a different search or confirm this owner still has an active access grant and
                current unit ownership.
              </Text>
            </View>
          ) : (
            filteredUnits.map((unit) => (
              <View key={unit.unitId} style={styles.unitCard}>
                <View style={styles.unitTopRow}>
                  <View style={styles.unitIconWrap}>
                    <Ionicons name="business-outline" size={18} color={P.primary} />
                  </View>
                  <View style={styles.unitCopy}>
                    <Text style={styles.unitLabel}>{unit.unitLabel}</Text>
                    <Text style={styles.unitMeta}>{unit.buildingName}</Text>
                  </View>
                </View>

                <View style={styles.metaGrid}>
                  <MetaField label="Organization" value={unit.orgName} />
                  <MetaField label="Building" value={unit.buildingName} />
                  <MetaField label="Owner ID" value={unit.ownerId} mono />
                  <MetaField label="Unit ID" value={unit.unitId} mono />
                </View>

                <UnitTenantCard
                  tenantState={unitTenants[unit.unitId]}
                  unit={unit}
                />
              </View>
            ))
          )}
        </ScrollView>

        <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
      </SafeAreaView>
    </ScreenEntrance>
  );
}

function UnitTenantCard({
  tenantState,
  unit,
}: {
  tenantState?: UnitTenantState;
  unit: OwnerPortfolioUnit;
}) {
  return (
    <View style={styles.tenantCard}>
      <View style={styles.tenantHeader}>
        <View>
          <Text style={styles.tenantEyebrow}>Active Tenant</Text>
          <Text style={styles.tenantTitle}>Current occupancy</Text>
        </View>
        {tenantState?.tenant ? (
          <TouchableOpacity
            style={styles.tenantActionChip}
            onPress={() => router.push('/(owner)/messages')}
          >
            <Ionicons name="chatbubble-outline" size={14} color={P.primary} />
            <Text style={styles.tenantActionText}>Message</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {tenantState?.isLoading ? (
        <View style={styles.tenantBodyRow}>
          <ActivityIndicator size="small" color={P.primary} />
          <Text style={styles.tenantBodyText}>Checking active tenant for {unit.unitLabel}...</Text>
        </View>
      ) : tenantState?.errorType === 'outside_scope' ? (
        <Text style={styles.tenantMutedText}>
          This unit is no longer inside current owner scope.
        </Text>
      ) : tenantState?.errorType === 'unknown' ? (
        <Text style={styles.tenantMutedText}>
          Unable to confirm the current tenant right now.
        </Text>
      ) : tenantState?.tenant ? (
        <View style={styles.tenantMetaGrid}>
          <MetaField label="Name" value={tenantState.tenant.name} />
          <MetaField label="Email" value={tenantState.tenant.email || 'Not provided'} />
          <MetaField label="Phone" value={tenantState.tenant.phone || 'Not provided'} />
          <MetaField label="Tenant User ID" value={tenantState.tenant.tenantUserId} mono />
        </View>
      ) : (
        <Text style={styles.tenantMutedText}>
          This unit is currently vacant. Tenant compose is unavailable until an active resident is assigned.
        </Text>
      )}
    </View>
  );
}

function MetaField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.metaField}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, mono && styles.metaValueMono]} numberOfLines={1}>
        {value}
      </Text>
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
  summaryCard: {
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    padding: 18,
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
  },
  summaryText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
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
  unitCard: {
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    padding: 18,
    marginBottom: 12,
  },
  unitTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  unitIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: P.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitCopy: {
    flex: 1,
  },
  unitLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: P.text,
  },
  unitMeta: {
    marginTop: 4,
    fontSize: 13,
    color: P.muted,
  },
  metaGrid: {
    gap: 12,
  },
  tenantCard: {
    marginTop: 14,
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  tenantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tenantEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: P.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  tenantTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: P.text,
  },
  tenantActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tenantActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.primary,
  },
  tenantBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tenantBodyText: {
    flex: 1,
    fontSize: 13,
    color: P.muted,
  },
  tenantMutedText: {
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
  },
  tenantMetaGrid: {
    gap: 10,
  },
  metaField: {
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: P.soft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    color: P.text,
    fontWeight: '600',
  },
  metaValueMono: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
