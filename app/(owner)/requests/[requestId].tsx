import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  getOwnerRequestStatusTone,
  resolveOwnerRequestApprovalStatus,
  OWNER_PALETTE as P,
} from '../../../lib/utils/owner-portal';
import {
  getOwnerRequestAttachmentLabel,
  getOwnerRequestAttachmentUrl,
} from '../../../lib/utils/owner-request-attachments';
import {
  getOwnerCurrentOccupantName,
  getOwnerLeaseSummary,
  getOwnerPrimaryLifecycleBadge,
  getOwnerRequesterName,
  getOwnerSecondaryLifecycleBadge,
  getOwnerTenancySummary,
  getOwnerTenancyUnresolvedMessage,
  type OwnerTenancyBadgeTone,
} from '../../../lib/utils/owner-request-tenancy-display';

type RequestErrorType = 'outside_scope' | 'unknown' | null;

const REQUEST_SCOPE_UNAVAILABLE_MESSAGE =
  'This request is no longer available or is outside the current owner scope.';

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
};

const formatActorSummary = (
  actor?: OwnerPortfolioRequest['createdBy'] | OwnerPortfolioRequest['assignedTo'],
): string => {
  if (!actor) {
    return 'Not provided';
  }

  return actor.name || actor.email || 'Not provided';
};

const resolveKnownUserLabel = ({
  userId,
  currentUserId,
  currentUserName,
  createdBy,
  assignedTo,
}: {
  userId?: string | null;
  currentUserId?: string | null;
  currentUserName?: string | null;
  createdBy?: OwnerPortfolioRequest['createdBy'] | null;
  assignedTo?: OwnerPortfolioRequest['assignedTo'] | null;
}): string | null => {
  if (!userId) {
    return null;
  }

  if (currentUserId && userId === currentUserId && currentUserName?.trim()) {
    return currentUserName.trim();
  }

  if (createdBy?.id === userId) {
    return createdBy.name || createdBy.email || null;
  }

  if (assignedTo?.id === userId) {
    return assignedTo.name || assignedTo.email || null;
  }

  return null;
};

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

