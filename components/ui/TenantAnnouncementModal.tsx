import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type TenantAnnouncementPreview = {
  id?: string;
  title: string;
  body: string;
  scheduledAt?: string | null;
  affectedAreas?: string[];
};

type TenantAnnouncementModalProps = {
  announcement: TenantAnnouncementPreview | null;
  visible: boolean;
  onClose: () => void;
  onClear?: (announcement: TenantAnnouncementPreview) => void | Promise<void>;
  clearing?: boolean;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function TenantAnnouncementModal({
  announcement,
  visible,
  onClose,
  onClear,
  clearing = false,
}: TenantAnnouncementModalProps) {
  const insets = useSafeAreaInsets();
  const formattedDate = formatDateTime(announcement?.scheduledAt);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Building Update</Text>
              <Text style={styles.title}>
                {announcement?.title || "Building Notice"}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Announcement</Text>
            </View>
            {formattedDate ? (
              <Text style={styles.metaText}>{formattedDate}</Text>
            ) : null}
          </View>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.body}>
              {announcement?.body ||
                "No additional details were provided for this building notice."}
            </Text>

            {announcement?.affectedAreas?.length ? (
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color="#4D6169"
                  />
                  <Text style={styles.infoTitle}>Audience</Text>
                </View>
                <Text style={styles.infoValue}>
                  {announcement.affectedAreas.join(", ")}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actionRow}>
            {announcement?.id && onClear ? (
              <TouchableOpacity
                style={[styles.secondaryAction, clearing && styles.secondaryActionDisabled]}
                onPress={() => void onClear(announcement)}
                disabled={clearing}
              >
                {clearing ? (
                  <ActivityIndicator size="small" color="#B24A41" />
                ) : (
                  <Text style={styles.secondaryActionText}>Clear</Text>
                )}
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.action, clearing && styles.actionDisabled]}
              onPress={onClose}
              disabled={clearing}
            >
              <Text style={styles.actionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 48,
  },
  card: {
    maxHeight: "84%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4D6169",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#1F2937",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  pill: {
    borderRadius: 999,
    backgroundColor: "#E8F1F4",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#34474D",
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
    textAlign: "right",
  },
  bodyScroll: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: "#374151",
  },
  infoCard: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: "#F8FAFB",
    borderWidth: 1,
    borderColor: "#E5EAED",
    padding: 14,
    gap: 8,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4D6169",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#FCE3E0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E9B7B0",
  },
  secondaryActionDisabled: {
    opacity: 0.7,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#B24A41",
  },
  action: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#4D6169",
    alignItems: "center",
    justifyContent: "center",
  },
  actionDisabled: {
    opacity: 0.7,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
