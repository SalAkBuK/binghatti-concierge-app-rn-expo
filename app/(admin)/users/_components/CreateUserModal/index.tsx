import { Ionicons } from "@expo/vector-icons";
import React, { type Dispatch, type SetStateAction } from "react";
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

  // Determine which role options to show based on current user's role
  const roleOptions = isSuperAdmin
    ? SUPER_ADMIN_USER_ROLE_OPTIONS
    : ADMIN_USER_ROLE_OPTIONS;

  const isLocationRole = formData.role === "tenant" || formData.role === "employee";
  const isTenant = formData.role === "tenant";

  const handleRoleChange = (role: UserFormState["role"]) => {
    setFormData((prev) => {
      const next = { ...prev, role };
      if (role !== "tenant" && role !== "employee") {
        next.buildingId = defaultBuildingId;
        next.tower = "";
        next.floor = "";
        next.apartment = "";
      }
      return next;
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

            {isLocationRole && (
              <>
                <View style={styles.sectionDivider}>
                  <Text style={styles.sectionTitle}>Location Details</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Building Assignment {isTenant ? "*" : "(Optional)"}
                  </Text>
                  <Text style={styles.hint}>Select the building for this {formData.role}</Text>
                  <View style={styles.buildingsList}>
                    {managedBuildings.length ? (
                      managedBuildings.map((building) => {
                        const isSelected = formData.buildingId === building.id;
                        return (
                          <TouchableOpacity
                            key={building.id}
                            style={[
                              styles.buildingOption,
                              isSelected && styles.buildingOptionActive,
                            ]}
                            onPress={() =>
                              setFormData((prev) => ({ ...prev, buildingId: building.id }))
                            }
                          >
                            <Ionicons
                              name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                              size={22}
                              color={isSelected ? "#2563EB" : "#9CA3AF"}
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.buildingOptionText,
                                  isSelected && styles.buildingOptionTextActive,
                                ]}
                              >
                                {building.name}
                              </Text>
                              {building.address && (
                                <Text style={styles.buildingOptionAddress}>
                                  {building.address}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <Text style={styles.hint}>
                        No managed buildings available. Assign buildings to see the list here.
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.labelOptional}>Tower/Wing</Text>
                  <Text style={styles.hint}>
                    ℹ️ Only for multi-tower or multi-wing complexes
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Tower A, North Wing (leave blank if not applicable)"
                    value={formData.tower}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, tower: text }))}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Floor {isTenant ? "*" : "(Optional)"}</Text>
                  <Text style={styles.hint}>
                    Enter floor number (e.g., 12, G for ground, B1 for basement)
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 12, G, B1, M"
                    value={formData.floor}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, floor: text }))}
                  />
                </View>

                {isTenant && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Apartment/Unit *</Text>
                    <Text style={styles.hint}>Enter unit or apartment number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 1205, A-304"
                      value={formData.apartment}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, apartment: text }))
                      }
                    />
                  </View>
                )}
              </>
            )}

            {isTenant && (
              <>
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
