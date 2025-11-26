import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { Building, Job, Request, RequestStatus } from "../../../../lib/types";
import { formatDateTime } from "../../../../lib/utils/helpers";
import { styles } from "../_styles";

interface RequestDetailsModalProps {
  request: Request | null;
  pagePadding: number;
  buildingMap: Map<string, Building>;
  getJobForRequest: (requestId: string) => Job | undefined;
  isAdmin: boolean;
  isUpdatingStatus: boolean;
  isAssigning: boolean;
  onClose: () => void;
  onStatusUpdate: (request: Request, status: RequestStatus) => void;
  onJobStatusUpdate: (job: Job, status: Job["status"]) => void;
  onReassignProvider: () => void;
}

const requestPalette = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  "in-progress": { bg: "#DBEAFE", text: "#1D4ED8" },
  completed: { bg: "#D1FAE5", text: "#047857" },
  cancelled: { bg: "#FEE2E2", text: "#B91C1C" },
} as const;

export function RequestDetailsModal({
  request,
  pagePadding,
  buildingMap,
  getJobForRequest,
  isAdmin,
  isUpdatingStatus,
  isAssigning,
  onClose,
  onStatusUpdate,
  onJobStatusUpdate,
  onReassignProvider,
}: RequestDetailsModalProps) {
  const job = request ? getJobForRequest(request.id) : undefined;

  const renderStatusBadge = (status: RequestStatus) => {
    const colors = requestPalette[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.bg }] }>
        <Text style={[styles.statusBadgeText, { color: colors.text }]}>
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  if (!request) return null;

  return (
    <Modal
      visible={Boolean(request)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="document-text-outline" size={24} color="#4338CA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{request.title}</Text>
                  <Text style={styles.modalSubtitle}>Request #{request.id.slice(0, 8)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {renderStatusBadge(request.status)}

            <View style={styles.modalDivider} />

            <View style={styles.modalInfoGrid}>
              <View style={styles.modalInfoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="time-outline" size={20} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Submitted</Text>
                  <Text style={styles.infoValue}>{formatDateTime(request.createdAt)}</Text>
                </View>
              </View>

              <View style={styles.modalInfoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons
                    name={
                      request.priority === "high"
                        ? "alert-circle"
                        : request.priority === "medium"
                        ? "alert"
                        : "information-circle"
                    }
                    size={20}
                    color={
                      request.priority === "high"
                        ? "#DC2626"
                        : request.priority === "medium"
                        ? "#F59E0B"
                        : "#10B981"
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Priority</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      request.priority === "high" && { color: "#DC2626" },
                      request.priority === "medium" && { color: "#F59E0B" },
                    ]}
                  >
                    {request.priority.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={18} color="#4338CA" />
                <Text style={styles.sectionTitle}>Location Details</Text>
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.detailRow}>
                  <Ionicons name="business-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {buildingMap.get(request.buildingId)?.name || "Building"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="home-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    Unit {request.apartment || "-"} · {request.tower || "Tower"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{request.contactPhone || "N/A"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={18} color="#4338CA" />
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>{request.description}</Text>
              </View>
            </View>

            {request.comments && request.comments.length > 0 && (
              <View style={styles.modalSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="chatbox-ellipses-outline" size={18} color="#4338CA" />
                  <Text style={styles.sectionTitle}>Latest Comment</Text>
                </View>
                <View style={styles.commentCard}>
                  <Text style={styles.commentText}>
                    {request.comments[request.comments.length - 1]?.message}
                  </Text>
                  <Text style={styles.commentMeta}>
                    {request.comments[request.comments.length - 1]?.userName}
                  </Text>
                </View>
              </View>
            )}

            {!isAdmin && (
              <View style={styles.modalSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="refresh" size={18} color="#4338CA" />
                  <Text style={styles.sectionTitle}>Update Status</Text>
                </View>
                <View style={styles.statusGrid}>
                  {(["pending", "in-progress", "completed", "cancelled"] as RequestStatus[]).map(
                    (status) => {
                      const active = request.status === status;
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[styles.statusOption, active && styles.statusOptionActive]}
                          onPress={() => onStatusUpdate(request, status)}
                          disabled={isUpdatingStatus}
                        >
                          <Text
                            style={[
                              styles.statusOptionText,
                              active && styles.statusOptionTextActive,
                            ]}
                          >
                            {status.replace("-", " ")}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>
              </View>
            )}

            {job ? (
              <View style={styles.modalSection}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="construct" size={18} color="#4338CA" />
                  <Text style={styles.sectionTitle}>Work Order</Text>
                </View>
                <View style={styles.workOrderCard}>
                  <View style={styles.workOrderHeader}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <View style={styles.jobBadge}>
                      <Text style={styles.jobBadgeText}>{job.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  {!isAdmin && (
                    <>
                      <View style={styles.jobActionsRow}>
                        <TouchableOpacity
                          style={styles.jobActionButton}
                          onPress={() => onJobStatusUpdate(job, "in-progress")}
                        >
                          <Ionicons name="play-circle-outline" size={16} color="#4338CA" />
                          <Text style={styles.jobActionText}>In Progress</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.jobActionButton, styles.jobActionButtonPrimary]}
                          onPress={() => onJobStatusUpdate(job, "completed")}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                          <Text style={[styles.jobActionText, styles.jobActionTextPrimary]}>
                            Complete
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onReassignProvider}
                        disabled={isAssigning}
                      >
                        <Ionicons name="swap-horizontal-outline" size={16} color="#4338CA" />
                        <Text style={styles.secondaryButtonText}>Reassign Provider</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ) : (
              !isAdmin && (
                <View style={styles.modalSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="construct-outline" size={18} color="#4338CA" />
                    <Text style={styles.sectionTitle}>Work Order</Text>
                  </View>
                  <View style={styles.workOrderEmpty}>
                    <Text style={styles.descriptionText}>
                      No work order created yet. Assign a provider to create one automatically.
                    </Text>
                    <TouchableOpacity
                      style={styles.primaryButton}
                      onPress={onReassignProvider}
                      disabled={isAssigning}
                    >
                      <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>Assign Service Provider</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
