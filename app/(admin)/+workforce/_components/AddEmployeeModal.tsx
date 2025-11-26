import { Ionicons } from "@expo/vector-icons";
import React, { Dispatch, SetStateAction } from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

import type { Building } from "../../../../lib/types";
import { SHIFT_SEQUENCE } from "../_constants";
import { styles } from "../_styles";
import type { EmployeeFormData } from "../_types";

interface Props {
  visible: boolean;
  selectedBuildingId: string;
  formData: EmployeeFormData;
  managedBuildings: Building[];
  isSaving: boolean;
  pagePadding: number;
  onClose: () => void;
  onFormChange: Dispatch<SetStateAction<EmployeeFormData>>;
  onSubmit: () => void;
}

export function AddEmployeeModal({
  visible,
  selectedBuildingId,
  formData,
  managedBuildings,
  isSaving,
  pagePadding,
  onClose,
  onFormChange,
  onSubmit,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { marginHorizontal: pagePadding }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Building Employee</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {selectedBuildingId === "all" && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Assign to building</Text>
              <View style={styles.buildingSelectRow}>
                {managedBuildings.map((building) => {
                  const active = formData.buildingId === building.id;
                  return (
                    <TouchableOpacity
                      key={building.id}
                      style={[
                        styles.buildingChip,
                        active && styles.buildingChipActive,
                      ]}
                      onPress={() =>
                        onFormChange((prev) => ({
                          ...prev,
                          buildingId: building.id,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.buildingChipText,
                          active && styles.buildingChipTextActive,
                        ]}
                      >
                        {building.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Employee name"
              value={formData.name}
              onChangeText={(text) =>
                onFormChange((prev) => ({ ...prev, name: text }))
              }
            />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Role</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Concierge, Technician..."
              value={formData.role}
              onChangeText={(text) =>
                onFormChange((prev) => ({ ...prev, role: text }))
              }
            />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Phone</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="+971 50 000 0000"
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) =>
                onFormChange((prev) => ({ ...prev, phone: text }))
              }
            />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Shift</Text>
            <View style={styles.shiftRow}>
              {SHIFT_SEQUENCE.map((shift) => {
                const active = formData.shift === shift;
                return (
                  <TouchableOpacity
                    key={shift}
                    style={[
                      styles.shiftChip,
                      active && styles.shiftChipActive,
                    ]}
                    onPress={() =>
                      onFormChange((prev) => ({ ...prev, shift }))
                    }
                  >
                    <Text
                      style={[
                        styles.shiftChipText,
                        active && styles.shiftChipTextActive,
                      ]}
                    >
                      {shift.charAt(0).toUpperCase() + shift.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { justifyContent: "center" },
              isSaving && styles.primaryButtonDisabled,
            ]}
            onPress={onSubmit}
            disabled={isSaving}
          >
            <Ionicons name="save-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {isSaving ? "Saving..." : "Save Employee"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
