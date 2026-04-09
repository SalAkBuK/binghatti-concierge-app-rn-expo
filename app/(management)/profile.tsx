import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AttachmentPicker } from "../../components/ui/AttachmentPicker";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useAuth } from "../../lib/context/auth-context";
import { useAppDomain } from "../../lib/context/connected-app-provider";
import { useNotifications } from "../../lib/context/notifications-context";
import { apiService } from "../../lib/services/api";
import type { UserProfile } from "../../lib/types";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import {
  isRemoteAssetUri,
  uploadCurrentUserAvatar,
} from "../../lib/utils/user-avatar-upload";
import { APP_CONFIG } from "../../lib/utils/constants";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function ManagementProfileScreen() {
  const { currentUser, actions: authActions } = useAuth();
  const { notifications } = useNotifications();
  const { property } = useAppDomain();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  // Get managed buildings
  const managedBuildings = useMemo(() => {
    return property.getManagedBuildings?.() ?? [];
  }, [property]);

  const initialProfile = useMemo(
    () => ({
      name: currentUser?.name || "",
      phone: currentUser?.profile?.phone || currentUser?.phone || "",
      email: currentUser?.email || "",
      jobTitle: currentUser?.profile?.jobTitle || "",
      department: currentUser?.profile?.department || "",
      bio: currentUser?.profile?.bio || "",
      avatar:
        currentUser?.profile?.avatarUrl || currentUser?.profile?.avatar || "",
    }),
    [currentUser],
  );

  const [profileForm, setProfileForm] = useState(initialProfile);
  const [avatar, setAvatar] = useState<string[]>(
    initialProfile.avatar ? [initialProfile.avatar] : [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const minPasswordLength = APP_CONFIG.validation.minPasswordLength;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selectedAvatar = avatar[0];
      const avatarUrl = selectedAvatar
        ? isRemoteAssetUri(selectedAvatar)
          ? selectedAvatar
          : await uploadCurrentUserAvatar(selectedAvatar, "management-avatar")
        : profileForm.avatar || "";
      const profileUpdates: Partial<UserProfile> = {
        name: profileForm.name.trim() || undefined,
        jobTitle: profileForm.jobTitle.trim() || undefined,
        department: profileForm.department.trim() || undefined,
        bio: profileForm.bio.trim() || undefined,
        phone: profileForm.phone.trim() || undefined,
        ...(avatarUrl
          ? {
              avatar: avatarUrl,
              avatarUrl,
            }
          : {}),
      };

      const updatedUser = await authActions.updateProfile({
        name: profileForm.name.trim() || undefined,
        profile: profileUpdates,
      } as any);
      setAvatar(avatarUrl ? [avatarUrl] : []);
      setProfileForm((prev) => ({
        ...prev,
        avatar:
          updatedUser.profile?.avatarUrl || updatedUser.profile?.avatar || avatarUrl,
      }));

      // Mark profile as completed after saving details if needed
      if (currentUser && !currentUser.profileCompleted) {
        await authActions.updateUser(currentUser.email, {
          ...currentUser,
          name: profileForm.name.trim(),
          profileCompleted: true,
        });
      }

      Alert.alert("Saved", "Profile updated successfully.");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPasswordModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setPasswordError(null);
    setShowCurrentPassword(false);
    setShowPassword(false);
    setShowPasswordModal(true);
  };

  const handleClosePasswordModal = (force = false) => {
    if (!isResettingPassword || force) {
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordError(null);
    }
  };

  const handleResetPassword = async () => {
    if (!currentPassword.trim()) {
      setPasswordError("Current password is required");
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
      const response = await apiService.changePassword({
        currentPassword,
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
        <HeaderBar
          title="Management Profile"
          subtitle="Your personal information and contact details"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        {/* Assigned Buildings Section */}
        {managedBuildings.length > 0 && (
          <View style={styles.card}>
            <View style={styles.buildingHeader}>
              <Ionicons name="business" size={20} color="#2563EB" />
              <Text style={styles.sectionTitle}>Your Assigned Buildings</Text>
            </View>
            {managedBuildings.map((building) => (
              <View key={building.id} style={styles.buildingCard}>
                <View style={styles.buildingInfo}>
                  <Text style={styles.buildingName}>{building.name}</Text>
                  <Text style={styles.buildingAddress}>{building.address}</Text>
                  <View style={styles.buildingStats}>
                    <View style={styles.buildingStat}>
                      <Ionicons name="home-outline" size={14} color="#6B7280" />
                      <Text style={styles.buildingStatText}>
                        {building.occupiedUnits}/{building.totalUnits} units
                      </Text>
                    </View>
                    <View style={styles.buildingStatusBadge}>
                      <Text style={styles.buildingStatusText}>
                        {building.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <AttachmentPicker
            attachments={avatar}
            onAttachmentsChange={setAvatar}
            maxAttachments={1}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={profileForm.name}
              onChangeText={(text) =>
                setProfileForm((prev) => ({ ...prev, name: text }))
              }
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+971..."
              value={profileForm.phone}
              onChangeText={(text) =>
                setProfileForm((prev) => ({ ...prev, phone: text }))
              }
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              placeholder="email@example.com"
              value={profileForm.email}
              editable={false}
            />
            <Text style={styles.helpText}>Email cannot be changed</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Job Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Building Manager, Facilities Manager"
              value={profileForm.jobTitle}
              onChangeText={(text) =>
                setProfileForm((prev) => ({ ...prev, jobTitle: text }))
              }
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Department</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Operations, Facilities"
              value={profileForm.department}
              onChangeText={(text) =>
                setProfileForm((prev) => ({ ...prev, department: text }))
              }
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio / About</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell us a bit about yourself and your role"
              value={profileForm.bio}
              onChangeText={(text) =>
                setProfileForm((prev) => ({ ...prev, bio: text }))
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Text style={styles.saveButtonText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="save" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Profile</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={handleOpenPasswordModal}
          >
            <Ionicons name="key-outline" size={18} color="#1f2937" />
            <Text style={styles.changePasswordButtonText}>
              Change Password
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent
        visible={showPasswordModal}
        onRequestClose={() => handleClosePasswordModal()}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => handleClosePasswordModal()}
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
                onPress={() => handleClosePasswordModal()}
                disabled={isResettingPassword}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Email</Text>
              <View style={styles.modalEmailPill}>
                <Text style={styles.modalEmailText}>
                  {currentUser?.email || profileForm.email || "Not provided"}
                </Text>
              </View>

              <Text style={styles.modalLabel}>Current Password</Text>
              <View
                style={[
                  styles.modalInputRow,
                  passwordError && styles.modalInputError,
                ]}
              >
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChangeText={(text) => {
                    setCurrentPassword(text);
                    if (passwordError) {
                      setPasswordError(null);
                    }
                  }}
                  secureTextEntry={!showCurrentPassword}
                  textContentType="password"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggleButton}
                  onPress={() => setShowCurrentPassword((prev) => !prev)}
                >
                  <Ionicons
                    name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#475569"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalLabel}>New Password</Text>
              <View
                style={[
                  styles.modalInputRow,
                  passwordError && styles.modalInputError,
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
                  onPress={() => handleClosePasswordModal()}
                  disabled={isResettingPassword}
                >
                  <Text style={styles.modalSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalPrimaryButton,
                    (isResettingPassword ||
                      !currentPassword.trim() ||
                      !newPassword.trim()) &&
                      styles.modalPrimaryButtonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={
                    isResettingPassword ||
                    !currentPassword.trim() ||
                    !newPassword.trim()
                  }
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

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  buildingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  buildingCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  buildingInfo: {
    gap: 6,
  },
  buildingName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  buildingAddress: {
    fontSize: 13,
    color: "#6B7280",
  },
  buildingStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  buildingStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  buildingStatText: {
    fontSize: 13,
    color: "#6B7280",
  },
  buildingStatusBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  buildingStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#166534",
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#111827",
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    color: "#9CA3AF",
  },
  helpText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: -2,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#2563EB",
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  changePasswordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  changePasswordButtonText: {
    color: "#1E3A8A",
    fontSize: 15,
    fontWeight: "700",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#0F172A",
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
    color: "#FFFFFF",
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
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  modalEmailText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  modalInputError: {
    borderColor: "#EF4444",
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#0F172A",
  },
  passwordToggleButton: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  modalHint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: -4,
  },
  modalErrorText: {
    color: "#EF4444",
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
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  modalSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E3A8A",
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
    color: "#FFFFFF",
  },
});
