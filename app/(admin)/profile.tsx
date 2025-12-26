import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import { useApp } from "../../lib/context/connected-app-provider";
import type { UserProfile } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

export default function AdminProfileScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const initialProfile = useMemo(
    () => ({
      companyName: currentUser?.profile?.companyName || "",
      companyWebsite: currentUser?.profile?.companyWebsite || "",
      companyDescription: currentUser?.profile?.companyDescription || "",
      companyAddress: currentUser?.profile?.companyAddress || "",
      phone: currentUser?.profile?.phone || currentUser?.phone || "",
      email: currentUser?.email || "",
      companyLogoUrl: currentUser?.profile?.companyLogoUrl || "",
    }),
    [currentUser],
  );

  const [profileForm, setProfileForm] = useState(initialProfile);
  const [logo, setLogo] = useState<string[]>(
    initialProfile.companyLogoUrl ? [initialProfile.companyLogoUrl] : [],
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Partial<UserProfile> = {
        companyName: profileForm.companyName.trim() || undefined,
        companyWebsite: profileForm.companyWebsite.trim() || undefined,
        companyDescription: profileForm.companyDescription.trim() || undefined,
        companyAddress: profileForm.companyAddress.trim() || undefined,
        phone: profileForm.phone.trim() || undefined,
        companyLogoUrl: logo[0] || undefined,
      };

      await actions.updateProfile(updates as any);

      // Mark profile as completed after saving details if needed
      if (currentUser && !currentUser.profileCompleted) {
        await actions.updateUser(currentUser.email, {
          ...currentUser,
          profileCompleted: true,
        });
      }

      Alert.alert("Saved", "Company profile updated.");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
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
          title="Admin Profile"
          subtitle="Company identity and contact info"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Company Logo</Text>
          <AttachmentPicker
            attachments={logo}
            onAttachmentsChange={setLogo}
            maxAttachments={1}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <View style={styles.field}>
          <Text style={styles.label}>Company Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter company name"
              value={profileForm.companyName}
              onChangeText={(text) =>
                setProfileForm((prev) => ({ ...prev, companyName: text }))
              }
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              placeholder="https://"
              value={profileForm.companyWebsite}
              onChangeText={(text) =>
                setProfileForm((prev) => ({ ...prev, companyWebsite: text }))
              }
              autoCapitalize="none"
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
            <Text style={styles.label}>Company Email</Text>
            <TextInput
              style={styles.input}
              placeholder="company@email.com"
              value={profileForm.email}
              onChangeText={(text) =>
                setProfileForm((prev) => ({ ...prev, email: text }))
              }
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Street, City, Country"
              value={profileForm.companyAddress}
              onChangeText={(text) =>
                setProfileForm((prev) => ({ ...prev, companyAddress: text }))
              }
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>About / Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your company, services, and mission"
              value={profileForm.companyDescription}
              onChangeText={(text) =>
                setProfileForm((prev) => ({ ...prev, companyDescription: text }))
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
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
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
  },
  textArea: {
    minHeight: 100,
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
});
