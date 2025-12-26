import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import type { Building } from "../../../../lib/types";
import { SPECIALTY_OPTIONS } from "../_constants";
import { styles } from "../_styles";
import type { CreateProviderFormState } from "../_types";

interface CreateProviderModalProps {
  visible: boolean;
  buildings: Building[];
  formData: CreateProviderFormState;
  isCreating: boolean;
  onChange: (updates: Partial<CreateProviderFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function CreateProviderModal({
  visible,
  buildings,
  formData,
  isCreating,
  onChange,
  onClose,
  onSubmit,
}: CreateProviderModalProps) {
  const toggleBuilding = (buildingId: string) => {
    const buildingIds = formData.buildingIds.includes(buildingId)
      ? formData.buildingIds.filter((id) => id !== buildingId)
      : [...formData.buildingIds, buildingId];
    onChange({ buildingIds });
  };

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
            <Text style={styles.modalTitle}>Add Service Provider</Text>
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
                onChangeText={(name) => onChange({ name, companyName: name })}
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
              <Text style={styles.modalLabel}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Temporary password"
                placeholderTextColor="#9CA3AF"
                value={formData.password}
                onChangeText={(password) => onChange({ password })}
                autoCapitalize="none"
                secureTextEntry
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
              <Text style={styles.modalLabel}>Job Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Lead Technician"
                placeholderTextColor="#9CA3AF"
                value={formData.jobTitle}
                onChangeText={(jobTitle) => onChange({ jobTitle })}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Skills</Text>
              <Text style={styles.modalHint}>Select key skills (single selection for now)</Text>
              <View style={styles.specialtiesGrid}>
                {SPECIALTY_OPTIONS.map((skill) => {
                  const active = formData.skills === skill;
                  return (
                    <TouchableOpacity
                      key={skill}
                      style={[styles.specialtyChip, active && styles.specialtyChipActive]}
                      onPress={() => onChange({ skills: active ? "" : skill })}
                    >
                      <Text
                        style={[styles.specialtyChipText, active && styles.specialtyChipTextActive]}
                      >
                        {skill}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Street, City"
                placeholderTextColor="#9CA3AF"
                value={formData.address}
                onChangeText={(address) => onChange({ address })}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Nationality</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., UAE"
                placeholderTextColor="#9CA3AF"
                value={formData.nationality}
                onChangeText={(nationality) => onChange({ nationality })}
              />
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Initial Buildings</Text>
              <Text style={styles.modalHint}>
                Select buildings this provider will have access to (optional)
              </Text>
              <View style={styles.buildingsGrid}>
                {buildings.map((building) => {
                  const active = formData.buildingIds.includes(building.id);
                  return (
                    <TouchableOpacity
                      key={building.id}
                      style={[styles.buildingChip, active && styles.buildingChipActive]}
                      onPress={() => toggleBuilding(building.id)}
                    >
                      <Ionicons
                        name={active ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={active ? "#2563EB" : "#9CA3AF"}
                      />
                      <Text
                        style={[styles.buildingChipText, active && styles.buildingChipTextActive]}
                      >
                        {building.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.primaryButton, isCreating && styles.primaryButtonDisabled]}
              onPress={onSubmit}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Create Provider</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
