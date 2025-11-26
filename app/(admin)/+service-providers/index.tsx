import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import type { ServiceProviderProfile } from "../../../lib/types";
import { AssignProviderModal } from "./_components/AssignProviderModal";
import { CreateProviderModal } from "./_components/CreateProviderModal";
import { ADMIN_NOTIFICATION_ROUTE } from "./_constants";
import { useServiceProvidersData } from "./_hooks/useServiceProvidersData";
import { styles } from "./_styles";
import type { CreateProviderFormState } from "./_types";

const createInitialFormState = (): CreateProviderFormState => ({
  name: "",
  email: "",
  phone: "",
  specialty: "",
  buildingIds: [],
});

export default function ServiceProvidersManagementScreen() {
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProviderProfile | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set());
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [createFormData, setCreateFormData] = useState<CreateProviderFormState>(
    createInitialFormState(),
  );

  const {
    serviceProviders,
    pendingRequests,
    buildingOptions,
    managedBuildings,
    hasUnreadNotifications,
    actions,
    currentUser,
  } = useServiceProvidersData();

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const providerSummary = useMemo(() => {
    return serviceProviders.map((provider) => {
      const providerAssignments =
        actions.getServiceProviderBuildingAssignments?.(provider.id) ?? [];
      const activeAssignments = providerAssignments.filter((a) => a.status === "active");
      return {
        provider,
        assignments: activeAssignments,
        buildingsCount: activeAssignments.length,
      };
    });
  }, [serviceProviders, actions]);

  const openAssignModal = (provider) => {
    setSelectedProvider(provider);
    const providerAssignments =
      actions.getServiceProviderBuildingAssignments?.(provider.id) ?? [];
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
      const next = new Set(prev);
      if (next.has(buildingId)) {
        next.delete(buildingId);
      } else {
        next.add(buildingId);
      }
      return next;
    });
  };

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty) ? prev.filter((s) => s !== specialty) : [...prev, specialty],
    );
  };

  const handleSaveAssignments = () => {
    if (!selectedProvider || !currentUser) return;

    const providerAssignments =
      actions.getServiceProviderBuildingAssignments?.(selectedProvider.id) ?? [];
    const currentlyAssigned = new Set(
      providerAssignments.filter((a) => a.status === "active").map((a) => a.buildingId),
    );

    const toAdd = Array.from(selectedBuildings).filter((id) => !currentlyAssigned.has(id));
    const toRemove = Array.from(currentlyAssigned).filter((id) => !selectedBuildings.has(id));

    toAdd.forEach((buildingId) => {
      actions.assignServiceProviderToBuilding?.(
        selectedProvider.id,
        buildingId,
        currentUser.id,
        currentUser.name,
        selectedSpecialties.length > 0 ? selectedSpecialties : [selectedProvider.specialty],
        assignmentNotes || undefined,
      );
    });

    toRemove.forEach((buildingId) => {
      // Find the assignment ID for this provider + building combination
      const assignment = providerAssignments.find(
        (a) => a.buildingId === buildingId && a.status === "active"
      );
      if (assignment) {
        actions.removeServiceProviderFromBuilding?.(assignment.id);
      }
    });

    Alert.alert("Success", `Updated building assignments for ${selectedProvider.name}`);
    setShowAssignModal(false);
    setSelectedProvider(null);
  };

  const handleApproveRequest = (requestId: string) => {
    if (!currentUser) return;

    Alert.alert("Approve Request", "Approve this provider access request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: () => {
          actions.approveProviderAccessRequest?.(requestId, currentUser.id, currentUser.name);
          Alert.alert("Success", "Provider access request approved");
        },
      },
    ]);
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
            actions.rejectProviderAccessRequest?.(requestId, currentUser.id, reason);
            Alert.alert("Rejected", "Provider access request rejected.");
          },
        },
      ],
    );
  };

  const handleCreateProvider = async () => {
    if (!createFormData.name.trim() || !createFormData.email.trim() || !createFormData.specialty) {
      Alert.alert("Validation", "Name, email, and specialty are required");
      return;
    }

    setIsCreating(true);
    try {
      await actions.createServiceProvider?.({
        name: createFormData.name,
        email: createFormData.email,
        phone: createFormData.phone,
        specialty: createFormData.specialty,
        buildingIds: createFormData.buildingIds,
      });
      Alert.alert("Success", "Service provider created");
      setCreateFormData(createInitialFormState());
      setShowCreateModal(false);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to create provider");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredProviders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return providerSummary;
    return providerSummary.filter((item) =>
      item.provider.name.toLowerCase().includes(query),
    );
  }, [providerSummary, searchQuery]);

  const providerCards = filteredProviders.map((item, index) => (
    <Animated.View
      key={item.provider.id}
      entering={FadeInDown.delay(60 + index * 40).duration(320)}
      style={styles.providerCard}
    >
      <View style={styles.providerHeaderRow}>
        <View>
          <Text style={styles.providerName}>{item.provider.name}</Text>
          <Text style={styles.providerMeta}>{item.provider.specialty}</Text>
        </View>
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => openAssignModal(item.provider)}
        >
          <Ionicons name="settings" size={16} color="#4338CA" />
          <Text style={styles.manageButtonText}>Manage</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.providerStatsRow}>
        <View style={styles.statChip}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.statText}>{item.provider.rating.toFixed(1)} rating</Text>
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
              const building = buildingOptions.find((b) => b.id === assignment.buildingId);
              return (
                <View
                  key={`${item.provider.id}-${assignment.buildingId}-${assignmentIndex}`}
                  style={styles.buildingTag}
                >
                  <Text style={styles.buildingTagText}>{building?.name || "Unknown"}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </Animated.View>
  ));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Service Provider Management"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        <Animated.View entering={FadeInDown.delay(40).duration(320)} style={styles.controlsRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="person-add" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Add Provider</Text>
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search providers"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </Animated.View>

        {pendingRequests.length > 0 && (
          <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.pendingSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Access Requests</Text>
            </View>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.requestCardRow}>
                <View>
                  <Text style={styles.requestTitle}>{request.providerName}</Text>
                  <Text style={styles.requestMeta}>{request.specialty}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApproveRequest(request.id)}
                  >
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleRejectRequest(request.id)}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        <View style={styles.providersList}>{providerCards}</View>
        <View style={{ height: 48 }} />
      </ScrollView>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

      <AssignProviderModal
        visible={showAssignModal}
        provider={selectedProvider}
        managedBuildings={managedBuildings}
        selectedBuildings={selectedBuildings}
        selectedSpecialties={selectedSpecialties}
        assignmentNotes={assignmentNotes}
        onToggleBuilding={toggleBuilding}
        onToggleSpecialty={toggleSpecialty}
        onChangeNotes={setAssignmentNotes}
        onClose={() => setShowAssignModal(false)}
        onSave={handleSaveAssignments}
      />

      <CreateProviderModal
        visible={showCreateModal}
        buildings={buildingOptions}
        formData={createFormData}
        isCreating={isCreating}
        onChange={(updates) => setCreateFormData((prev) => ({ ...prev, ...updates }))}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProvider}
      />
    </SafeAreaView>
  );
}
