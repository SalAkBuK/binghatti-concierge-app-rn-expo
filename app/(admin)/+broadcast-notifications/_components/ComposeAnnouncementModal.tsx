import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import type { AnnouncementPriority, AnnouncementTargetType, Building } from "../../../../lib/types";
import type { ComposeFormData, RecipientPreviewData } from "../_types";
import { styles } from "../_styles";

interface Props {
  visible: boolean;
  isCompact: boolean;
  formData: ComposeFormData;
  allBuildings: Building[];
  recipientPreview: RecipientPreviewData | null;
  showPreview: boolean;
  onClose: () => void;
  onFormChange: (data: ComposeFormData) => void;
  onPreview: () => void;
  onSubmit: () => void;
}

export function ComposeAnnouncementModal({
  visible,
  isCompact,
  formData,
  allBuildings,
  recipientPreview,
  showPreview,
  onClose,
  onFormChange,
  onPreview,
  onSubmit,
}: Props) {
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
            <Text style={styles.modalTitle}>Compose Announcement</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={styles.formInput}
              value={formData.title}
              onChangeText={(text) => onFormChange({ ...formData, title: text })}
              placeholder="Enter announcement title..."
              placeholderTextColor="#999"
            />

            <Text style={styles.formLabel}>Message *</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={formData.body}
              onChangeText={(text) => onFormChange({ ...formData, body: text })}
              placeholder="Enter your message..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
            />

            <Text style={styles.formLabel}>Priority</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(["low", "normal", "high", "urgent"] as AnnouncementPriority[]).map(
                (priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.filterChip,
                      formData.priority === priority && styles.activeFilterChip,
                    ]}
                    onPress={() => onFormChange({ ...formData, priority })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        formData.priority === priority && styles.activeFilterChipText,
                      ]}
                    >
                      {priority.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>

            <Text style={styles.formLabel}>Target Audience</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { value: "all_tenants", label: "All Tenants" },
                { value: "building", label: "Specific Buildings" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterChip,
                    formData.targetType === option.value && styles.activeFilterChip,
                  ]}
                  onPress={() =>
                    onFormChange({
                      ...formData,
                      targetType: option.value as AnnouncementTargetType,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      formData.targetType === option.value && styles.activeFilterChipText,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {formData.targetType === "building" && (
              <>
                <Text style={styles.formLabel}>Select Buildings</Text>
                <View style={styles.buildingList}>
                  {allBuildings.map((building) => (
                    <TouchableOpacity
                      key={building.id}
                      style={[
                        styles.buildingItem,
                        formData.targetBuildingIds.includes(building.id) &&
                          styles.buildingItemSelected,
                      ]}
                      onPress={() => {
                        const isSelected = formData.targetBuildingIds.includes(building.id);
                        onFormChange({
                          ...formData,
                          targetBuildingIds: isSelected
                            ? formData.targetBuildingIds.filter((id) => id !== building.id)
                            : [...formData.targetBuildingIds, building.id],
                        });
                      }}
                    >
                      <Ionicons
                        name={
                          formData.targetBuildingIds.includes(building.id)
                            ? "checkbox"
                            : "square-outline"
                        }
                        size={24}
                        color={
                          formData.targetBuildingIds.includes(building.id)
                            ? "#00796B"
                            : "#999"
                        }
                      />
                      <Text style={styles.buildingItemText}>{building.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {recipientPreview && showPreview && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewTitle}>
                  📊 {recipientPreview.count} Total Recipients
                </Text>
                {recipientPreview.buildings.map((building) => (
                  <View key={building.buildingId} style={styles.previewRow}>
                    <Text style={styles.previewBuildingName}>{building.buildingName}</Text>
                    <Text style={styles.previewCount}>
                      {building.recipientCount} recipients
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.previewButton} onPress={onPreview}>
                <Ionicons name="eye-outline" size={20} color="#00796B" />
                <Text style={styles.previewButtonText}>Preview</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Send Now</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
