import DateTimePicker from "@react-native-community/datetimepicker";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useAppDomain } from "../../lib/context/connected-app-provider";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import type {
  CreateResidentVisitorDTO,
  ResidentVisitor,
  ResidentVisitorStatus,
  ResidentVisitorType,
} from "../../lib/types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";

const BUILDING_IMAGE = require("../../assets/images/visitor-registration-building.png");

const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  surfaceHigh: "#DBE4E7",
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
  dangerBg: "#FCE3E0",
  dangerText: "#B24A41",
  shadow: "rgba(43, 52, 55, 0.08)",
  inverse: "#0C0F10",
};

type PurposeKey = "social" | "service" | "delivery" | "other";

type VisitorFormState = {
  visitorName: string;
  visitorType: ResidentVisitorType;
  phoneNumber: string;
  notes: string;
  expectedArrivalAt: Date | null;
  shareDigitalKey: boolean;
};

const PURPOSE_OPTIONS: {
  key: PurposeKey;
  label: string;
  value: ResidentVisitorType;
}[] = [
  { key: "social", label: "Social", value: "GUEST_VISITOR" },
  { key: "service", label: "Service", value: "SERVICE_PROVIDER" },
  { key: "delivery", label: "Delivery", value: "DELIVERY_RIDER" },
  { key: "other", label: "Other", value: "OTHER" },
];

const EMPTY_FORM: VisitorFormState = {
  visitorName: "",
  visitorType: "GUEST_VISITOR",
  phoneNumber: "+971",
  notes: "",
  expectedArrivalAt: null,
  shareDigitalKey: false,
};

const VISITOR_FOCUS_REFRESH_TTL_MS = 30_000;

const getPurposeKey = (type: ResidentVisitorType): PurposeKey => {
  if (type === "DELIVERY_RIDER" || type === "COURIER_PARCEL") return "delivery";
  if (
    type === "SERVICE_PROVIDER" ||
    type === "MAINTENANCE_TECHNICIAN" ||
    type === "HOUSEKEEPING_CLEANER" ||
    type === "CONTRACTOR_WORKER" ||
    type === "SECURITY_STAFF_EXTERNAL"
  ) {
    return "service";
  }
  if (type === "OTHER" || type === "DRIVER_PICKUP") return "other";
  return "social";
};

