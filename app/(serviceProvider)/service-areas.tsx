import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import apiService from "../../lib/services/api";

const SPECIALTY_OPTIONS = [
  { id: "plumbing", label: "Plumbing", icon: "water" as const },
  { id: "electrical", label: "Electrical", icon: "flash" as const },
  { id: "hvac", label: "HVAC", icon: "snow" as const },
  { id: "carpentry", label: "Carpentry", icon: "hammer" as const },
  { id: "painting", label: "Painting", icon: "color-palette" as const },
  { id: "cleaning", label: "Cleaning", icon: "sparkles" as const },
  { id: "landscaping", label: "Landscaping", icon: "leaf" as const },
  { id: "security", label: "Security", icon: "shield-checkmark" as const },
];

export default function ServiceAreasScreen() {
  const { currentUser, actions } = useApp();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSpecialties, setSelectedSpecialties] = useState<Set<string>>(
    new Set(["plumbing", "electrical"]) // Mock initial selection
  );

  // State for storing fetched buildings
  const [assignedBuildings, setAssignedBuildings] = useState<Array<{
    id: number;
    name: string;
    address: string;
    city: string;
    unintsCount: number;
    isActive: boolean;
  }>>([]);

  // Get service provider ID from current user
  const serviceProviderId = currentUser?.id;

  // Track active/inactive status for each building
  const [buildingStatus, setBuildingStatus] = useState<Record<string, boolean>>({});

  // Fetch buildings assigned to this service provider
  useEffect(() => {
    const fetchBuildings = async () => {
      if (!serviceProviderId) {
        console.log('[ServiceAreas] No service provider ID found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('[ServiceAreas] Fetching buildings for provider:', serviceProviderId);
        const response = await apiService.maintenance.getBuildingsByServiceProvider(serviceProviderId);

        if (response.success && response.data) {
          console.log('[ServiceAreas] Buildings fetched successfully:', response.data.length);
          setAssignedBuildings(response.data);

          // Initialize building status (all active by default based on API isActive field)
          const initialStatus: Record<string, boolean> = {};
          response.data.forEach((building) => {
            initialStatus[String(building.id)] = building.isActive;
          });
          setBuildingStatus(initialStatus);
        } else {
          console.error('[ServiceAreas] Failed to fetch buildings:', response);
          Alert.alert('Error', 'Failed to load assigned buildings');
        }
      } catch (error) {
        console.error('[ServiceAreas] Error fetching buildings:', error);
        Alert.alert('Error', 'Failed to load assigned buildings');
      } finally {
        setLoading(false);
      }
    };

    fetchBuildings();
  }, [serviceProviderId]);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  // Filter assigned buildings by search query
  const filteredBuildings = useMemo(() => {
    if (!searchQuery.trim()) return assignedBuildings;
    const query = searchQuery.toLowerCase();
    return assignedBuildings.filter((building) =>
      building.name.toLowerCase().includes(query) ||
      building.address?.toLowerCase().includes(query) ||
      building.city?.toLowerCase().includes(query)
    );
  }, [assignedBuildings, searchQuery]);

  const onRefresh = async () => {
    if (!serviceProviderId) return;

    setRefreshing(true);
    try {
      console.log('[ServiceAreas] Refreshing buildings for provider:', serviceProviderId);
      const response = await apiService.maintenance.getBuildingsByServiceProvider(serviceProviderId);

      if (response.success && response.data) {
        console.log('[ServiceAreas] Buildings refreshed successfully:', response.data.length);
        setAssignedBuildings(response.data);

        // Update building status with fresh data
        const updatedStatus: Record<string, boolean> = {};
        response.data.forEach((building) => {
          updatedStatus[String(building.id)] = building.isActive;
        });
        setBuildingStatus(updatedStatus);
      }
    } catch (error) {
      console.error('[ServiceAreas] Error refreshing buildings:', error);
      Alert.alert('Error', 'Failed to refresh buildings');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleSpecialty = (specialtyId: string) => {
    setSelectedSpecialties((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(specialtyId)) {
        newSet.delete(specialtyId);
      } else {
        newSet.add(specialtyId);
      }
      return newSet;
    });
  };

  // Calculate active buildings count
  const activeCount = Object.values(buildingStatus).filter(Boolean).length;

  const handleSaveChanges = () => {
    Alert.alert(
      "Save Specialties",
      "Your specialty preferences will be updated.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: () => {
            // In real app, would save specialties to backend
            Alert.alert("Success", "Specialties updated successfully!");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
            <Text style={styles.headerTitle}>Service Areas</Text>
            <Text style={styles.headerSubtitle}>Manage coverage zones</Text>
          </View>
        </Animated.View>

        {/* Specialties Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Your Specialties</Text>
          <Text style={styles.sectionSubtitle}>
            Select the services you can provide
          </Text>
          <View style={styles.specialtiesGrid}>
            {SPECIALTY_OPTIONS.map((specialty, index) => {
              const isSelected = selectedSpecialties.has(specialty.id);
              return (
                <TouchableOpacity
                  key={specialty.id}
                  style={[
                    styles.specialtyCard,
                    isSelected && styles.specialtyCardSelected,
                  ]}
                  onPress={() => toggleSpecialty(specialty.id)}
                >
                  <Ionicons
                    name={specialty.icon}
                    size={28}
                    color={isSelected ? "#3B82F6" : "#64748B"}
                  />
                  <Text
                    style={[
                      styles.specialtyLabel,
                      isSelected && styles.specialtyLabelSelected,
                    ]}
                  >
                    {specialty.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#3B82F6"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Buildings Section */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Buildings</Text>
          <Text style={styles.sectionSubtitle}>
            Enable service for specific buildings
          </Text>

          {/* Summary Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{assignedBuildings.length}</Text>
              <Text style={styles.statLabel}>Assigned Buildings</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeCount}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {assignedBuildings.length - activeCount}
              </Text>
              <Text style={styles.statLabel}>Paused</Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search buildings..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Buildings List */}
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.emptyStateText}>Loading buildings...</Text>
            </View>
          ) : filteredBuildings.length > 0 ? (
            <View style={styles.buildingsList}>
              {filteredBuildings.map((building, index) => {
                const isActive = buildingStatus[String(building.id)] ?? true;
                return (
                  <Animated.View
                    key={building.id}
                    entering={FadeInDown.duration(400).delay(300 + index * 50)}
                    style={[
                      styles.buildingCard,
                      !isActive && styles.buildingCardInactive,
                    ]}
                  >
                    <View style={styles.buildingIcon}>
                      <Ionicons
                        name="business"
                        size={24}
                        color={isActive ? "#3B82F6" : "#94A3B8"}
                      />
                    </View>
                    <View style={styles.buildingInfo}>
                      <View style={styles.buildingTitleRow}>
                        <Text style={[
                          styles.buildingName,
                          !isActive && styles.buildingNameInactive,
                        ]}>
                          {building.name}
                        </Text>
                        {!isActive && (
                          <View style={styles.pausedBadge}>
                            <Ionicons name="pause-circle" size={14} color="#F59E0B" />
                            <Text style={styles.pausedBadgeText}>Paused</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.buildingLocation}>
                        {building.address ? `${building.address}, ${building.city}` : "No location"}
                      </Text>
                      <View style={styles.buildingMeta}>
                        <View style={styles.buildingMetaItem}>
                          <Ionicons name="home-outline" size={14} color="#64748B" />
                          <Text style={styles.buildingMetaText}>
                            {building.unintsCount || 0} units
                          </Text>
                        </View>
                        {building.city && (
                          <View style={styles.buildingMetaItem}>
                            <Ionicons name="location-outline" size={14} color="#3B82F6" />
                            <Text style={styles.buildingMetaText}>
                              {building.city}
                            </Text>
                          </View>
                        )}
                      </View>
                      {!isActive && (
                        <View style={styles.infoBox}>
                          <Ionicons name="information-circle" size={16} color="#F59E0B" />
                          <Text style={styles.infoBoxText}>
                            Requests from this building are paused
                          </Text>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="business-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? "No buildings found matching your search"
                  : "No buildings assigned yet"}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Save Button */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(500)}
          style={styles.saveButtonContainer}
        >
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveChanges}
          >
            <Ionicons name="save" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 16,
  },
  specialtiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  specialtyCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    position: "relative",
  },
  specialtyCardSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  specialtyLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
  },
  specialtyLabelSelected: {
    color: "#3B82F6",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
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
  buildingsList: {
    gap: 12,
  },
  buildingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  buildingCardInactive: {
    backgroundColor: "#F8FAFC",
    opacity: 0.7,
  },
  buildingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  buildingInfo: {
    flex: 1,
  },
  buildingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  buildingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  buildingName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  buildingNameInactive: {
    color: "#94A3B8",
  },
  pausedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pausedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F59E0B",
  },
  buildingLocation: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
    marginBottom: 6,
  },
  buildingMeta: {
    flexDirection: "row",
    gap: 12,
  },
  buildingMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  buildingMetaText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  specialtiesBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  specialtyBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  specialtyBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  infoBoxText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F59E0B",
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 280,
    marginTop: 12,
  },
  saveButtonContainer: {
    paddingTop: 8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
