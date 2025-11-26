import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import type { Building, ServiceProviderProfile } from "../../../../lib/types";
import { SPECIALTY_OPTIONS } from "../_constants";
import { styles } from "../_styles";

interface AssignProviderModalProps {
  visible: boolean;
  provider: ServiceProviderProfile | null;
  managedBuildings: Building[];
  selectedBuildings: Set<string>;
  selectedSpecialties: string[];
  assignmentNotes: string;
  onToggleBuilding: (buildingId: string) => void;
  onToggleSpecialty: (specialty: string) => void;
  onChangeNotes: (notes: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function AssignProviderModal({
  visible,
  provider,
  managedBuildings,
  selectedBuildings,
  selectedSpecialties,
  assignmentNotes,
  onToggleBuilding,
  onToggleSpecialty,
  onChangeNotes,
  onClose,
  onSave,
}: AssignProviderModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage: {provider?.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Assign to Buildings</Text>
              <Text style={styles.modalHint}>Select which buildings this provider can service</Text>
              <View style={styles.buildingsGrid}>
                {managedBuildings.map((building) => {
                  const isSelected = selectedBuildings.has(building.id);
                  return (
                    <TouchableOpacity
                      key={building.id}
                      style={[styles.buildingChip, isSelected && styles.buildingChipActive]}
                      onPress={() => onToggleBuilding(building.id)}
                    >
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                        size={20}
                        color={isSelected ? "#2563EB" : "#9CA3AF"}
                      />
                      <Text
                        style={[styles.buildingChipText, isSelected && styles.buildingChipTextActive]}
                      >
                        {building.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Specialties (Optional)</Text>
              <Text style={styles.modalHint}>Specify what services they provide at these buildings</Text>
              <View style={styles.specialtiesGrid}>
                {SPECIALTY_OPTIONS.map((specialty) => {
                  const isSelected = selectedSpecialties.includes(specialty);
                  return (
                    <TouchableOpacity
                      key={specialty}
                      style={[styles.specialtyChip, isSelected && styles.specialtyChipActive]}
                      onPress={() => onToggleSpecialty(specialty)}
                    >
                      <Text
                        style={[styles.specialtyChipText, isSelected && styles.specialtyChipTextActive]}
                      >
                        {specialty}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add any notes about this assignment..."
                placeholderTextColor="#9CA3AF"
                value={assignmentNotes}
                onChangeText={onChangeNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.primaryButton} onPress={onSave}>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Save Assignments</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