const formatDateLabel = (value: Date | null) => {
  if (!value) return "mm/dd/yyyy";
  return value.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const formatTimeLabel = (value: Date | null) => {
  if (!value) return "--:--";
  return value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatArrivalMeta = (value: string | null) => {
  if (!value) return "Arrival time flexible";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Arrival time flexible";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatVisitorType = (value: ResidentVisitorType) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getStatusMeta = (status: ResidentVisitorStatus) => {
  switch (status) {
    case "EXPECTED":
      return { bg: P.warningBg, text: P.warningText, label: "Expected" };
    case "ARRIVED":
      return { bg: "#E7EEF9", text: "#3C5A8C", label: "Arrived" };
    case "COMPLETED":
      return { bg: "#E4F4EA", text: "#25674A", label: "Completed" };
    case "CANCELLED":
      return { bg: P.dangerBg, text: P.dangerText, label: "Cancelled" };
    default:
      return { bg: P.surfaceLow, text: P.muted, label: status };
  }
};

function RecentVisitorCard({
  visitor,
  onEdit,
  onCancel,
}: {
  visitor: ResidentVisitor;
  onEdit: (visitor: ResidentVisitor) => void;
  onCancel: (visitor: ResidentVisitor) => void;
}) {
  const statusMeta = getStatusMeta(visitor.status);

  return (
    <View style={styles.recentCard}>
      <View style={styles.recentCardHeader}>
        <View style={styles.recentIdentity}>
          <View style={styles.recentAvatar}>
            <Ionicons name="person-outline" size={16} color={P.primary} />
          </View>
          <View style={styles.recentNameBlock}>
            <Text style={styles.recentName} numberOfLines={1}>
              {visitor.visitorName}
            </Text>
            <Text style={styles.recentMetaText} numberOfLines={1}>
              {formatVisitorType(visitor.type)}
            </Text>
          </View>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.statusPillText, { color: statusMeta.text }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>

      <Text style={styles.recentSupportingText}>
        {visitor.phoneNumber} · Unit {visitor.unit.label || "Assigned"}
      </Text>
      <Text style={styles.recentSupportingText}>
        {formatArrivalMeta(visitor.expectedArrivalAt)}
      </Text>

      <View style={styles.recentActionRow}>
        {visitor.status === "EXPECTED" ? (
          <>
            <TouchableOpacity style={styles.recentSecondaryAction} onPress={() => onEdit(visitor)}>
              <Ionicons name="create-outline" size={15} color={P.primary} />
              <Text style={styles.recentSecondaryActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.recentDestructiveAction} onPress={() => onCancel(visitor)}>
              <Ionicons name="close-circle-outline" size={15} color={P.dangerText} />
              <Text style={styles.recentDestructiveActionText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.recentPassivePill}>
            <Text style={styles.recentPassivePillText}>Read only</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function VisitorsScreen() {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const {
    amenityVisitor: {
      residentVisitors,
      residentVisitorsLoading,
      fetchResidentVisitors,
      createResidentVisitor,
      cancelResidentVisitor,
    },
  } = useAppDomain();
  const {
    canManageVisitors,
    isLoading: isTenancyLoading,
    statusMessage,
    statusTitle,
  } = useResidentTenancy({
    enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id),
  });
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const lastVisitorsFetchAtRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [form, setForm] = useState<VisitorFormState>(EMPTY_FORM);

  const userNotifications = useMemo(
    () => filterNotificationsByUser(notifications || [], currentUser?.id),
    [currentUser?.id, notifications],
  );
  const hasUnreadNotifications = getUnreadNotificationsCount(userNotifications) > 0;

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

  const loadVisitors = useCallback(
    async ({
      force = false,
      showError = true,
    }: {
      force?: boolean;
      showError?: boolean;
    } = {}) => {
      const hasFreshSnapshot =
        !force &&
        lastVisitorsFetchAtRef.current > 0 &&
        Date.now() - lastVisitorsFetchAtRef.current < VISITOR_FOCUS_REFRESH_TTL_MS;

      if (hasFreshSnapshot) {
        return;
      }

      try {
        await fetchResidentVisitors();
        lastVisitorsFetchAtRef.current = Date.now();
      } catch (error) {
        if (showError) {
          Alert.alert(
            "Visitor Access",
            error instanceof Error ? error.message : "Failed to load visitors.",
          );
        }
      }
    },
    [fetchResidentVisitors],
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentUser?.id) return;
      void loadVisitors({ showError: false });
    }, [currentUser?.id, loadVisitors]),
  );

  const sortedVisitors = useMemo(
    () =>
      [...residentVisitors].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [residentVisitors],
  );

  const recentVisitors = useMemo(() => sortedVisitors.slice(0, 6), [sortedVisitors]);

  const summary = useMemo(
    () => ({
      total: residentVisitors.length,
      expected: residentVisitors.filter((visitor) => visitor.status === "EXPECTED").length,
      arrived: residentVisitors.filter((visitor) => visitor.status === "ARRIVED").length,
    }),
    [residentVisitors],
  );

  const activePurpose = getPurposeKey(form.visitorType);
  const footerBottomOffset = tabBarHeight + Math.max(insets.bottom, 12) + 16;
  const scrollBottomPadding = isKeyboardVisible ? 40 : footerBottomOffset + 96;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVisitors({ force: true });
    setRefreshing(false);
  }, [loadVisitors]);

  const updateForm = useCallback(
    <K extends keyof VisitorFormState>(key: K, value: VisitorFormState[K]) => {
      setForm((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const openDateSelector = () => {
    if (!canManageVisitors || submitting) return;
    setShowDatePicker(true);
  };

  const openTimeSelector = () => {
    if (!canManageVisitors || submitting) return;
    if (!form.expectedArrivalAt) {
      const base = new Date();
      base.setHours(base.getHours() + 1, 0, 0, 0);
      updateForm("expectedArrivalAt", base);
    }
    setShowTimePicker(true);
  };

  const handleDateChange = (_: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (!selectedDate) return;

    const nextValue = form.expectedArrivalAt ? new Date(form.expectedArrivalAt) : new Date();
    nextValue.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    updateForm("expectedArrivalAt", nextValue);

    if (Platform.OS === "android") {
      setShowTimePicker(true);
    }
  };

  const handleTimeChange = (_: unknown, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (!selectedDate) return;

    const nextValue = form.expectedArrivalAt ? new Date(form.expectedArrivalAt) : new Date();
    nextValue.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    updateForm("expectedArrivalAt", nextValue);
  };

  const handlePhoneChange = (text: string) => {
    if (text.startsWith("+")) {
      updateForm("phoneNumber", `+${text.slice(1).replace(/[^\d]/g, "")}`);
      return;
    }

    updateForm("phoneNumber", text.replace(/[^\d]/g, ""));
  };

  const handleSubmit = async () => {
    if (!canManageVisitors) {
      Alert.alert("Visitor Access", statusMessage);
      return;
    }

    if (!form.visitorName.trim()) {
      Alert.alert("Visitor Name Required", "Add your visitor's full name before continuing.");
      return;
    }

    const phoneDigits = form.phoneNumber.replace(/\D/g, "");
    if (phoneDigits.length < 7) {
      Alert.alert("Phone Number Required", "Enter a valid visitor phone number.");
      return;
    }

    if (
      form.expectedArrivalAt &&
      form.expectedArrivalAt.getTime() < Date.now() - 60 * 1000
    ) {
      Alert.alert("Arrival Time Invalid", "Choose an arrival time in the future.");
      return;
    }

    const notes = [
      form.notes.trim(),
      form.shareDigitalKey ? "Digital key access requested." : null,
    ]
      .filter(Boolean)
      .join("\n");

    const payload: CreateResidentVisitorDTO = {
      type: form.visitorType,
      visitorName: form.visitorName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      ...(form.expectedArrivalAt
        ? { expectedArrivalAt: form.expectedArrivalAt.toISOString() }
        : {}),
      ...(notes ? { notes } : {}),
    };

    setSubmitting(true);
    try {
      await createResidentVisitor(payload);
      Alert.alert("Visitor Registered", "Your guest has been pre-authorized.");
      setForm(EMPTY_FORM);
      await loadVisitors({ force: true, showError: false });
    } catch (error) {
      Alert.alert(
        "Unable to Register",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditVisitor = (visitor: ResidentVisitor) => {
    router.push({
      pathname: "/(modals)/register-visitor",
      params: { visitorId: visitor.id },
    } as any);
  };

  const handleCancelVisitor = async (visitor: ResidentVisitor) => {
    Alert.alert(
      "Cancel Registration",
      `Cancel ${visitor.visitorName}'s visitor registration?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Visitor",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelResidentVisitor(visitor.id);
              lastVisitorsFetchAtRef.current = Date.now();
              Alert.alert("Visitor Cancelled", "The registration has been cancelled.");
            } catch (error) {
              Alert.alert(
                "Unable to Cancel",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar
            title="Visitors"
            subtitle="Guest access and pre-authorization"
            hasUnreadNotifications={hasUnreadNotifications}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            textColor={P.text}
          />

          <View style={styles.editorialHeader}>
            <Text style={styles.eyebrow}>Guest Access</Text>
            <Text style={styles.title}>Create a seamless entry experience.</Text>
            <Text style={styles.subtitle}>
              Fill in the details below to pre-authorize your visitor and provide digital key access if required.
            </Text>
          </View>

          {!isTenancyLoading && !canManageVisitors ? (
            <View style={styles.lockedBanner}>
              <Ionicons name="information-circle-outline" size={18} color={P.warningText} />
              <View style={styles.lockedCopy}>
                <Text style={styles.lockedTitle}>{statusTitle}</Text>
                <Text style={styles.lockedText}>{statusMessage}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={18} color={P.primary} />
              <Text style={styles.sectionTitle}>Visitor Identity</Text>
            </View>

            <Text style={styles.fieldLabel}>Visitor Full Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Alexander Sterling"
              placeholderTextColor="#9AA6AB"
              value={form.visitorName}
              onChangeText={(text) => updateForm("visitorName", text)}
              editable={canManageVisitors && !submitting}
            />
          </View>

          <View style={styles.rowGrid}>
            <View style={styles.rowCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={18} color={P.primary} />
                <Text style={styles.sectionTitle}>Visit Date</Text>
              </View>

              <TouchableOpacity
                style={styles.inputButton}
                activeOpacity={0.9}
                onPress={openDateSelector}
                disabled={!canManageVisitors || submitting}
              >
                <Text style={styles.inputButtonText}>{formatDateLabel(form.expectedArrivalAt)}</Text>
                <Ionicons name="calendar-clear-outline" size={16} color={P.soft} />
              </TouchableOpacity>
            </View>

            <View style={styles.rowCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={18} color={P.primary} />
                <Text style={styles.sectionTitle}>Arrival Time</Text>
              </View>

              <TouchableOpacity
                style={styles.inputButton}
                activeOpacity={0.9}
                onPress={openTimeSelector}
                disabled={!canManageVisitors || submitting}
              >
                <Text style={styles.inputButtonText}>{formatTimeLabel(form.expectedArrivalAt)}</Text>
                <Ionicons name="chevron-down" size={16} color={P.soft} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="clipboard-outline" size={18} color={P.primary} />
              <Text style={styles.sectionTitle}>Visit Purpose</Text>
            </View>

            <View style={styles.purposeRow}>
              {PURPOSE_OPTIONS.map((option) => {
                const active = activePurpose === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.purposeChip, active && styles.purposeChipActive]}
                    activeOpacity={0.9}
                    onPress={() => updateForm("visitorType", option.value)}
                    disabled={!canManageVisitors || submitting}
                  >
                    <Text style={[styles.purposeChipText, active && styles.purposeChipTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleVisual}>
                <Ionicons name="key-outline" size={18} color={P.primary} />
              </View>
              <View style={styles.toggleCopy}>
                <Text style={styles.sectionTitle}>Share Digital Key</Text>
                <Text style={styles.toggleDescription}>
                  Allow visitor to unlock lobby gate via smartphone
                </Text>
              </View>
              <Switch
                value={form.shareDigitalKey}
                onValueChange={(value) => updateForm("shareDigitalKey", value)}
                disabled={!canManageVisitors || submitting}
                trackColor={{ false: P.surfaceHigh, true: P.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="call-outline" size={18} color={P.primary} />
              <Text style={styles.sectionTitle}>Contact Details</Text>
            </View>

            <Text style={styles.fieldLabel}>Visitor Phone Number</Text>
            <TextInput
              style={styles.textInput}
              placeholder="+971501234567"
              placeholderTextColor="#9AA6AB"
              value={form.phoneNumber}
              onChangeText={handlePhoneChange}
              editable={canManageVisitors && !submitting}
              keyboardType="phone-pad"
              maxLength={18}
            />

            <Text style={[styles.fieldLabel, styles.notesLabel]}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Anything security or reception should know"
              placeholderTextColor="#9AA6AB"
              value={form.notes}
              onChangeText={(text) => updateForm("notes", text)}
              editable={canManageVisitors && !submitting}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={400}
            />
          </View>

          <ImageBackground
            source={BUILDING_IMAGE}
            style={styles.heroImage}
            imageStyle={styles.heroImageInner}
          >
            <View style={styles.heroImageOverlay}>
              <Text style={styles.heroImageEyebrow}>Estate Executive Residence</Text>
              <Text style={styles.heroImageTitle}>Tower Desk Premium Lounge</Text>
            </View>
          </ImageBackground>

          <View style={styles.recentSection}>
            <View style={styles.recentSectionHeader}>
              <View>
                <Text style={styles.recentSectionEyebrow}>Access History</Text>
                <Text style={styles.recentSectionTitle}>Recent registrations</Text>
              </View>
              <Text style={styles.recentSectionMeta}>
                {summary.total} total · {summary.expected} expected · {summary.arrived} arrived
              </Text>
            </View>

            {residentVisitorsLoading && residentVisitors.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={P.primary} />
                <Text style={styles.loadingText}>Loading visitor history...</Text>
              </View>
            ) : recentVisitors.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={28} color={P.soft} />
                <Text style={styles.emptyTitle}>No recent visitors yet</Text>
                <Text style={styles.emptyText}>
                  Your last visitor registrations will appear here for quick follow-up.
                </Text>
              </View>
            ) : (
              <>
                {recentVisitors.map((visitor) => (
                  <RecentVisitorCard
                    key={visitor.id}
                    visitor={visitor}
                    onEdit={handleEditVisitor}
                    onCancel={handleCancelVisitor}
                  />
                ))}
                {sortedVisitors.length > recentVisitors.length ? (
                  <Text style={styles.recentFooterText}>
                    Showing the latest {recentVisitors.length} visitor registrations.
                  </Text>
                ) : null}
              </>
            )}
          </View>

          {showDatePicker ? (
            <DateTimePicker
              value={form.expectedArrivalAt || new Date()}
              mode={Platform.OS === "ios" ? "date" : "date"}
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          ) : null}

          {showTimePicker ? (
            <DateTimePicker
              value={form.expectedArrivalAt || new Date(Date.now() + 60 * 60 * 1000)}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleTimeChange}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {!isKeyboardVisible ? (
        <View style={[styles.bottomBar, { bottom: footerBottomOffset }]}>
          <TouchableOpacity
            style={[styles.submitButton, (!canManageVisitors || submitting) && styles.submitButtonDisabled]}
            activeOpacity={0.95}
            onPress={handleSubmit}
            disabled={!canManageVisitors || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Register Visitor</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
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
  editorialHeader: {
    marginTop: 8,
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: P.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: P.text,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: P.muted,
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 20,
    backgroundColor: P.warningBg,
    padding: 16,
    marginBottom: 18,
  },
  lockedCopy: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: P.warningText,
  },
  lockedText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: P.warningText,
  },
  sectionCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: P.text,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  textInput: {
    height: 54,
    borderRadius: 16,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 16,
    fontSize: 15,
    color: P.text,
  },
  rowGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  rowCard: {
    flex: 1,
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 20,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 3,
  },
  inputButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inputButtonText: {
    fontSize: 15,
    color: P.text,
  },
  purposeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  purposeChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
  },
  purposeChipActive: {
    backgroundColor: P.primary,
  },
  purposeChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.text,
  },
  purposeChipTextActive: {
    color: "#EEF7FB",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleVisual: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(208, 230, 239, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  toggleCopy: {
    flex: 1,
    paddingRight: 12,
  },
  toggleDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
  },
  notesLabel: {
    marginTop: 16,
  },
  notesInput: {
    minHeight: 112,
    borderRadius: 16,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    color: P.text,
  },
  heroImage: {
    height: 190,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 24,
    justifyContent: "flex-end",
  },
  heroImageInner: {
    borderRadius: 24,
  },
  heroImageOverlay: {
    padding: 18,
    backgroundColor: "rgba(12, 15, 16, 0.42)",
  },
  heroImageEyebrow: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.78)",
  },
  heroImageTitle: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  recentSection: {
    marginBottom: 24,
  },
  recentSectionHeader: {
    marginBottom: 14,
  },
  recentSectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: P.primary,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginBottom: 6,
  },
  recentSectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: P.text,
  },
  recentSectionMeta: {
    marginTop: 6,
    fontSize: 13,
    color: P.muted,
  },
  loadingState: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: P.muted,
  },
  emptyState: {
    borderRadius: 24,
    backgroundColor: P.surface,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
    color: P.text,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: P.muted,
    textAlign: "center",
  },
  recentCard: {
    backgroundColor: P.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  recentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  recentIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  recentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: P.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  recentNameBlock: {
    flex: 1,
  },
  recentName: {
    fontSize: 16,
    fontWeight: "700",
    color: P.text,
  },
  recentMetaText: {
    marginTop: 2,
    fontSize: 12,
    color: P.soft,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  recentSupportingText: {
    marginTop: 10,
    fontSize: 13,
    color: P.muted,
  },
  recentActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  recentSecondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
  },
  recentSecondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.primary,
  },
  recentDestructiveAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.dangerBg,
  },
  recentDestructiveActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.dangerText,
  },
  recentPassivePill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
  },
  recentPassivePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
  },
  recentFooterText: {
    marginTop: 4,
    fontSize: 12,
    color: P.soft,
    textAlign: "center",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "rgba(12, 15, 16, 0.88)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  submitButton: {
    height: 58,
    borderRadius: 18,
    backgroundColor: P.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
