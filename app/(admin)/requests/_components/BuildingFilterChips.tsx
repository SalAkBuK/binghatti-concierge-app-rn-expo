import React from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";

import type { Building } from "../../../../lib/types";
import { styles } from "../_styles";

interface BuildingFilterChipsProps {
  buildings: Building[];
  selectedBuildingId: string;
  onSelect: (buildingId: string) => void;
}

export function BuildingFilterChips({
  buildings,
  selectedBuildingId,
  onSelect,
}: BuildingFilterChipsProps) {
  if (buildings.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterChipRow}
    >
      <TouchableOpacity
        style={[
          styles.filterChip,
          selectedBuildingId === "all" && styles.filterChipActive,
        ]}
        onPress={() => onSelect("all")}
      >
        <Text
          style={[
            styles.filterChipText,
            selectedBuildingId === "all" && styles.filterChipTextActive,
          ]}
        >
          All
        </Text>
      </TouchableOpacity>
      {buildings.map((building) => {
        const active = building.id === selectedBuildingId;
        return (
          <TouchableOpacity
            key={building.id}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onSelect(building.id)}
          >
            <Text
              style={[styles.filterChipText, active && styles.filterChipTextActive]}
            >
              {building.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
