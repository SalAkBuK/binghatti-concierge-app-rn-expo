import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "../../lib/context/connected-app-provider";
import type { Job, JobAdditionalCost } from "../../lib/types";

export default function JobDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { jobs, actions } = useApp();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const job = jobs?.find((j) => j.id === id);

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

  const estimate = job.estimate;

  const handleApproveEstimate = () => {
    Alert.alert(
      "Approve Estimate",
      "Approve the employee&apos;s proposed estimate and share it with the tenant?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await actions.reviewJobEstimateAsProvider?.(job.id, "approve");
              Alert.alert("Estimate Approved", "The tenant will be notified.");
            } catch (error: any) {
              console.error("Failed to approve estimate:", error);
              Alert.alert(
                "Error",
                error?.message ||
                  "Unable to approve estimate. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleRejectEstimate = () => {
    Alert.prompt(
      "Reject Estimate",
      "Share why this estimate needs changes.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async (reason) => {
            if (!reason?.trim()) {
              Alert.alert(
                "Reason Required",
                "Please provide a reason before rejecting.",
              );
              return;
            }
            try {
              await actions.reviewJobEstimateAsProvider?.(
                job.id,
                "reject",
                reason.trim(),
              );
              Alert.alert(
                "Estimate Rejected",
                "The employee has been notified to revise the estimate.",
              );
            } catch (error: any) {
              console.error("Failed to reject estimate:", error);
              Alert.alert(
                "Error",
                error?.message ||
                  "Unable to reject estimate. Please try again.",
              );
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const handleAcceptJob = async () => {
    Alert.alert(
      "Accept Job",
      "Are you sure you want to accept this job?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              await actions.updateJob?.(job.id, { status: "assigned" });
              Alert.alert("Success", "Job accepted successfully!");
            } catch (error) {
              console.error("Failed to accept job:", error);
              Alert.alert("Error", "Failed to accept job. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleRejectJob = async () => {
    Alert.alert(
      "Reject Job",
      "Are you sure you want to reject this job? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await actions.updateJob?.(job.id, { status: "cancelled" });
              Alert.alert("Rejected", "Job has been rejected.");
              router.back();
            } catch (error) {
              console.error("Failed to reject job:", error);
              Alert.alert("Error", "Failed to reject job. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleApproveCost = (cost: JobAdditionalCost) => {
    Alert.alert(
      "Approve Cost",
      `Approve additional cost of AED ${cost.amount.toLocaleString()} for "${cost.description}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await actions.approveJobAdditionalCost?.(job.id, cost.id);
              Alert.alert("Success", "Cost approved successfully!");
            } catch (error) {
              console.error("Failed to approve additional cost:", error);
              Alert.alert(
                "Error",
                "Failed to approve additional cost. Please try again.",
              );
            }
          },
        },
      ]
    );
  };

  const handleRejectCost = (cost: JobAdditionalCost) => {
    Alert.prompt(
      "Reject Cost",
      `Provide a reason for rejecting this ${cost.amount} AED cost:`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async (reason) => {
            if (reason?.trim()) {
              try {
                await actions.rejectJobAdditionalCost?.(
                  job.id,
                  cost.id,
                  reason.trim(),
                );
                Alert.alert("Rejected", "Cost has been rejected.");
              } catch (error) {
                console.error("Failed to reject additional cost:", error);
                Alert.alert(
                  "Error",
                  "Failed to reject additional cost. Please try again.",
                );
              }
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleOverrideCompletion = () => {
    Alert.prompt(
      "Override Completion",
      "The tenant hasn&apos;t responded. Provide a reason for overriding:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Override",
          onPress: async (reason) => {
            if (reason?.trim()) {
              try {
                await actions.overrideJobCompletion?.(job.id, reason.trim());
                Alert.alert(
                  "Success",
                  "Job marked as complete without tenant approval.",
                );
              } catch (error) {
                console.error("Failed to override completion:", error);
                Alert.alert(
                  "Error",
                  "Failed to override completion. Please try again.",
                );
              }
            }
          },
        },
      ],
      "plain-text"
    );
  };

  const handleAssignEmployee = () => {
    router.push({
      pathname: "/(serviceProvider)/team",
      params: { jobId: job.id },
    });
  };

  const getStatusColor = (status: Job["status"]) => {
    switch (status) {
      case "pending": return "#F59E0B";
      case "assigned": return "#3B82F6";
      case "in-progress": return "#8B5CF6";
      case "completed": return "#10B981";
      case "cancelled": return "#EF4444";
      default: return "#94A3B8";
    }
  };

  const getPriorityColor = (priority: Job["priority"]) => {
    switch (priority) {
      case "urgent": return "#EF4444";
      case "high": return "#F59E0B";
      case "medium": return "#3B82F6";
      case "low": return "#10B981";
      default: return "#94A3B8";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Job Details</Text>
            <Text style={styles.headerSubtitle}>#{job.id}</Text>
          </View>
        </Animated.View>

        {/* Status & Priority Badges */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.badgesRow}
        >
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(job.status)}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(job.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
              {job.status.replace("-", " ").toUpperCase()}
            </Text>
          </View>
          <View style={[styles.priorityBadge, { borderColor: getPriorityColor(job.priority) }]}>
            <Ionicons name="flag" size={14} color={getPriorityColor(job.priority)} />
            <Text style={[styles.priorityText, { color: getPriorityColor(job.priority) }]}>
              {job.priority.toUpperCase()}
            </Text>
          </View>
        </Animated.View>

        {/* Job Info Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.card}
        >
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobDescription}>{job.description}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="business-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Building</Text>
              <Text style={styles.infoValue}>{job.buildingName || "N/A"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Unit</Text>
              <Text style={styles.infoValue}>{job.unitNumber || "N/A"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="calendar-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Scheduled</Text>
              <Text style={styles.infoValue}>
                {job.scheduledDate ? formatDate(job.scheduledDate) : "ASAP"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={20} color="#64748B" />
              <Text style={styles.infoLabel}>Estimated Cost</Text>
              <Text style={styles.infoValue}>
                AED {job.estimatedCost?.toLocaleString() || "N/A"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Estimate Proposal */}
        {estimate && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(250)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Pre-work Estimate</Text>
              <View
                style={[
                  styles.estimateStatusBadge,
                  estimate.status === "sp_approved"
                    ? { backgroundColor: "#DBEAFE" }
                    : estimate.status === "sp_rejected"
                    ? { backgroundColor: "#FEE2E2" }
                    : estimate.status === "tenant_approved"
                    ? { backgroundColor: "#DCFCE7" }
                    : estimate.status === "tenant_declined"
                    ? { backgroundColor: "#FEE2E2" }
                    : { backgroundColor: "#FEF3C7" },
                ]}
              >
                <Text
                  style={[
                    styles.estimateStatusText,
                    estimate.status === "sp_approved"
                      ? { color: "#1D4ED8" }
                      : estimate.status === "sp_rejected" ||
                        estimate.status === "tenant_declined"
                      ? { color: "#B91C1C" }
                      : estimate.status === "tenant_approved"
                      ? { color: "#166534" }
                      : { color: "#92400E" },
                  ]}
                >
                  {estimate.status === "submitted"
                    ? "Awaiting your review"
                    : estimate.status === "sp_approved"
                    ? "Approved · Awaiting tenant"
                    : estimate.status === "sp_rejected"
                    ? "Rejected"
                    : estimate.status === "tenant_approved"
                    ? "Tenant approved"
                    : estimate.status === "tenant_declined"
                    ? "Tenant declined"
                    : "Draft"}
                </Text>
              </View>
            </View>

            <View style={styles.estimateItems}>
              {estimate.items.map((item) => (
                <View key={item.id} style={styles.estimateItemRow}>
                  <View style={styles.estimateItemInfo}>
                    <Text style={styles.estimateItemLabel}>{item.label}</Text>
                    {item.description ? (
                      <Text style={styles.estimateItemDescription}>
                        {item.description}
                      </Text>
                    ) : null}
                    {item.category ? (
                      <Text style={styles.estimateItemMeta}>
                        Category: {item.category}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.estimateItemAmount}>
                    AED {item.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.estimateFooter}>
              <Text style={styles.estimateTotal}>
                Total: AED {estimate.subtotal.toLocaleString()}
              </Text>
              {estimate.notes ? (
                <Text style={styles.estimateNotes}>{estimate.notes}</Text>
              ) : null}
            </View>

            {estimate.status === "submitted" && (
              <View style={styles.estimateActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.estimateRejectButton]}
                  onPress={handleRejectEstimate}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color="#EF4444"
                  />
                  <Text style={styles.estimateRejectText}>Request Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.estimateApproveButton]}
                  onPress={handleApproveEstimate}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.estimateApproveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            )}

            {estimate.status === "sp_rejected" && estimate.rejectionReason ? (
              <View style={styles.estimateAlert}>
                <Ionicons name="alert-circle" size={16} color="#B91C1C" />
                <Text style={styles.estimateAlertText}>
                  {estimate.rejectionReason}
                </Text>
              </View>
            ) : null}

            {estimate.status === "sp_approved" && (
              <Text style={styles.estimateInfo}>
                Waiting for tenant approval before work can begin.
              </Text>
            )}
            {estimate.status === "tenant_approved" && (
              <Text style={styles.estimateInfoSuccess}>
                Tenant approved the estimate. Work can commence once ready.
              </Text>
            )}
            {estimate.status === "tenant_declined" && (
              <Text style={styles.estimateInfoWarning}>
                Tenant declined the proposal. Coordinate adjustments with your
                team.
              </Text>
            )}
          </Animated.View>
        )}

        {/* Tenant Info Card */}
        {job.tenantName && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(300)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Tenant Information</Text>
            <View style={styles.tenantInfo}>
              <View style={styles.tenantAvatar}>
                <Text style={styles.tenantAvatarText}>
                  {job.tenantName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.tenantDetails}>
                <Text style={styles.tenantName}>{job.tenantName}</Text>
                <Text style={styles.tenantContact}>
                  {job.tenantPhone || "No contact info"}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Assigned Employee Card */}
        {job.assignedToEmployeeId && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(350)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Assigned Employee</Text>
              <TouchableOpacity
                style={styles.changeEmployeeButton}
                onPress={handleAssignEmployee}
              >
                <Ionicons name="swap-horizontal" size={16} color="#2563EB" />
                <Text style={styles.changeEmployeeText}>Reassign</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.employeeInfo}>
              <View style={styles.employeeAvatar}>
                <Ionicons name="person" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.employeeDetails}>
                <Text style={styles.employeeName}>
                  {job.assignedToEmployeeName || "Unknown Employee"}
                </Text>
                <Text style={styles.employeeRole}>Field Technician</Text>
              </View>
              {job.startedAt && (
                <View style={styles.employeeStatusBadge}>
                  <View style={styles.employeeStatusDot} />
                  <Text style={styles.employeeStatusText}>Active</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Assign Employee Button for accepted jobs without employee */}
        {job.status === "assigned" && !job.assignedToEmployeeId && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(350)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Employee Assignment</Text>
            <Text style={styles.cardSubtitle}>
              This job needs to be assigned to an employee from your team.
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.assignEmployeeButton]}
              onPress={handleAssignEmployee}
            >
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Assign to Employee</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Completion Photos */}
        {job.completionPhotos && job.completionPhotos.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(380)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Completion Photos</Text>
            <Text style={styles.cardSubtitle}>
              Photos uploaded by {job.assignedToEmployeeName || "employee"}
            </Text>
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
                  <Text style={styles.photoDate}>
                    {new Date(photo.uploadedAt).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Additional Costs */}
        {job.additionalCosts && job.additionalCosts.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(410)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Additional Costs</Text>
            <View style={styles.costsList}>
              {job.additionalCosts.map((cost) => (
                <View key={cost.id} style={styles.costItem}>
                  <View style={styles.costItemHeader}>
                    <View style={styles.costItemInfo}>
                      <Text style={styles.costItemDescription}>
                        {cost.description}
                      </Text>
                      <Text style={styles.costItemMeta}>
                        {cost.category} • by {cost.employeeName}
                      </Text>
                    </View>
                    <Text style={styles.costItemAmount}>
                      AED {cost.amount.toLocaleString()}
                    </Text>
                  </View>

                  {cost.status === "pending" && (
                    <View style={styles.costItemActions}>
                      <TouchableOpacity
                        style={styles.costRejectButton}
                        onPress={() => handleRejectCost(cost)}
                      >
                        <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                        <Text style={styles.costRejectText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.costApproveButton}
                        onPress={() => handleApproveCost(cost)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.costApproveText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {cost.status === "approved" && (
                    <View style={styles.costStatusApproved}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.costStatusApprovedText}>
                        Approved {cost.approvedAt ? `on ${new Date(cost.approvedAt).toLocaleDateString()}` : ""}
                      </Text>
                    </View>
                  )}

                  {cost.status === "rejected" && (
                    <View style={styles.costStatusRejected}>
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                      <Text style={styles.costStatusRejectedText}>
                        Rejected: {cost.rejectionReason || "No reason provided"}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Provider Guidance */}
        {job.status === "assigned" && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(420)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Awaiting Technician</Text>
            <Text style={styles.cardSubtitle}>
              The assigned field employee will start this job from their
              workspace once they are on-site.
            </Text>
          </Animated.View>
        )}

        {job.status === "in-progress" && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(420)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Technician In Progress</Text>
            <Text style={styles.cardSubtitle}>
              Progress updates, photos, and completion are managed by the
              assigned employee.
            </Text>
          </Animated.View>
        )}

        {/* Override Completion - Show if job is awaiting tenant approval */}
        {job.status === "completed" && job.completionStatus === "awaiting_tenant_approval" && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(440)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Awaiting Tenant Approval</Text>
            <Text style={styles.cardSubtitle}>
              The employee has completed the job. Waiting for tenant to review and approve.
            </Text>
            <TouchableOpacity
              style={[styles.actionButton, styles.overrideButton]}
              onPress={handleOverrideCompletion}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>Override & Complete</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Actions for Pending Jobs */}
        {job.status === "pending" && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(400)}
            style={styles.actionsCard}
          >
            <Text style={styles.cardTitle}>Job Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={handleAcceptJob}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>Accept Job</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={handleRejectJob}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Completed Job Info */}
        {job.status === "completed" && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(400)}
            style={styles.completedCard}
          >
            <View style={styles.completedHeader}>
              <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              <Text style={styles.completedTitle}>Job Completed</Text>
            </View>
            {job.actualCost && (
              <View style={styles.completedInfo}>
                <Text style={styles.completedLabel}>Final Cost:</Text>
                <Text style={styles.completedValue}>
                  AED {job.actualCost.toLocaleString()}
                </Text>
              </View>
            )}
            {job.completionNotes && (
              <View style={styles.completedNotes}>
                <Text style={styles.completedLabel}>Notes:</Text>
                <Text style={styles.completedNotesText}>
                  {job.completionNotes}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "700",
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
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 20,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  infoItem: {
    width: "47%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
    marginTop: 4,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
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
  estimateItems: {
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  estimateItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
  },
  estimateItemInfo: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  estimateItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  estimateItemDescription: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 18,
  },
  estimateItemMeta: {
    fontSize: 11,
    color: "#94A3B8",
  },
  estimateItemAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  estimateFooter: {
    gap: 8,
  },
  estimateTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  estimateNotes: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  estimateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  estimateRejectButton: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F87171",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  estimateRejectText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#B91C1C",
  },
  estimateApproveButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  estimateApproveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  estimateAlert: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  estimateAlertText: {
    fontSize: 12,
    color: "#B91C1C",
  },
  estimateInfo: {
    marginTop: 12,
    fontSize: 12,
    color: "#64748B",
  },
  estimateInfoSuccess: {
    marginTop: 12,
    fontSize: 12,
    color: "#166534",
  },
  estimateInfoWarning: {
    marginTop: 12,
    fontSize: 12,
    color: "#B91C1C",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 16,
    lineHeight: 18,
  },
  tenantInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  tenantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tenantAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tenantDetails: {
    flex: 1,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  tenantContact: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  actionsCard: {
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
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: "#10B981",
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rejectButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#EF4444",
  },
  startButton: {
    backgroundColor: "#8B5CF6",
  },
  completeButton: {
    backgroundColor: "#10B981",
    marginTop: 16,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  photoButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3B82F6",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
  completionCard: {
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
  formButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  formButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelFormButton: {
    backgroundColor: "#F1F5F9",
  },
  cancelFormButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748B",
  },
  submitFormButton: {
    backgroundColor: "#10B981",
  },
  submitFormButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  completedCard: {
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
  completedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
  },
  completedInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  completedLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  completedValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  completedNotes: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  completedNotesText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 8,
    lineHeight: 20,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 280,
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
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  changeEmployeeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  changeEmployeeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  employeeInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  employeeRole: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  employeeStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
    gap: 6,
  },
  employeeStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  employeeStatusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
  },
  assignEmployeeButton: {
    backgroundColor: "#2563EB",
    marginTop: 8,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  photoCard: {
    width: "48%",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  photoImage: {
    width: "100%",
    height: 120,
  },
  photoCaption: {
    fontSize: 12,
    color: "#64748B",
    padding: 8,
    paddingBottom: 4,
  },
  photoDate: {
    fontSize: 11,
    color: "#94A3B8",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  costsList: {
    gap: 12,
  },
  costItem: {
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  costItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  costItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  costItemDescription: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  costItemMeta: {
    fontSize: 12,
    color: "#64748B",
    textTransform: "capitalize",
  },
  costItemAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  costItemActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  costRejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    gap: 6,
  },
  costRejectText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
  costApproveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#10B981",
    borderRadius: 8,
    gap: 6,
  },
  costApproveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  costStatusApproved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  costStatusApprovedText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#10B981",
  },
  costStatusRejected: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  costStatusRejectedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: "#EF4444",
  },
  overrideButton: {
    backgroundColor: "#F59E0B",
    marginTop: 8,
  },
});
