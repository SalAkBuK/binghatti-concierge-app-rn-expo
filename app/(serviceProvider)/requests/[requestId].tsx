import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderBar } from '../../../components/ui/HeaderBar';
import { ScreenEntrance } from '../../../components/ui/ScreenEntrance';
import { useAuth } from '../../../lib/context/auth-context';
import { useProviderUnauthorized } from '../../../lib/hooks/provider/useProviderUnauthorized';
import { useProviderUnreadSummary } from '../../../lib/hooks/provider/useProviderUnreadSummary';
import { providerPortalApi } from '../../../lib/services/api/provider-portal';
import type {
  ProviderPortalEstimateInput,
  ProviderPortalRequest,
  ProviderPortalRequestComment,
  ProviderPortalWorkerStatusAction,
} from '../../../lib/types';
import { uploadFileToServer } from '../../../lib/utils/fileUpload';
import {
  PROVIDER_PALETTE as P,
  canProviderWorkerManageRequest,
  formatProviderDateTime,
  formatProviderLabel,
  formatProviderMoney,
  getAssignedProviderWorkerId,
  getProviderActorDisplayName,
  getProviderApprovalTone,
  getProviderAttachmentLabel,
  getProviderAttachmentUrl,
  getProviderRequestStatusTone,
  isProviderExecutionBlocked,
  isProviderRequestClosed,
  resolveProviderApprovalStatus,
} from '../../../lib/utils/provider-portal';
import {
  getRequestLifecycleBadges,
  type RequestLifecycleBadgeTone,
} from '../../../lib/utils/request-tenancy-context';

const UNAVAILABLE = 'This request is not visible through the current provider membership.';
const getStatusCode = (error: unknown): number | undefined =>
  error && typeof error === 'object' && 'status' in error
    ? typeof (error as { status?: unknown }).status === 'number'
      ? ((error as { status?: number }).status as number)
      : undefined
    : undefined;
const initialEstimate = (): ProviderPortalEstimateInput => ({
  estimatedAmount: 0,
  estimatedCurrency: 'AED',
  approvalRequiredReason: '',
  isEmergency: false,
  isLikeForLike: true,
  isUpgrade: false,
});

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

