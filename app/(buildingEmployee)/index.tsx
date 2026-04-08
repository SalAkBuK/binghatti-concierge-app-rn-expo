import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '../../components/ui/HeaderBar';
import { ScreenEntrance } from '../../components/ui/ScreenEntrance';
import { SideMenu } from '../../components/ui/SideMenu';
import { useAuth } from '../../lib/context/auth-context';
import { useNotifications } from '../../lib/context/notifications-context';
import { orgBuildingsApi } from '../../lib/services/api/org-buildings';
import { getUnreadNotificationsCount } from '../../lib/utils/helpers';

type MaintenanceRequest = {
  id: string;
  title: string;
  description?: string;
  priority: number;
  status: number;
  createdAt: string;
  updatedAt?: string;
  buildingId?: string;
  buildingName?: string;
};

type BuildingAssignment = {
  id: string;
  name: string;
  address?: string;
};

const P = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceLow: '#F1F4F6',
  border: '#D9E0E4',
  text: '#2B3437',
  muted: '#667176',
  soft: '#7A8488',
  primary: '#4D6169',
  primaryDark: '#34474D',
  primarySoft: '#D6E4E8',
  accent: '#F7EEDF',
  accentBorder: '#EBD8BB',
  successBg: '#E4F4EA',
  successText: '#25674A',
  warningBg: '#FDF1DB',
  warningText: '#9A5B00',
  dangerBg: '#FCE3E0',
  dangerText: '#B24A41',
  infoBg: '#E7EEF9',
  infoText: '#3C5A8C',
  shadow: 'rgba(43, 52, 55, 0.08)',
};

