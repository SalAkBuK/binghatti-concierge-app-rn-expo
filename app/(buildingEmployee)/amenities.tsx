import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { AmenityBooking, BookingStatus } from "../../lib/types";

type BookingFilter = "all" | BookingStatus;

export default function BuildingEmployeeAmenitiesScreen() {
  const { isAuthenticated, currentUser, notifications, actions } = useApp();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<BookingFilter>("all");

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  const buildingEmployee = useMemo(() => {
    if (!currentUser) return null;
    return actions.getBuildingEmployeeByUserId?.(currentUser.id) ?? null;
  }, [actions, currentUser]);

  const buildingId = buildingEmployee?.buildingId;

  const bookings = useMemo(() => {
    if (!buildingId) return [];
    return actions.getBookingsByBuilding?.(buildingId) ?? [];
  }, [actions, buildingId]);

  const filteredBookings = useMemo(() => {
    if (selectedFilter === "all") {
      return bookings;
    }
    return bookings.filter((booking) => booking.status === selectedFilter);
  }, [bookings, selectedFilter]);

  const hasUnreadNotifications =
    notifications?.some((notification) => !notification.read) ?? false;

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const filters: { label: string; value: BookingFilter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const statusMeta: Record<
    BookingStatus,
    { label: string; bg: string; color: string }
  > = {
    pending: { label: "Pending", bg: "#FEF3C7", color: "#92400E" },
    confirmed: { label: "Confirmed", bg: "#DBEAFE", color: "#1D4ED8" },
    completed: { label: "Completed", bg: "#DCFCE7", color: "#047857" },
    cancelled: { label: "Cancelled", bg: "#FEE2E2", color: "#B91C1C" },
  };

  const slotLabel = (booking: AmenityBooking) => {
    const date = new Date(booking.slotDate);
    return `${date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })} · ${booking.slotTimeStart} - ${booking.slotTimeEnd}`;
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (currentUser.role !== "building_employee") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Access Restricted</Text>
          <Text style={styles.emptySubtitle}>
            This workspace is only available to building employees.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <HeaderBar
          title="Amenity Tasks"
          subtitle="Stay on top of scheduled amenities"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.filtersContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {filters.map((filter) => {
              const active = selectedFilter === filter.value;
              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedFilter(filter.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(400)}
          style={styles.summaryRow}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {bookings.filter((booking) => booking.status === "pending").length}
            </Text>
            <Text style={styles.summaryLabel}>Pending Review</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {bookings.filter((booking) => booking.status === "confirmed").length}
            </Text>
            <Text style={styles.summaryLabel}>Confirmed</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {bookings.filter((booking) => booking.status === "completed").length}
            </Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(400)}
          style={styles.listContainer}
        >
          {filteredBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="fitness-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyCardTitle}>No bookings to display</Text>
              <Text style={styles.emptyCardSubtitle}>
                Tenant amenity bookings for your building will show up here.
              </Text>
            </View>
          ) : (
            filteredBookings.map((booking) => {
              const meta = statusMeta[booking.status];
              return (
                <View key={booking.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: meta.color }]}>
                        {meta.label}
                      </Text>
                    </View>
                    <Text style={styles.slotText}>{slotLabel(booking)}</Text>
                  </View>
                  <Text style={styles.bookingTitle}>{booking.amenityName}</Text>
                  <Text style={styles.bookingSubtitle}>
                    {booking.numberOfGuests} guest(s) · {booking.bookingCode}
                  </Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="person-outline" size={16} color="#6B7280" />
                    <Text style={styles.metaText}>
                      {booking.tenantName || "Tenant"} · Unit {booking.unitNumber || "—"}
                    </Text>
                  </View>
                  {booking.bookingNotes ? (
                    <Text style={styles.notesText}>{booking.bookingNotes}</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser.role}
      />
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  filtersContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  filtersScrollContent: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  listContainer: {
    gap: 16,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    paddingHorizontal: 24,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  slotText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  bookingSubtitle: {
    fontSize: 13,
    color: "#4B5563",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  notesText: {
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
