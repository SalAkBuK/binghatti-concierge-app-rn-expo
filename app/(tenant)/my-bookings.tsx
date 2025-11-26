import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AnimatedButton } from "../../components/ui/AnimatedButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { AmenityBooking, BookingStatus } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type FilterType = "all" | "upcoming" | "past" | "cancelled";

export default function MyBookingsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  // Get bookings from context
  const bookings = actions.getBookings();

  const onRefresh = async () => {
    setRefreshing(true);
    // In real app, this would trigger a re-fetch from the API
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Filter and categorize bookings
  const categorizedBookings = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const upcoming: AmenityBooking[] = [];
    const past: AmenityBooking[] = [];
    const cancelled: AmenityBooking[] = [];

    bookings.forEach((booking) => {
      if (booking.status === "cancelled") {
        cancelled.push(booking);
      } else if (booking.slotDate >= today && booking.status !== "completed") {
        upcoming.push(booking);
      } else {
        past.push(booking);
      }
    });

    return { all: bookings, upcoming, past, cancelled };
  }, [bookings]);

  // Get filtered bookings
  const filteredBookings = useMemo(() => {
    return categorizedBookings[filterType];
  }, [categorizedBookings, filterType]);

  // Calculate counts
  const counts = useMemo(() => {
    return {
      all: categorizedBookings.all.length,
      upcoming: categorizedBookings.upcoming.length,
      past: categorizedBookings.past.length,
      cancelled: categorizedBookings.cancelled.length,
    };
  }, [categorizedBookings]);

  // Calculate unread notifications
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const handleCancelBooking = async (booking: AmenityBooking) => {
    Alert.alert(
      "Cancel Booking",
      `Are you sure you want to cancel this booking?\n\nAmenity: ${booking.amenityName}\nDate: ${new Date(booking.slotDate).toLocaleDateString()}\nTime: ${booking.slotTimeStart}`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await actions.cancelBooking(booking.id, "Cancelled by user");
              Alert.alert("Success", "Booking cancelled successfully");
            } catch (error) {
              console.error("Failed to cancel booking:", error);
              Alert.alert("Error", "Failed to cancel booking");
            }
          },
        },
      ],
    );
  };

  const handleBookingPress = (booking: AmenityBooking) => {
    const statusLabel =
      booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
    Alert.alert(
      `Booking Details - ${statusLabel}`,
      `Booking Code: ${booking.bookingCode}\n\nAmenity: ${booking.amenityName}\nType: ${booking.amenityType.toUpperCase()}\n\nDate: ${new Date(booking.slotDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}\nTime: ${booking.slotTimeStart} - ${booking.slotTimeEnd}\n\nNumber of Guests: ${booking.numberOfGuests}\n\n${booking.bookingNotes ? `Notes: ${booking.bookingNotes}\n\n` : ""}${booking.cancelledReason ? `Cancellation Reason: ${booking.cancelledReason}\n\n` : ""}Created: ${new Date(booking.createdAt).toLocaleDateString()}`,
    );
  };

  const getAmenityIcon = (type: string) => {
    const icons: Record<string, any> = {
      pool: "water",
      gym: "fitness",
      sauna: "flame",
      theater: "film",
      bbq: "restaurant",
      playground: "happy",
      other: "ellipsis-horizontal",
    };
    return icons[type] || "ellipsis-horizontal";
  };

  const getAmenityIconColor = (type: string) => {
    const colors: Record<string, string> = {
      pool: "#3B82F6",
      gym: "#EF4444",
      sauna: "#F59E0B",
      theater: "#8B5CF6",
      bbq: "#F97316",
      playground: "#10B981",
      other: "#6B7280",
    };
    return colors[type] || "#6B7280";
  };

  const getStatusColors = (status: BookingStatus) => {
    const colors = {
      confirmed: { bg: "#DBEAFE", text: "#1E40AF" },
      cancelled: { bg: "#FEE2E2", text: "#DC2626" },
      completed: { bg: "#D1FAE5", text: "#065F46" },
      pending: { bg: "#FEF3C7", text: "#92400E" },
    };
    return colors[status] || colors.pending;
  };

  const isUpcoming = (booking: AmenityBooking) => {
    const now = new Date();
    const bookingDate = new Date(booking.slotDate);
    return (
      bookingDate >= now &&
      booking.status !== "cancelled" &&
      booking.status !== "completed"
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <HeaderBar
          title="My Bookings"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        {/* Filter Tabs */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.filtersContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "all" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("all")}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === "all" && styles.filterTabTextActive,
              ]}
            >
              All
            </Text>
            <View
              style={[
                styles.filterTabBadge,
                filterType === "all" && styles.filterTabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabBadgeText,
                  filterType === "all" && styles.filterTabBadgeTextActive,
                ]}
              >
                {counts.all}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "upcoming" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("upcoming")}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === "upcoming" && styles.filterTabTextActive,
              ]}
            >
              Upcoming
            </Text>
            <View
              style={[
                styles.filterTabBadge,
                filterType === "upcoming" && styles.filterTabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabBadgeText,
                  filterType === "upcoming" && styles.filterTabBadgeTextActive,
                ]}
              >
                {counts.upcoming}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "past" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("past")}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === "past" && styles.filterTabTextActive,
              ]}
            >
              Past
            </Text>
            <View
              style={[
                styles.filterTabBadge,
                filterType === "past" && styles.filterTabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabBadgeText,
                  filterType === "past" && styles.filterTabBadgeTextActive,
                ]}
              >
                {counts.past}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              filterType === "cancelled" && styles.filterTabActive,
            ]}
            onPress={() => setFilterType("cancelled")}
          >
            <Text
              style={[
                styles.filterTabText,
                filterType === "cancelled" && styles.filterTabTextActive,
              ]}
            >
              Cancelled
            </Text>
            <View
              style={[
                styles.filterTabBadge,
                filterType === "cancelled" && styles.filterTabBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabBadgeText,
                  filterType === "cancelled" && styles.filterTabBadgeTextActive,
                ]}
              >
                {counts.cancelled}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Bookings List */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.bookingsContainer}
        >
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking, index) => {
              const statusColors = getStatusColors(booking.status);
              const canCancel = isUpcoming(booking);

              return (
                <Animated.View
                  key={booking.id}
                  entering={FadeInDown.delay(150 + index * 50).duration(400)}
                >
                  <AnimatedButton
                    style={styles.bookingCard}
                    onPress={() => handleBookingPress(booking)}
                  >
                    <View style={styles.bookingHeader}>
                      <View style={styles.bookingIconContainer}>
                        <Ionicons
                          name={getAmenityIcon(booking.amenityType)}
                          size={24}
                          color={getAmenityIconColor(booking.amenityType)}
                        />
                      </View>
                      <View style={styles.bookingHeaderText}>
                        <Text style={styles.bookingAmenityName}>
                          {booking.amenityName}
                        </Text>
                        <Text style={styles.bookingAmenityType}>
                          {booking.amenityType.toUpperCase()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColors.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: statusColors.text },
                          ]}
                        >
                          {booking.status.charAt(0).toUpperCase() +
                            booking.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bookingDivider} />

                    <View style={styles.bookingDetails}>
                      <View style={styles.bookingDetailRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.bookingDetailText}>
                          {new Date(booking.slotDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </Text>
                      </View>
                      <View style={styles.bookingDetailRow}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text style={styles.bookingDetailText}>
                          {booking.slotTimeStart} - {booking.slotTimeEnd}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bookingFooter}>
                      <View style={styles.bookingCodeContainer}>
                        <Ionicons
                          name="barcode-outline"
                          size={14}
                          color="#6B7280"
                        />
                        <Text style={styles.bookingCode}>
                          {booking.bookingCode}
                        </Text>
                      </View>
                      {canCancel && (
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCancelBooking(booking);
                          }}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </AnimatedButton>
                </Animated.View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No bookings found</Text>
              <Text style={styles.emptyStateText}>
                {filterType === "all"
                  ? "You haven't made any bookings yet"
                  : `No ${filterType} bookings`}
              </Text>
              {filterType === "all" && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => router.push("/(tenant)/amenities")}
                >
                  <Text style={styles.emptyStateButtonText}>
                    Browse Amenities
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Side Menu */}
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
  scrollView: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  filtersContainer: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: "#7034FF",
    borderColor: "#7034FF",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  filterTabBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  filterTabBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  filterTabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F2937",
  },
  filterTabBadgeTextActive: {
    color: "#FFFFFF",
  },
  bookingsContainer: {
    paddingBottom: 20,
  },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  bookingIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bookingHeaderText: {
    flex: 1,
  },
  bookingAmenityName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  bookingAmenityType: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  bookingDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 12,
  },
  bookingDetails: {
    marginBottom: 12,
    gap: 8,
  },
  bookingDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bookingDetailText: {
    fontSize: 14,
    color: "#374151",
  },
  bookingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookingCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bookingCode: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: "#7034FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
