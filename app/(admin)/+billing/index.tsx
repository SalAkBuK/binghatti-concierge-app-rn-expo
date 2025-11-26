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
import { BillingApiService } from "../../../lib/services/api/billing";
import type { MeterReading, BillSummary } from "../../../lib/types";

import { BillDetailModal } from "./_components/BillDetailModal";
import { MeterReadingDetailModal } from "./_components/MeterReadingDetailModal";
import {
  ADMIN_NOTIFICATION_ROUTE,
  BILL_STATUS_OPTIONS,
  METER_READING_STATUS_OPTIONS,
} from "./_constants";
import { useBillingData } from "./_hooks/useBillingData";
import { styles } from "./_styles";
import type { TabType } from "./_types";

const billingService = new BillingApiService();

export default function BillingScreen() {
  const { allBuildings, hasUnreadNotifications } = useBillingData();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>("meter-readings");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Meter Readings state
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([]);
  const [selectedReading, setSelectedReading] = useState<MeterReading | null>(null);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Bills state
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillSummary | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billStatusFilter, setBillStatusFilter] = useState<string>("all");

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("all");

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedTab === "meter-readings") {
        const response = await billingService.getMeterReadings(
          selectedBuildingId !== "all" ? selectedBuildingId : undefined,
          statusFilter !== "all" ? statusFilter : undefined
        );
        if (response.success && response.data) {
          setMeterReadings(response.data);
        }
      } else {
        const response = await billingService.getBills(
          selectedBuildingId !== "all" ? selectedBuildingId : undefined,
          billStatusFilter !== "all" ? billStatusFilter : undefined
        );
        if (response.success && response.data) {
          setBills(response.data);
        }
      }
    } catch (error) {
      console.error("Failed to load billing data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedTab, selectedBuildingId, statusFilter, billStatusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCSV = useCallback(async () => {
    try {
      const response = await billingService.exportBillsToCSV(
        selectedBuildingId !== "all" ? selectedBuildingId : undefined
      );

      if (response.success) {
        Alert.alert("Success", "Bills exported to CSV successfully");
      }
    } catch (error) {
      console.error("Failed to export billing CSV:", error);
      Alert.alert("Error", "Failed to export CSV");
    }
  }, [selectedBuildingId]);

  const filteredMeterReadings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return meterReadings.filter((reading) => {
      if (!query) return true;
      const haystack = `${reading.unitNumber} ${reading.tenantName} ${reading.meterType}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [meterReadings, searchQuery]);

  const filteredBills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bills.filter((bill) => {
      if (!query) return true;
      const haystack = `${bill.unitNumber} ${bill.tenantName} ${bill.billingPeriod}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [bills, searchQuery]);

  const renderMeterReadingItem = useCallback(({ item }: { item: MeterReading }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => {
          setSelectedReading(item);
          setShowReadingModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>
              Unit {item.unitNumber} - {item.buildingName}
            </Text>
            <Text style={styles.cardSubtitle}>{item.tenantName}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === "verified" && styles.verifiedBadge,
              item.status === "rejected" && styles.rejectedBadge,
              item.status === "pending" && styles.pendingBadge,
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Meter Type:</Text>
          <Text style={styles.cardValue}>
            {item.meterType.toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Reading:</Text>
          <Text style={styles.cardValue}>
            {item.currentReading} {item.unit}
          </Text>
        </View>
        {item.consumption && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Consumption:</Text>
            <Text style={styles.cardValue}>
              {item.consumption} {item.unit}
            </Text>
          </View>
        )}
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Reading Date:</Text>
          <Text style={styles.cardValue}>
            {new Date(item.readingDate).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  ), []);

  const renderBillItem = useCallback(({ item }: { item: BillSummary }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => {
          setSelectedBill(item);
          setShowBillModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>
              Unit {item.unitNumber} - {item.buildingName}
            </Text>
            <Text style={styles.cardSubtitle}>{item.tenantName}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === "paid" && styles.verifiedBadge,
              item.status === "overdue" && styles.rejectedBadge,
              item.status === "pending" && styles.pendingBadge,
              item.status === "partial" && styles.partialBadge,
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Period:</Text>
          <Text style={styles.cardValue}>{item.billingPeriod}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Total Amount:</Text>
          <Text style={[styles.cardValue, styles.amountText]}>
            AED {item.totalAmount.toFixed(2)}
          </Text>
        </View>
        {item.balanceAmount !== undefined && item.balanceAmount > 0 && (
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Balance:</Text>
            <Text style={[styles.cardValue, styles.balanceText]}>
              AED {item.balanceAmount.toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Due Date:</Text>
          <Text style={styles.cardValue}>
            {new Date(item.dueDate).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  ), []);

  const ListHeader = useCallback(() => (
    <View>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "meter-readings" && styles.activeTab]}
          onPress={() => setSelectedTab("meter-readings")}
        >
          <Ionicons
            name="speedometer-outline"
            size={20}
            color={selectedTab === "meter-readings" ? "#00796B" : "#666"}
          />
          <Text style={[styles.tabText, selectedTab === "meter-readings" && styles.activeTabText]}>
            Meter Readings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "bills" && styles.activeTab]}
          onPress={() => setSelectedTab("bills")}
        >
          <Ionicons
            name="receipt-outline"
            size={20}
            color={selectedTab === "bills" ? "#00796B" : "#666"}
          />
          <Text style={[styles.tabText, selectedTab === "bills" && styles.activeTabText]}>
            Bills
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {/* Building Filter */}
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>Building:</Text>
          <View style={styles.pickerContainer}>
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
        </View>

        {/* Status Filter */}
        {selectedTab === "meter-readings" && (
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {METER_READING_STATUS_OPTIONS.map((status) => (
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
          </View>
        )}

        {selectedTab === "bills" && (
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Status:</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {BILL_STATUS_OPTIONS.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      billStatusFilter === status && styles.activeFilterChip,
                    ]}
                    onPress={() => setBillStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        billStatusFilter === status && styles.activeFilterChipText,
                      ]}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* Export Button (Bills only) */}
        {selectedTab === "bills" && (
          <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
            <Ionicons name="download-outline" size={20} color="#fff" />
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [selectedTab, selectedBuildingId, allBuildings, statusFilter, billStatusFilter, searchQuery, handleExportCSV]);

  const ListEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons
        name={selectedTab === "meter-readings" ? "speedometer-outline" : "receipt-outline"}
        size={64}
        color="#ccc"
      />
      <Text style={styles.emptyStateText}>
        {selectedTab === "meter-readings" ? "No meter readings found" : "No bills found"}
      </Text>
    </View>
  ), [selectedTab]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
        <HeaderBar
          title="Billing & Meter Readings"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        <SideMenu
          isVisible={showSideMenu}
          onClose={() => setShowSideMenu(false)}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00796B" />
          </View>
        ) : selectedTab === "meter-readings" ? (
          <FlatList
            data={filteredMeterReadings}
            keyExtractor={(item) => item.id}
            renderItem={renderMeterReadingItem}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        ) : (
          <FlatList
            data={filteredBills}
            keyExtractor={(item) => item.id}
            renderItem={renderBillItem}
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

      {/* Modals */}
      <MeterReadingDetailModal
        reading={selectedReading}
        visible={showReadingModal}
        isCompact={isCompact}
        onClose={() => setShowReadingModal(false)}
      />

      <BillDetailModal
        bill={selectedBill}
        visible={showBillModal}
        isCompact={isCompact}
        onClose={() => setShowBillModal(false)}
      />
    </SafeAreaView>
  );
}
