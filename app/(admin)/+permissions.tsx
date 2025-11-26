import { Ionicons } from "@expo/vector-icons";
import React, { useState, useMemo } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  Switch,
  TouchableOpacity,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Permission, RolePermissions, UserRole } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

interface PermissionChanges {
  [role: string]: {
    [permissionId: string]: boolean;
  };
}

export default function PermissionsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [changes, setChanges] = useState<PermissionChanges>({});
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;
  const isManagementRole = currentUser?.role === "management";

  const rolePermissions = actions.getPermissions();

  // Calculate unread notifications
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Group permissions by resource
  const groupPermissionsByResource = (permissions: Permission[]) => {
    const grouped: { [resource: string]: Permission[] } = {};
    permissions.forEach((permission) => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission);
    });
    return grouped;
  };

  // Check if a permission is enabled (either originally or by changes)
  const isPermissionEnabled = (role: string, permissionId: string) => {
    if (changes[role]?.[permissionId] !== undefined) {
      return changes[role][permissionId];
    }
    const rolePerms = rolePermissions.find((rp) => rp.role === role);
    return rolePerms?.permissions.some((p) => p.id === permissionId) || false;
  };

  // Toggle permission
  const togglePermission = (role: string, permissionId: string) => {
    const currentValue = isPermissionEnabled(role, permissionId);
    setChanges((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionId]: !currentValue,
      },
    }));
  };

  // Get role badge color
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

  // Check if there are any unsaved changes
  const hasChanges = Object.keys(changes).length > 0;

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!hasChanges) {
      Alert.alert("No Changes", "No permission changes to save");
      return;
    }

    setIsSaving(true);
    try {
      // Save each role's permissions
      for (const role of Object.keys(changes)) {
        const roleChanges = changes[role];
        const rolePerms = rolePermissions.find((rp) => rp.role === role);
        if (!rolePerms) continue;

        // Get all permissions for this role (with changes applied)
        const allPermissions = rolePerms.permissions
          .map((p) => p.id)
          .filter((permId) => {
            if (roleChanges[permId] !== undefined) {
              return roleChanges[permId];
            }
            return true;
          });

        // Add newly enabled permissions
        Object.entries(roleChanges).forEach(([permId, enabled]) => {
          if (enabled && !allPermissions.includes(permId)) {
            allPermissions.push(permId);
          }
        });

        // Update permissions via API (this is mocked)
        // await actions.updatePermissions(role, allPermissions);
      }

      Alert.alert("Success", "Permissions updated successfully");
      setChanges({});
    } catch (error) {
      console.error("Failed to update permissions:", error);
      Alert.alert("Error", "Failed to update permissions");
    } finally {
      setIsSaving(false);
    }
  };

  // Get all unique permissions from all roles
  const allPermissions = useMemo(() => {
    const permMap = new Map<string, Permission>();
    rolePermissions.forEach((rp) => {
      rp.permissions.forEach((p) => {
        permMap.set(p.id, p);
      });
    });
    return Array.from(permMap.values());
  }, [rolePermissions]);

  const groupedPermissions = groupPermissionsByResource(allPermissions);

  // Render role section
  const renderRoleSection = (rolePerms: RolePermissions, index: number) => {
    const roleColors = getRoleBadgeColor(rolePerms.role);

    return (
      <Animated.View
        key={rolePerms.role}
        entering={FadeInDown.delay(index * 100).duration(400)}
        style={styles.roleCard}
      >
        {/* Role Header */}
        <View style={[styles.roleHeader, isCompact && styles.roleHeaderCompact]}>
          <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
            <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>
              {rolePerms.role.toUpperCase().replace("_", " ")}
            </Text>
          </View>
          <Text style={[styles.permissionCount, isCompact && styles.permissionCountCompact]}>
            {rolePerms.permissions.length} permissions
          </Text>
        </View>

        {/* Permissions Grid */}
        {Object.entries(groupedPermissions).map(([resource, permissions]) => (
          <View key={resource} style={styles.resourceSection}>
            <Text style={styles.resourceTitle}>
              {resource.charAt(0).toUpperCase() + resource.slice(1)}
            </Text>

            <View style={styles.permissionsGrid}>
              {permissions.map((permission) => {
                const isEnabled = isPermissionEnabled(rolePerms.role, permission.id);
                const hasChange = changes[rolePerms.role]?.[permission.id] !== undefined;

                return (
                  <View key={permission.id} style={styles.permissionItem}>
                    <View style={styles.permissionInfo}>
                      <Text style={[styles.permissionAction, hasChange && styles.permissionChanged]}>
                        {permission.action.charAt(0).toUpperCase() + permission.action.slice(1)}
                      </Text>
                      {hasChange && (
                        <View style={styles.changedIndicator}>
                          <Ionicons name="alert-circle" size={12} color="#F59E0B" />
                        </View>
                      )}
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={() => togglePermission(rolePerms.role, permission.id)}
                      trackColor={{ false: "#D1D5DB", true: "#A78BFA" }}
                      thumbColor={isEnabled ? "#7034FF" : "#F3F4F6"}
                      disabled={["admin", "super_admin"].includes(rolePerms.role)} // Core admin roles always have all permissions
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </Animated.View>
    );
  };

  const restrictedContent = (
    <View style={[styles.contentWrapper, { paddingHorizontal: pagePadding }] }>
      <HeaderBar
        title="Permissions"
        hasUnreadNotifications={hasUnreadNotifications}
        showSideMenu={showSideMenu}
        onSideMenuToggle={setShowSideMenu}
        notificationRoute={ADMIN_NOTIFICATION_ROUTE}
      />

      <Animated.View
        entering={FadeInDown.duration(300)}
        style={styles.restrictedCard}
      >
        <Ionicons
          name="lock-closed"
          size={36}
          color="#4C1D95"
          style={styles.restrictedIcon}
        />
        <Text style={styles.restrictedTitle}>Admin Access Required</Text>
        <Text style={styles.restrictedText}>
          Contact your administrator to adjust role permissions. Building managers can monitor requests
          and jobs from the dashboard.
        </Text>
      </Animated.View>
    </View>
  );

  const permissionsContent = (
    <View style={[styles.contentWrapper, { paddingHorizontal: pagePadding }] }>
      {/* Header */}
      <HeaderBar
        title="Permissions Management"
        hasUnreadNotifications={hasUnreadNotifications}
        showSideMenu={showSideMenu}
        onSideMenuToggle={setShowSideMenu}
        notificationRoute={ADMIN_NOTIFICATION_ROUTE}
      />

      {/* Info Banner */}
      <Animated.View entering={FadeInDown.delay(50).duration(400)} style={styles.infoBanner}>
        <Ionicons name="information-circle" size={20} color="#4338CA" />
        <Text style={styles.infoBannerText}>
          Configure access permissions for each role. Admin and Super Admin permissions cannot be modified.
        </Text>
      </Animated.View>

      {/* Roles List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {rolePermissions.map((rolePerms, index) => renderRoleSection(rolePerms, index))}

        {/* Save Button */}
        {hasChanges && (
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {isManagementRole ? restrictedContent : permissionsContent}

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />
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
  restrictedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    gap: 12,
  },
  restrictedIcon: {
    backgroundColor: "#EEF2FF",
    padding: 16,
    borderRadius: 999,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  restrictedText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E0E7FF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#4338CA",
    lineHeight: 18,
  },
  roleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  roleHeaderCompact: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  permissionCount: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  permissionCountCompact: {
    marginTop: 8,
  },
  resourceSection: {
    marginBottom: 16,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    textTransform: "capitalize",
  },
  permissionsGrid: {
    gap: 8,
  },
  permissionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  permissionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  permissionAction: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  permissionChanged: {
    color: "#7034FF",
    fontWeight: "600",
  },
  changedIndicator: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7034FF",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
    shadowColor: "#7034FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0.1,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 40,
  },
});
