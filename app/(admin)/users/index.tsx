import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState, memo } from "react";
import { Alert, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntityTable } from "../../../components/admin/EntityTable";
import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import { useApp } from "../../../lib/context/connected-app-provider";
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
  password: "",
  address: "",
  nationality: "",
  role: "tenant",
  buildingId,
  tower: "",
  floor: "",
  apartment: "",
  emergencyContact: "",
  emergencyPhone: "",
  entranceDate: new Date().toISOString(),
});

// Memoized cell components for better performance
const NameCell = memo(({ user }: { user: User }) => (
  <Text style={styles.cellText}>{user.name}</Text>
));
NameCell.displayName = 'NameCell';

const EmailCell = memo(({ user }: { user: User }) => (
  <Text style={styles.cellTextSmall} numberOfLines={1}>
    {user.email}
  </Text>
));
EmailCell.displayName = 'EmailCell';

const RoleBadge = memo(({ role, colors }: { role: UserRole; colors: { bg: string; text: string } }) => (
  <View style={[styles.roleBadge, { backgroundColor: colors.bg }]}>
    <Text style={[styles.roleBadgeText, { color: colors.text }]}>
      {role.toUpperCase()}
    </Text>
  </View>
));
RoleBadge.displayName = 'RoleBadge';

export default function UsersScreen() {
  const router = useRouter();
  const { currentUser } = useApp();
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
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserInfoModal, setShowUserInfoModal] = useState(false);
  const [formData, setFormData] = useState<UserFormState>(() =>
    createInitialFormState(defaultBuildingId),
  );

  // Pagination state
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Helper to get building name
  const getBuildingName = (buildingId: string): string => {
    const building = managedBuildings.find((b) => b.id === buildingId);
    return building?.name || buildingId;
  };

  // Handle user row press
  const handleUserPress = useCallback((user: User) => {
    setSelectedUser(user);
    setShowUserInfoModal(true);
  }, []);

  useEffect(() => {
    setFormData((prev) => {
      if (prev.buildingId) return prev;
      return { ...prev, buildingId: defaultBuildingId };
    });
  }, [defaultBuildingId]);

  // Fetch all users from backend when component mounts (run once only)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        console.log('[Users] Fetching all users from backend...');
        await actions.fetchAllUsersForBuildings?.();
        console.log('[Users] Successfully loaded users from backend');
      } catch (error) {
        console.error('[Users] Failed to load users from backend:', error);
        // Don't show alert on mount - just log the error
        // Users can still work with locally cached data
      }
    };

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array = run once on mount only, prevents infinite loop

  // Refetch when building scope becomes available (e.g., admin assigned buildings load later)
  useEffect(() => {
    if (managedBuildings.length === 0) return;
    if (refreshing) return;
    const refetch = async () => {
      try {
        setRefreshing(true);
        console.log('[Users] Refreshing users after building scope change...');
        await actions.fetchAllUsersForBuildings?.();
      } catch (error) {
        console.error('[Users] Failed to refresh after building scope change:', error);
      } finally {
        setRefreshing(false);
      }
    };
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedBuildings.length]);

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

  // Paginated users - only show items up to current page
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(0, currentPage * ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage, ITEMS_PER_PAGE]);

  const hasMoreUsers = paginatedUsers.length < filteredUsers.length;
  const remainingUsers = filteredUsers.length - paginatedUsers.length;

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleLoadMore = () => {
    if (hasMoreUsers) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Refresh users from backend
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('[Users] Refreshing users from backend...');
      await actions.fetchAllUsersForBuildings?.();
      console.log('[Users] Successfully refreshed users');
    } catch (error) {
      console.error('[Users] Failed to refresh users:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getRoleBadgeColor = useCallback((role: UserRole) => {
    const colors = {
      admin: { bg: "#FEE2E2", text: "#DC2626" },
      super_admin: { bg: "#FECACA", text: "#B91C1C" },
      management: { bg: "#E0E7FF", text: "#4338CA" },
      service_provider: { bg: "#DBEAFE", text: "#1E40AF" },
      tenant: { bg: "#D1FAE5", text: "#065F46" },
      employee: { bg: "#FEF3C7", text: "#92400E" },
    };
    return colors[role] || colors.tenant;
  }, []);

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

    // NEW: Check if attempting to create admin user
    const isCreatingAdmin = formData.role === "admin" || formData.role === "super_admin";
    const isSuperAdmin = currentUser?.role === "super_admin";

    if (isCreatingAdmin && !isSuperAdmin) {
      Alert.alert(
        "Permission Denied",
        "Only super administrators can create admin users."
      );
      return;
    }

    // Additional check: prevent creating super_admin (even for super_admin users)
    if (formData.role === "super_admin") {
      Alert.alert(
        "Permission Denied",
        "Creating super admin users is not allowed."
      );
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

    // Validate employee building assignment
    if (formData.role === "employee") {
      if (!formData.buildingId) {
        Alert.alert("Validation Error", "Building assignment is required for maintenance staff");
        return;
      }
    }

    // Validate management building assignment
    if (formData.role === "management" && !formData.buildingId) {
      Alert.alert("Validation Error", "Building assignment is required for managers");
      return;
    }

    setIsCreating(true);
    try {
      // Validate required backend fields
      if (!formData.password.trim()) {
        Alert.alert("Validation Error", "Password is required");
        setIsCreating(false);
        return;
      }
      if (!formData.address.trim()) {
        Alert.alert("Validation Error", "Address is required");
        setIsCreating(false);
        return;
      }
      if (!formData.nationality.trim()) {
        Alert.alert("Validation Error", "Nationality is required");
        setIsCreating(false);
        return;
      }

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

      // Create payload with backend required fields
      const payload: CreateUserDTO = {
        fullName: formData.name,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phone,
        address: formData.address,
        nationality: formData.nationality,
        role: formData.role,
        buildingId: formData.buildingId,
        apartment: formData.apartment,
        tower: formData.tower,
        profile,
      };

      // Add tenant-specific fields
      if (formData.role === "tenant") {
        payload.unitNumber = formData.apartment; // apartment field is used as unitNumber
        payload.floorNumber = formData.floor;    // floor field is used as floorNumber
        payload.entranceDate = formData.entranceDate;
      }

      if (editingUser) {
        await actions.adminUpdateUser?.(editingUser.id, payload as any);
      } else {
        const response = await actions.createUser(payload);

        // If creating maintenance staff (employee), assign to building
        if (formData.role === "employee" && formData.buildingId && response?.id) {
          try {
            const staffId = typeof response.id === 'string'
              ? parseInt(response.id.replace(/\D/g, ''), 10)
              : response.id;

            const buildingId = typeof formData.buildingId === 'string'
              ? parseInt(formData.buildingId.replace(/\D/g, ''), 10)
              : formData.buildingId;

            if (!isNaN(staffId) && !isNaN(buildingId)) {
              await actions.assignMaintenanceStaffToBuilding?.(buildingId, staffId);
            }
          } catch (assignError) {
            console.error('[Users] Failed to assign maintenance staff to building:', assignError);
            // Don't fail the entire operation - user is created, just not assigned
            Alert.alert(
              "Partial Success",
              "Maintenance staff created successfully, but building assignment failed. You can assign them manually later."
            );
            setShowCreateModal(false);
            setFormData(createInitialFormState(defaultBuildingId));
            setEditingUser(null);
            setIsCreating(false);
            return;
          }
        }

        // If creating manager, assign to building
        if (formData.role === "management" && formData.buildingId && response?.id) {
          try {
            const managerId = typeof response.id === 'string'
              ? parseInt(response.id.replace(/\D/g, ''), 10)
              : response.id;

            const buildingId = typeof formData.buildingId === 'string'
              ? parseInt(formData.buildingId.replace(/\D/g, ''), 10)
              : formData.buildingId;

            if (!isNaN(managerId) && !isNaN(buildingId)) {
              await actions.assignManagerToBuilding?.(String(buildingId), String(managerId));
            }
          } catch (assignError) {
            console.error('[Users] Failed to assign manager to building:', assignError);
            Alert.alert(
              "Partial Success",
              "Manager created successfully, but building assignment failed. You can assign them manually later."
            );
            setShowCreateModal(false);
            setFormData(createInitialFormState(defaultBuildingId));
            setEditingUser(null);
            setIsCreating(false);
            return;
          }
        }
      }

      Alert.alert("Success", editingUser ? "User updated successfully" : "User created successfully");
      setShowCreateModal(false);
      // Reset form
      setFormData(createInitialFormState(defaultBuildingId));
      setEditingUser(null);

      // Refresh users list from backend to get the latest data
      console.log('[Users] Refreshing users list after creation...');
      try {
        await actions.fetchAllUsersForBuildings?.();
        console.log('[Users] Successfully refreshed users list');
      } catch (refreshError) {
        console.error('[Users] Failed to refresh users list:', refreshError);
        // Don't fail the operation - user was created successfully
      }
    } catch (error: any) {
      console.error("Failed to create user:", error);
      Alert.alert("Error", error?.message || "Failed to save user");
    } finally {
      setIsCreating(false);
    }
  };

  const startEditUser = (user: User) => {
    // Service providers should be edited in the Service Providers screen
    if (user.role === 'service_provider') {
      Alert.alert(
        "Edit Service Provider",
        "Service providers should be edited in the Service Providers screen with their specialized fields (Company Name, Specialty, etc.).",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Go to Service Providers",
            onPress: () => {
              setShowUserInfoModal(false);
              setSelectedUser(null);
              router.push('/(admin)/service-providers');
            },
          },
        ]
      );
      return;
    }

    console.log('[Users] ========== EDIT USER DEBUG ==========');
    console.log('[Users] Full user object:', JSON.stringify(user, null, 2));

    const profile = user.profile || {};
    const userAny = user as any;

    console.log('[Users] Extracted values:');
    console.log('  - name:', user.name, '|| fullName:', userAny.fullName);
    console.log('  - email:', user.email);
    console.log('  - phone:', user.phone, '|| phoneNumber:', userAny.phoneNumber, '|| profile.phone:', profile.phone);
    console.log('  - address:', userAny.address, '|| profile.address:', profile.address);
    console.log('  - nationality:', userAny.nationality, '|| profile.nationality:', profile.nationality);
    console.log('  - role:', user.role);
    console.log('  - buildingId:', profile.buildingId);
    console.log('  - tower:', profile.tower);
    console.log('  - floor:', profile.floor, '|| floorNumber:', userAny.floorNumber);
    console.log('  - apartment:', profile.apartment, '|| unitNumber:', userAny.unitNumber);
    console.log('  - emergencyContact:', profile.emergencyContact);
    console.log('  - emergencyPhone:', profile.emergencyPhone);

    const editFormData = {
      name: user.name || userAny.fullName || "",
      email: user.email || "",
      phone: user.phone || userAny.phoneNumber || profile.phone || "",
      password: "", // Don't pre-fill password for security
      address: userAny.address || profile.address || "",
      nationality: userAny.nationality || profile.nationality || "",
      role: user.role as UserRole,
      buildingId: profile.buildingId || defaultBuildingId,
      tower: profile.tower || "",
      floor: profile.floor || userAny.floorNumber || "",
      apartment: profile.apartment || userAny.unitNumber || "",
      emergencyContact: profile.emergencyContact || "",
      emergencyPhone: profile.emergencyPhone || "",
      entranceDate: userAny.entranceDate || new Date().toISOString(),
    };

    console.log('[Users] Final form data to be set:', JSON.stringify(editFormData, null, 2));
    console.log('[Users] ========================================');

    setEditingUser(user);
    setFormData(editFormData);
    setShowCreateModal(true);
  };

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        render: (user: User) => <NameCell user={user} />,
        width: isCompact ? undefined : Math.min(280, width * 0.3),
      },
      {
        key: "email",
        label: "Email",
        render: (user: User) => <EmailCell user={user} />,
        width: isCompact ? undefined : Math.min(320, width * 0.35),
      },
      {
        key: "role",
        label: "Role",
        render: (user: User) => <RoleBadge role={user.role} colors={getRoleBadgeColor(user.role)} />,
        width: isCompact ? undefined : 120,
      },
    ],
    [getRoleBadgeColor, isCompact, width],
  );

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
              onPress={() => {
                setEditingUser(null);
                setFormData(createInitialFormState(defaultBuildingId));
                setShowCreateModal(true);
              }}
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
            data={paginatedUsers}
            columns={columns}
            getId={(user) => user.email}
            onRowPress={handleUserPress}
            emptyMessage="No users found"
            searchPlaceholder="Search by name, email, or role..."
            onSearch={setSearchQuery}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />

          {/* Pagination Controls */}
          {hasMoreUsers && paginatedUsers.length > 0 && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
              <Text style={styles.loadMoreButtonText}>
                Load More ({remainingUsers} remaining)
              </Text>
              <Ionicons name="chevron-down" size={16} color="#7034FF" />
            </TouchableOpacity>
          )}
          {paginatedUsers.length > 0 && !hasMoreUsers && (
            <View style={styles.endReachedFooter}>
              <Text style={styles.endReachedText}>
                Showing all {paginatedUsers.length} users
              </Text>
            </View>
          )}
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
          modalTitle={editingUser ? "Edit User" : "Create New User"}
          submitLabel={editingUser ? "Save Changes" : "Create User"}
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
        onEdit={canManageUsers ? startEditUser : undefined}
      />
    </SafeAreaView>
  );
}
