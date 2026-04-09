import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useAuth } from "../../lib/context/auth-context";
import { useAppDomain } from "../../lib/context/connected-app-provider";
import { useNotifications } from "../../lib/context/notifications-context";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import type {
  ResidentVisitor,
  ResidentVisitorStatus,
  ResidentVisitorType,
} from "../../lib/types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";

const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  surfaceHigh: "#DBE4E7",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#41555D",
  primarySoft: "#D0E6EF",
  accent: "#F8EFE4",
  accentText: "#7A5A2B",
  warningBg: "#FDF1DB",
  warningText: "#9A5B00",
  dangerBg: "#FCE3E0",
  dangerText: "#B24A41",
  shadow: "rgba(43, 52, 55, 0.08)",
  inverse: "#0C0F10",
};

const VISITOR_FOCUS_REFRESH_TTL_MS = 30_000;

type VisitorListFilter = "ALL" | "EXPECTED" | "ARRIVED";

const formatArrivalMeta = (value: string | null) => {
  if (!value) return "Arrival time flexible";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Arrival time flexible";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatVisitorType = (value: ResidentVisitorType) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getStatusMeta = (status: ResidentVisitorStatus) => {
  switch (status) {
    case "EXPECTED":
      return { bg: P.warningBg, text: P.warningText, label: "Expected" };
    case "ARRIVED":
      return { bg: "#E7EEF9", text: "#3C5A8C", label: "Arrived" };
    case "COMPLETED":
      return { bg: "#E4F4EA", text: "#25674A", label: "Completed" };
    case "CANCELLED":
      return { bg: P.dangerBg, text: P.dangerText, label: "Cancelled" };
    default:
      return { bg: P.surfaceLow, text: P.muted, label: status };
  }
};

