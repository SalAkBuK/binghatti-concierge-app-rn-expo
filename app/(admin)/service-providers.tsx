import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
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
import type { ServiceProviderProfile } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

const SPECIALTY_OPTIONS = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Elevator Maintenance",
  "Cleaning",
  "Landscaping",
  "Security",
  "Carpentry",
  "Painting",
];

export default function ServiceProvidersManagementScreen() {
  const { currentUser, notifications, actions, providerAccessRequests, buildings } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProviderProfile | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set());
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState("");

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 900;
  const isManagement = currentUser?.role === "management";

  const pendingRequests = useMemo(() => {
    return (providerAccessRequests || []).filter((req) => req.status === "pending");
  }, [providerAccessRequests]);

  const allBuildings = useMemo(() => actions.getBuildings(), [actions]);
  const managedBuildings = useMemo(() => {
    if (!isManagement) return allBuildings;
    return actions.getManagedBuildings?.() ?? [];
  }, [isManagement, actions, allBuildings]);

  const serviceProviders = useMemo(() => actions.getServiceProviders(), [actions]);
  const assignments = useMemo(() => {
    if (!selectedProvider) return [];
    return actions.getServiceProviderBuildingAssignments?.(selectedProvider.id) ?? [];
  }, [selectedProvider, actions]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const providerSummary = useMemo(() => {
    return serviceProviders.map((provider) => {
      const providerAssignments = actions.getServiceProviderBuildingAssignments?.(provider.id) ?? [];
      const activeAssignments = providerAssignments.filter((a) => a.status === "active");
      return {
        provider,
        buildingsCount: activeAssignments.length,
        assignments: activeAssignments,
      };
    });
  }, [serviceProviders, actions]);

  const openAssignModal = (provider: ServiceProviderProfile) => {
    setSelectedProvider(provider);
    const providerAssignments = actions.getServiceProviderBuildingAssignments?.(provider.id) ?? [];
    const assignedBuildingIds = providerAssignments
      .filter((a) => a.status === "active")
      .map((a) => a.buildingId);
    setSelectedBuildings(new Set(assignedBuildingIds));
    setSelectedSpecialties([]);
    setAssignmentNotes("");
    setShowAssignModal(true);
  };

  const toggleBuilding = (buildingId: string) => {
    setSelectedBuildings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(buildingId)) {
        newSet.delete(buildingId);
      } else {
        newSet.add(buildingId);
      }
      return newSet;
    });
  };

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties((prev) => {
      if (prev.includes(specialty)) {
        return prev.filter((s) => s !== specialty);
      }
      return [...prev, specialty];
    });
  };

  const handleSaveAssignments = () => {
    if (!selectedProvider || !currentUser) return;

    const providerAssignments = actions.getServiceProviderBuildingAssignments?.(selectedProvider.id) ?? [];
    const currentlyAssigned = new Set(
      providerAssignments.filter((a) => a.status === "active").map((a) => a.buildingId)
    );

    // Find buildings to add and remove
    const toAdd = Array.from(selectedBuildings).filter((id) => !currentlyAssigned.has(id));
    const toRemove = Array.from(currentlyAssigned).filter((id) => !selectedBuildings.has(id));

    // Add new assignments
    toAdd.forEach((buildingId) => {
      actions.assignServiceProviderToBuilding?.(
        selectedProvider.id,
        buildingId,
        currentUser.id,
        currentUser.name,
        selectedSpecialties.length > 0 ? selectedSpecialties : [selectedProvider.specialty],
        assignmentNotes || undefined
      );
    });

    // Remove assignments
    toRemove.forEach((buildingId) => {
      actions.removeServiceProviderFromBuilding?.(
        selectedProvider.id,
        buildingId,
        currentUser.id,
        "Removed via management portal"
      );
    });

    Alert.alert(
      "Success",
      `Updated building assignments for ${selectedProvider.name}`,
    );
    setShowAssignModal(false);
    setSelectedProvider(null);
  };

  const handleApproveRequest = (requestId: string) => {
    if (!currentUser) return;

    Alert.alert(
      "Approve Request",
      "Are you sure you want to approve this provider access request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: () => {
            actions.approveProviderAccessRequest?.(
              requestId,
              currentUser.id,
              currentUser.name
            );
            Alert.alert("Success", "Provider access request approved");
          },
        },
      ]
    );
  };

  const handleRejectRequest = (requestId: string) => {
    if (!currentUser) return;

    Alert.prompt(
      "Reject Request",
      "Please provide a reason for rejection (optional):",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: (reason) => {
            actions.rejectProviderAccessRequest?.(
              requestId,
              currentUser.id,
              currentUser.name,
              reason
            );
            Alert.alert("Request Rejected", "The manager has been notified");
          },
        },
      ],
      "plain-text"
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Service Provider Management"
          subtitle="Manage vendor access to buildings"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        {pendingRequests.length > 0 && (
          <Animated.View
            entering={FadeInDown.delay(20).duration(300)}
            style={styles.pendingRequestsSection}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="notifications" size={20} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Pending Access Requests</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            </View>

            {pendingRequests.map((request, index) => (
              <Animated.View
                key={request.id}
                entering={FadeInDown.delay(60 + index * 30).duration(300)}
                style={styles.requestCard}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestProvider}>{request.serviceProviderName}</Text>
                    <Text style={styles.requestBuilding}>{request.buildingName}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => handleApproveRequest(request.id)}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.approveButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectRequest(request.id)}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.requestMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={14} color="#6B7280" />
                    <Text style={styles.metaText}>Requested by {request.requestedByName}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.metaText}>
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {request.notes && (
                  <View style={styles.requestNotes}>
                    <Text style={styles.notesLabel}>Notes:</Text>
                    <Text style={styles.notesText}>{request.notes}</Text>
                  </View>
                )}
              </Animated.View>
            ))}
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(40).duration(320)}
          style={styles.summaryCard}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{serviceProviders.length}</Text>
              <Text style={styles.summaryLabel}>Total Providers</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {providerSummary.filter((p) => p.buildingsCount > 0).length}
              </Text>
              <Text style={styles.summaryLabel}>Active Vendors</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {providerSummary.reduce((sum, p) => sum + p.buildingsCount, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Total Assignments</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.providersList}>
          {providerSummary.map((item, index) => (
            <Animated.View
              key={item.provider.id}
              entering={FadeInDown.delay(80 + index * 40).duration(300)}
            >
              <View style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <View style={styles.providerAvatar}>
                    <Text style={styles.providerAvatarText}>
                      {item.provider.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.providerName}>{item.provider.name}</Text>
                    <Text style={styles.providerSpecialty}>{item.provider.specialty}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.assignButton}
                    onPress={() => openAssignModal(item.provider)}
                  >
                    <Ionicons name="settings-outline" size={18} color="#2563EB" />
                    <Text style={styles.assignButtonText}>Manage</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.providerStats}>
                  <View style={styles.statChip}>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.statText}>{item.provider.rating.toFixed(1)} ★</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="checkmark-done" size={16} color="#10B981" />
                    <Text style={styles.statText}>{item.provider.jobsCompleted} jobs</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="business" size={16} color="#2563EB" />
                    <Text style={styles.statText}>
                      {item.buildingsCount} {item.buildingsCount === 1 ? "building" : "buildings"}
                    </Text>
                  </View>
                </View>

                {item.assignments.length > 0 && (
                  <View style={styles.assignedBuildings}>
                    <Text style={styles.assignedLabel}>Assigned Buildings:</Text>
                    <View style={styles.buildingTags}>
                      {item.assignments.map((assignment, assignmentIndex) => {
                        const building = allBuildings.find((b) => b.id === assignment.buildingId);
                        return (
                          <View key={`${item.provider.id}-${assignment.buildingId}-${assignmentIndex}`} style={styles.buildingTag}>
                            <Text style={styles.buildingTagText}>
                              {building?.name || "Unknown"}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

      {/* Assignment Modal */}
      <Modal
        visible={showAssignModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Manage: {selectedProvider?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Buildings Section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Assign to Buildings</Text>
                <Text style={styles.modalHint}>
                  Select which buildings this provider can service
                </Text>
                <View style={styles.buildingsGrid}>
                  {managedBuildings.map((building) => {
                    const isSelected = selectedBuildings.has(building.id);
                    return (
                      <TouchableOpacity
                        key={building.id}
                        style={[
                          styles.buildingChip,
                          isSelected && styles.buildingChipActive,
                        ]}
                        onPress={() => toggleBuilding(building.id)}
                      >
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={20}
                          color={isSelected ? "#2563EB" : "#9CA3AF"}
                        />
                        <Text
                          style={[
                            styles.buildingChipText,
                            isSelected && styles.buildingChipTextActive,
                          ]}
                        >
                          {building.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Specialties Section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Specialties (Optional)</Text>
                <Text style={styles.modalHint}>
                  Specify what services they provide at these buildings
                </Text>
                <View style={styles.specialtiesGrid}>
                  {SPECIALTY_OPTIONS.map((specialty) => {
                    const isSelected = selectedSpecialties.includes(specialty);
                    return (
                      <TouchableOpacity
                        key={specialty}
                        style={[
                          styles.specialtyChip,
                          isSelected && styles.specialtyChipActive,
                        ]}
                        onPress={() => toggleSpecialty(specialty)}
                      >
                        <Text
                          style={[
                            styles.specialtyChipText,
                            isSelected && styles.specialtyChipTextActive,
                          ]}
                        >
                          {specialty}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Notes Section */}
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add any notes about this assignment..."
                  value={assignmentNotes}
                  onChangeText={setAssignmentNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveButton]}
                onPress={handleSaveAssignments}
              >
                <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  pendingRequestsSection: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#F59E0B",
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400E",
  },
  badge: {
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 10,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  requestInfo: {
    flex: 1,
    gap: 4,
  },
  requestProvider: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  requestBuilding: {
    fontSize: 13,
    color: "#6B7280",
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  approveButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
  },
  rejectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B",
  },
  requestMeta: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  requestNotes: {
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  providersList: {
    marginTop: 20,
    gap: 14,
  },
  providerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    gap: 14,
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  providerAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2563EB",
  },
  providerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  providerSpecialty: {
    fontSize: 13,
    color: "#6B7280",
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  assignButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  providerStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  assignedBuildings: {
    gap: 8,
  },
  assignedLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buildingTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  buildingTag: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buildingTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E40AF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    maxWidth: 500,
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalContent: {
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
  },
  buildingsGrid: {
    gap: 10,
  },
  buildingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  buildingChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  buildingChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  buildingChipTextActive: {
    color: "#1E40AF",
  },
  specialtiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specialtyChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  specialtyChipActive: {
    backgroundColor: "#DBEAFE",
    borderColor: "#2563EB",
  },
  specialtyChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  specialtyChipTextActive: {
    color: "#1D4ED8",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 80,
  },
  modalFooter: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
