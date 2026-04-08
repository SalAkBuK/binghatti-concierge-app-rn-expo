import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import type {
  OwnerConversation,
  OwnerPortfolioUnit,
  OwnerUnitTenant,
} from '../../../lib/types';
import {
  formatOwnerRelativeTime,
  getOwnerConversationDisplayName,
  OWNER_PALETTE as P,
} from '../../../lib/utils/owner-portal';

type MessageFilter = 'all' | 'unread';
type ComposeTarget = 'management' | 'tenant';

type TenantLookupState = {
  isLoading: boolean;
  tenant: OwnerUnitTenant | null;
  errorType: 'outside_scope' | 'unknown' | null;
};

export default function OwnerMessagesScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { currentUser } = useAuth();
  const handleUnauthorized = useOwnerUnauthorized();
  const {
    conversationUnreadCount,
    notificationUnreadCount,
    refresh: refreshUnreadSummary,
  } = useOwnerUnreadSummary({
    enabled: currentUser?.role === 'owner',
  });
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [conversations, setConversations] = useState<OwnerConversation[]>([]);
  const [units, setUnits] = useState<OwnerPortfolioUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MessageFilter>('all');
  const [composeTarget, setComposeTarget] = useState<ComposeTarget>('management');
  const [composeUnitId, setComposeUnitId] = useState('');
  const [composeTenantLookup, setComposeTenantLookup] = useState<TenantLookupState>({
    isLoading: false,
    tenant: null,
    errorType: null,
  });
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');

  const load = useCallback(
    async (asRefresh = false) => {
      if (asRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [conversationResponse, unitsResponse] = await Promise.all([
          ownerPortalApi.getConversations({ limit: 100 }),
          ownerPortalApi.getUnits(),
        ]);
        setConversations(conversationResponse.items);
        setUnits(unitsResponse);
        setComposeUnitId((prev) => prev || unitsResponse[0]?.unitId || '');
        setErrorMessage(null);
        await refreshUnreadSummary();
      } catch (error) {
        if (await handleUnauthorized(error)) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unable to load conversations.',
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

  useEffect(() => {
    if (!showComposeModal || composeTarget !== 'tenant' || !composeUnitId) {
      return;
    }

    let isMounted = true;
    setComposeTenantLookup({
      isLoading: true,
      tenant: null,
      errorType: null,
    });

    const loadUnitTenant = async () => {
      try {
        const tenant = await ownerPortalApi.getUnitTenant(composeUnitId);
        if (!isMounted) {
          return;
        }

        setComposeTenantLookup({
          isLoading: false,
          tenant,
          errorType: null,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const status =
          error && typeof error === 'object' && 'status' in error
            ? (error as { status?: unknown }).status
            : undefined;

        setComposeTenantLookup({
          isLoading: false,
          tenant: null,
          errorType: status === 404 ? 'outside_scope' : 'unknown',
        });
      }
    };

    void loadUnitTenant();

    return () => {
      isMounted = false;
    };
  }, [composeTarget, composeUnitId, showComposeModal]);

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const displayName = getOwnerConversationDisplayName(conversation, currentUser?.id);
      const matchesSearch =
        !query ||
        `${displayName} ${conversation.subject || ''} ${
          conversation.lastMessage?.content || ''
        } ${conversation.orgName || ''} ${conversation.buildingName || ''}`
          .toLowerCase()
          .includes(query);

      if (!matchesSearch) return false;

      if (activeFilter === 'unread') {
        return conversation.unreadCount > 0;
      }

      return true;
    });
  }, [activeFilter, conversations, currentUser?.id, searchQuery]);

  const handleCreateConversation = useCallback(async () => {
    if (!composeUnitId) {
      setErrorMessage('Select a unit before composing a new conversation.');
      return;
    }

    if (!composeMessage.trim()) {
      setErrorMessage('Add a message before sending.');
      return;
    }

    setIsSubmitting(true);
    try {
      const conversation =
        composeTarget === 'management'
          ? await ownerPortalApi.createManagementConversation({
              unitId: composeUnitId,
              subject: composeSubject.trim() || undefined,
              message: composeMessage.trim(),
            })
          : composeTenantLookup.tenant
            ? await ownerPortalApi.createTenantConversation({
                unitId: composeUnitId,
                tenantUserId: composeTenantLookup.tenant.tenantUserId,
                subject: composeSubject.trim() || undefined,
                message: composeMessage.trim(),
              })
            : null;

      if (!conversation) {
        setErrorMessage(
          'This unit does not currently have an active tenant for direct messaging.',
        );
        return;
      }

      setShowComposeModal(false);
      setComposeTarget('management');
      setComposeTenantLookup({
        isLoading: false,
        tenant: null,
        errorType: null,
      });
      setComposeSubject('');
      setComposeMessage('');
      await load(true);
      router.push({
        pathname: '/(owner)/messages/[conversationId]',
        params: { conversationId: conversation.id },
      });
    } catch (error) {
      if (await handleUnauthorized(error)) {
        return;
      }

      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to start the conversation.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    composeTarget,
    composeTenantLookup,
    composeMessage,
    composeSubject,
    composeUnitId,
    handleUnauthorized,
    load,
  ]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
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
            title="Messages"
            subtitle={`${conversationUnreadCount} unread conversations`}
            hasUnreadNotifications={notificationUnreadCount > 0}
            messagingUnreadCount={conversationUnreadCount}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            notificationRoute="/(owner)/notifications"
            textColor={P.text}
          />

          <View style={styles.actionCard}>
            <View style={styles.searchCard}>
              <Ionicons name="search-outline" size={18} color={P.soft} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search conversations"
                placeholderTextColor={P.soft}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
                onPress={() => setActiveFilter('all')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'all' && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'unread' && styles.filterChipActive]}
                onPress={() => setActiveFilter('unread')}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'unread' && styles.filterChipTextActive,
                  ]}
                >
                  Unread
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.composeButton}
                onPress={() => setShowComposeModal(true)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.composeButtonText}>Compose</Text>
              </TouchableOpacity>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color={P.dangerText} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {filteredConversations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={P.soft} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Start a conversation with management for any currently accessible unit.
              </Text>
            </View>
          ) : (
            filteredConversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                style={styles.conversationCard}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: '/(owner)/messages/[conversationId]',
                    params: { conversationId: conversation.id },
                  })
                }
              >
                <View style={styles.avatarWrap}>
                  <Ionicons name="chatbubble-ellipses-outline" size={20} color={P.primaryDark} />
                </View>
                <View style={styles.conversationBody}>
                  <View style={styles.conversationTopRow}>
                    <View style={styles.conversationTitleRow}>
                      <Ionicons name="mail-open-outline" size={14} color={P.soft} />
                      <Text style={styles.conversationTitle} numberOfLines={1}>
                        {getOwnerConversationDisplayName(conversation, currentUser?.id)}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>
                      {formatOwnerRelativeTime(
                        conversation.lastMessage?.createdAt || conversation.updatedAt,
                      )}
                    </Text>
                  </View>
                  <Text style={styles.conversationMeta} numberOfLines={1}>
                    {conversation.orgName || 'Portfolio'} •{' '}
                    {conversation.buildingName || 'Owner chat'}
                  </Text>
                  <Text style={styles.previewText} numberOfLines={2}>
                    {conversation.lastMessage?.content || conversation.subject || 'No messages yet'}
                  </Text>
                </View>
                {conversation.unreadCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

        <Modal visible={showComposeModal} animationType="slide" onRequestClose={() => setShowComposeModal(false)}>
          <SafeAreaView style={styles.modalContainer}>
            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Conversation</Text>
                <TouchableOpacity onPress={() => setShowComposeModal(false)}>
                  <Ionicons name="close" size={24} color={P.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalHelp}>
                Owners can start private conversations with management or with the
                current active tenant of a selected in-scope unit.
              </Text>

              <Text style={styles.modalLabel}>Target</Text>
              <View style={styles.targetRow}>
                <TouchableOpacity
                  style={[
                    styles.targetChip,
                    composeTarget === 'management' && styles.targetChipActive,
                  ]}
                  onPress={() => setComposeTarget('management')}
                >
                  <Text
                    style={[
                      styles.targetChipText,
                      composeTarget === 'management' && styles.targetChipTextActive,
                    ]}
                  >
                    Management
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.targetChip,
                    composeTarget === 'tenant' && styles.targetChipActive,
                  ]}
                  onPress={() => setComposeTarget('tenant')}
                >
                  <Text
                    style={[
                      styles.targetChipText,
                      composeTarget === 'tenant' && styles.targetChipTextActive,
                    ]}
                  >
                    Tenant
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>Accessible Unit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitRow}>
                {units.map((unit) => {
                  const active = composeUnitId === unit.unitId;
                  return (
                    <TouchableOpacity
                      key={unit.unitId}
                      style={[styles.unitChip, active && styles.unitChipActive]}
                      onPress={() => setComposeUnitId(unit.unitId)}
                    >
                      <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>
                        {unit.unitLabel} • {unit.buildingName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {composeTarget === 'tenant' ? (
                <View style={styles.tenantLookupCard}>
                  <Text style={styles.tenantLookupTitle}>Selected unit tenant</Text>
                  {composeTenantLookup.isLoading ? (
                    <View style={styles.tenantLookupRow}>
                      <ActivityIndicator size="small" color={P.primary} />
                      <Text style={styles.tenantLookupText}>Checking current active resident...</Text>
                    </View>
                  ) : composeTenantLookup.errorType === 'outside_scope' ? (
                    <Text style={styles.tenantLookupText}>
                      This unit is outside the current owner scope.
                    </Text>
                  ) : composeTenantLookup.errorType === 'unknown' ? (
                    <Text style={styles.tenantLookupText}>
                      Unable to load the current tenant right now.
                    </Text>
                  ) : composeTenantLookup.tenant ? (
                    <View style={styles.tenantLookupMeta}>
                      <Text style={styles.tenantLookupName}>
                        {composeTenantLookup.tenant.name}
                      </Text>
                      <Text style={styles.tenantLookupDetail}>
                        {composeTenantLookup.tenant.email || 'No email provided'}
                      </Text>
                      <Text style={styles.tenantLookupDetail}>
                        {composeTenantLookup.tenant.phone || 'No phone provided'}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.tenantLookupText}>
                      This unit is currently vacant. Tenant compose is disabled.
                    </Text>
                  )}
                </View>
              ) : null}

              <Text style={styles.modalLabel}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional subject"
                placeholderTextColor={P.soft}
                value={composeSubject}
                onChangeText={setComposeSubject}
              />

              <Text style={styles.modalLabel}>Message</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Write your opening message"
                placeholderTextColor={P.soft}
                value={composeMessage}
                onChangeText={setComposeMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={() => void handleCreateConversation()}
                disabled={
                  isSubmitting ||
                  (composeTarget === 'tenant' &&
                    (composeTenantLookup.isLoading || !composeTenantLookup.tenant))
                }
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Sending...' : 'Start Conversation'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
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
  actionCard: {
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
    marginBottom: 14,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: P.text,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  filterChip: {
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: P.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.text,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  composeButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: P.primary,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  composeButtonText: {
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
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
    marginBottom: 12,
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: P.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: P.primaryDark,
  },
  conversationBody: {
    flex: 1,
  },
  conversationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  conversationTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: P.text,
  },
  conversationMeta: {
    marginTop: 4,
    fontSize: 12,
    color: P.muted,
  },
  previewText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: P.text,
  },
  timeText: {
    fontSize: 11,
    color: P.soft,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: P.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: P.bg,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: P.text,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: P.soft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
    marginTop: 12,
  },
  modalHelp: {
    fontSize: 12,
    lineHeight: 18,
    color: P.muted,
    marginBottom: 4,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  targetChip: {
    borderRadius: 999,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  targetChipActive: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  targetChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.text,
  },
  targetChipTextActive: {
    color: '#FFFFFF',
  },
  unitRow: {
    gap: 10,
    paddingBottom: 4,
  },
  tenantLookupCard: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    padding: 14,
    gap: 10,
  },
  tenantLookupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: P.text,
  },
  tenantLookupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tenantLookupText: {
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
  },
  tenantLookupMeta: {
    gap: 4,
  },
  tenantLookupName: {
    fontSize: 15,
    fontWeight: '700',
    color: P.text,
  },
  tenantLookupDetail: {
    fontSize: 13,
    color: P.muted,
  },
  unitChip: {
    borderRadius: 16,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  unitChipActive: {
    backgroundColor: P.primarySoft,
    borderColor: P.primary,
  },
  unitChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: P.text,
  },
  unitChipTextActive: {
    color: P.primaryDark,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: P.text,
  },
  textArea: {
    minHeight: 130,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surface,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 14,
    color: P.text,
  },
  submitButton: {
    marginTop: 18,
    backgroundColor: P.primary,
    borderRadius: 18,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
