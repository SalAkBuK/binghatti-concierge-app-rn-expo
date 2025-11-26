import React from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";

import { STATUS_OPTIONS } from "../_constants";
import type { StatusFilter } from "../_types";
import { styles } from "../_styles";

interface StatusFilterChipsProps {
  statusFilter: StatusFilter;
  onSelect: (filter: StatusFilter) => void;
}

export function StatusFilterChips({ statusFilter, onSelect }: StatusFilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.statusChipRow}
    >
      {STATUS_OPTIONS.map((option) => {
        const active = option.value === statusFilter;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.statusChip, active && styles.statusChipActive]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[styles.statusChipText, active && styles.statusChipTextActive]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
