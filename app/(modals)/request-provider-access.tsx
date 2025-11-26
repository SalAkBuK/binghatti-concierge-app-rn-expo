import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../lib/context/connected-app-provider";
import type { ProviderAccessRequest } from "../../lib/types";

export default function RequestProviderAccessModal() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { currentUser, actions, serviceProviders, buildings, providerAccessRequests } = useApp();

  const providerId = params.providerId as string;
  const buildingId = params.buildingId as string;

  const provider = serviceProviders?.find((p) => p.id === providerId);
  const building = buildings?.find((b) => b.id === buildingId);

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if there's already a pending request
  const existingRequest = providerAccessRequests?.find(
    (req) =>
      req.serviceProviderId === providerId &&
      req.buildingId === buildingId &&
      req.status === "pending"
  );

  // Get provider's building assignments
  const assignments = actions?.getServiceProviderBuildingAssignments?.(providerId) ?? [];
  const assignedBuildings = assignments
    .filter((a) => a.status === "active")
    .map((a) => buildings?.find((b) => b.id === a.buildingId))
    .filter(Boolean);

  const handleSubmitRequest = async () => {
    if (!provider || !building || !currentUser) {
      Alert.alert("Error", "Missing required information");
      return;
    }

    if (existingRequest) {
      Alert.alert("Request Pending", "You already have a pending request for this provider.");
      return;
    }

    setIsSubmitting(true);
    try {
      const request: ProviderAccessRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        serviceProviderId: provider.id,
        serviceProviderName: provider.name,
        buildingId: building.id,
        buildingName: building.name,
        requestedBy: currentUser.id,
        requestedByName: currentUser.name,
        requestedAt: new Date().toISOString(),
        status: "pending",
        notes: notes.trim() || undefined,
      };

      // Add the request to the system (you'll need to implement this in context)
      if (actions?.createProviderAccessRequest) {
        await actions.createProviderAccessRequest(request);
      }

      // Create notification for admin users
      if (actions?.createNotification && actions?.getUsers) {
        // Find all admin users and send them notifications
        const allUsers = actions.getUsers();
        const adminUsers = allUsers.filter(
          (u) => u.role === "admin" || u.role === "super_admin"
        );

        for (const admin of adminUsers) {
          actions.createNotification(
            admin.id,
            "Provider Access Request",
            `${currentUser.name} requests ${provider.name} for ${building.name}`,
            "info"
          );
        }
      }

      Alert.alert(
        "Request Sent",
        `Your request for ${provider.name} has been sent to the admin team.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting request:", error);
      Alert.alert("Error", "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!provider || !building) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#111827" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Provider or building not found</Text>
        </View>
      </View>
    );
  }

  const isAlreadyAssigned = assignments.some(
    (a) => a.buildingId === buildingId && a.status === "active"
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Provider Access</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Provider Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Provider</Text>
          <View style={styles.providerCard}>
            <View style={styles.providerHeader}>
              <View style={styles.providerIcon}>
                <Ionicons name="construct" size={24} color="#2563EB" />
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{provider.name}</Text>
                <Text style={styles.providerSpecialty}>{provider.specialty}</Text>
              </View>
            </View>
            <View style={styles.providerStats}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.statText}>{provider.rating.toFixed(1)}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.statText}>{provider.jobsCompleted} jobs</Text>
              </View>
              {provider.responseTimeMinutes && (
                <View style={styles.statItem}>
                  <Ionicons name="time" size={16} color="#6B7280" />
                  <Text style={styles.statText}>{provider.responseTimeMinutes}m response</Text>
                </View>
              )}
            </View>
            <View style={styles.providerContact}>
              <Ionicons name="call-outline" size={16} color="#6B7280" />
              <Text style={styles.contactText}>{provider.phone}</Text>
            </View>
            {provider.email && (
              <View style={styles.providerContact}>
                <Ionicons name="mail-outline" size={16} color="#6B7280" />
                <Text style={styles.contactText}>{provider.email}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Currently Assigned Buildings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currently Assigned To</Text>
          {assignedBuildings.length > 0 ? (
            <View style={styles.buildingsList}>
              {assignedBuildings.map((bldg) => (
                <View key={bldg!.id} style={styles.buildingChip}>
                  <Ionicons name="business" size={14} color="#2563EB" />
                  <Text style={styles.buildingChipText}>{bldg!.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>Not currently assigned to any buildings</Text>
          )}
        </View>

        {/* Request Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Building</Text>
          <View style={styles.requestBuilding}>
            <Ionicons name="business-outline" size={20} color="#111827" />
            <Text style={styles.requestBuildingText}>{building.name}</Text>
          </View>
        </View>

        {/* Notes Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <Text style={styles.sectionDescription}>
            Explain why you need this service provider for your building
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder="e.g., We need urgent HVAC maintenance support..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>

        {/* Status Messages */}
        {isAlreadyAssigned && (
          <View style={[styles.statusBanner, styles.successBanner]}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            <Text style={styles.successBannerText}>
              This provider is already assigned to your building
            </Text>
          </View>
        )}

        {existingRequest && (
          <View style={[styles.statusBanner, styles.warningBanner]}>
            <Ionicons name="time" size={20} color="#F59E0B" />
            <Text style={styles.warningBannerText}>
              You have a pending request for this provider
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (isAlreadyAssigned || !!existingRequest || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmitRequest}
          disabled={isAlreadyAssigned || !!existingRequest || isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting
              ? "Submitting..."
              : isAlreadyAssigned
                ? "Already Assigned"
                : existingRequest
                  ? "Request Pending"
                  : "Submit Request"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  providerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  providerSpecialty: {
    fontSize: 14,
    color: "#6B7280",
  },
  providerStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  providerContact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  contactText: {
    fontSize: 14,
    color: "#4B5563",
  },
  buildingsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  buildingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  buildingChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2563EB",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  requestBuilding: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  requestBuildingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  notesInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#111827",
    minHeight: 120,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  successBanner: {
    backgroundColor: "#D1FAE5",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  successBannerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#065F46",
    flex: 1,
  },
  warningBanner: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  warningBannerText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#92400E",
    flex: 1,
  },
  footer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
  },
});
