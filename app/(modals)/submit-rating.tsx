import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AttachmentPicker } from "../../components/ui/AttachmentPicker";
import { StarRating } from "../../components/ui/StarRating";
import { useApp } from "../../lib/context/connected-app-provider";

const MAX_REVIEW_LENGTH = 500;

export default function SubmitRatingScreen() {
  const params = useLocalSearchParams();
  const requestId = params.requestId as string;
  const serviceProviderId = params.serviceProviderId as string;
  const requestTitle = params.requestTitle as string;
  const serviceProviderName = params.serviceProviderName as string;

  const { actions } = useApp();
  const [rating, setRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    // Validate rating
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating (1-5)");
      return;
    }

    try {
      setLoading(true);

      await actions.submitRating({
        requestId,
        serviceProviderId,
        rating,
        reviewText: reviewText.trim(),
        attachments,
      });

      Alert.alert(
        "Rating Submitted",
        "Thank you for your feedback!",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to submit rating");
    } finally {
      setLoading(false);
    }
  };

  const characterCount = reviewText.length;
  const characterCountColor = characterCount > MAX_REVIEW_LENGTH ? "#DC2626" : "#6B7280";

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Service</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Request Info Card */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(400)}
            style={styles.infoCard}
          >
            <View style={styles.infoRow}>
              <Ionicons name="clipboard-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Request</Text>
            </View>
            <Text style={styles.infoValue}>{requestTitle || "Service Request"}</Text>

            <View style={[styles.infoRow, styles.infoRowMargin]}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Service Provider</Text>
            </View>
            <Text style={styles.infoValue}>
              {serviceProviderName || "Service Provider"}
            </Text>
          </Animated.View>

          {/* Star Rating Section */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.section}
          >
            <View style={styles.labelRow}>
              <Text style={styles.label}>Rating</Text>
              <Text style={styles.required}>*</Text>
            </View>
            <View style={styles.ratingContainer}>
              <StarRating
                rating={rating}
                size={40}
                onRatingChange={setRating}
                color="#FFD700"
              />
            </View>
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </Text>
            )}
          </Animated.View>

          {/* Review Text Section */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(400)}
            style={styles.section}
          >
            <View style={styles.labelRow}>
              <Text style={styles.label}>Review (Optional)</Text>
              <Text style={[styles.charCount, { color: characterCountColor }]}>
                {characterCount}/{MAX_REVIEW_LENGTH}
              </Text>
            </View>
            <TextInput
              style={styles.textArea}
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="Share your experience with this service..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={MAX_REVIEW_LENGTH}
            />
          </Animated.View>

          {/* Photo Attachments Section */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.section}
          >
            <Text style={styles.label}>Photos (Optional)</Text>
            <AttachmentPicker
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              maxAttachments={3}
            />
          </Animated.View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={rating === 0 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="star" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoRowMargin: {
    marginTop: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 28,
  },
  section: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  required: {
    fontSize: 16,
    color: "#DC2626",
    marginLeft: 4,
  },
  charCount: {
    fontSize: 14,
    fontWeight: "500",
  },
  ratingContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
    textAlign: "center",
    marginTop: 12,
  },
  textArea: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  footer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#356FEC",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
