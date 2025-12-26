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
import { maintenanceApi } from "../../lib/services/api/maintenance";
import type { CreateRequestDTO } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";
import { uploadFileToServer } from "../../lib/utils/fileUpload";
import { IMAGE_CONFIG } from "../../lib/utils/imageUtils";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";

interface ValidationErrors {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
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

  const [newRequest, setNewRequest] = useState<CreateRequestDTO>({
    type: "maintenance",
    title: "",
    description: "",
    priority: "medium",
    apartment: currentUser?.profile?.apartment || "",
    floor: currentUser?.profile?.floor || currentUser?.profile?.floorNumber
      ? String(currentUser.profile.floorNumber)
      : "",
    buildingId:
      currentUser?.profile?.buildingId ||
      currentUser?.profile?.managedBuildingIds?.[0] ||
      "",
    preferredTime: "",
    contactPhone: currentUser?.profile?.phone || "",
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
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

  const uploadAttachmentForRequest = async (
    localUri: string,
    requestIdNum: number,
    uploadedById: number,
  ): Promise<void> => {
    const fileName = getFileNameFromUri(localUri);
    const contentType = getContentTypeFromName(fileName);

    const uploadedUrl = await uploadFileToServer(localUri, requestIdNum);

    await maintenanceApi.addMaintenanceRequestAttachment({
      requestId: requestIdNum,
      uploadedById,
      fileUrl: uploadedUrl,
      fileName,
      contentType,
    });
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
      // Get tenant ID and building ID from current user
      const tenantId = currentUser?.id;
      const buildingId = currentUser?.profile?.buildingId;

      if (!tenantId) {
        throw new Error("Tenant ID not found. Please log in again.");
      }

      if (!buildingId) {
        throw new Error("Building ID not found. Please ensure your profile is complete.");
      }

      // Map priority string to number (1=Low, 2=Medium, 3=High, 4=Urgent)
      const priorityMap: { [key: string]: number } = {
        low: 1,
        medium: 2,
        high: 3,
        urgent: 4,
      };

      const priorityNumber = priorityMap[newRequest.priority] || 2;

      // Convert buildingId and tenantId to numbers
      const buildingIdNum = typeof buildingId === 'string'
        ? parseInt(buildingId.replace(/\D/g, ''), 10)
        : buildingId;

      const tenantIdNum = typeof tenantId === 'string'
        ? parseInt(tenantId.replace(/\D/g, ''), 10)
        : tenantId;

      console.log("[NewRequest] Submitting maintenance request:", {
        buildingId: buildingIdNum,
        createdById: tenantIdNum,
        title: newRequest.title,
        description: newRequest.description,
        priority: priorityNumber,
        attachmentsCount: attachments.length,
      });

      // Call the backend API
      const response = await maintenanceApi.createMaintenanceRequest({
        buildingId: buildingIdNum,
        createdById: tenantIdNum,
        title: newRequest.title,
        description: newRequest.description,
        priority: priorityNumber,
      });

      console.log("[NewRequest] Request created successfully:", response);

      // Extract requestId from the response
      const requestId =
        response?.data?.id ||
        response?.data?.requestId ||
        response?.id ||
        response?.requestId ||
        (typeof response === "number" ? response : null);
      let requestIdNum = Number(requestId);

      if ((!requestId || Number.isNaN(requestIdNum)) && tenantIdNum) {
        try {
          const tenantRequests = await maintenanceApi.getMaintenanceRequestsByTenantId(
            tenantIdNum,
          );
          if (tenantRequests.success && Array.isArray(tenantRequests.data) && tenantRequests.data.length > 0) {
            const latest = tenantRequests.data
              .map((req: any) => ({
                ...req,
                createdAt: req.createdAt || req.created_at || new Date().toISOString(),
              }))
              .sort(
                (a: any, b: any) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              )[0];
            if (latest?.id) {
              requestIdNum = Number(latest.id);
            }
          }
        } catch (lookupErr) {
          console.warn("[NewRequest] Fallback fetch for latest tenant request failed", lookupErr);
        }
      }

      if (!requestIdNum || Number.isNaN(requestIdNum)) {
        console.warn("[NewRequest] No requestId returned from API; skipping attachment upload");
      }

      // Upload attachments if any
      if (attachments.length > 0 && requestIdNum && !Number.isNaN(requestIdNum)) {
        console.log(`[NewRequest] Uploading ${attachments.length} attachments for request ${requestIdNum}`);
        setIsUploadingAttachments(true);

        let failedCount = 0;
        for (let i = 0; i < attachments.length; i++) {
          const localUri = attachments[i];
          try {
            console.log(`[NewRequest] Uploading attachment ${i + 1}/${attachments.length}`);
            await uploadAttachmentForRequest(localUri, requestIdNum, tenantIdNum);
          } catch (attachmentError) {
            failedCount += 1;
            console.error(`[NewRequest] Failed to upload attachment ${i + 1}:`, attachmentError);
          }
        }

        setIsUploadingAttachments(false);

        if (failedCount > 0) {
          Alert.alert(
            "Partial Success",
            `Your request was created, but ${failedCount} attachment${failedCount > 1 ? "s" : ""} failed to upload. You can try adding them later.`,
          );
        } else {
          console.log("[NewRequest] All attachments processed");
        }
      }

      showSuccessAlert("Your request has been submitted successfully!");

      // Reset form
      setNewRequest({
        type: "maintenance",
        title: "",
        description: "",
        priority: "medium",
        apartment: currentUser?.profile?.apartment || "",
        buildingId:
          currentUser?.profile?.buildingId ||
          currentUser?.profile?.managedBuildingIds?.[0] ||
          "",
        preferredTime: "",
        contactPhone: currentUser?.profile?.phone || "",
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
                  <Picker.Item label="Maintenance" value="maintenance" color="#111827" />
                  <Picker.Item label="Repair" value="repair" color="#111827" />
                  <Picker.Item label="Cleaning" value="cleaning" color="#111827" />
                  <Picker.Item label="Electrical" value="electrical" color="#111827" />
                  <Picker.Item label="Plumbing" value="plumbing" color="#111827" />
                  <Picker.Item label="AC/Heating" value="hvac" color="#111827" />
                  <Picker.Item label="Other" value="other" color="#111827" />
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
                  <Picker.Item label="Low" value="low" color="#111827" />
                  <Picker.Item label="Medium" value="medium" color="#111827" />
                  <Picker.Item label="High" value="high" color="#111827" />
                  <Picker.Item label="Urgent" value="urgent" color="#111827" />
                </Picker>
              </View>
              {validationErrors.priority && (
                <Text style={styles.errorText}>
                  {validationErrors.priority}
                </Text>
              )}
            </View>

            {/* Apartment */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Apartment</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 1205"
                value={newRequest.apartment}
                onChangeText={(text) => handleInputChange("apartment", text)}
              />
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
