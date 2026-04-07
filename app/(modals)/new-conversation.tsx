import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useMessaging } from "../../lib/context/messaging-context";
import type {
  ResidentConversationTarget,
  ResidentManagementContact,
} from "../../lib/types";

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

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "?";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export default function NewConversationModal() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { actions } = useMessaging();
  const { canCreateManagementConversation, isLoading: isTenancyLoading, statusMessage } =
    useResidentTenancy({
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
  const [managementContacts, setManagementContacts] = useState<ResidentManagementContact[]>([]);
  const [selectedManagementUserId, setSelectedManagementUserId] = useState<string | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [hasFetchedManagementContacts, setHasFetchedManagementContacts] = useState(false);
  const isTenant = currentUser?.role === "tenant";
  const requiresManagementSelection = isTenant && target === "management";
  const isSubmitDisabled =
    submitting ||
    !canComposeConversation ||
    (requiresManagementSelection && (!selectedManagementUserId || contactsLoading));

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

  const loadManagementContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError(null);

    try {
      const contacts = await actions.fetchResidentManagementContacts();
      setManagementContacts(contacts);
      setSelectedManagementUserId((currentValue) => {
        if (currentValue && contacts.some((contact) => contact.managementUserId === currentValue)) {
          return currentValue;
        }
        return contacts[0]?.managementUserId ?? null;
      });
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? (error as { message?: string }).message
          : undefined;
      setContactsError(errorMessage || "Unable to load management contacts right now.");
    } finally {
      setContactsLoading(false);
      setHasFetchedManagementContacts(true);
    }
  }, [actions]);

  useEffect(() => {
    if (!requiresManagementSelection || !canComposeConversation || hasFetchedManagementContacts) {
      return;
    }

    void loadManagementContacts();
  }, [
    canComposeConversation,
    hasFetchedManagementContacts,
    loadManagementContacts,
    requiresManagementSelection,
  ]);

  const handleSubmit = async () => {
    if (!canComposeConversation) {
      Alert.alert("Messaging Unavailable", statusMessage);
      return;
    }

    if (requiresManagementSelection && !selectedManagementUserId) {
      Alert.alert("Select Management", "Choose one management contact before sending your message.");
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

    setSubmitting(true);
    try {
      const conversation = isTenant
        ? await actions.createResidentConversation(target, {
            subject: subject.trim() || undefined,
            message: message.trim(),
            managementUserId:
              target === "management" ? selectedManagementUserId ?? undefined : undefined,
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

          <View style={styles.heroCard}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowSecondary} />

            <Text style={styles.heroEyebrow}>Conversation overview</Text>
            <Text style={styles.heroTitle}>Start a polished conversation from the same inbox flow.</Text>
            <Text style={styles.heroSubtitle}>
              {isTenant
                ? "Choose management or owner, add context, and send without manually entering participant IDs."
                : "Add recipients, frame the topic clearly, and send a message that matches the current resident messaging experience."}
            </Text>

            <View style={styles.heroPillRow}>
              <View style={styles.heroPill}>
                <Ionicons name="create-outline" size={14} color={P.primary} />
                <Text style={styles.heroPillText}>Draft message</Text>
              </View>
              <View style={styles.heroPill}>
                <Ionicons name="paper-plane-outline" size={14} color={P.primary} />
                <Text style={styles.heroPillText}>Send instantly</Text>
              </View>
            </View>
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

            <View style={styles.fieldLast}>
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
                  </View>

                  {target === "management" ? (
                    <View style={styles.managementContactsSection}>
                      <View style={styles.managementContactsHeader}>
                        <Text style={styles.managementContactsTitle}>Choose a contact</Text>
                        {contactsLoading ? <ActivityIndicator size="small" color={P.primary} /> : null}
                      </View>

                      {contactsLoading && managementContacts.length === 0 ? (
                        <View style={styles.managementStateCard}>
                          <Text style={styles.managementStateTitle}>Loading contacts</Text>
                          <Text style={styles.managementStateText}>
                            Fetching the management contacts assigned to your current building.
                          </Text>
                        </View>
                      ) : null}

                      {!contactsLoading && contactsError ? (
                        <View style={styles.managementStateCard}>
                          <Text style={styles.managementStateTitle}>Contacts unavailable</Text>
                          <Text style={styles.managementStateText}>{contactsError}</Text>
                          <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => void loadManagementContacts()}
                            activeOpacity={0.85}
                          >
                            <Text style={styles.retryButtonText}>Retry</Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {!contactsLoading && !contactsError && managementContacts.length === 0 ? (
                        <View style={styles.managementStateCard}>
                          <Text style={styles.managementStateTitle}>No contacts available</Text>
                          <Text style={styles.managementStateText}>
                            There are no management contacts available for your active occupancy right now.
                          </Text>
                        </View>
                      ) : null}

                      {managementContacts.map((contact) => {
                        const isSelected = contact.managementUserId === selectedManagementUserId;

                        return (
                          <TouchableOpacity
                            key={contact.managementUserId}
                            activeOpacity={0.9}
                            style={[
                              styles.contactCard,
                              isSelected && styles.contactCardSelected,
                            ]}
                            onPress={() => setSelectedManagementUserId(contact.managementUserId)}
                          >
                            {contact.avatarUrl ? (
                              <Image
                                source={{ uri: contact.avatarUrl }}
                                style={styles.contactAvatarImage}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.contactAvatarFallback,
                                  isSelected && styles.contactAvatarFallbackSelected,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.contactAvatarFallbackText,
                                    isSelected && styles.contactAvatarFallbackTextSelected,
                                  ]}
                                >
                                  {getInitials(contact.name)}
                                </Text>
                              </View>
                            )}

                            <View style={styles.contactCopy}>
                              <Text
                                style={[
                                  styles.contactName,
                                  isSelected && styles.contactNameSelected,
                                ]}
                              >
                                {contact.name}
                              </Text>
                              <Text
                                style={[
                                  styles.contactRole,
                                  isSelected && styles.contactRoleSelected,
                                ]}
                              >
                                {contact.role?.trim() || "Management team"}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.contactRadio,
                                isSelected && styles.contactRadioSelected,
                              ]}
                            >
                              {isSelected ? (
                                <Ionicons name="checkmark" size={14} color="#EEF7FB" />
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      <Text style={styles.hint}>
                        Residents can only start management conversations with the contacts returned for the active building.
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.hint}>
                      Owner messaging still resolves the recipient from your active occupancy.
                    </Text>
                  )}
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
  heroCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: P.surface,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
    marginBottom: 16,
  },
  heroGlowPrimary: {
    position: "absolute",
    right: -30,
    top: -26,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "#ECF3F6",
  },
  heroGlowSecondary: {
    position: "absolute",
    right: 44,
    bottom: -36,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3EADF",
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: P.primary,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: P.text,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: P.muted,
  },
  heroPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
  },
  heroPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.primary,
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
