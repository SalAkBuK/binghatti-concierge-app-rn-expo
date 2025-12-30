import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
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

import { AttachmentPicker } from "../../components/ui/AttachmentPicker";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import {
  residentRequestsApi,
  type ResidentRequestPriority,
  type ResidentRequestType,
} from "../../lib/services/api/resident-requests";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import { uploadFileToServer } from "../../lib/utils/fileUpload";
import { IMAGE_CONFIG } from "../../lib/utils/imageUtils";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";
import * as FileSystem from "expo-file-system/legacy";

interface ValidationErrors {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
}

interface ResidentRequestForm {
  type: ResidentRequestType;
  title: string;
  description: string;
  priority: ResidentRequestPriority;
}

const getFileNameFromUri = (uri: string): string => {
  const cleanUri = uri.split("?")[0];
  const parts = cleanUri.split("/");
  const last = parts[parts.length - 1];
  if (last && last.includes(".")) {
    return last;
  }
  return `attachment_${Date.now()}.jpg`;
};

const getContentTypeFromName = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
};

export default function NewRequestScreen() {
  const { currentUser, notifications, loading } = useApp();
  const tabBarHeight = useBottomTabBarHeight();
  const maxAttachments = IMAGE_CONFIG.MAX_ATTACHMENTS;

  const [newRequest, setNewRequest] = useState<ResidentRequestForm>({
    type: "MAINTENANCE",
    title: "",
    description: "",
    priority: "MEDIUM",
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
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

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

  const handleInputChange = (
    field: keyof ResidentRequestForm,
    value: string,
  ) => {
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

  const uploadAttachmentForRequest = async (localUri: string) => {
    const fileName = getFileNameFromUri(localUri);
    const mimeType = getContentTypeFromName(fileName);
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    const sizeBytes =
      fileInfo.exists && typeof fileInfo.size === "number"
        ? fileInfo.size
        : 0;
    const url = await uploadFileToServer(localUri);

    return {
      fileName,
      mimeType,
      sizeBytes,
      url,
    };
  };

  const handleSubmit = async (): Promise<void> => {
    if (attachments.length > maxAttachments) {
      Alert.alert(
        "Attachment limit exceeded",
        `You can only attach up to ${maxAttachments} photos.`,
      );
      return;
    }

    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      let attachmentPayloads: Awaited<ReturnType<typeof uploadAttachmentForRequest>>[] = [];

      if (attachments.length > 0) {
        setIsUploadingAttachments(true);
        attachmentPayloads = await Promise.all(
          attachments.map((uri) => uploadAttachmentForRequest(uri)),
        );
        setIsUploadingAttachments(false);
      }

      console.log("[NewRequest] Submitting resident request:", {
        title: newRequest.title,
        description: newRequest.description,
        attachmentsCount: attachmentPayloads.length,
      });

      const response = await residentRequestsApi.createRequest({
        title: newRequest.title.trim(),
        description: newRequest.description.trim(),
        type: newRequest.type,
        priority: newRequest.priority,
        attachments: attachmentPayloads.length > 0 ? attachmentPayloads : undefined,
      });

      console.log("[NewRequest] Request created successfully:", response);

      showSuccessAlert("Your request has been submitted successfully!");

      // Reset form
      setNewRequest({
        type: "MAINTENANCE",
        title: "",
        description: "",
        priority: "MEDIUM",
      });
      setAttachments([]);
      // Navigate back to home
      router.push("/(tenant)" as any);
    } catch (error) {
      console.error("[NewRequest] Error submitting request:", error);
      showErrorAlert(error);
    } finally {
      setIsSubmitting(false);
      setIsUploadingAttachments(false);
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
          contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}
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
                  dropdownIconColor="#111827"
                  itemStyle={{ color: "#111827" }}
                >
                  <Picker.Item label="Cleaning" value="CLEANING" color="#111827" />
                  <Picker.Item label="Electrical" value="ELECTRICAL" color="#111827" />
                  <Picker.Item label="Maintenance" value="MAINTENANCE" color="#111827" />
                  <Picker.Item label="Plumbing/AC/Heating" value="PLUMBING_AC_HEATING" color="#111827" />
                  <Picker.Item label="Other" value="OTHER" color="#111827" />
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
                  dropdownIconColor="#111827"
                  itemStyle={{ color: "#111827" }}
                >
                  <Picker.Item label="Low" value="LOW" color="#111827" />
                  <Picker.Item label="Medium" value="MEDIUM" color="#111827" />
                  <Picker.Item label="High" value="HIGH" color="#111827" />
                </Picker>
              </View>
              {validationErrors.priority && (
                <Text style={styles.errorText}>
                  {validationErrors.priority}
                </Text>
              )}
            </View>

            {/* Attachment Picker */}
            <AttachmentPicker
              attachments={attachments}
              onAttachmentsChange={(nextAttachments) => {
                if (nextAttachments.length > maxAttachments) {
                  Alert.alert(
                    "Attachment limit exceeded",
                    `You can only attach up to ${maxAttachments} photos.`,
                  );
                  setAttachments(nextAttachments.slice(0, maxAttachments));
                  return;
                }
                setAttachments(nextAttachments);
              }}
              disabled={isSubmitting || loading}
              maxAttachments={maxAttachments}
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
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: "#111827", // Text color for selected item
    backgroundColor: "white",
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
