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
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import { VisitorsApiService } from "../../../lib/services/api/visitors";
import type { Visitor } from "../../../lib/types";

import { VisitorDetailModal } from "./_components/VisitorDetailModal";
import { ADMIN_NOTIFICATION_ROUTE, getStatusColor, getStatusIcon } from "./_constants";
import { useVisitorsData } from "./_hooks/useVisitorsData";
import { styles } from "./_styles";

const visitorsService = new VisitorsApiService();

export default function VisitorsScreen() {
  const { currentUser, allBuildings, hasUnreadNotifications } = useVisitorsData();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // State
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;

  // Load data
  const loadVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const response = await visitorsService.getAllVisitors(
        selectedBuildingId !== "all" ? selectedBuildingId : undefined,
        statusFilter !== "all" ? statusFilter : undefined
      );
      if (response.success && response.data) {
        setVisitors(response.data);
      }
    } catch (error) {
      console.error("Failed to load visitors:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedBuildingId, statusFilter]);

  useEffect(() => {
    loadVisitors();
  }, [loadVisitors]);

  const handleCheckIn = async (visitorId: string) => {
    try {
      const response = await visitorsService.checkInVisitor(visitorId, currentUser?.id || "admin");
      if (response.success) {
        Alert.alert("Success", "Visitor checked in successfully");
        setShowDetailModal(false);
        loadVisitors();
      }
    } catch (error) {
      console.error("Failed to check in visitor:", error);
      Alert.alert("Error", "Failed to check in visitor");
    }
  };

  const handleCheckOut = async (visitorId: string) => {
    try {
      const response = await visitorsService.checkOutVisitor(
        visitorId,
        currentUser?.id || "admin"
      );
      if (response.success) {
        Alert.alert("Success", "Visitor checked out successfully");
        setShowDetailModal(false);
        loadVisitors();
      }
    } catch (error) {
      console.error("Failed to check out visitor:", error);
      Alert.alert("Error", "Failed to check out visitor");
    }
  };

  const handleCancelVisitor = async (visitorId: string) => {
    Alert.alert("Cancel Visitor", "Are you sure you want to cancel this visitor registration?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await visitorsService.cancelVisitor(visitorId, "Cancelled by admin");
            if (response.success) {
              Alert.alert("Success", "Visitor registration cancelled");
              setShowDetailModal(false);
              loadVisitors();
            }
          } catch (error) {
            console.error("Failed to cancel visitor:", error);
            Alert.alert("Error", "Failed to cancel visitor");
          }
        },
      },
    ]);
  };

  const handleExportCSV = useCallback(async () => {
    try {
      const response = await visitorsService.exportVisitorsToCSV(
        selectedBuildingId !== "all" ? selectedBuildingId : undefined
      );

      if (response.success) {
        Alert.alert("Success", "Visitors exported to CSV successfully");
      }
    } catch (error) {
      console.error("Failed to export visitor CSV:", error);
      Alert.alert("Error", "Failed to export CSV");
    }
  }, [selectedBuildingId]);

  const filteredVisitors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return visitors.filter((visitor) => {
      if (!query) return true;
      const haystack = `${visitor.visitorName} ${visitor.unitNumber} ${visitor.visitorPhone}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [visitors, searchQuery]);

  const stats = useMemo(() => {
    const expected = visitors.filter((v) => v.status === "expected").length;
    const arrived = visitors.filter((v) => v.status === "arrived").length;
    const departed = visitors.filter((v) => v.status === "departed").length;
    return { expected, arrived, departed };
  }, [visitors]);

  const renderItem = useCallback(({ item }: { item: Visitor }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => {
          setSelectedVisitor(item);
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
              <Text style={styles.cardTitle}>{item.visitorName}</Text>
              <Text style={styles.cardSubtitle}>
                Unit {item.unitNumber} • {item.visitPurpose}
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
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.visitorPhone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {new Date(item.expectedArrivalTime).toLocaleString()}
            </Text>
          </View>
          {item.actualArrivalTime && (
            <View style={styles.detailRow}>
              <Ionicons name="log-in-outline" size={16} color="#4CAF50" />
              <Text style={[styles.detailText, { color: "#4CAF50" }]}>
                Checked in: {new Date(item.actualArrivalTime).toLocaleString()}
              </Text>
            </View>
          )}
          {item.actualDepartureTime && (
            <View style={styles.detailRow}>
              <Ionicons name="log-out-outline" size={16} color="#9E9E9E" />
              <Text style={[styles.detailText, { color: "#9E9E9E" }]}>
                Departed: {new Date(item.actualDepartureTime).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.qrContainer}>
            <Ionicons name="qr-code-outline" size={16} color="#00796B" />
            <Text style={styles.qrCodeText}>{item.visitorCode}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  ), []);

  const ListHeader = useCallback(() => (
    <View>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={24} color="#FF9800" />
          <Text style={styles.statValue}>{stats.expected}</Text>
          <Text style={styles.statLabel}>Expected</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{stats.arrived}</Text>
          <Text style={styles.statLabel}>Arrived</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="exit-outline" size={24} color="#9E9E9E" />
          <Text style={styles.statValue}>{stats.departed}</Text>
          <Text style={styles.statLabel}>Departed</Text>
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
            {["all", "expected", "arrived", "departed", "cancelled"].map((status) => (
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
                  {status.charAt(0).toUpperCase() + status.slice(1)}
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
            placeholder="Search visitors..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* Export Button */}
        <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [stats, allBuildings, selectedBuildingId, statusFilter, searchQuery, handleExportCSV]);

  const ListEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>No visitors found</Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
        <HeaderBar
          title="Visitors (Portfolio)"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00796B" />
          </View>
        ) : (
          <FlatList
            data={filteredVisitors}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}
      </View>

      <VisitorDetailModal
        visitor={selectedVisitor}
        visible={showDetailModal}
        isCompact={isCompact}
        onClose={() => setShowDetailModal(false)}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onCancel={handleCancelVisitor}
      />
    </SafeAreaView>
  );
}