function RecentVisitorCard({
  visitor,
  onEdit,
  onCancel,
}: {
  visitor: ResidentVisitor;
  onEdit: (visitor: ResidentVisitor) => void;
  onCancel: (visitor: ResidentVisitor) => void;
}) {
  const statusMeta = getStatusMeta(visitor.status);

  return (
    <View style={styles.recentCard}>
      <View style={styles.recentCardHeader}>
        <View style={styles.recentIdentity}>
          <View style={styles.recentAvatar}>
            <Ionicons name="person-outline" size={16} color={P.primary} />
          </View>
          <View style={styles.recentNameBlock}>
            <Text style={styles.recentName} numberOfLines={1}>
              {visitor.visitorName}
            </Text>
            <Text style={styles.recentMetaText} numberOfLines={1}>
              {formatVisitorType(visitor.type)}
            </Text>
          </View>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
          <Text style={[styles.statusPillText, { color: statusMeta.text }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>

      <Text style={styles.recentSupportingText}>
        {visitor.phoneNumber} | Unit {visitor.unit.label || "Assigned"}
      </Text>
      <Text style={styles.recentSupportingText}>
        {formatArrivalMeta(visitor.expectedArrivalAt)}
      </Text>

      <View style={styles.recentActionRow}>
        {visitor.status === "EXPECTED" ? (
          <>
            <TouchableOpacity style={styles.recentSecondaryAction} onPress={() => onEdit(visitor)}>
              <Ionicons name="create-outline" size={15} color={P.primary} />
              <Text style={styles.recentSecondaryActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.recentDestructiveAction} onPress={() => onCancel(visitor)}>
              <Ionicons name="close-circle-outline" size={15} color={P.dangerText} />
              <Text style={styles.recentDestructiveActionText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.recentPassivePill}>
            <Text style={styles.recentPassivePillText}>Read only</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function VisitorsScreen() {
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const {
    amenityVisitor: {
      residentVisitors,
      residentVisitorsLoading,
      fetchResidentVisitors,
      cancelResidentVisitor,
    },
  } = useAppDomain();
  const {
    canManageVisitors,
    isLoading: isTenancyLoading,
    statusMessage,
    statusTitle,
  } = useResidentTenancy({
    enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id),
  });
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const lastVisitorsFetchAtRef = useRef(0);
  const [refreshing, setRefreshing] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [activeFilter, setActiveFilter] = useState<VisitorListFilter>("ALL");

  const userNotifications = useMemo(
    () => filterNotificationsByUser(notifications || [], currentUser?.id),
    [currentUser?.id, notifications],
  );
  const hasUnreadNotifications = getUnreadNotificationsCount(userNotifications) > 0;

  const loadVisitors = useCallback(
    async ({
      force = false,
      showError = true,
    }: {
      force?: boolean;
      showError?: boolean;
    } = {}) => {
      const hasFreshSnapshot =
        !force &&
        lastVisitorsFetchAtRef.current > 0 &&
        Date.now() - lastVisitorsFetchAtRef.current < VISITOR_FOCUS_REFRESH_TTL_MS;

      if (hasFreshSnapshot) {
        return;
      }

      try {
        await fetchResidentVisitors();
        lastVisitorsFetchAtRef.current = Date.now();
      } catch (error) {
        if (showError) {
          Alert.alert(
            "Visitor Access",
            error instanceof Error ? error.message : "Failed to load visitors.",
          );
        }
      }
    },
    [fetchResidentVisitors],
  );

  useFocusEffect(
    useCallback(() => {
      if (!currentUser?.id) return;
      void loadVisitors({ showError: false });
    }, [currentUser?.id, loadVisitors]),
  );

  const sortedVisitors = useMemo(() => {
    const getSortTime = (visitor: ResidentVisitor) => {
      const createdAtTime = new Date(visitor.createdAt).getTime();
      return Number.isNaN(createdAtTime) ? 0 : createdAtTime;
    };

    return [...residentVisitors].sort((a, b) => getSortTime(b) - getSortTime(a));
  }, [residentVisitors]);

  const summary = useMemo(
    () => ({
      total: residentVisitors.length,
      expected: residentVisitors.filter((visitor) => visitor.status === "EXPECTED").length,
      arrived: residentVisitors.filter((visitor) => visitor.status === "ARRIVED").length,
    }),
    [residentVisitors],
  );

  const filteredVisitors = useMemo(() => {
    if (activeFilter === "ALL") {
      return sortedVisitors;
    }

    return sortedVisitors.filter((visitor) => visitor.status === activeFilter);
  }, [activeFilter, sortedVisitors]);

  const filterChips = useMemo(
    () => [
      { key: "ALL" as const, label: "All", count: summary.total },
      { key: "EXPECTED" as const, label: "Expected", count: summary.expected },
      { key: "ARRIVED" as const, label: "Arrived", count: summary.arrived },
    ],
    [summary.arrived, summary.expected, summary.total],
  );

  const footerBottomOffset = tabBarHeight + Math.max(insets.bottom, 12) + 16;
  const scrollBottomPadding = footerBottomOffset + 96;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVisitors({ force: true });
    setRefreshing(false);
  }, [loadVisitors]);

  const handleEditVisitor = (visitor: ResidentVisitor) => {
    router.push({
      pathname: "/(modals)/register-visitor",
      params: { visitorId: visitor.id },
    } as any);
  };

  const handleCancelVisitor = async (visitor: ResidentVisitor) => {
    Alert.alert(
      "Cancel Registration",
      `Cancel ${visitor.visitorName}'s visitor registration?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Visitor",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelResidentVisitor(visitor.id);
              lastVisitorsFetchAtRef.current = Date.now();
              Alert.alert("Visitor Cancelled", "The registration has been cancelled.");
            } catch (error) {
              Alert.alert(
                "Unable to Cancel",
                error instanceof Error ? error.message : "Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: scrollBottomPadding }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <HeaderBar
            title="Visitors"
            hasUnreadNotifications={hasUnreadNotifications}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            textColor={P.text}
          />

          <View style={styles.editorialHeader}>
            <Text style={styles.eyebrow}>Guest Access</Text>
            <Text style={styles.title}>Create a seamless entry experience.</Text>
            <Text style={styles.subtitle}>
              Fill in the details below to pre-authorize your visitor.
            </Text>
          </View>

          {!isTenancyLoading && !canManageVisitors ? (
            <View style={styles.lockedBanner}>
              <Ionicons name="information-circle-outline" size={18} color={P.warningText} />
              <View style={styles.lockedCopy}>
                <Text style={styles.lockedTitle}>{statusTitle}</Text>
                <Text style={styles.lockedText}>{statusMessage}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.recentSection}>
            <View style={styles.recentSectionHeader}>
              <View>
                <Text style={styles.recentSectionEyebrow}>Access History</Text>
                <Text style={styles.recentSectionTitle}>Visitor Pre-Registration</Text>
              </View>
              <Text style={styles.recentSectionMeta}>
                {summary.total} total | {summary.expected} expected | {summary.arrived} arrived
              </Text>
            </View>

            <View style={styles.filterRow}>
              {filterChips.map((filter) => {
                const isActive = activeFilter === filter.key;

                return (
                  <TouchableOpacity
                    key={filter.key}
                    activeOpacity={0.88}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => setActiveFilter(filter.key)}
                  >
                    <Text
                      style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    >
                      {filter.label}
                    </Text>
                    <View
                      style={[styles.filterChipCount, isActive && styles.filterChipCountActive]}
                    >
                      <Text
                        style={[
                          styles.filterChipCountText,
                          isActive && styles.filterChipCountTextActive,
                        ]}
                      >
                        {filter.count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {residentVisitorsLoading && residentVisitors.length === 0 ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="small" color={P.primary} />
                <Text style={styles.loadingText}>Loading visitor history...</Text>
              </View>
            ) : filteredVisitors.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={28} color={P.soft} />
                <Text style={styles.emptyTitle}>
                  {activeFilter === "ALL"
                    ? "No visitor registrations yet"
                    : `No ${activeFilter.toLowerCase()} visitors`}
                </Text>
                <Text style={styles.emptyText}>
                  {activeFilter === "ALL"
                    ? "Your visitor registrations will appear here once they are created."
                    : `Visitors marked as ${activeFilter.toLowerCase()} will appear here.`}
                </Text>
              </View>
            ) : (
              <>
                {filteredVisitors.map((visitor) => (
                  <RecentVisitorCard
                    key={visitor.id}
                    visitor={visitor}
                    onEdit={handleEditVisitor}
                    onCancel={handleCancelVisitor}
                  />
                ))}
                <Text style={styles.recentFooterText}>Showing newest registrations first.</Text>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {canManageVisitors ? (
        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.fabWrap, { bottom: footerBottomOffset }]}
          onPress={() => router.push("/(modals)/register-visitor" as any)}
        >
          <LinearGradient
            colors={[P.primary, P.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#EEF7FB" />
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  editorialHeader: {
    marginTop: 8,
    marginBottom: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: P.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    color: P.text,
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: P.muted,
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 20,
    backgroundColor: P.warningBg,
    padding: 16,
    marginBottom: 18,
  },
  lockedCopy: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: P.warningText,
  },
  lockedText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: P.warningText,
  },
  recentSection: {
    marginBottom: 24,
  },
  recentSectionHeader: {
    marginBottom: 14,
  },
  recentSectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: P.primary,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginBottom: 6,
  },
  recentSectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: P.text,
  },
  recentSectionMeta: {
    marginTop: 6,
    fontSize: 13,
    color: P.muted,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
  },
  filterChipActive: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.text,
  },
  filterChipTextActive: {
    color: "#EEF7FB",
  },
  filterChipCount: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.surfaceLow,
  },
  filterChipCountActive: {
    backgroundColor: "rgba(238, 247, 251, 0.18)",
  },
  filterChipCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: P.primary,
  },
  filterChipCountTextActive: {
    color: "#EEF7FB",
  },
  loadingState: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: P.muted,
  },
  emptyState: {
    borderRadius: 24,
    backgroundColor: P.surface,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "700",
    color: P.text,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: P.muted,
    textAlign: "center",
  },
  recentCard: {
    backgroundColor: P.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  recentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  recentIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  recentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: P.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  recentNameBlock: {
    flex: 1,
  },
  recentName: {
    fontSize: 16,
    fontWeight: "700",
    color: P.text,
  },
  recentMetaText: {
    marginTop: 2,
    fontSize: 12,
    color: P.soft,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  recentSupportingText: {
    marginTop: 10,
    fontSize: 13,
    color: P.muted,
  },
  recentActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  recentSecondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
  },
  recentSecondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.primary,
  },
  recentDestructiveAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.dangerBg,
  },
  recentDestructiveActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.dangerText,
  },
  recentPassivePill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
  },
  recentPassivePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
  },
  recentFooterText: {
    marginTop: 4,
    fontSize: 12,
    color: P.soft,
    textAlign: "center",
  },
  fabWrap: {
    position: "absolute",
    right: 24,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
});
