import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import type { UnitType } from "../../../../lib/types";
import { AMENITY_OPTIONS } from "../_constants";
import { styles } from "../_styles";

interface FormData {
  name: string;
  bedrooms: string;
  bathrooms: string;
  areaSqFt: string;
  baseRent: string;
  amenities: string[];
}

interface Props {
  visible: boolean;
  isEditMode: boolean;
  formData: FormData;
  isLoading: boolean;
  canManageUnitTypes: boolean;
  selectedUnitType: UnitType | null;
  onClose: () => void;
  onSubmit: () => void;
  onDelete: () => void;
  onFormChange: (data: FormData) => void;
  onToggleAmenity: (amenityId: string) => void;
}

export function UnitTypeFormModal({
  visible,
  isEditMode,
  formData,
  isLoading,
  canManageUnitTypes,
  selectedUnitType,
  onClose,
  onSubmit,
  onDelete,
  onFormChange,
  onToggleAmenity,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEditMode ? "Edit Unit Type" : "Create New Unit Type"}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Studio, 1BR, 2BR"
                value={formData.name}
                onChangeText={(text) => onFormChange({ ...formData, name: text })}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>Bedrooms *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.bedrooms}
                  onChangeText={(text) =>
                    onFormChange({ ...formData, bedrooms: text })
                  }
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>Bathrooms *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.bathrooms}
                  onChangeText={(text) =>
                    onFormChange({ ...formData, bathrooms: text })
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>Area (sqft) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.areaSqFt}
                  onChangeText={(text) =>
                    onFormChange({ ...formData, areaSqFt: text })
                  }
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.formGroup, styles.formGroupHalf]}>
                <Text style={styles.label}>Base Rent (AED)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional"
                  value={formData.baseRent}
                  onChangeText={(text) =>
                    onFormChange({ ...formData, baseRent: text })
                  }
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Default Amenities</Text>
              <View style={styles.amenityGrid}>
                {AMENITY_OPTIONS.map((option) => {
                  const active = formData.amenities.includes(option.id);
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.amenityOption,
                        active && styles.amenityOptionActive,
                      ]}
                      onPress={() => onToggleAmenity(option.id)}
                    >
                      <Ionicons
                        name={active ? "checkbox" : "square-outline"}
                        size={18}
                        color={active ? "#7034FF" : "#9CA3AF"}
                      />
                      <Text
                        style={[
                          styles.amenityOptionText,
                          active && styles.amenityOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isLoading && styles.submitButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {isEditMode ? "Update Unit Type" : "Create Unit Type"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Delete Button (Edit Mode Only) */}
            {isEditMode && selectedUnitType && canManageUnitTypes && (
              <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                <Text style={styles.deleteButtonText}>Delete Unit Type</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
