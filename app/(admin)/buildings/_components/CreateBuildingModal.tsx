import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import React from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import type { BuildingStatus, User } from "../../../../lib/types";
import { BUILDING_AMENITY_OPTIONS, BUILDING_TYPES, UAE_EMIRATES } from "../_constants";
import { styles } from "./_styles";
import type { BuildingFormState } from "../_types";

interface CreateBuildingModalProps {
  visible: boolean;
  formData: BuildingFormState;
  setFormData: Dispatch<SetStateAction<BuildingFormState>>;
  showUnitBreakdown: boolean;
  setShowUnitBreakdown: (value: boolean) => void;
  managementUsers: User[];
  isLoading: boolean;
  onClose: () => void;
  onSubmit: () => void;
  modalTitle?: string;
  submitLabel?: string;
}

export function CreateBuildingModal({
  visible,
  formData,
  setFormData,
  showUnitBreakdown,
  setShowUnitBreakdown,
  managementUsers,
  isLoading,
  onClose,
  onSubmit,
  modalTitle,
  submitLabel,
}: CreateBuildingModalProps) {
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
        style={styles.modalContent}
      >
      {/* Modal Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{modalTitle || "Create New Building"}</Text>
        <TouchableOpacity
          onPress={() => onClose()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Section 1: Basic Information */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Building Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Binghatti Tower A, Marina Heights"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Building Type *</Text>
          <View style={styles.statusButtons}>
            {BUILDING_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.statusButton,
                  formData.buildingType === type.value && styles.statusButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, buildingType: type.value })}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    formData.buildingType === type.value && styles.statusButtonTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.labelOptional}>Developer</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Emaar, Damac, Binghatti"
            value={formData.developer}
            onChangeText={(text) => setFormData({ ...formData, developer: text })}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, styles.formGroupHalf]}>
            <Text style={styles.labelOptional}>Year Built</Text>
            <TextInput
              style={styles.input}
              placeholder={new Date().getFullYear().toString()}
              value={formData.yearBuilt}
              onChangeText={(text) => setFormData({ ...formData, yearBuilt: text })}
              keyboardType="number-pad"
            />
          </View>

          <View style={[styles.formGroup, styles.formGroupHalf]}>
            <Text style={styles.labelOptional}>Total Floors</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 25"
              value={formData.totalFloors}
              onChangeText={(text) => setFormData({ ...formData, totalFloors: text })}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.statusButtons}>
            {(["active", "maintenance", "inactive"] as BuildingStatus[]).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  formData.status === status && styles.statusButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, status })}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    formData.status === status && styles.statusButtonTextActive,
                  ]}
                >
                  {status.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 2: Location Details */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Location Details</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Emirate *</Text>
          <View style={styles.pickerContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {UAE_EMIRATES.map((emirate) => (
                <TouchableOpacity
                  key={emirate}
                  style={[
                    styles.pickerOption,
                    formData.emirate === emirate && styles.pickerOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, emirate })}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      formData.emirate === emirate && styles.pickerOptionTextActive,
                    ]}
                  >
                    {emirate}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Community/District *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Dubai Marina, Downtown Dubai, JBR, Business Bay"
            value={formData.community}
            onChangeText={(text) => setFormData({ ...formData, community: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.labelOptional}>Street/Area</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Sheikh Zayed Road, Al Wasl Road"
            value={formData.street}
            onChangeText={(text) => setFormData({ ...formData, street: text })}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, styles.formGroupHalf]}>
            <Text style={styles.labelOptional}>Plot Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 123-456"
              value={formData.plotNumber}
              onChangeText={(text) => setFormData({ ...formData, plotNumber: text })}
            />
          </View>

          <View style={[styles.formGroup, styles.formGroupHalf]}>
            <Text style={styles.labelOptional}>Building Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 45"
              value={formData.buildingNumber}
              onChangeText={(text) => setFormData({ ...formData, buildingNumber: text })}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.labelOptional}>Makani Number</Text>
          <Text style={styles.hint}>
            ℹ️ Dubai only - Dubai&apos;s smart addressing system
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1234567890"
            value={formData.makaniNumber}
            onChangeText={(text) => setFormData({ ...formData, makaniNumber: text })}
            keyboardType="number-pad"
          />
        </View>

        {/* Section 3: Utilities & Registration */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Utilities & Registration</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.labelOptional}>Utility Premises Number</Text>
          <Text style={styles.hint}>
            ℹ️ DEWA (Dubai), FEWA (Northern Emirates), ADDC/AADC (Abu Dhabi)
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter utility account/premises number"
            value={formData.utilityPremisesNumber}
            onChangeText={(text) => setFormData({ ...formData, utilityPremisesNumber: text })}
          />
        </View>

        {/* Section 4: Capacity */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Capacity</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Total Units *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter total number of units"
            value={formData.totalUnits}
            onChangeText={(text) => setFormData({ ...formData, totalUnits: text })}
            keyboardType="number-pad"
          />
        </View>

        {/* Unit Breakdown Toggle */}
        <View style={styles.formGroup}>
          <TouchableOpacity
            style={styles.breakdownToggle}
            onPress={() => setShowUnitBreakdown(!showUnitBreakdown)}
          >
            <View style={styles.breakdownToggleLeft}>
              <Ionicons
                name={showUnitBreakdown ? "chevron-down" : "chevron-forward"}
                size={20}
                color="#7034FF"
              />
              <Text style={styles.breakdownToggleText}>
                Unit Breakdown (Optional)
              </Text>
            </View>
            <Text style={styles.breakdownToggleHint}>
              {showUnitBreakdown ? "Hide" : "Show"} detailed breakdown
            </Text>
          </TouchableOpacity>

          {showUnitBreakdown && (
            <View style={styles.breakdownContainer}>
              <Text style={styles.hint}>
                ℹ️ Specify the composition of units (leave blank if not applicable)
              </Text>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.labelOptional}>Studios</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.studios}
                    onChangeText={(text) => setFormData({ ...formData, studios: text })}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.labelOptional}>1 Bedroom</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.oneBedroom}
                    onChangeText={(text) => setFormData({ ...formData, oneBedroom: text })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.labelOptional}>2 Bedrooms</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.twoBedroom}
                    onChangeText={(text) => setFormData({ ...formData, twoBedroom: text })}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.labelOptional}>3 Bedrooms</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.threeBedroom}
                    onChangeText={(text) => setFormData({ ...formData, threeBedroom: text })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.labelOptional}>4+ Bedrooms</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.fourPlusBedroom}
                    onChangeText={(text) => setFormData({ ...formData, fourPlusBedroom: text })}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={[styles.formGroup, styles.formGroupHalf]}>
                  <Text style={styles.labelOptional}>Commercial</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    value={formData.commercial}
                    onChangeText={(text) => setFormData({ ...formData, commercial: text })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Section 5: Amenities */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Amenities</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.labelOptional}>Available Amenities</Text>
          <Text style={styles.hint}>Select all amenities that apply to this property</Text>
          <View style={styles.amenitiesGrid}>
            {BUILDING_AMENITY_OPTIONS.map((amenity) => {
              const isSelected = formData.amenities.includes(amenity.id);
              return (
                <TouchableOpacity
                  key={amenity.id}
                  style={[
                    styles.amenityChip,
                    isSelected && styles.amenityChipActive,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      amenities: isSelected
                        ? prev.amenities.filter((id) => id !== amenity.id)
                        : [...prev.amenities, amenity.id],
                    }))
                  }
                >
                  <Ionicons
                    name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                    size={16}
                    color={isSelected ? "#4C1D95" : "#6B7280"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.amenityChipText,
                      isSelected && styles.amenityChipTextActive,
                    ]}
                  >
                    {amenity.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 6: Management */}
        <View style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Management</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.labelOptional}>Building Manager</Text>
          <Text style={styles.hint}>
            ℹ️ Optional - You can assign a manager later
          </Text>
          <View style={styles.pickerContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  !formData.managerId && styles.pickerOptionActive,
                ]}
                onPress={() => setFormData({ ...formData, managerId: "" })}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    !formData.managerId && styles.pickerOptionTextActive,
                  ]}
                >
                  None
                </Text>
              </TouchableOpacity>
              {managementUsers.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={[
                    styles.pickerOption,
                    formData.managerId === user.id && styles.pickerOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, managerId: user.id })}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      formData.managerId === user.id && styles.pickerOptionTextActive,
                    ]}
                  >
                    {user.name}
                  </Text>
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
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>{submitLabel || "Create Building"}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      </Animated.View>
    </View>
  </Modal>
  );
}
