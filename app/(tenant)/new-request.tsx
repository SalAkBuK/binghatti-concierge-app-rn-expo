import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { HeaderBar } from "../../components/ui/HeaderBar";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { useNotices } from "../../lib/context/notices-context";
import { useRequests } from "../../lib/context/requests-context";
import {
  mapResidentRequestFromBackend,
  upsertResidentRequestSnapshot,
} from "../../lib/hooks/useResidentRequests";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import {
  residentRequestsApi,
  type ResidentRequestPriority,
  type ResidentRequestType,
} from "../../lib/services/api/resident-requests";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";
import * as FileSystem from "expo-file-system/legacy";
import {
  IMAGE_CONFIG,
  pickImageFromCamera,
  pickMultipleImagesFromGallery,
} from "../../lib/utils/imageUtils";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import { uploadFileToServer } from "../../lib/utils/fileUpload";

const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  surfaceHigh: "#DDE5E9",
  surfaceSoft: "#EAF0F3",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#34474D",
  primarySoft: "#D6E4E8",
  accent: "#F7EEDF",
  accentBorder: "#EBD8BB",
  error: "#B24A41",
  errorSoft: "#FCE3E0",
};

type ValidationErrors = {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
};

type ResidentRequestForm = {
  type: ResidentRequestType;
  title: string;
  description: string;
  priority: ResidentRequestPriority;
};

type VisitWindow = "09:00 AM - 12:00 PM" | "12:00 PM - 03:00 PM" | "03:00 PM - 06:00 PM";

const CATEGORY_OPTIONS: { label: string; value: ResidentRequestType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Plumbing", value: "PLUMBING_AC_HEATING", icon: "water-outline" },
  { label: "Electrical", value: "ELECTRICAL", icon: "flash-outline" },
  { label: "Maintenance", value: "MAINTENANCE", icon: "construct-outline" },
  { label: "Cleaning", value: "CLEANING", icon: "sparkles-outline" },
  { label: "Other", value: "OTHER", icon: "apps-outline" },
];

const PRIORITY_OPTIONS: { label: string; value: ResidentRequestPriority }[] = [
  { label: "Low", value: "LOW" },
  { label: "Normal", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
];

const VISIT_WINDOWS: VisitWindow[] = [
  "09:00 AM - 12:00 PM",
  "12:00 PM - 03:00 PM",
  "03:00 PM - 06:00 PM",
];

const getTomorrow = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return next;
};

