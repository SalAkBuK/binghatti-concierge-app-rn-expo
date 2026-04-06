import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { Request, RequestComment, RequestStatus } from '../../../lib/types';
import { formatDateTime } from '../../../lib/utils/helpers';
import type {
  ManagementRequestDetailTab,
  RequestDetailAttachment,
} from '../_hooks/useManagementRequestDetails';

type ManagementRequestDetailModalProps = {
  detailTab: ManagementRequestDetailTab;
  isRequestClosed: boolean;
  isRequestDetailLoading: boolean;
  isSendingMessage: boolean;
  newMessage: string;
  onAddMessage: () => void;
  onCancelRequest: () => void;
  onClose: () => void;
  onMarkAsCompleted: () => void;
  onOpenAssignModal: () => void;
  requestAttachments: RequestDetailAttachment[];
  requestComments: RequestComment[];
  selectedRequest: Request | null;
  setDetailTab: (tab: ManagementRequestDetailTab) => void;
  setNewMessage: (message: string) => void;
};

const isImageAttachment = (attachment: RequestDetailAttachment) => {
  const name = (attachment.fileName || attachment.fileUrl || '').toLowerCase();
  if (attachment.contentType?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
};

const isImageUri = (uri: string) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(uri);

const formatStatusLabel = (status: RequestStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');

const renderStatusBadge = (status: RequestStatus) => {
  const palette = {
    pending: { bg: '#FEF3C7', text: '#92400E' },
    assigned: { bg: '#DBEAFE', text: '#1D4ED8' },
    'in-progress': { bg: '#DBEAFE', text: '#1D4ED8' },
    'on-hold': { bg: '#FED7AA', text: '#9A3412' },
    completed: { bg: '#DCFCE7', text: '#047857' },
    cancelled: { bg: '#FEE2E2', text: '#DC2626' },
  };
  const colors = palette[status] ?? palette.pending;

  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
};

export const ManagementRequestDetailModal = ({
  detailTab,
  isRequestClosed,
  isRequestDetailLoading,
  isSendingMessage,
  newMessage,
  onAddMessage,
  onCancelRequest,
  onClose,
  onMarkAsCompleted,
  onOpenAssignModal,
  requestAttachments,
  requestComments,
  selectedRequest,
  setDetailTab,
  setNewMessage,
}: ManagementRequestDetailModalProps) => {
  return (
    <Modal
      visible={!!selectedRequest}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Request Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.tabBar}>
          {(['overview', 'messages'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, detailTab === tab && styles.tabActive]}
              onPress={() => setDetailTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  detailTab === tab && styles.tabTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          {isRequestDetailLoading ? (
            <View style={styles.detailLoadingRow}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.detailLoadingText}>Syncing latest details...</Text>
            </View>
          ) : null}

          {detailTab === 'overview' && selectedRequest ? (
            <View style={styles.overviewSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Title:</Text>
                <Text style={styles.detailValue}>{selectedRequest.title}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.detailValue}>
                  {selectedRequest.description}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View>{renderStatusBadge(selectedRequest.status)}</View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Priority:</Text>
                <Text style={styles.detailValue}>{selectedRequest.priority}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{selectedRequest.type}</Text>
              </View>
              {selectedRequest.assignedTo ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Assigned To:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest.assignedTo}
                  </Text>
                </View>
              ) : null}
              {selectedRequest.apartment ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Unit:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest.apartment}
                  </Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created:</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(selectedRequest.createdAt)}
                </Text>
              </View>
              {(selectedRequest as any).completedAt ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Completed:</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime((selectedRequest as any).completedAt)}
                  </Text>
                </View>
              ) : null}
              {selectedRequest.slaDueAt ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SLA Due:</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedRequest.slaDueAt)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.assignmentSection}>
                <View style={styles.assignmentHeaderRow}>
                  <Text style={styles.assignmentTitle}>Assignment Status</Text>
                  {selectedRequest.assignedTo ? (
                    <View style={styles.jobStatusBadge}>
                      <Text style={styles.jobStatusText}>
                        {selectedRequest.status.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {selectedRequest.assignedTo ? (
                  <>
                    <View style={styles.jobDetailsCard}>
                      <View style={styles.jobDetailRow}>
                        <Text style={styles.jobDetailLabel}>Assigned To</Text>
                        <Text style={styles.jobDetailValue}>
                          {selectedRequest.assignedTo}
                        </Text>
                      </View>
                      <View style={styles.jobDetailRow}>
                        <Text style={styles.jobDetailLabel}>Status</Text>
                        <Text style={styles.jobDetailValue}>
                          {formatStatusLabel(selectedRequest.status)}
                        </Text>
                      </View>
                    </View>

                    {(selectedRequest.status === 'in-progress' ||
                      (selectedRequest.status as string) === 'assigned') ? (
                      <>
                        <View style={styles.actionButtonsRow}>
                          <TouchableOpacity
                            style={styles.reassignButton}
                            onPress={onOpenAssignModal}
                          >
                            <Ionicons
                              name="swap-horizontal"
                              size={18}
                              color="#2563EB"
                            />
                            <Text style={styles.reassignButtonText}>
                              Re-assign
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.completeButton}
                            onPress={onMarkAsCompleted}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={18}
                              color="#FFFFFF"
                            />
                            <Text style={styles.completeButtonText}>
                              Mark Completed
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={onCancelRequest}
                        >
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color="#DC2626"
                          />
                          <Text style={styles.cancelButtonText}>
                            Cancel Request
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </>
                ) : selectedRequest.status === 'completed' ? (
                  <View style={styles.noJobCard}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={24}
                      color="#16A34A"
                    />
                    <Text style={styles.noJobText}>Completed</Text>
                    <Text style={styles.noJobHint}>Request was completed</Text>
                  </View>
                ) : (
                  <View style={styles.noJobCard}>
                    <Ionicons
                      name="construct-outline"
                      size={24}
                      color="#9CA3AF"
                    />
                    <Text style={styles.noJobText}>Request not yet assigned</Text>
                    {selectedRequest.status === 'pending' ? (
                      <>
                        <Text style={styles.noJobHint}>
                          Assign this request to maintenance staff or a service
                          provider
                        </Text>
                        <TouchableOpacity
                          style={styles.assignButton}
                          onPress={onOpenAssignModal}
                        >
                          <Ionicons
                            name="person-add"
                            size={18}
                            color="#FFFFFF"
                          />
                          <Text style={styles.assignButtonText}>
                            Assign Request
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={onCancelRequest}
                        >
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color="#DC2626"
                          />
                          <Text style={styles.cancelButtonText}>
                            Cancel Request
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : selectedRequest.status === 'on-hold' ? (
                      <>
                        <Text style={styles.noJobHint}>This request is on hold</Text>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={onCancelRequest}
                        >
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color="#DC2626"
                          />
                          <Text style={styles.cancelButtonText}>
                            Cancel Request
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={styles.noJobHint}>
                        This request is {selectedRequest.status}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {detailTab === 'messages' ? (
            <View style={styles.messagesSection}>
              <Text style={styles.sectionTitle}>Messages</Text>
              <Text style={styles.sectionSubtitle}>
                Communication thread for this request
              </Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.noteInput}
                  placeholder={
                    isRequestClosed
                      ? 'Messaging disabled for closed requests'
                      : 'Type message...'
                  }
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isRequestClosed}
                />
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    (!newMessage.trim() || isSendingMessage || isRequestClosed) &&
                      styles.addButtonDisabled,
                  ]}
                  onPress={onAddMessage}
                  disabled={
                    !newMessage.trim() || isSendingMessage || isRequestClosed
                  }
                >
                  {isSendingMessage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.addButtonText}>Send</Text>
                  )}
                </TouchableOpacity>
              </View>

              {requestComments.length > 0 ? (
                requestComments.map((comment) => (
                  <View key={comment.id} style={styles.messageCard}>
                    <View style={styles.messageHeader}>
                      <Text style={styles.messageSender}>
                        {comment.userName || 'User'}
                      </Text>
                      {comment.channel ? (
                        <Text style={styles.messageRole}>({comment.channel})</Text>
                      ) : null}
                    </View>
                    <Text style={styles.messageBody}>
                      {comment.message || comment.body || ''}
                    </Text>
                    {comment.attachments && comment.attachments.length > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.messageAttachments}
                        contentContainerStyle={styles.messageAttachmentsContent}
                      >
                        {comment.attachments.map((uri) => {
                          const showImage = isImageUri(uri);
                          return (
                            <TouchableOpacity
                              key={uri}
                              onPress={() => Linking.openURL(uri)}
                              activeOpacity={0.85}
                            >
                              {showImage ? (
                                <Image
                                  source={{ uri }}
                                  style={styles.messageAttachmentImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View
                                  style={styles.messageAttachmentPlaceholder}
                                >
                                  <Ionicons
                                    name="document-outline"
                                    size={24}
                                    color="#2563EB"
                                  />
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    ) : null}
                    <Text style={styles.messageTime}>
                      {formatDateTime(comment.createdAt)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No messages yet</Text>
              )}

              {requestAttachments.length > 0 ? (
                <View style={styles.attachmentsSection}>
                  <Text style={styles.sectionTitle}>Attachments</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.attachmentsScrollContent}
                  >
                    {requestAttachments.map((attachment) => {
                      const isImage = isImageAttachment(attachment);
                      return (
                        <TouchableOpacity
                          key={attachment.id}
                          style={styles.attachmentCard}
                          onPress={() => Linking.openURL(attachment.fileUrl)}
                          activeOpacity={0.85}
                        >
                          {isImage ? (
                            <Image
                              source={{ uri: attachment.fileUrl }}
                              style={styles.attachmentImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.attachmentPlaceholder}>
                              <Ionicons
                                name="document-outline"
                                size={28}
                                color="#2563EB"
                              />
                            </View>
                          )}
                          <Text style={styles.attachmentLabel} numberOfLines={1}>
                            {attachment.fileName || 'Attachment'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 24,
  },
  modalContent: {
    padding: 24,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  detailLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailLoadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  overviewSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  assignmentSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  assignmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  jobStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
  },
  jobStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  jobDetailsCard: {
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  jobDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  jobDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  jobDetailValue: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'right',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  reassignButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reassignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#16A34A',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  noJobCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  noJobText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  noJobHint: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    marginTop: 6,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messagesSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: -8,
  },
  inputGroup: {
    gap: 12,
  },
  noteInput: {
    minHeight: 96,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  addButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    minWidth: 84,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageCard: {
    gap: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  messageRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  messageBody: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  messageAttachments: {
    marginTop: 4,
  },
  messageAttachmentsContent: {
    gap: 10,
  },
  messageAttachmentImage: {
    width: 92,
    height: 92,
    borderRadius: 14,
  },
  messageAttachmentPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  messageTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
  attachmentsSection: {
    gap: 12,
  },
  attachmentsScrollContent: {
    gap: 12,
  },
  attachmentCard: {
    width: 132,
    gap: 10,
  },
  attachmentImage: {
    width: 132,
    height: 132,
    borderRadius: 16,
  },
  attachmentPlaceholder: {
    width: 132,
    height: 132,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  attachmentLabel: {
    fontSize: 12,
    color: '#475569',
  },
});
