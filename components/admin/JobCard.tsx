import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { Job, JobStatus } from "../../lib/types";

interface JobCardProps {
  job: Job;
  showAssignee?: boolean;
}

export function JobCard({ job, showAssignee = true }: JobCardProps) {
  const getStatusColors = (status: JobStatus) => {
    const colors = {
      pending: { bg: "#FEF3C7", text: "#92400E" },
      assigned: { bg: "#DBEAFE", text: "#1E40AF" },
      "in-progress": { bg: "#E0E7FF", text: "#4338CA" },
      completed: { bg: "#D1FAE5", text: "#065F46" },
      cancelled: { bg: "#FEE2E2", text: "#DC2626" },
    };
    return colors[status] || colors.pending;
  };

  const statusColors = getStatusColors(job.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="construct-outline" size={18} color="#6B7280" />
          <Text style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
          <Text style={[styles.statusText, { color: statusColors.text }]}>
            {job.status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.details}>
        {job.requestId && (
          <View style={styles.detailRow}>
            <Ionicons name="link-outline" size={14} color="#6B7280" />
            <Text style={styles.detailText}>Request #{job.requestId.slice(0, 8)}</Text>
          </View>
        )}

        {showAssignee && job.assignedTo && (
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={14} color="#6B7280" />
            <Text style={styles.detailText}>Assigned to provider</Text>
          </View>
        )}

        {job.estimatedCost && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              Est: AED {job.estimatedCost}
              {job.actualCost && ` | Actual: AED ${job.actualCost}`}
            </Text>
          </View>
        )}

        {job.scheduledDate && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              {new Date(job.scheduledDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: "#6B7280",
  },
});
