import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { ServiceProviderProfile } from "../../../../lib/types";
import { styles } from "../_styles";

interface ProviderAssignmentModalProps {
  visible: boolean;
  providers: ServiceProviderProfile[];
  isAssigning: boolean;
  pagePadding: number;
  onSelect: (providerId: string) => void;
  onClose: () => void;
}

export function ProviderAssignmentModal({
  visible,
  providers,
  isAssigning,
  pagePadding,
  onSelect,
  onClose,
}: ProviderAssignmentModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.providerModal, { marginHorizontal: pagePadding }]}>
          <View style={styles.providerHeader}>
            <Text style={styles.providerTitle}>Select service provider</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 320 }}>
            {providers.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                style={styles.providerRow}
                onPress={() => onSelect(provider.userId || provider.id)}
                disabled={isAssigning}
              >
                <View>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerMeta}>
                    {provider.specialty} · {provider.jobsCompleted} jobs
                  </Text>
                </View>
                <View style={styles.providerRating}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.providerRatingText}>
                    {provider.rating.toFixed(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
