import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Building, VisitorPass, VisitorPassStatus } from "../../lib/types";
import { getUserErrorMessage } from "../../lib/services/api/errors";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

const STATUS_FILTERS: { label: string; value: VisitorPassStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Checked In", value: "checked_in" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function ManagementVisitorsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const {
    getBuildings,
    getManagedBuildings,
    getVisitorPasses,
    getVisitorPassesByBuilding,
    approveVisitorPass,
    rejectVisitorPass,
    markVisitorPassCheckIn,
    markVisitorPassComplete,
    cancelVisitorPass,
  } = actions;

  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<VisitorPassStatus | "all">("pending");
  const [selectedPass, setSelectedPass] = useState<VisitorPass | null>(null);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 900;
  const managedBuildings = useMemo(
    () => getManagedBuildings?.() ?? getBuildings(),
    [getManagedBuildings, getBuildings],
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    managedBuildings.length === 1 ? managedBuildings[0].id : "all",
  );

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    managedBuildings.forEach((building) => map.set(building.id, building));
    return map;
  }, [managedBuildings]);

  const passesInScope = useMemo(() => {
    if (selectedBuildingId === "all") {
      return getVisitorPasses();
    }
    return getVisitorPassesByBuilding(selectedBuildingId);
  }, [getVisitorPasses, getVisitorPassesByBuilding, selectedBuildingId]);

  const filteredPasses = useMemo(() => {
    if (statusFilter === "all") {
      return passesInScope;
    }
    return passesInScope.filter((pass) => pass.status === statusFilter);
  }, [passesInScope, statusFilter]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const handleApprove = async (visitorPass: VisitorPass) => {
    try {
      await approveVisitorPass(visitorPass.id);
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Unable to approve", errorMessage);
    }
  };

  const handleReject = async (visitorPass: VisitorPass) => {
    Alert.alert(
      "Reject pass",
      `Reject ${visitorPass.name}'s access?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await rejectVisitorPass(visitorPass.id, "Rejected by management");
            } catch (error) {
              const errorMessage = getUserErrorMessage(error);
              Alert.alert("Unable to reject", errorMessage);
            }
          },
        },
      ],
    );
  };

  const handleCheckIn = async (visitorPass: VisitorPass) => {
    try {
      await markVisitorPassCheckIn(visitorPass.id);
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Unable to check-in", errorMessage);
    }
  };

  const handleComplete = async (visitorPass: VisitorPass) => {
    try {
      await markVisitorPassComplete(visitorPass.id);
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Unable to mark complete", errorMessage);
    }
  };

  const handleCancelPass = async (visitorPass: VisitorPass) => {
    try {
      await cancelVisitorPass(visitorPass.id, "Cancelled by management");
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Unable to cancel", errorMessage);
    }
  };

  const renderActionButtons = (visitorPass: VisitorPass) => {
    switch (visitorPass.status) {
      case "pending":
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionApprove]}
              onPress={() => handleApprove(visitorPass)}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionReject]}
              onPress={() => handleReject(visitorPass)}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </View>
        );
      case "approved":
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionPrimary]}
              onPress={() => handleCheckIn(visitorPass)}
            >
              <Ionicons name="enter-outline" size={16} color="#FFFFFF" />
              <Text style={styles.actionText}>Check In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionNeutral]}
              onPress={() => handleCancelPass(visitorPass)}
            >
              <Ionicons name="ban" size={16} color="#1F2937" />
              <Text style={styles.actionTextDark}>Cancel</Text>
            </TouchableOpacity>
          </View>
        );
      case "checked_in":
        return (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionPrimary]}
              onPress={() => handleComplete(visitorPass)}
            >
              <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
              <Text style={styles.actionText}>Complete</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Visitor & Delivery"
          subtitle="Approve arrivals and track activity"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        {managedBuildings.length > 1 ? (
          <Animated.View
            entering={FadeInDown.delay(40).duration(240)}
            style={styles.filterRow}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRowContent}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedBuildingId === "all" && styles.filterChipActive,
                ]}
                onPress={() => setSelectedBuildingId("all")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedBuildingId === "all" && styles.filterChipTextActive,
                  ]}
                >
                  All buildings
                </Text>
              </TouchableOpacity>
              {managedBuildings.map((building) => (
                <TouchableOpacity
                  key={building.id}
                  style={[
                    styles.filterChip,
                    selectedBuildingId === building.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedBuildingId(building.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedBuildingId === building.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {building.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInDown.delay(80).duration(260)}
          style={styles.statusChipsRow}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusChipsContent}
          >
            {STATUS_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.statusChip,
                  statusFilter === filter.value && styles.statusChipActive,
                ]}
                onPress={() => setStatusFilter(filter.value)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    statusFilter === filter.value && styles.statusChipTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(300)}
          style={styles.passList}
        >
          {filteredPasses.length ? (
            filteredPasses.map((visitorPass) => {
              const building = buildingMap.get(visitorPass.buildingId);
              const statusStyles = getStatusStyles(visitorPass.status);

              return (
                <TouchableOpacity
                  key={visitorPass.id}
                  style={styles.passCard}
                  onPress={() => setSelectedPass(visitorPass)}
                >
                  <View style={styles.passHeader}>
                    <View>
                      <Text style={styles.passTitle}>{visitorPass.name}</Text>
                      <Text style={styles.passMeta}>
                        {building?.name || "Unknown"} · {visitorPass.unitNumber || ""}
                      </Text>
                    </View>
                    <View style={[styles.passStatusPill, statusStyles.background]}>
                      <Text style={[styles.passStatusText, statusStyles.text]}>
                        {visitorPass.status.replace("_", " ")}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.passSchedule}>
                    {visitorPass.scheduledStart.slice(0, 16)} →
                    {" "}
                    {visitorPass.scheduledEnd.slice(0, 16)}
                  </Text>

                  <View style={styles.passFooter}>
                    <View style={styles.passDetailsRow}>
                      <Ionicons
                        name={
                          visitorPass.type === "delivery"
                            ? "cube-outline"
                            : visitorPass.type === "contractor"
                              ? "construct-outline"
                              : "person-outline"
                        }
                        size={16}
                        color="#475569"
                      />
                      <Text style={styles.passFooterText}>
                        {visitorPass.type.toUpperCase()}
                      </Text>
                    </View>
                    {visitorPass.company ? (
                      <View style={styles.passDetailsRow}>
                        <Ionicons name="briefcase-outline" size={16} color="#475569" />
                        <Text style={styles.passFooterText}>{visitorPass.company}</Text>
                      </View>
                    ) : null}
                  </View>

                  {renderActionButtons(visitorPass)}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color="#CBD5F5" />
              <Text style={styles.emptyTitle}>No visitor passes</Text>
              <Text style={styles.emptySubtitle}>
                Adjust filters or select another building to view passes.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      <PassDetailModal
        visitorPass={selectedPass}
        onClose={() => setSelectedPass(null)}
        onCancel={handleCancelPass}
      />
    </SafeAreaView>
  );
}

const PassDetailModal: React.FC<{
  visitorPass: VisitorPass | null;
  onClose: () => void;
  onCancel: (pass: VisitorPass) => Promise<void>;
}> = ({ visitorPass, onClose, onCancel }) => {
  if (!visitorPass) return null;

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{visitorPass.name}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Pass Details</Text>
            <Text style={styles.modalBodyText}>
              Type: {visitorPass.type.toUpperCase()}
            </Text>
            <Text style={styles.modalBodyText}>
              Scheduled: {visitorPass.scheduledStart} → {visitorPass.scheduledEnd}
            </Text>
            {visitorPass.qrCodeUrl ? (
              <Text style={styles.modalBodyText}>QR code: {visitorPass.qrCodeUrl}</Text>
            ) : null}
            {visitorPass.notes ? (
              <Text style={styles.modalBodyText}>{visitorPass.notes}</Text>
            ) : null}
          </View>

          <View style={styles.modalSection}>
            <TouchableOpacity
              style={styles.modalNeutralButton}
              onPress={() => onCancel(visitorPass)}
            >
              <Ionicons name="ban" size={16} color="#1F2937" />
              <Text style={styles.modalNeutralText}>Cancel Pass</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const getStatusStyles = (status: VisitorPassStatus) => {
  switch (status) {
    case "approved":
      return { background: styles.statusApprovedBg, text: styles.statusApprovedText };
    case "checked_in":
      return { background: styles.statusCheckedBg, text: styles.statusCheckedText };
    case "completed":
      return { background: styles.statusCompletedBg, text: styles.statusCompletedText };
    case "cancelled":
      return { background: styles.statusCancelledBg, text: styles.statusCancelledText };
    case "rejected":
      return { background: styles.statusRejectedBg, text: styles.statusRejectedText };
    default:
      return { background: styles.statusPendingBg, text: styles.statusPendingText };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  filterRow: {
    marginTop: 16,
  },
  filterRowContent: {
    gap: 12,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#1D4ED8",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  statusChipsRow: {
    marginTop: 20,
  },
  statusChipsContent: {
    gap: 10,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#E2E8F0",
  },
  statusChipActive: {
    backgroundColor: "#2563EB",
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  passList: {
    marginTop: 20,
    gap: 16,
    paddingBottom: 48,
  },
  passCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    gap: 14,
  },
  passHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  passTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  passMeta: {
    fontSize: 13,
    color: "#6B7280",
  },
  passStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  passStatusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  statusPendingBg: {
    backgroundColor: "#FFE4E6",
  },
  statusPendingText: {
    color: "#9D174D",
  },
  statusApprovedBg: {
    backgroundColor: "#DCFCE7",
  },
  statusApprovedText: {
    color: "#047857",
  },
  statusCheckedBg: {
    backgroundColor: "#DBEAFE",
  },
  statusCheckedText: {
    color: "#1D4ED8",
  },
  statusCompletedBg: {
    backgroundColor: "#ECFDF5",
  },
  statusCompletedText: {
    color: "#047857",
  },
  statusCancelledBg: {
    backgroundColor: "#FEE2E2",
  },
  statusCancelledText: {
    color: "#B91C1C",
  },
  statusRejectedBg: {
    backgroundColor: "#FDE68A",
  },
  statusRejectedText: {
    color: "#B45309",
  },
  passSchedule: {
    fontSize: 13,
    color: "#475569",
  },
  passFooter: {
    flexDirection: "row",
    gap: 16,
  },
  passDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  passFooterText: {
    fontSize: 12,
    color: "#475569",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionPrimary: {
    backgroundColor: "#2563EB",
  },
  actionApprove: {
    backgroundColor: "#16A34A",
  },
  actionReject: {
    backgroundColor: "#DC2626",
  },
  actionNeutral: {
    backgroundColor: "#F1F5F9",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  actionTextDark: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  modalContent: {
    padding: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  modalBodyText: {
    fontSize: 13,
    color: "#4B5563",
  },
  modalNeutralButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  modalNeutralText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
});
