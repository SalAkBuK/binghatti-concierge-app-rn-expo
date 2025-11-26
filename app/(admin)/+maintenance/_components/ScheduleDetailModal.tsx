import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { MaintenanceSchedule } from "../../../../lib/types";
import { styles } from "../_styles";

interface ScheduleDetailModalProps {
  visible: boolean;
  schedule: MaintenanceSchedule | null;
  isCompact: boolean;
  getStatusColor: (status: MaintenanceSchedule["status"]) => string;
  onClose: () => void;
  onNotifyTenants: (id: string) => void;
  onCancelSchedule: (id: string) => void;
}

export function ScheduleDetailModal({
  visible,
  schedule,
  isCompact,
  getStatusColor,
  onClose,
  onNotifyTenants,
  onCancelSchedule,
}: ScheduleDetailModalProps) {
  if (!schedule) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isCompact && styles.modalContentCompact]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Schedule Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View
              style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(schedule.status) }]}
            >
              <Text style={styles.statusBadgeLargeText}>
                {schedule.status.replace("_", " ").toUpperCase()}
              </Text>
            </View>

            <Text style={styles.detailLabel}>Title</Text>
            <Text style={styles.detailValue}>{schedule.title}</Text>

            <Text style={styles.detailLabel}>Building</Text>
            <Text style={styles.detailValue}>{schedule.buildingName}</Text>

            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>
              {schedule.maintenanceType.replace("_", " ").toUpperCase()}
            </Text>

            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailValue}>{schedule.description}</Text>

            <Text style={styles.detailLabel}>Scheduled Date & Time</Text>
            <Text style={styles.detailValue}>
              {new Date(schedule.scheduledDate).toLocaleDateString()} at {schedule.scheduledTime}
            </Text>

            {schedule.duration ? (
              <>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{schedule.duration} hours</Text>
              </>
            ) : null}

            {schedule.affectedAreas?.length ? (
              <>
                <Text style={styles.detailLabel}>Affected Areas</Text>
                <Text style={styles.detailValue}>{schedule.affectedAreas.join(", ")}</Text>
              </>
            ) : null}

            {schedule.estimatedImpact ? (
              <>
                <Text style={styles.detailLabel}>Estimated Impact</Text>
                <Text style={styles.detailValue}>{schedule.estimatedImpact}</Text>
              </>
            ) : null}

            {schedule.notes ? (
              <>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{schedule.notes}</Text>
              </>
            ) : null}

            {schedule.notifiedTenants ? (
              <>
                <Text style={styles.detailLabel}>Notification Status</Text>
                <View style={styles.notificationInfo}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.notificationInfoText}>
                    Tenants notified on {schedule.notificationSentAt
                      ? new Date(schedule.notificationSentAt).toLocaleString()
                      : "N/A"}
                  </Text>
                </View>
              </>
            ) : null}

            {schedule.status === "upcoming" ? (
              <View style={styles.actionButtons}>
                {!schedule.notifiedTenants && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.notifyButton]}
                    onPress={() => onNotifyTenants(schedule.id)}
                  >
                    <Ionicons name="notifications" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Notify Tenants</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => onCancelSchedule(schedule.id)}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Cancel Schedule</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
