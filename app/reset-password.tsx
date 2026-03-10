import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import { apiService } from "../lib/services/api";
import { APP_CONFIG } from "../lib/utils/constants";

const getParamAsString = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[]; email?: string | string[] }>();
  const initialToken = useMemo(() => getParamAsString(params.token), [params.token]);
  const email = useMemo(() => getParamAsString(params.email), [params.email]);
  const minPasswordLength = APP_CONFIG.validation.minPasswordLength;

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token && initialToken) {
      setToken(initialToken);
    }
  }, [initialToken, token]);

  const handleSubmit = async () => {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      setError("Reset token is required");
      return;
    }

    if (!newPassword.trim()) {
      setError("New password is required");
      return;
    }

    if (newPassword.length < minPasswordLength) {
      setError(`Password must be at least ${minPasswordLength} characters`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await apiService.resetPassword({
        token: normalizedToken,
        newPassword,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Unable to reset password");
      }

      router.replace("/auth");
    } catch (requestError: any) {
      if (requestError?.status === 401) {
        setError("Reset token is invalid or expired. Request a new link.");
      } else if (requestError?.status === 400) {
        setError(requestError?.message || "Password validation failed.");
      } else {
        setError(requestError?.message || "Failed to reset password.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace("/auth")}>
            <Ionicons name="arrow-back" size={20} color="#2563eb" />
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={28} color="#2563eb" />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter the reset token from your email and choose a new password.
            </Text>
            {email ? <Text style={styles.emailText}>{email}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Reset Token</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste token from reset email"
              placeholderTextColor="#94A3B8"
              value={token}
              onChangeText={(value) => {
                setToken(value);
                if (error) setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                placeholder="Enter a new password"
                placeholderTextColor="#94A3B8"
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  if (error) setError(null);
                }}
                secureTextEntry={!showNewPassword}
                textContentType="newPassword"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowNewPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#475569"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.inputField}
                placeholder="Re-enter new password"
                placeholderTextColor="#94A3B8"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (error) setError(null);
                }}
                secureTextEntry={!showConfirmPassword}
                textContentType="newPassword"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowConfirmPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#475569"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Minimum {minPasswordLength} characters
            </Text>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  backText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 6,
  },
  emailText: {
    marginTop: 8,
    fontSize: 13,
    color: "#1d4ed8",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  inputField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  toggleButton: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  hint: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 6,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 8,
  },
  submitButton: {
    marginTop: 18,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
