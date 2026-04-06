import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

type RequestDetailsDeleteModalProps = {
  visible: boolean;
  loading: boolean;
  requestTitle: string;
  onClose: () => void;
  onConfirm: () => void;
  styles: Record<string, any>;
};

export function RequestDetailsDeleteModal({
  visible,
  loading,
  requestTitle,
  onClose,
  onConfirm,
  styles,
}: RequestDetailsDeleteModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.modalContent}>
          <View style={styles.modalIcon}>
            <Ionicons name="trash-outline" size={32} color="#DC2626" />
          </View>
          <Text style={styles.modalTitle}>Cancel Request</Text>
          <Text style={styles.modalMessage}>
            Are you sure you want to cancel this request? This action cannot be
            undone.
          </Text>
          <View style={styles.modalRequestInfo}>
            <Text style={styles.modalRequestTitle}>{requestTitle}</Text>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalDeleteButton}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalDeleteButtonText}>Cancel Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
