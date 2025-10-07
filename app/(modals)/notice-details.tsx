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
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApp } from "../../lib/context/connected-app-provider";
import type { MaintenanceNotice } from "../../lib/types";

export default function NoticeDetailsScreen() {
  const { selectedNotice, currentUser, actions } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: selectedNotice?.title || "",
    description: selectedNotice?.description || "",
    estimatedDuration: selectedNotice?.estimatedDuration || "",
    affectedAreas: selectedNotice?.affectedAreas?.join(", ") || "",
  });
  const [loading, setLoading] = useState(false);

  // Helper functions
  const getStatusColor = (status: MaintenanceNotice["status"]) => {
    const colors = {
      scheduled: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
      "in-progress": { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
      completed: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
      cancelled: { bg: "#F3F4F6", text: "#1F2937", border: "#E5E7EB" },
    };
    return colors[status] || colors.scheduled;
  };

  const getStatusIcon = (status: MaintenanceNotice["status"]) => {
    const icons = {
      scheduled: "calendar-outline",
      "in-progress": "sync-outline",
      completed: "checkmark-circle-outline",
      cancelled: "close-circle-outline",
    } as const;
    return icons[status] || "calendar-outline";
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

  const getProgressPercentage = (status: MaintenanceNotice["status"]) => {
    const progress = {
      scheduled: 25,
      "in-progress": 75,
      completed: 100,
      cancelled: 0,
    };
    return progress[status] || 0;
  };

  // Event handlers
  const handleDeleteNotice = async () => {
    if (!selectedNotice) return;

    setLoading(true);
    try {
      await actions.deleteNotice(selectedNotice.id);
      setShowDeleteConfirm(false);
      Alert.alert("Success", "Notice deleted successfully");
      router.back();
    } catch (err) {
      Alert.alert("Error", "Failed to delete notice");
      console.error("Error deleting notice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotice = async () => {
    if (!selectedNotice) return;

    setLoading(true);
    try {
      await actions.updateNotice(selectedNotice.id, {
        ...editForm,
        affectedAreas: editForm.affectedAreas
          .split(",")
          .map((area) => area.trim())
          .filter(Boolean),
      });
      setShowEditMode(false);
      Alert.alert("Success", "Notice updated successfully");
    } catch (err) {
      Alert.alert("Error", "Failed to update notice");
      console.error("Error updating notice:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedNotice) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="megaphone-outline"
            size={64}
            color="#D1D5DB"
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No notice selected</Text>
          <Text style={styles.emptyText}>
            Please select a notice to view its details
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

  const canEdit = currentUser?.role === "admin" || currentUser?.role === "management";
  const canDelete = canEdit && (selectedNotice.status === "scheduled" || selectedNotice.status === "cancelled");
  const statusColors = getStatusColor(selectedNotice.status);
  const statusIcon = getStatusIcon(selectedNotice.status);

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
              <Text style={styles.headerTitle}>Notice Details</Text>
              <Text style={styles.headerSubtitle}>#{selectedNotice.id}</Text>
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
          {/* Notice Header Card */}
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
                    placeholder="Notice title"
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
                    placeholder="Describe the maintenance notice"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Estimated Duration</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.estimatedDuration}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, estimatedDuration: text }))
                    }
                    placeholder="e.g., 3 hours"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Affected Areas</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.affectedAreas}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, affectedAreas: text }))
                    }
                    placeholder="e.g., Tower A, Tower B"
                  />
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
                    onPress={handleUpdateNotice}
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
                <Text style={styles.noticeTitle}>{selectedNotice.title}</Text>

                {/* Status Badge */}
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
                      {selectedNotice.status.replace("-", " ")}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressPercentage}>
                      {getProgressPercentage(selectedNotice.status)}%
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${getProgressPercentage(selectedNotice.status)}%`,
                          backgroundColor:
                            selectedNotice.status === "completed"
                              ? "#10B981"
                              : selectedNotice.status === "in-progress"
                                ? "#3B82F6"
                                : selectedNotice.status === "cancelled"
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
                      {selectedNotice.description}
                    </Text>
                  </View>
                </View>

                {/* Affected Areas */}
                {selectedNotice.affectedAreas &&
                  selectedNotice.affectedAreas.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Affected Areas</Text>
                      <View style={styles.areasContainer}>
                        {selectedNotice.affectedAreas.map((area, index) => (
                          <View key={index} style={styles.areaTag}>
                            <Ionicons name="location" size={12} color="#6B7280" />
                            <Text style={styles.areaText}>{area}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
              </View>
            )}
          </Animated.View>

          {/* Schedule Information */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(400)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.cardTitle}>Schedule</Text>
            </View>
            {selectedNotice.scheduledDate ? (
              <Text style={styles.scheduleText}>
                {formatDate(selectedNotice.scheduledDate)}
              </Text>
            ) : (
              <Text style={styles.scheduleText}>To be determined</Text>
            )}
            {selectedNotice.estimatedDuration && (
              <View style={styles.durationContainer}>
                <Text style={styles.durationLabel}>Estimated Duration:</Text>
                <Text style={styles.durationValue}>
                  {selectedNotice.estimatedDuration}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Timeline */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.cardTitle}>Timeline</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Created</Text>
              <Text style={styles.timelineValue}>
                {formatDate(selectedNotice.createdAt)}
              </Text>
            </View>
            {selectedNotice.updatedAt !== selectedNotice.createdAt && (
              <View style={styles.timelineItem}>
                <Text style={styles.timelineLabel}>Last Updated</Text>
                <Text style={styles.timelineValue}>
                  {formatDate(selectedNotice.updatedAt)}
                </Text>
              </View>
            )}
          </Animated.View>

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
            <Text style={styles.modalTitle}>Delete Notice</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this maintenance notice? This action cannot
              be undone.
            </Text>
            <View style={styles.modalNoticeInfo}>
              <Text style={styles.modalNoticeTitle}>
                {selectedNotice.title}
              </Text>
              <Text style={styles.modalNoticeId}>
                Notice #{selectedNotice.id}
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
                onPress={handleDeleteNotice}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.modalDeleteButtonText}>
                      Delete Notice
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
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
  noticeTitle: {
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
  areasContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  areaTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  areaText: {
    fontSize: 12,
    color: "#1E40AF",
    fontWeight: "500",
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
  scheduleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  durationContainer: {
    marginTop: 4,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  durationValue: {
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
  saveButtonText: {
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
  modalNoticeInfo: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  modalNoticeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  modalNoticeId: {
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