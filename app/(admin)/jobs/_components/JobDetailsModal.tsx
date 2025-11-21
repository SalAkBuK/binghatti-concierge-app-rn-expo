import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { Job } from "../../../../lib/types";
import { formatDateTime } from "../../../../lib/utils/helpers";
import { styles } from "../_styles";
import { STATUS_COLORS } from "../_constants";

interface JobDetailsModalProps {
  job: Job | null;
  pagePadding: number;
  onClose: () => void;
}

export function JobDetailsModal({ job, pagePadding, onClose }: JobDetailsModalProps) {
  return (
    <Modal
      visible={Boolean(job)}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ScrollView
          style={[styles.modalScrollView, { marginHorizontal: pagePadding }]}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="construct" size={24} color="#4338CA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{job?.title || "Job Details"}</Text>
                  {job && (
                    <Text style={styles.modalSubtitle}>Job #{job.id.slice(0, 8)}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {job ? (
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[job.status].bg }]}
              >
                <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[job.status].text }]}>
                  {job.status.toUpperCase()}
                </Text>
              </View>
            ) : null}

            <View style={styles.modalDivider} />

            {job && (
              <>
                <View style={styles.modalInfoGrid}>
                  <View style={styles.modalInfoCard}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="time-outline" size={20} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Created</Text>
                      <Text style={styles.infoValue}>{formatDateTime(job.createdAt)}</Text>
                    </View>
                  </View>

                  <View style={styles.modalInfoCard}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons
                        name={
                          job.priority === "high" || job.priority === "urgent"
                            ? "alert-circle"
                            : job.priority === "medium"
                            ? "alert"
                            : "information-circle"
                        }
                        size={20}
                        color={
                          job.priority === "high" || job.priority === "urgent"
                            ? "#DC2626"
                            : job.priority === "medium"
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
                          (job.priority === "high" || job.priority === "urgent") && { color: "#DC2626" },
                          job.priority === "medium" && { color: "#F59E0B" },
                        ]}
                      >
                        {job.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {job.requestId && (
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="link" size={18} color="#4338CA" />
                      <Text style={styles.sectionTitle}>Linked Request</Text>
                    </View>
                    <View style={styles.linkedRequestCard}>
                      <Ionicons name="document-text-outline" size={20} color="#6B7280" />
                      <Text style={styles.linkedRequestText}>
                        Request #{job.requestId.slice(0, 8)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="location" size={18} color="#4338CA" />
                    <Text style={styles.sectionTitle}>Location</Text>
                  </View>
                  <View style={styles.sectionContent}>
                    <View style={styles.detailRow}>
                      <Ionicons name="business-outline" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{job.buildingName || "Building"}</Text>
                    </View>
                    {job.unitNumber && (
                      <View style={styles.detailRow}>
                        <Ionicons name="home-outline" size={16} color="#6B7280" />
                        <Text style={styles.detailText}>Unit {job.unitNumber}</Text>
                      </View>
                    )}
                    {job.tenantName && (
                      <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={16} color="#6B7280" />
                        <Text style={styles.detailText}>{job.tenantName}</Text>
                      </View>
                    )}
                    {job.tenantPhone && (
                      <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={16} color="#6B7280" />
                        <Text style={styles.detailText}>{job.tenantPhone}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="document-text-outline" size={18} color="#4338CA" />
                    <Text style={styles.sectionTitle}>Description</Text>
                  </View>
                  <View style={styles.descriptionCard}>
                    <Text style={styles.descriptionText}>{job.description}</Text>
                  </View>
                </View>

                {(job.assignedTo || job.assignedToName || job.assignedBuildingEmployeeName) && (
                  <View style={styles.modalSection}>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="people-outline" size={18} color="#4338CA" />
                      <Text style={styles.sectionTitle}>Assignment</Text>
                    </View>
                    <View style={styles.assignmentCard}>
                      {job.assignmentTargetType === "building_employee" ? (
                        <>
                          <View style={styles.assignmentHeader}>
                            <View style={styles.assignmentTypebadge}>
                              <Ionicons name="shield-checkmark" size={14} color="#7C3AED" />
                              <Text style={styles.assignmentTypeBadgeText}>Building Staff</Text>
                            </View>
                          </View>
                          <View style={styles.assignmentDetails}>
                            <Ionicons name="person" size={18} color="#6B7280" />
                            <Text style={styles.assignmentName}>
                              {job.assignedBuildingEmployeeName || "Building Employee"}
                            </Text>
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={styles.assignmentHeader}>
                            <View style={styles.assignmentTypeBadge}>
                              <Ionicons name="business" size={14} color="#2563EB" />
                              <Text style={styles.assignmentTypeBadgeText}>Service Provider</Text>
                            </View>
                            {job.offerStatus && (
                              <View
                                style={[
                                  styles.offerStatusBadge,
                                  job.offerStatus === "accepted"
                                    ? styles.offerStatusAccepted
                                    : job.offerStatus === "rejected"
                                    ? styles.offerStatusRejected
                                    : styles.offerStatusPending,
                                ]}
                              >
                                <Text style={styles.offerStatusText}>
                                  {job.offerStatus.toUpperCase()}
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.assignmentDetails}>
                            <Ionicons name="person" size={18} color="#6B7280" />
                            <Text style={styles.assignmentName}>
                              {job.assignedToName || "Service Provider"}
                            </Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