const formatVisitDate = (value: Date) =>
  value.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

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
  const { currentUser, loading: authLoading } = useAuth();
  const { notifications, loading: notificationsLoading } = useNotifications();
  const { loading: requestsLoading } = useRequests();
  const { loading: noticesLoading } = useNotices();
  const {
    canCreateMaintenanceRequest,
    isLoading: isTenancyLoading,
    statusMessage,
    statusTitle,
  } = useResidentTenancy({
    enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id),
  });
  const loading =
    authLoading || requestsLoading || notificationsLoading || noticesLoading;
  const tabBarHeight = useBottomTabBarHeight();
  const maxAttachments = IMAGE_CONFIG.MAX_ATTACHMENTS;

  const [newRequest, setNewRequest] = useState<ResidentRequestForm>({
    type: "PLUMBING_AC_HEATING",
    title: "",
    description: "",
    priority: "MEDIUM",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isPickingAttachments, setIsPickingAttachments] = useState(false);
  const [preferredVisitDate, setPreferredVisitDate] = useState<Date>(getTomorrow);
  const [preferredVisitWindow, setPreferredVisitWindow] =
    useState<VisitWindow>("09:00 AM - 12:00 PM");
  const [showVisitDatePicker, setShowVisitDatePicker] = useState(false);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  const selectedCategory = useMemo(
    () => CATEGORY_OPTIONS.find((item) => item.value === newRequest.type),
    [newRequest.type],
  );

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
      errors.type = "Category is required";
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

    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof ValidationErrors];
        return next;
      });
    }
  };

  const handleAddAttachment = () => {
    if (attachments.length >= maxAttachments) {
      Alert.alert(
        "Maximum Reached",
        `You can only attach up to ${maxAttachments} photos per request.`,
      );
      return;
    }

    Alert.alert(
      "Add Photo",
      "Choose how you want to add a photo",
      [
        { text: "Camera", onPress: () => void handleCamera() },
        { text: "Gallery", onPress: () => void handleGallery() },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  const handleCamera = async () => {
    try {
      setIsPickingAttachments(true);
      const uri = await pickImageFromCamera();
      if (!uri) return;
      setAttachments((prev) => {
        if (prev.length >= maxAttachments) return prev;
        return [...prev, uri];
      });
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to capture photo. Please try again.",
      );
    } finally {
      setIsPickingAttachments(false);
    }
  };

  const handleGallery = async () => {
    try {
      setIsPickingAttachments(true);
      const remainingSlots = maxAttachments - attachments.length;
      const uris = await pickMultipleImagesFromGallery(remainingSlots);
      if (!uris.length) return;
      setAttachments((prev) => [...prev, ...uris].slice(0, maxAttachments));
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to select photos. Please try again.",
      );
    } finally {
      setIsPickingAttachments(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const uploadAttachmentForRequest = async (localUri: string) => {
    const fileName = getFileNameFromUri(localUri);
    const mimeType = getContentTypeFromName(fileName);
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    const sizeBytes =
      fileInfo.exists && typeof fileInfo.size === "number" ? fileInfo.size : 0;
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
      let attachmentPayloads: Awaited<
        ReturnType<typeof uploadAttachmentForRequest>
      >[] = [];

      if (attachments.length > 0) {
        setIsUploadingAttachments(true);
        attachmentPayloads = await Promise.all(
          attachments.map((uri) => uploadAttachmentForRequest(uri)),
        );
        setIsUploadingAttachments(false);
      }

      const visitPreferenceNote = `Preferred visit time: ${formatVisitDate(
        preferredVisitDate,
      )}, ${preferredVisitWindow}.`;

      const response = await residentRequestsApi.createRequest({
        title: newRequest.title.trim(),
        description: `${newRequest.description.trim()}\n\n${visitPreferenceNote}`,
        type: newRequest.type,
        priority: newRequest.priority,
        attachments: attachmentPayloads.length > 0 ? attachmentPayloads : undefined,
      });
      const responsePayload =
        response && typeof response === "object" && "data" in response && response.data
          ? response.data
          : response;

      const createdRequest =
        mapResidentRequestFromBackend(responsePayload, currentUser) ??
        (currentUser?.id
          ? {
              id: String(
                responsePayload?.id ??
                  responsePayload?.requestId ??
                  `resident-request-${Date.now()}`,
              ),
              tenantId: currentUser.id,
              title: newRequest.title.trim(),
              description: `${newRequest.description.trim()}\n\n${visitPreferenceNote}`,
              type:
                newRequest.type === "PLUMBING_AC_HEATING"
                  ? "hvac"
                  : newRequest.type === "ELECTRICAL"
                    ? "electrical"
                    : newRequest.type === "CLEANING"
                      ? "cleaning"
                      : newRequest.type === "OTHER"
                        ? "other"
                        : "maintenance",
              status: "pending" as const,
              priority:
                newRequest.priority === "LOW"
                  ? ("low" as const)
                  : newRequest.priority === "HIGH"
                    ? ("high" as const)
                    : ("medium" as const),
              assignedTo: undefined,
              buildingId: currentUser.profile?.buildingId,
              buildingName: currentUser.profile?.buildingName,
              apartment: currentUser.profile?.apartment || "",
              floor: currentUser.profile?.floor || "",
              contactPhone: currentUser.profile?.phone || "",
              preferredTime: `${formatVisitDate(preferredVisitDate)}, ${preferredVisitWindow}`,
              additionalNotes: "",
              attachments: attachmentPayloads.map((item) => item.url),
              comments: [],
              messages: [],
              notes: [],
              timeline: [],
              createdAt:
                responsePayload?.createdAt ??
                responsePayload?.updatedAt ??
                new Date().toISOString(),
              updatedAt:
                responsePayload?.updatedAt ??
                responsePayload?.createdAt ??
                new Date().toISOString(),
            }
          : null);

      if (currentUser?.id && createdRequest) {
        upsertResidentRequestSnapshot(currentUser.id, createdRequest);
      }

      console.log("[NewRequest] Request created successfully:", response);

      showSuccessAlert("Your request has been submitted successfully!");
      setNewRequest({
        type: "PLUMBING_AC_HEATING",
        title: "",
        description: "",
        priority: "MEDIUM",
      });
      setAttachments([]);
      setPreferredVisitDate(getTomorrow());
      setPreferredVisitWindow("09:00 AM - 12:00 PM");
      router.push("/(tenant)" as any);
    } catch (error) {
      console.error("[NewRequest] Error submitting request:", error);
      showErrorAlert(error);
    } finally {
      setIsSubmitting(false);
      setIsUploadingAttachments(false);
    }
  };

  if (!isTenancyLoading && !canCreateMaintenanceRequest) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}
        >
          <HeaderBar
            title="New Request"
            showBackButton
            showMenu={false}
            hasUnreadNotifications={hasUnreadNotifications}
          />

          <View style={styles.heroBlock}>
            <Text style={styles.heroEyebrow}>Resident Access</Text>
            <Text style={styles.heroTitle}>{statusTitle}</Text>
            <Text style={styles.heroSubtitle}>{statusMessage}</Text>
          </View>

          <View style={styles.unavailableCard}>
            <Text style={styles.unavailableTitle}>New requests are unavailable</Text>
            <Text style={styles.unavailableText}>
              Maintenance requests can only be created while your account has an active unit.
            </Text>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/(tenant)/requests" as any)}
            >
              <Text style={styles.secondaryButtonText}>Open Request History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/(tenant)/lease-details" as any)}
            >
              <Text style={styles.secondaryButtonText}>Open Contract Details</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar
            title="New Request"
            showBackButton
            showMenu={false}
            hasUnreadNotifications={hasUnreadNotifications}
          />

          <View style={styles.heroBlock}>
            <Text style={styles.heroEyebrow}>Service Care</Text>
            <Text style={styles.heroTitle}>New Request</Text>
            <Text style={styles.heroSubtitle}>
              {selectedCategory
                ? `Describe the issue clearly and we will route it to the right ${selectedCategory.label.toLowerCase()} team.`
                : "Describe the issue clearly and we will route it to the right team."}
            </Text>
          </View>

          <View style={styles.formLayout}>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRail}
              >
                {CATEGORY_OPTIONS.map((option) => {
                  const selected = option.value === newRequest.type;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipSelected,
                      ]}
                      activeOpacity={0.9}
                      onPress={() => handleInputChange("type", option.value)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={15}
                        color={selected ? P.surface : P.primary}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {validationErrors.type ? (
                <Text style={styles.errorText}>{validationErrors.type}</Text>
              ) : null}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Priority Level</Text>
              <View style={styles.segmentedControl}>
                {PRIORITY_OPTIONS.map((option) => {
                  const selected = option.value === newRequest.priority;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.segmentItem,
                        selected && styles.segmentItemSelected,
                      ]}
                      activeOpacity={0.9}
                      onPress={() => handleInputChange("priority", option.value)}
                    >
                      <Text
                        style={[
                          styles.segmentItemText,
                          selected && styles.segmentItemTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {validationErrors.priority ? (
                <Text style={styles.errorText}>{validationErrors.priority}</Text>
              ) : null}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Request Title</Text>
              <TextInput
                style={[
                  styles.softInput,
                  validationErrors.title && styles.softInputError,
                ]}
                placeholder="Short summary of the issue"
                placeholderTextColor={P.soft}
                value={newRequest.title}
                onChangeText={(text) => handleInputChange("title", text)}
                maxLength={100}
              />
              {validationErrors.title ? (
                <Text style={styles.errorText}>{validationErrors.title}</Text>
              ) : null}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Description</Text>
              <TextInput
                style={[
                  styles.descriptionInput,
                  validationErrors.description && styles.softInputError,
                ]}
                placeholder="Describe the issue..."
                placeholderTextColor={P.soft}
                value={newRequest.description}
                onChangeText={(text) => handleInputChange("description", text)}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={500}
              />
              {validationErrors.description ? (
                <Text style={styles.errorText}>{validationErrors.description}</Text>
              ) : null}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Attachment</Text>
              <View style={styles.attachmentRow}>
                <TouchableOpacity
                  style={[
                    styles.addPhotoTile,
                    (isSubmitting || isPickingAttachments) && styles.tileDisabled,
                  ]}
                  activeOpacity={0.85}
                  onPress={handleAddAttachment}
                  disabled={isSubmitting || isPickingAttachments}
                >
                  {isPickingAttachments ? (
                    <ActivityIndicator color={P.primary} />
                  ) : (
                    <>
                      <View style={styles.addPhotoIconWrap}>
                        <Ionicons name="camera-outline" size={20} color={P.soft} />
                      </View>
                      <Text style={styles.addPhotoText}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>

                {attachments.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.photoTile}>
                    <Image source={{ uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => handleRemoveAttachment(index)}
                    >
                      <Ionicons name="close" size={12} color={P.surface} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <Text style={styles.helperText}>
                Up to {maxAttachments} photos. JPEG, PNG and WebP are supported.
              </Text>
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Preferred Visit Time</Text>
              <View style={styles.visitCards}>
                <TouchableOpacity
                  style={styles.visitCard}
                  activeOpacity={0.88}
                  onPress={() => setShowVisitDatePicker(true)}
                >
                  <View style={styles.visitCardIcon}>
                    <Ionicons name="calendar-outline" size={16} color={P.primary} />
                  </View>
                  <View style={styles.visitCardCopy}>
                    <Text style={styles.visitCardLabel}>Date</Text>
                    <Text style={styles.visitCardValue}>{formatVisitDate(preferredVisitDate)}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.visitWindowGroup}>
                  {VISIT_WINDOWS.map((window) => {
                    const selected = preferredVisitWindow === window;
                    return (
                      <TouchableOpacity
                        key={window}
                        style={[
                          styles.visitWindowChip,
                          selected && styles.visitWindowChipSelected,
                        ]}
                        activeOpacity={0.88}
                        onPress={() => setPreferredVisitWindow(window)}
                      >
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={selected ? P.surface : P.primary}
                        />
                        <Text
                          style={[
                            styles.visitWindowText,
                            selected && styles.visitWindowTextSelected,
                          ]}
                        >
                          {window}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.helperText}>
                  Your preferred visit slot is added to the request notes.
                </Text>
              </View>
            </View>

            {showVisitDatePicker ? (
              <DateTimePicker
                value={preferredVisitDate}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, value) => {
                  if (Platform.OS !== "ios") {
                    setShowVisitDatePicker(false);
                  }
                  if (!value) return;
                  setPreferredVisitDate(value);
                }}
              />
            ) : null}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || loading || isUploadingAttachments) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || loading || isUploadingAttachments}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[P.primary, P.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                {isSubmitting || loading || isUploadingAttachments ? (
                  <ActivityIndicator color={P.surface} />
                ) : (
                  <>
                    <Ionicons
                      name="send-outline"
                      size={18}
                      color={P.surface}
                      style={styles.submitIcon}
                    />
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  keyboardAvoidingView: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  heroBlock: { paddingTop: 12, paddingBottom: 24 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: { fontSize: 30, lineHeight: 34, fontWeight: "800", color: P.text, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, lineHeight: 22, color: P.muted, maxWidth: 300 },
  formLayout: {
    backgroundColor: P.surface,
    borderRadius: 28,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: P.border,
  },
  sectionBlock: { marginBottom: 22 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  categoryRail: { paddingRight: 20, gap: 10 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    marginRight: 10,
  },
  categoryChipSelected: { backgroundColor: P.primary },
  categoryChipText: { fontSize: 13, fontWeight: "600", color: P.text },
  categoryChipTextSelected: { color: P.surface },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 14,
  },
  segmentItemSelected: {
    backgroundColor: P.surface,
    shadowColor: "rgba(43, 52, 55, 0.08)",
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  segmentItemText: { fontSize: 13, fontWeight: "600", color: P.soft },
  segmentItemTextSelected: { color: P.text },
  softInput: {
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: P.surfaceHigh,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: P.text,
  },
  descriptionInput: {
    minHeight: 138,
    borderRadius: 22,
    backgroundColor: P.surfaceHigh,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontSize: 15,
    lineHeight: 22,
    color: P.text,
  },
  softInputError: {
    borderWidth: 1,
    borderColor: P.error,
    backgroundColor: P.errorSoft,
  },
  errorText: { marginTop: 6, fontSize: 12, color: P.error, fontWeight: "600" },
  attachmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  addPhotoTile: {
    width: 96,
    height: 96,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: P.border,
    backgroundColor: P.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  tileDisabled: { opacity: 0.6 },
  addPhotoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  addPhotoText: { fontSize: 12, fontWeight: "600", color: P.muted },
  photoTile: {
    width: 96,
    height: 96,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: P.surfaceLow,
    position: "relative",
  },
  photoImage: { width: "100%", height: "100%" },
  removePhotoButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(43,52,55,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  helperText: { marginTop: 10, fontSize: 12, lineHeight: 18, color: P.soft },
  visitCards: { gap: 12 },
  visitCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: P.surfaceHigh,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  visitCardIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: P.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  visitCardCopy: { gap: 2 },
  visitCardLabel: { fontSize: 11, fontWeight: "700", color: P.soft, textTransform: "uppercase" },
  visitCardValue: { fontSize: 14, fontWeight: "700", color: P.text },
  visitWindowGroup: { gap: 10 },
  visitWindowChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  visitWindowChipSelected: { backgroundColor: P.primary },
  visitWindowText: { fontSize: 13, fontWeight: "600", color: P.primary },
  visitWindowTextSelected: { color: P.surface },
  submitButton: {
    marginTop: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitGradient: {
    minHeight: 56,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  submitIcon: { marginRight: 8 },
  submitButtonText: { fontSize: 16, fontWeight: "700", color: P.surface },
  unavailableCard: {
    backgroundColor: P.surface,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: P.accentBorder,
    marginBottom: 24,
  },
  unavailableTitle: { fontSize: 20, fontWeight: "700", color: P.text, marginBottom: 8 },
  unavailableText: { fontSize: 14, lineHeight: 22, color: P.muted, marginBottom: 8 },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.accent,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: "700", color: P.primary },
});
