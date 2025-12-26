import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Visitor, VisitorIdType } from "../../../lib/types";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import { VisitorsApiService } from "../../../lib/services/api/visitors";

import { VisitorDetailModal } from "./_components/VisitorDetailModal";
import { MANAGEMENT_NOTIFICATION_ROUTE, getStatusColor, getStatusIcon } from "./_constants";
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

  // Register visitor modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [newVisitorForm, setNewVisitorForm] = useState({
    buildingId: "",
    unitNumber: "",
    visitorName: "",
    visitorPhone: "+971",
    visitorIdType: "passport" as VisitorIdType,
    visitorIdNumber: "",
    visitPurpose: "",
    expectedArrivalTime: new Date(),
    expectedDepartureTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
  });

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
    } catch {
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
    } catch {
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
          } catch {
            Alert.alert("Error", "Failed to cancel visitor");
          }
        },
      },
    ]);
  };

  const handleExportCSV = async () => {
    try {
      const response = await visitorsService.exportVisitorsToCSV(
        selectedBuildingId !== "all" ? selectedBuildingId : undefined
      );

      if (response.success) {
        Alert.alert("Success", "Visitors exported to CSV successfully");
      }
    } catch {
      Alert.alert("Error", "Failed to export CSV");
    }
  };

  const resetRegisterForm = () => {
    setNewVisitorForm({
      buildingId: selectedBuildingId !== "all" ? selectedBuildingId : "",
      unitNumber: "",
      visitorName: "",
      visitorPhone: "+971",
      visitorIdType: "passport",
      visitorIdNumber: "",
      visitPurpose: "",
      expectedArrivalTime: new Date(),
      expectedDepartureTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
  };

  const handlePhoneChange = (text: string) => {
    if (!text.startsWith("+971")) {
      text = "+971" + text.replace(/^\+971/, "");
    }
    const prefix = "+971";
    const numbers = text.slice(prefix.length).replace(/\D/g, "");
    setNewVisitorForm({ ...newVisitorForm, visitorPhone: prefix + numbers });
  };

  const handleRegisterVisitor = async () => {
    // Validation
    if (!newVisitorForm.buildingId) {
      Alert.alert("Error", "Please select a building");
      return;
    }
    if (!newVisitorForm.unitNumber.trim()) {
      Alert.alert("Error", "Please enter unit number");
      return;
    }
    if (!newVisitorForm.visitorName.trim()) {
      Alert.alert("Error", "Please enter visitor name");
      return;
    }
    const phoneWithoutPrefix = newVisitorForm.visitorPhone.replace("+971", "").trim();
    if (!phoneWithoutPrefix || phoneWithoutPrefix.length !== 9) {
      Alert.alert("Error", "Please enter a valid 9-digit phone number after +971");
      return;
    }
    if (!newVisitorForm.visitorIdNumber.trim()) {
      Alert.alert("Error", "Please enter ID number");
      return;
    }
    if (!newVisitorForm.visitPurpose.trim()) {
      Alert.alert("Error", "Please enter visit purpose");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await visitorsService.createVisitor({
        buildingId: newVisitorForm.buildingId,
        unitNumber: newVisitorForm.unitNumber,
        visitorName: newVisitorForm.visitorName,
        visitorPhone: newVisitorForm.visitorPhone,
        visitorIdType: newVisitorForm.visitorIdType,
        visitorIdNumber: newVisitorForm.visitorIdNumber,
        visitPurpose: newVisitorForm.visitPurpose,
        expectedArrivalTime: newVisitorForm.expectedArrivalTime.toISOString(),
        expectedDepartureTime: newVisitorForm.expectedDepartureTime.toISOString(),
      });

      if (response.success) {
        Alert.alert(
          "Success",
          `Visitor registered successfully!\n\nVisitor Code: ${response.data?.visitorCode}`,
          [
            {
              text: "OK",
              onPress: () => {
                setShowRegisterModal(false);
                resetRegisterForm();
                loadVisitors();
              },
            },
          ]
        );
      }
    } catch {
      Alert.alert("Error", "Failed to register visitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (date: Date): string => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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


  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={[styles.scrollView, { paddingHorizontal: pagePadding }]}>
        <HeaderBar
          title="Visitors (Portfolio)"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        <View style={styles.content}>
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

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.registerButton}
                onPress={() => {
                  resetRegisterForm();
                  setShowRegisterModal(true);
                }}
              >
                <Ionicons name="person-add-outline" size={20} color="#fff" />
                <Text style={styles.registerButtonText}>Register Visitor</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
                <Ionicons name="download-outline" size={20} color="#fff" />
                <Text style={styles.exportButtonText}>Export CSV</Text>
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
              {filteredVisitors.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyStateText}>No visitors found</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredVisitors}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInDown.delay(index * 50)} style={styles.card}>
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
                    </Animated.View>
                  )}
                  scrollEnabled={false}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {showSideMenu && <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />}

      <VisitorDetailModal
        visitor={selectedVisitor}
        visible={showDetailModal}
        isCompact={isCompact}
        onClose={() => setShowDetailModal(false)}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
        onCancel={handleCancelVisitor}
      />

      {/* Register Visitor Modal */}
      <Modal
        visible={showRegisterModal}
        animationType="slide"
        onRequestClose={() => setShowRegisterModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowRegisterModal(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Register Visitor</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Building Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Building *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newVisitorForm.buildingId}
                    onValueChange={(value) =>
                      setNewVisitorForm({ ...newVisitorForm, buildingId: value })
                    }
                    style={styles.picker}
                    dropdownIconColor="#111827"
                    itemStyle={{ color: "#111827" }}
                  >
                    <Picker.Item label="Select a building..." value="" color="#111827" />
                    {allBuildings.map((building) => (
                      <Picker.Item
                        key={building.id}
                        label={building.name}
                        value={building.id}
                        color="#111827"
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Unit Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 101, A-205"
                  value={newVisitorForm.unitNumber}
                  onChangeText={(text) =>
                    setNewVisitorForm({ ...newVisitorForm, unitNumber: text })
                  }
                  maxLength={20}
                />
              </View>

              {/* Visitor Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Visitor Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter visitor's full name"
                  value={newVisitorForm.visitorName}
                  onChangeText={(text) =>
                    setNewVisitorForm({ ...newVisitorForm, visitorName: text })
                  }
                  maxLength={100}
                />
              </View>

              {/* Visitor Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Visitor Phone *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="+971XXXXXXXXX"
                  value={newVisitorForm.visitorPhone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={13}
                />
              </View>

              {/* ID Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ID Type *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={newVisitorForm.visitorIdType}
                    onValueChange={(value) =>
                      setNewVisitorForm({ ...newVisitorForm, visitorIdType: value })
                    }
                    style={styles.picker}
                    dropdownIconColor="#111827"
                    itemStyle={{ color: "#111827" }}
                  >
                    <Picker.Item label="Passport" value="passport" color="#111827" />
                    <Picker.Item label="National ID" value="national_id" color="#111827" />
                    <Picker.Item label="Driving License" value="driving_license" color="#111827" />
                    <Picker.Item label="Other" value="other" color="#111827" />
                  </Picker>
                </View>
              </View>

              {/* ID Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ID Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter ID number"
                  value={newVisitorForm.visitorIdNumber}
                  onChangeText={(text) =>
                    setNewVisitorForm({ ...newVisitorForm, visitorIdNumber: text })
                  }
                  maxLength={50}
                />
              </View>

              {/* Visit Purpose */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Visit Purpose *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Describe the purpose of the visit"
                  value={newVisitorForm.visitPurpose}
                  onChangeText={(text) =>
                    setNewVisitorForm({ ...newVisitorForm, visitPurpose: text })
                  }
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={300}
                />
              </View>

              {/* Expected Arrival */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Expected Arrival *</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowArrivalPicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  <Text style={styles.datePickerText}>
                    {formatDateTime(newVisitorForm.expectedArrivalTime)}
                  </Text>
                </TouchableOpacity>
                {showArrivalPicker && (
                  <DateTimePicker
                    value={newVisitorForm.expectedArrivalTime}
                    mode="datetime"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                      setShowArrivalPicker(Platform.OS === "ios");
                      if (selectedDate) {
                        setNewVisitorForm({
                          ...newVisitorForm,
                          expectedArrivalTime: selectedDate,
                        });
                      }
                    }}
                    minimumDate={new Date()}
                  />
                )}
              </View>

              {/* Expected Departure */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Expected Departure</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDeparturePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                  <Text style={styles.datePickerText}>
                    {formatDateTime(newVisitorForm.expectedDepartureTime)}
                  </Text>
                </TouchableOpacity>
                {showDeparturePicker && (
                  <DateTimePicker
                    value={newVisitorForm.expectedDepartureTime}
                    mode="datetime"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={(event, selectedDate) => {
                      setShowDeparturePicker(Platform.OS === "ios");
                      if (selectedDate) {
                        setNewVisitorForm({
                          ...newVisitorForm,
                          expectedDepartureTime: selectedDate,
                        });
                      }
                    }}
                    minimumDate={newVisitorForm.expectedArrivalTime}
                  />
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButtonModal}
                onPress={() => setShowRegisterModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={handleRegisterVisitor}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Register</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
