import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";

import type { Building } from "../../../../lib/types";
import { MAINTENANCE_TYPES } from "../_constants";
import { styles } from "../_styles";
import type { MaintenanceFormState } from "../_types";

interface CreateScheduleModalProps {
  visible: boolean;
  buildings: Building[];
  formData: MaintenanceFormState;
  isCreating: boolean;
  onChange: (updates: Partial<MaintenanceFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function CreateScheduleModal({
  visible,
  buildings,
  formData,
  isCreating,
  onChange,
  onClose,
  onSubmit,
}: CreateScheduleModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Schedule Maintenance</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalBody}
          >
            <Text style={styles.formLabel}>Building *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {buildings.map((building) => {
                const active = formData.buildingId === building.id;
                return (
                  <TouchableOpacity
                    key={building.id}
                    style={[styles.filterChip, active && styles.activeFilterChip]}
                    onPress={() => onChange({ buildingId: building.id })}
                  >
                    <Text
                      style={[styles.filterChipText, active && styles.activeFilterChipText]}
                    >
                      {building.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.formLabel}>Title *</Text>
            <TextInput
              style={styles.formInput}
              value={formData.title}
              onChangeText={(title) => onChange({ title })}
              placeholder="Maintenance title"
            />

            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={formData.description}
              onChangeText={(description) => onChange({ description })}
              multiline
            />

            <Text style={styles.formLabel}>Type *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {MAINTENANCE_TYPES.map((type) => {
                const active = formData.maintenanceType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, active && styles.activeFilterChip]}
                    onPress={() => onChange({ maintenanceType: type })}
                  >
                    <Text
                      style={[styles.filterChipText, active && styles.activeFilterChipText]}
                    >
                      {type.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Date *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.scheduledDate}
                  onChangeText={(scheduledDate) => onChange({ scheduledDate })}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>Time *</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.scheduledTime}
                  onChangeText={(scheduledTime) => onChange({ scheduledTime })}
                  placeholder="HH:MM"
                />
              </View>
            </View>

            <Text style={styles.formLabel}>Duration (hours)</Text>
            <TextInput
              style={styles.formInput}
              value={String(formData.duration)}
              keyboardType="numeric"
              onChangeText={(text) => onChange({ duration: Number(text) || 0 })}
            />

            <Text style={styles.formLabel}>Affected Areas</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Comma separated (e.g., Lobby, Elevators)"
              value={formData.affectedAreas.join(", ")}
              onChangeText={(text) => onChange({ affectedAreas: text.split(",").map((v) => v.trim()) })}
            />

            <Text style={styles.formLabel}>Estimated Impact</Text>
            <TextInput
              style={styles.formInput}
              value={formData.estimatedImpact}
              onChangeText={(estimatedImpact) => onChange({ estimatedImpact })}
              placeholder="e.g., Lobby closed"
            />

            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>Notify Tenants</Text>
              <Switch
                value={formData.notifyTenants}
                onValueChange={(notifyTenants) => onChange({ notifyTenants })}
              />
            </View>

            {formData.notifyTenants && (
              <>
                <Text style={styles.formLabel}>Notification Message</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  value={formData.notificationMessage}
                  onChangeText={(notificationMessage) => onChange({ notificationMessage })}
                  multiline
                />
              </>
            )}

            <Text style={styles.formLabel}>Notes</Text>
            <TextInput
              style={[styles.formInput, styles.formTextArea]}
              value={formData.notes}
              onChangeText={(notes) => onChange({ notes })}
              multiline
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
            onPress={onSubmit}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Create Schedule</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
