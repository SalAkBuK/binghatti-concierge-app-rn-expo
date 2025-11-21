import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  pickImageFromCamera,
  pickMultipleImagesFromGallery,
  IMAGE_CONFIG,
} from "../../lib/utils/imageUtils";

interface AttachmentPickerProps {
  attachments: string[];
  onAttachmentsChange: (attachments: string[]) => void;
  maxAttachments?: number;
  disabled?: boolean;
}

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  attachments,
  onAttachmentsChange,
  maxAttachments = IMAGE_CONFIG.MAX_ATTACHMENTS,
  disabled = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAddPhotos = () => {
    if (attachments.length >= maxAttachments) {
      Alert.alert(
        "Maximum Reached",
        `You can only attach up to ${maxAttachments} photos per request.`,
      );
      return;
    }

    Alert.alert(
      "Add Photos",
      "Choose how you want to add photos",
      [
        {
          text: "Camera",
          onPress: handleCamera,
        },
        {
          text: "Gallery",
          onPress: handleGallery,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true },
    );
  };

  const handleCamera = async () => {
    try {
      setIsLoading(true);
      const uri = await pickImageFromCamera();

      if (uri) {
        if (attachments.length < maxAttachments) {
          onAttachmentsChange([...attachments, uri]);
        } else {
          Alert.alert(
            "Maximum Reached",
            `You can only attach up to ${maxAttachments} photos.`,
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to capture photo. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGallery = async () => {
    try {
      setIsLoading(true);
      const remainingSlots = maxAttachments - attachments.length;

      if (remainingSlots <= 0) {
        Alert.alert(
          "Maximum Reached",
          `You can only attach up to ${maxAttachments} photos.`,
        );
        return;
      }

      const uris = await pickMultipleImagesFromGallery(remainingSlots);

      if (uris.length > 0) {
        onAttachmentsChange([...attachments, ...uris]);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to select photos. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    Alert.alert(
      "Remove Photo",
      "Are you sure you want to remove this photo?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const newAttachments = attachments.filter((_, i) => i !== index);
            onAttachmentsChange(newAttachments);
          },
        },
      ],
    );
  };

  const renderAttachment = (uri: string, index: number) => {
    return (
      <View key={index} style={styles.attachmentContainer}>
        <Image source={{ uri }} style={styles.attachmentImage} />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveAttachment(index)}
        >
          <Ionicons name="close-circle" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Photos</Text>
        <Text style={styles.helperText}>
          {attachments.length}/{maxAttachments} photos
        </Text>
      </View>

      {attachments.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.attachmentsScroll}
          contentContainerStyle={styles.attachmentsScrollContent}
        >
          {attachments.map((uri, index) => renderAttachment(uri, index))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={[
          styles.addButton,
          (disabled || attachments.length >= maxAttachments) &&
            styles.addButtonDisabled,
        ]}
        onPress={handleAddPhotos}
        disabled={disabled || attachments.length >= maxAttachments || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#2563EB" />
        ) : (
          <>
            <Ionicons
              name="camera"
              size={20}
              color={
                disabled || attachments.length >= maxAttachments
                  ? "#9CA3AF"
                  : "#2563EB"
              }
            />
            <Text
              style={[
                styles.addButtonText,
                (disabled || attachments.length >= maxAttachments) &&
                  styles.addButtonTextDisabled,
              ]}
            >
              {attachments.length === 0 ? "Add Photos" : "Add More Photos"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.infoText}>
        Max {IMAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB per photo. JPEG, PNG,
        WebP supported.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  helperText: {
    fontSize: 14,
    color: "#6B7280",
  },
  attachmentsScroll: {
    marginBottom: 12,
  },
  attachmentsScrollContent: {
    paddingRight: 16,
  },
  attachmentContainer: {
    position: "relative",
    marginRight: 12,
  },
  attachmentImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2563EB",
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#EFF6FF",
  },
  addButtonDisabled: {
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2563EB",
    marginLeft: 8,
  },
  addButtonTextDisabled: {
    color: "#9CA3AF",
  },
  infoText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
});
