import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";

export default function SPEmployeeProfileScreen() {
  const { currentUser, actions } = useApp();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const { width } = useWindowDimensions();

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const profile = currentUser?.profile;
  const initials = currentUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "SP";

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await actions.logout?.();
            router.replace("/auth");
          } catch {
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
        <HeaderBar
          title="SP Employee Profile"
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        <SideMenu
          isVisible={showSideMenu}
          onClose={() => setShowSideMenu(false)}
          userRole={currentUser?.role}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.statusIndicator} />
            </View>
            <Text style={styles.userName}>{currentUser?.name || "Employee"}</Text>
            <Text style={styles.userRole}>
              {profile?.jobTitle || "Service Provider Employee"}
            </Text>
            {profile?.serviceProviderName && (
              <View style={styles.companyBadge}>
                <Ionicons name="business-outline" size={14} color="#7C3AED" />
                <Text style={styles.companyName}>{profile.serviceProviderName}</Text>
              </View>
            )}
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="star" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>
                {profile?.rating?.toFixed(1) || "N/A"}
              </Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="checkmark-done" size={20} color="#10B981" />
              </View>
              <Text style={styles.statValue}>
                {profile?.completedJobs || 0}
              </Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="ribbon" size={20} color="#6366F1" />
              </View>
              <Text style={styles.statValue}>
                {profile?.certifications?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Certifications</Text>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="mail-outline" size={18} color="#6B7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{currentUser?.email || "N/A"}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="call-outline" size={18} color="#6B7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{currentUser?.phone || "N/A"}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Skills & Specialties */}
          {profile?.specialties && profile.specialties.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Skills & Specialties</Text>
              <View style={styles.tagsContainer}>
                {profile.specialties.map((specialty, index) => (
                  <View key={index} style={styles.skillTag}>
                    <Ionicons name="construct-outline" size={14} color="#2563EB" />
                    <Text style={styles.skillTagText}>{specialty}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Certifications */}
          {profile?.certifications && profile.certifications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Certifications</Text>
              <View style={styles.certificationsContainer}>
                {profile.certifications.map((cert, index) => (
                  <View key={index} style={styles.certCard}>
                    <View style={styles.certIcon}>
                      <Ionicons name="medal-outline" size={20} color="#059669" />
                    </View>
                    <Text style={styles.certText}>{cert}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Account Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="finger-print-outline" size={18} color="#6B7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Employee ID</Text>
                  <Text style={styles.infoValue}>{currentUser?.id || "N/A"}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>
                      {currentUser?.status || "Active"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="calendar-outline" size={18} color="#6B7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Member Since</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(currentUser?.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="create-outline" size={18} color="#7C3AED" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
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
  scrollContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    borderWidth: 3,
    borderColor: "#F8FAFC",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  companyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  companyName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7C3AED",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  skillTagText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2563EB",
  },
  certificationsContainer: {
    gap: 8,
  },
  certCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  certIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  certText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#065F46",
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#059669",
    textTransform: "capitalize",
  },
  actionsSection: {
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F3E8FF",
    paddingVertical: 14,
    borderRadius: 12,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7C3AED",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#DC2626",
  },
});
