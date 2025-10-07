import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApp } from "../../lib/context/connected-app-provider";
import type { Request } from "../../lib/types";
import { ImageViewer } from "../../components/ui/ImageViewer";


export default function RequestDetailsScreen() {
  const { selectedRequest, actions } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: selectedRequest?.title || "",
    description: selectedRequest?.description || "",
    priority: selectedRequest?.priority || ("medium" as const),
  });
  const [feedback, setFeedback] = useState({
    rating: 0,
    comment: "",
  });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Helper functions
  const getStatusColor = (status: Request["status"]) => {
    const colors = {
      pending: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
      "in-progress": { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
      completed: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
      cancelled: { bg: "#F3F4F6", text: "#1F2937", border: "#E5E7EB" },
    };
    return colors[status] || colors.pending;
  };

  const getPriorityColor = (priority: Request["priority"]) => {
    const colors = {
      low: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
      medium: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
      high: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
      urgent: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
    };
    return colors[priority] || colors.medium;
  };

  const getStatusIcon = (status: Request["status"]) => {
    const icons = {
      pending: "time-outline",
      "in-progress": "sync-outline",
      completed: "checkmark-circle-outline",
      cancelled: "close-circle-outline",
    } as const;
    return icons[status] || "time-outline";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProgressPercentage = (status: Request["status"]) => {
    const progress = {
      pending: 25,
      "in-progress": 75,
      completed: 100,
      cancelled: 0,
    };
    return progress[status] || 0;
  };

  // Event handlers
  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      await actions.deleteRequest(selectedRequest.id);
      setShowDeleteConfirm(false);
      Alert.alert("Success", "Request deleted successfully");
      router.back();
    } catch (err) {
      Alert.alert("Error", "Failed to delete request");
      console.error("Error deleting request:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      await actions.updateRequest(selectedRequest.id, editForm);
      setShowEditMode(false);
      Alert.alert("Success", "Request updated successfully");
    } catch (err) {
      Alert.alert("Error", "Failed to update request");
      console.error("Error updating request:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (feedback.rating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    try {
      // In a real app, this would submit feedback to the server
      console.log("Submitting feedback:", feedback);
      Alert.alert("Success", "Thank you for your feedback!");
      setShowFeedbackForm(false);
      setFeedback({ rating: 0, comment: "" });
    } catch (err) {
      Alert.alert("Error", "Failed to submit feedback");
      console.error("Error submitting feedback:", err);
    }
  };

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

  const canEdit = selectedRequest.status === "pending";
  const canDelete =
    selectedRequest.status === "pending" ||
    selectedRequest.status === "cancelled";
  const canProvideFeedback = selectedRequest.status === "completed";
  const statusColors = getStatusColor(selectedRequest.status);
  const priorityColors = getPriorityColor(selectedRequest.priority);
  const statusIcon = getStatusIcon(selectedRequest.status);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Request Details</Text>
              <Text style={styles.headerSubtitle}>#{selectedRequest.id}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {canEdit && (
              <TouchableOpacity
                onPress={() => setShowEditMode(true)}
                style={styles.editButton}
              >
                <Ionicons name="pencil" size={20} color="#2563EB" />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(true)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Request Header Card */}
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.card}
          >
            {showEditMode ? (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Title</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.title}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, title: text }))
                    }
                    placeholder="Request title"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editForm.description}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, description: text }))
                    }
                    placeholder="Describe your request"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Priority</Text>
                  <View style={styles.priorityButtons}>
                    {(["low", "medium", "high", "urgent"] as const).map(
                      (priority) => (
                        <TouchableOpacity
                          key={priority}
                          onPress={() =>
                            setEditForm((prev) => ({ ...prev, priority }))
                          }
                          style={[
                            styles.priorityButton,
                            editForm.priority === priority &&
                              styles.priorityButtonActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.priorityButtonText,
                              editForm.priority === priority &&
                                styles.priorityButtonTextActive,
                            ]}
                          >
                            {priority.charAt(0).toUpperCase() +
                              priority.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </View>

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowEditMode(false)}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleUpdateRequest}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.requestTitle}>{selectedRequest.title}</Text>

                {/* Status Badges */}
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
                    <Ionicons
                      name={statusIcon}
                      size={14}
                      color={statusColors.text}
                    />
                    <Text
                      style={[styles.badgeText, { color: statusColors.text }]}
                    >
                      {selectedRequest.status.replace("-", " ")}
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
                    <Text
                      style={[
                        styles.badgeText,
                        { color: priorityColors.text },
                      ]}
                    >
                      {selectedRequest.priority}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: "#1F2937" }]}>
                      {selectedRequest.type}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressPercentage}>
                      {getProgressPercentage(selectedRequest.status)}%
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${getProgressPercentage(selectedRequest.status)}%`,
                          backgroundColor:
                            selectedRequest.status === "completed"
                              ? "#10B981"
                              : selectedRequest.status === "in-progress"
                                ? "#3B82F6"
                                : selectedRequest.status === "cancelled"
                                  ? "#9CA3AF"
                                  : "#F59E0B",
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText}>
                      {selectedRequest.description}
                    </Text>
                  </View>
                </View>

                {/* Additional Notes */}
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

                {/* Attachments */}
                {selectedRequest.attachments &&
                  selectedRequest.attachments.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        Photos ({selectedRequest.attachments.length})
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.attachmentsScroll}
                      >
                        {selectedRequest.attachments.map((attachment, index) => (
                          <TouchableOpacity
                            key={index}
                            style={styles.attachmentImageContainer}
                            onPress={() => {
                              setSelectedImageIndex(index);
                              setShowImageViewer(true);
                            }}
                          >
                            <Image
                              source={{ uri: attachment }}
                              style={styles.attachmentImage}
                              resizeMode="cover"
                            />
                            <View style={styles.attachmentOverlay}>
                              <Ionicons
                                name="expand-outline"
                                size={20}
                                color="#FFFFFF"
                              />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
              </View>
            )}
          </Animated.View>

          {/* Location Information */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(400)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="location-outline" size={20} color="#6B7280" />
              <Text style={styles.cardTitle}>Location</Text>
            </View>
            <Text style={styles.locationText}>
              {selectedRequest.apartment}, {selectedRequest.tower}
            </Text>
            <Text style={styles.locationSubtext}>
              Binghatti Apartment Complex
            </Text>
          </Animated.View>

          {/* Timeline */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.cardTitle}>Timeline</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Created</Text>
              <Text style={styles.timelineValue}>
                {formatDate(selectedRequest.createdAt)}
              </Text>
            </View>
            {selectedRequest.updatedAt !== selectedRequest.createdAt && (
              <View style={styles.timelineItem}>
                <Text style={styles.timelineLabel}>Last Updated</Text>
                <Text style={styles.timelineValue}>
                  {formatDate(selectedRequest.updatedAt)}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Contact Information */}
          {selectedRequest.contactPhone && (
            <Animated.View
              entering={FadeInDown.delay(150).duration(400)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="call-outline" size={20} color="#6B7280" />
                <Text style={styles.cardTitle}>Contact Information</Text>
              </View>
              <Text style={styles.contactPhone}>
                {selectedRequest.contactPhone}
              </Text>
              {selectedRequest.preferredTime && (
                <View style={styles.preferredTime}>
                  <Text style={styles.preferredTimeLabel}>
                    Preferred Time:
                  </Text>
                  <Text style={styles.preferredTimeValue}>
                    {selectedRequest.preferredTime}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Rating Section */}
          {canProvideFeedback && (
            <Animated.View
              entering={FadeInDown.delay(200).duration(400)}
              style={styles.card}
            >
              <View style={styles.ratingSection}>
                <Text style={styles.sectionTitle}>Rate This Service</Text>
                <Text style={styles.ratingPromptText}>
                  How was your experience with this request?
                </Text>
                <TouchableOpacity
                  style={styles.ratingButton}
                  onPress={() => {
                    // Check if rating already exists
                    const existingRating = actions.getRatingByRequestId(selectedRequest.id);
                    if (existingRating) {
                      // Navigate to ratings screen to view existing rating
                      router.push("/(tabs)/my-ratings");
                    } else {
                      // Navigate to submit rating modal
                      router.push({
                        pathname: "/(modals)/submit-rating",
                        params: {
                          requestId: selectedRequest.id,
                          serviceProviderId: selectedRequest.assignedTo || "default-provider",
                          requestTitle: selectedRequest.title,
                          serviceProviderName: "Service Provider",
                        },
                      });
                    }
                  }}
                >
                  <Ionicons name="star-outline" size={20} color="#fff" />
                  <Text style={styles.ratingButtonText}>
                    {actions.getRatingByRequestId(selectedRequest.id)
                      ? "View Your Rating"
                      : "Leave a Rating"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.modalContent}
          >
            <View style={styles.modalIcon}>
              <Ionicons name="trash-outline" size={32} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Delete Request</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this request? This action cannot
              be undone.
            </Text>
            <View style={styles.modalRequestInfo}>
              <Text style={styles.modalRequestTitle}>
                {selectedRequest.title}
              </Text>
              <Text style={styles.modalRequestId}>
                Request #{selectedRequest.id}
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleDeleteRequest}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.modalDeleteButtonText}>
                      Delete Request
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Image Viewer */}
      {selectedRequest && selectedRequest.attachments.length > 0 && (
        <ImageViewer
          images={selectedRequest.attachments}
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
    backgroundColor: "#F9FAFB",
  },
  keyboardAvoidingView: {
    flex: 1,
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
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
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
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  progressPercentage: {
    fontSize: 14,
    color: "#6B7280",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
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
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  descriptionBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  notesBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
  },
  notesText: {
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
  },
  attachmentsScroll: {
    marginTop: 12,
  },
  attachmentImageContainer: {
    position: "relative",
    marginRight: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  attachmentImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  attachmentOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 16,
    padding: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
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
  timelineLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 14,
    color: "#6B7280",
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
    gap: 8,
  },
  priorityButton: {
    flex: 1,
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
    paddingVertical: 8,
  },
  ratingPromptText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    textAlign: "center",
  },
  ratingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#356FEC",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
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
    flexDirection: "row",
    gap: 8,
  },
  modalDeleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
