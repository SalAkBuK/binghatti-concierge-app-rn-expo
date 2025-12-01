import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AttachmentPicker } from "../../components/ui/AttachmentPicker";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { useApp } from "../../lib/context/connected-app-provider";
import type { VisitorIdType } from "../../lib/types";

interface RegisterVisitorForm {
  visitorName: string;
  visitorPhone: string;
  visitorIdType: VisitorIdType;
  visitorIdNumber: string;
  visitPurpose: string;
  expectedArrivalTime: Date;
  expectedDepartureTime: Date | null;
}

interface ValidationErrors {
  visitorName?: string;
  visitorPhone?: string;
  visitorIdNumber?: string;
  visitPurpose?: string;
  expectedArrivalTime?: string;
  expectedDepartureTime?: string;
}

export default function RegisterVisitorScreen() {
  const { currentUser, actions, loading } = useApp();

  const [formData, setFormData] = useState<RegisterVisitorForm>({
    visitorName: "",
    visitorPhone: "+971",
    visitorIdType: "passport",
    visitorIdNumber: "",
    visitPurpose: "",
    expectedArrivalTime: new Date(),
    expectedDepartureTime: null,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [idPhoto, setIdPhoto] = useState<string[]>([]);
  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!formData.visitorName.trim()) {
      errors.visitorName = "Visitor name is required";
    } else if (formData.visitorName.trim().length < 2) {
      errors.visitorName = "Visitor name must be at least 2 characters";
    }

    const phoneWithoutPrefix = formData.visitorPhone.replace("+971", "").trim();
    if (!phoneWithoutPrefix) {
      errors.visitorPhone = "Phone number is required";
    } else if (!/^\d{9}$/.test(phoneWithoutPrefix)) {
      errors.visitorPhone = "Phone number must be 9 digits after +971";
    }

    if (!formData.visitorIdNumber.trim()) {
      errors.visitorIdNumber = "ID number is required";
    } else if (formData.visitorIdNumber.trim().length < 3) {
      errors.visitorIdNumber = "ID number must be at least 3 characters";
    }

    if (!formData.visitPurpose.trim()) {
      errors.visitPurpose = "Visit purpose is required";
    } else if (formData.visitPurpose.trim().length < 5) {
      errors.visitPurpose = "Visit purpose must be at least 5 characters";
    }

    const now = new Date();
    if (formData.expectedArrivalTime < now) {
      errors.expectedArrivalTime = "Arrival time must be in the future";
    }

    if (
      formData.expectedDepartureTime &&
      formData.expectedDepartureTime <= formData.expectedArrivalTime
    ) {
      errors.expectedDepartureTime = "Departure must be after arrival time";
    }

    return errors;
  };

  const handleInputChange = (
    field: keyof RegisterVisitorForm,
    value: string | Date | null,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
        return newErrors;
      });
    }
  };

  const handlePhoneChange = (text: string) => {
    // Ensure +971 prefix is always present
    if (!text.startsWith("+971")) {
      text = "+971" + text.replace(/^\+971/, "");
    }
    // Only allow digits after the prefix
    const prefix = "+971";
    const numbers = text.slice(prefix.length).replace(/\D/g, "");
    handleInputChange("visitorPhone", prefix + numbers);
  };

  const handleSubmit = async (): Promise<void> => {
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const visitorData = {
        visitorName: formData.visitorName,
        visitorPhone: formData.visitorPhone,
        visitorIdType: formData.visitorIdType,
        visitorIdNumber: formData.visitorIdNumber,
        visitPurpose: formData.visitPurpose,
        expectedArrivalTime: formData.expectedArrivalTime.toISOString(),
        expectedDepartureTime: formData.expectedDepartureTime
          ? formData.expectedDepartureTime.toISOString()
          : new Date(
              formData.expectedArrivalTime.getTime() + 2 * 60 * 60 * 1000,
            ).toISOString(),
        idPhotoUrl: idPhoto[0] || undefined,
        unitNumber: currentUser?.profile?.apartment || "",
      };

      const newVisitor = await actions.registerVisitor(visitorData);

      Alert.alert(
        "Success",
        `Visitor registered successfully!\n\nVisitor Code: ${newVisitor.visitorCode}\n\nA QR code has been generated and sent to ${formData.visitorName}.`,
        [
          {
            text: "OK",
            onPress: () => {
              router.back();
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error registering visitor:", error);
      Alert.alert(
        "Error",
        `Failed to register visitor. ${error instanceof Error ? error.message : "Please try again."}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <HeaderBar
            title="Register Visitor"
            hasUnreadNotifications={false}
            showSideMenu={false}
            onSideMenuToggle={() => {}}
            showBackButton={true}
            onBackPress={() => router.back()}
          />

          {/* Form Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Register New Visitor</Text>
            <Text style={styles.headerSubtitle}>
              Fill out the form below to register a visitor
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* Visitor Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Visitor Name *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  validationErrors.visitorName && styles.errorInput,
                ]}
                placeholder="Enter visitor's full name"
                value={formData.visitorName}
                onChangeText={(text) => handleInputChange("visitorName", text)}
                maxLength={100}
              />
              {validationErrors.visitorName && (
                <Text style={styles.errorText}>
                  {validationErrors.visitorName}
                </Text>
              )}
            </View>

            {/* Visitor Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Visitor Phone *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  validationErrors.visitorPhone && styles.errorInput,
                ]}
                placeholder="+971XXXXXXXXX"
                value={formData.visitorPhone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={13}
              />
              {validationErrors.visitorPhone && (
                <Text style={styles.errorText}>
                  {validationErrors.visitorPhone}
                </Text>
              )}
            </View>

            {/* ID Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ID Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.visitorIdType}
                  onValueChange={(value) =>
                    handleInputChange("visitorIdType", value)
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Passport" value="passport" />
                  <Picker.Item label="National ID" value="national_id" />
                  <Picker.Item
                    label="Driving License"
                    value="driving_license"
                  />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
            </View>

            {/* ID Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ID Number *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  validationErrors.visitorIdNumber && styles.errorInput,
                ]}
                placeholder="Enter ID number"
                value={formData.visitorIdNumber}
                onChangeText={(text) =>
                  handleInputChange("visitorIdNumber", text)
                }
                maxLength={50}
              />
              {validationErrors.visitorIdNumber && (
                <Text style={styles.errorText}>
                  {validationErrors.visitorIdNumber}
                </Text>
              )}
            </View>

            {/* Visit Purpose */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Visit Purpose *</Text>
              <TextInput
                style={[
                  styles.textArea,
                  validationErrors.visitPurpose && styles.errorInput,
                ]}
                placeholder="Describe the purpose of the visit"
                value={formData.visitPurpose}
                onChangeText={(text) => handleInputChange("visitPurpose", text)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
              {validationErrors.visitPurpose && (
                <Text style={styles.errorText}>
                  {validationErrors.visitPurpose}
                </Text>
              )}
            </View>

            {/* Expected Arrival */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expected Arrival *</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  validationErrors.expectedArrivalTime && styles.errorInput,
                ]}
                onPress={() => setShowArrivalPicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                <Text style={styles.datePickerText}>
                  {formatDateTime(formData.expectedArrivalTime)}
                </Text>
              </TouchableOpacity>
              {validationErrors.expectedArrivalTime && (
                <Text style={styles.errorText}>
                  {validationErrors.expectedArrivalTime}
                </Text>
              )}
              {showArrivalPicker && (
                <DateTimePicker
                  value={formData.expectedArrivalTime}
                  mode={Platform.OS === "ios" ? "datetime" : "date"}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowArrivalPicker(Platform.OS === "ios");
                    if (selectedDate) {
                      handleInputChange("expectedArrivalTime", selectedDate);
                    }
                  }}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Expected Departure */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expected Departure (Optional)</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  validationErrors.expectedDepartureTime && styles.errorInput,
                ]}
                onPress={() => setShowDeparturePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                <Text style={styles.datePickerText}>
                  {formData.expectedDepartureTime
                    ? formatDateTime(formData.expectedDepartureTime)
                    : "Select departure time"}
                </Text>
              </TouchableOpacity>
              {validationErrors.expectedDepartureTime && (
                <Text style={styles.errorText}>
                  {validationErrors.expectedDepartureTime}
                </Text>
              )}
              {showDeparturePicker && (
                <DateTimePicker
                  value={
                    formData.expectedDepartureTime || formData.expectedArrivalTime
                  }
                  mode={Platform.OS === "ios" ? "datetime" : "date"}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(event, selectedDate) => {
                    setShowDeparturePicker(Platform.OS === "ios");
                    if (selectedDate) {
                      handleInputChange("expectedDepartureTime", selectedDate);
                    }
                  }}
                  minimumDate={formData.expectedArrivalTime}
                />
              )}
            </View>

            {/* ID Photo (Optional) */}
            <AttachmentPicker
              attachments={idPhoto}
              onAttachmentsChange={setIdPhoto}
              maxAttachments={1}
              disabled={isSubmitting || loading}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || loading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || loading}
            >
              {isSubmitting || loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons
                    name="person-add"
                    size={20}
                    color="white"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.submitButtonText}>Register Visitor</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6b7280",
  },
  formContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
    minHeight: 48,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
    minHeight: 80,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "white",
  },
  picker: {
    height: 50,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "white",
    minHeight: 48,
  },
  datePickerText: {
    fontSize: 16,
    color: "#111827",
    marginLeft: 8,
  },
  errorInput: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: "#336BE3",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
});
