import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useNotifications } from "../../lib/context/notifications-context";
import { useResidentContract } from "../../lib/hooks/useResidentSelfService";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import { apiService } from "../../lib/services/api";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import { APP_CONFIG } from "../../lib/utils/constants";

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  previousAddress: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  previousAddress?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

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
  primarySoft: "#D6E4E8",
  accent: "#F7EEDF",
  accentBorder: "#EBD8BB",
  successBg: "#E4F4EA",
  successText: "#25674A",
  warningBg: "#FDF1DB",
  warningText: "#9A5B00",
  dangerBg: "#FCE3E0",
  dangerText: "#B24A41",
  infoBg: "#E7EEF9",
  infoText: "#3C5A8C",
};

const formatMoney = (value?: string | null) => {
  if (!value) return "Not listed";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(parsed);
};

const formatDate = (value?: string | null) => {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not set";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatRole = (role?: string | null) =>
  role ? role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Tenant";

const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || "Resident";

const initials = (name?: string | null) =>
  name?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "R";

const TENANT_AVATAR_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

const TENANT_AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const getMimeTypeFromAsset = (asset: {
  mimeType?: string | null;
  uri: string;
}) => {
  const explicitMimeType = asset.mimeType?.toLowerCase().trim();
  if (explicitMimeType) {
    return explicitMimeType;
  }

  const lowerUri = asset.uri.toLowerCase();
  if (lowerUri.endsWith(".jpg") || lowerUri.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lowerUri.endsWith(".png")) {
    return "image/png";
  }
  if (lowerUri.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
};

const getAvatarFileName = (uri: string, mimeType: string, fallback?: string | null) => {
  const trimmedFallback = fallback?.trim();
  if (trimmedFallback) {
    return trimmedFallback;
  }

  const uriParts = uri.split("/");
  const uriFileName = uriParts[uriParts.length - 1]?.trim();
  if (uriFileName) {
    return uriFileName;
  }

  const extension = mimeType === "image/png"
    ? "png"
    : mimeType === "image/webp"
      ? "webp"
      : "jpg";

  return `tenant-avatar-${Date.now()}.${extension}`;
};

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
};

const leaseSummary = (endDate?: string | null) => {
  if (!endDate) return "Lease dates will appear once a contract is linked.";
  const parsed = new Date(endDate);
  if (Number.isNaN(parsed.getTime())) return "Lease dates will appear once a contract is linked.";
  const days = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days >= 0) {
    return `Lease ends in ${days} day${days === 1 ? "" : "s"}.`;
  }
  return `Lease ended ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago.`;
};

