import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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

import { HeaderBar } from "../../components/ui/HeaderBar";
import {
  useAppDomain,
  useAuth,
} from "../../lib/context/connected-app-provider";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import type {
  CreateResidentVisitorDTO,
  ResidentVisitor,
  ResidentVisitorType,
} from "../../lib/types";

type RegisterVisitorForm = {
  type: ResidentVisitorType;
  visitorName: string;
  phoneNumber: string;
  emiratesId: string;
  vehicleNumber: string;
  expectedArrivalAt: Date | null;
  notes: string;
};

type ValidationErrors = Partial<Record<keyof RegisterVisitorForm, string>>;

const VISITOR_TYPE_OPTIONS: {
  value: ResidentVisitorType;
  label: string;
}[] = [
  { value: "GUEST_VISITOR", label: "Guest Visitor" },
  { value: "DELIVERY_RIDER", label: "Delivery Rider" },
  { value: "COURIER_PARCEL", label: "Courier / Parcel" },
  { value: "SERVICE_PROVIDER", label: "Service Provider" },
  { value: "MAINTENANCE_TECHNICIAN", label: "Maintenance Technician" },
  { value: "HOUSEKEEPING_CLEANER", label: "Housekeeping / Cleaner" },
  { value: "CONTRACTOR_WORKER", label: "Contractor / Worker" },
  { value: "DRIVER_PICKUP", label: "Driver / Pickup" },
  { value: "SECURITY_STAFF_EXTERNAL", label: "External Security Staff" },
  { value: "OTHER", label: "Other" },
];

const EMPTY_FORM: RegisterVisitorForm = {
  type: "GUEST_VISITOR",
  visitorName: "",
  phoneNumber: "+971",
  emiratesId: "",
  vehicleNumber: "",
  expectedArrivalAt: null,
  notes: "",
};

const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#41555D",
  primarySoft: "#D0E6EF",
  accent: "#F8EFE4",
  accentText: "#7A5A2B",
  warningBg: "#FDF1DB",
  warningText: "#9A5B00",
  danger: "#B24A41",
};

