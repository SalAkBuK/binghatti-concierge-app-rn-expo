import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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
} from "../../lib/services/api/resident-requests";
import type { ResidentEmergencySignal } from "../../lib/types";
import {
  buildResidentCreatePayload,
  createResidentRequestFormDefaults,
  RESIDENT_REQUEST_CATEGORY_OPTIONS,
  RESIDENT_REQUEST_EMERGENCY_SIGNAL_OPTIONS,
  RESIDENT_REQUEST_PRIORITY_OPTIONS,
  type ResidentRequestFormValues,
  type ResidentRequestValidationErrors,
  validateResidentRequestForm,
} from "../../lib/utils/resident-request-form";
import { applyActiveResidentLifecycleFallback } from "../../lib/utils/resident-request-lifecycle";
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
  dangerText: "#B24A41",
  errorSoft: "#FCE3E0",
};

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

  const [newRequest, setNewRequest] = useState<ResidentRequestFormValues>(
    createResidentRequestFormDefaults(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] =
    useState<ResidentRequestValidationErrors>({});
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isPickingAttachments, setIsPickingAttachments] = useState(false);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  const handleInputChange = <K extends keyof ResidentRequestFormValues>(
    field: K,
    value: ResidentRequestFormValues[K],
  ) => {
    setNewRequest((prev) => ({ ...prev, [field]: value }));

    if (validationErrors[field as keyof ResidentRequestValidationErrors]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field as keyof ResidentRequestValidationErrors];
        return next;
      });
    }
  };

  const handleEmergencyToggle = (nextValue: boolean) => {
    setNewRequest((prev) => ({
      ...prev,
      isEmergency: nextValue,
      emergencySignals: nextValue ? prev.emergencySignals : [],
    }));

    setValidationErrors((prev) => {
      if (!prev.emergencySignals) return prev;
      const next = { ...prev };
      delete next.emergencySignals;
      return next;
    });
  };

  const toggleEmergencySignal = (signal: ResidentEmergencySignal) => {
    setNewRequest((prev) => {
      const hasSignal = prev.emergencySignals.includes(signal);
      return {
        ...prev,
        emergencySignals: hasSignal
          ? prev.emergencySignals.filter((item) => item !== signal)
          : [...prev.emergencySignals, signal],
      };
    });

    setValidationErrors((prev) => {
      if (!prev.emergencySignals) return prev;
      const next = { ...prev };
      delete next.emergencySignals;
      return next;
    });
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

    const errors = validateResidentRequestForm(newRequest);
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

      const response = await residentRequestsApi.createRequest({
        ...buildResidentCreatePayload(newRequest),
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
              description: newRequest.description.trim(),
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
              isEmergency: newRequest.isEmergency,
              emergencySignals: newRequest.emergencySignals,
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
      const createdRequestWithLifecycle =
        createdRequest && currentUser
          ? applyActiveResidentLifecycleFallback(createdRequest, currentUser)
          : createdRequest;

      if (currentUser?.id && createdRequestWithLifecycle) {
        upsertResidentRequestSnapshot(currentUser.id, createdRequestWithLifecycle);
      }

      console.log("[NewRequest] Request created successfully:", response);

      showSuccessAlert(
        "Your request has been submitted. Management will review it and update the next step.",
      );
      setNewRequest(createResidentRequestFormDefaults());
      setAttachments([]);
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
            title="Report a maintenance issue"
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
              onPress={() => router.push("/(tenant)/request-history" as any)}
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
            title="Report a maintenance issue"
            showBackButton
            showMenu={false}
            hasUnreadNotifications={hasUnreadNotifications}
          />

          <View style={styles.heroBlock}>
            <Text style={styles.heroEyebrow}>Maintenance Support</Text>
            <Text style={styles.heroTitle}>Report a maintenance issue</Text>
            <Text style={styles.heroSubtitle}>
              Tell us what happened and add photos if you can.
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
                {RESIDENT_REQUEST_CATEGORY_OPTIONS.map((option) => {
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
              <Text style={styles.sectionLabel}>Urgency</Text>
              <View style={styles.segmentedControl}>
                {RESIDENT_REQUEST_PRIORITY_OPTIONS.map((option) => {
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
              <Text style={styles.sectionLabel}>Issue Summary</Text>
              <TextInput
                style={[
                  styles.softInput,
                  validationErrors.title && styles.softInputError,
                ]}
                placeholder="AC not cooling"
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
                placeholder="What happened, where is it happening, and when did it start?"
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
              <Text style={styles.sectionLabel}>Emergency</Text>
              <View style={styles.segmentedControl}>
                {[
                  { label: "No", value: false },
                  { label: "Yes", value: true },
                ].map((option) => {
                  const selected = option.value === newRequest.isEmergency;
                  return (
                    <TouchableOpacity
                      key={option.label}
                      style={[
                        styles.segmentItem,
                        selected && styles.segmentItemSelected,
                      ]}
                      activeOpacity={0.9}
                      onPress={() => handleEmergencyToggle(option.value)}
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
              <Text style={styles.helperText}>
                Use emergency only for active leaks, no power, safety risks, or urgent cooling failures.
              </Text>
              {newRequest.isEmergency ? (
                <View style={styles.emergencySignalGrid}>
                  {RESIDENT_REQUEST_EMERGENCY_SIGNAL_OPTIONS.map((option) => {
                    const selected = newRequest.emergencySignals.includes(option.value);
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.emergencySignalChip,
                          selected && styles.emergencySignalChipSelected,
                        ]}
                        activeOpacity={0.88}
                        onPress={() => toggleEmergencySignal(option.value)}
                      >
                        <Ionicons
                          name={option.icon}
                          size={15}
                          color={selected ? P.surface : P.dangerText}
                        />
                        <Text
                          style={[
                            styles.emergencySignalText,
                            selected && styles.emergencySignalTextSelected,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
              {validationErrors.emergencySignals ? (
                <Text style={styles.errorText}>{validationErrors.emergencySignals}</Text>
              ) : null}
            </View>

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>Attachments</Text>
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
                    <Text style={styles.submitButtonText}>Submit Issue</Text>
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
  emergencySignalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  emergencySignalChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFF6F3",
    borderWidth: 1,
    borderColor: "#F4C9C2",
  },
  emergencySignalChipSelected: {
    backgroundColor: P.error,
    borderColor: P.error,
  },
  emergencySignalText: {
    fontSize: 13,
    fontWeight: "600",
    color: P.dangerText,
  },
  emergencySignalTextSelected: {
    color: P.surface,
  },
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
