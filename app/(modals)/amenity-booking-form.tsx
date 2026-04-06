import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppDomain } from "../../lib/context/connected-app-provider";
import type { Amenity } from "../../lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const generateTimeSlots = (
  openTime: string,
  closeTime: string,
  durationMinutes: number,
): { time: string; available: boolean }[] => {
  const slots: { time: string; available: boolean }[] = [];
  const [openHour, openMin] = openTime.split(":").map(Number);
  const [closeHour, closeMin] = closeTime.split(":").map(Number);

  let currentHour = openHour;
  let currentMin = openMin;

  while (
    currentHour < closeHour ||
    (currentHour === closeHour && currentMin < closeMin)
  ) {
    const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
    // Mock some slots as unavailable (randomly)
    // NOTE: Using slot time as seed for consistent availability across re-renders
    const seed = (currentHour * 60 + currentMin) % 10;
    const available = seed > 3; // Consistent availability based on time
    slots.push({ time: timeStr, available });

    currentMin += durationMinutes;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }

  return slots;
};

// Helper function to calculate end time
const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hour, min] = startTime.split(":").map(Number);
  let endMin = min + durationMinutes;
  let endHour = hour;

  if (endMin >= 60) {
    endHour += Math.floor(endMin / 60);
    endMin = endMin % 60;
  }

  return `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;
};

export default function AmenityBookingFormScreen() {
  const params = useLocalSearchParams();
  const {
    amenityVisitor: { amenities, createBooking },
  } = useAppDomain();
  const amenityId = params.amenityId as string;

  const [amenity, setAmenity] = useState<Amenity | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [numberOfGuests, setNumberOfGuests] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<
    { time: string; available: boolean }[]
  >([]);

  // Load amenity on mount
  useEffect(() => {
    const foundAmenity = amenities.find((a) => a.id === amenityId);
    if (foundAmenity) {
      setAmenity(foundAmenity);
    }
  }, [amenityId, amenities]);

  // Generate time slots when amenity or date changes
  useEffect(() => {
    if (!amenity) return;

    const dayName = selectedDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const hours = amenity.operatingHours[dayName];

    if (hours) {
      const slots = generateTimeSlots(
        hours.open,
        hours.close,
        amenity.bookingDurationMinutes,
      );
      setTimeSlots(slots);
    }
  }, [amenity, selectedDate]); // Only depend on amenity and selectedDate

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
      setSelectedSlot(null); // Reset slot when date changes
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedSlot) {
      Alert.alert("Error", "Please select a time slot");
      return;
    }

    if (!numberOfGuests || parseInt(numberOfGuests) <= 0) {
      Alert.alert("Error", "Please enter number of guests");
      return;
    }

    if (amenity && parseInt(numberOfGuests) > amenity.capacity) {
      Alert.alert(
        "Error",
        `Number of guests cannot exceed capacity (${amenity.capacity})`,
      );
      return;
    }

    const bookingDate = selectedDate.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    if (bookingDate < today) {
      Alert.alert("Error", "Booking date must be in the future");
      return;
    }

    setLoading(true);

    try {
      // Create booking using context actions
      const bookingData = {
        amenityId,
        slotDate: selectedDate.toISOString().split("T")[0],
        slotTimeStart: selectedSlot!,
        slotTimeEnd: calculateEndTime(selectedSlot!, amenity!.bookingDurationMinutes),
        numberOfGuests: parseInt(numberOfGuests),
        bookingNotes,
      };

      const newBooking = await createBooking(bookingData);

      Alert.alert(
        "Booking Confirmed!",
        `Your booking has been confirmed.\n\nBooking Code: ${newBooking.bookingCode}\n\nYou can view your booking in the My Bookings tab.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      Alert.alert("Error", "Failed to create booking. Please try again.");
      console.error("Booking error:", error);
    } finally {
      setLoading(false);
    }
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

  if (!amenity) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7034FF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Amenity</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Amenity Details */}
          <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.amenityHeader}
          >
            <View style={styles.amenityIconContainer}>
              <Ionicons
                name={getAmenityIcon(amenity.amenityType)}
                size={32}
                color={getAmenityIconColor(amenity.amenityType)}
              />
            </View>
            <View style={styles.amenityHeaderText}>
              <Text style={styles.amenityName}>{amenity.name}</Text>
              <View style={styles.amenityMetaRow}>
                <Ionicons name="people-outline" size={14} color="#6B7280" />
                <Text style={styles.amenityMetaText}>
                  Capacity: {amenity.capacity}
                </Text>
              </View>
              <View style={styles.amenityMetaRow}>
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.amenityMetaText}>
                  {amenity.operatingHours.monday?.open} -{" "}
                  {amenity.operatingHours.monday?.close}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Date Picker */}
          <Animated.View
            entering={FadeInDown.delay(50).duration(400)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Select Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.dateButtonText}>
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                minimumDate={new Date()}
                maximumDate={
                  new Date(
                    Date.now() +
                      amenity.maxAdvanceBookingDays * 24 * 60 * 60 * 1000,
                  )
                }
              />
            )}
          </Animated.View>

          {/* Time Slots */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Select Time Slot</Text>
            <View style={styles.slotsGrid}>
              {timeSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.slotButton,
                    !slot.available && styles.slotButtonDisabled,
                    selectedSlot === slot.time && styles.slotButtonSelected,
                  ]}
                  onPress={() => slot.available && setSelectedSlot(slot.time)}
                  disabled={!slot.available}
                >
                  <Text
                    style={[
                      styles.slotButtonText,
                      !slot.available && styles.slotButtonTextDisabled,
                      selectedSlot === slot.time &&
                        styles.slotButtonTextSelected,
                    ]}
                  >
                    {slot.time}
                  </Text>
                  {!slot.available && (
                    <Text style={styles.slotButtonSubtext}>Booked</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Number of Guests */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(400)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Number of Guests *</Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter number (max ${amenity.capacity})`}
              keyboardType="numeric"
              value={numberOfGuests}
              onChangeText={setNumberOfGuests}
              maxLength={3}
            />
          </Animated.View>

          {/* Booking Notes */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>
              Booking Notes (Optional)
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any special requests or notes..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={bookingNotes}
              onChangeText={setBookingNotes}
            />
          </Animated.View>

          {/* Summary */}
          {selectedSlot && numberOfGuests && (
            <Animated.View
              entering={FadeInDown.delay(250).duration(400)}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryTitle}>Booking Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Amenity:</Text>
                <Text style={styles.summaryValue}>{amenity.name}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date:</Text>
                <Text style={styles.summaryValue}>
                  {selectedDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Time:</Text>
                <Text style={styles.summaryValue}>{selectedSlot}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Guests:</Text>
                <Text style={styles.summaryValue}>{numberOfGuests}</Text>
              </View>
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedSlot || !numberOfGuests || loading) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedSlot || !numberOfGuests || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Confirm Booking</Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  amenityHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  amenityIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  amenityHeaderText: {
    flex: 1,
  },
  amenityName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  amenityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  amenityMetaText: {
    fontSize: 13,
    color: "#6B7280",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    gap: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: "#1F2937",
    flex: 1,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5, // Negative margin to offset gap
  },
  slotButton: {
    width: (SCREEN_WIDTH - 50) / 3 - 10, // Account for padding and gap
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#10B981",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    margin: 5, // Replace gap with margin for better Android compatibility
  },
  slotButtonDisabled: {
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  slotButtonSelected: {
    borderColor: "#7034FF",
    backgroundColor: "#EDE9FE",
  },
  slotButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#065F46",
  },
  slotButtonTextDisabled: {
    color: "#9CA3AF",
  },
  slotButtonTextSelected: {
    color: "#7034FF",
  },
  slotButtonSubtext: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 16,
    fontSize: 15,
    backgroundColor: "#fff",
    color: "#1F2937",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  summaryCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    color: "#1E40AF",
    fontWeight: "700",
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
    backgroundColor: "#7034FF",
    borderRadius: 8,
    paddingVertical: 16,
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