type LocalAttachmentAsset = {
  uri: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

const inferMimeType = (fileName: string, explicit?: string | null) => {
  if (explicit && explicit.trim()) {
    return explicit.trim();
  }

  const lower = fileName.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/octet-stream';
};

export default function ServiceProviderRequestDetailScreen() {
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const { currentUser } = useAuth();
  const handleUnauthorized = useProviderUnauthorized();
  const { requestCommentUnreadCount, refresh: refreshUnreadSummary } =
    useProviderUnreadSummary({ enabled: currentUser?.role === 'service_provider' });
  const [request, setRequest] = useState<ProviderPortalRequest | null>(null);
  const [comments, setComments] = useState<ProviderPortalRequestComment[]>([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [estimateDraft, setEstimateDraft] = useState(initialEstimate());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<'comment' | 'estimate' | 'attachment' | ProviderPortalWorkerStatusAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (asRefresh = false) => {
    if (!requestId) {
      setRequest(null);
      setComments([]);
      setError('Request not found.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    asRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [nextRequest, nextComments] = await Promise.all([
        providerPortalApi.getRequest(requestId),
        providerPortalApi.getRequestComments(requestId),
      ]);
      setRequest(nextRequest);
      setComments(nextComments);
      setError(null);
      await refreshUnreadSummary();
    } catch (nextError) {
      if (await handleUnauthorized(nextError)) return;
      setRequest(null);
      setComments([]);
      setError(getStatusCode(nextError) === 404 ? UNAVAILABLE : nextError instanceof Error ? nextError.message : 'Unable to load request details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [handleUnauthorized, refreshUnreadSummary, requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canManage = canProviderWorkerManageRequest(request, currentUser?.id ?? null);
  const isClosed = isProviderRequestClosed(request);
  const executionBlocked = isProviderExecutionBlocked(request);
  const approvalStatus = resolveProviderApprovalStatus(request);
  const approvalTone = getProviderApprovalTone(approvalStatus);
  const statusTone = getProviderRequestStatusTone(request?.status);
  const attachmentItems = useMemo(
    () =>
      (request?.attachments ?? [])
        .map((attachment, index) => {
          const url = getProviderAttachmentUrl(attachment);
          return url ? { key: `${index}-${url}`, label: getProviderAttachmentLabel(attachment, index), url } : null;
        })
        .filter((item): item is { key: string; label: string; url: string } => item != null),
    [request?.attachments],
  );
  const lifecycleBadges = useMemo(
    () => getRequestLifecycleBadges(request),
    [request],
  );
  const actionHint = !request
    ? ''
    : !canManage
      ? 'Only the assigned worker can comment, add attachments, submit estimates, or move status.'
      : isClosed
        ? 'This request is already closed.'
        : executionBlocked
          ? 'Execution is blocked by owner approval.'
          : 'Assigned worker actions are enabled.';

  const runMutation = useCallback(async (token: typeof busy, task: () => Promise<void>) => {
    setBusy(token);
    try {
      await task();
      await load();
    } catch (nextError) {
      if (await handleUnauthorized(nextError)) return;
      Alert.alert('Action failed', nextError instanceof Error ? nextError.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  }, [handleUnauthorized, load]);

  const uploadAttachmentAsset = useCallback(async (asset: LocalAttachmentAsset) => {
    if (!request) {
      throw new Error('Request not found.');
    }

    const fileInfo = await FileSystem.getInfoAsync(asset.uri);
    const resolvedSize =
      asset.sizeBytes != null && Number.isFinite(asset.sizeBytes)
        ? asset.sizeBytes
        : fileInfo.exists && typeof fileInfo.size === 'number'
          ? fileInfo.size
          : 0;

    if (!resolvedSize || resolvedSize <= 0) {
      throw new Error('Unable to determine file size for this attachment.');
    }

    const uploadedUrl = await uploadFileToServer(asset.uri);
    await providerPortalApi.addRequestAttachments(request.id, [
      {
        fileName: asset.fileName,
        mimeType: inferMimeType(asset.fileName, asset.mimeType),
        sizeBytes: resolvedSize,
        url: uploadedUrl,
      },
    ]);
  }, [request]);

  const pickFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo library access to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    await runMutation('attachment', async () => {
      await uploadAttachmentAsset({
        uri: asset.uri,
        fileName: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType,
        sizeBytes: typeof asset.fileSize === 'number' ? asset.fileSize : null,
      });
    });
  }, [runMutation, uploadAttachmentAsset]);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow camera access to take and attach photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    await runMutation('attachment', async () => {
      await uploadAttachmentAsset({
        uri: asset.uri,
        fileName: asset.fileName || `camera-${Date.now()}.jpg`,
        mimeType: asset.mimeType,
        sizeBytes: typeof asset.fileSize === 'number' ? asset.fileSize : null,
      });
    });
  }, [runMutation, uploadAttachmentAsset]);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    await runMutation('attachment', async () => {
      await uploadAttachmentAsset({
        uri: asset.uri,
        fileName: asset.name || `document-${Date.now()}`,
        mimeType: asset.mimeType,
        sizeBytes: typeof asset.size === 'number' ? asset.size : null,
      });
    });
  }, [runMutation, uploadAttachmentAsset]);

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={P.primary} /><Text style={styles.loadingText}>Loading request details...</Text></SafeAreaView>;
  }

  if (!request) {
    return (
      <ScreenEntrance>
        <SafeAreaView style={styles.container}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
          >
            <HeaderBar title="Request Detail" subtitle={`${requestCommentUnreadCount} unread shared comments`} showBackButton showNotifications={false} textColor={P.text} onBackPress={() => router.back()} />
            <View style={styles.card}><Text style={styles.titleSmall}>Request unavailable</Text><Text style={styles.body}>{error || 'Unable to load this provider request.'}</Text></View>
          </ScrollView>
        </SafeAreaView>
      </ScreenEntrance>
    );
  }

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
            <HeaderBar title="Request Detail" subtitle={`${requestCommentUnreadCount} unread shared comments`} showBackButton showNotifications={false} textColor={P.text} onBackPress={() => router.back()} />
            <View style={styles.card}>
              <View style={styles.rowBetween}><View style={styles.flex}><Text style={styles.eyebrow}>Provider Request</Text><Text style={styles.title}>{request.title}</Text><Text style={styles.meta}>{request.buildingName} | Unit {request.unit.label || 'N/A'}</Text></View><View style={[styles.pill, { backgroundColor: statusTone.bg }]}><Text style={[styles.pillText, { color: statusTone.text }]}>{formatProviderLabel(request.status)}</Text></View></View>
              <Text style={styles.body}>{request.description}</Text>
              {lifecycleBadges.length > 0 ? (
                <View style={styles.lifecycleBadgeRow}>
                  {lifecycleBadges.map((badge) => {
                    const tone = lifecycleBadgeTone(badge.tone);
                    return (
                      <View
                        key={`${badge.key}-${badge.label}`}
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
              <MetaField label="Assigned Worker" value={getProviderActorDisplayName(request.serviceProviderAssignedTo)} />
              <MetaField label="Assigned Worker ID" value={getAssignedProviderWorkerId(request) || 'Not assigned'} mono />
              <MetaField label="Approval" value={formatProviderLabel(approvalStatus)} />
              <View style={[styles.inlineBanner, { backgroundColor: approvalTone.bg }]}><Text style={[styles.inlineBannerText, { color: approvalTone.text }]}>{actionHint}</Text></View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Status Actions</Text>
              <View style={styles.row}>
                <ActionButton label={busy === 'IN_PROGRESS' ? 'Saving...' : 'Mark In Progress'} tone="secondary" disabled={!canManage || executionBlocked || isClosed || request.status === 'IN_PROGRESS' || busy != null} onPress={() => void runMutation('IN_PROGRESS', async () => { await providerPortalApi.updateRequestStatus(request.id, 'IN_PROGRESS'); })} />
                <ActionButton label={busy === 'COMPLETED' ? 'Saving...' : 'Mark Completed'} disabled={!canManage || executionBlocked || isClosed || busy != null} onPress={() => void runMutation('COMPLETED', async () => { await providerPortalApi.updateRequestStatus(request.id, 'COMPLETED'); })} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Estimate</Text>
              <MetaField label="Current Estimate" value={formatProviderMoney(request.estimate?.estimatedAmount, request.estimate?.estimatedCurrency)} />
              <Input label="Estimated Amount" value={String(estimateDraft.estimatedAmount || '')} onChangeText={(value) => setEstimateDraft((prev) => ({ ...prev, estimatedAmount: Number(value || '0') }))} keyboardType="decimal-pad" />
              <Input label="Currency" value={estimateDraft.estimatedCurrency} onChangeText={(value) => setEstimateDraft((prev) => ({ ...prev, estimatedCurrency: value }))} autoCapitalize="characters" />
              <Input label="Reason" value={estimateDraft.approvalRequiredReason} onChangeText={(value) => setEstimateDraft((prev) => ({ ...prev, approvalRequiredReason: value }))} multiline />
              <Toggle label="Emergency" value={estimateDraft.isEmergency} onPress={() => setEstimateDraft((prev) => ({ ...prev, isEmergency: !prev.isEmergency }))} />
              <Toggle label="Like For Like" value={estimateDraft.isLikeForLike} onPress={() => setEstimateDraft((prev) => ({ ...prev, isLikeForLike: !prev.isLikeForLike }))} />
              <Toggle label="Upgrade" value={estimateDraft.isUpgrade} onPress={() => setEstimateDraft((prev) => ({ ...prev, isUpgrade: !prev.isUpgrade }))} />
              <ActionButton label={busy === 'estimate' ? 'Submitting...' : 'Submit Estimate'} disabled={!canManage || busy != null} onPress={() => void runMutation('estimate', async () => { if (!estimateDraft.approvalRequiredReason.trim() || estimateDraft.estimatedAmount <= 0) throw new Error('Enter a valid amount and reason.'); await providerPortalApi.submitEstimate(request.id, { ...estimateDraft, estimatedCurrency: estimateDraft.estimatedCurrency.trim().toUpperCase(), approvalRequiredReason: estimateDraft.approvalRequiredReason.trim() }); })} />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Attachments</Text>
              <Text style={styles.note}>
                Add a site photo or document. The app uploads the file first, then sends the attachment metadata automatically.
              </Text>
              <View style={styles.attachmentActionList}>
                <AttachmentSourceButton
                  icon="camera-outline"
                  label={busy === 'attachment' ? 'Uploading...' : 'Take Photo'}
                  disabled={!canManage || isClosed || busy != null}
                  onPress={() => void takePhoto()}
                />
                <AttachmentSourceButton
                  icon="image-outline"
                  label={busy === 'attachment' ? 'Uploading...' : 'Choose Photo'}
                  disabled={!canManage || isClosed || busy != null}
                  onPress={() => void pickFromLibrary()}
                />
                <AttachmentSourceButton
                  icon="document-outline"
                  label={busy === 'attachment' ? 'Uploading...' : 'Choose Document'}
                  disabled={!canManage || isClosed || busy != null}
                  onPress={() => void pickDocument()}
                />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Current Attachments</Text>
              {attachmentItems.length === 0 ? <Text style={styles.note}>No attachments are currently attached to this request.</Text> : attachmentItems.map((attachment) => (
                <TouchableOpacity key={attachment.key} style={styles.linkRow} activeOpacity={0.85} onPress={() => void Linking.openURL(attachment.url).catch((nextError) => Alert.alert('Unable to open attachment', nextError instanceof Error ? nextError.message : 'Please try again.'))}>
                  <Ionicons name="document-outline" size={16} color={P.primary} />
                  <View style={styles.flex}><Text style={styles.linkTitle}>{attachment.label}</Text><Text style={styles.linkMeta}>{attachment.url}</Text></View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Shared Comments</Text>
              {comments.length === 0 ? <Text style={styles.note}>Only shared provider-visible comments appear here.</Text> : comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.rowBetween}><Text style={styles.commentAuthor}>{getProviderActorDisplayName(comment.author)}</Text><Text style={styles.commentMeta}>{formatProviderDateTime(comment.createdAt)}</Text></View>
                  <Text style={styles.commentMeta}>{formatProviderLabel(comment.author?.type || comment.author?.role)}</Text>
                  <Text style={styles.commentBody}>{comment.message}</Text>
                </View>
              ))}
              <Input label="Add Comment" value={commentDraft} onChangeText={setCommentDraft} multiline editable={canManage} placeholder={canManage ? 'Add a shared comment' : 'Only the assigned worker can post comments'} />
              <ActionButton label={busy === 'comment' ? 'Posting...' : 'Post Comment'} disabled={!canManage || !commentDraft.trim() || busy != null} onPress={() => void runMutation('comment', async () => { await providerPortalApi.addRequestComment(request.id, commentDraft.trim()); setCommentDraft(''); })} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenEntrance>
  );
}

function MetaField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.metaField}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, multiline, style, ...rest } = props;
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.metaLabel}>{label}</Text>
      <TextInput
        {...rest}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        placeholderTextColor={P.soft}
        style={[styles.input, multiline && styles.inputArea, style]}
      />
    </View>
  );
}

