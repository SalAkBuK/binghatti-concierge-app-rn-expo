import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

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
  const insets = useSafeAreaInsets();
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

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [showSideMenu, setShowSideMenu] = useState(false);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

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

      Alert.alert("Success", "Profile updated successfully!");
      setIsEditing(false);
    } catch {
      Alert.alert("Error", "Failed to update profile. Please try again.");
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
          contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
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

            {renderProfileField(
              "Tower/Building",
              profileData.tower,
              "tower",
              "e.g., Tower A",
            )}

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
});
