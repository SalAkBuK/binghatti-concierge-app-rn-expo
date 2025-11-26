import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { BroadcastApiService } from "../../../../lib/services/api/broadcast";
import type { Announcement } from "../../../../lib/types";
import { getPriorityColor, getStatusColor } from "../_constants";
import { styles } from "../_styles";

const broadcastService = new BroadcastApiService();

interface Props {
  announcement: Announcement | null;
  visible: boolean;
  isCompact: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function AnnouncementDetailsModal({
  announcement,
  visible,
  isCompact,
  onClose,
  onRefresh,
}: Props) {
  if (!announcement) return null;

  const handleCancelScheduled = async () => {
    Alert.alert(
      "Cancel Scheduled Announcement",
      "Are you sure you want to cancel this scheduled announcement?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await broadcastService.cancelScheduledAnnouncement(announcement.id);
              if (response.success) {
                Alert.alert("Success", "Scheduled announcement cancelled");
                onClose();
                onRefresh();
              }
            } catch (error) {
              console.error("Failed to cancel announcement:", error);
              Alert.alert("Error", "Failed to cancel announcement");
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, isCompact && styles.modalContentCompact]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Announcement Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View
              style={[
                styles.statusBadgeLarge,
                { backgroundColor: getStatusColor(announcement.status) },
              ]}
            >
              <Text style={styles.statusBadgeLargeText}>
                {announcement.status.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.detailLabel}>Title</Text>
            <Text style={styles.detailValue}>{announcement.title}</Text>

            <Text style={styles.detailLabel}>Message</Text>
            <Text style={styles.detailValue}>{announcement.body}</Text>

            <Text style={styles.detailLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: getPriorityColor(announcement.priority) },
                ]}
              />
              <Text style={styles.detailValue}>
                {announcement.priority.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.detailLabel}>Target Audience</Text>
            <Text style={styles.detailValue}>
              {announcement.targetType === "all_tenants"
                ? "All Tenants"
                : announcement.targetType === "building"
                  ? `${announcement.targetBuildingIds?.length || 0} Building(s)`
                  : announcement.targetType}
            </Text>

            {announcement.sentAt && (
              <>
                <Text style={styles.detailLabel}>Sent At</Text>
                <Text style={styles.detailValue}>
                  {new Date(announcement.sentAt).toLocaleString()}
                </Text>
              </>
            )}

            {announcement.scheduledFor && !announcement.sentAt && (
              <>
                <Text style={styles.detailLabel}>Scheduled For</Text>
                <Text style={styles.detailValue}>
                  {new Date(announcement.scheduledFor).toLocaleString()}
                </Text>
              </>
            )}

            {announcement.deliveryStats && (
              <>
                <Text style={styles.detailLabel}>Delivery Statistics</Text>
                <View style={styles.deliveryStatsGrid}>
                  <View style={styles.deliveryStatCard}>
                    <Text style={styles.deliveryStatValue}>
                      {announcement.deliveryStats.sent}
                    </Text>
                    <Text style={styles.deliveryStatLabel}>Sent</Text>
                  </View>
                  <View style={styles.deliveryStatCard}>
                    <Text style={styles.deliveryStatValue}>
                      {announcement.deliveryStats.delivered}
                    </Text>
                    <Text style={styles.deliveryStatLabel}>Delivered</Text>
                  </View>
                  <View style={styles.deliveryStatCard}>
                    <Text style={styles.deliveryStatValue}>
                      {announcement.deliveryStats.read}
                    </Text>
                    <Text style={styles.deliveryStatLabel}>Read</Text>
                  </View>
                  <View style={styles.deliveryStatCard}>
                    <Text style={[styles.deliveryStatValue, styles.failedText]}>
                      {announcement.deliveryStats.failed}
                    </Text>
                    <Text style={styles.deliveryStatLabel}>Failed</Text>
                  </View>
                </View>
              </>
            )}

            {announcement.status === "scheduled" && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={handleCancelScheduled}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Cancel Schedule</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
