import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { ImageViewer } from "../../components/ui/ImageViewer";
import { TenantLockedFeatureCard } from "../../components/ui/TenantLockedFeatureCard";
import { RequestDetailsComments } from "../../components/modals/request-details/request-details-comments";
import { RequestDetailsDeleteModal } from "../../components/modals/request-details/request-details-delete-modal";
import { RequestDetailsOverview } from "../../components/modals/request-details/request-details-overview";
import { useNotifications } from "../../lib/context/notifications-context";
import {
  REQUEST_DETAILS_PALETTE as P,
  formatCurrency,
  formatShortDateTime,
  getCompletionStatusMeta,
  getJobStatusMeta,
  getPriorityColor,
  getStatusColor,
  getStatusIcon,
  getTenantRequestNextStep,
  getTenantRequestStatusLabel,
  normalizeAttachments,
  normalizePriority,
  normalizeStatus,
} from "../../lib/hooks/modals/request-details/request-details-helpers";
import { useRequestDetailsScreen } from "../../lib/hooks/modals/request-details/useRequestDetailsScreen";
import {
  getResidentRequestOwnerRejectionReason,
  isResidentRequestOwnerRejected,
} from "../../lib/utils/resident-request-approval";
import { requestToResidentRequestForm } from "../../lib/utils/resident-request-form";
import { RESIDENT_HISTORY_UNAVAILABLE_MESSAGE } from "../../lib/utils/resident-history-access";
import {
  classifyTenantRequestByTenancyCycle,
  getTenantLifecycleMessage,
} from "../../lib/utils/tenant-request-tenancy-display";
import { getRequestLifecycleBadges } from "../../lib/utils/request-tenancy-context";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";