const formatDateTime = (date: Date | null): string => {
  if (!date) return "Flexible / not specified";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatEnumLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const visitorToForm = (visitor: ResidentVisitor): RegisterVisitorForm => ({
  type: visitor.type,
  visitorName: visitor.visitorName,
  phoneNumber: visitor.phoneNumber || "+971",
  emiratesId: visitor.emiratesId || "",
  vehicleNumber: visitor.vehicleNumber || "",
  expectedArrivalAt: visitor.expectedArrivalAt
    ? new Date(visitor.expectedArrivalAt)
    : null,
  notes: visitor.notes || "",
});

export default function RegisterVisitorScreen() {
  const params = useLocalSearchParams<{ visitorId?: string }>();
  const visitorId = Array.isArray(params.visitorId)
    ? params.visitorId[0]
    : params.visitorId;
  const isEditMode = Boolean(visitorId);
  const { currentUser } = useAuth();
  const {
    amenityVisitor: {
      getResidentVisitor,
      createResidentVisitor,
      updateResidentVisitor,
    },
  } = useAppDomain();
  const { canManageVisitors, isLoading: isTenancyLoading, statusMessage } =
    useResidentTenancy({
      enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id),
    });
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState<RegisterVisitorForm>(EMPTY_FORM);
  const [existingVisitor, setExistingVisitor] = useState<ResidentVisitor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingVisitor, setIsLoadingVisitor] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showArrivalDatePicker, setShowArrivalDatePicker] = useState(false);
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!visitorId || !canManageVisitors) return;

    let isMounted = true;
    setIsLoadingVisitor(true);

    getResidentVisitor(visitorId)
      .then((visitor: ResidentVisitor) => {
        if (!isMounted) return;
        setExistingVisitor(visitor);
        setFormData(visitorToForm(visitor));
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        Alert.alert(
          "Visitor Access",
          error instanceof Error ? error.message : "Failed to load visitor.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ],
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingVisitor(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [canManageVisitors, getResidentVisitor, visitorId]);

  const isEditable = useMemo(
    () => !isEditMode || existingVisitor?.status === "EXPECTED",
    [existingVisitor?.status, isEditMode],
  );

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!formData.visitorName.trim()) {
      errors.visitorName = "Visitor name is required";
    } else if (formData.visitorName.trim().length < 2) {
      errors.visitorName = "Visitor name must be at least 2 characters";
    }

    const phoneDigits = formData.phoneNumber.replace(/\D/g, "");
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = "Phone number is required";
    } else if (phoneDigits.length < 7) {
      errors.phoneNumber = "Phone number looks too short";
    }

    if (
      formData.expectedArrivalAt &&
      formData.expectedArrivalAt.getTime() < Date.now() - 60 * 1000
    ) {
      errors.expectedArrivalAt = "Expected arrival must be in the future";
    }

    return errors;
  };

  const handleInputChange = (
    field: keyof RegisterVisitorForm,
    value: string | Date | null,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value as never }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhoneChange = (text: string) => {
    if (text.startsWith("+")) {
      const normalized = "+" + text.slice(1).replace(/[^\d]/g, "");
      handleInputChange("phoneNumber", normalized);
      return;
    }

    handleInputChange("phoneNumber", text.replace(/[^\d]/g, ""));
  };

  const buildPayload = (): CreateResidentVisitorDTO => ({
    type: formData.type,
    visitorName: formData.visitorName.trim(),
    phoneNumber: formData.phoneNumber.trim(),
    ...(formData.emiratesId.trim()
      ? { emiratesId: formData.emiratesId.trim() }
      : {}),
    ...(formData.vehicleNumber.trim()
      ? { vehicleNumber: formData.vehicleNumber.trim() }
      : {}),
    ...(formData.expectedArrivalAt
      ? { expectedArrivalAt: formData.expectedArrivalAt.toISOString() }
      : {}),
    ...(formData.notes.trim() ? { notes: formData.notes.trim() } : {}),
  });

  const openArrivalPicker = () => {
    if (Platform.OS === "ios") {
      setShowArrivalDatePicker((prev) => !prev);
      return;
    }

    setShowArrivalDatePicker(true);
  };

  const handleSubmit = async () => {
    if (!isEditable) {
      Alert.alert(
        "Visitor Locked",
        "Only visitors in EXPECTED status can be edited.",
      );
      return;
    }

    if (!canManageVisitors) {
      Alert.alert("Visitor Access", statusMessage);
      return;
    }

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      if (visitorId) {
        await updateResidentVisitor(visitorId, payload);
        Alert.alert("Visitor Updated", "The visitor details were updated.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        await createResidentVisitor(payload);
        Alert.alert("Visitor Registered", "The visitor has been added.", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      }
    } catch (error) {
      Alert.alert(
        isEditMode ? "Unable to Update" : "Unable to Register",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingVisitor) {
    return (
      <SafeAreaView style={styles.container}>
        <HeaderBar
          title="Visitor"
          hasUnreadNotifications={false}
          showSideMenu={false}
          onSideMenuToggle={() => {}}
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading visitor details...</Text>
        </View>
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
          contentContainerStyle={{
            paddingBottom: isKeyboardVisible ? 32 : Math.max(insets.bottom, 20) + 28,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar
            title={isEditMode ? "Edit Visitor" : "Add Visitor"}
            hasUnreadNotifications={false}
            showSideMenu={false}
            onSideMenuToggle={() => {}}
            showBackButton
            onBackPress={() => router.back()}
          />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Visitor Registration</Text>
            <View style={styles.heroCard}>
              <View style={styles.heroCopy}>
                <Text style={styles.headerTitle}>
                  {isEditMode ? "Update Visitor Details" : "Register New Visitor"}
                </Text>
                <Text style={styles.headerSubtitle}>
                  Your active unit is inferred on the backend. Do not enter building
                  or unit information here.
                </Text>
              </View>
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaPill}>
                  <Ionicons
                    name={isEditMode ? "create-outline" : "sparkles-outline"}
                    size={14}
                    color={P.primaryDark}
                  />
                  <Text style={styles.heroMetaPillText}>
                    {isEditMode ? "Edit pass" : "New pass"}
                  </Text>
                </View>
                {existingVisitor ? (
                  <View style={[styles.heroMetaPill, styles.heroMetaPillWarm]}>
                    <Text style={styles.heroMetaPillWarmText}>
                      {formatEnumLabel(existingVisitor.status)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {!isEditable ? (
            <View style={styles.lockedBanner}>
              <Ionicons name="lock-closed-outline" size={18} color={P.warningText} />
              <Text style={styles.lockedBannerText}>
                This visitor is no longer editable because it is not in EXPECTED
                status.
              </Text>
            </View>
          ) : null}

          {!isTenancyLoading && !canManageVisitors ? (
            <View style={styles.lockedBanner}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={P.warningText}
              />
              <Text style={styles.lockedBannerText}>{statusMessage}</Text>
            </View>
          ) : null}

          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Visitor Profile</Text>
              <Text style={styles.formSubtitle}>
                Security uses these details to pre-authorize access and speed up
                arrival.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Visitor Type *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.type}
                  onValueChange={(value) =>
                    handleInputChange("type", value as ResidentVisitorType)
                  }
                  enabled={canManageVisitors && isEditable && !isSubmitting}
                  style={styles.picker}
                  dropdownIconColor={P.text}
                >
                  {VISITOR_TYPE_OPTIONS.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                      color={P.text}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Visitor Name *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  validationErrors.visitorName && styles.errorInput,
                  !isEditable && styles.disabledInput,
                ]}
                placeholder="Enter visitor's full name"
                placeholderTextColor={P.soft}
                value={formData.visitorName}
                onChangeText={(text) => handleInputChange("visitorName", text)}
                editable={canManageVisitors && isEditable && !isSubmitting}
                maxLength={120}
              />
              {validationErrors.visitorName ? (
                <Text style={styles.errorText}>{validationErrors.visitorName}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  validationErrors.phoneNumber && styles.errorInput,
                  !isEditable && styles.disabledInput,
                ]}
                placeholder="+971501234567"
                placeholderTextColor={P.soft}
                value={formData.phoneNumber}
                onChangeText={handlePhoneChange}
                editable={canManageVisitors && isEditable && !isSubmitting}
                keyboardType="phone-pad"
                maxLength={18}
              />
              {validationErrors.phoneNumber ? (
                <Text style={styles.errorText}>{validationErrors.phoneNumber}</Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Emirates ID</Text>
              <TextInput
                style={[styles.textInput, !isEditable && styles.disabledInput]}
                placeholder="Optional"
                placeholderTextColor={P.soft}
                value={formData.emiratesId}
                onChangeText={(text) => handleInputChange("emiratesId", text)}
                editable={canManageVisitors && isEditable && !isSubmitting}
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vehicle Number</Text>
              <TextInput
                style={[styles.textInput, !isEditable && styles.disabledInput]}
                placeholder="Optional"
                placeholderTextColor={P.soft}
                value={formData.vehicleNumber}
                onChangeText={(text) => handleInputChange("vehicleNumber", text)}
                editable={canManageVisitors && isEditable && !isSubmitting}
                maxLength={50}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expected Arrival</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  validationErrors.expectedArrivalAt && styles.errorInput,
                  !isEditable && styles.disabledInput,
                ]}
                onPress={() => {
                  if (canManageVisitors && isEditable && !isSubmitting) {
                    openArrivalPicker();
                  }
                }}
                disabled={!canManageVisitors || !isEditable || isSubmitting}
              >
                <Ionicons name="calendar-outline" size={20} color={P.muted} />
                <Text style={styles.datePickerText}>
                  {formatDateTime(formData.expectedArrivalAt)}
                </Text>
              </TouchableOpacity>
              {validationErrors.expectedArrivalAt ? (
                <Text style={styles.errorText}>
                  {validationErrors.expectedArrivalAt}
                </Text>
              ) : null}
              {showArrivalDatePicker ? (
                <DateTimePicker
                  value={formData.expectedArrivalAt || new Date(Date.now() + 3600000)}
                  mode={Platform.OS === "ios" ? "datetime" : "date"}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(_, selectedDate) => {
                    if (Platform.OS === "ios") {
                      if (selectedDate) {
                        handleInputChange("expectedArrivalAt", selectedDate);
                      }
                      return;
                    }

                    setShowArrivalDatePicker(false);
                    if (!selectedDate) {
                      return;
                    }

                    const nextValue = formData.expectedArrivalAt
                      ? new Date(formData.expectedArrivalAt)
                      : new Date();
                    nextValue.setFullYear(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth(),
                      selectedDate.getDate(),
                    );
                    handleInputChange("expectedArrivalAt", nextValue);
                    setShowArrivalTimePicker(true);
                  }}
                  minimumDate={new Date()}
                />
              ) : null}
              {Platform.OS === "android" && showArrivalTimePicker ? (
                <DateTimePicker
                  value={formData.expectedArrivalAt || new Date(Date.now() + 3600000)}
                  mode="time"
                  display="default"
                  onChange={(_, selectedDate) => {
                    setShowArrivalTimePicker(false);
                    if (!selectedDate) {
                      return;
                    }

                    const nextValue = formData.expectedArrivalAt
                      ? new Date(formData.expectedArrivalAt)
                      : new Date();
                    nextValue.setHours(
                      selectedDate.getHours(),
                      selectedDate.getMinutes(),
                      0,
                      0,
                    );
                    handleInputChange("expectedArrivalAt", nextValue);
                  }}
                />
              ) : null}
              {formData.expectedArrivalAt && isEditable ? (
                <TouchableOpacity
                  style={styles.clearDateButton}
                  onPress={() => handleInputChange("expectedArrivalAt", null)}
                  disabled={!canManageVisitors}
                >
                  <Text style={styles.clearDateText}>Clear expected arrival</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.textArea, !isEditable && styles.disabledInput]}
                placeholder="Optional notes for security or reception"
                placeholderTextColor={P.soft}
                value={formData.notes}
                onChangeText={(text) => handleInputChange("notes", text)}
                editable={canManageVisitors && isEditable && !isSubmitting}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={400}
              />
            </View>

            {!isKeyboardVisible ? (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!canManageVisitors || !isEditable || isSubmitting) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!canManageVisitors || !isEditable || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={isEditMode ? "save-outline" : "person-add-outline"}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitButtonText}>
                      {isEditMode ? "Save Changes" : "Register Visitor"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: P.primary,
    marginBottom: 10,
  },
  heroCard: {
    backgroundColor: P.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 20,
    paddingVertical: 20,
    shadowColor: "#2B3437",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroCopy: {
    gap: 8,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  heroMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: P.primarySoft,
  },
  heroMetaPillWarm: {
    backgroundColor: P.accent,
  },
  heroMetaPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.primaryDark,
  },
  heroMetaPillWarmText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.accentText,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: P.text,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: P.muted,
    lineHeight: 20,
  },
  lockedBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: P.warningBg,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F0D7AA",
  },
  lockedBannerText: {
    flex: 1,
    fontSize: 13,
    color: P.warningText,
    lineHeight: 18,
  },
  formContainer: {
    backgroundColor: P.surface,
    borderRadius: 28,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: "#2B3437",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  formHeader: {
    marginBottom: 18,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: P.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: P.muted,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: P.text,
    marginBottom: 9,
    letterSpacing: 0.2,
  },
  textInput: {
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: P.text,
  },
  textArea: {
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: P.text,
    minHeight: 110,
  },
  pickerContainer: {
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    overflow: "hidden",
  },
  picker: {
    color: P.text,
  },
  datePickerButton: {
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  datePickerText: {
    marginLeft: 10,
    fontSize: 15,
    color: P.text,
  },
  clearDateButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearDateText: {
    fontSize: 13,
    fontWeight: "600",
    color: P.primary,
  },
  submitButton: {
    marginTop: 10,
    backgroundColor: P.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: P.primaryDark,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  errorInput: {
    borderColor: P.danger,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: P.danger,
  },
  disabledInput: {
    opacity: 0.65,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: P.muted,
  },
});
