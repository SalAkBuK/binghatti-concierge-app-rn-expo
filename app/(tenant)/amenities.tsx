import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
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
import type { Amenity, AmenityType } from "../../lib/types";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Amenities are now loaded from context via useApp hook

type FilterType = "all" | AmenityType;

const filterOptions: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Pool", value: "pool" },
  { label: "Gym", value: "gym" },
  { label: "Sauna", value: "sauna" },
  { label: "BBQ", value: "bbq" },
];

export default function AmenitiesScreen() {
  const { currentUser, notifications, amenities } = useApp();
  const params = useLocalSearchParams();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const insets = useSafeAreaInsets();

  // Update filter when params change (from dropdown navigation)
  useEffect(() => {
    if (params.filter && typeof params.filter === "string") {
      setFilterType(params.filter as FilterType);
    }
  }, [params.filter]);

  // Filter amenities
  const filteredAmenities = useMemo(() => {
    if (filterType === "all") {
      return amenities;
    }
    return amenities.filter((a) => a.amenityType === filterType);
  }, [amenities, filterType]);

  // Calculate unread notifications
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const handleAmenityPress = (amenity: Amenity) => {
    if (amenity.status === "maintenance") {
      return;
    }
    router.push({
      pathname: "/(modals)/amenity-booking-form",
      params: { amenityId: amenity.id },
    });
  };

  const getAmenityIcon = (type: AmenityType) => {
    const icons: Record<AmenityType, any> = {
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

  const getAmenityIconColor = (type: AmenityType) => {
    const colors: Record<AmenityType, string> = {
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 160 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <HeaderBar
          title="Amenities"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        {/* Filter Tabs */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={styles.filtersContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {filterOptions.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  filterType === filter.value && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType(filter.value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === filter.value && styles.filterButtonTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Amenities List */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={styles.amenitiesContainer}
        >
          {filteredAmenities.length > 0 ? (
            filteredAmenities.map((amenity, index) => (
              <Animated.View
                key={amenity.id}
                entering={FadeInDown.delay(150 + index * 50).duration(400)}
              >
                <AnimatedButton
                  style={[
                    styles.amenityCard,
                    amenity.status === "maintenance" &&
                      styles.amenityCardDisabled,
                  ]}
                  onPress={() => handleAmenityPress(amenity)}
                  disabled={amenity.status === "maintenance"}
                >
                  {/* Amenity Image */}
                  <View style={styles.amenityImageContainer}>
                    <View style={styles.amenityImagePlaceholder}>
                      <Ionicons
                        name={getAmenityIcon(amenity.amenityType)}
                        size={40}
                        color={getAmenityIconColor(amenity.amenityType)}
                      />
                    </View>
                    {amenity.status === "maintenance" && (
                      <View style={styles.maintenanceBadge}>
                        <Ionicons name="construct" size={12} color="#DC2626" />
                        <Text style={styles.maintenanceBadgeText}>
                          Under Maintenance
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Amenity Details */}
                  <View style={styles.amenityContent}>
                    <Text style={styles.amenityName} numberOfLines={1}>
                      {amenity.name}
                    </Text>
                    <Text style={styles.amenityType}>
                      {amenity.amenityType.toUpperCase()}
                    </Text>

                    <View style={styles.amenityInfo}>
                      <View style={styles.amenityInfoRow}>
                        <Ionicons
                          name="people-outline"
                          size={14}
                          color="#6B7280"
                        />
                        <Text style={styles.amenityInfoText}>
                          Capacity: {amenity.capacity}
                        </Text>
                      </View>
                      <View style={styles.amenityInfoRow}>
                        <Ionicons name="time-outline" size={14} color="#6B7280" />
                        <Text style={styles.amenityInfoText}>
                          {amenity.operatingHours.monday?.open} -{" "}
                          {amenity.operatingHours.monday?.close}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.amenityFooter}>
                      {amenity.status === "active" ? (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: "#D1FAE5" },
                          ]}
                        >
                          <View style={styles.statusDot} />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: "#065F46" },
                            ]}
                          >
                            Available
                          </Text>
                        </View>
                      ) : null}
                      {amenity.status === "active" && (
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color="#6B7280"
                        />
                      )}
                    </View>
                  </View>
                </AnimatedButton>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No amenities found</Text>
              <Text style={styles.emptyStateText}>
                No {filterType !== "all" ? filterType : ""} amenities available
                at this time
              </Text>
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
    marginBottom: 20,
  },
  filtersScrollContent: {
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterButtonActive: {
    backgroundColor: "#7034FF",
    borderColor: "#7034FF",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  amenitiesContainer: {
    paddingBottom: 20,
  },
  amenityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    width: SCREEN_WIDTH * 0.9,
  },
  amenityCardDisabled: {
    opacity: 0.6,
  },
  amenityImageContainer: {
    position: "relative",
    marginBottom: 12,
  },
  amenityImagePlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  maintenanceBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  maintenanceBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
  },
  amenityContent: {
    flex: 1,
  },
  amenityName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  amenityType: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amenityInfo: {
    marginBottom: 12,
    gap: 6,
  },
  amenityInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  amenityInfoText: {
    fontSize: 13,
    color: "#6B7280",
  },
  amenityFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
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
  },
});
