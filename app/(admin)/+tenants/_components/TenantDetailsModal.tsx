import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";

import type { Building, User } from "../../../../lib/types";
import { styles } from "../_styles";

interface Props {
  tenant: User | null;
  visible: boolean;
  pagePadding: number;
  buildingMap: Map<string, Building>;
  onClose: () => void;
}

export function TenantDetailsModal({
  tenant,
  visible,
  pagePadding,
  buildingMap,
  onClose,
}: Props) {
  if (!tenant) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { marginHorizontal: pagePadding }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{tenant.name || "Tenant"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <Text style={styles.sectionText}>
              {tenant.email || "Email unavailable"}
            </Text>
            <Text style={styles.sectionText}>
              {tenant.profile?.phone || "Phone unavailable"}
            </Text>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.sectionTitle}>Residence</Text>
            <Text style={styles.sectionText}>
              Unit {tenant.profile?.apartment || "-"} ·{" "}
              {tenant.profile?.tower || "Tower"}
            </Text>
            {tenant.profile?.buildingId && (
              <Text style={styles.sectionText}>
                {buildingMap.get(tenant.profile.buildingId)?.name || "Building"}
              </Text>
            )}
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            <Text style={styles.sectionText}>
              {tenant.profile?.emergencyContact || "Not provided"}
            </Text>
            <Text style={styles.sectionText}>
              {tenant.profile?.emergencyPhone || "Not provided"}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