const STATUS_LABELS: Record<number, string> = {
  1: 'New',
  2: 'Assigned',
  3: 'In Progress',
  4: 'On Hold',
  5: 'Completed',
  6: 'Cancelled',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

const normalizeStatus = (status: unknown): number => {
  if (typeof status === 'number') return status;
  const normalized = String(status || '').toUpperCase();
  if (['OPEN', 'NEW', 'PENDING'].includes(normalized)) return 1;
  if (['ASSIGNED'].includes(normalized)) return 2;
  if (['IN_PROGRESS', 'INPROGRESS'].includes(normalized)) return 3;
  if (['ON_HOLD', 'ON-HOLD', 'HOLD'].includes(normalized)) return 4;
  if (['COMPLETED', 'DONE'].includes(normalized)) return 5;
  if (['CANCELLED', 'CANCELED'].includes(normalized)) return 6;
  return 1;
};

const normalizePriority = (priority: unknown): number => {
  if (typeof priority === 'number') return priority;
  const normalized = String(priority || '').toUpperCase();
  if (['LOW', '1'].includes(normalized)) return 1;
  if (['MEDIUM', '2'].includes(normalized)) return 2;
  if (['HIGH', '3'].includes(normalized)) return 3;
  if (['URGENT', '4'].includes(normalized)) return 4;
  return 2;
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Date unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Date unavailable';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || 'Staff';

const initials = (name?: string | null) =>
  name?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'BE';

const priorityMeta = (priority: number) => {
  switch (priority) {
    case 4:
      return { label: 'Urgent', bg: P.dangerBg, text: P.dangerText };
    case 3:
      return { label: 'High', bg: '#FFEDD5', text: '#B45309' };
    case 2:
      return { label: 'Medium', bg: P.warningBg, text: P.warningText };
    default:
      return { label: 'Low', bg: P.successBg, text: P.successText };
  }
};

export default function BuildingEmployeeDashboard() {
  const { isAuthenticated, currentUser } = useAuth();
  const { notifications } = useNotifications();
  const tabBarHeight = useBottomTabBarHeight();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [assignedBuildings, setAssignedBuildings] = useState<BuildingAssignment[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth' as any);
    }
  }, [isAuthenticated]);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser?.id) {
      setAssignedBuildings([]);
      setMaintenanceRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const buildingsResponse = await orgBuildingsApi.getAssignedBuildings();
      const buildingsPayload = Array.isArray(buildingsResponse)
        ? buildingsResponse
        : Array.isArray(buildingsResponse?.data)
          ? buildingsResponse.data
          : [];

      const mappedBuildings: BuildingAssignment[] = buildingsPayload.map((building: any) => ({
        id: String(building?.id ?? building?.buildingId ?? ''),
        name: building?.name || building?.buildingName || building?.title || 'Building',
        address: building?.address,
      }));

      setAssignedBuildings(mappedBuildings);

      if (mappedBuildings.length === 0) {
        setMaintenanceRequests([]);
        return;
      }

      const requestArrays = await Promise.all(
        mappedBuildings.map(async (building) => {
          try {
            const response = await orgBuildingsApi.getBuildingRequests(building.id);
            const payload = Array.isArray(response)
              ? response
              : Array.isArray(response?.data)
                ? response.data
                : [];

            return payload.map((request: any) => ({
              id: String(request?.id ?? request?.requestId ?? ''),
              title: request?.title || 'Maintenance request',
              description: request?.description || '',
              priority: normalizePriority(request?.priority),
              status: normalizeStatus(request?.status),
              createdAt: request?.createdAt || new Date().toISOString(),
              updatedAt: request?.updatedAt,
              buildingId: String(request?.buildingId ?? request?.building?.id ?? building.id),
              buildingName: request?.buildingName ?? request?.building?.name ?? building.name,
            }));
          } catch (error) {
            console.error(
              `[BuildingEmployeeDashboard] Failed to fetch requests for building ${building.id}`,
              error,
            );
            return [];
          }
        }),
      );

      setMaintenanceRequests(requestArrays.flat());
    } catch (error) {
      console.error('[BuildingEmployeeDashboard] Failed to fetch dashboard data', error);
      setAssignedBuildings([]);
      setMaintenanceRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  const openRequests = useMemo(
    () => maintenanceRequests.filter((request) => [1, 2, 3, 4].includes(request.status)),
    [maintenanceRequests],
  );

  const urgentRequests = useMemo(
    () =>
      [...maintenanceRequests]
        .filter((request) => request.status !== 5 && request.status !== 6 && request.priority >= 3)
        .sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return (
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
          );
        })
        .slice(0, 3),
    [maintenanceRequests],
  );

  const latestCompleted = useMemo(
    () =>
      [...maintenanceRequests]
        .filter((request) => request.status === 5)
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime(),
        )
        .slice(0, 3),
    [maintenanceRequests],
  );

  const stats = useMemo(
    () => ({
      total: maintenanceRequests.length,
      open: openRequests.length,
      assigned: maintenanceRequests.filter((request) => request.status === 2).length,
      inProgress: maintenanceRequests.filter((request) => request.status === 3).length,
      completed: maintenanceRequests.filter((request) => request.status === 5).length,
    }),
    [maintenanceRequests, openRequests.length],
  );

  const buildingName = assignedBuildings[0]?.name || 'Building Operations';
  const hasUnreadNotifications =
    getUnreadNotificationsCount(notifications || [], currentUser?.id) > 0;

  const quickActions = useMemo(
    () => [
      {
        key: 'jobs',
        label: 'Job Queue',
        icon: 'construct-outline' as const,
        onPress: () => router.push('/(buildingEmployee)/jobs'),
      },
      {
        key: 'messages',
        label: 'Messages',
        icon: 'chatbubble-ellipses-outline' as const,
        onPress: () => router.push('/(buildingEmployee)/messages'),
      },
      {
        key: 'profile',
        label: 'Profile',
        icon: 'person-outline' as const,
        onPress: () => router.push('/(buildingEmployee)/profile'),
      },
      {
        key: 'shifts',
        label: 'Shifts',
        icon: 'calendar-outline' as const,
        onPress: () => router.push('/(buildingEmployee)/shifts'),
      },
    ],
    [],
  );

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (currentUser.role !== 'building_employee') {
    return (
      <SafeAreaView style={styles.restrictedContainer}>
        <View style={styles.restrictedState}>
          <Ionicons name="lock-closed-outline" size={48} color={P.soft} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedSubtitle}>
            This workspace is only available to building employees.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 32 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={P.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(400)}>
            <HeaderBar
              showTitle={false}
              hasUnreadNotifications={hasUnreadNotifications}
              showSideMenu={showSideMenu}
              onSideMenuToggle={setShowSideMenu}
              textColor={P.text}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(40).duration(400)} style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>{buildingName}</Text>
              <Text style={styles.heroTitle}>
                Welcome back,{'\n'}
                {firstName(currentUser.name)}
              </Text>
              <Text style={styles.heroSubtitle}>
                Review assigned buildings, triage incoming requests, and keep active work moving.
              </Text>
            </View>
            <LinearGradient
              colors={[P.primary, P.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initials(currentUser.name)}</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.profileStrip}>
            <View style={styles.profilePill}>
              <Ionicons name="business-outline" size={16} color={P.primary} />
              <Text style={styles.profilePillText} numberOfLines={1}>
                {assignedBuildings.length === 0
                  ? 'No assigned buildings'
                  : `${assignedBuildings.length} assigned building${assignedBuildings.length === 1 ? '' : 's'}`}
              </Text>
            </View>
            <View style={styles.profilePill}>
              <Ionicons name="construct-outline" size={16} color={P.primary} />
              <Text style={styles.profilePillText} numberOfLines={1}>
                {stats.open} active requests
              </Text>
            </View>
          </Animated.View>

          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={P.primary} />
              <Text style={styles.emptyTitle}>Loading operations</Text>
              <Text style={styles.emptyText}>Pulling assigned buildings and request activity.</Text>
            </View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.summaryRow}>
                <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
                  <Text style={[styles.summaryValue, styles.summaryValuePrimary]}>
                    {String(stats.open).padStart(2, '0')}
                  </Text>
                  <Text style={[styles.summaryLabel, styles.summaryLabelPrimary]}>Open Requests</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{String(stats.inProgress).padStart(2, '0')}</Text>
                  <Text style={styles.summaryLabel}>In Progress</Text>
                </View>
                <View style={[styles.summaryCard, styles.summaryCardAccent]}>
                  <Text style={styles.summaryValue}>{String(stats.completed).padStart(2, '0')}</Text>
                  <Text style={styles.summaryLabel}>Completed</Text>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Priority Requests</Text>
                    <Text style={styles.sectionSubtitle}>Tackle urgent work across your assigned buildings</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/(buildingEmployee)/jobs')}>
                    <Text style={styles.linkText}>View all</Text>
                  </TouchableOpacity>
                </View>

                {urgentRequests.length > 0 ? (
                  urgentRequests.map((request) => {
                    const priority = priorityMeta(request.priority);
                    return (
                      <TouchableOpacity
                        key={request.id}
                        style={styles.requestCard}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: '/(buildingEmployee)/jobs',
                            params: { focusId: request.id },
                          })
                        }
                      >
                        <View style={styles.requestTop}>
                          <View style={styles.requestIconWrap}>
                            <Ionicons name="construct-outline" size={18} color={P.primary} />
                          </View>
                          <View style={styles.requestCopy}>
                            <Text style={styles.requestTitle} numberOfLines={1}>
                              {request.title}
                            </Text>
                            <Text style={styles.requestMeta}>
                              {request.buildingName || 'Assigned building'} · {STATUS_LABELS[request.status]}
                            </Text>
                          </View>
                          <View style={[styles.requestBadge, { backgroundColor: priority.bg }]}>
                            <Text style={[styles.requestBadgeText, { color: priority.text }]}>
                              {PRIORITY_LABELS[request.priority]}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.requestBottom}>
                          <Text style={styles.requestDescription} numberOfLines={1}>
                            {request.description || 'Open the job queue to review the full request.'}
                          </Text>
                          <Text style={styles.requestDate}>{formatDate(request.updatedAt || request.createdAt)}</Text>
                          <Ionicons name="chevron-forward" size={16} color={P.soft} />
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons name="checkmark-circle-outline" size={26} color={P.soft} />
                    <Text style={styles.emptyTitle}>No urgent requests</Text>
                    <Text style={styles.emptyText}>High-priority work will surface here automatically.</Text>
                  </View>
                )}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <Text style={styles.sectionSubtitle}>Move into the most-used employee tools</Text>
                  </View>
                </View>

                <View style={styles.quickGrid}>
                  {quickActions.map((action) => (
                    <TouchableOpacity
                      key={action.key}
                      style={styles.quickCard}
                      activeOpacity={0.88}
                      onPress={action.onPress}
                    >
                      <View style={styles.quickIconWrap}>
                        <Ionicons name={action.icon} size={20} color={P.primary} />
                      </View>
                      <Text style={styles.quickLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Assigned Buildings</Text>
                    <Text style={styles.sectionSubtitle}>Current building coverage linked to your staff account</Text>
                  </View>
                </View>

                {assignedBuildings.length > 0 ? (
                  assignedBuildings.map((building) => (
                    <View key={building.id} style={styles.buildingRow}>
                      <View style={styles.buildingIconWrap}>
                        <Ionicons name="business-outline" size={18} color={P.primary} />
                      </View>
                      <View style={styles.buildingCopy}>
                        <Text style={styles.buildingTitle}>{building.name}</Text>
                        <Text style={styles.buildingSubtitle} numberOfLines={1}>
                          {building.address || 'Building assignment active'}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Ionicons name="business-outline" size={26} color={P.soft} />
                    <Text style={styles.emptyTitle}>No assignments returned</Text>
                    <Text style={styles.emptyText}>Assigned buildings will appear here once linked by operations.</Text>
                  </View>
                )}
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(280).duration(400)} style={styles.footerCard}>
                <View style={styles.footerIcon}>
                  <Ionicons name="checkmark-done-outline" size={18} color={P.surface} />
                </View>
                <View style={styles.footerCopy}>
                  <Text style={styles.footerTitle}>Recent Closures</Text>
                  <Text style={styles.footerText}>
                    {latestCompleted[0]
                      ? `${latestCompleted[0].title} completed on ${formatDate(
                          latestCompleted[0].updatedAt || latestCompleted[0].createdAt,
                        )}.`
                      : 'Completed requests will appear here once work is closed out.'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/(buildingEmployee)/jobs')}>
                  <Text style={styles.footerLink}>Open</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </ScrollView>

        <SideMenu
          isVisible={showSideMenu}
          onClose={() => setShowSideMenu(false)}
          userRole={currentUser.role}
        />
      </SafeAreaView>
    </ScreenEntrance>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20 },
  restrictedContainer: { flex: 1, backgroundColor: P.bg },
  restrictedState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
  },
  restrictedSubtitle: {
    fontSize: 14,
    color: P.muted,
    textAlign: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  heroCopy: { flex: 1, gap: 8 },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: P.soft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  heroTitle: { fontSize: 31, lineHeight: 36, fontWeight: '800', color: P.text },
  heroSubtitle: { fontSize: 14, lineHeight: 22, color: P.muted, maxWidth: 280 },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: P.shadow,
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  avatarText: { color: P.surface, fontSize: 18, fontWeight: '800' },
  profileStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: P.border,
  },
  profilePillText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: P.text,
  },
  loadingCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: P.border,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: P.surface,
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: P.border,
    gap: 6,
  },
  summaryCardPrimary: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  summaryCardAccent: {
    backgroundColor: P.accent,
    borderColor: P.accentBorder,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: '800',
    color: P.text,
  },
  summaryValuePrimary: {
    color: P.surface,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: P.muted,
  },
  summaryLabelPrimary: {
    color: P.surface,
  },
  section: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: P.border,
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: P.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: P.muted,
    marginTop: 3,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.primary,
  },
  requestCard: {
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: P.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCopy: {
    flex: 1,
    gap: 2,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: P.text,
  },
  requestMeta: {
    fontSize: 12,
    color: P.muted,
  },
  requestBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  requestBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  requestBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requestDescription: {
    flex: 1,
    fontSize: 13,
    color: P.muted,
  },
  requestDate: {
    fontSize: 12,
    color: P.soft,
  },
  emptyCard: {
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: P.text,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: P.muted,
    textAlign: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '47%',
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: P.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: P.text,
  },
  buildingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  buildingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: P.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingCopy: {
    flex: 1,
    gap: 2,
  },
  buildingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: P.text,
  },
  buildingSubtitle: {
    fontSize: 12,
    color: P.muted,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: P.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: P.border,
    marginBottom: 12,
  },
  footerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: P.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCopy: {
    flex: 1,
    gap: 2,
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: P.text,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 19,
    color: P.muted,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: P.primary,
  },
});