export default function OwnerRequestDetailScreen() {
  const { requestId, returnTo } = useLocalSearchParams<{
    requestId?: string;
    returnTo?: string;
  }>();
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
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
  const [errorType, setErrorType] = useState<RequestErrorType>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(
    async (asRefresh = false) => {
      if (!requestId) {
        setRequest(null);
        setComments([]);
        setErrorType('unknown');
        setErrorMessage('Request not found.');
        setIsLoading(false);
        setIsRefreshing(false);
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
        setErrorType(null);
        setErrorMessage(null);
        await refreshUnreadSummary();
      } catch (error) {
        if (await handleUnauthorized(error)) {
          return;
        }

        const status = getStatusCode(error);
        const outsideScope = status === 404;

        setRequest(null);
        setComments([]);
        setErrorType(outsideScope ? 'outside_scope' : 'unknown');
        setErrorMessage(
          outsideScope
            ? REQUEST_SCOPE_UNAVAILABLE_MESSAGE
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
    () => getOwnerApprovalTone(resolveOwnerRequestApprovalStatus(request)),
    [request],
  );
  const statusTone = useMemo(
    () => getOwnerRequestStatusTone(request?.status),
    [request?.status],
  );
  const approvalStatus = useMemo(
    () => resolveOwnerRequestApprovalStatus(request),
    [request],
  );
  const requestedByLabel = useMemo(
    () =>
      resolveKnownUserLabel({
        userId: request?.ownerApproval?.requestedByUserId,
        currentUserId: currentUser?.id,
        currentUserName: currentUser?.name ?? currentUser?.fullName,
        createdBy: request?.createdBy,
        assignedTo: request?.assignedTo,
      }),
    [
      currentUser?.fullName,
      currentUser?.id,
      currentUser?.name,
      request?.assignedTo,
      request?.createdBy,
      request?.ownerApproval?.requestedByUserId,
    ],
  );
  const decidedByOwnerLabel = useMemo(
    () =>
      resolveKnownUserLabel({
        userId: request?.ownerApproval?.decidedByOwnerUserId,
        currentUserId: currentUser?.id,
        currentUserName: currentUser?.name ?? currentUser?.fullName,
        createdBy: request?.createdBy,
        assignedTo: request?.assignedTo,
      }),
    [
      currentUser?.fullName,
      currentUser?.id,
      currentUser?.name,
      request?.assignedTo,
      request?.createdBy,
      request?.ownerApproval?.decidedByOwnerUserId,
    ],
  );
  const overriddenByLabel = useMemo(
    () =>
      resolveKnownUserLabel({
        userId: request?.ownerApproval?.overriddenByUserId,
        currentUserId: currentUser?.id,
        currentUserName: currentUser?.name ?? currentUser?.fullName,
        createdBy: request?.createdBy,
        assignedTo: request?.assignedTo,
      }),
    [
      currentUser?.fullName,
      currentUser?.id,
      currentUser?.name,
      request?.assignedTo,
      request?.createdBy,
      request?.ownerApproval?.overriddenByUserId,
    ],
  );
  const attachmentItems = useMemo(
    () =>
      (request?.attachments ?? [])
        .map((attachment, index) => {
          const url = getOwnerRequestAttachmentUrl(attachment);
          if (!url) {
            return null;
          }

          return {
            key: `${index}-${url}`,
            label: getOwnerRequestAttachmentLabel(attachment, index),
            url,
          };
        })
        .filter((attachment): attachment is { key: string; label: string; url: string } =>
          attachment != null,
        ),
    [request?.attachments],
  );
  const requesterName = useMemo(() => getOwnerRequesterName(request), [request]);
  const currentOccupantName = useMemo(
    () => getOwnerCurrentOccupantName(request),
    [request],
  );
  const requestFromLabel = useMemo(() => getOwnerTenancySummary(request), [request]);
  const leaseSummary = useMemo(() => getOwnerLeaseSummary(request), [request]);
  const tenancyUnresolvedMessage = useMemo(
    () => getOwnerTenancyUnresolvedMessage(request),
    [request],
  );
  const primaryLifecycleBadge = useMemo(
    () => getOwnerPrimaryLifecycleBadge(request),
    [request],
  );
  const secondaryLifecycleBadge = useMemo(
    () => getOwnerSecondaryLifecycleBadge(request),
    [request],
  );

  const handleBackNavigation = useCallback(() => {
    const fallbackRoute = '/(owner)/requests';
    const destination =
      typeof returnTo === 'string' && returnTo.trim().length > 0
        ? returnTo
        : fallbackRoute;

    router.replace(destination as any);
  }, [returnTo]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          handleBackNavigation();
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [handleBackNavigation]),
  );

  const handleOpenAttachment = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert(
        'Unable to open attachment',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }, []);

  const handleDecision = useCallback(
    async (decision: 'approve' | 'reject') => {
      if (!requestId || !request) {
        return;
      }

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

        if (getStatusCode(error) === 404) {
          setRequest(null);
          setComments([]);
          setErrorType('outside_scope');
          setErrorMessage(REQUEST_SCOPE_UNAVAILABLE_MESSAGE);
          return;
        }

        Alert.alert(
          'Unable to submit decision',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setIsDeciding(false);
      }
    },
    [approvalReasonDraft, handleUnauthorized, load, request, requestId],
  );

  const handleSubmitComment = useCallback(async () => {
    if (!requestId || !commentDraft.trim()) {
      return;
    }

    setIsSubmittingComment(true);
    try {
      await ownerPortalApi.addRequestComment(requestId, commentDraft.trim());
      setCommentDraft('');
      await load();
    } catch (error) {
      if (await handleUnauthorized(error)) {
        return;
      }

      if (getStatusCode(error) === 404) {
        setRequest(null);
        setComments([]);
        setErrorType('outside_scope');
        setErrorMessage(REQUEST_SCOPE_UNAVAILABLE_MESSAGE);
        return;
      }

      Alert.alert(
        'Unable to post comment',
        error instanceof Error ? error.message : 'Please try again.',
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
      <ScreenEntrance>
        <SafeAreaView style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => void load(true)} />
            }
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: 48 + Math.max(insets.bottom, 16) + tabBarHeight,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <HeaderBar
              title="Request Detail"
              subtitle={`${requestCommentUnreadCount} unread shared comments`}
              showBackButton
              hasUnreadNotifications={notificationUnreadCount > 0}
              messagingUnreadCount={conversationUnreadCount}
              notificationRoute="/(modals)/owner-alerts"
              textColor={P.text}
              onBackPress={handleBackNavigation}
            />

            <View style={styles.unavailableCard}>
              <View style={styles.unavailableIconWrap}>
                <Ionicons
                  name={
                    errorType === 'outside_scope'
                      ? 'alert-circle-outline'
                      : 'document-text-outline'
                  }
                  size={24}
                  color={errorType === 'outside_scope' ? P.warningText : P.primary}
                />
              </View>
              <Text style={styles.unavailableTitle}>
                {errorType === 'outside_scope'
                  ? 'Request no longer available'
                  : 'Request not found'}
              </Text>
              <Text style={styles.unavailableText}>
                {errorMessage || 'Unable to load this owner request.'}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ScreenEntrance>
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
              notificationRoute="/(modals)/owner-alerts"
              textColor={P.text}
              onBackPress={handleBackNavigation}
            />

            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroCopy}>
                  <Text style={styles.eyebrow}>Maintenance Request</Text>
                  <Text style={styles.title}>{request.title || 'Maintenance request'}</Text>
                  <Text style={styles.subtitle}>
                    {request.buildingName || 'Unknown building'} | Unit{' '}
                    {request.unit?.label || 'Not provided'} | {request.orgName || 'Owner scope'}
                  </Text>
                </View>
                <View style={[styles.pill, { backgroundColor: statusTone.bg }]}>
                  <Text style={[styles.pillText, { color: statusTone.text }]}>
                    {formatOwnerLabel(request.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.description}>
                {request.description || 'No description provided.'}
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
                          backgroundColor: lifecycleBadgeTone(secondaryLifecycleBadge.tone).bg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.lifecycleBadgeText,
                          {
                            color: lifecycleBadgeTone(secondaryLifecycleBadge.tone).text,
                          },
                        ]}
                      >
                        {secondaryLifecycleBadge.label}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.metaGrid}>
                <MetaField label="Building" value={request.buildingName || 'Not provided'} />
                <MetaField label="Unit" value={request.unit?.label || 'Not provided'} />
                <MetaField label="Status" value={formatOwnerLabel(request.status)} />
                <MetaField label="Priority" value={formatOwnerLabel(request.priority)} />
                <MetaField label="Type" value={formatOwnerLabel(request.type)} />
                <MetaField label="Created" value={formatOwnerDateTime(request.createdAt)} />
                <MetaField label="Updated" value={formatOwnerDateTime(request.updatedAt)} />
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.approvalHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Tenancy Context</Text>
                  <Text style={styles.sectionTitle}>Resident linkage</Text>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <MetaField label="Request From" value={requestFromLabel} />
                <MetaField label="Requester" value={requesterName} />
                <MetaField
                  label="Current Occupant"
                  value={currentOccupantName || 'None'}
                />
                <MetaField label="Lease" value={leaseSummary} />
              </View>

              {tenancyUnresolvedMessage ? (
                <Text style={styles.tenancyContextNote}>{tenancyUnresolvedMessage}</Text>
              ) : null}
            </View>

            <View style={styles.infoCard}>
              <View style={styles.approvalHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Request Actors</Text>
                  <Text style={styles.sectionTitle}>People on this request</Text>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <ActorField
                  label="Created By"
                  actor={request.createdBy}
                  emptyValue="Not provided"
                />
                <ActorField
                  label="Assigned To"
                  actor={request.assignedTo}
                  emptyValue="Not assigned"
                />
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.approvalHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>Attachments</Text>
                  <Text style={styles.sectionTitle}>Request files</Text>
                </View>
                <Text style={styles.commentCountText}>{attachmentItems.length} available</Text>
              </View>

              {attachmentItems.length === 0 ? (
                <Text style={styles.emptyInlineText}>
                  No attachments were shared with this request.
                </Text>
              ) : (
                attachmentItems.map((attachment) => (
                  <TouchableOpacity
                    key={attachment.key}
                    style={styles.attachmentRow}
                    activeOpacity={0.88}
                    onPress={() => void handleOpenAttachment(attachment.url)}
                  >
                    <View style={styles.attachmentIconWrap}>
                      <Ionicons name="document-outline" size={18} color={P.primary} />
                    </View>
                    <View style={styles.attachmentCopy}>
                      <Text style={styles.attachmentTitle} numberOfLines={1}>
                        {attachment.label}
                      </Text>
                      <Text style={styles.attachmentUrl} numberOfLines={1}>
                        {attachment.url}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={18} color={P.soft} />
                  </TouchableOpacity>
                ))
              )}
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
                <MetaField label="Status" value={formatOwnerLabel(approvalStatus)} />
                <MetaField
                  label="Estimated Amount"
                  value={formatOwnerMoney(
                    request.ownerApproval?.estimatedAmount,
                    request.ownerApproval?.estimatedCurrency,
                  )}
                />
                <MetaField
                  label="Estimated Currency"
                  value={request.ownerApproval?.estimatedCurrency || 'Not provided'}
                />
                <MetaField
                  label="Required Reason"
                  value={request.ownerApproval?.requiredReason || 'Not provided'}
                />
                <MetaField
                  label="Requested At"
                  value={formatOwnerDateTime(request.ownerApproval?.requestedAt)}
                />
                {requestedByLabel ? (
                  <MetaField label="Requested By" value={requestedByLabel} />
                ) : null}
                <MetaField
                  label="Deadline"
                  value={formatOwnerDateTime(request.ownerApproval?.deadlineAt)}
                />
                <MetaField
                  label="Decided At"
                  value={formatOwnerDateTime(request.ownerApproval?.decidedAt)}
                />
                {decidedByOwnerLabel ? (
                  <MetaField label="Decided By" value={decidedByOwnerLabel} />
                ) : null}
                <MetaField
                  label="Decision Note"
                  value={request.ownerApproval?.reason || 'No decision note yet'}
                />
                <MetaField
                  label="Decision Source"
                  value={formatOwnerLabel(request.ownerApproval?.decisionSource)}
                />
                <MetaField
                  label="Override Reason"
                  value={request.ownerApproval?.overrideReason || 'Not provided'}
                />
                {overriddenByLabel ? (
                  <MetaField label="Overridden By" value={overriddenByLabel} />
                ) : null}
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
              ) : (
                <Text style={styles.emptyInlineText}>
                  This approval is no longer actionable from the owner portal.
                </Text>
              )}
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
                    Owners can read and post only shared comments on in-scope requests.
                  </Text>
                </View>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.commentCard}>
                    <View style={styles.commentTopRow}>
                      <View style={styles.commentAuthorWrap}>
                        <Text style={styles.commentAuthor}>
                          {comment.author?.name || 'Unknown author'}
                        </Text>
                        <Text style={styles.commentAuthorMeta}>
                          {formatOwnerLabel(comment.author?.type)}
                        </Text>
                      </View>
                      <Text style={styles.commentDate}>
                        {formatOwnerDateTime(comment.createdAt)}
                      </Text>
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
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.metaField}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, mono && styles.metaValueMono]}>{value}</Text>
    </View>
  );
}

function ActorField({
  label,
  actor,
  emptyValue,
}: {
  label: string;
  actor?: OwnerPortfolioRequest['createdBy'] | OwnerPortfolioRequest['assignedTo'] | null;
  emptyValue: string;
}) {
  return (
    <View style={styles.metaField}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{actor ? formatActorSummary(actor) : emptyValue}</Text>
      {actor?.email ? <Text style={styles.metaSubValue}>{actor.email}</Text> : null}
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
  unavailableCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: 'center',
  },
  unavailableIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: P.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '800',
    color: P.text,
  },
  unavailableText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
    textAlign: 'center',
  },
  heroCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    padding: 18,
    marginBottom: 14,
  },
  infoCard: {
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
  lifecycleBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
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
  metaSubValue: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: P.muted,
  },
  metaValueMono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
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
  emptyInlineText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
  },
  tenancyContextNote: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: P.border,
  },
  attachmentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: P.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentCopy: {
    flex: 1,
  },
  attachmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: P.text,
  },
  attachmentUrl: {
    marginTop: 4,
    fontSize: 12,
    color: P.muted,
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
    marginTop: 14,
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
    marginBottom: 8,
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
