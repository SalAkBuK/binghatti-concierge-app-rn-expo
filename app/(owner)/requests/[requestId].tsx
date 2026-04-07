import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { useAuth } from '../../../lib/context/auth-context';
import { useOwnerUnreadSummary } from '../../../lib/hooks/owner/useOwnerUnreadSummary';
import { useOwnerUnauthorized } from '../../../lib/hooks/owner/useOwnerUnauthorized';
import { ownerPortalApi } from '../../../lib/services/api/owner-portal';
import type { OwnerPortfolioRequest, OwnerRequestComment } from '../../../lib/types';
import {
  formatOwnerDateTime,
  formatOwnerLabel,
  formatOwnerMoney,
  getOwnerApprovalTone,
  normalizeOwnerApprovalStatus,
  getOwnerRequestStatusTone,
  OWNER_PALETTE as P,
} from '../../../lib/utils/owner-portal';

export default function OwnerRequestDetailScreen() {
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
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
  const [request, setRequest] = useState<OwnerPortfolioRequest | null>(null);
  const [comments, setComments] = useState<OwnerRequestComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [approvalReasonDraft, setApprovalReasonDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (!requestId) {
        setErrorMessage('Request not found.');
        setIsLoading(false);
        return;
      }

      if (asRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [requestDetail, requestComments] = await Promise.all([
          ownerPortalApi.getRequest(requestId),
          ownerPortalApi.getRequestComments(requestId),
        ]);

        setRequest(requestDetail);
        setComments(requestComments);
        setErrorMessage(null);
        await refreshUnreadSummary();
      } catch (error) {
        if (await handleUnauthorized(error)) {
          return;
        }

        const status =
          error && typeof error === 'object' && 'status' in error
            ? (error as { status?: unknown }).status
            : undefined;

        setErrorMessage(
          status === 404
            ? 'This request is outside the current owner scope.'
            : error instanceof Error
              ? error.message
              : 'Unable to load request details.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [handleUnauthorized, refreshUnreadSummary, requestId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const approvalTone = useMemo(
    () => getOwnerApprovalTone(normalizeOwnerApprovalStatus(request?.ownerApproval?.status)),
    [request?.ownerApproval?.status],
  );
  const statusTone = useMemo(
    () => getOwnerRequestStatusTone(request?.status),
    [request?.status],
  );
  const approvalStatus = useMemo(
    () => normalizeOwnerApprovalStatus(request?.ownerApproval?.status),
    [request?.ownerApproval?.status],
  );

  const handleDecision = useCallback(
    async (decision: 'approve' | 'reject') => {
      if (!requestId || !request) return;

      if (decision === 'reject' && !approvalReasonDraft.trim()) {
        Alert.alert('Rejection reason required', 'Add a reason before rejecting this request.');
        return;
      }

      setIsDeciding(true);
      try {
        if (decision === 'approve') {
          await ownerPortalApi.approveRequest(
            requestId,
            approvalReasonDraft.trim() || undefined,
          );
        } else {
          await ownerPortalApi.rejectRequest(requestId, approvalReasonDraft.trim());
        }

        setApprovalReasonDraft('');
        await load();
        Alert.alert(
          decision === 'approve' ? 'Request approved' : 'Request rejected',
          decision === 'approve'
            ? 'Management can now continue this request.'
            : 'Your decision was saved for the management team.',
        );
      } catch (error) {
        if (await handleUnauthorized(error)) {
          return;
        }

        const status =
          error && typeof error === 'object' && 'status' in error
            ? (error as { status?: unknown }).status
            : undefined;

        Alert.alert(
          'Unable to submit decision',
          status === 404
            ? 'This request is outside the current owner scope.'
            : error instanceof Error
              ? error.message
              : 'Please try again.',
        );
      } finally {
        setIsDeciding(false);
      }
    },
    [approvalReasonDraft, handleUnauthorized, load, request, requestId],
  );

  const handleSubmitComment = useCallback(async () => {
    if (!requestId || !commentDraft.trim()) return;

    setIsSubmittingComment(true);
    try {
      await ownerPortalApi.addRequestComment(requestId, commentDraft.trim());
      setCommentDraft('');
      await load();
    } catch (error) {
      if (await handleUnauthorized(error)) {
        return;
      }

      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status?: unknown }).status
          : undefined;

      Alert.alert(
        'Unable to post comment',
        status === 404
          ? 'This request is outside the current owner scope.'
          : error instanceof Error
            ? error.message
            : 'Please try again.',
      );
    } finally {
      setIsSubmittingComment(false);
    }
  }, [commentDraft, handleUnauthorized, load, requestId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>{errorMessage || 'Request not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => void load(true)} />
            }
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <HeaderBar
              title="Request Detail"
              subtitle={`${requestCommentUnreadCount} unread shared comments`}
              showBackButton
              hasUnreadNotifications={notificationUnreadCount > 0}
              messagingUnreadCount={conversationUnreadCount}
              textColor={P.text}
              onBackPress={() => router.back()}
            />

            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroCopy}>
                  <Text style={styles.eyebrow}>Maintenance Request</Text>
                  <Text style={styles.title}>{request.title}</Text>
                  <Text style={styles.subtitle}>
                    {request.buildingName} • Unit {request.unit.label} • {request.orgName}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: statusTone.bg }]}>
                  <Text style={[styles.pillText, { color: statusTone.text }]}>
                    {formatOwnerLabel(request.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.description}>{request.description}</Text>

              <View style={styles.metaGrid}>
                <MetaField label="Priority" value={formatOwnerLabel(request.priority)} />
                <MetaField label="Type" value={formatOwnerLabel(request.type)} />
                <MetaField
                  label="Created"
                  value={formatOwnerDateTime(request.createdAt)}
                />
                <MetaField
                  label="Updated"
                  value={formatOwnerDateTime(request.updatedAt)}
                />
              </View>
            </View>

            <View style={styles.approvalCard}>
              <View style={styles.approvalHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Owner Approval</Text>
                  <Text style={styles.sectionTitle}>Decision status</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: approvalTone.bg }]}>
                  <Text style={[styles.pillText, { color: approvalTone.text }]}>
                    {formatOwnerLabel(approvalStatus)}
                  </Text>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <MetaField
                  label="Estimated Amount"
                  value={formatOwnerMoney(
                    request.ownerApproval?.estimatedAmount,
                    request.ownerApproval?.estimatedCurrency,
                  )}
                />
                <MetaField
                  label="Required Reason"
                  value={request.ownerApproval?.requiredReason || 'Not provided'}
                />
                <MetaField
                  label="Requested At"
                  value={formatOwnerDateTime(request.ownerApproval?.requestedAt)}
                />
                <MetaField
                  label="Decision"
                  value={request.ownerApproval?.reason || 'No decision note yet'}
                />
              </View>

              {approvalStatus === 'PENDING' ? (
                <>
                  <Text style={styles.pendingHelperText}>
                    This request is waiting for your decision. Approve to let management continue,
                    or reject with a reason.
                  </Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Optional approval note, or required rejection reason"
                    placeholderTextColor={P.soft}
                    value={approvalReasonDraft}
                    onChangeText={setApprovalReasonDraft}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.secondaryButton]}
                      activeOpacity={0.85}
                      onPress={() => void handleDecision('reject')}
                      disabled={isDeciding}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {isDeciding ? 'Saving...' : 'Reject'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      activeOpacity={0.9}
                      onPress={() => void handleDecision('approve')}
                      disabled={isDeciding}
                    >
                      <Text style={styles.primaryButtonText}>
                        {isDeciding ? 'Saving...' : 'Approve'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : null}
            </View>

            <View style={styles.commentsCard}>
              <View style={styles.approvalHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Shared Thread</Text>
                  <Text style={styles.sectionTitle}>Request comments</Text>
                </View>
                <Text style={styles.commentCountText}>{comments.length} comments</Text>
              </View>

              {comments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubble-outline" size={24} color={P.soft} />
                  <Text style={styles.emptyStateTitle}>No shared comments yet</Text>
                  <Text style={styles.emptyStateText}>
                    Owners can read and post only SHARED comments on in-scope requests.
                  </Text>
                </View>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.commentCard}>
                    <View style={styles.commentTopRow}>
                      <View style={styles.commentAuthorWrap}>
                        <Text style={styles.commentAuthor}>{comment.author.name}</Text>
                        <Text style={styles.commentAuthorMeta}>
                          {formatOwnerLabel(comment.author.type)}
                        </Text>
                      </View>
                      <Text style={styles.commentDate}>{formatOwnerDateTime(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentBody}>{comment.message}</Text>
                  </View>
                ))
              )}

              <TextInput
                style={styles.textArea}
                placeholder="Add a shared comment for management"
                placeholderTextColor={P.soft}
                value={commentDraft}
                onChangeText={setCommentDraft}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                activeOpacity={0.9}
                onPress={() => void handleSubmitComment()}
                disabled={isSubmittingComment || !commentDraft.trim()}
              >
                <Text style={styles.primaryButtonText}>
                  {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenEntrance>
  );
}

function MetaField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.metaField}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 40,
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
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    padding: 18,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: P.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '800',
    color: P.text,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
  },
  description: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 22,
    color: P.text,
  },
  metaGrid: {
    gap: 10,
    marginTop: 16,
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
  approvalCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    padding: 18,
    marginBottom: 14,
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontSize: 20,
    fontWeight: '800',
    color: P.text,
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
  textArea: {
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    marginTop: 14,
    fontSize: 14,
    color: P.text,
  },
  pendingHelperText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: P.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: P.dangerBg,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: P.dangerText,
  },
  commentsCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    padding: 18,
  },
  commentCountText: {
    fontSize: 12,
    color: P.muted,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyStateTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '700',
    color: P.text,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
    textAlign: 'center',
  },
  commentCard: {
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  commentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  commentAuthorWrap: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '700',
    color: P.text,
  },
  commentAuthorMeta: {
    marginTop: 2,
    fontSize: 11,
    color: P.soft,
  },
  commentDate: {
    fontSize: 11,
    color: P.soft,
  },
  commentBody: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: P.text,
  },
});
