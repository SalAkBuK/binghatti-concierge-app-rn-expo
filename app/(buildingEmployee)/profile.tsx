import { Ionicons } from "@expo/vector-icons";
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
import { useAuth } from "../../lib/context/auth-context";
import { useAppDomain } from "../../lib/context/connected-app-provider";
import { useNotifications } from "../../lib/context/notifications-context";
import { apiService } from "../../lib/services/api";
import { orgBuildingsApi } from "../../lib/services/api/org-buildings";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import { APP_CONFIG } from "../../lib/utils/constants";

export default function BuildingEmployeeProfileScreen() {
  const { isAuthenticated, currentUser, actions: authActions } = useAuth();
  const { notifications } = useNotifications();
  const { property } = useAppDomain();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [buildingName, setBuildingName] = useState("Assigned Building");
  const minPasswordLength = APP_CONFIG.validation.minPasswordLength;
  const buildingEmployee = currentUser?.id
    ? property.getBuildingEmployeeByUserId?.(currentUser.id)
    : undefined;
  const building =
    buildingEmployee?.buildingId &&
    property.getBuildingById?.(buildingEmployee.buildingId);
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id || "",
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchBuildingName = async () => {
      if (!currentUser?.id) return;

      if (currentUser.profile?.buildingName) {
        setBuildingName(currentUser.profile.buildingName);
        return;
      }

      try {
        const response = await orgBuildingsApi.getAssignedBuildings();
        const payload = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        if (payload.length > 0) {
          const first = payload[0];
          const resolvedName =
            first?.name || first?.buildingName || first?.title || "Assigned Building";
          setBuildingName(resolvedName);
          return;
        }
      } catch (error) {
        console.error("[BuildingEmployee Profile] Failed to fetch building name:", error);
      }

      if (building?.name) {
        setBuildingName(building.name);
      }
    };

    fetchBuildingName();
  }, [building?.name, currentUser?.id, currentUser?.profile?.buildingName]);

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (currentUser.role !== "building_employee") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Ionicons name="lock-closed-outline" size={48} color="#94A3B8" />
          <Text style={styles.title}>Access Restricted</Text>
          <Text style={styles.subtitle}>
            This workspace is only available to building employees.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleLogout = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await authActions.logout?.();
            router.replace("/auth" as any);
          } catch (error) {
            console.error("Failed to sign out building employee:", error);
            Alert.alert("Error", "Unable to sign out right now. Please try again.");
          }
        },
      },
    ]);
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
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Profile"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          style={styles.headerBar}
        />
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {currentUser.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>{currentUser.name}</Text>
        <Text style={styles.roleLabel}>Building Operations</Text>

        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>{currentUser.email}</Text>
          </View>
          {currentUser.profile?.phone && (
            <View style={styles.row}>
              <Ionicons name="call-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{currentUser.profile.phone}</Text>
            </View>
          )}
          {buildingEmployee?.role && (
            <View style={styles.row}>
              <Ionicons name="briefcase-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>{buildingEmployee.role}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Ionicons name="business-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>
              {buildingName}
            </Text>
          </View>
          {buildingEmployee?.shift && (
            <View style={styles.row}>
              <Ionicons name="time-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>
                Shift: {buildingEmployee.shift.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {buildingEmployee && (
          <View style={styles.performanceCard}>
            <Text style={styles.sectionTitle}>Performance Snapshot</Text>
            <View style={styles.performanceRow}>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceValue}>
                  {buildingEmployee.jobsCompleted ?? 0}
                </Text>
                <Text style={styles.performanceLabel}>Tasks Completed</Text>
              </View>
              <View style={styles.performanceStat}>
                <Text style={styles.performanceValue}>
                  {buildingEmployee.rating ?? "—"}
                </Text>
                <Text style={styles.performanceLabel}>Avg Rating</Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={handleOpenPasswordModal}
        >
          <Ionicons name="key-outline" size={18} color="#1f2937" />
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

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
                  {currentUser?.email || "Not provided"}
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
                      !newPassword.trim() ||
                      !currentPassword.trim()) &&
                      styles.modalPrimaryButtonDisabled,
                  ]}
                  onPress={handleResetPassword}
                  disabled={
                    isResettingPassword ||
                    !newPassword.trim() ||
                    !currentPassword.trim()
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
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: "center",
  },
  headerBar: {
    alignSelf: "stretch",
  },
  card: {
    marginTop: 80,
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  roleLabel: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 24,
  },
  infoCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#111827",
  },
  performanceCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  performanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  performanceStat: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  performanceLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  changePasswordButton: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    width: "100%",
  },
  changePasswordText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E3A8A",
  },
  logoutButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#EF4444",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
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
