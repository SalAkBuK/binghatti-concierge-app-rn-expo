import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { useApp } from "../lib/context/connected-app-provider";
import apiService from "../lib/services/api";
import { getUserErrorMessage } from "../lib/services/api/errors";
import { APP_CONFIG, STORAGE_KEYS } from "../lib/utils/constants";
import * as SecureStore from "expo-secure-store";

export default function ChangePasswordScreen() {
  const { isAuthenticated, currentUser, actions } = useApp();
  const minPasswordLength = APP_CONFIG.validation.minPasswordLength;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      router.replace("/auth");
    }
  }, [isAuthenticated, currentUser]);

  const validate = () => {
    if (!currentPassword.trim()) {
      return "Current password is required";
    }
    if (!newPassword.trim()) {
      return "New password is required";
    }
    if (newPassword.length < minPasswordLength) {
      return `Password must be at least ${minPasswordLength} characters`;
    }
    if (newPassword !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (!currentUser) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await apiService.changePassword({
        currentPassword,
        newPassword,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update password");
      }

      const updatedUser = {
        ...currentUser,
        mustChangePassword: false,
      };

      await actions.updateUser(currentUser.email, updatedUser);
      actions.setAuth({
        isAuthenticated: true,
        currentUser: updatedUser,
        userRole: updatedUser.role,
      });

      await SecureStore.setItemAsync(
        STORAGE_KEYS.user_data,
        JSON.stringify(updatedUser),
      );

      Alert.alert("Success", "Password updated successfully.");
      router.replace("/");
    } catch (error: any) {
      setErrorMessage(getUserErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  const safeEmail =
    typeof currentUser.email === "string"
      ? currentUser.email
      : String(currentUser.email ?? "");
  const safeErrorMessage =
    typeof errorMessage === "string"
      ? errorMessage
      : errorMessage
        ? JSON.stringify(errorMessage)
        : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={28} color="#2563eb" />
            </View>
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>
              Update your password to continue using the app.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.emailPill}>
              <Text style={styles.emailText}>{safeEmail}</Text>
            </View>

            <Text style={styles.label}>Current Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showCurrentPassword}
                textContentType="password"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setShowCurrentPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#475569"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Enter a new password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errorMessage) setErrorMessage(null);
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
                style={styles.input}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errorMessage) setErrorMessage(null);
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

            {safeErrorMessage && (
              <Text style={styles.errorText}>{safeErrorMessage}</Text>
            )}

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Update Password</Text>
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
    justifyContent: "center",
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
  emailPill: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  emailText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
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
  input: {
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
