import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { Visitor } from "../../../../lib/types";
import { getStatusColor } from "../_constants";
import { styles } from "../_styles";

interface Props {
  visitor: Visitor | null;
  visible: boolean;
  isCompact: boolean;
  onClose: () => void;
  onCheckIn: (visitorId: string) => void;
  onCheckOut: (visitorId: string) => void;
  onCancel: (visitorId: string) => void;
}

export function VisitorDetailModal({
  visitor,
  visible,
  isCompact,
  onClose,
  onCheckIn,
  onCheckOut,
  onCancel,
}: Props) {
  if (!visitor) return null;

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
            <Text style={styles.modalTitle}>Visitor Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View
              style={[
                styles.statusBadgeLarge,
                { backgroundColor: getStatusColor(visitor.status) },
              ]}
            >
              <Text style={styles.statusBadgeLargeText}>
                {visitor.status.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.detailLabel}>Visitor Name</Text>
            <Text style={styles.detailValue}>{visitor.visitorName}</Text>

            <Text style={styles.detailLabel}>Unit</Text>
            <Text style={styles.detailValue}>Unit {visitor.unitNumber}</Text>

            <Text style={styles.detailLabel}>Phone</Text>
            <Text style={styles.detailValue}>{visitor.visitorPhone}</Text>

            <Text style={styles.detailLabel}>ID Type</Text>
            <Text style={styles.detailValue}>
              {visitor.visitorIdType.replace("_", " ").toUpperCase()}
            </Text>

            <Text style={styles.detailLabel}>ID Number</Text>
            <Text style={styles.detailValue}>{visitor.visitorIdNumber}</Text>

            {visitor.idPhotoUrl && (
              <>
                <Text style={styles.detailLabel}>ID Photo</Text>
                <Image
                  source={{ uri: visitor.idPhotoUrl }}
                  style={styles.idPhoto}
                  resizeMode="contain"
                />
              </>
            )}

            <Text style={styles.detailLabel}>Visit Purpose</Text>
            <Text style={styles.detailValue}>{visitor.visitPurpose}</Text>

            <Text style={styles.detailLabel}>Expected Arrival</Text>
            <Text style={styles.detailValue}>
              {new Date(visitor.expectedArrivalTime).toLocaleString()}
            </Text>

            <Text style={styles.detailLabel}>Expected Departure</Text>
            <Text style={styles.detailValue}>
              {new Date(visitor.expectedDepartureTime).toLocaleString()}
            </Text>

            {visitor.actualArrivalTime && (
              <>
                <Text style={styles.detailLabel}>Actual Check-In</Text>
                <View style={styles.checkInInfo}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.checkInText}>
                    {new Date(visitor.actualArrivalTime).toLocaleString()}
                    {visitor.checkedInBy && ` by ${visitor.checkedInBy}`}
                  </Text>
                </View>
              </>
            )}

            {visitor.actualDepartureTime && (
              <>
                <Text style={styles.detailLabel}>Actual Check-Out</Text>
                <View style={styles.checkOutInfo}>
                  <Ionicons name="log-out-outline" size={20} color="#9E9E9E" />
                  <Text style={styles.checkOutText}>
                    {new Date(visitor.actualDepartureTime).toLocaleString()}
                    {visitor.checkedOutBy && ` by ${visitor.checkedOutBy}`}
                  </Text>
                </View>
              </>
            )}

            <Text style={styles.detailLabel}>Visitor Code</Text>
            <View style={styles.qrCodeLarge}>
              <Ionicons name="qr-code" size={48} color="#00796B" />
              <Text style={styles.qrCodeLargeText}>{visitor.visitorCode}</Text>
            </View>

            {visitor.status === "expected" && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.checkInButton]}
                  onPress={() => onCheckIn(visitor.id)}
                >
                  <Ionicons name="log-in" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Check In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => onCancel(visitor.id)}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {visitor.status === "arrived" && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.checkOutButton]}
                  onPress={() => onCheckOut(visitor.id)}
                >
                  <Ionicons name="log-out" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Check Out</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
