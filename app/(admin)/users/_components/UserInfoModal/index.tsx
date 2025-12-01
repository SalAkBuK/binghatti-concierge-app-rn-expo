import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import type { User, UserRole } from "../../../../../lib/types";

interface UserInfoModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
  onDelete?: (userId: string) => void;
  getBuildingName?: (buildingId: string) => string;
  onEdit?: (user: User) => void;
}

const getRoleBadgeColor = (role: UserRole) => {
  const colors = {
    admin: { bg: "#FEE2E2", text: "#DC2626" },
    super_admin: { bg: "#FECACA", text: "#B91C1C" },
    management: { bg: "#E0E7FF", text: "#4338CA" },
    service_provider: { bg: "#DBEAFE", text: "#1E40AF" },
    tenant: { bg: "#D1FAE5", text: "#065F46" },
    employee: { bg: "#FEF3C7", text: "#92400E" },
    building_employee: { bg: "#FCE7F3", text: "#BE185D" },
  };
  return colors[role] || colors.tenant;
};

const getStatusColor = (status?: string) => {
  if (status === "active") return { bg: "#D1FAE5", text: "#065F46" };
  return { bg: "#FEE2E2", text: "#DC2626" };
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatRole = (role: string) => {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function UserInfoModal({
  visible,
  user,
  onClose,
  onDelete,
  getBuildingName,
  onEdit,
}: UserInfoModalProps) {
  if (!user) return null;

  const roleColors = getRoleBadgeColor(user.role);
  const statusColors = getStatusColor(user.status);
  const profile = user.profile;

  const handleDelete = () => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete?.(user.id);
            onClose();
          },
        },
      ]
    );
  };

  // Check if user can be deleted (cannot delete admin/super_admin)
  const canDelete = onDelete && !["admin", "super_admin"].includes(user.role);

  const InfoRow = ({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string | null;
  }) => {
    if (!value) return null;
    return (
      <View style={modalStyles.infoRow}>
        <View style={modalStyles.infoIconContainer}>
          <Ionicons name={icon} size={18} color="#6B7280" />
        </View>
        <View style={modalStyles.infoContent}>
          <Text style={modalStyles.infoLabel}>{label}</Text>
          <Text style={modalStyles.infoValue}>{value}</Text>
        </View>
      </View>
    );
  };

  const Section = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <View style={modalStyles.section}>
      <Text style={modalStyles.sectionTitle}>{title}</Text>
      <View style={modalStyles.sectionContent}>{children}</View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Animated.View entering={FadeIn.duration(200)} style={modalStyles.overlay}>
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={modalStyles.container}
        >
          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.avatarContainer}>
              <View style={modalStyles.avatar}>
                <Text style={modalStyles.avatarText}>{getInitials(user.name)}</Text>
              </View>
              <View
                style={[
                  modalStyles.statusDot,
                  { backgroundColor: statusColors.text },
                ]}
              />
            </View>

            <View style={modalStyles.headerInfo}>
              <Text style={modalStyles.userName}>{user.name}</Text>
              <View style={modalStyles.badges}>
                <View style={[modalStyles.roleBadge, { backgroundColor: roleColors.bg }]}>
                  <Text style={[modalStyles.roleBadgeText, { color: roleColors.text }]}>
                    {formatRole(user.role)}
                  </Text>
                </View>
                <View style={[modalStyles.statusBadge, { backgroundColor: statusColors.bg }]}>
                  <Text style={[modalStyles.statusBadgeText, { color: statusColors.text }]}>
                    {user.status || "Active"}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={modalStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Contact Information */}
            <Section title="Contact Information">
              <InfoRow icon="mail-outline" label="Email" value={user.email} />
              <InfoRow icon="call-outline" label="Phone" value={user.phone} />
            </Section>

            {/* Location - For Tenants/Employees */}
            {(user.role === "tenant" ||
              user.role === "employee" ||
              user.role === "building_employee") &&
              profile?.buildingId && (
                <Section title="Location">
                  <InfoRow
                    icon="business-outline"
                    label="Building"
                    value={
                      getBuildingName
                        ? getBuildingName(profile.buildingId)
                        : profile.buildingId
                    }
                  />
                  {profile.tower && (
                    <InfoRow icon="layers-outline" label="Tower" value={profile.tower} />
                  )}
                  {profile.apartment && (
                    <InfoRow
                      icon="home-outline"
                      label="Apartment"
                      value={profile.apartment}
                    />
                  )}
                </Section>
              )}

            {/* Emergency Contact - For Tenants */}
            {user.role === "tenant" &&
              (profile?.emergencyContact || profile?.emergencyPhone) && (
                <Section title="Emergency Contact">
                  <InfoRow
                    icon="person-outline"
                    label="Contact Name"
                    value={profile.emergencyContact}
                  />
                  <InfoRow
                    icon="call-outline"
                    label="Contact Phone"
                    value={profile.emergencyPhone}
                  />
                </Section>
              )}

            {/* Work Information - For Service Providers/Employees */}
            {(user.role === "service_provider" || user.role === "employee") && (
              <Section title="Work Information">
                {profile?.serviceProviderName && (
                  <InfoRow
                    icon="briefcase-outline"
                    label="Company"
                    value={profile.serviceProviderName}
                  />
                )}
                {profile?.jobTitle && (
                  <InfoRow
                    icon="ribbon-outline"
                    label="Job Title"
                    value={profile.jobTitle}
                  />
                )}
                {profile?.rating !== undefined && (
                  <View style={modalStyles.infoRow}>
                    <View style={modalStyles.infoIconContainer}>
                      <Ionicons name="star" size={18} color="#F59E0B" />
                    </View>
                    <View style={modalStyles.infoContent}>
                      <Text style={modalStyles.infoLabel}>Rating</Text>
                      <View style={modalStyles.ratingContainer}>
                        <Text style={modalStyles.ratingValue}>
                          {profile.rating.toFixed(1)}
                        </Text>
                        <Text style={modalStyles.ratingMax}>/5.0</Text>
                        {profile.completedJobs !== undefined && (
                          <Text style={modalStyles.jobsCompleted}>
                            ({profile.completedJobs} jobs)
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}
                {profile?.specialties && profile.specialties.length > 0 && (
                  <View style={modalStyles.infoRow}>
                    <View style={modalStyles.infoIconContainer}>
                      <Ionicons name="construct-outline" size={18} color="#6B7280" />
                    </View>
                    <View style={modalStyles.infoContent}>
                      <Text style={modalStyles.infoLabel}>Specialties</Text>
                      <View style={modalStyles.tagsContainer}>
                        {profile.specialties.map((specialty, index) => (
                          <View key={index} style={modalStyles.tag}>
                            <Text style={modalStyles.tagText}>{specialty}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
                {profile?.certifications && profile.certifications.length > 0 && (
                  <View style={modalStyles.infoRow}>
                    <View style={modalStyles.infoIconContainer}>
                      <Ionicons name="medal-outline" size={18} color="#6B7280" />
                    </View>
                    <View style={modalStyles.infoContent}>
                      <Text style={modalStyles.infoLabel}>Certifications</Text>
                      <View style={modalStyles.tagsContainer}>
                        {profile.certifications.map((cert, index) => (
                          <View key={index} style={modalStyles.certTag}>
                            <Text style={modalStyles.certTagText}>{cert}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </Section>
            )}

            {/* Managed Buildings - For Management */}
            {user.role === "management" &&
              profile?.managedBuildingIds &&
              profile.managedBuildingIds.length > 0 && (
                <Section title="Managed Buildings">
                  <View style={modalStyles.managedBuildingsList}>
                    {profile.managedBuildingIds.map((buildingId, index) => (
                      <View key={index} style={modalStyles.managedBuildingItem}>
                        <Ionicons name="business" size={16} color="#7034FF" />
                        <Text style={modalStyles.managedBuildingText}>
                          {getBuildingName
                            ? getBuildingName(buildingId)
                            : buildingId}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Section>
              )}

            {/* Documents - If available */}
            {(profile?.emiratesId || profile?.passportNumber) && (
              <Section title="Documents">
                <InfoRow
                  icon="card-outline"
                  label="Emirates ID"
                  value={profile.emiratesId}
                />
                <InfoRow
                  icon="document-outline"
                  label="Passport"
                  value={profile.passportNumber}
                />
              </Section>
            )}

            {/* Account Information */}
            <Section title="Account Details">
              <InfoRow
                icon="finger-print-outline"
                label="User ID"
                value={user.id}
              />
              <InfoRow
                icon="calendar-outline"
                label="Created"
                value={formatDate(user.createdAt)}
              />
              <InfoRow
                icon="time-outline"
                label="Last Updated"
                value={formatDate(user.updatedAt)}
              />
            </Section>
          </ScrollView>

          {/* Footer */}
          <View style={modalStyles.footer}>
            {canDelete && (
              <TouchableOpacity
                style={modalStyles.deleteButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
                <Text style={modalStyles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity
                style={[modalStyles.footerButton, { backgroundColor: "#2563EB" }]}
                onPress={() => {
                  onEdit(user);
                  onClose();
                }}
              >
                <Text style={modalStyles.footerButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                modalStyles.footerButton,
                (canDelete || onEdit) && { flex: 1 },
                { backgroundColor: onEdit ? "#6B7280" : "#7034FF" },
              ]}
              onPress={onClose}
            >
              <Text style={modalStyles.footerButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7034FF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 14,
    marginTop: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  closeButton: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionContent: {
    gap: 2,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  infoIconContainer: {
    width: 32,
    alignItems: "center",
    paddingTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F59E0B",
  },
  ratingMax: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  jobsCompleted: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1E40AF",
  },
  certTag: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  certTagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#166534",
  },
  managedBuildingsList: {
    gap: 8,
  },
  managedBuildingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  managedBuildingText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#5B21B6",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  footerButton: {
    backgroundColor: "#7034FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
