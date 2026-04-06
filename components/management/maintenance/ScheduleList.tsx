import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import type { MaintenanceSchedule } from "../../../lib/types";
import { styles } from "./_styles";

interface ScheduleListProps {
  schedules: MaintenanceSchedule[];
  onSelect: (schedule: MaintenanceSchedule) => void;
  getMaintenanceTypeIcon: (type: MaintenanceSchedule["maintenanceType"]) => string;
  getStatusColor: (status: MaintenanceSchedule["status"]) => string;
}

export function ScheduleList({
  schedules,
  onSelect,
  getMaintenanceTypeIcon,
  getStatusColor,
}: ScheduleListProps) {
  if (!schedules.length) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="calendar-outline" size={64} color="#ccc" />
        <Text style={styles.emptyStateText}>No maintenance schedules found</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={schedules}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(index * 50)} style={styles.card}>
          <TouchableOpacity onPress={() => onSelect(item)}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View
                  style={[
                    styles.typeIcon,
                    { backgroundColor: getStatusColor(item.status) + "20" },
                  ]}
                >
                  <Ionicons
                    name={getMaintenanceTypeIcon(item.maintenanceType) as any}
                    size={24}
                    color={getStatusColor(item.status)}
                  />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.buildingName}</Text>
                </View>
              </View>
              <View
                style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}
              >
                <Text style={styles.statusBadgeText}>
                  {item.status.replace("_", " ").toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.cardDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {new Date(item.scheduledDate).toLocaleDateString()} at {item.scheduledTime}
                </Text>
              </View>
              {item.duration ? (
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>{item.duration}h duration</Text>
                </View>
              ) : null}
              {item.affectedAreas?.length ? (
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={16} color="#666" />
                  <Text style={styles.detailText}>{item.affectedAreas.join(", ")}</Text>
                </View>
              ) : null}
            </View>

            {item.notifiedTenants && (
              <View style={styles.notificationBadge}>
                <Ionicons name="notifications" size={14} color="#4CAF50" />
                <Text style={styles.notificationBadgeText}>Tenants Notified</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
      scrollEnabled={false}
    />
  );
}
