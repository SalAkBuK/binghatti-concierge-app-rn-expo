import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useMemo } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApp } from "../../lib/context/connected-app-provider";

export default function ApproveJobCompletionScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { currentUser, actions, jobs } = useApp();
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Get the job from context
  const job = useMemo(() => {
    return jobs.find((j) => j.id === jobId);
  }, [jobs, jobId]);

  if (!job) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Job not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleApproveCompletion = () => {
    Alert.alert(
      "Approve Completion",
      "Are you satisfied with the work completed? This will mark the job as completed and approved.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setSubmitting(true);
            try {
              await actions.approveTenantJobCompletion?.(
                job.id,
                approvalNotes.trim() || undefined,
              );

              Alert.alert(
                "Job Approved",
                "The job has been marked as completed and approved. Thank you!",
                [{ text: "OK", onPress: () => router.back() }],
              );
              setApprovalNotes("");
              setRejectionReason("");
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to approve job completion. Please try again."
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectCompletion = () => {
    if (!rejectionReason.trim()) {
      Alert.alert(
        "Reason Required",
        "Please provide a reason for rejecting the completion."
      );
      return;
    }

    Alert.alert(
      "Reject Completion",
      `Are you sure you want to reject this completion?\n\nReason: ${rejectionReason}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              await actions.rejectTenantJobCompletion?.(
                job.id,
                rejectionReason.trim(),
              );

              Alert.alert(
                "Completion Rejected",
                "The service provider has been notified to address your concerns.",
                [{ text: "OK", onPress: () => router.back() }],
              );
              setRejectionReason("");
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to reject completion. Please try again."
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalAdditionalCosts = job.additionalCosts?.reduce(
    (sum, cost) => sum + (cost.status === "approved" ? cost.amount : 0),
    0
  ) ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            disabled={submitting}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerText}>Review Completion</Text>
            <Text style={styles.headerSubtext}>Approve or request changes</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Job Info Card */}
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="briefcase" size={24} color="#3B82F6" />
              <Text style={styles.cardTitle}>Job Details</Text>
            </View>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <Text style={styles.jobDescription}>{job.description}</Text>
            {job.startedBy && (
              <View style={styles.infoRow}>
                <Ionicons name="person" size={16} color="#64748B" />
                <Text style={styles.infoText}>
                  Completed by: {job.assignedToEmployeeName || "Employee"}
                </Text>
              </View>
            )}
            {job.startedAt && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={16} color="#64748B" />
                <Text style={styles.infoText}>
                  Started: {formatDate(job.startedAt)}
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Completion Photos */}
          {job.completionPhotos && job.completionPhotos.length > 0 && (
            <Animated.View
              entering={FadeInDown.duration(400).delay(50)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="images" size={24} color="#10B981" />
                <Text style={styles.cardTitle}>Completion Photos</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {job.completionPhotos.length}
                  </Text>
                </View>
              </View>
              <View style={styles.photosGrid}>
                {job.completionPhotos.map((photo, index) => (
                  <View key={photo.id} style={styles.photoItem}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                    {photo.caption && (
                      <Text style={styles.photoCaption} numberOfLines={2}>
                        {photo.caption}
                      </Text>
                    )}
                    <Text style={styles.photoDate}>
                      {formatDate(photo.uploadedAt)}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Additional Costs */}
          {job.additionalCosts && job.additionalCosts.length > 0 && (
            <Animated.View
              entering={FadeInDown.duration(400).delay(100)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="cash" size={24} color="#F59E0B" />
                <Text style={styles.cardTitle}>Additional Costs</Text>
              </View>
              {job.additionalCosts.map((cost) => (
                <View key={cost.id} style={styles.costItem}>
                  <View style={styles.costHeader}>
                    <Text style={styles.costDescription}>
                      {cost.description}
                    </Text>
                    <Text style={styles.costAmount}>
                      AED {cost.amount.toLocaleString()}
                    </Text>
                  </View>
                  {cost.category && (
                    <View style={styles.costMeta}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>
                          {cost.category}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.costStatus}>
                    {cost.status === "approved" && (
                      <>
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#10B981"
                        />
                        <Text style={styles.approvedText}>
                          Approved by Service Provider
                        </Text>
                      </>
                    )}
                    {cost.status === "pending" && (
                      <>
                        <Ionicons name="time" size={16} color="#F59E0B" />
                        <Text style={styles.pendingText}>
                          Pending SP Approval
                        </Text>
                      </>
                    )}
                    {cost.status === "rejected" && (
                      <>
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color="#EF4444"
                        />
                        <Text style={styles.rejectedText}>
                          Rejected by Service Provider
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              ))}
              {totalAdditionalCosts > 0 && (
                <View style={styles.totalCostRow}>
                  <Text style={styles.totalCostLabel}>
                    Total Additional Charges:
                  </Text>
                  <Text style={styles.totalCostAmount}>
                    AED {totalAdditionalCosts.toLocaleString()}
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* Approval Notes (Optional) */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(150)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubble-outline" size={24} color="#64748B" />
              <Text style={styles.cardTitle}>Feedback (Optional)</Text>
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Add any comments or feedback about the completed work..."
              placeholderTextColor="#94A3B8"
              value={approvalNotes}
              onChangeText={setApprovalNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Rejection Reason */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
              <Text style={styles.cardTitle}>Rejection Reason</Text>
            </View>
            <Text style={styles.helperText}>
              If you're not satisfied, provide details on what needs to be
              addressed
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Explain what needs to be corrected or redone..."
              placeholderTextColor="#94A3B8"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(250)}
            style={styles.actionsContainer}
          >
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.rejectButton,
                submitting && styles.disabledButton,
              ]}
              onPress={handleRejectCompletion}
              disabled={submitting || !rejectionReason.trim()}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={
                  submitting || !rejectionReason.trim() ? "#94A3B8" : "#FFFFFF"
                }
              />
              <Text
                style={[
                  styles.actionButtonText,
                  (submitting || !rejectionReason.trim()) &&
                    styles.disabledButtonText,
                ]}
              >
                Request Changes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.approveButton,
                submitting && styles.disabledButton,
              ]}
              onPress={handleApproveCompletion}
              disabled={submitting}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={submitting ? "#94A3B8" : "#FFFFFF"}
              />
              <Text
                style={[
                  styles.actionButtonText,
                  submitting && styles.disabledButtonText,
                ]}
              >
                Approve & Complete
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    alignItems: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  headerSubtext: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
  },
  badge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3B82F6",
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoItem: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  photoImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#E2E8F0",
  },
  photoCaption: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1E293B",
    padding: 8,
    paddingBottom: 4,
  },
  photoDate: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  costItem: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  costHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  costDescription: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
    marginRight: 12,
  },
  costAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F59E0B",
  },
  costMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
    textTransform: "capitalize",
  },
  costStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  approvedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  pendingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F59E0B",
  },
  rejectedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  totalCostRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#FDE68A",
  },
  totalCostLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  totalCostAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F59E0B",
  },
  helperText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 12,
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minHeight: 100,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectButton: {
    backgroundColor: "#EF4444",
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  disabledButton: {
    backgroundColor: "#F1F5F9",
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  disabledButtonText: {
    color: "#94A3B8",
  },
});
