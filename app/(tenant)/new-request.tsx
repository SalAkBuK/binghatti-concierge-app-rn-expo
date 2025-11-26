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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AttachmentPicker } from "../../components/ui/AttachmentPicker";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { CreateRequestDTO } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

interface ValidationErrors {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
}

export default function NewRequestScreen() {
  const { currentUser, notifications, actions, loading } = useApp();
  const insets = useSafeAreaInsets();

  const [newRequest, setNewRequest] = useState<CreateRequestDTO>({
    type: "maintenance",
    title: "",
    description: "",
    priority: "medium",
    apartment: currentUser?.profile?.apartment || "",
    tower: currentUser?.profile?.tower || "",
    buildingId:
      currentUser?.profile?.buildingId ||
      currentUser?.profile?.managedBuildingIds?.[0] ||
      "",
    preferredTime: "",
    contactPhone: currentUser?.profile?.phone || "",
    additionalNotes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showSideMenu, setShowSideMenu] = useState(false);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!newRequest.title.trim()) {
      errors.title = "Title is required";
    } else if (newRequest.title.trim().length < 5) {
      errors.title = "Title must be at least 5 characters long";
    }

    if (!newRequest.description.trim()) {
      errors.description = "Description is required";
    } else if (newRequest.description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters long";
    }

    if (!newRequest.type) {
      errors.type = "Request type is required";
    }

    if (!newRequest.priority) {
      errors.priority = "Priority is required";
    }

    return errors;
  };

  const handleInputChange = (field: keyof CreateRequestDTO, value: string) => {
    setNewRequest((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (): Promise<void> => {
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Create request with attachments included
      const requestData: CreateRequestDTO = {
        ...newRequest,
        attachments: attachments,
      };

      console.log("Submitting request with attachments:", {
        ...requestData,
        attachments: requestData.attachments?.length,
      });

      const createdRequest = await actions.createRequest(requestData);

      console.log("Request created successfully:", createdRequest.id);

      Alert.alert("Success", "Your request has been submitted successfully!", [
        {
          text: "OK",
          onPress: () => {
            // Reset form
            setNewRequest({
              type: "maintenance",
              title: "",
              description: "",
              priority: "medium",
              apartment: currentUser?.profile?.apartment || "",
              tower: currentUser?.profile?.tower || "",
              buildingId:
                currentUser?.profile?.buildingId ||
                currentUser?.profile?.managedBuildingIds?.[0] ||
                "",
              preferredTime: "",
              contactPhone: currentUser?.profile?.phone || "",
              additionalNotes: "",
            });
            setAttachments([]);
            // Navigate back to home
            router.push("/(tenant)/index" as any);
          },
        },
      ]);
    } catch (error) {
      console.error("Error submitting request:", error);
      Alert.alert(
        "Error",
        `Failed to submit request. ${error instanceof Error ? error.message : "Please try again."}`,
      );
    } finally {
      setIsSubmitting(false);
    }
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
          contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        >
          {/* Navigation Header */}
          <HeaderBar
            title="New Request"
            hasUnreadNotifications={hasUnreadNotifications}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
          />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Service Request</Text>
            <Text style={styles.headerSubtitle}>
              Fill out the form below to submit your request
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* Request Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Request Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newRequest.type}
                  onValueChange={(value) => handleInputChange("type", value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Maintenance" value="maintenance" />
                  <Picker.Item label="Repair" value="repair" />
                  <Picker.Item label="Cleaning" value="cleaning" />
                  <Picker.Item label="Electrical" value="electrical" />
                  <Picker.Item label="Plumbing" value="plumbing" />
                  <Picker.Item label="AC/Heating" value="hvac" />
                  <Picker.Item label="Other" value="other" />
                </Picker>
              </View>
              {validationErrors.type && (
                <Text style={styles.errorText}>{validationErrors.type}</Text>
              )}
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  validationErrors.title && styles.errorInput,
                ]}
                placeholder="Brief description of your request"
                value={newRequest.title}
                onChangeText={(text) => handleInputChange("title", text)}
                maxLength={100}
              />
              {validationErrors.title && (
                <Text style={styles.errorText}>{validationErrors.title}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[
                  styles.textArea,
                  validationErrors.description && styles.errorInput,
                ]}
                placeholder="Detailed description of the issue or request"
                value={newRequest.description}
                onChangeText={(text) => handleInputChange("description", text)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              {validationErrors.description && (
                <Text style={styles.errorText}>
                  {validationErrors.description}
                </Text>
              )}
            </View>

            {/* Priority */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newRequest.priority}
                  onValueChange={(value) =>
                    handleInputChange("priority", value)
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Low" value="low" />
                  <Picker.Item label="Medium" value="medium" />
                  <Picker.Item label="High" value="high" />
                  <Picker.Item label="Urgent" value="urgent" />
                </Picker>
              </View>
              {validationErrors.priority && (
                <Text style={styles.errorText}>
                  {validationErrors.priority}
                </Text>
              )}
            </View>

            {/* Apartment & Tower */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Apartment</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 1205"
                  value={newRequest.apartment}
                  onChangeText={(text) => handleInputChange("apartment", text)}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Tower</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Tower A"
                  value={newRequest.tower}
                  onChangeText={(text) => handleInputChange("tower", text)}
                />
              </View>
            </View>

            {/* Contact Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Phone</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Your phone number"
                value={newRequest.contactPhone}
                onChangeText={(text) => handleInputChange("contactPhone", text)}
                keyboardType="phone-pad"
              />
            </View>

            {/* Preferred Time */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred Time</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Morning, Afternoon, Evening"
                value={newRequest.preferredTime}
                onChangeText={(text) =>
                  handleInputChange("preferredTime", text)
                }
              />
            </View>

            {/* Additional Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Notes</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Any additional information"
                value={newRequest.additionalNotes}
                onChangeText={(text) =>
                  handleInputChange("additionalNotes", text)
                }
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
            </View>

            {/* Attachment Picker */}
            <AttachmentPicker
              attachments={attachments}
              onAttachmentsChange={setAttachments}
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
                    name="send"
                    size={20}
                    color="white"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Side Menu */}
      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />
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
    paddingTop: 20,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfWidth: {
    width: "48%",
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
    minHeight: 100,
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
