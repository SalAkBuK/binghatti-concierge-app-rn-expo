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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../lib/context/auth-context";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import { useMessaging } from "../../lib/context/messaging-context";

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

  const handleSubmit = async () => {
    if (!canComposeConversation) {
      Alert.alert("Messaging Unavailable", statusMessage);
      return;
    }

    const ids = participantIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      Alert.alert("Error", "Please enter at least one participant ID.");
      return;
    }
    if (!message.trim()) {
      Alert.alert("Error", "Please enter a message.");
      return;
    }

    setSubmitting(true);
    try {
      const conversation = await actions.createConversation({
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
    } catch {
      Alert.alert("Error", "Failed to create conversation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        {!isTenancyLoading && !canComposeConversation ? (
          <View style={styles.lockedBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#9A3412" />
            <Text style={styles.lockedBannerText}>{statusMessage}</Text>
          </View>
        ) : null}

        {/* Subject */}
        <View style={styles.field}>
          <Text style={styles.label}>Subject (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="What is this about?"
            placeholderTextColor="#94A3B8"
            value={subject}
            onChangeText={setSubject}
            maxLength={200}
            editable={canComposeConversation}
          />
        </View>

        {/* Participants */}
        <View style={styles.field}>
          <Text style={styles.label}>To</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter participant ID(s), comma-separated"
            placeholderTextColor="#94A3B8"
            value={participantIds}
            onChangeText={setParticipantIds}
            autoCapitalize="none"
            editable={canComposeConversation}
          />
          <Text style={styles.hint}>
            Enter the user ID(s) of the people you want to message.
          </Text>
        </View>

        {/* Message */}
        <View style={styles.field}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Type your message..."
            placeholderTextColor="#94A3B8"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            editable={canComposeConversation}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (submitting || !canComposeConversation) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || !canComposeConversation}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitButtonText}>Send</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  lockedBanner: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  lockedBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#9A3412",
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1E293B",
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  hint: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
    marginLeft: 2,
  },
  submitButton: {
    flexDirection: "row",
    backgroundColor: "#336BE3",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
