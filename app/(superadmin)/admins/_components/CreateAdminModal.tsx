import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

interface AdminFormData {
  name: string;
  email: string;
  phone: string;
}

interface CreateAdminModalProps {
  visible: boolean;
  formData: AdminFormData;
  setFormData: (data: AdminFormData) => void;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  mode: "create" | "edit";
}

export function CreateAdminModal({
  visible,
  formData,
  setFormData,
  isLoading,
  onClose,
  onSubmit,
  mode,
}: CreateAdminModalProps) {
  const isFormValid = formData.name.trim() && formData.email.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {mode === "create" ? "Create New Admin" : "Edit Admin"}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                editable={!isLoading}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@example.com"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading && mode === "create"}
              />
              {mode === "edit" && (
                <Text style={styles.helperText}>Email cannot be changed</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+971XXXXXXXXX"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
                editable={!isLoading}
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#7034FF" />
              <Text style={styles.infoText}>
                This user will be created with admin role and will have access to the
                admin portal.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!isFormValid || isLoading) && styles.submitButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === "create" ? "Create Admin" : "Save Changes"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "90%",
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#7034FF15",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#7034FF",
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#7034FF",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
