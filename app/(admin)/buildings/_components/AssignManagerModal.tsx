import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import type { Building, User } from "../../../../lib/types";
import { styles } from "./_styles";

interface AssignManagerModalProps {
  visible: boolean;
  managementUsers: User[];
  selectedBuilding: Building | null;
  managerId: string;
  setManagerId: (managerId: string) => void;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function AssignManagerModal({
  visible,
  managementUsers,
  selectedBuilding,
  managerId,
  setManagerId,
  isLoading,
  onClose,
  onSubmit,
}: AssignManagerModalProps) {
  return (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={() => onClose()}
  >
    <View style={styles.modalOverlay}>
      <Animated.View
        entering={FadeIn.duration(200)}
        style={[styles.modalContent, { maxHeight: 400 }]}
      >
      {/* Modal Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Assign Manager</Text>
        <TouchableOpacity
          onPress={() => onClose()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Text style={styles.buildingNameText}>
        {selectedBuilding?.name}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Select Manager</Text>
          <View style={styles.pickerContainer}>
            <ScrollView horizontal={false} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  !managerId && styles.pickerOptionActive,
                ]}
                onPress={() => setManagerId("")}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    !managerId && styles.pickerOptionTextActive,
                  ]}
                >
                  None (Remove Manager)
                </Text>
              </TouchableOpacity>
              {managementUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.pickerOption,
                    managerId === user.id && styles.pickerOptionActive,
                  ]}
                  onPress={() => setManagerId(user.id)}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      managerId === user.id && styles.pickerOptionTextActive,
                    ]}
                  >
                    {user.name}
                  </Text>
                  <Text style={styles.pickerOptionSubtext}>{user.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Assign Manager</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      </Animated.View>
    </View>
  </Modal>
  );
}
