import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntityTable } from "../../components/admin/EntityTable";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { User, UserRole } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function UsersScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const isManagement = currentUser?.role === "management";
  const hasScopedBuildings =
    currentUser?.role === "management" || currentUser?.role === "super_admin";
  const managedBuildingIds = hasScopedBuildings
    ? actions.getManagedBuildingIds?.() ?? []
    : [];
  const canManageUsers = ["admin", "super_admin"].includes(
    currentUser?.role ?? "",
  );
  const defaultBuildingId =
    managedBuildingIds.length > 0
      ? managedBuildingIds[0]
      : currentUser?.profile?.buildingId || "building-1";

  // Create user form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "tenant" as UserRole,
    apartment: "",
    tower: "",
    buildingId: defaultBuildingId,
  });

  const allUsers = actions.getUsers();

  const scopedUsers = useMemo(() => {
    if (!isManagement) return allUsers;
    if (!managedBuildingIds.length) {
      return allUsers.filter((user) => user.id === currentUser?.id);
    }
    return allUsers.filter((user) => {
      if (
        user.role === "tenant" ||
        user.role === "employee" ||
        user.role === "service_provider"
      ) {
        const buildingId = user.profile?.buildingId;
        return buildingId ? managedBuildingIds.includes(buildingId) : false;
      }
      if (user.role === "management") {
        return user.id === currentUser?.id;
      }
      return false;
    });
  }, [allUsers, currentUser?.id, isManagement, managedBuildingIds]);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return scopedUsers;
    const query = searchQuery.toLowerCase();
    return scopedUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query),
    );
  }, [scopedUsers, searchQuery]);

  // Calculate unread notifications
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    const colors = {
      admin: { bg: "#FEE2E2", text: "#DC2626" },
      super_admin: { bg: "#FECACA", text: "#B91C1C" },
      management: { bg: "#E0E7FF", text: "#4338CA" },
      service_provider: { bg: "#DBEAFE", text: "#1E40AF" },
      tenant: { bg: "#D1FAE5", text: "#065F46" },
      employee: { bg: "#FEF3C7", text: "#92400E" },
    };
    return colors[role] || colors.tenant;
  };

  const handleCreateUser = async () => {
    // Validate form
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert("Validation Error", "Name and email are required");
      return;
    }

    setIsCreating(true);
    try {
      await actions.createUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        profile: {
          apartment: formData.apartment,
          tower: formData.tower,
          buildingId: formData.buildingId,
        },
      });

      Alert.alert("Success", "User created successfully");
      setShowCreateModal(false);
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        role: "tenant",
        apartment: "",
        tower: "",
        buildingId: defaultBuildingId,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to create user");
    } finally {
      setIsCreating(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (user: User) => <Text style={styles.cellText}>{user.name}</Text>,
      width: isCompact ? undefined : Math.min(280, width * 0.3),
    },
    {
      key: "email",
      label: "Email",
      render: (user: User) => (
        <Text style={styles.cellTextSmall} numberOfLines={1}>
          {user.email}
        </Text>
      ),
      width: isCompact ? undefined : Math.min(320, width * 0.35),
    },
    {
      key: "role",
      label: "Role",
      render: (user: User) => {
        const roleColors = getRoleBadgeColor(user.role);
        return (
          <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>
              {user.role.toUpperCase()}
            </Text>
          </View>
        );
      },
      width: isCompact ? undefined : 120,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.contentWrapper, { paddingHorizontal: pagePadding }] }>
        {/* Header */}
        <HeaderBar
          title="Users Management"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        {/* Create Button */}
        {canManageUsers && (
          <Animated.View entering={FadeInDown.delay(50).duration(400)}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="person-add" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create User</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Entity Table */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.tableContainer}
        >
          <EntityTable
            data={filteredUsers}
            columns={columns}
            onRowPress={(user) =>
              Alert.alert(
                user.name,
                `Email: ${user.email}\nRole: ${user.role}\nPhone: ${user.phone || "N/A"}`,
              )
            }
            emptyMessage="No users found"
            searchPlaceholder="Search by name, email, or role..."
            onSearch={setSearchQuery}
            keyExtractor={(user) => user.id}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </Animated.View>
      </View>

      {/* Side Menu */}
      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      {/* Create User Modal */}
      {canManageUsers && (
        <Modal
          visible={showCreateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.modalContent}
            >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New User</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Form Fields */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email address"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+971XXXXXXXXX"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Role *</Text>
                <View style={styles.roleButtons}>
                  {(["tenant", "service_provider", "employee", "management"] as UserRole[]).map(
                    (role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleButton,
                          formData.role === role && styles.roleButtonActive,
                        ]}
                        onPress={() => setFormData({ ...formData, role })}
                      >
                        <Text
                          style={[
                            styles.roleButtonText,
                            formData.role === role && styles.roleButtonTextActive,
                          ]}
                        >
                          {role.replace("_", " ").toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>

              {formData.role === "tenant" && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Apartment</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 1205"
                      value={formData.apartment}
                      onChangeText={(text) =>
                        setFormData({ ...formData, apartment: text })
                      }
                    />
                  </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Tower</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Tower A"
                  value={formData.tower}
                  onChangeText={(text) => setFormData({ ...formData, tower: text })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Building ID</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., building-1"
                  value={formData.buildingId}
                  onChangeText={(text) =>
                    setFormData({ ...formData, buildingId: text })
                  }
                />
              </View>
            </>
          )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isCreating && styles.submitButtonDisabled]}
                onPress={handleCreateUser}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Create User</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentWrapper: {
    flex: 1,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7034FF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tableContainer: {
    flex: 1,
    marginBottom: 20,
  },
  cellText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  cellTextSmall: {
    fontSize: 13,
    color: "#6B7280",
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  roleButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  roleButtonActive: {
    backgroundColor: "#7034FF",
    borderColor: "#7034FF",
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7034FF",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
