import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useApp } from "../../lib/context/connected-app-provider";
import type { Job } from "../../lib/types";

export default function EmployeeJobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser, actions, jobs } = useApp();
  const { width } = useWindowDimensions();

  const job = jobs.find((j) => j.id === id);

  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [costAmount, setCostAmount] = useState("");
  const [costDescription, setCostDescription] = useState("");
  const [costCategory, setCostCategory] = useState<"parts" | "labor" | "materials" | "other">("parts");
  const [completionNotes, setCompletionNotes] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [estimateItemsDraft, setEstimateItemsDraft] = useState<
    {
      label: string;
      amount: string;
      description: string;
      category: "labor" | "parts" | "materials" | "fees" | "other";
    }[]
  >([]);
  const [estimateNotes, setEstimateNotes] = useState("");
  const [estimateLabelInput, setEstimateLabelInput] = useState("");
  const [estimateAmountInput, setEstimateAmountInput] = useState("");
  const [estimateDescriptionInput, setEstimateDescriptionInput] = useState("");
  const [estimateCategoryInput, setEstimateCategoryInput] = useState<
    "labor" | "parts" | "materials" | "fees" | "other"
  >("labor");

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Job Not Found</Text>
            <Text style={styles.errorText}>
              The job you&apos;re looking for doesn&apos;t exist or has been removed.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Check if employee is assigned to this job
  if (job.assignedToEmployeeId !== currentUser?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
          <View style={styles.errorContainer}>
            <Ionicons name="lock-closed-outline" size={64} color="#F59E0B" />
            <Text style={styles.errorTitle}>Access Denied</Text>
            <Text style={styles.errorText}>
              This job is not assigned to you.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const estimate = job.estimate;
  const canSubmitEstimate =
    (job.status === "assigned" || job.status === "pending") &&
    (estimate?.status === undefined ||
      estimate.status === "draft" ||
      estimate.status === "submitted" ||
      estimate.status === "sp_rejected");

  const initialiseEstimateForm = () => {
    setEstimateItemsDraft(
      estimate?.items?.map((item) => ({
        label: item.label,
        amount: item.amount.toString(),
        description: item.description ?? "",
        category: item.category ?? "labor",
      })) ?? [],
    );
    setEstimateNotes(estimate?.notes ?? "");
    setEstimateLabelInput("");
    setEstimateAmountInput("");
    setEstimateDescriptionInput("");
    setEstimateCategoryInput("labor");
    setShowEstimateModal(true);
  };

  const handleAddEstimateLine = () => {
    if (!estimateLabelInput.trim() || !estimateAmountInput.trim()) {
      Alert.alert(
        "Missing Information",
        "Please provide both a label and amount for the estimate item.",
      );
      return;
    }

    const amountValue = parseFloat(estimateAmountInput);
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      Alert.alert("Invalid Amount", "Enter a valid amount greater than zero.");
      return;
    }

    setEstimateItemsDraft((prev) => [
      ...prev,
      {
        label: estimateLabelInput.trim(),
        amount: amountValue.toString(),
        description: estimateDescriptionInput.trim(),
        category: estimateCategoryInput,
      },
    ]);
    setEstimateLabelInput("");
    setEstimateAmountInput("");
    setEstimateDescriptionInput("");
    setEstimateCategoryInput("labor");
  };

  const handleRemoveEstimateItem = (index: number) => {
    setEstimateItemsDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmitEstimate = async () => {
    if (!estimateItemsDraft.length) {
      Alert.alert(
        "Add Estimate Items",
        "Include at least one line item before submitting.",
      );
      return;
    }

    const payloadItems = estimateItemsDraft.map((item) => ({
      label: item.label,
      amount: parseFloat(item.amount),
      description: item.description || undefined,
      category: item.category,
    }));

    if (payloadItems.some((item) => !item.label || item.amount <= 0)) {
      Alert.alert(
        "Invalid Estimate",
        "Ensure all items have valid labels and positive amounts.",
      );
      return;
    }

    try {
      await actions.submitJobEstimate?.(job.id, {
        items: payloadItems,
        notes: estimateNotes.trim() || undefined,
      });
      Alert.alert(
        "Estimate Submitted",
        "The service provider will review your proposal.",
      );
      setShowEstimateModal(false);
    } catch (error: any) {
      console.error("Failed to submit job estimate:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to submit estimate. Please try again.",
      );
    }
  };

  const handleStartJob = () => {
    Alert.alert(
      "Start Job",
      `Are you ready to start working on this job?\n\n${job.title}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          style: "default",
          onPress: async () => {
            try {
              await actions.startEmployeeJob?.(job.id);
              Alert.alert("Success", "Job started successfully!");
            } catch (error) {
              console.error("Failed to start employee job:", error);
              Alert.alert("Error", "Failed to start job. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleUploadPhoto = async () => {
    try {
      setUploadingPhoto(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please enable photo library access to upload completion photos.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const caption =
        asset.fileName ||
        `Job photo ${((job.completionPhotos?.length ?? 0) + 1)
          .toString()
          .padStart(2, "0")}`;

      await actions.uploadEmployeeJobPhoto?.(job.id, asset.uri, caption);
      Alert.alert("Photo Added", "Your completion photo has been uploaded.");
    } catch (error) {
      console.error("Failed to upload completion photo:", error);
      Alert.alert("Error", "Failed to upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddCost = () => {
    if (!costAmount || parseFloat(costAmount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }
    if (!costDescription.trim()) {
      Alert.alert("Description Required", "Please provide a description for this cost.");
      return;
    }

    Alert.alert(
      "Add Additional Cost",
      `Add AED ${parseFloat(costAmount).toLocaleString()} for ${costDescription}?\n\nThis will require approval from your service provider.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          onPress: async () => {
            try {
              await actions.addEmployeeJobAdditionalCost?.(
                job.id,
                parseFloat(costAmount),
                costDescription.trim(),
                costCategory,
              );
              Alert.alert("Success", "Cost added and sent for approval!");
              setCostAmount("");
              setCostDescription("");
              setShowAddCostModal(false);
            } catch (error) {
              console.error("Failed to add additional cost:", error);
              Alert.alert(
                "Error",
                "Failed to add additional cost. Please try again.",
              );
            }
          },
        },
      ]
    );
  };

  const handleCompleteJob = () => {
    if (!completionNotes.trim()) {
      Alert.alert("Notes Required", "Please add completion notes before submitting.");
      return;
    }

    if (!job.completionPhotos || job.completionPhotos.length === 0) {
      Alert.alert(
        "Photos Required",
        "Please upload at least one photo of the completed work before marking the job as complete.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      "Complete Job",
      "Mark this job as complete?\n\nThe tenant will be notified to review and approve the work.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            try {
              await actions.completeEmployeeJob?.(
                job.id,
                completionNotes.trim(),
              );
              Alert.alert(
                "Job Completed",
                "Great work! The tenant has been notified to review and approve the job.",
                [{ text: "OK", onPress: () => router.back() }],
              );
              setShowCompleteModal(false);
              setCompletionNotes("");
            } catch (error) {
              console.error("Failed to complete job:", error);
              Alert.alert("Error", "Failed to complete job. Please try again.");
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: Job["status"]) => {
    switch (status) {
      case "assigned":
        return "#F59E0B";
      case "in-progress":
        return "#3B82F6";
      case "completed":
        return "#10B981";
      default:
        return "#64748B";
    }
  };

  const getPriorityColor = (priority: Job["priority"]) => {
    switch (priority) {
      case "urgent":
        return "#DC2626";
      case "high":
        return "#F97316";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
      default:
        return "#64748B";
    }
  };

  const isJobNotStarted = job.status === "assigned" && !job.startedAt;
  const isJobInProgress = job.status === "in-progress";
  const isJobCompleted = job.status === "completed";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Status Badge */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(100)}
          style={styles.statusContainer}
        >
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(job.status)}15` },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(job.status) },
              ]}
            />
            <Text
              style={[styles.statusText, { color: getStatusColor(job.status) }]}
            >
              {isJobNotStarted
                ? "Not Started"
                : job.status.charAt(0).toUpperCase() +
                  job.status.slice(1).replace("-", " ")}
            </Text>
          </View>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: `${getPriorityColor(job.priority)}15` },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: getPriorityColor(job.priority) },
              ]}
            >
              {job.priority.toUpperCase()} PRIORITY
            </Text>
          </View>
        </Animated.View>

        {/* Job Info Card */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(200)}
          style={styles.card}
        >
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobId}>Job ID: #{job.id.slice(0, 8)}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="business" size={20} color="#64748B" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Building</Text>
                <Text style={styles.infoValue}>
                  {job.buildingName || "N/A"}
                </Text>
              </View>
            </View>

            {job.unitNumber && (
              <View style={styles.infoItem}>
                <Ionicons name="home" size={20} color="#64748B" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Unit</Text>
                  <Text style={styles.infoValue}>{job.unitNumber}</Text>
                </View>
              </View>
            )}

            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color="#64748B" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Scheduled Date</Text>
                <Text style={styles.infoValue}>
                  {job.scheduledDate
                    ? new Date(job.scheduledDate).toLocaleDateString()
                    : "Not scheduled"}
                </Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="cash" size={20} color="#64748B" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Estimated Cost</Text>
                <Text style={styles.infoValue}>
                  AED {(job.estimatedCost || 0).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{job.description}</Text>
          </View>
        </Animated.View>

        {/* Estimate Section */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(260)}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Pre-work Estimate</Text>
            {canSubmitEstimate && (
              <TouchableOpacity
                style={styles.estimateEditButton}
                onPress={initialiseEstimateForm}
              >
                <Ionicons name="create-outline" size={16} color="#2563EB" />
                <Text style={styles.estimateEditButtonText}>
                  {estimate ? "Edit Estimate" : "Create Estimate"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {estimate ? (
            <>
              <View style={styles.estimateStatusRow}>
                <View
                  style={[
                    styles.estimateStatusBadge,
                    {
                      backgroundColor:
                        estimate.status === "tenant_approved"
                          ? "#DCFCE7"
                          : estimate.status === "sp_approved"
                          ? "#DBEAFE"
                          : estimate.status === "sp_rejected" ||
                              estimate.status === "tenant_declined"
                          ? "#FEE2E2"
                          : "#F8FAFC",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.estimateStatusText,
                      {
                        color:
                          estimate.status === "tenant_approved"
                            ? "#166534"
                            : estimate.status === "sp_approved"
                            ? "#1D4ED8"
                            : estimate.status === "sp_rejected" ||
                                estimate.status === "tenant_declined"
                            ? "#991B1B"
                            : "#334155",
                      },
                    ]}
                  >
                    {estimate.status === "submitted"
                      ? "Awaiting provider review"
                      : estimate.status === "sp_approved"
                      ? "Provider approved - awaiting tenant"
                      : estimate.status === "sp_rejected"
                      ? "Provider requested changes"
                      : estimate.status === "tenant_approved"
                      ? "Tenant approved"
                      : estimate.status === "tenant_declined"
                      ? "Tenant declined"
                      : "Draft"}
                  </Text>
                </View>
                <Text style={styles.estimateTotal}>
                  Total: AED {(estimate.subtotal || 0).toLocaleString()}
                </Text>
              </View>

              <View style={styles.estimateItems}>
                {estimate.items.map((item) => (
                  <View key={item.id} style={styles.estimateItemRow}>
                    <View style={styles.estimateItemContent}>
                      <Text style={styles.estimateItemLabel}>{item.label}</Text>
                      {item.description ? (
                        <Text style={styles.estimateItemDescription}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.estimateItemAmount}>
                      AED {(item.amount || 0).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </View>

              {estimate.notes ? (
                <View style={styles.estimateNotes}>
                  <Text style={styles.estimateNotesLabel}>Notes</Text>
                  <Text style={styles.estimateNotesText}>{estimate.notes}</Text>
                </View>
              ) : null}

              {estimate.status === "sp_rejected" && estimate.rejectionReason ? (
                <View style={styles.estimateAlert}>
                  <Ionicons name="alert-circle" size={16} color="#B91C1C" />
                  <Text style={styles.estimateAlertText}>
                    {estimate.rejectionReason}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyEstimate}>
              <Ionicons name="document-text-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyEstimateTitle}>
                No estimate submitted yet
              </Text>
              <Text style={styles.emptyEstimateSubtitle}>
                Capture the required work and costs before starting the job.
              </Text>
            </View>
          )}

          {!canSubmitEstimate && estimate?.status !== "tenant_approved" ? (
            <Text style={styles.estimateInfoText}>
              Waiting on approvals before work can begin.
            </Text>
          ) : null}
        </Animated.View>

        {/* Photos Section - Only show for in-progress and completed jobs */}
        {(isJobInProgress || isJobCompleted) && (
          <Animated.View
            entering={FadeInDown.duration(300).delay(300)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Completion Photos</Text>
              {isJobInProgress && (
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    uploadingPhoto && styles.addButtonDisabled,
                  ]}
                  onPress={handleUploadPhoto}
                  disabled={uploadingPhoto}
                >
                  <Ionicons name="camera" size={16} color="#10B981" />
                  <Text style={styles.addButtonText}>
                    {uploadingPhoto ? "Uploading..." : "Add Photo"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {!job.completionPhotos || job.completionPhotos.length === 0 ? (
              <View style={styles.emptyPhotos}>
                <Ionicons name="images-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyPhotosText}>No photos uploaded yet</Text>
                {isJobInProgress && (
                  <Text style={styles.emptyPhotosSubtext}>
                    Upload photos of completed work
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.photosGrid}>
                {job.completionPhotos.map((photo) => (
                  <View key={photo.id} style={styles.photoCard}>
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
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Additional Costs Section - Only show for in-progress and completed jobs */}
        {(isJobInProgress || isJobCompleted) && (
          <Animated.View
            entering={FadeInDown.duration(300).delay(400)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Additional Costs</Text>
              {isJobInProgress && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAddCostModal(true)}
                >
                  <Ionicons name="add-circle" size={16} color="#10B981" />
                  <Text style={styles.addButtonText}>Add Cost</Text>
                </TouchableOpacity>
              )}
            </View>

            {!job.additionalCosts || job.additionalCosts.length === 0 ? (
              <View style={styles.emptyCosts}>
                <Ionicons name="receipt-outline" size={40} color="#CBD5E1" />
                <Text style={styles.emptyCostsText}>No additional costs</Text>
              </View>
            ) : (
              <View style={styles.costsList}>
                {job.additionalCosts.map((cost) => (
                  <View key={cost.id} style={styles.costItem}>
                    <View style={styles.costHeader}>
                      <Text style={styles.costDescription}>
                        {cost.description}
                      </Text>
                      <Text style={styles.costAmount}>
                        AED {(cost.amount || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.costFooter}>
                      <Text style={styles.costCategory}>{cost.category}</Text>
                      <View
                        style={[
                          styles.costStatusBadge,
                          {
                            backgroundColor:
                              cost.status === "approved"
                                ? "#D1FAE5"
                                : cost.status === "rejected"
                                ? "#FEE2E2"
                                : "#FEF3C7",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.costStatusText,
                            {
                              color:
                                cost.status === "approved"
                                  ? "#065F46"
                                  : cost.status === "rejected"
                                  ? "#991B1B"
                                  : "#92400E",
                            },
                          ]}
                        >
                          {cost.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(500)}
          style={[styles.actionsContainer, { marginBottom: 32 }]}
        >
          {isJobNotStarted && (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                estimate &&
                  estimate.status !== "tenant_approved" &&
                  styles.primaryButtonDisabled,
              ]}
              onPress={handleStartJob}
              disabled={
                Boolean(estimate && estimate.status !== "tenant_approved")
              }
            >
              <Ionicons name="play" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Start Job</Text>
            </TouchableOpacity>
          )}

          {isJobNotStarted &&
            estimate &&
            estimate.status !== "tenant_approved" && (
              <Text style={styles.pendingEstimateText}>
                Start is disabled until the tenant approves the estimate.
              </Text>
            )}

          {isJobInProgress && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowCompleteModal(true)}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Mark as Complete</Text>
            </TouchableOpacity>
          )}

          {isJobCompleted && (
            <View style={styles.completedInfo}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.completedText}>Job Completed</Text>
              <Text style={styles.completedSubtext}>
                {job.completionStatus === "awaiting_tenant_approval"
                  ? "Waiting for tenant approval"
                  : job.completionStatus === "tenant_approved"
                  ? "Approved by tenant"
                  : "Approved by service provider"}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Estimate Modal */}
      <Modal
        visible={showEstimateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEstimateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pre-work Estimate</Text>
              <TouchableOpacity onPress={() => setShowEstimateModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalDescription}>
                Outline the materials and labor required before any work begins.
                This estimate will be reviewed by your provider and the tenant.
              </Text>

              <View style={styles.estimateItemsDraftList}>
                {estimateItemsDraft.length ? (
                  estimateItemsDraft.map((item, index) => (
                    <View key={`${item.label}-${index}`} style={styles.estimateDraftRow}>
                      <View style={styles.estimateDraftInfo}>
                        <Text style={styles.estimateDraftLabel}>{item.label}</Text>
                        <Text style={styles.estimateDraftMeta}>
                          AED {(parseFloat(item.amount) || 0).toLocaleString()} •{" "}
                          {item.category}
                        </Text>
                        {item.description ? (
                          <Text style={styles.estimateDraftDescription}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        style={styles.estimateDraftRemove}
                        onPress={() => handleRemoveEstimateItem(index)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyEstimateDraft}>
                    <Ionicons name="document-outline" size={22} color="#94A3B8" />
                    <Text style={styles.emptyEstimateDraftText}>
                      No estimate items yet
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Label</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Waterproof sealant"
                  value={estimateLabelInput}
                  onChangeText={setEstimateLabelInput}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Amount (AED)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={estimateAmountInput}
                    onChangeText={setEstimateAmountInput}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.inputLabel}>Category</Text>
                  <View style={styles.categoryChips}>
                    {["labor", "parts", "materials", "fees", "other"].map(
                      (cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.categoryChip,
                            estimateCategoryInput === cat &&
                              styles.categoryChipActive,
                          ]}
                          onPress={() =>
                            setEstimateCategoryInput(
                              cat as
                                | "labor"
                                | "parts"
                                | "materials"
                                | "fees"
                                | "other",
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              estimateCategoryInput === cat &&
                                styles.categoryChipTextActive,
                            ]}
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Provide any additional context..."
                  value={estimateDescriptionInput}
                  onChangeText={setEstimateDescriptionInput}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <TouchableOpacity
                style={styles.modalButtonSecondaryOutline}
                onPress={handleAddEstimateLine}
              >
                <Ionicons name="add-circle-outline" size={18} color="#2563EB" />
                <Text style={styles.modalButtonSecondaryOutlineText}>
                  Add Line Item
                </Text>
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Estimate Notes</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Share any recommendations or cautions..."
                  value={estimateNotes}
                  onChangeText={setEstimateNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowEstimateModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleSubmitEstimate}
              >
                <Text style={styles.modalButtonPrimaryText}>Submit Estimate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Cost Modal */}
      <Modal
        visible={showAddCostModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddCostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Additional Cost</Text>
              <TouchableOpacity onPress={() => setShowAddCostModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (AED)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={costAmount}
                  onChangeText={setCostAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="What is this cost for?"
                  multiline
                  numberOfLines={3}
                  value={costDescription}
                  onChangeText={setCostDescription}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <View style={styles.categoryChips}>
                  {["parts", "labor", "materials", "other"].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        costCategory === cat && styles.categoryChipActive,
                      ]}
                      onPress={() =>
                        setCostCategory(
                          cat as "parts" | "labor" | "materials" | "other"
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          costCategory === cat && styles.categoryChipTextActive,
                        ]}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowAddCostModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleAddCost}
              >
                <Text style={styles.modalButtonPrimaryText}>Add Cost</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Job Modal */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Job</Text>
              <TouchableOpacity onPress={() => setShowCompleteModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalDescription}>
                Add final notes about the completed work. The tenant will review your
                work and photos before approving.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Completion Notes *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe the work completed..."
                  multiline
                  numberOfLines={4}
                  value={completionNotes}
                  onChangeText={setCompletionNotes}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleCompleteJob}
              >
                <Text style={styles.modalButtonPrimaryText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  jobId: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
    marginBottom: 20,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  estimateEditButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  estimateEditButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  estimateStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  estimateStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  estimateStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  estimateTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  estimateItems: {
    gap: 12,
  },
  estimateItemRow: {
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  estimateItemContent: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  estimateItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  estimateItemDescription: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  estimateItemAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  estimateNotes: {
    marginTop: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  estimateNotesLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  estimateNotesText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  estimateAlert: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  estimateAlertText: {
    fontSize: 12,
    color: "#B91C1C",
  },
  emptyEstimate: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyEstimateTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  emptyEstimateSubtitle: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  estimateInfoText: {
    marginTop: 12,
    fontSize: 12,
    color: "#64748B",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#D1FAE5",
    borderRadius: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10B981",
  },
  emptyPhotos: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyPhotosText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 12,
  },
  emptyPhotosSubtext: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  photoCard: {
    width: "48%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  photoImage: {
    width: "100%",
    height: 120,
  },
  photoCaption: {
    fontSize: 12,
    color: "#64748B",
    padding: 8,
  },
  emptyCosts: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyCostsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 12,
  },
  costsList: {
    gap: 12,
  },
  costItem: {
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  costHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  costDescription: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginRight: 8,
  },
  costAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  costFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  costCategory: {
    fontSize: 12,
    color: "#64748B",
    textTransform: "capitalize",
  },
  costStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  costStatusText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: "#CBD5F5",
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  pendingEstimateText: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  completedInfo: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
  },
  completedText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#065F46",
    marginTop: 12,
  },
  completedSubtext: {
    fontSize: 14,
    color: "#047857",
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  backButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 500,
  },
  modalContentLarge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  categoryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryChipActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  modalButtonSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#10B981",
    alignItems: "center",
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalButtonSecondaryOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    marginBottom: 16,
  },
  modalButtonSecondaryOutlineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  estimateItemsDraftList: {
    gap: 12,
    marginBottom: 16,
  },
  estimateDraftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  estimateDraftInfo: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  estimateDraftLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  estimateDraftMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  estimateDraftDescription: {
    fontSize: 12,
    color: "#94A3B8",
  },
  estimateDraftRemove: {
    padding: 6,
  },
  emptyEstimateDraft: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    gap: 6,
  },
  emptyEstimateDraftText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
});
