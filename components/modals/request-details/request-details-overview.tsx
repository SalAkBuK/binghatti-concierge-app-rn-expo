import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import type {
  Job,
  JobAdditionalCost,
  JobEstimate,
  Request,
  RequestStatus,
  ResidentEmergencySignal,
  User,
} from "../../../lib/types";
import {
  REQUEST_DETAILS_PALETTE as P,
  formatRequestTypeLabel,
  formatCurrency,
  formatDate,
  formatShortDateTime,
  getProgressPercentage,
} from "../../../lib/hooks/modals/request-details/request-details-helpers";
import type {
  RequestDetailsEditForm,
  RequestDetailsEditValidationErrors,
} from "../../../lib/hooks/modals/request-details/useRequestDetailsScreen";
import {
  RESIDENT_REQUEST_CATEGORY_OPTIONS,
  RESIDENT_REQUEST_EMERGENCY_SIGNAL_OPTIONS,
  RESIDENT_REQUEST_PRIORITY_OPTIONS,
} from "../../../lib/utils/resident-request-form";

type BadgeColors = {
  bg: string;
  border: string;
  text: string;
};

type StatusBadgeMeta = {
  label: string;
  bg: string;
  border?: string;
  text: string;
  subtitle?: string;
} | null;

type EstimateStatusDetails = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  text: string;
} | null;

type TimelineStep = {
  key: string;
  title: string;
  time: string;
  note?: string | null;
  state: "complete" | "active" | "pending";
};

type ActivityItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  time: string;
};

type RequestDetailsOverviewProps = {
  selectedRequest: Request;
  currentUser: User | null;
  job?: Job;
  resolvedBuildingName: string | null;
  showEditMode: boolean;
  editForm: RequestDetailsEditForm;
  editValidationErrors: RequestDetailsEditValidationErrors;
  loading: boolean;
  isTenantUser: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCancel: boolean;
  canProvideFeedback: boolean;
  normalizedStatus: RequestStatus;
  statusDisplayLabel: string;
  normalizedPriority: string;
  normalizedAttachments: string[];
  statusColors: BadgeColors;
  priorityColors: BadgeColors;
  statusIcon: keyof typeof Ionicons.glyphMap;
  tenantNextStep: string;
  timelineSteps: TimelineStep[];
  technicianName: string;
  technicianRole: string;
  hasAssignment: boolean;
  activityItems: ActivityItem[];
  jobStatusMeta: StatusBadgeMeta;
  completionMeta: StatusBadgeMeta;
  awaitingCompletionApproval: boolean;
  completionRejectedReason: string | null | undefined;
  estimate?: JobEstimate;
  estimateAwaitingTenant: boolean;
  estimateStatusDetails: EstimateStatusDetails;
  hasAdditionalCosts: boolean;
  approvedAdditionalCostTotal: number;
  pendingAdditionalCostCount: number;
  additionalCosts: JobAdditionalCost[];
  canReviewJobEstimate: boolean;
  canApproveTenantJobCompletion: boolean;
  hasExistingRating: boolean;
  onChangeEditField: (
    field: keyof RequestDetailsEditForm,
    value: RequestDetailsEditForm[keyof RequestDetailsEditForm],
  ) => void;
  onToggleEmergencySignal: (signal: ResidentEmergencySignal) => void;
  onStartEdit: () => void;
  onRequestDelete: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onOpenAttachment: (index: number) => void;
  onReviewCompletion: (jobId: string) => void;
  onApproveEstimate: (jobId: string) => void;
  onDeclineEstimate: (jobId: string) => void;
  onOpenRating: () => void;
  styles: Record<string, any>;
};

