import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  RefreshControl,
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

import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";

export default function RatingsScreen() {
  const { currentUser, ratings, jobs } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<RatingFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  // Filter ratings for current service provider
  const myJobs = useMemo(() => {
    return jobs?.filter((job) => job.assignedTo === currentUser?.id) || [];
  }, [jobs, currentUser]);

  const myRatings = useMemo(() => {
    return (
      ratings?.filter(
        (rating) => rating.serviceProviderId === currentUser?.id,
      ) || []
    );
  }, [ratings, currentUser]);

  // Calculate rating statistics
  const ratingStats = useMemo(() => {
    if (myRatings.length === 0) {
      return {
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    myRatings.forEach((rating) => {
      const score = rating.rating;
      sum += score;
      distribution[score as keyof typeof distribution]++;
    });

    return {
      average: sum / myRatings.length,
      total: myRatings.length,
      distribution,
    };
  }, [myRatings]);

  // Filter ratings based on search and filter
  const filteredRatings = useMemo(() => {
    return myRatings.filter((rating) => {
      // Filter by rating score
      if (selectedFilter !== "all" && rating.rating !== parseInt(selectedFilter)) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const job =
          myJobs.find((j) => j.id === rating.jobId) ||
          myJobs.find((j) => j.requestId === rating.requestId);
        return (
          rating.reviewText?.toLowerCase().includes(query) ||
          rating.tenantName?.toLowerCase().includes(query) ||
          job?.title?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [myRatings, selectedFilter, searchQuery, myJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh - in real app, would fetch new data
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? "star" : "star-outline"}
        size={16}
        color="#F59E0B"
      />
    ));
  };

  const filterOptions: { value: RatingFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "5", label: "5★" },
    { value: "4", label: "4★" },
    { value: "3", label: "3★" },
    { value: "2", label: "2★" },
    { value: "1", label: "1★" },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Ratings & Reviews</Text>
            <Text style={styles.headerSubtitle}>Customer feedback</Text>
          </View>
        </Animated.View>

        {/* Rating Summary Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.summaryCard}
        >
          <View style={styles.summaryMain}>
            <View style={styles.averageRating}>
              <Text style={styles.averageRatingValue}>
                {ratingStats.average.toFixed(1)}
              </Text>
              <View style={styles.averageRatingStars}>
                {renderStars(Math.round(ratingStats.average))}
              </View>
              <Text style={styles.averageRatingText}>
                Based on {ratingStats.total} reviews
              </Text>
            </View>

            <View style={styles.distribution}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingStats.distribution[star as keyof typeof ratingStats.distribution];
                const percentage = ratingStats.total > 0 ? (count / ratingStats.total) * 100 : 0;
                return (
                  <View key={star} style={styles.distributionRow}>
                    <Text style={styles.distributionLabel}>{star}★</Text>
                    <View style={styles.distributionBar}>
                      <View
                        style={[
                          styles.distributionBarFill,
                          { width: `${percentage}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.distributionCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.searchContainer}
        >
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reviews..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Filter Chips */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(250)}
          style={styles.filterContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChip,
                  selectedFilter === option.value && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(option.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === option.value && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Ratings List */}
        {filteredRatings.length > 0 ? (
          <View style={styles.ratingsList}>
            {filteredRatings.map((rating, index) => {
              const job =
                myJobs.find((j) => j.id === rating.jobId) ||
                myJobs.find((j) => j.requestId === rating.requestId);
              return (
                <Animated.View
                  key={rating.id}
                  entering={FadeInDown.duration(400).delay(300 + index * 50)}
                  style={styles.ratingCard}
                >
                  <View style={styles.ratingHeader}>
                    <View style={styles.ratingTenant}>
                      <View style={styles.tenantAvatar}>
                        <Text style={styles.tenantAvatarText}>
                          {rating.tenantName?.charAt(0).toUpperCase() || "T"}
                        </Text>
                      </View>
                      <View style={styles.tenantInfo}>
                        <Text style={styles.tenantName}>
                          {rating.tenantName || "Anonymous"}
                        </Text>
                        <Text style={styles.ratingDate}>
                          {formatDate(rating.createdAt || "")}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.ratingStars}>
                      {renderStars(rating.rating)}
                    </View>
                  </View>

                  {job && (
                    <View style={styles.ratingJob}>
                      <Ionicons name="construct-outline" size={14} color="#64748B" />
                      <Text style={styles.ratingJobText}>{job.title}</Text>
                    </View>
                  )}

                  {rating.reviewText && (
                    <Text style={styles.ratingComment}>{rating.reviewText}</Text>
                  )}

                  {/* Response functionality placeholder */}
                  {!rating.responseText && (
                    <TouchableOpacity style={styles.respondButton}>
                      <Ionicons name="chatbubble-outline" size={16} color="#3B82F6" />
                      <Text style={styles.respondButtonText}>Respond</Text>
                    </TouchableOpacity>
                  )}

                  {rating.responseText && (
                    <View style={styles.responseCard}>
                      <View style={styles.responseHeader}>
                        <Ionicons name="arrow-undo" size={16} color="#64748B" />
                        <Text style={styles.responseLabel}>Your Response</Text>
                      </View>
                      <Text style={styles.responseText}>{rating.responseText}</Text>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <Animated.View
            entering={FadeInDown.duration(400).delay(300)}
            style={styles.emptyState}
          >
            <Ionicons name="star-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No Reviews Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || selectedFilter !== "all"
                ? "Try adjusting your filters"
                : "You haven't received any reviews yet"}
            </Text>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser?.role}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryMain: {
    flexDirection: "row",
    gap: 24,
  },
  averageRating: {
    alignItems: "center",
    paddingRight: 24,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  averageRatingValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 56,
  },
  averageRatingStars: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  averageRatingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
  },
  distribution: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distributionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    width: 24,
  },
  distributionBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  distributionBarFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    width: 24,
    textAlign: "right",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterScrollContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  ratingsList: {
    gap: 12,
  },
  ratingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  ratingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  ratingTenant: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  tenantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  tenantAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  ratingDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94A3B8",
  },
  ratingStars: {
    flexDirection: "row",
    gap: 2,
  },
  ratingJob: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  ratingJobText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  ratingComment: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 12,
  },
  respondButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  respondButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
  },
  responseCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  responseText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 280,
  },
});
