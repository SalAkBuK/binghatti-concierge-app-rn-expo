import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedButton } from "../../components/ui/AnimatedButton";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { ImageViewer } from "../../components/ui/ImageViewer";
import { SideMenu } from "../../components/ui/SideMenu";
import { StarRating } from "../../components/ui/StarRating";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Rating } from "../../lib/types";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function MyRatingsScreen() {
  const { currentUser, notifications, actions } = useApp();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedRating, setSelectedRating] = useState<Rating | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const tabBarHeight = useBottomTabBarHeight();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Get ratings from context
  const ratings = actions.getRatings() as Rating[];

  const userRatings = useMemo(() => {
    return ratings.filter((rating) => rating.tenantId === currentUser?.id);
  }, [ratings, currentUser]);

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    // In real app, this would trigger a re-fetch from the API
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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handleRatingPress = (rating: Rating) => {
    setSelectedRating(rating);
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  // Calculate unread notifications
  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <HeaderBar
          title="My Ratings"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        {/* Ratings List */}
        <View style={styles.ratingsContainer}>
          {userRatings.length > 0 ? (
            userRatings.map((rating, index) => (
              <Animated.View
                key={rating.id}
                entering={FadeInDown.delay(index * 50).duration(400)}
              >
                <AnimatedButton
                  style={styles.ratingCard}
                  onPress={() => handleRatingPress(rating)}
                >
                  {/* Request Title - Linked Request */}
                  <View style={styles.cardHeader}>
                    <Ionicons name="clipboard-outline" size={16} color="#6B7280" />
                    <Text style={styles.requestTitle} numberOfLines={1}>
                      {/* TODO: Get request title from requestId */}
                      Request #{rating.requestId.substring(0, 8)}
                    </Text>
                  </View>

                  {/* Service Provider Name */}
                  <View style={styles.providerRow}>
                    <Ionicons name="person-outline" size={14} color="#6B7280" />
                    <Text style={styles.providerName}>
                      {/* TODO: Get service provider name from serviceProviderId */}
                      Service Provider
                    </Text>
                  </View>

                  {/* Star Rating */}
                  <View style={styles.ratingRow}>
                    <StarRating rating={rating.rating} size={20} color="#10B981" />
                    <Text style={styles.ratingDate}>{formatDate(rating.createdAt)}</Text>
                  </View>

                  {/* Review Text Preview */}
                  {rating.reviewText && (
                    <Text style={styles.reviewPreview}>
                      {truncateText(rating.reviewText, 100)}
                      {rating.reviewText.length > 100 && (
                        <Text style={styles.readMore}> Read more...</Text>
                      )}
                    </Text>
                  )}

                  {/* Service Provider Response */}
                  {rating.responseText && (
                    <View style={styles.responseContainer}>
                      <View style={styles.responseHeader}>
                        <Ionicons name="chatbubble-outline" size={14} color="#356FEC" />
                        <Text style={styles.responseLabel}>Provider Response</Text>
                      </View>
                      <Text style={styles.responseText} numberOfLines={2}>
                        {rating.responseText}
                      </Text>
                    </View>
                  )}

                  {/* Photo Indicator */}
                  {rating.attachments && rating.attachments.length > 0 && (
                    <View style={styles.photosIndicator}>
                      <Ionicons name="images-outline" size={14} color="#6B7280" />
                      <Text style={styles.photosText}>
                        {rating.attachments.length} photo{rating.attachments.length > 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </AnimatedButton>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No ratings yet</Text>
              <Text style={styles.emptyStateText}>
                You haven&apos;t rated any services yet. Complete a request to leave a rating.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Side Menu */}
      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      {/* Rating Detail Modal */}
      <Modal
        visible={!!selectedRating}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedRating(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Rating Details</Text>
                <TouchableOpacity
                  onPress={() => setSelectedRating(null)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {selectedRating && (
                <>
                  {/* Request Info */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Request</Text>
                    <Text style={styles.modalValue}>
                      Request #{selectedRating.requestId.substring(0, 8)}
                    </Text>
                  </View>

                  {/* Service Provider */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Service Provider</Text>
                    <Text style={styles.modalValue}>Service Provider</Text>
                  </View>

                  {/* Rating */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Your Rating</Text>
                    <StarRating rating={selectedRating.rating} size={28} color="#10B981" />
                    <Text style={styles.ratingLabelText}>
                      {selectedRating.rating === 1 && "Poor"}
                      {selectedRating.rating === 2 && "Fair"}
                      {selectedRating.rating === 3 && "Good"}
                      {selectedRating.rating === 4 && "Very Good"}
                      {selectedRating.rating === 5 && "Excellent"}
                    </Text>
                  </View>

                  {/* Review Text */}
                  {selectedRating.reviewText && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Your Review</Text>
                      <Text style={styles.reviewFullText}>{selectedRating.reviewText}</Text>
                    </View>
                  )}

                  {/* Photos */}
                  {selectedRating.attachments && selectedRating.attachments.length > 0 && (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Photos</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.photosScroll}
                      >
                        {selectedRating.attachments.map((uri, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => handleImagePress(index)}
                            style={styles.photoThumbnail}
                          >
                            <Image source={{ uri }} style={styles.photoImage} />
                            <View style={styles.photoOverlay}>
                              <Ionicons name="expand-outline" size={20} color="#fff" />
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Service Provider Response */}
                  {selectedRating.responseText && (
                    <View style={[styles.modalSection, styles.responseSection]}>
                      <View style={styles.responseHeaderLarge}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#356FEC" />
                        <Text style={styles.responseHeaderText}>Provider Response</Text>
                      </View>
                      <Text style={styles.responseFullText}>{selectedRating.responseText}</Text>
                      {selectedRating.responseDate && (
                        <Text style={styles.responseDate}>
                          {formatDate(selectedRating.responseDate)}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Submission Date */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Submitted</Text>
                    <Text style={styles.modalValue}>{formatDate(selectedRating.createdAt)}</Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Viewer */}
      {selectedRating && selectedRating.attachments && selectedRating.attachments.length > 0 && (
        <ImageViewer
          images={selectedRating.attachments}
          initialIndex={selectedImageIndex}
          visible={showImageViewer}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
  },
  ratingsContainer: {
    paddingBottom: 20,
  },
  ratingCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  providerName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  ratingDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  reviewPreview: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 12,
  },
  readMore: {
    color: "#10B981",
    fontWeight: "600",
  },
  responseContainer: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  responseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#356FEC",
  },
  responseText: {
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },
  photosIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  photosText: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  ratingLabelText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 8,
  },
  reviewFullText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  photosScroll: {
    marginTop: 8,
  },
  photoThumbnail: {
    position: "relative",
    marginRight: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  photoImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  photoOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 16,
    padding: 6,
  },
  responseSection: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 16,
  },
  responseHeaderLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  responseHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#356FEC",
  },
  responseFullText: {
    fontSize: 15,
    color: "#1E40AF",
    lineHeight: 22,
    marginBottom: 8,
  },
  responseDate: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
  },
});
