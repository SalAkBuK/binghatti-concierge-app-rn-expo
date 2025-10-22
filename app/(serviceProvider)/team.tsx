import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
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

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  specialties: string[];
  isAvailable: boolean;
  joinedDate: string;
  completedJobs: number;
  rating: number;
  source: "system" | "manual";
};

export default function TeamScreen() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const { currentUser, notifications, actions, jobs, users } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get the job if jobId is present (navigating from job-details to assign)
  const jobToAssign = jobId ? jobs.find((j) => j.id === jobId) : null;

  const userList = useMemo(() => Object.values(users), [users]);

  // Calculate current active jobs for each employee
  const employeeJobCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    jobs.forEach((job) => {
      if (
        job.assignedToEmployeeId &&
        (job.status === "assigned" || job.status === "in-progress")
      ) {
        counts[job.assignedToEmployeeId] =
          (counts[job.assignedToEmployeeId] || 0) + 1;
      }
    });
    return counts;
  }, [jobs]);

  // Add member form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    specialties: [] as string[],
  });

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  useEffect(() => {
    setTeamMembers((prev) => {
      const manualMembers = prev.filter((member) => member.source === "manual");
      const availabilityMap = new Map(
        prev.map((member) => [member.id, member.isAvailable]),
      );
      const ratingMap = new Map(
        prev.map((member) => [member.id, member.rating]),
      );

      const systemMembers = userList
        .filter(
          (user) =>
            user.role === "employee" &&
            user.profile?.serviceProviderId === currentUser?.id,
        )
        .map<TeamMember>((user) => {
          const completedJobs = jobs.filter(
            (job) =>
              job.assignedToEmployeeId === user.id &&
              job.status === "completed",
          ).length;

          return {
            id: user.id,
            name:
              user.name ||
              user.profile?.name ||
              user.email ||
              "Team Member",
            email: user.email || "",
            phone: user.profile?.phone || "",
            role: user.profile?.jobTitle ?? "Field Technician",
            specialties: user.profile?.specialties || [],
            isAvailable: availabilityMap.get(user.id) ?? true,
            joinedDate: user.createdAt || new Date().toISOString(),
            completedJobs,
            rating: ratingMap.get(user.id) ?? 4.6,
            source: "system",
          };
        });

      return [...systemMembers, ...manualMembers];
    });
  }, [userList, currentUser?.id, jobs]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Filter team members by search query
  const filteredTeam = teamMembers.filter((member) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query)
    );
  });

  const availableCount = teamMembers.filter((m) => m.isAvailable).length;

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const toggleAvailability = (memberId: string) => {
    setTeamMembers((prev) =>
      prev.map((member) =>
        member.id === memberId
          ? { ...member, isAvailable: !member.isAvailable }
          : member
      )
    );
  };

  const handleAddMember = () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    const newMember: TeamMember = {
      id: `tm${Date.now()}`,
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      role: formData.role.trim() || "Technician",
      specialties: formData.specialties,
      isAvailable: true,
      joinedDate: new Date().toISOString(),
      completedJobs: 0,
      rating: 0,
      source: "manual",
    };

    setTeamMembers((prev) => [...prev, newMember]);
    setShowAddModal(false);
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "",
      specialties: [],
    });
    Alert.alert("Success", "Team member added successfully!");
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    if (member?.source === "system") {
      Alert.alert(
        "Managed Employee",
        "This team member is synced from your company directory and cannot be removed here.",
      );
      return;
    }

    Alert.alert(
      "Remove Team Member",
      `Are you sure you want to remove ${memberName} from your team?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
            Alert.alert("Removed", "Team member has been removed.");
          },
        },
      ]
    );
  };

  const handleAssignJob = (member: TeamMember) => {
    if (!jobToAssign) return;

    if (member.source !== "system") {
      Alert.alert(
        "Unavailable",
        "Only verified employees from your team directory can be assigned to jobs.",
      );
      return;
    }

    Alert.alert(
      "Assign Job",
      `Assign "${jobToAssign.title}" to ${member.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Assign",
          onPress: async () => {
            try {
              await actions.assignEmployeeToJob?.(
                jobToAssign.id,
                member.id,
              );
              Alert.alert("Success", `Job assigned to ${member.name}!`, [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to assign job. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.content, { paddingHorizontal: pagePadding }]}>
        <HeaderBar
          title="Team Management"
        subtitle="Manage your team members"
        hasUnreadNotifications={hasUnreadNotifications}
        onNotificationPress={() => router.push(NOTIFICATION_ROUTE as any)}
        showSideMenu={showSideMenu}
        onSideMenuToggle={setShowSideMenu}
      />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={styles.statCard}
            >
              <Ionicons name="people" size={28} color="#3B82F6" />
              <Text style={styles.statValue}>{teamMembers.length}</Text>
              <Text style={styles.statLabel}>Total Members</Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(400).delay(50)}
              style={styles.statCard}
            >
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
              <Text style={styles.statValue}>{availableCount}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(400).delay(100)}
              style={styles.statCard}
            >
              <Ionicons name="close-circle" size={28} color="#EF4444" />
              <Text style={styles.statValue}>
                {teamMembers.length - availableCount}
              </Text>
              <Text style={styles.statLabel}>Unavailable</Text>
            </Animated.View>
          </View>

          {/* Job Assignment Banner */}
          {jobToAssign && (
            <Animated.View
              entering={FadeInDown.duration(400).delay(120)}
              style={styles.assignmentBanner}
            >
              <Ionicons name="briefcase" size={20} color="#3B82F6" />
              <View style={styles.assignmentBannerText}>
                <Text style={styles.assignmentBannerTitle}>
                  Assigning Job
                </Text>
                <Text style={styles.assignmentBannerSubtitle}>
                  {jobToAssign.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="close-circle" size={24} color="#64748B" />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Search Bar */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(150)}
            style={styles.searchContainer}
          >
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search team members..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Add Member Button */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Team Member</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Team Members List */}
          {filteredTeam.length > 0 ? (
            <View style={styles.teamList}>
              {filteredTeam.map((member, index) => (
                <Animated.View
                  key={member.id}
                  entering={FadeInDown.duration(400).delay(250 + index * 50)}
                  style={styles.memberCard}
                >
                  <View style={styles.memberHeader}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberRole}>{member.role}</Text>
                      <View style={styles.memberSpecialties}>
                        {member.specialties.slice(0, 2).map((specialty) => (
                          <View key={specialty} style={styles.specialtyTag}>
                            <Text style={styles.specialtyTagText}>
                              {specialty}
                            </Text>
                          </View>
                        ))}
                        {member.specialties.length > 2 && (
                          <Text style={styles.moreSpecialties}>
                            +{member.specialties.length - 2}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.memberStats}>
                    <View style={styles.memberStatItem}>
                      <Ionicons
                        name="checkmark-done"
                        size={16}
                        color="#64748B"
                      />
                      <Text style={styles.memberStatText}>
                        {member.completedJobs} completed
                      </Text>
                    </View>
                    <View style={styles.memberStatItem}>
                      <Ionicons name="time" size={16} color="#3B82F6" />
                      <Text style={styles.memberStatText}>
                        {employeeJobCounts[member.id] || 0} active
                      </Text>
                    </View>
                    <View style={styles.memberStatItem}>
                      <Ionicons name="star" size={16} color="#F59E0B" />
                      <Text style={styles.memberStatText}>
                        {member.rating > 0 ? member.rating.toFixed(1) : "New"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.memberContact}>
                    <View style={styles.contactRow}>
                      <Ionicons name="mail-outline" size={16} color="#64748B" />
                      <Text style={styles.contactText}>{member.email}</Text>
                    </View>
                    <View style={styles.contactRow}>
                      <Ionicons name="call-outline" size={16} color="#64748B" />
                      <Text style={styles.contactText}>{member.phone}</Text>
                    </View>
                  </View>

                  {/* Assign Job Button - Show when navigating from job-details */}
                  {jobToAssign && (
                    <TouchableOpacity
                      style={[
                        styles.assignJobButton,
                        (!member.isAvailable || member.source !== "system") &&
                          styles.assignJobButtonDisabled,
                      ]}
                      onPress={() => handleAssignJob(member)}
                      disabled={
                        !member.isAvailable || member.source !== "system"
                      }
                    >
                      <Ionicons
                        name="person-add"
                        size={18}
                        color={
                          !member.isAvailable || member.source !== "system"
                            ? "#94A3B8"
                            : "#FFFFFF"
                        }
                      />
                      <Text
                        style={[
                          styles.assignJobButtonText,
                          (!member.isAvailable || member.source !== "system") &&
                            styles.assignJobButtonTextDisabled,
                        ]}
                      >
                        {member.source !== "system"
                          ? "Link Employee"
                          : member.isAvailable
                          ? "Assign This Job"
                          : "Unavailable"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Regular Actions - Show when not assigning */}
                  {!jobToAssign && (
                    <View style={styles.memberActions}>
                      <View style={styles.availabilityToggle}>
                        <Text style={styles.availabilityLabel}>
                          {member.isAvailable ? "Available" : "Unavailable"}
                        </Text>
                        <Switch
                          value={member.isAvailable}
                          onValueChange={() => toggleAvailability(member.id)}
                          trackColor={{ false: "#E2E8F0", true: "#93C5FD" }}
                          thumbColor={member.isAvailable ? "#3B82F6" : "#F1F5F9"}
                        />
                      </View>
                      {member.source === "manual" && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() =>
                            handleRemoveMember(member.id, member.name)
                          }
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#EF4444"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </Animated.View>
              ))}
            </View>
          ) : (
            <Animated.View
              entering={FadeInDown.duration(400).delay(250)}
              style={styles.emptyState}
            >
              <Ionicons name="people-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyStateTitle}>No Team Members Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? "Try adjusting your search"
                  : "Add your first team member to get started"}
              </Text>
            </Animated.View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

      {/* Add Member Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Team Member</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, name: text }))
                  }
                  placeholder="Enter full name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, email: text }))
                  }
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, phone: text }))
                  }
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Role</Text>
                <TextInput
                  style={styles.input}
                  value={formData.role}
                  onChangeText={(text) =>
                    setFormData((prev) => ({ ...prev, role: text }))
                  }
                  placeholder="e.g., Senior Technician"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleAddMember}
                >
                  <Text style={styles.saveButtonText}>Add Member</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 16,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  teamList: {
    gap: 16,
  },
  memberCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: "row",
    marginBottom: 16,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
  },
  memberSpecialties: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  specialtyTag: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specialtyTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3B82F6",
  },
  moreSpecialties: {
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  memberStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  memberStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberStatText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  memberContact: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  memberActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  availabilityToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  availabilityLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 280,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalForm: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
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
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
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
  assignmentBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  assignmentBannerText: {
    flex: 1,
  },
  assignmentBannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
    marginBottom: 2,
  },
  assignmentBannerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
  },
  assignJobButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  assignJobButtonDisabled: {
    backgroundColor: "#F1F5F9",
  },
  assignJobButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  assignJobButtonTextDisabled: {
    color: "#94A3B8",
  },
});
