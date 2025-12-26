import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, { type Dispatch, type SetStateAction, useEffect } from "react";
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

import { useApp } from "../../../../../lib/context/connected-app-provider";
import type { Building } from "../../../../../lib/types";
import {
  ADMIN_USER_ROLE_OPTIONS,
  SUPER_ADMIN_USER_ROLE_OPTIONS,
} from "../../_constants";
import { styles } from "../../_styles";
import type { UserFormState } from "../../_types";

interface CreateUserModalProps {
  visible: boolean;
  formData: UserFormState;
  setFormData: Dispatch<SetStateAction<UserFormState>>;
  managedBuildings: Building[];
  defaultBuildingId: string;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  modalTitle?: string;
  submitLabel?: string;
}

export function CreateUserModal({
  visible,
  formData,
  setFormData,
  managedBuildings,
  defaultBuildingId,
  isLoading,
  onClose,
  onSubmit,
  modalTitle,
  submitLabel,
}: CreateUserModalProps) {
  const { currentUser } = useApp();
  const isSuperAdmin = currentUser?.role === "super_admin";

  // Debug: Log formData when modal becomes visible
  useEffect(() => {
    if (visible) {
      console.log('[CreateUserModal] Modal opened with formData:', JSON.stringify(formData, null, 2));
    }
  }, [visible, formData]);

  // Determine which role options to show based on current user's role
  const roleOptions = isSuperAdmin
    ? SUPER_ADMIN_USER_ROLE_OPTIONS
    : ADMIN_USER_ROLE_OPTIONS;

  const isTenant = formData.role === "tenant";
  const isEmployee = formData.role === "employee";
  const isManagement = formData.role === "management";

  const handleRoleChange = (role: UserFormState["role"]) => {
    setFormData((prev) => {
      // Reset building-dependent fields when switching away from tenant/employee/management
      const shouldResetLocation =
        role !== "tenant" && role !== "employee" && role !== "management";
      const clearedLocation = shouldResetLocation
        ? {
            buildingId: "",
            tower: "",
            floor: "",
            apartment: "",
            emergencyContact: "",
            emergencyPhone: "",
          }
        : {
            buildingId: prev.buildingId || defaultBuildingId,
            tower: prev.tower,
            floor: prev.floor,
            apartment: prev.apartment,
            emergencyContact: prev.emergencyContact,
            emergencyPhone: prev.emergencyPhone,
          };

      return {
        ...prev,
        role,
        ...clearedLocation,
      };
    });
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
        <Animated.View entering={FadeIn.duration(200)} style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle || "Create New User"}</Text>
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
                onChangeText={(text) => setFormData((prev) => ({ ...prev, name: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                value={formData.email}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+971XXXXXXXXX"
                value={formData.phone}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                value={formData.password}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, password: text }))}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter address"
                value={formData.address}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, address: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nationality *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., UAE, Indian, Pakistani, etc."
                value={formData.nationality}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, nationality: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Role *</Text>
              <View style={styles.roleButtons}>
                {roleOptions.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleButton,
                      formData.role === role && styles.roleButtonActive,
                    ]}
                    onPress={() => handleRoleChange(role)}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === role && styles.roleButtonTextActive,
                      ]}
                    >
                      {role.replace("_", " ").toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.infoBox}>
              <View style={styles.infoBoxHeader}>
                <Ionicons name="information-circle" size={20} color="#2563EB" />
                <Text style={styles.infoBoxTitle}>Looking to add a Service Provider?</Text>
              </View>
              <Text style={styles.infoBoxText}>
                Service providers (companies/vendors) should be created in the{" "}
                <Text style={styles.infoBoxLink}>Service Provider Management</Text> screen.
              </Text>
            </View>

            {(isEmployee || isManagement) && (
              <>
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionTitle}>Building Assignment</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    {isManagement ? "Assign Manager to Building *" : "Assign to Building *"}
                  </Text>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerWrapper}>
                      {managedBuildings.length > 0 ? (
                        <Picker
                          selectedValue={formData.buildingId}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              buildingId: value,
                            }))
                          }
                          style={styles.picker}
                          dropdownIconColor="#111827"
                        >
                          <Picker.Item label="Select a building" value="" color="#9CA3AF" />
                          {managedBuildings.map((building) => (
                            <Picker.Item
                              key={building.id}
                              label={building.name}
                              value={building.id}
                              color="#111827"
                            />
                          ))}
                        </Picker>
                      ) : (
                        <Text style={styles.emptyPickerText}>
                          No buildings available
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.helperText}>
                    {isManagement
                      ? "The manager will be assigned to this building"
                      : "The maintenance staff will be assigned to this building"}
                  </Text>
                </View>
              </>
            )}

            {isTenant && (
              <>
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionTitle}>Tenant Details</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Building *</Text>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerWrapper}>
                      {managedBuildings.length > 0 ? (
                        <Picker
                          selectedValue={formData.buildingId}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              buildingId: value,
                            }))
                          }
                          style={styles.picker}
                          dropdownIconColor="#111827"
                        >
                          <Picker.Item label="Select a building" value="" color="#9CA3AF" />
                          {managedBuildings.map((building) => (
                            <Picker.Item
                              key={building.id}
                              label={building.name}
                              value={building.id}
                              color="#111827"
                            />
                          ))}
                        </Picker>
                      ) : (
                        <Text style={styles.emptyPickerText}>
                          No buildings available
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={styles.helperText}>
                    Select the building where the tenant resides
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Unit Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1205, A-304"
                    value={formData.apartment}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, apartment: text }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Floor Number *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 12, 3"
                    value={formData.floor}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, floor: text }))}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.labelOptional}>Tower/Block</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Tower A, Block B (Optional)"
                    value={formData.tower}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, tower: text }))}
                  />
                </View>

                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionTitle}>Emergency Contact (Optional)</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.labelOptional}>Contact Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Jane Smith"
                    value={formData.emergencyContact}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, emergencyContact: text }))
                    }
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.labelOptional}>Contact Phone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+971 50 XXX XXXX"
                    value={formData.emergencyPhone}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, emergencyPhone: text }))
                    }
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={onSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>{submitLabel || "Create User"}</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
