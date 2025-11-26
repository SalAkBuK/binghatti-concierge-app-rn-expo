import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import type { Building } from "../../../../lib/types";
import { STATUS_FILTERS, VIEW_MODES } from "../_constants";
import type { StatusFilter, ViewMode } from "../_constants";
import { styles } from "../_styles";

interface FiltersPanelProps {
  buildingOptions: Building[];
  selectedBuildingId: string;
  onSelectBuilding: (buildingId: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onCreatePress: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function FiltersPanel({
  buildingOptions,
  selectedBuildingId,
  onSelectBuilding,
  statusFilter,
  onStatusChange,
  searchQuery,
  onSearchChange,
  onCreatePress,
  viewMode,
  onViewModeChange,
}: FiltersPanelProps) {
  return (
    <View style={styles.filters}>
      <View style={styles.viewModeContainer}>
        {VIEW_MODES.map((mode, index) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.viewModeButton,
              viewMode === mode && styles.activeViewMode,
            ]}
            onPress={() => onViewModeChange(mode)}
          >
            <Ionicons
              name={index === 0 ? "list" : "calendar"}
              size={16}
              color={viewMode === mode ? "#00796B" : "#666"}
            />
            <Text
              style={[
                styles.viewModeText,
                viewMode === mode && styles.activeViewModeText,
              ]}
            >
              {mode === "list" ? "List" : "Calendar"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.filterItem}>
        <Text style={styles.filterLabel}>Building:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedBuildingId === "all" && styles.activeFilterChip]}
            onPress={() => onSelectBuilding("all")}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedBuildingId === "all" && styles.activeFilterChipText,
              ]}
            >
              All Buildings
            </Text>
          </TouchableOpacity>
          {buildingOptions.map((building) => (
            <TouchableOpacity
              key={building.id}
              style={[
                styles.filterChip,
                selectedBuildingId === building.id && styles.activeFilterChip,
              ]}
              onPress={() => onSelectBuilding(building.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedBuildingId === building.id && styles.activeFilterChipText,
                ]}
              >
                {building.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterItem}>
        <Text style={styles.filterLabel}>Status:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {STATUS_FILTERS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, statusFilter === status && styles.activeFilterChip]}
              onPress={() => onStatusChange(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  statusFilter === status && styles.activeFilterChipText,
                ]}
              >
                {status === "all"
                  ? "All"
                  : status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search schedules..."
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity style={styles.createButton} onPress={onCreatePress}>
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.createButtonText}>Schedule Maintenance</Text>
      </TouchableOpacity>
    </View>
  );
}
