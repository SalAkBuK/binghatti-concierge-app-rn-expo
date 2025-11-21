import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { Building, Job, Request, RequestStatus } from "../../../../lib/types";
import { formatDateTime } from "../../../../lib/utils/helpers";
import { styles } from "../_styles";

interface RequestsListProps {
  requests: Request[];
  buildingMap: Map<string, Building>;
  getJobForRequest: (requestId: string) => Job | undefined;
  onSelect: (request: Request) => void;
}

const palette: Record<RequestStatus, { bg: string; text: string }> = {
  pending: { bg: "#FEF3C7", text: "#92400E" },
  "in-progress": { bg: "#DBEAFE", text: "#1D4ED8" },
  completed: { bg: "#D1FAE5", text: "#047857" },
  cancelled: { bg: "#FEE2E2", text: "#B91C1C" },
};

const RequestStatusBadge = ({ status }: { status: RequestStatus }) => {
  const colors = palette[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
};

export function RequestsList({
  requests,
  buildingMap,
  getJobForRequest,
  onSelect,
}: RequestsListProps) {
  if (!requests.length) {
    return (
      <Animated.View entering={FadeInDown.delay(200).duration(320)} style={styles.emptyState}>
        <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No requests found</Text>
        <Text style={styles.emptySubtitle}>
          Try adjusting filters or check another building.
        </Text>
      </Animated.View>
    );
  }

  return (
    <>
      {requests.map((request, index) => {
        const building = buildingMap.get(request.buildingId);
        const job = getJobForRequest(request.id);
        return (
          <Animated.View
            key={request.id}
            entering={FadeInDown.delay(180 + index * 60).duration(340)}
          >
            <TouchableOpacity
              style={styles.requestCard}
              onPress={() => onSelect(request)}
            >
              <View style={styles.requestCardHeader}>
                <Text style={styles.requestTitle}>{request.title}</Text>
                <RequestStatusBadge status={request.status} />
              </View>
              <Text style={styles.requestMeta}>
                {building?.name || "Building"} · Unit {request.apartment || "-"} ·
                {" "}
                {request.priority.toUpperCase()}
              </Text>
              <Text style={styles.requestDescription} numberOfLines={2}>
                {request.description}
              </Text>

              <View style={styles.requestFooter}>
                <View style={styles.footerGroup}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.footerText}>{formatDateTime(request.createdAt)}</Text>
                </View>
                <View style={styles.footerGroup}>
                  <Ionicons
                    name={job ? "construct-outline" : "alert-circle-outline"}
                    size={16}
                    color={job ? "#2563EB" : "#B91C1C"}
                  />
                  <Text
                    style={[
                      styles.footerText,
                      job ? styles.footerTextHighlight : styles.footerTextWarning,
                    ]}
                  >
                    {job ? `Job ${job.status.replace("-", " ")}` : "No work order"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </>
  );
}
