import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { SPECIALTY_OPTIONS } from "../_constants";
import { styles } from "../_styles";
import type { EditProviderFormState } from "../_types";

interface EditProviderModalProps {
  visible: boolean;
  formData: EditProviderFormState;
  isSaving: boolean;
  onChange: (updates: Partial<EditProviderFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function EditProviderModal({
  visible,
  formData,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: EditProviderModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.createModalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Service Provider</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Company Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter company or provider name"
                placeholderTextColor="#9CA3AF"
                value={formData.name}
                onChangeText={(name) => onChange({ name })}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Contact Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="provider@example.com"
                placeholderTextColor="#9CA3AF"
                value={formData.email}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={(email) => onChange({ email })}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Contact Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+971 XX XXX XXXX"
                placeholderTextColor="#9CA3AF"
                value={formData.phone}
                onChangeText={(phone) => onChange({ phone })}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Primary Specialty *</Text>
              <View style={styles.specialtiesGrid}>
                {SPECIALTY_OPTIONS.map((specialty) => {
                  const active = formData.specialty === specialty;
                  return (
                    <TouchableOpacity
                      key={specialty}
                      style={[styles.specialtyChip, active && styles.specialtyChipActive]}
                      onPress={() => onChange({ specialty })}
                    >
                      <Text
                        style={[styles.specialtyChipText, active && styles.specialtyChipTextActive]}
                      >
                        {specialty}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalHint}>
                Building assignments are managed separately via “Manage”.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
              onPress={onSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
