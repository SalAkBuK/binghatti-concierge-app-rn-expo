import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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

import { useAuth } from "../lib/context/auth-context";
import { apiService } from "../lib/services/api";
import { getUserErrorMessage } from "../lib/services/api/errors";
import { APP_CONFIG, STORAGE_KEYS } from "../lib/utils/constants";
import * as SecureStore from "expo-secure-store";

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
  accent: "#F7EEDF",
  accentBorder: "#EBD8BB",
  dangerText: "#B24A41",
};

export default function ChangePasswordScreen() {
  const { isAuthenticated, currentUser, actions } = useAuth();
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
  const title = currentUser.role === "tenant" ? "Secure Your Password" : "Change Password";
  const subtitle = currentUser.mustChangePassword
    ? "This one-time security step is required before you can continue."
    : "Update your password to continue using the app.";

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
          <View style={styles.shell}>
            <View style={styles.screenIntro}>
              <View style={styles.screenIntroPill}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={P.primary}
                />
                <Text style={styles.screenIntroPillText}>Security Check</Text>
              </View>
              <Text style={styles.screenTitle}>{title}</Text>
              <Text style={styles.screenSubtitle}>{subtitle}</Text>
            </View>

            <View style={styles.card}>
              <LinearGradient
                colors={[P.primary, P.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardHeader}
              >
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.cardIconCircle}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={P.surface}
                    />
                  </View>
                  <View style={styles.cardHeaderCopy}>
                    <Text style={styles.cardTitle}>Update Password</Text>
                    <Text style={styles.cardSubtitle}>
                      Use your current password once, then set a new one.
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.cardBody}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.emailPill}>
                  <Text style={styles.emailText}>{safeEmail}</Text>
                </View>

                <Text style={styles.label}>Current Password</Text>
                <View style={[styles.inputRow, safeErrorMessage && styles.errorInput]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter current password"
                    placeholderTextColor={P.soft}
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
                      color={P.muted}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>New Password</Text>
                <View style={[styles.inputRow, safeErrorMessage && styles.errorInput]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter a new password"
                    placeholderTextColor={P.soft}
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
                      color={P.muted}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Confirm New Password</Text>
                <View style={[styles.inputRow, safeErrorMessage && styles.errorInput]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter new password"
                    placeholderTextColor={P.soft}
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
                      color={P.muted}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.hintRow}>
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={P.soft}
                  />
                  <Text style={styles.hint}>
                    Minimum {minPasswordLength} characters
                  </Text>
                </View>

                {safeErrorMessage ? (
                  <Text style={styles.errorText}>{safeErrorMessage}</Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={[P.primary, P.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.submitButtonGradient}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color={P.surface} />
                    ) : (
                      <Text style={styles.submitText}>Update Password</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
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
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  shell: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    gap: 18,
  },
  screenIntro: {
    alignItems: "center",
    gap: 10,
  },
  screenIntroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: P.accent,
    borderWidth: 1,
    borderColor: P.accentBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  screenIntroPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.primary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: P.text,
    textAlign: "center",
  },
  screenSubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
    textAlign: "center",
    maxWidth: 320,
  },
  card: {
    backgroundColor: P.surface,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "rgba(43, 52, 55, 0.18)",
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderCopy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: P.surface,
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
  },
  cardBody: {
    padding: 20,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: P.text,
  },
  emailPill: {
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  emailText: {
    fontSize: 14,
    color: P.text,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 16,
    backgroundColor: P.surface,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: P.text,
  },
  toggleButton: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -4,
  },
  hint: {
    fontSize: 12,
    color: P.soft,
  },
  errorText: {
    color: P.dangerText,
    fontSize: 12,
  },
  errorInput: {
    borderColor: P.dangerText,
    backgroundColor: "#FFF8F7",
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: P.surface,
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
