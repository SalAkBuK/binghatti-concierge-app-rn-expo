import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";

export default function ProfileScreen() {
  const { currentUser, actions, notifications } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile form state
  const [formData, setFormData] = useState({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    company: "ABC Services Co.", // Mock
    licenseNumber: "LIC-12345", // Mock
    experience: "5 years", // Mock
  });

  // Settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    jobAlerts: true,
    weeklyReports: true,
  });

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const handleSaveProfile = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert("Validation Error", "Name and email are required.");
      return;
    }

    // In real app, would call API to update profile
    Alert.alert("Success", "Profile updated successfully!", [
      { text: "OK", onPress: () => setIsEditing(false) },
    ]);
  };

  const handleCancelEdit = () => {
    setFormData({
      name: currentUser?.name || "",
      email: currentUser?.email || "",
      phone: currentUser?.phone || "",
      company: "ABC Services Co.",
      licenseNumber: "LIC-12345",
      experience: "5 years",
    });
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      Alert.alert("Validation Error", "All password fields are required.");
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      Alert.alert("Validation Error", "New passwords do not match.");
      return;
    }

    if (passwordData.new.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters.");
      return;
    }

    // In real app, would call API to change password
    Alert.alert("Success", "Password changed successfully!", [
      {
        text: "OK",
        onPress: () => {
          setShowPasswordForm(false);
          setPasswordData({ current: "", new: "", confirm: "" });
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await actions.logout?.();
            router.replace("/auth" as any);
          },
        },
      ]
    );
  };

  const handleViewDocument = (docType: string) => {
    Alert.alert("View Document", `Opening ${docType}...`);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Profile & Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your account</Text>
          </View>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.profileCard}
        >
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {formData.name?.charAt(0).toUpperCase() || "S"}
              </Text>
            </View>
            <View style={styles.profileHeaderInfo}>
              <Text style={styles.profileName}>{formData.name}</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                <Text style={styles.verifiedText}>Verified Provider</Text>
              </View>
            </View>
            {!isEditing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Ionicons name="create-outline" size={20} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>

          {/* Profile Form */}
          <View style={styles.formSection}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, name: text }))
                }
                editable={isEditing}
                placeholder="Enter your full name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.email}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, email: text }))
                }
                editable={isEditing}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, phone: text }))
                }
                editable={isEditing}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Company</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.company}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, company: text }))
                }
                editable={isEditing}
                placeholder="Company name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>License Number</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.licenseNumber}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, licenseNumber: text }))
                }
                editable={isEditing}
                placeholder="License number"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Experience</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.experience}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, experience: text }))
                }
                editable={isEditing}
                placeholder="Years of experience"
              />
            </View>

            {isEditing && (
              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.saveButton]}
                  onPress={handleSaveProfile}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Documents Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Documents</Text>
          <View style={styles.documentsList}>
            <TouchableOpacity
              style={styles.documentItem}
              onPress={() => handleViewDocument("License")}
            >
              <View style={styles.documentIcon}>
                <Ionicons name="document-text" size={24} color="#3B82F6" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>Business License</Text>
                <Text style={styles.documentStatus}>Verified</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.documentItem}
              onPress={() => handleViewDocument("Insurance")}
            >
              <View style={styles.documentIcon}>
                <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>Insurance Certificate</Text>
                <Text style={styles.documentStatus}>Verified</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.documentItem}
              onPress={() => handleViewDocument("ID")}
            >
              <View style={styles.documentIcon}>
                <Ionicons name="card" size={24} color="#F59E0B" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>Emirates ID</Text>
                <Text style={styles.documentStatus}>Verified</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Notification Settings */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(300)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Notifications</Text>
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications via email
                </Text>
              </View>
              <Switch
                value={settings.emailNotifications}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, emailNotifications: value }))
                }
                trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
                thumbColor={settings.emailNotifications ? "#3B82F6" : "#F1F5F9"}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive push notifications on your device
                </Text>
              </View>
              <Switch
                value={settings.pushNotifications}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, pushNotifications: value }))
                }
                trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
                thumbColor={settings.pushNotifications ? "#3B82F6" : "#F1F5F9"}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>SMS Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications via SMS
                </Text>
              </View>
              <Switch
                value={settings.smsNotifications}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, smsNotifications: value }))
                }
                trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
                thumbColor={settings.smsNotifications ? "#3B82F6" : "#F1F5F9"}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Job Alerts</Text>
                <Text style={styles.settingDescription}>
                  Get notified about new job opportunities
                </Text>
              </View>
              <Switch
                value={settings.jobAlerts}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, jobAlerts: value }))
                }
                trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
                thumbColor={settings.jobAlerts ? "#3B82F6" : "#F1F5F9"}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Weekly Reports</Text>
                <Text style={styles.settingDescription}>
                  Receive weekly performance reports
                </Text>
              </View>
              <Switch
                value={settings.weeklyReports}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, weeklyReports: value }))
                }
                trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
                thumbColor={settings.weeklyReports ? "#3B82F6" : "#F1F5F9"}
              />
            </View>
          </View>
        </Animated.View>

        {/* Security Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(400)}
          style={styles.card}
        >
          <Text style={styles.cardTitle}>Security</Text>
          {!showPasswordForm ? (
            <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={() => setShowPasswordForm(true)}
            >
              <Ionicons name="lock-closed-outline" size={20} color="#3B82F6" />
              <Text style={styles.changePasswordButtonText}>Change Password</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.passwordForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Current Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.current}
                  onChangeText={(text) =>
                    setPasswordData((prev) => ({ ...prev, current: text }))
                  }
                  secureTextEntry
                  placeholder="Enter current password"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.new}
                  onChangeText={(text) =>
                    setPasswordData((prev) => ({ ...prev, new: text }))
                  }
                  secureTextEntry
                  placeholder="Enter new password"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Confirm New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordData.confirm}
                  onChangeText={(text) =>
                    setPasswordData((prev) => ({ ...prev, confirm: text }))
                  }
                  secureTextEntry
                  placeholder="Confirm new password"
                />
              </View>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.formButton, styles.cancelButton]}
                  onPress={() => {
                    setShowPasswordForm(false);
                    setPasswordData({ current: "", new: "", confirm: "" });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.formButton, styles.saveButton]}
                  onPress={handleChangePassword}
                >
                  <Text style={styles.saveButtonText}>Update Password</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Logout Button */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(500)}
          style={styles.logoutContainer}
        >
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser?.role}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileHeaderInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  formSection: {
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputDisabled: {
    backgroundColor: "#FFFFFF",
    color: "#64748B",
  },
  formButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  formButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F1F5F9",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#64748B",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  documentsList: {
    gap: 12,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  documentStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },
  settingsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  changePasswordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  changePasswordButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3B82F6",
  },
  passwordForm: {
    gap: 16,
  },
  logoutContainer: {
    marginBottom: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#EF4444",
  },
});
