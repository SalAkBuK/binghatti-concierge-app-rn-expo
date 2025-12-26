import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import apiService from "../../lib/services/api";
import { buildingsApi } from "../../lib/services/api/buildings";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";
import { filterNotificationsByUser } from "../../lib/utils/helpers";
import { APP_CONFIG } from "../../lib/utils/constants";

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  apartment: string;
  tower: string;
  emergencyContact: string;
  emergencyPhone: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  apartment?: string;
  tower?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export default function ProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { currentUser, notifications, actions } = useApp();

  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: currentUser?.profile?.name || currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.profile?.phone || "",
    apartment: currentUser?.profile?.apartment || "",
    tower: currentUser?.profile?.tower || "",
    emergencyContact: currentUser?.profile?.emergencyContact || "",
    emergencyPhone: currentUser?.profile?.emergencyPhone || "",
  });
  const [buildingName, setBuildingName] = useState<string>("Binghatti");

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);
  const minPasswordLength = APP_CONFIG.validation.minPasswordLength;

  useEffect(() => {
    const fetchBuildingName = async () => {
      const buildingId = currentUser?.profile?.buildingId;
      if (!buildingId) {
        console.log("[Profile] No buildingId found in user profile");
        return;
      }

      try {
        console.log("[Profile] Fetching building name for buildingId:", buildingId);
        const response = await buildingsApi.getBuildingById(buildingId);

        if (response.success && response.data) {
          setBuildingName(response.data.name);
          console.log("[Profile] Building name fetched:", response.data.name);
        }
      } catch (error) {
        console.error("[Profile] Failed to fetch building name:", error);
        // Keep default building name on error
      }
    };

    if (currentUser?.profile?.buildingId) {
      fetchBuildingName();
    }
  }, [currentUser?.profile?.buildingId]);

  const validateForm = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!profileData.name.trim()) {
      errors.name = "Name is required";
    }

    if (!profileData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      errors.email = "Please enter a valid email";
    }

    if (
      profileData.phone &&
      !/^\+?[\d\s\-\(\)]{10,}$/.test(profileData.phone)
    ) {
      errors.phone = "Please enter a valid phone number";
    }

    return errors;
  };

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSaving(true);

    try {
      if (!currentUser) {
        throw new Error("User not found");
      }

      // Update profile in context
      const updatedUser: typeof currentUser = {
        ...currentUser,
        name: profileData.name,
        email: profileData.email,
        profile: {
          ...currentUser.profile,
          name: profileData.name,
          phone: profileData.phone,
          apartment: profileData.apartment,
          tower: profileData.tower,
          emergencyContact: profileData.emergencyContact,
          emergencyPhone: profileData.emergencyPhone,
        },
      };

      await actions.updateUser(currentUser.email, updatedUser);

      showSuccessAlert("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      showErrorAlert(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await actions.logout();
            router.replace("/auth");
          } catch (error) {
            console.error("Logout error:", error);
          }
        },
      },
    ]);
  };

  const handleOpenPasswordModal = () => {
    setNewPassword("");
    setPasswordError(null);
    setShowPassword(false);
    setShowPasswordModal(true);
  };

  const handleClosePasswordModal = (force = false) => {
    if (!isResettingPassword || force) {
      setShowPasswordModal(false);
      setNewPassword("");
      setPasswordError(null);
    }
  };

  const handleResetPassword = async () => {
    const email = currentUser?.email || profileData.email;

    if (!email) {
      showErrorAlert(new Error("Email not found. Please log in again."));
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError("New password is required");
      return;
    }

    if (newPassword.length < minPasswordLength) {
      setPasswordError(
        `Password must be at least ${minPasswordLength} characters`,
      );
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await apiService.resetPassword({
        email,
        newPassword,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update password");
      }

      showSuccessAlert("Password updated successfully!");
      handleClosePasswordModal(true);
    } catch (error) {
      showErrorAlert(error);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const renderProfileField = (
    label: string,
    value: string,
    field: keyof ProfileFormData,
    placeholder: string,
    keyboardType: "default" | "email-address" | "phone-pad" = "default",
    multiline: boolean = false,
  ) => (
    <View style={styles.fieldContainer} key={field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={[
            styles.textInput,
            multiline && styles.textArea,
            validationErrors[field] && styles.errorInput,
          ]}
          placeholder={placeholder}
          value={value}
          onChangeText={(text) => handleInputChange(field, text)}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
        />
      ) : (
        <Text style={styles.fieldValue}>{value || "Not provided"}</Text>
      )}
      {validationErrors[field] && (
        <Text style={styles.errorText}>{validationErrors[field]}</Text>
      )}
    </View>
  );

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
        >
          {/* Navigation Header */}
          <HeaderBar
            title="Profile"
            hasUnreadNotifications={hasUnreadNotifications}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
          />

          {/* Profile Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profileData.name || "U").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>
                  {profileData.name || "User"}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {currentUser?.role || "Tenant"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Ionicons
                name={isEditing ? "close" : "pencil"}
                size={20}
                color={isEditing ? "#ef4444" : "#2563eb"}
              />
            </TouchableOpacity>
          </View>

          {/* Profile Form */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            {renderProfileField(
              "Full Name *",
              profileData.name,
              "name",
              "Enter your full name",
            )}

            {renderProfileField(
              "Email Address *",
              profileData.email,
              "email",
              "Enter your email",
              "email-address",
            )}

            {renderProfileField(
              "Phone Number",
              profileData.phone,
              "phone",
              "Enter your phone number",
              "phone-pad",
            )}

            <Text style={styles.sectionTitle}>Property Information</Text>

            {renderProfileField(
              "Apartment Number",
              profileData.apartment,
              "apartment",
              "e.g., 1205",
            )}

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Building</Text>
              <Text style={styles.fieldValue}>
                {buildingName || "Not provided"}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Emergency Contact</Text>

            {renderProfileField(
              "Emergency Contact Name",
              profileData.emergencyContact,
              "emergencyContact",
              "Contact person name",
            )}

            {renderProfileField(
              "Emergency Contact Phone",
              profileData.emergencyPhone,
              "emergencyPhone",
              "Emergency contact number",
              "phone-pad",
            )}

            {/* Action Buttons */}
            {isEditing && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    setValidationErrors({});
                    // Reset form data
                    setProfileData({
                      name:
                        currentUser?.profile?.name || currentUser?.name || "",
                      email: currentUser?.email || "",
                      phone: currentUser?.profile?.phone || "",
                      apartment: currentUser?.profile?.apartment || "",
                      tower: currentUser?.profile?.tower || "",
                      emergencyContact:
                        currentUser?.profile?.emergencyContact || "",
                      emergencyPhone:
                        currentUser?.profile?.emergencyPhone || "",
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    isSaving && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Logout Button */}
            {!isEditing && (
              <TouchableOpacity
                style={styles.changePasswordButton}
                onPress={handleOpenPasswordModal}
              >
                <Ionicons name="key-outline" size={20} color="#1f2937" />
                <Text style={styles.changePasswordButtonText}>
                  Change Password
                </Text>
              </TouchableOpacity>
            )}

            {!isEditing && (
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent
        visible={showPasswordModal}
        onRequestClose={handleClosePasswordModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={handleClosePasswordModal}
          />
          <View style={styles.modalCard}>
            <LinearGradient
              colors={["#2563EB", "#4F46E5"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeader}
            >
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name="lock-closed-outline" size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Change Password</Text>
                  <Text style={styles.modalSubtitle}>
                    Update your account password securely
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleClosePasswordModal}
                disabled={isResettingPassword}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Email</Text>
              <View style={styles.modalEmailPill}>
                <Text style={styles.modalEmailText}>
                  {currentUser?.email || profileData.email || "Not provided"}
                </Text>
              </View>

              <Text style={styles.modalLabel}>New Password</Text>
              <View
                style={[
                  styles.modalInputRow,
                  passwordError && styles.errorInput,
                ]}
              >
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter a new password"
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (passwordError) {
                      setPasswordError(null);
                    }
                  }}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggleButton}
                  onPress={() => setShowPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#475569"
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalHint}>
                Minimum {minPasswordLength} characters
              </Text>
              {passwordError && (
                <Text style={styles.modalErrorText}>{passwordError}</Text>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={handleClosePasswordModal}
                  disabled={isResettingPassword}
                >
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    (isResettingPassword || !newPassword.trim()) &&
                      styles.modalPrimaryButtonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={isResettingPassword || !newPassword.trim()}
                >
                  <LinearGradient
                    colors={["#2563EB", "#1D4ED8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalPrimaryGradient}
                  >
                    {isResettingPassword ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalPrimaryText}>
                        Update Password
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Side Menu */}
      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textTransform: "capitalize",
    marginTop: 2,
  },
  editButton: {
    padding: 8,
  },
  formContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    marginTop: 8,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: "#111827",
    paddingVertical: 8,
    minHeight: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
    minHeight: 48,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorInput: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  saveButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutButtonText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  changePasswordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  changePasswordButtonText: {
    color: "#1e3a8a",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  modalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  modalBody: {
    padding: 20,
    gap: 12,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  modalEmailPill: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalEmailText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  passwordToggleButton: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  modalHint: {
    fontSize: 12,
    color: "#64748b",
    marginTop: -4,
  },
  modalErrorText: {
    color: "#ef4444",
    fontSize: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  modalSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e3a8a",
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  modalPrimaryButtonDisabled: {
    opacity: 0.6,
  },
  modalPrimaryGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