function Toggle({ label, value, onPress }: { label: string; value: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.toggle} activeOpacity={0.85} onPress={onPress}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.togglePill, value && styles.togglePillActive]}><Text style={[styles.togglePillText, value && styles.togglePillTextActive]}>{value ? 'Yes' : 'No'}</Text></View>
    </TouchableOpacity>
  );
}

function ActionButton({ label, disabled, onPress, tone = 'primary' }: { label: string; disabled?: boolean; onPress: () => void; tone?: 'primary' | 'secondary' }) {
  return (
    <TouchableOpacity style={[styles.button, tone === 'secondary' ? styles.buttonSecondary : styles.buttonPrimary, disabled && styles.buttonDisabled]} activeOpacity={0.9} disabled={disabled} onPress={onPress}>
      <Text style={[styles.buttonText, tone === 'secondary' && styles.buttonTextSecondary]}>{label}</Text>
    </TouchableOpacity>
  );
}

function AttachmentSourceButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.attachmentSourceButton, disabled && styles.buttonDisabled]}
      activeOpacity={0.9}
      disabled={disabled}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={P.primary} />
      <Text style={styles.attachmentSourceButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  center: { flex: 1, backgroundColor: P.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  content: { paddingBottom: 36 },
  card: { backgroundColor: P.surface, borderRadius: 22, borderWidth: 1, borderColor: P.border, padding: 16, marginBottom: 12 },
  loadingText: { fontSize: 14, color: P.muted },
  titleSmall: { fontSize: 20, fontWeight: '800', color: P.text },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: P.text, marginBottom: 10 },
  eyebrow: { fontSize: 11, fontWeight: '700', color: P.primary, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 6 },
  title: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: P.text },
  meta: { marginTop: 6, fontSize: 12, color: P.muted },
  body: { marginTop: 12, fontSize: 13, lineHeight: 20, color: P.text },
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
  note: { fontSize: 13, lineHeight: 20, color: P.muted },
  row: { flexDirection: 'row', gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { fontSize: 11, fontWeight: '800' },
  inlineBanner: { marginTop: 12, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  inlineBannerText: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  metaField: { marginTop: 10, backgroundColor: P.surfaceLow, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  metaLabel: { fontSize: 11, fontWeight: '700', color: P.soft, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 4 },
  metaValue: { fontSize: 14, color: P.text, fontWeight: '600' },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12 },
  inputBlock: { marginTop: 12 },
  input: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: P.border, backgroundColor: P.surfaceLow, paddingHorizontal: 14, fontSize: 14, color: P.text },
  inputArea: { minHeight: 104, paddingTop: 14, paddingBottom: 14 },
  toggle: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: P.surfaceLow, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: P.text },
  togglePill: { borderRadius: 999, backgroundColor: P.surface, paddingHorizontal: 10, paddingVertical: 6 },
  togglePillActive: { backgroundColor: P.primary },
  togglePillText: { fontSize: 12, fontWeight: '700', color: P.muted },
  togglePillTextActive: { color: '#FFFFFF' },
  button: { minHeight: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 14, flex: 1 },
  buttonPrimary: { backgroundColor: P.primary },
  buttonSecondary: { backgroundColor: P.accent },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  buttonTextSecondary: { color: P.accentText },
  attachmentActionList: { marginTop: 12, gap: 10 },
  attachmentSourceButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachmentSourceButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: P.text,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: P.border },
  linkTitle: { fontSize: 14, fontWeight: '700', color: P.text },
  linkMeta: { marginTop: 3, fontSize: 11, color: P.soft },
  commentCard: { marginTop: 10, backgroundColor: P.surfaceLow, borderRadius: 16, padding: 12 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: P.text },
  commentMeta: { fontSize: 11, color: P.soft },
  commentBody: { marginTop: 8, fontSize: 13, lineHeight: 19, color: P.text },
});