export default function RequestDetailsScreen() {
  const params = useLocalSearchParams<{ initialTab?: string | string[] }>();
  const { notifications } = useNotifications();
  const requestedInitialTab = Array.isArray(params.initialTab)
    ? params.initialTab[0]
    : params.initialTab;
  const {
    currentUser,
    selectedRequest,
    job,
    comments,
    detailTab,
    setDetailTab,
    fetchingDetails,
    historyUnavailable,
    historyUnavailableMessage,
    newComment,
    setNewComment,
    isPostingComment,
    resolvedBuildingName,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showEditMode,
    setShowEditMode,
    editForm,
    editValidationErrors,
    loading,
    showImageViewer,
    setShowImageViewer,
    selectedImageIndex,
    setSelectedImageIndex,
    reviewJobEstimateAsTenant,
    approveTenantJobCompletion,
    getRatingByRequestId,
    handleApproveEstimate,
    handleDeclineEstimate,
    handleReviewCompletion,
    handleDeleteRequest,
    handleCancelEdit,
    handleUpdateRequest,
    updateEditFormField,
    toggleEditEmergencySignal,
    handleSubmitComment,
  } = useRequestDetailsScreen(requestedInitialTab);




  if (!selectedRequest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubble-outline"
            size={64}
            color="#D1D5DB"
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No request selected</Text>
          <Text style={styles.emptyText}>
            Please select a request to view its details
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.back()}
          >
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const normalizedStatus = normalizeStatus(selectedRequest.status);
  const normalizedPriority = normalizePriority(selectedRequest.priority);
  const normalizedAttachments = normalizeAttachments(selectedRequest.attachments);
  const isTenantUser = currentUser?.role === "tenant";
  const isTenantHistoricalRequest =
    isTenantUser &&
    classifyTenantRequestByTenancyCycle(selectedRequest) !== "current";
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  const canEdit = !isTenantHistoricalRequest && normalizedStatus === "pending";
  const canDelete = !isTenantHistoricalRequest && normalizedStatus === "pending";
  const canCancel =
    !isTenantHistoricalRequest &&
    normalizedStatus !== "completed" && normalizedStatus !== "cancelled";
  const canProvideFeedback = false;
  const canReviewJobEstimate =
    !isTenantHistoricalRequest && Boolean(reviewJobEstimateAsTenant);
  const canApproveTenantJobCompletion =
    !isTenantHistoricalRequest && Boolean(approveTenantJobCompletion);
  const ownerRejected = isTenantUser && isResidentRequestOwnerRejected(selectedRequest);
  const ownerRejectionReason = ownerRejected
    ? getResidentRequestOwnerRejectionReason(selectedRequest)
    : null;
  const lifecycleBadges = getRequestLifecycleBadges(selectedRequest);
  const tenantLifecycleMessage = isTenantUser
    ? getTenantLifecycleMessage(selectedRequest)
    : null;
  const tenantReadOnlyMessage =
    isTenantHistoricalRequest
      ? "Archived requests are view-only. You cannot edit, cancel, or comment on them."
      : !canEdit
        ? "You can update request details only while the status is Submitted. This request is now read-only."
        : null;
  const statusColors = ownerRejected
    ? { bg: P.dangerBg, text: P.dangerText, border: "#E9B7B0" }
    : getStatusColor(normalizedStatus);
  const priorityColors = getPriorityColor(normalizedPriority);
  const statusIcon = ownerRejected
    ? "alert-circle-outline"
    : getStatusIcon(normalizedStatus);
  const jobStatusMeta = job ? getJobStatusMeta(job.status) : null;
  const estimate = job?.estimate;
  const additionalCosts = job?.additionalCosts ?? [];
  const hasAdditionalCosts = additionalCosts.length > 0;
  const approvedAdditionalCostTotal = hasAdditionalCosts
    ? additionalCosts
        .filter((cost) => cost.status === "approved")
        .reduce((sum, cost) => sum + cost.amount, 0)
    : 0;
  const pendingAdditionalCostCount = hasAdditionalCosts
    ? additionalCosts.filter((cost) => cost.status === "pending").length
    : 0;
  const estimateAwaitingTenant = estimate?.status === "sp_approved";
  const estimateApproved = estimate?.status === "tenant_approved";
  const estimateDeclined = estimate?.status === "tenant_declined";
  const estimateRejectedByProvider = estimate?.status === "sp_rejected";
  const estimateDraftOrSubmitted =
    estimate?.status === "draft" || estimate?.status === "submitted";
  const completionMeta = getCompletionStatusMeta(job?.completionStatus);
  const awaitingCompletionApproval =
    job?.completionStatus === "awaiting_tenant_approval";
  const completionRejectedReason = job?.completionRejectionReason;
  const estimateStatusDetails = estimate
    ? (() => {
        if (estimateApproved) {
          return {
            icon: "checkmark-circle" as const,
            color: "#10B981",
            text: "You approved this estimate. Work can proceed.",
          };
        }
        if (estimateDeclined) {
          return {
            icon: "alert-circle" as const,
            color: "#F97316",
            text: "You requested changes to this estimate.",
          };
        }
        if (estimateRejectedByProvider) {
          return {
            icon: "alert-circle" as const,
            color: "#F97316",
            text:
              "Service provider requested revisions before sharing with you.",
          };
        }
        if (estimateAwaitingTenant) {
          return {
            icon: "time-outline" as const,
            color: "#2563EB",
            text: reviewJobEstimateAsTenant
              ? "Waiting for your decision."
              : "Awaiting your review. Contact the concierge team if you need help.",
          };
        }
        if (estimateDraftOrSubmitted) {
          return {
            icon: "time-outline" as const,
            color: "#2563EB",
            text:
              "Waiting for the service team to review and share the estimate.",
          };
        }
        return {
          icon: "information-circle-outline" as const,
          color: "#2563EB",
          text: "Estimate status updated.",
        };
      })()
    : null;

  const latestActivityNote =
    job?.completionNotes ||
    estimateStatusDetails?.text ||
    null;

  const hasAssignment = Boolean(selectedRequest.assignedTo || job);
  const activeStepTitle =
    normalizedStatus === "on-hold"
      ? "On Hold"
      : normalizedStatus === "assigned"
        ? "Assigned"
      : normalizedStatus === "cancelled"
        ? "Cancelled"
        : "In Progress";
  const activeStepState: "complete" | "active" | "pending" =
    normalizedStatus === "pending"
      ? "pending"
      : normalizedStatus === "completed" || normalizedStatus === "cancelled"
        ? "complete"
        : "active";
  const completionStepState: "complete" | "pending" =
    normalizedStatus === "completed" || normalizedStatus === "cancelled"
      ? "complete"
      : "pending";

  const timelineSteps: {
    key: string;
    title: string;
    time: string;
    note?: string | null;
    state: "complete" | "active" | "pending";
  }[] = [
    {
      key: "submitted",
      title: "Submitted",
      time: formatShortDateTime(selectedRequest.createdAt),
      state: "complete" as const,
    },
    {
      key: "assigned",
      title: "Assigned",
      time:
        hasAssignment
          ? formatShortDateTime(job?.scheduledDate || selectedRequest.updatedAt)
          : "Awaiting assignment",
      state: hasAssignment ? "complete" : "pending",
    },
    {
      key: "active",
      title: activeStepTitle,
      time:
        normalizedStatus === "pending"
          ? "Waiting to begin"
          : formatShortDateTime(job?.startedAt || selectedRequest.updatedAt),
      state: activeStepState,
      note: latestActivityNote,
    },
    {
      key: "complete",
      title: normalizedStatus === "cancelled" ? "Closed" : "Completed",
      time:
        normalizedStatus === "completed"
          ? formatShortDateTime(job?.completedDate || selectedRequest.updatedAt)
          : normalizedStatus === "cancelled"
            ? formatShortDateTime(selectedRequest.updatedAt)
            : "Expected after technician update",
      state: completionStepState,
    },
  ];

  const activityItems = [
    job?.scheduledDate
      ? {
          key: "scheduled",
          icon: "calendar-outline" as const,
          title: "Visit scheduled",
          time: formatShortDateTime(job.scheduledDate),
        }
      : null,
    comments[0]
      ? {
          key: "comment",
          icon: "chatbubble-ellipses-outline" as const,
          title: comments[0].message,
          time: formatShortDateTime(comments[0].createdAt),
        }
      : null,
    !isTenantUser && estimate
      ? {
          key: "estimate",
          icon: "receipt-outline" as const,
          title: `Estimate ready: ${formatCurrency(estimate.subtotal)}`,
          time: formatShortDateTime(estimate.createdAt),
        }
      : null,
    !isTenantUser && additionalCosts[0]
      ? {
          key: "cost",
          icon: "construct-outline" as const,
          title: `Additional cost logged: ${formatCurrency(additionalCosts[0].amount)}`,
          time: additionalCosts[0].createdAt
            ? formatShortDateTime(additionalCosts[0].createdAt)
            : "Awaiting review",
        }
      : null,
  ].filter(Boolean) as { key: string; icon: keyof typeof Ionicons.glyphMap; title: string; time: string }[];

  const technicianName =
    selectedRequest.assignedTo ||
    job?.assignedToEmployeeName ||
    job?.assignedToName ||
    "Concierge Team";

  const technicianRole =
    job?.assignedToEmployeeName || job?.assignedToName
      ? "Lead Technician"
      : "Support Team";
  const tenantNextStep = ownerRejected
    ? ownerRejectionReason
      ? `Owner declined this request. Reason: ${ownerRejectionReason}. Management will need to review the next step before work can continue.`
      : "Owner declined this request. Management will need to review the next step before work can continue."
    : getTenantRequestNextStep(normalizedStatus);
  const hasExistingRating = canProvideFeedback
    ? Boolean(getRatingByRequestId(selectedRequest.id))
    : false;

  const handleStartEdit = () => {
    const nextEditForm = requestToResidentRequestForm(selectedRequest);
    updateEditFormField("title", nextEditForm.title);
    updateEditFormField(
      "description",
      nextEditForm.description,
    );
    updateEditFormField("type", nextEditForm.type);
    updateEditFormField("priority", nextEditForm.priority);
    updateEditFormField("isEmergency", nextEditForm.isEmergency);
    updateEditFormField("emergencySignals", nextEditForm.emergencySignals);
    setShowEditMode(true);
  };

  const handleOpenAttachment = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  const handleOpenRating = () => {
    if (hasExistingRating) {
      router.push("/(tenant)/my-ratings");
      return;
    }

    router.push({
      pathname: "/(modals)/submit-rating",
      params: {
        requestId: selectedRequest.id,
        serviceProviderId: selectedRequest.assignedTo || "default-provider",
        requestTitle: selectedRequest.title,
        serviceProviderName: "Service Provider",
      },
    });
  };

  if (historyUnavailable) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.lockedScrollContent}
          >
            <HeaderBar
              title={isTenantUser ? "Maintenance Issue" : "Request Details"}
              showBackButton
              showMenu={false}
              hasUnreadNotifications={hasUnreadNotifications}
            />

            <TenantLockedFeatureCard
              title="Resident history unavailable"
              message={
                historyUnavailableMessage ?? RESIDENT_HISTORY_UNAVAILABLE_MESSAGE
              }
              actionLabel="Review Lease Details"
              onPress={() => router.push("/(tenant)/lease-details" as any)}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar
            title={isTenantUser ? "Maintenance Issue" : "Request Details"}
            showBackButton
            showMenu={false}
            hasUnreadNotifications={hasUnreadNotifications}
          />

          {/* Tabs */}
          <View style={styles.tabRow}>
            {(["overview", "comments"] as const).map((tab) => {
              const active = detailTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, active && styles.tabButtonActive]}
                  onPress={() => setDetailTab(tab)}
                >
                  <Text
                    style={[styles.tabButtonText, active && styles.tabButtonTextActive]}
                  >
                    {tab === "overview" ? "Overview" : "Comments"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {detailTab === "overview" ? (
            <RequestDetailsOverview
              selectedRequest={selectedRequest}
              currentUser={currentUser}
              job={job}
              resolvedBuildingName={resolvedBuildingName}
              showEditMode={showEditMode}
              editForm={editForm}
              editValidationErrors={editValidationErrors}
              loading={loading}
              isTenantUser={isTenantUser}
              canEdit={canEdit}
              canDelete={canDelete}
              canCancel={canCancel}
              canProvideFeedback={canProvideFeedback}
              normalizedStatus={normalizedStatus}
              statusDisplayLabel={
                isTenantUser
                  ? ownerRejected
                    ? "Owner Rejected"
                    : getTenantRequestStatusLabel(normalizedStatus)
                  : normalizedStatus.replace("-", " ")
              }
              ownerRejected={ownerRejected}
              ownerRejectionReason={ownerRejectionReason}
              lifecycleBadges={lifecycleBadges}
              tenantLifecycleMessage={tenantLifecycleMessage}
              tenantReadOnlyMessage={tenantReadOnlyMessage}
              normalizedPriority={normalizedPriority}
              normalizedAttachments={normalizedAttachments}
              statusColors={statusColors}
              priorityColors={priorityColors}
              statusIcon={statusIcon}
              tenantNextStep={tenantNextStep}
              timelineSteps={timelineSteps}
              technicianName={technicianName}
              technicianRole={technicianRole}
              hasAssignment={hasAssignment}
              activityItems={activityItems}
              jobStatusMeta={jobStatusMeta}
              completionMeta={completionMeta}
              awaitingCompletionApproval={awaitingCompletionApproval}
              completionRejectedReason={completionRejectedReason}
              estimate={estimate}
              estimateAwaitingTenant={estimateAwaitingTenant}
              estimateStatusDetails={estimateStatusDetails}
              hasAdditionalCosts={hasAdditionalCosts}
              approvedAdditionalCostTotal={approvedAdditionalCostTotal}
              pendingAdditionalCostCount={pendingAdditionalCostCount}
              additionalCosts={additionalCosts}
              canReviewJobEstimate={canReviewJobEstimate}
              canApproveTenantJobCompletion={canApproveTenantJobCompletion}
              hasExistingRating={hasExistingRating}
              onChangeEditField={updateEditFormField}
              onToggleEmergencySignal={toggleEditEmergencySignal}
              onStartEdit={handleStartEdit}
              onRequestDelete={() => setShowDeleteConfirm(true)}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleUpdateRequest}
              onOpenAttachment={handleOpenAttachment}
              onReviewCompletion={handleReviewCompletion}
              onApproveEstimate={handleApproveEstimate}
              onDeclineEstimate={handleDeclineEstimate}
              onOpenRating={handleOpenRating}
              styles={styles}
            />
          ) : (
            <RequestDetailsComments
              comments={comments}
              fetchingDetails={fetchingDetails}
              newComment={newComment}
              setNewComment={setNewComment}
              isPostingComment={isPostingComment}
              normalizedStatus={normalizedStatus}
              commentsDisabledMessage={tenantReadOnlyMessage}
              onSubmitComment={handleSubmitComment}
              styles={styles}
            />
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <RequestDetailsDeleteModal
        visible={showDeleteConfirm}
        loading={loading}
        requestTitle={selectedRequest.title}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRequest}
        styles={styles}
      />

      {/* Image Viewer */}
      {selectedRequest && normalizedAttachments.length > 0 && (
        <ImageViewer
          images={normalizedAttachments}
          initialIndex={selectedImageIndex}
          visible={showImageViewer}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </SafeAreaView>
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
  lockedScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: "700",
    color: P.text,
    marginTop: 2,
    marginBottom: 8,
  },
  locationDetails: {
    marginTop: 4,
    gap: 10,
  },
  locationDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: P.border,
  },
  locationDetailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  locationDetailValue: {
    fontSize: 13,
    color: P.text,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: P.surface,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: P.soft,
  },
  tabButtonTextActive: {
    color: P.primary,
  },
  card: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: "rgba(43, 52, 55, 0.08)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 3,
  },
  requestTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: P.text,
    flex: 1,
  },
  requestTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 6,
  },
  requestMetaLine: {
    fontSize: 13,
    color: P.soft,
    marginBottom: 14,
  },
  requestActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  requestActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: "center",
    justifyContent: "center",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  lifecycleBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -4,
    marginBottom: 16,
  },
  lifecycleBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  lifecycleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  assignedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 16,
    alignSelf: "flex-start",
    backgroundColor: P.surfaceLow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: P.border,
  },
  assignedLabel: {
    fontSize: 13,
    color: P.soft,
  },
  assignedValue: {
    fontSize: 13,
    fontWeight: "600",
    color: P.text,
  },
  progressContainer: {
    marginBottom: 18,
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: P.border,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  progressPercentage: {
    fontSize: 13,
    color: P.primary,
    fontWeight: "700",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: P.primarySoft,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: P.text,
    marginBottom: 10,
  },
  descriptionBox: {
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: P.border,
  },
  descriptionText: {
    fontSize: 14,
    color: P.muted,
    lineHeight: 21,
  },
  notesBox: {
    backgroundColor: P.accent,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: P.accentBorder,
  },
  notesText: {
    fontSize: 14,
    color: P.muted,
    lineHeight: 21,
  },
  emergencySignalWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  emergencySignalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: P.dangerBg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E9B7B0",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emergencySignalChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.dangerText,
  },
  attachmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  attachmentImageContainer: {
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    width: 104,
    height: 104,
    backgroundColor: P.surfaceMid,
  },
  attachmentImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: P.surfaceMid,
  },
  attachmentOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 14,
    padding: 5,
  },
  commentsEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  commentsEmptyText: {
    fontSize: 13,
    color: "#6B7280",
  },
  commentsList: {
    gap: 12,
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 8,
  },
  commentHeader: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  commentTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  commentBody: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  commentAttachment: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  commentAttachmentImage: {
    width: "100%",
    height: "100%",
  },
  commentAttachmentPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  commentInputBox: {
    gap: 10,
  },
  commentInputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: P.text,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 16,
    padding: 12,
    minHeight: 80,
    backgroundColor: P.surface,
    textAlignVertical: "top",
  },
  commentSendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: P.primary,
    borderRadius: 16,
    paddingVertical: 12,
  },
  commentSendButtonDisabled: {
    opacity: 0.6,
  },
  commentSendText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: P.text,
  },
  locationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 14,
    color: "#6B7280",
  },
  timelineItem: {
    marginBottom: 12,
  },
  timelineRail: {
    gap: 16,
  },
  timelineEntry: {
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    minHeight: 56,
  },
  timelineConnector: {
    position: "absolute",
    left: 10,
    top: 28,
    bottom: -16,
    width: 2,
    backgroundColor: "#D9E4E8",
  },
  timelineConnectorMuted: {
    backgroundColor: "#E5E7EB",
  },
  timelineMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  timelineMarkerComplete: {
    backgroundColor: "#4D6169",
  },
  timelineMarkerActive: {
    backgroundColor: "#D6E4E8",
    borderWidth: 1,
    borderColor: "#B7CBD1",
  },
  timelineMarkerPending: {
    backgroundColor: "#E5E7EB",
  },
  timelineMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4D6169",
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 4,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: P.text,
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 14,
    color: P.soft,
  },
  timelineNoteCard: {
    marginTop: 10,
    backgroundColor: "#F1F4F6",
    borderRadius: 12,
    padding: 12,
  },
  timelineNoteText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#4B5563",
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  supportAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#4D6169",
    alignItems: "center",
    justifyContent: "center",
  },
  supportAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  supportContent: {
    flex: 1,
    gap: 2,
  },
  supportName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  supportRole: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4D6169",
  },
  supportNote: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },
  activityList: {
    gap: 10,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8EFF2",
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  activityEmptyState: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activityEmptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6B7280",
  },
  jobStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  jobStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  jobStatusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  completionSubtitle: {
    fontSize: 13,
    color: P.muted,
    marginBottom: 12,
    lineHeight: 19,
  },
  rejectionNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: P.dangerBg,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9B7B0",
  },
  rejectionNoticeText: {
    flex: 1,
    fontSize: 13,
    color: P.dangerText,
    lineHeight: 19,
  },
  jobInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    columnGap: 16,
    marginBottom: 12,
  },
  jobInfoItem: {
    flexBasis: "48%",
    minWidth: 140,
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: P.border,
  },
  jobInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 1,
  },
  jobInfoValue: {
    fontSize: 14,
    color: P.text,
  },
  jobNotes: {
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.border,
  },
  jobNotesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: P.text,
    marginBottom: 4,
  },
  jobNotesText: {
    fontSize: 13,
    color: P.muted,
    lineHeight: 19,
  },
  reviewCompletionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  reviewCompletionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  jobCompletionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: P.successBg,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#CBE7D5",
  },
  jobCompletionInfoText: {
    flex: 1,
    fontSize: 13,
    color: P.successText,
    lineHeight: 19,
  },
  estimateMeta: {
    fontSize: 12,
    color: P.soft,
    marginBottom: 8,
  },
  estimateNotes: {
    fontSize: 13,
    color: P.muted,
    marginBottom: 12,
    lineHeight: 19,
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: P.border,
  },
  estimateItems: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: P.border,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  estimateItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  estimateItemInfo: {
    flex: 1,
  },
  estimateItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: P.text,
    marginBottom: 2,
  },
  estimateItemDescription: {
    fontSize: 12,
    color: P.soft,
    lineHeight: 19,
  },
  estimateItemAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: P.text,
  },
  estimateTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: P.border,
    paddingTop: 12,
    marginTop: 4,
  },
  estimateTotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: P.text,
  },
  estimateTotalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: P.text,
  },
  estimateActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  estimateActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 16,
  },
  estimateDecline: {
    backgroundColor: P.dangerBg,
    borderWidth: 1,
    borderColor: "#E9B7B0",
  },
  estimateApprove: {
    backgroundColor: P.primary,
  },
  estimateDeclineText: {
    fontSize: 14,
    fontWeight: "600",
    color: P.dangerText,
  },
  estimateApproveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  estimateStatusBanner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: P.border,
  },
  estimateStatusText: {
    flex: 1,
    fontSize: 13,
    color: P.muted,
    lineHeight: 19,
  },
  additionalCostSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  additionalCostChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: P.successBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  additionalCostChipPending: {
    backgroundColor: P.warningBg,
  },
  additionalCostChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.successText,
  },
  additionalCostList: {
    gap: 16,
  },
  additionalCostItem: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    padding: 14,
    backgroundColor: P.surfaceLow,
    gap: 12,
  },
  additionalCostHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  additionalCostTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: P.text,
    marginBottom: 2,
  },
  additionalCostMeta: {
    fontSize: 12,
    color: P.soft,
  },
  additionalCostAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: P.text,
  },
  additionalCostStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  additionalCostStatusText: {
    flex: 1,
    fontSize: 12,
    color: P.muted,
    lineHeight: 19,
  },
  contactPhone: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  preferredTime: {
    marginTop: 4,
  },
  preferredTimeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  preferredTimeValue: {
    fontSize: 14,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  editForm: {
    gap: 16,
  },
  editHero: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: P.surfaceLow,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  editHeroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: P.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  editHeroCopy: {
    flex: 1,
    gap: 4,
  },
  editHeroTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: P.text,
  },
  editHeroText: {
    fontSize: 13,
    lineHeight: 19,
    color: P.muted,
  },
  editContextRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  editContextChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
  },
  editContextChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.text,
    textTransform: "capitalize",
  },
  readOnlyNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: P.accent,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.accentBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  readOnlyNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: P.warningText,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  editCategoryRail: {
    gap: 10,
  },
  editCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
  },
  editCategoryChipSelected: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  editCategoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: P.text,
  },
  editCategoryChipTextSelected: {
    color: P.surface,
  },
  editSegmentedControl: {
    flexDirection: "row",
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.border,
    padding: 4,
    gap: 6,
  },
  editSegmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  editSegmentItemSelected: {
    backgroundColor: P.surface,
  },
  editSegmentItemText: {
    fontSize: 13,
    fontWeight: "600",
    color: P.soft,
  },
  editSegmentItemTextSelected: {
    color: P.text,
  },
  softInput: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceLow,
    fontSize: 15,
    color: P.text,
  },
  descriptionInput: {
    minHeight: 148,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceLow,
    fontSize: 15,
    lineHeight: 22,
    color: P.text,
  },
  editInputDisabled: {
    opacity: 0.7,
  },
  editDetailsCard: {
    backgroundColor: P.accent,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: P.accentBorder,
    gap: 10,
  },
  editDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  editDetailLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  editDetailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: P.text,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
    color: P.muted,
  },
  editEmergencySignalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  editEmergencySignalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: P.dangerBg,
    borderWidth: 1,
    borderColor: "#E9B7B0",
  },
  editEmergencySignalChipSelected: {
    backgroundColor: P.dangerText,
    borderColor: P.dangerText,
  },
  editEmergencySignalText: {
    fontSize: 13,
    fontWeight: "600",
    color: P.dangerText,
  },
  editEmergencySignalTextSelected: {
    color: P.surface,
  },
  editChoiceDisabled: {
    opacity: 0.6,
  },
  editErrorText: {
    fontSize: 12,
    lineHeight: 18,
    color: P.dangerText,
  },
  editAttachmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  editAttachmentTile: {
    width: 92,
    height: 92,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: P.surfaceMid,
  },
  editAttachmentImage: {
    width: "100%",
    height: "100%",
    backgroundColor: P.surfaceMid,
  },
  editAttachmentOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: 12,
    padding: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  priorityButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  priorityButton: {
    flexBasis: "48%",
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  priorityButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  priorityButtonTextActive: {
    color: "#fff",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButtonModern: {
    flex: 1,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonTextModern: {
    fontSize: 14,
    fontWeight: "700",
    color: P.text,
  },
  saveButtonModern: {
    flex: 1.35,
    borderRadius: 18,
    overflow: "hidden",
  },
  saveButtonModernDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonTextModern: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  ratingSection: {
    alignItems: "center",
    paddingVertical: 4,
  },
  ratingPromptText: {
    fontSize: 14,
    color: P.muted,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 20,
  },
  ratingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: P.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    gap: 10,
  },
  ratingButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalRequestInfo: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  modalRequestTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  modalRequestId: {
    fontSize: 12,
    color: "#6B7280",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDeleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

