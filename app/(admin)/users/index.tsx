import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntityTable } from "../../../components/admin/EntityTable";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import type { User, UserRole } from "../../../lib/types";

import { CreateUserModal } from "./_components/CreateUserModal";
import { UserInfoModal } from "./_components/UserInfoModal";
import { ADMIN_NOTIFICATION_ROUTE } from "./_constants";
import { useUsersData } from "./_hooks/useUsersData";
import { styles } from "./_styles";
import type { UserFormState } from "./_types";

const createInitialFormState = (buildingId: string): UserFormState => ({
  name: "",
  email: "",
  phone: "",
  role: "tenant",
  buildingId,
  tower: "",
  floor: "",
  apartment: "",
  emergencyContact: "",
  emergencyPhone: "",
});

export default function UsersScreen() {
  const {
    actions,
    scopedUsers,
    managedBuildings,
    canManageUsers,
    hasUnreadNotifications,
    defaultBuildingId,
  } = useUsersData();
  const { width } = useWindowDimensions();
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [formData, setFormData] = useState<UserFormState>(() =>
    createInitialFormState(defaultBuildingId),
  );

  // Helper to get building name
  const getBuildingName = (buildingId: string): string => {
    const building = managedBuildings.find((b) => b.id === buildingId);
    return building?.name || buildingId;
  };

  // Handle user row press
  const handleUserPress = (user: User) => {
    setSelectedUser(user);
    setShowUserInfoModal(true);
  };

  useEffect(() => {
    setFormData((prev) => {
      if (prev.buildingId) return prev;
      return { ...prev, buildingId: defaultBuildingId };
    });
  }, [defaultBuildingId]);

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

  const handleDeleteUser = async (userId: string) => {
    try {
      await actions.adminDeleteUser?.(userId);
      Alert.alert("Success", "User deleted successfully");
    } catch (error) {
      console.error("Failed to delete user:", error);
      Alert.alert("Error", "Failed to delete user");
    }
  };

  const handleCreateUser = async () => {
    // Validate form
    if (!formData.name.trim() || !formData.email.trim()) {
      Alert.alert("Validation Error", "Name and email are required");
      return;
    }

    // Validate tenant-specific fields
    if (formData.role === "tenant") {
      if (!formData.buildingId) {
        Alert.alert("Validation Error", "Building assignment is required for tenants");
        return;
      }
      if (!formData.floor.trim()) {
        Alert.alert("Validation Error", "Floor is required for tenants");
        return;
      }
      if (!formData.apartment.trim()) {
        Alert.alert("Validation Error", "Apartment/Unit is required for tenants");
        return;
      }
    }

    // Validate employee building and floor if assigned
    if (formData.role === "employee" && formData.buildingId && !formData.floor.trim()) {
      Alert.alert("Validation Error", "Floor is required when building is assigned");
      return;
    }

    setIsCreating(true);
    try {
      const profile: any = {
        buildingId: formData.buildingId,
      };

      // Add role-specific profile data
      if (formData.role === "tenant") {
        profile.apartment = formData.apartment;
        profile.tower = formData.tower || undefined; // Optional
        profile.floor = formData.floor;
        profile.emergencyContact = formData.emergencyContact || undefined;
        profile.emergencyPhone = formData.emergencyPhone || undefined;
      } else if (formData.role === "employee") {
        profile.tower = formData.tower || undefined;
        profile.floor = formData.floor || undefined;
      }

      await actions.createUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        profile,
      });

      Alert.alert("Success", "User created successfully");
      setShowCreateModal(false);
      // Reset form
      setFormData(createInitialFormState(defaultBuildingId));
    } catch (error) {
      console.error("Failed to create user:", error);
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
            onRowPress={handleUserPress}
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

      {canManageUsers && (
        <CreateUserModal
          visible={showCreateModal}
          formData={formData}
          setFormData={setFormData}
          managedBuildings={managedBuildings}
          defaultBuildingId={defaultBuildingId}
          isLoading={isCreating}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      )}

      {/* User Info Modal */}
      <UserInfoModal
        visible={showUserInfoModal}
        user={selectedUser}
        onClose={() => {
          setShowUserInfoModal(false);
          setSelectedUser(null);
        }}
        onDelete={canManageUsers ? handleDeleteUser : undefined}
        getBuildingName={getBuildingName}
      />
    </SafeAreaView>
  );
}
