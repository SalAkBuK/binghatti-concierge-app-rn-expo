import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import { useAuth } from "../../../lib/context/auth-context";
import { useAppDomain } from "../../../lib/context/connected-app-provider";
import { useNotifications } from "../../../lib/context/notifications-context";
import type { User } from "../../../lib/types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function ManagersScreen() {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const { admin, property } = useAppDomain();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedManager, setSelectedManager] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const managedBuildings = useMemo(
    () => property.getManagedBuildings?.() ?? [],
    [property]
  );

  const managedBuildingIds = useMemo(
    () => managedBuildings.map((b) => b.id),
    [managedBuildings]
  );

  // Get all managers that manage any of the same buildings
  const managers = useMemo(() => {
    const allUsers = admin.getUsers();
    return allUsers.filter((user) => {
      if (user.role !== "management") return false;
      if (user.id === currentUser?.id) return false; // Exclude self

      const userBuildingIds = user.profile?.managedBuildingIds || [];
      // Check if this manager has any overlapping buildings
      return userBuildingIds.some((id) => managedBuildingIds.includes(id));
    });
  }, [admin, currentUser?.id, managedBuildingIds]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  const getBuildingName = (buildingId: string) => {
    const building = managedBuildings.find((b) => b.id === buildingId);
    return building?.name || buildingId;
  };

  const renderManagerCard = ({ item }: { item: User }) => {
    const managerBuildings = item.profile?.managedBuildingIds || [];

    return (
      <TouchableOpacity
        style={styles.managerCard}
        onPress={() => {
          setSelectedManager(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.managerName}>{item.name}</Text>
            <Text style={styles.managerEmail}>{item.email}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {item.status === "active" ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        <View style={styles.buildingsSection}>
          <Text style={styles.buildingsLabel}>
            Managing {managerBuildings.length} building(s)
          </Text>
          <View style={styles.buildingTags}>
            {managerBuildings.slice(0, 3).map((buildingId) => (
              <View key={buildingId} style={styles.buildingTag}>
                <Text style={styles.buildingTagText}>
                  {getBuildingName(buildingId)}
                </Text>
              </View>
            ))}
            {managerBuildings.length > 3 && (
              <View style={styles.moreTag}>
                <Text style={styles.moreTagText}>
                  +{managerBuildings.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Building Managers"
          subtitle="Manage managers for your buildings"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        {/* Stats */}
        <Animated.View
          entering={FadeInDown.delay(40).duration(260)}
          style={styles.statsRow}
        >
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#7034FF" />
            <Text style={styles.statValue}>{managers.length}</Text>
            <Text style={styles.statLabel}>Total Managers</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="business" size={24} color="#2563EB" />
            <Text style={styles.statValue}>{managedBuildings.length}</Text>
            <Text style={styles.statLabel}>Your Buildings</Text>
          </View>
        </Animated.View>

        {/* Managers List */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(300)}
          style={styles.listContainer}
        >
          {managers.length > 0 ? (
            managers.map((manager) => (
              <View key={manager.id}>
                {renderManagerCard({ item: manager })}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Other Managers</Text>
              <Text style={styles.emptySubtitle}>
                Managers are created in the web portal.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      {/* Manager Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Manager Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedManager && (
              <ScrollView style={styles.detailContent}>
                <View style={styles.detailAvatarSection}>
                  <View style={styles.detailAvatar}>
                    <Text style={styles.detailAvatarText}>
                      {selectedManager.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </Text>
                  </View>
                  <Text style={styles.detailName}>{selectedManager.name}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>Manager</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Contact</Text>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={18} color="#6B7280" />
                    <Text style={styles.detailValue}>{selectedManager.email}</Text>
                  </View>
                  {selectedManager.phone && (
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={18} color="#6B7280" />
                      <Text style={styles.detailValue}>{selectedManager.phone}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Managed Buildings
                  </Text>
                  {(selectedManager.profile?.managedBuildingIds || []).map(
                    (buildingId) => (
                      <View key={buildingId} style={styles.detailBuildingItem}>
                        <Ionicons name="business" size={18} color="#7034FF" />
                        <Text style={styles.detailBuildingText}>
                          {getBuildingName(buildingId)}
                        </Text>
                      </View>
                    )
                  )}
                </View>

                <View style={styles.noteBox}>
                  <Ionicons name="lock-closed" size={18} color="#6B7280" />
                  <Text style={styles.noteText}>
                    Only administrators can modify or delete manager accounts.
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.detailFooter}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
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
  createButtonContainer: {
    marginTop: 16,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7034FF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#7034FF",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  listContainer: {
    marginTop: 20,
    paddingBottom: 40,
    gap: 12,
  },
  managerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7034FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  managerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  managerEmail: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#065F46",
  },
  buildingsSection: {
    gap: 8,
  },
  buildingsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  buildingTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  buildingTag: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  buildingTagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#7034FF",
  },
  moreTag: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  moreTagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
  },
  buildingSelection: {
    gap: 10,
  },
  buildingOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  buildingOptionSelected: {
    borderColor: "#7034FF",
    backgroundColor: "#F9F5FF",
  },
  buildingOptionText: {
    fontSize: 15,
    color: "#374151",
  },
  buildingOptionTextSelected: {
    color: "#7034FF",
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#7034FF",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  detailContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  detailContent: {
    padding: 20,
  },
  detailAvatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  detailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#7034FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  detailAvatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4338CA",
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 14,
    color: "#1F2937",
  },
  detailBuildingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9F5FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  detailBuildingText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#7034FF",
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
  },
  detailFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  closeButton: {
    backgroundColor: "#7034FF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
