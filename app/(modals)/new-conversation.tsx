import React, { useEffect, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/context/auth-context";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import { useResidentContract } from "../../lib/hooks/useResidentSelfService";
import { useMessaging } from "../../lib/context/messaging-context";
import type { ResidentConversationTarget } from "../../lib/types";
const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#34474D",
  primarySoft: "#DCE8EE",
  accent: "#F8EFE4",
  accentText: "#7A5A2B",
  warningBg: "#FDF1DB",
  warningText: "#9A5B00",
  shadow: "rgba(43, 52, 55, 0.08)",
};

export default function NewConversationModal() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { actions } = useMessaging();
  const { canCreateManagementConversation, isLoading: isTenancyLoading, statusMessage } =
    useResidentTenancy({
      enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id),
    });
  const { data: contractData } = useResidentContract({
    enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id),
  });
  const canComposeConversation =
    currentUser?.role === "tenant" ? canCreateManagementConversation : true;
  const [subject, setSubject] = useState("");
  const [participantIds, setParticipantIds] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [target, setTarget] = useState<ResidentConversationTarget>("management");
  const isTenant = currentUser?.role === "tenant";
  const hasAssignedOwner = Boolean(contractData.contract?.ownerNameSnapshot?.trim());
  const isSubmitDisabled = submitting || !canComposeConversation;

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
    if (isTenant && target === "owner" && !hasAssignedOwner) {
      setTarget("management");
    }
  }, [hasAssignedOwner, isTenant, target]);

  const handleSubmit = async () => {
    if (!canComposeConversation) {
      Alert.alert("Messaging Unavailable", statusMessage);
      return;
    }

    const ids = participantIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!isTenant && ids.length === 0) {
      Alert.alert("Error", "Please enter at least one participant ID.");
      return;
    }
    if (!message.trim()) {
      Alert.alert("Error", "Please enter a message.");
      return;
    }

    if (isTenant && target === "owner" && !hasAssignedOwner) {
      Alert.alert("Owner Unavailable", "No owner is assigned to this unit.");
      setTarget("management");
      return;
    }

    setSubmitting(true);
    try {
      const conversation = isTenant
        ? await actions.createResidentConversation(target, {
            subject: subject.trim() || undefined,
            message: message.trim(),
          })
        : await actions.createConversation({
            subject: subject.trim() || undefined,
            participantIds: ids,
            initialMessage: message.trim(),
          });

      if (conversation) {
        router.back();
        setTimeout(() => {
          router.push({
            pathname: "/(modals)/conversation-detail",
            params: { conversationId: conversation.id },
          } as any);
        }, 300);
      }
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? (error as { status?: number }).status
          : undefined;
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error as { message?: string }).message
          : undefined;

      if (status === 409) {
        Alert.alert(
          "Unable to Start Conversation",
          errorMessage ||
            "This conversation cannot be started right now because there is no eligible active unit or recipient.",
        );
      } else {
        Alert.alert("Error", errorMessage || "Failed to create conversation. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
        <ScrollView
          style={styles.form}
          contentContainerStyle={[
            styles.formContent,
            {
              paddingBottom: isKeyboardVisible ? 40 : Math.max(insets.bottom, 20) + 28,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} activeOpacity={0.85}>
              <Ionicons name="close" size={22} color={P.text} />
            </TouchableOpacity>

            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>Compose</Text>
              <Text style={styles.headerTitle}>New Message</Text>
            </View>

            <View style={styles.headerActionSlot} />
          </View>

          {!isTenancyLoading && !canComposeConversation ? (
            <View style={styles.lockedBanner}>
              <Ionicons name="information-circle-outline" size={18} color={P.warningText} />
              <Text style={styles.lockedBannerText}>{statusMessage}</Text>
            </View>
          ) : null}

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase-outline" size={18} color={P.primary} />
              <Text style={styles.sectionTitle}>Conversation details</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>{isTenant ? "Message route" : "Recipients"}</Text>
              {isTenant ? (
                <>
                  <View style={styles.routeGrid}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[styles.routeCard, target === "management" && styles.routeCardActive]}
                      onPress={() => setTarget("management")}
                    >
                      <View style={[styles.routeIconWrap, target === "management" && styles.routeIconWrapActive]}>
                        <Ionicons
                          name="briefcase-outline"
                          size={18}
                          color={target === "management" ? "#EEF7FB" : P.primary}
                        />
                      </View>
                      <View style={styles.routeCopy}>
                        <Text style={[styles.routeTitle, target === "management" && styles.routeTitleActive]}>
                          Message Management
                        </Text>
                        <Text
                          style={[
                            styles.routeDescription,
                            target === "management" && styles.routeDescriptionActive,
                          ]}
                        >
                          Contact the management team assigned to your active building.
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {hasAssignedOwner ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        style={[styles.routeCard, target === "owner" && styles.routeCardActive]}
                        onPress={() => setTarget("owner")}
                      >
                        <View style={[styles.routeIconWrap, target === "owner" && styles.routeIconWrapActive]}>
                          <Ionicons
                            name="home-outline"
                            size={18}
                            color={target === "owner" ? "#EEF7FB" : P.primary}
                          />
                        </View>
                        <View style={styles.routeCopy}>
                          <Text style={[styles.routeTitle, target === "owner" && styles.routeTitleActive]}>
                            Message Owner
                          </Text>
                          <Text
                            style={[
                              styles.routeDescription,
                              target === "owner" && styles.routeDescriptionActive,
                            ]}
                          >
                            Contact the current owner of your active unit when owner access exists.
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <Text style={styles.hint}>
                    {target === "management"
                      ? "Your message will be routed through the resident management channel for your active occupancy."
                      : "Owner messaging still resolves the recipient from your active occupancy."}
                  </Text>
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter participant ID(s), comma-separated"
                    placeholderTextColor="#8A969B"
                    value={participantIds}
                    onChangeText={setParticipantIds}
                    autoCapitalize="none"
                    editable={canComposeConversation}
                  />
                  <Text style={styles.hint}>Use the target user ID values for the people who should receive this thread.</Text>
                </>
              )}
            </View>

            <View style={styles.fieldLast}>
              <Text style={styles.label}>Subject</Text>
              <TextInput
                style={styles.input}
                placeholder="What is this about?"
                placeholderTextColor="#8A969B"
                value={subject}
                onChangeText={setSubject}
                maxLength={200}
                editable={canComposeConversation}
              />
              <Text style={styles.hint}>Optional, but useful when the thread needs quick context.</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={P.primary} />
              <Text style={styles.sectionTitle}>Opening message</Text>
            </View>

            <View style={styles.fieldLast}>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Type your message..."
                placeholderTextColor="#8A969B"
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={2000}
                textAlignVertical="top"
                editable={canComposeConversation}
              />
              <View style={styles.metaRow}>
                <Text style={[styles.hint, styles.metaHint]}>
                  Keep the first message clear so the recipient knows what action is needed.
                </Text>
                <Text style={styles.metaText}>{message.trim().length}/2000</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitDisabled && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                isSubmitDisabled
                  ? ["#AAB7BC", "#8F9DA3"]
                  : [P.primary, P.primaryDark]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#EEF7FB" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#EEF7FB" style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>Send Message</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
  form: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    paddingTop: 8,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
  },
  headerCopy: {
    flex: 1,
    marginLeft: 14,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: P.primary,
  },
  headerTitle: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "800",
    color: P.text,
  },
  headerActionSlot: {
    width: 42,
  },
  lockedBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: P.warningBg,
    borderColor: "#EBC98C",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  lockedBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
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
  field: {
    marginBottom: 18,
  },
  fieldLast: {
    marginBottom: 0,
  },
  label: {
    marginBottom: 10,
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  input: {
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: P.text,
  },
  textArea: {
    minHeight: 150,
    textAlignVertical: "top",
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    color: P.muted,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  metaHint: {
    flex: 1,
    minWidth: 0,
    marginTop: 0,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
    flexShrink: 0,
    alignSelf: "flex-start",
  },
  routeGrid: {
    gap: 12,
  },
  managementContactsSection: {
    marginTop: 16,
  },
  managementContactsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  managementContactsTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: P.text,
  },
  managementStateCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
    marginBottom: 12,
  },
  managementStateTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: P.text,
  },
  managementStateText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: P.muted,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.primarySoft,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: P.primaryDark,
  },
  routeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
  },
  routeCardActive: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  routeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.primarySoft,
    flexShrink: 0,
  },
  routeIconWrapActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  routeCopy: {
    flex: 1,
    minWidth: 0,
  },
  routeTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: P.text,
  },
  routeTitleActive: {
    color: "#EEF7FB",
  },
  routeDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: P.muted,
  },
  routeDescriptionActive: {
    color: "#DCE8EE",
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
    marginBottom: 10,
  },
  contactCardSelected: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  contactAvatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  contactAvatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: P.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarFallbackSelected: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  contactAvatarFallbackText: {
    fontSize: 15,
    fontWeight: "800",
    color: P.primaryDark,
  },
  contactAvatarFallbackTextSelected: {
    color: "#EEF7FB",
  },
  contactCopy: {
    flex: 1,
    minWidth: 0,
  },
  contactName: {
    fontSize: 15,
    fontWeight: "800",
    color: P.text,
  },
  contactNameSelected: {
    color: "#EEF7FB",
  },
  contactRole: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: P.muted,
  },
  contactRoleSelected: {
    color: "#DCE8EE",
  },
  contactRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: P.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.surface,
  },
  contactRadioSelected: {
    borderColor: "#EEF7FB",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 20,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.85,
  },
  submitButtonGradient: {
    minHeight: 58,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EEF7FB",
  },
});
