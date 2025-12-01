import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
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
import { useApp } from "../../../lib/context/connected-app-provider";
import type { User } from "../../../lib/types";
import { filterNotificationsByUser } from "../../../lib/utils/helpers";
import { generateId } from "../../../lib/utils";
import { CreateAdminModal } from "./_components/CreateAdminModal";

const SUPERADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

interface AdminFormData {
  name: string;
  email: string;
  phone: string;
}

const createInitialFormData = (): AdminFormData => ({
  name: "",
  email: "",
  phone: "",
});

export default function SuperAdminAdminsScreen() {
  const { currentUser, users, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<AdminFormData>(createInitialFormData());
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Get all admin users
  const adminUsers = useMemo(() => {
    const allUsers = Object.values(users);
    return allUsers.filter((u) => u.role === "admin");
  }, [users]);

  // Filter admins based on search
  const filteredAdmins = useMemo(() => {
    if (!searchQuery.trim()) return adminUsers;
    const query = searchQuery.toLowerCase();
    return adminUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query),
    );
  }, [adminUsers, searchQuery]);

  const handleCreateAdmin = useCallback(async () => {
    try {
      setIsCreating(true);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        Alert.alert("Invalid Email", "Please enter a valid email address");
        setIsCreating(false);
        return;
      }

      // Check if user already exists
      if (users[formData.email]) {
        Alert.alert("User Exists", "A user with this email already exists");
        setIsCreating(false);
        return;
      }

      // Generate new ID
      const allUsers = Object.values(users);
      const newId = generateId(allUsers);

      // Create new admin user
      const newAdmin: User = {
        id: newId.toString(),
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        role: "admin",
        phone: formData.phone.trim() || undefined,
        profile: {
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add user to state
      actions.addUser(newAdmin.email, newAdmin);

      Alert.alert("Success", "Admin created successfully");
      setShowCreateModal(false);
      setFormData(createInitialFormData());
    } catch (error) {
      console.error("Error creating admin:", error);
      Alert.alert("Error", "Failed to create admin");
    } finally {
      setIsCreating(false);
    }
  }, [formData, users, actions]);

  const handleEditAdmin = useCallback(
    (user: User) => {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || "",
      });
      setShowCreateModal(true);
    },
    [],
  );

  const handleUpdateAdmin = useCallback(async () => {
    if (!editingUser) return;

    try {
      setIsCreating(true);

      const updatedUser: User = {
        ...editingUser,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        profile: {
          ...editingUser.profile,
          name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
        },
        updatedAt: new Date().toISOString(),
      };

      await actions.updateUser(editingUser.email, updatedUser);

      Alert.alert("Success", "Admin updated successfully");
      setShowCreateModal(false);
      setFormData(createInitialFormData());
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating admin:", error);
      Alert.alert("Error", "Failed to update admin");
    } finally {
      setIsCreating(false);
    }
  }, [editingUser, formData, actions]);

  const handleModalClose = useCallback(() => {
    setShowCreateModal(false);
    setFormData(createInitialFormData());
    setEditingUser(null);
  }, []);

  const handleDeleteAdmin = useCallback(
    (user: User) => {
      Alert.alert(
        "Delete Admin",
        `Are you sure you want to delete ${user.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await actions.deleteUser(user.email);
                Alert.alert("Success", "Admin deleted successfully");
              } catch (error) {
                Alert.alert("Error", "Failed to delete admin");
              }
            },
          },
        ],
      );
    },
    [actions],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Admin Management"
          subtitle="Manage admin users and permissions"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={SUPERADMIN_NOTIFICATION_ROUTE}
        />

        {/* Search Bar and Create Button */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          style={styles.topBar}
        >
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search admins..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Admin</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Card */}
        <Animated.View
          entering={FadeInDown.delay(150).duration(300)}
          style={styles.statsCard}
        >
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{adminUsers.length}</Text>
            <Text style={styles.statLabel}>Total Admins</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredAdmins.length}</Text>
            <Text style={styles.statLabel}>Filtered</Text>
          </View>
        </Animated.View>

        {/* Admins List */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(300)}
          style={styles.listSection}
        >
          <Text style={styles.sectionTitle}>Admin Users</Text>
          {filteredAdmins.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                {searchQuery ? "No admins found" : "No admin users yet"}
              </Text>
            </View>
          ) : (
            <View style={styles.usersList}>
              {filteredAdmins.map((user, index) => (
                <Animated.View
                  key={user.id}
                  entering={FadeInDown.delay(250 + index * 50).duration(300)}
                >
                  <View style={styles.userCard}>
                    <View style={styles.userIconContainer}>
                      <Ionicons name="shield-checkmark" size={24} color="#7034FF" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                      {user.phone && (
                        <Text style={styles.userPhone}>{user.phone}</Text>
                      )}
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditAdmin(user)}
                      >
                        <Ionicons name="pencil-outline" size={20} color="#7034FF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteAdmin(user)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <CreateAdminModal
        visible={showCreateModal}
        formData={formData}
        setFormData={setFormData}
        isLoading={isCreating}
        onClose={handleModalClose}
        onSubmit={editingUser ? handleUpdateAdmin : handleCreateAdmin}
        mode={editingUser ? "edit" : "create"}
      />

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  topBar: {
    marginTop: 24,
    gap: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7034FF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#7034FF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
  },
  listSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  usersList: {
    gap: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
  },
  userIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#7034FF15",
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
});
