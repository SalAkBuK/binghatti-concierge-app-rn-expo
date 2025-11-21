import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { Parcel } from "../../../../lib/types";
import { getCourierIcon, getStatusColor } from "../_constants";
import { styles } from "../_styles";

interface Props {
  parcel: Parcel | null;
  visible: boolean;
  isCompact: boolean;
  onClose: () => void;
  onUpdateStatus: (parcelId: string, status: Parcel["status"]) => void;
}

export function ParcelDetailModal({
  parcel,
  visible,
  isCompact,
  onClose,
  onUpdateStatus,
}: Props) {
  if (!parcel) return null;

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
            <Text style={styles.modalTitle}>Parcel Details</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View
              style={[
                styles.statusBadgeLarge,
                { backgroundColor: getStatusColor(parcel.status) },
              ]}
            >
              <Text style={styles.statusBadgeLargeText}>
                {parcel.status.replace("_", " ").toUpperCase()}
              </Text>
            </View>

            <Text style={styles.detailLabel}>Unit</Text>
            <Text style={styles.detailValue}>Unit {parcel.unitNumber}</Text>

            <Text style={styles.detailLabel}>Tenant</Text>
            <Text style={styles.detailValue}>{parcel.tenantName}</Text>

            <Text style={styles.detailLabel}>Courier</Text>
            <View style={styles.courierRow}>
              <Ionicons
                name={getCourierIcon(parcel.courier) as any}
                size={20}
                color="#00796B"
              />
              <Text style={styles.detailValue}>{parcel.courier || "N/A"}</Text>
            </View>

            <Text style={styles.detailLabel}>Received By</Text>
            <Text style={styles.detailValue}>{parcel.receivedBy}</Text>

            <Text style={styles.detailLabel}>Delivery Date</Text>
            <Text style={styles.detailValue}>
              {new Date(parcel.deliveryDate).toLocaleString()}
            </Text>

            {parcel.pickupDate && (
              <>
                <Text style={styles.detailLabel}>Pickup Date</Text>
                <View style={styles.pickupInfo}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.pickupText}>
                    {new Date(parcel.pickupDate).toLocaleString()}
                  </Text>
                </View>
              </>
            )}

            {parcel.pickupCode && (
              <>
                <Text style={styles.detailLabel}>Pickup Code</Text>
                <View style={styles.pickupCodeLarge}>
                  <Ionicons name="key" size={32} color="#00796B" />
                  <Text style={styles.pickupCodeLargeText}>{parcel.pickupCode}</Text>
                </View>
              </>
            )}

            {parcel.notes && (
              <>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{parcel.notes}</Text>
              </>
            )}

            {parcel.imageUrl && (
              <>
                <Text style={styles.detailLabel}>Parcel Image</Text>
                <Image
                  source={{ uri: parcel.imageUrl }}
                  style={styles.parcelImage}
                  resizeMode="contain"
                />
              </>
            )}

            {parcel.status === "pending" && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.pickedUpButton]}
                  onPress={() => onUpdateStatus(parcel.id, "picked_up")}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark as Picked Up</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.lostButton]}
                  onPress={() => onUpdateStatus(parcel.id, "lost")}
                >
                  <Ionicons name="alert-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark as Lost</Text>
                </TouchableOpacity>
              </View>
            )}

            {parcel.status === "picked_up" && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deliveredButton]}
                  onPress={() => onUpdateStatus(parcel.id, "delivered")}
                >
                  <Ionicons name="rocket" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Mark as Delivered</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
