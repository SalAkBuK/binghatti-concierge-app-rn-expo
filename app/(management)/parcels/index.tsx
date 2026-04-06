import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import { ParcelsApiService } from "../../../lib/services/api/parcels";
import type { Parcel } from "../../../lib/types";

import { ParcelDetailModal } from "../../../components/management/parcels/ParcelDetailModal";
import { MANAGEMENT_NOTIFICATION_ROUTE } from "../../../components/management/parcels/_constants";
import { styles } from "../../../components/management/parcels/_styles";
import { useParcelsData } from "../../../lib/hooks/management/parcels/useParcelsData";

const parcelsService = new ParcelsApiService();

export default function ParcelsScreen() {
  const { allBuildings, hasUnreadNotifications } = useParcelsData();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // State
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;

  // Load data
  const loadParcels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await parcelsService.getAllParcels({
        buildingId: selectedBuildingId !== "all" ? selectedBuildingId : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (response.success && response.data) {
        setParcels(response.data);
      }
    } catch (error) {
      console.error("Failed to load parcels:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedBuildingId, statusFilter]);

  useEffect(() => {
    loadParcels();
  }, [loadParcels]);

  const handleUpdateStatus = async (parcelId: string, newStatus: Parcel["status"]) => {
    try {
      const response = await parcelsService.updateParcel(parcelId, { status: newStatus });
      if (response.success) {
        Alert.alert("Success", `Parcel marked as ${newStatus}`);
        setShowDetailModal(false);
        loadParcels();
      }
    } catch (error) {
      console.error("Failed to update parcel status:", error);
      Alert.alert("Error", "Failed to update parcel status");
    }
  };

  const handleNotifyTenants = async () => {
    try {
      const response = await parcelsService.notifyTenantsAboutParcels(
        selectedBuildingId !== "all" ? selectedBuildingId : undefined
      );
      if (response.success) {
        Alert.alert(
          "Success",
          `Notifications sent to ${response.data?.notificationsSent || 0} tenants about pending parcels`
        );
      }
    } catch (error) {
      console.error("Failed to send notifications:", error);
      Alert.alert("Error", "Failed to send notifications");
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await parcelsService.exportParcelsToCSV({
        buildingId: selectedBuildingId !== "all" ? selectedBuildingId : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      if (response.success) {
        Alert.alert("Success", "Parcels exported to CSV successfully");
      }
    } catch (error) {
      console.error("Failed to export CSV:", error);
      Alert.alert("Error", "Failed to export CSV");
    }
  };

  const filteredParcels = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return parcels.filter((parcel) => {
      if (!query) return true;
      const haystack =
        `${parcel.unitNumber} ${parcel.tenantName} ${parcel.courier}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [parcels, searchQuery]);

  const stats = useMemo(() => {
    const pending = parcels.filter((p) => p.status === "pending").length;
    const pickedUp = parcels.filter((p) => p.status === "picked_up").length;
    const delivered = parcels.filter((p) => p.status === "delivered").length;
    const lost = parcels.filter((p) => p.status === "lost").length;
    return { pending, pickedUp, delivered, lost };
  }, [parcels]);

  const getStatusColor = (status: Parcel["status"]) => {
    const colorMap = {
      pending: "#FF9800",
      picked_up: "#4CAF50",
      delivered: "#2196F3",
      lost: "#F44336",
    };
    return colorMap[status] || "#9E9E9E";
  };

  const getStatusIcon = (status: Parcel["status"]) => {
    const iconMap = {
      pending: "cube-outline",
      picked_up: "checkmark-circle-outline",
      delivered: "rocket-outline",
      lost: "alert-circle-outline",
    };
    return iconMap[status] || "help-circle-outline";
  };

  const getCourierIcon = (courier?: string) => {
    if (!courier) return "cube-outline";
    const courierLower = courier.toLowerCase();
    if (courierLower.includes("fedex")) return "airplane-outline";
    if (courierLower.includes("dhl")) return "airplane-outline";
    if (courierLower.includes("ups")) return "car-outline";
    if (courierLower.includes("aramex")) return "car-outline";
    return "cube-outline";
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={[styles.scrollView, { paddingHorizontal: pagePadding }]}>
        <HeaderBar
          title="Parcels (Portfolio)"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        <View style={styles.content}>
          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="cube-outline" size={24} color="#FF9800" />
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{stats.pickedUp}</Text>
              <Text style={styles.statLabel}>Picked Up</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="rocket-outline" size={24} color="#2196F3" />
              <Text style={styles.statValue}>{stats.delivered}</Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="alert-circle-outline" size={24} color="#F44336" />
              <Text style={styles.statValue}>{stats.lost}</Text>
              <Text style={styles.statLabel}>Lost</Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filters}>
            {/* Building Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Building:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedBuildingId === "all" && styles.activeFilterChip,
                  ]}
                  onPress={() => setSelectedBuildingId("all")}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedBuildingId === "all" && styles.activeFilterChipText,
                    ]}
                  >
                    All Buildings
                  </Text>
                </TouchableOpacity>
                {allBuildings.map((building) => (
                  <TouchableOpacity
                    key={building.id}
                    style={[
                      styles.filterChip,
                      selectedBuildingId === building.id && styles.activeFilterChip,
                    ]}
                    onPress={() => setSelectedBuildingId(building.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedBuildingId === building.id && styles.activeFilterChipText,
                      ]}
                    >
                      {building.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Status Filter */}
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {["all", "pending", "picked_up", "delivered", "lost"].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      statusFilter === status && styles.activeFilterChip,
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === status && styles.activeFilterChipText,
                      ]}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search parcels..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.notifyButton} onPress={handleNotifyTenants}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Notify Tenants</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
                <Ionicons name="download-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00796B" />
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredParcels.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="cube-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyStateText}>No parcels found</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredParcels}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 50)} style={styles.card}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedParcel(item);
                          setShowDetailModal(true);
                        }}
                      >
                        <View style={styles.cardHeader}>
                          <View style={styles.cardHeaderLeft}>
                            <View
                              style={[
                                styles.statusIcon,
                                { backgroundColor: getStatusColor(item.status) + "20" },
                              ]}
                            >
                              <Ionicons
                                name={getStatusIcon(item.status) as any}
                                size={24}
                                color={getStatusColor(item.status)}
                              />
                            </View>
                            <View style={styles.cardHeaderText}>
                              <Text style={styles.cardTitle}>
                                Unit {item.unitNumber} • {item.tenantName}
                              </Text>
                              <Text style={styles.cardSubtitle}>
                                {item.courier || "Unknown Courier"}
                              </Text>
                            </View>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: getStatusColor(item.status) },
                            ]}
                          >
                            <Text style={styles.statusBadgeText}>
                              {item.status.replace("_", " ").toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardDetails}>
                          <View style={styles.detailRow}>
                            <Ionicons name={getCourierIcon(item.courier)} size={16} color="#666" />
                            <Text style={styles.detailText}>
                              Received by: {item.receivedBy}
                            </Text>
                          </View>
                          <View style={styles.detailRow}>
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                            <Text style={styles.detailText}>
                              Delivered: {new Date(item.deliveryDate).toLocaleDateString()}
                            </Text>
                          </View>
                          {item.pickupDate && (
                            <View style={styles.detailRow}>
                              <Ionicons name="checkmark-outline" size={16} color="#4CAF50" />
                              <Text style={[styles.detailText, { color: "#4CAF50" }]}>
                                Picked up: {new Date(item.pickupDate).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                          {item.pickupCode && (
                            <View style={styles.detailRow}>
                              <Ionicons name="key-outline" size={16} color="#00796B" />
                              <Text style={[styles.detailText, { color: "#00796B" }]}>
                                Code: {item.pickupCode}
                              </Text>
                            </View>
                          )}
                        </View>

                        {item.notes && (
                          <View style={styles.notesContainer}>
                            <Ionicons name="document-text-outline" size={14} color="#666" />
                            <Text style={styles.notesText} numberOfLines={2}>
                              {item.notes}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  )}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>


      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

      <ParcelDetailModal
        parcel={selectedParcel}
        visible={showDetailModal}
        isCompact={isCompact}
        onClose={() => setShowDetailModal(false)}
        onUpdateStatus={handleUpdateStatus}
      />
    </SafeAreaView>
  );
}
