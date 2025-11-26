import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { MeterReading } from "../../../../lib/types";
import { styles } from "../_styles";

interface Props {
  reading: MeterReading | null;
  visible: boolean;
  isCompact: boolean;
  onClose: () => void;
  onVerify: (readingId: string, status: "verified" | "rejected", reason?: string) => void;
}

export function MeterReadingDetailModal({
  reading,
  visible,
  isCompact,
  onClose,
  onVerify,
}: Props) {
  if (!reading) return null;

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
            <Text style={styles.modalTitle}>Meter Reading Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.detailLabel}>Building & Unit</Text>
            <Text style={styles.detailValue}>
              {reading.buildingName} - Unit {reading.unitNumber}
            </Text>

            <Text style={styles.detailLabel}>Tenant</Text>
            <Text style={styles.detailValue}>{reading.tenantName}</Text>

            <Text style={styles.detailLabel}>Meter Type</Text>
            <Text style={styles.detailValue}>
              {reading.meterType.toUpperCase()}
            </Text>

            <Text style={styles.detailLabel}>Current Reading</Text>
            <Text style={styles.detailValue}>
              {reading.currentReading} {reading.unit}
            </Text>

            {reading.previousReading && (
              <>
                <Text style={styles.detailLabel}>Previous Reading</Text>
                <Text style={styles.detailValue}>
                  {reading.previousReading} {reading.unit}
                </Text>
              </>
            )}

            {reading.consumption && (
              <>
                <Text style={styles.detailLabel}>Consumption</Text>
                <Text style={styles.detailValue}>
                  {reading.consumption} {reading.unit}
                </Text>
              </>
            )}

            <Text style={styles.detailLabel}>Reading Date</Text>
            <Text style={styles.detailValue}>
              {new Date(reading.readingDate).toLocaleString()}
            </Text>

            <Text style={styles.detailLabel}>Submitted By</Text>
            <Text style={styles.detailValue}>{reading.submittedByName}</Text>

            {reading.photoUrl && (
              <>
                <Text style={styles.detailLabel}>Photo Verification</Text>
                <Image
                  source={{ uri: reading.photoUrl }}
                  style={styles.photoPreview}
                  resizeMode="contain"
                />
              </>
            )}

            {reading.notes && (
              <>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{reading.notes}</Text>
              </>
            )}

            {reading.status === "pending" && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => onVerify(reading.id, "verified")}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Verify</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => {
                    Alert.prompt(
                      "Reject Reading",
                      "Please provide a reason for rejection:",
                      (reason) => onVerify(reading.id, "rejected", reason)
                    );
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