export default function ProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { currentUser, isAuthenticated, actions: authActions } = useAuth();
  const { notifications } = useNotifications();

  const [profileData, setProfileData] = useState<ProfileFormData>({
    name: currentUser?.profile?.name || currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.profile?.phone || "",
    previousAddress: currentUser?.profile?.currentAddress || "",
    emergencyContactName:
      currentUser?.profile?.emergencyContactName ||
      currentUser?.profile?.emergencyContact ||
      "",
    emergencyContactPhone:
      currentUser?.profile?.emergencyContactPhone ||
      currentUser?.profile?.emergencyPhone ||
      "",
  });
  const { data: contractData, isLoading: isContractLoading } = useResidentContract({
    enabled: Boolean(currentUser?.id && isAuthenticated),
  });
  const { displayBuildingName } = useResidentTenancy({
    enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id && isAuthenticated),
    latestContractData: contractData,
  });
  const buildingName = displayBuildingName || currentUser?.profile?.buildingName || "Not provided";
  const activeContract = contractData.contract;
  const unitLabel =
    currentUser?.profile?.apartment ||
    activeContract?.unitLabel ||
    activeContract?.unit?.label ||
    "Not assigned";
  const floorLabel =
    currentUser?.profile?.floor ||
    (activeContract?.unit?.floor != null ? String(activeContract.unit.floor) : null) ||
    "Not assigned";
  const residentName = profileData.name || currentUser?.name || "Resident";
  const leaseStatusLabel = activeContract?.status
    ? formatRole(String(activeContract.status).toLowerCase())
    : "No active lease";
  const displayAvatarUri =
    currentUser?.profile?.avatarUrl || currentUser?.profile?.avatar || null;

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const userNotifications = useMemo(
    () => filterNotificationsByUser(notifications || [], currentUser?.id),
    [currentUser?.id, notifications],
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;
  const minPasswordLength = APP_CONFIG.validation.minPasswordLength;

  const handleChangeAvatar = useCallback(async () => {
    if (!currentUser?.email) {
      showErrorAlert(new Error("User not found"));
      return;
    }

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Allow photo library access to update your profile photo.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const mimeType = getMimeTypeFromAsset(asset);

      if (!TENANT_AVATAR_ALLOWED_TYPES.includes(mimeType as any)) {
        Alert.alert(
          "Unsupported File",
          "Use a JPEG, PNG, or WebP image for your profile photo.",
        );
        return;
      }

      if (
        typeof asset.fileSize === "number" &&
        asset.fileSize > TENANT_AVATAR_MAX_SIZE_BYTES
      ) {
        Alert.alert(
          "File Too Large",
          `Select an image under 5 MB. The selected file is ${formatFileSize(asset.fileSize)}.`,
        );
        return;
      }

      setIsUploadingAvatar(true);

      const uploadResponse = await apiService.residentSelfService.uploadResidentAvatar({
        uri: asset.uri,
        type: mimeType,
        name: getAvatarFileName(asset.uri, mimeType, asset.fileName),
      });

      let canonicalAvatarUrl = uploadResponse.avatarUrl;
      let canonicalName = currentUser.name;
      let canonicalPhone = currentUser.phone;

      try {
        const residentIdentity =
          await apiService.residentSelfService.getResidentIdentity();
        canonicalAvatarUrl =
          residentIdentity.user?.avatarUrl ?? canonicalAvatarUrl;
        canonicalName = residentIdentity.user?.name ?? canonicalName;
        canonicalPhone = residentIdentity.user?.phone ?? canonicalPhone;
      } catch (identityError) {
        console.warn(
          "[TenantProfile] Failed to refresh resident identity after avatar upload:",
          identityError,
        );
      }

      const nextUser = {
        ...currentUser,
        name: canonicalName ?? currentUser.name,
        phone: canonicalPhone ?? currentUser.phone,
        profile: {
          ...(currentUser.profile ?? {}),
          ...(canonicalName ? { name: canonicalName } : {}),
          ...(canonicalPhone ? { phone: canonicalPhone } : {}),
          avatar: canonicalAvatarUrl,
          avatarUrl: canonicalAvatarUrl,
        },
      };

      await authActions.updateUser(currentUser.email, nextUser);
      showSuccessAlert("Profile photo updated successfully!");
    } catch (error) {
      showErrorAlert(error, "Failed to upload your profile photo.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [authActions, currentUser]);

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

    if (
      profileData.emergencyContactPhone &&
      !/^\+?[\d\s\-\(\)]{10,}$/.test(profileData.emergencyContactPhone)
    ) {
      errors.emergencyContactPhone = "Please enter a valid emergency contact phone";
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

      const updatedUser = await authActions.updateProfile({
        name: profileData.name,
        profile: {
          phone: profileData.phone,
          name: profileData.name,
          currentAddress: profileData.previousAddress,
          emergencyContactName: profileData.emergencyContactName,
          emergencyContactPhone: profileData.emergencyContactPhone,
          emergencyContact: profileData.emergencyContactName,
          emergencyPhone: profileData.emergencyContactPhone,
        },
      } as any);

      setProfileData({
        name: updatedUser.profile?.name || updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.profile?.phone || updatedUser.phone || "",
        previousAddress: (updatedUser.profile as any)?.currentAddress || "",
        emergencyContactName:
          (updatedUser.profile as any)?.emergencyContactName ||
          updatedUser.profile?.emergencyContact ||
          "",
        emergencyContactPhone:
          (updatedUser.profile as any)?.emergencyContactPhone ||
          updatedUser.profile?.emergencyPhone ||
          "",
      });

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
            await authActions.logout();
            router.replace("/auth");
          } catch (error) {
            console.error("Logout error:", error);
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
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar
            showTitle={false}
            hasUnreadNotifications={hasUnreadNotifications}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            textColor={P.text}
          />

          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroProfileBlock}>
                {displayAvatarUri ? (
                  <Image source={{ uri: displayAvatarUri }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient
                    colors={[P.primary, P.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>{initials(residentName)}</Text>
                  </LinearGradient>
                )}

                <View style={styles.headerText}>
                  <Text style={styles.heroEyebrow}>{buildingName}</Text>
                  <Text style={styles.headerTitle}>{residentName}</Text>
                  <Text style={styles.headerSubtitle}>
                    {unitLabel} • Floor {floorLabel === "Not assigned" ? "-" : floorLabel}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(!isEditing)}
              >
                <Ionicons
                  name={isEditing ? "close" : "pencil"}
                  size={18}
                  color={isEditing ? P.dangerText : P.primary}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.heroDescription}>
              {isEditing
                ? "Update your personal details and emergency contact information."
                : `Good to see you, ${firstName(residentName)}. Your residence and lease snapshot stay accessible here.`}
            </Text>

            <View style={styles.heroActionRow}>
              <TouchableOpacity
                style={[
                  styles.avatarActionButton,
                  isUploadingAvatar && styles.avatarActionButtonDisabled,
                ]}
                onPress={() => void handleChangeAvatar()}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color={P.primary} />
                ) : (
                  <Ionicons name="camera-outline" size={16} color={P.primary} />
                )}
                <Text style={styles.avatarActionText}>
                  {displayAvatarUri ? "Change Avatar" : "Add Avatar"}
                </Text>
              </TouchableOpacity>
              <Text style={styles.avatarHint}>JPEG, PNG, or WebP up to 5 MB</Text>
            </View>

            <View style={styles.profilePillRow}>
              <View style={styles.profilePill}>
                <Ionicons name="person-outline" size={15} color={P.primary} />
                <Text style={styles.profilePillText}>{formatRole(currentUser?.role)}</Text>
              </View>
              <View style={styles.profilePill}>
                <Ionicons name="business-outline" size={15} color={P.primary} />
                <Text style={styles.profilePillText}>{buildingName}</Text>
              </View>
              <View style={styles.profilePill}>
                <Ionicons name="home-outline" size={15} color={P.primary} />
                <Text style={styles.profilePillText}>{unitLabel}</Text>
              </View>
            </View>
          </View>

          <LinearGradient
            colors={[P.primary, P.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.contractHero}
          >
            <View style={styles.contractHeroCopy}>
              <Text style={styles.contractHeroEyebrow}>Lease Snapshot</Text>
              <Text style={styles.contractHeroValue}>
                {activeContract
                  ? formatMoney(activeContract.annualRent || activeContract.contractValue)
                  : "No active lease"}
              </Text>
              <Text style={styles.contractHeroSubtitle}>
                {activeContract
                  ? leaseSummary(activeContract.endDate)
                  : "A linked contract will appear here once available."}
              </Text>
            </View>

            <View style={styles.contractHeroFooter}>
              <View style={styles.contractStatusPill}>
                <Text style={styles.contractStatusPillText}>{leaseStatusLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.contractHeroAction}
                onPress={() => router.push("/(tenant)/lease-details" as any)}
              >
                <Text style={styles.contractHeroActionText}>Open Contract</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.summaryCardAccent]}>
              <Text style={styles.summaryLabel}>Lease End</Text>
              <Text style={styles.summaryValue}>{formatDate(activeContract?.endDate)}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Deposit</Text>
              <Text style={styles.summaryValue}>
                {formatMoney(activeContract?.securityDepositAmount)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Contract</Text>
              <Text style={styles.summaryValue}>
                {activeContract?.contractNumber || "Not linked"}
              </Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Resident Profile</Text>
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>
              {isSaving ? <ActivityIndicator size="small" color={P.primary} /> : null}
            </View>

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
            {renderProfileField(
              "Previous Address",
              profileData.previousAddress,
              "previousAddress",
              "Enter previous address",
              "default",
              true,
            )}
          </View>

          <View style={styles.formContainer}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Safety</Text>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
              </View>
            </View>

            {renderProfileField(
              "Emergency Contact Name",
              profileData.emergencyContactName,
              "emergencyContactName",
              "Enter emergency contact name",
            )}
            {renderProfileField(
              "Emergency Contact Phone",
              profileData.emergencyContactPhone,
              "emergencyContactPhone",
              "Enter emergency contact phone",
              "phone-pad",
            )}
          </View>

          <View style={styles.formContainer}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Residence</Text>
                <Text style={styles.sectionTitle}>Property Information</Text>
              </View>
              {isContractLoading ? <ActivityIndicator size="small" color={P.primary} /> : null}
            </View>

            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Building</Text>
              <Text style={styles.detailValue}>{buildingName}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Unit</Text>
              <Text style={styles.detailValue}>{unitLabel}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Floor</Text>
              <Text style={styles.detailValue}>{floorLabel}</Text>
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.detailLabel}>Lease Status</Text>
              <Text style={styles.detailValue}>{leaseStatusLabel}</Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.formContainer}>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    setValidationErrors({});
                    setProfileData({
                      name: currentUser?.profile?.name || currentUser?.name || "",
                      email: currentUser?.email || "",
                      phone: currentUser?.profile?.phone || "",
                      previousAddress: (currentUser?.profile as any)?.currentAddress || "",
                      emergencyContactName:
                        (currentUser?.profile as any)?.emergencyContactName ||
                        currentUser?.profile?.emergencyContact ||
                        "",
                      emergencyContactPhone:
                        (currentUser?.profile as any)?.emergencyContactPhone ||
                        currentUser?.profile?.emergencyPhone ||
                        "",
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color={P.surface} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color={P.surface} />
                      <Text style={styles.saveButtonText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/(tenant)/lease-details" as any)}
              >
                <View style={styles.actionIconWrap}>
                  <Ionicons name="document-text-outline" size={18} color={P.primary} />
                </View>
                <Text style={styles.actionTitle}>Contract Details</Text>
                <Text style={styles.actionText}>Open your full lease and documents</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={handleOpenPasswordModal}>
                <View style={styles.actionIconWrap}>
                  <Ionicons name="key-outline" size={18} color={P.primary} />
                </View>
                <Text style={styles.actionTitle}>Change Password</Text>
                <Text style={styles.actionText}>Update your account credentials</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, styles.actionCardDanger]}
                onPress={handleLogout}
              >
                <View style={[styles.actionIconWrap, styles.actionIconWrapDanger]}>
                  <Ionicons name="log-out-outline" size={18} color={P.dangerText} />
                </View>
                <Text style={styles.actionTitle}>Logout</Text>
                <Text style={styles.actionText}>Sign out of your resident account</Text>
              </TouchableOpacity>
            </View>
          )}
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
              colors={[P.primary, P.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeader}
            >
              <View style={styles.modalHeaderLeft}>
                <View style={styles.modalIconCircle}>
                  <Ionicons name="lock-closed-outline" size={20} color={P.surface} />
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
                <Ionicons name="close" size={18} color={P.surface} />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Email</Text>
              <View style={styles.modalEmailPill}>
                <Text style={styles.modalEmailText}>
                  {currentUser?.email || profileData.email || "Not provided"}
                </Text>
              </View>

              <Text style={styles.modalLabel}>Current Password</Text>
              <View
                style={[
                  styles.modalInputRow,
                  passwordError && styles.errorInput,
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
                    color={P.muted}
                  />
                </TouchableOpacity>
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
                    color={P.muted}
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
                    colors={[P.primary, P.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalPrimaryGradient}
                  >
                    {isResettingPassword ? (
                      <ActivityIndicator color={P.surface} />
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
    backgroundColor: P.bg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroCard: {
    backgroundColor: P.surface,
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  heroProfileBlock: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 24,
    marginRight: 16,
    backgroundColor: P.surfaceLow,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "800",
    color: P.surface,
  },
  headerText: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: P.text,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: P.muted,
    marginTop: 6,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: "center",
    justifyContent: "center",
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
    marginBottom: 14,
  },
  heroActionRow: {
    gap: 10,
    marginBottom: 14,
  },
  avatarActionButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
  },
  avatarActionButtonDisabled: {
    opacity: 0.7,
  },
  avatarActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.primary,
  },
  avatarHint: {
    fontSize: 12,
    lineHeight: 18,
    color: P.soft,
  },
  profilePillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  profilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: P.surfaceLow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: P.border,
  },
  profilePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: P.text,
  },
  contractHero: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
  },
  contractHeroCopy: {
    gap: 8,
    marginBottom: 18,
  },
  contractHeroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.74)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  contractHeroValue: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: P.surface,
  },
  contractHeroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.78)",
  },
  contractHeroFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  contractStatusPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  contractStatusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.surface,
    textTransform: "capitalize",
  },
  contractHeroAction: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  contractHeroActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.surface,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 22,
    padding: 16,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    justifyContent: "space-between",
  },
  summaryCardAccent: {
    backgroundColor: P.accent,
    borderColor: P.accentBorder,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  summaryValue: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
    color: P.text,
  },
  formContainer: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: P.text,
  },
  fieldContainer: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  fieldValue: {
    fontSize: 15,
    color: P.text,
    lineHeight: 21,
    minHeight: 22,
    paddingHorizontal: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    backgroundColor: P.surfaceLow,
    minHeight: 54,
    color: P.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  errorInput: {
    borderColor: P.dangerText,
  },
  errorText: {
    color: P.dangerText,
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },
  detailCard: {
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: P.border,
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
    color: P.text,
    fontWeight: "600",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: P.border,
  },
  cancelButtonText: {
    color: P.text,
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: P.primary,
    borderRadius: 18,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: P.surface,
    fontSize: 15,
    fontWeight: "600",
  },
  actionGrid: {
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: P.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: P.border,
  },
  actionCardDanger: {
    borderColor: "#E9B7B0",
    backgroundColor: P.dangerBg,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionIconWrapDanger: {
    backgroundColor: "#F8D6D1",
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: P.text,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(43, 52, 55, 0.4)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "rgba(43, 52, 55, 0.18)",
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
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
    color: P.surface,
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
    color: P.text,
  },
  modalEmailPill: {
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceLow,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalEmailText: {
    fontSize: 14,
    color: P.text,
    fontWeight: "600",
  },
  modalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 16,
    backgroundColor: P.surface,
    paddingHorizontal: 12,
  },
  modalInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: P.text,
  },
  passwordToggleButton: {
    paddingLeft: 8,
    paddingVertical: 6,
  },
  modalHint: {
    fontSize: 12,
    color: P.soft,
    marginTop: -4,
  },
  modalErrorText: {
    color: P.dangerText,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.surfaceLow,
  },
  modalSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: P.text,
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 16,
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
    color: P.surface,
  },
});