export function RequestDetailsOverview({
  selectedRequest,
  currentUser,
  job,
  resolvedBuildingName,
  showEditMode,
  editForm,
  editValidationErrors,
  loading,
  isTenantUser,
  canEdit,
  canDelete,
  canCancel,
  canProvideFeedback,
  normalizedStatus,
  statusDisplayLabel,
  normalizedPriority,
  normalizedAttachments,
  statusColors,
  priorityColors,
  statusIcon,
  tenantNextStep,
  timelineSteps,
  technicianName,
  technicianRole,
  hasAssignment,
  activityItems,
  jobStatusMeta,
  completionMeta,
  awaitingCompletionApproval,
  completionRejectedReason,
  estimate,
  estimateAwaitingTenant,
  estimateStatusDetails,
  hasAdditionalCosts,
  approvedAdditionalCostTotal,
  pendingAdditionalCostCount,
  additionalCosts,
  canReviewJobEstimate,
  canApproveTenantJobCompletion,
  hasExistingRating,
  onChangeEditField,
  onToggleEmergencySignal,
  onStartEdit,
  onRequestDelete,
  onCancelEdit,
  onSaveEdit,
  onOpenAttachment,
  onReviewCompletion,
  onApproveEstimate,
  onDeclineEstimate,
  onOpenRating,
  styles,
}: RequestDetailsOverviewProps) {
  const progressPercentage = getProgressPercentage(normalizedStatus);
  const editDisabled = isTenantUser && !canEdit;
  const requestHeaderCard = (
    <Animated.View entering={FadeIn.duration(400)} style={styles.card}>
      {showEditMode ? (
        <View style={styles.editForm}>
          <View style={styles.editHero}>
            <View style={styles.editHeroIconWrap}>
              <Ionicons
                name={editDisabled ? "lock-closed-outline" : "create-outline"}
                size={18}
                color={P.primary}
              />
            </View>
            <View style={styles.editHeroCopy}>
              <Text style={styles.editHeroTitle}>
                {editDisabled
                  ? "Request details are locked"
                  : isTenantUser
                    ? "Update your request details"
                    : "Update pending request"}
              </Text>
              <Text style={styles.editHeroText}>
                {editDisabled
                  ? "Request details can only be updated while the status is Submitted."
                  : isTenantUser
                    ? "Refine the category, urgency, summary, and emergency details before the team starts work."
                    : "You can refine the issue summary and description before the team starts work."}
              </Text>
            </View>
          </View>

          {!canEdit ? (
            <View style={styles.readOnlyNotice}>
              <Ionicons name="information-circle-outline" size={16} color={P.warningText} />
              <Text style={styles.readOnlyNoticeText}>
                This request is currently {statusDisplayLabel.toLowerCase()}, so the detail fields below are read-only.
              </Text>
            </View>
          ) : null}

          {isTenantUser ? (
            <>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.editCategoryRail}
                >
                  {RESIDENT_REQUEST_CATEGORY_OPTIONS.map((option) => {
                    const selected = option.value === editForm.type;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.editCategoryChip,
                          selected && styles.editCategoryChipSelected,
                          editDisabled && styles.editChoiceDisabled,
                        ]}
                        activeOpacity={0.9}
                        disabled={editDisabled}
                        onPress={() => onChangeEditField("type", option.value)}
                      >
                        <Ionicons
                          name={option.icon}
                          size={15}
                          color={selected ? P.surface : P.primary}
                        />
                        <Text
                          style={[
                            styles.editCategoryChipText,
                            selected && styles.editCategoryChipTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {editValidationErrors.type ? (
                  <Text style={styles.editErrorText}>{editValidationErrors.type}</Text>
                ) : null}
              </View>

              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>Urgency</Text>
                <View style={styles.editSegmentedControl}>
                  {RESIDENT_REQUEST_PRIORITY_OPTIONS.map((option) => {
                    const selected = option.value === editForm.priority;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.editSegmentItem,
                          selected && styles.editSegmentItemSelected,
                          editDisabled && styles.editChoiceDisabled,
                        ]}
                        activeOpacity={0.9}
                        disabled={editDisabled}
                        onPress={() => onChangeEditField("priority", option.value)}
                      >
                        <Text
                          style={[
                            styles.editSegmentItemText,
                            selected && styles.editSegmentItemTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {editValidationErrors.priority ? (
                  <Text style={styles.editErrorText}>{editValidationErrors.priority}</Text>
                ) : null}
              </View>
            </>
          ) : (
            <View style={styles.editContextRail}>
              <View style={styles.editContextChip}>
                <Ionicons name="apps-outline" size={14} color={P.primary} />
                <Text style={styles.editContextChipText}>
                  {formatRequestTypeLabel(selectedRequest.type)}
                </Text>
              </View>
              <View
                style={[
                  styles.editContextChip,
                  {
                    backgroundColor: priorityColors.bg,
                    borderColor: priorityColors.border,
                  },
                ]}
              >
                <Text style={[styles.editContextChipText, { color: priorityColors.text }]}>
                  {normalizedPriority}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Issue Summary</Text>
            <TextInput
              style={[styles.softInput, editDisabled && styles.editInputDisabled]}
              value={editForm.title}
              onChangeText={(text) => onChangeEditField("title", text)}
              placeholder="AC not cooling"
              placeholderTextColor={P.soft}
              maxLength={100}
              editable={!editDisabled}
            />
            {editValidationErrors.title ? (
              <Text style={styles.editErrorText}>{editValidationErrors.title}</Text>
            ) : null}
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Description</Text>
            <TextInput
              style={[
                styles.descriptionInput,
                editDisabled && styles.editInputDisabled,
              ]}
              value={editForm.description}
              onChangeText={(text) => onChangeEditField("description", text)}
              placeholder="What happened, where is it happening, and when did it start?"
              placeholderTextColor={P.soft}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
              editable={!editDisabled}
            />
            {editValidationErrors.description ? (
              <Text style={styles.editErrorText}>{editValidationErrors.description}</Text>
            ) : null}
          </View>

          {isTenantUser ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Emergency</Text>
              <View style={styles.editSegmentedControl}>
                {[
                  { label: "No", value: false },
                  { label: "Yes", value: true },
                ].map((option) => {
                  const selected = option.value === editForm.isEmergency;
                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.editSegmentItem,
                        selected && styles.editSegmentItemSelected,
                        editDisabled && styles.editChoiceDisabled,
                      ]}
                      activeOpacity={0.9}
                      disabled={editDisabled}
                      onPress={() => {
                        onChangeEditField("isEmergency", option.value);
                        if (!option.value) {
                          onChangeEditField("emergencySignals", []);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.editSegmentItemText,
                          selected && styles.editSegmentItemTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.helperText}>
                Use emergency only for active leaks, no power, safety risks, or urgent cooling failures.
              </Text>
              {editForm.isEmergency ? (
                <View style={styles.editEmergencySignalGrid}>
                  {RESIDENT_REQUEST_EMERGENCY_SIGNAL_OPTIONS.map((option) => {
                    const selected = editForm.emergencySignals.includes(option.value);
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.editEmergencySignalChip,
                          selected && styles.editEmergencySignalChipSelected,
                          editDisabled && styles.editChoiceDisabled,
                        ]}
                        activeOpacity={0.88}
                        disabled={editDisabled}
                        onPress={() => onToggleEmergencySignal(option.value)}
                      >
                        <Ionicons
                          name={option.icon}
                          size={15}
                          color={selected ? P.surface : P.dangerText}
                        />
                        <Text
                          style={[
                            styles.editEmergencySignalText,
                            selected && styles.editEmergencySignalTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              {editValidationErrors.emergencySignals ? (
                <Text style={styles.editErrorText}>
                  {editValidationErrors.emergencySignals}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Request Details</Text>
            <View style={styles.editDetailsCard}>
              <View style={styles.editDetailRow}>
                <Text style={styles.editDetailLabel}>Status</Text>
                <Text style={styles.editDetailValue}>{statusDisplayLabel}</Text>
              </View>
              <View style={styles.editDetailRow}>
                <Text style={styles.editDetailLabel}>Submitted</Text>
                <Text style={styles.editDetailValue}>
                  {formatShortDateTime(selectedRequest.createdAt)}
                </Text>
              </View>
              <View style={styles.editDetailRow}>
                <Text style={styles.editDetailLabel}>Location</Text>
                <Text style={styles.editDetailValue}>
                  {resolvedBuildingName || selectedRequest.buildingName || "Assigned building"}
                </Text>
              </View>
            </View>
            <Text style={styles.helperText}>
              {canEdit
                ? "You can update these details while the request is still submitted."
                : "Request details stay read-only after the request moves beyond the submitted stage."}
            </Text>
          </View>

          {normalizedAttachments.length > 0 ? (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Photos</Text>
              <View style={styles.editAttachmentRow}>
                {normalizedAttachments.map((attachment, index) => (
                  <TouchableOpacity
                    key={`${attachment}-${index}`}
                    style={styles.editAttachmentTile}
                    activeOpacity={0.88}
                    onPress={() => onOpenAttachment(index)}
                  >
                    <Image
                      source={{ uri: attachment }}
                      style={styles.editAttachmentImage}
                      resizeMode="cover"
                    />
                    <View style={styles.editAttachmentOverlay}>
                      <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.helperText}>
                Existing photos stay attached for reference. This update screen does not add or remove attachments.
              </Text>
            </View>
          ) : null}

          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelButtonModern}
              onPress={onCancelEdit}
              disabled={loading}
            >
              <Text style={styles.cancelButtonTextModern}>
                {editDisabled ? "Close" : "Discard"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButtonModern,
                (loading || editDisabled) && styles.saveButtonModernDisabled,
              ]}
              onPress={onSaveEdit}
              disabled={loading || editDisabled}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[P.primary, P.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.saveButtonTextModern}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          <View style={styles.requestTitleRow}>
            <Text style={styles.requestTitle}>{selectedRequest.title}</Text>
            {(canEdit || canDelete || canCancel) && (
              <View style={styles.requestActionRow}>
                {canEdit && (
                  <TouchableOpacity
                    onPress={onStartEdit}
                    style={styles.requestActionButton}
                  >
                    <Ionicons name="pencil" size={18} color={P.primary} />
                  </TouchableOpacity>
                )}
                {(canDelete || canCancel) && (
                  <TouchableOpacity
                    onPress={onRequestDelete}
                    style={styles.requestActionButton}
                  >
                    <Ionicons
                      name={canDelete ? "trash-outline" : "close-circle-outline"}
                      size={18}
                      color={P.dangerText}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <Text style={styles.requestMetaLine}>
            Submitted {formatShortDateTime(selectedRequest.createdAt)}
          </Text>

          <View style={styles.badges}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: statusColors.bg,
                  borderColor: statusColors.border,
                },
              ]}
            >
              <Ionicons name={statusIcon} size={14} color={statusColors.text} />
              <Text style={[styles.badgeText, { color: statusColors.text }]}>
                {statusDisplayLabel}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: priorityColors.bg,
                  borderColor: priorityColors.border,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: priorityColors.text }]}>
                {normalizedPriority}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
              ]}
            >
              <Text style={[styles.badgeText, { color: "#1F2937" }]}>
                {formatRequestTypeLabel(selectedRequest.type)}
              </Text>
            </View>

            {selectedRequest.isEmergency ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: "#FCE3E0", borderColor: "#E9B7B0" },
                ]}
              >
                <Ionicons name="warning-outline" size={14} color="#B24A41" />
                <Text style={[styles.badgeText, { color: "#B24A41" }]}>
                  Emergency
                </Text>
              </View>
            ) : null}
          </View>

          {isTenantUser && !canEdit ? (
            <View style={styles.readOnlyNotice}>
              <Ionicons name="lock-closed-outline" size={16} color={P.warningText} />
              <Text style={styles.readOnlyNoticeText}>
                You can update request details only while the status is Submitted. This request is now read-only.
              </Text>
            </View>
          ) : null}

          {selectedRequest.assignedTo && (
            <View style={styles.assignedRow}>
              <Ionicons name="person-outline" size={16} color={P.primary} />
              <Text style={styles.assignedLabel}>Assigned Team</Text>
              <Text style={styles.assignedValue}>{selectedRequest.assignedTo}</Text>
            </View>
          )}

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor:
                      normalizedStatus === "completed"
                        ? P.successText
                        : normalizedStatus === "in-progress"
                          ? P.primary
                          : normalizedStatus === "on-hold"
                            ? P.warningText
                            : normalizedStatus === "cancelled"
                              ? P.soft
                              : P.warningText,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>
                {selectedRequest.description}
              </Text>
            </View>
          </View>

          {Array.isArray(selectedRequest.emergencySignals) &&
          selectedRequest.emergencySignals.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Emergency details</Text>
              <View style={styles.emergencySignalWrap}>
                {selectedRequest.emergencySignals.map((signal) => (
                  <View key={signal} style={styles.emergencySignalChip}>
                    <Ionicons
                      name="warning-outline"
                      size={14}
                      color={P.dangerText}
                    />
                    <Text style={styles.emergencySignalChipText}>
                      {signal
                        .toLowerCase()
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (char) => char.toUpperCase())}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {selectedRequest.additionalNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Notes</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>
                  {selectedRequest.additionalNotes}
                </Text>
              </View>
            </View>
          )}

          {normalizedAttachments.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Photos ({normalizedAttachments.length})
              </Text>
              <View style={styles.attachmentsGrid}>
                {normalizedAttachments.map((attachment, index) => (
                  <TouchableOpacity
                    key={`${attachment}-${index}`}
                    style={styles.attachmentImageContainer}
                    onPress={() => onOpenAttachment(index)}
                  >
                    <Image
                      source={{ uri: attachment }}
                      style={styles.attachmentImage}
                      resizeMode="cover"
                    />
                    <View style={styles.attachmentOverlay}>
                      <Ionicons
                        name="expand-outline"
                        size={16}
                        color="#FFFFFF"
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
  const locationCard =
    selectedRequest.apartment ||
    selectedRequest.tower ||
    selectedRequest.buildingId ||
    selectedRequest.floor ||
    resolvedBuildingName ? (
      <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="location-outline" size={20} color="#6B7280" />
          <Text style={styles.cardTitle}>Location</Text>
        </View>

        {(resolvedBuildingName || selectedRequest.buildingName) && (
          <Text style={styles.buildingName}>
            {resolvedBuildingName || selectedRequest.buildingName}
          </Text>
        )}

        <View style={styles.locationDetails}>
          {selectedRequest.apartment && (
            <View style={styles.locationDetailRow}>
              <Text style={styles.locationDetailLabel}>Unit:</Text>
              <Text style={styles.locationDetailValue}>
                {selectedRequest.apartment || currentUser?.profile?.apartment || "-"}
              </Text>
            </View>
          )}

          {selectedRequest.tower && (
            <View style={styles.locationDetailRow}>
              <Text style={styles.locationDetailLabel}>Tower:</Text>
              <Text style={styles.locationDetailValue}>{selectedRequest.tower}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    ) : null;

  const timelineCard = (
    <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="calendar-outline" size={20} color="#6B7280" />
        <Text style={styles.cardTitle}>Timeline</Text>
      </View>
      <View style={styles.timelineRail}>
        {timelineSteps.map((step, index) => (
          <View key={step.key} style={styles.timelineEntry}>
            {index < timelineSteps.length - 1 && (
              <View
                style={[
                  styles.timelineConnector,
                  step.state === "pending" && styles.timelineConnectorMuted,
                ]}
              />
            )}
            <View
              style={[
                styles.timelineMarker,
                step.state === "complete" && styles.timelineMarkerComplete,
                step.state === "active" && styles.timelineMarkerActive,
                step.state === "pending" && styles.timelineMarkerPending,
              ]}
            >
              {step.state === "complete" ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : step.state === "active" ? (
                <View style={styles.timelineMarkerDot} />
              ) : null}
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>{step.title}</Text>
              <Text style={styles.timelineValue}>{step.time}</Text>
              {step.note ? (
                <View style={styles.timelineNoteCard}>
                  <Text style={styles.timelineNoteText}>{step.note}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  const nextStepCard = isTenantUser ? (
    <Animated.View entering={FadeInDown.delay(108).duration(400)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="sparkles-outline" size={20} color="#6B7280" />
        <Text style={styles.cardTitle}>Next Step</Text>
      </View>
      <View style={styles.notesBox}>
        <Text style={styles.notesText}>{tenantNextStep}</Text>
      </View>
    </Animated.View>
  ) : null;

  const supportCard = (
    <Animated.View entering={FadeInDown.delay(115).duration(400)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="person-outline" size={20} color="#6B7280" />
        <Text style={styles.cardTitle}>Assigned Team</Text>
      </View>
      <View style={styles.supportCard}>
        <View style={styles.supportAvatar}>
          <Text style={styles.supportAvatarText}>
            {technicianName
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("") || "CT"}
          </Text>
        </View>
        <View style={styles.supportContent}>
          <Text style={styles.supportName}>{technicianName}</Text>
          <Text style={styles.supportRole}>{technicianRole}</Text>
          <Text style={styles.supportNote}>
            {hasAssignment
              ? isTenantUser
                ? "Management has assigned a team for this issue. Progress updates will appear here."
                : "Track updates here as the service team progresses through the job."
              : isTenantUser
                ? "Management is reviewing your issue and will assign the right team next."
                : "Your request is waiting for assignment. New updates will appear here."}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const activityCard = (
    <Animated.View entering={FadeInDown.delay(122).duration(400)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={20}
          color="#6B7280"
        />
        <Text style={styles.cardTitle}>Activity Log</Text>
      </View>
      {activityItems.length > 0 ? (
        <View style={styles.activityList}>
          {activityItems.map((item) => (
            <View key={item.key} style={styles.activityRow}>
              <View style={styles.activityIconWrap}>
                <Ionicons name={item.icon} size={16} color="#4D6169" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.activityEmptyState}>
          <Text style={styles.activityEmptyText}>
            Updates from the service team will appear here as work progresses.
          </Text>
        </View>
      )}
    </Animated.View>
  );
  const jobCard = !isTenantUser && job ? (
    <Animated.View entering={FadeInDown.delay(130).duration(400)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="briefcase-outline" size={20} color="#6B7280" />
        <Text style={styles.cardTitle}>Job Overview</Text>
      </View>

      <View style={styles.jobStatusRow}>
        {jobStatusMeta && (
          <View
            style={[
              styles.jobStatusBadge,
              {
                backgroundColor: jobStatusMeta.bg,
                borderColor: jobStatusMeta.border,
              },
            ]}
          >
            <Text style={[styles.jobStatusBadgeText, { color: jobStatusMeta.text }]}>
              {jobStatusMeta.label}
            </Text>
          </View>
        )}
        {completionMeta && (
          <View
            style={[
              styles.jobStatusBadge,
              {
                backgroundColor: completionMeta.bg,
                borderColor: completionMeta.bg,
              },
            ]}
          >
            <Text
              style={[styles.jobStatusBadgeText, { color: completionMeta.text }]}
            >
              {completionMeta.label}
            </Text>
          </View>
        )}
      </View>

      {completionMeta?.subtitle && (
        <Text style={styles.completionSubtitle}>{completionMeta.subtitle}</Text>
      )}

      {completionRejectedReason && (
        <View style={styles.rejectionNotice}>
          <Ionicons name="alert-circle" size={18} color="#DC2626" />
          <Text style={styles.rejectionNoticeText}>{completionRejectedReason}</Text>
        </View>
      )}

      <View style={styles.jobInfoGrid}>
        <View style={styles.jobInfoItem}>
          <Text style={styles.jobInfoLabel}>Assigned To</Text>
          <Text style={styles.jobInfoValue}>
            {job.assignedToEmployeeName || job.assignedToName || "To be assigned"}
          </Text>
        </View>
        <View style={styles.jobInfoItem}>
          <Text style={styles.jobInfoLabel}>Service Provider</Text>
          <Text style={styles.jobInfoValue}>
            {job.assignedToName || "Not yet assigned"}
          </Text>
        </View>
        {job.scheduledDate && (
          <View style={styles.jobInfoItem}>
            <Text style={styles.jobInfoLabel}>Scheduled</Text>
            <Text style={styles.jobInfoValue}>{formatDate(job.scheduledDate)}</Text>
          </View>
        )}
        {job.startedAt && (
          <View style={styles.jobInfoItem}>
            <Text style={styles.jobInfoLabel}>Started</Text>
            <Text style={styles.jobInfoValue}>{formatDate(job.startedAt)}</Text>
          </View>
        )}
        {job.completedDate && (
          <View style={styles.jobInfoItem}>
            <Text style={styles.jobInfoLabel}>Completed</Text>
            <Text style={styles.jobInfoValue}>{formatDate(job.completedDate)}</Text>
          </View>
        )}
      </View>

      {job.completionNotes && (
        <View style={styles.jobNotes}>
          <Text style={styles.jobNotesLabel}>Completion Notes</Text>
          <Text style={styles.jobNotesText}>{job.completionNotes}</Text>
        </View>
      )}

      {job.completionFeedback && (
        <View style={styles.jobNotes}>
          <Text style={styles.jobNotesLabel}>Your Feedback</Text>
          <Text style={styles.jobNotesText}>{job.completionFeedback}</Text>
        </View>
      )}

      {awaitingCompletionApproval && canApproveTenantJobCompletion && (
        <TouchableOpacity
          style={styles.reviewCompletionButton}
          onPress={() => onReviewCompletion(job.id)}
        >
          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.reviewCompletionButtonText}>
            Review & Confirm Completion
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color="#FFFFFF"
            style={{ opacity: 0.8 }}
          />
        </TouchableOpacity>
      )}

      {!awaitingCompletionApproval && job.status === "completed" && !completionMeta && (
        <View style={styles.jobCompletionInfo}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.jobCompletionInfoText}>
            Job marked completed on{" "}
            {job.completedDate ? formatDate(job.completedDate) : "the latest update"}.
          </Text>
        </View>
      )}
    </Animated.View>
  ) : null;

  const estimateCard = !isTenantUser && job && estimate ? (
    <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="receipt-outline" size={20} color="#6B7280" />
        <Text style={styles.cardTitle}>Cost Estimate</Text>
      </View>
      <Text style={styles.estimateMeta}>
        Submitted on {formatDate(estimate.createdAt)}
      </Text>
      {estimate.notes && <Text style={styles.estimateNotes}>{estimate.notes}</Text>}
      <View style={styles.estimateItems}>
        {estimate.items.map((item) => (
          <View key={item.id} style={styles.estimateItemRow}>
            <View style={styles.estimateItemInfo}>
              <Text style={styles.estimateItemLabel}>{item.label}</Text>
              {item.description && (
                <Text style={styles.estimateItemDescription}>{item.description}</Text>
              )}
            </View>
            <Text style={styles.estimateItemAmount}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.estimateTotalRow}>
        <Text style={styles.estimateTotalLabel}>Total</Text>
        <Text style={styles.estimateTotalAmount}>
          {formatCurrency(estimate.subtotal)}
        </Text>
      </View>

      {estimateAwaitingTenant && canReviewJobEstimate ? (
        <View style={styles.estimateActionRow}>
          <TouchableOpacity
            style={[styles.estimateActionButton, styles.estimateDecline]}
            onPress={() => onDeclineEstimate(job.id)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={styles.estimateDeclineText}>Request Changes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.estimateActionButton, styles.estimateApprove]}
            onPress={() => onApproveEstimate(job.id)}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color="#FFFFFF"
            />
            <Text style={styles.estimateApproveText}>Approve</Text>
          </TouchableOpacity>
        </View>
      ) : estimateStatusDetails ? (
        <View style={styles.estimateStatusBanner}>
          <Ionicons
            name={estimateStatusDetails.icon}
            size={18}
            color={estimateStatusDetails.color}
          />
          <Text
            style={[
              styles.estimateStatusText,
              { color: estimateStatusDetails.color },
            ]}
          >
            {estimateStatusDetails.text}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  ) : null;
  const additionalCostsCard = !isTenantUser && job && hasAdditionalCosts ? (
    <Animated.View entering={FadeInDown.delay(190).duration(400)} style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="cash-outline" size={20} color="#6B7280" />
        <Text style={styles.cardTitle}>Additional Costs</Text>
      </View>
      <View style={styles.additionalCostSummary}>
        <View style={styles.additionalCostChip}>
          <Ionicons name="checkmark-circle" size={16} color="#047857" />
          <Text style={styles.additionalCostChipText}>
            Approved: {formatCurrency(approvedAdditionalCostTotal)}
          </Text>
        </View>
        {pendingAdditionalCostCount > 0 && (
          <View
            style={[
              styles.additionalCostChip,
              styles.additionalCostChipPending,
            ]}
          >
            <Ionicons name="time-outline" size={16} color="#92400E" />
            <Text style={[styles.additionalCostChipText, { color: "#92400E" }]}>
              Pending: {pendingAdditionalCostCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.additionalCostList}>
        {additionalCosts.map((cost) => (
          <View key={cost.id} style={styles.additionalCostItem}>
            <View style={styles.additionalCostHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.additionalCostTitle}>{cost.description}</Text>
                <Text style={styles.additionalCostMeta}>
                  {cost.category ? `${cost.category} - ` : ""}
                  Added by {cost.employeeName}
                </Text>
              </View>
              <Text style={styles.additionalCostAmount}>
                {formatCurrency(cost.amount)}
              </Text>
            </View>
            <View style={styles.additionalCostStatusRow}>
              <Ionicons
                name={
                  cost.status === "approved"
                    ? "checkmark-circle"
                    : cost.status === "rejected"
                      ? "close-circle"
                      : "time-outline"
                }
                size={16}
                color={
                  cost.status === "approved"
                    ? "#10B981"
                    : cost.status === "rejected"
                      ? "#EF4444"
                      : "#F59E0B"
                }
              />
              <Text style={styles.additionalCostStatusText}>
                {cost.status === "approved"
                  ? `Approved${
                      cost.approvedAt
                        ? ` on ${new Date(cost.approvedAt).toLocaleDateString()}`
                        : ""
                    }`
                  : cost.status === "rejected"
                    ? `Rejected${cost.rejectionReason ? ` - ${cost.rejectionReason}` : ""}`
                    : "Awaiting service provider review"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  ) : null;

  const ratingCard = !isTenantUser && canProvideFeedback ? (
    <Animated.View entering={FadeInDown.delay(260).duration(400)} style={styles.card}>
      <View style={styles.ratingSection}>
        <Text style={styles.sectionTitle}>Rate This Service</Text>
        <Text style={styles.ratingPromptText}>
          How was your experience with this request?
        </Text>
        <TouchableOpacity style={styles.ratingButton} onPress={onOpenRating}>
          <Ionicons name="star-outline" size={20} color="#fff" />
          <Text style={styles.ratingButtonText}>
            {hasExistingRating ? "View Your Rating" : "Leave a Rating"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  ) : null;

  return (
    <>
      {requestHeaderCard}
      {locationCard}
      {timelineCard}
      {nextStepCard}
      {supportCard}
      {activityCard}
      {jobCard}
      {estimateCard}
      {additionalCostsCard}
      {ratingCard}
    </>
  );
}
