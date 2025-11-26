import React from "react";
import { ScrollView, Text, TouchableOpacity, ViewStyle } from "react-native";

import { FILTER_OPTIONS } from "../_constants";
import { styles } from "../_styles";
import type { FilterType } from "../_types";

interface FilterTabsProps {
  filterType: FilterType;
  setFilterType: (filter: FilterType) => void;
  isCompact: boolean;
}

export function FilterTabs({ filterType, setFilterType, isCompact }: FilterTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersScrollContent as ViewStyle}
    >
      {FILTER_OPTIONS.map((filter) => (
        <TouchableOpacity
          key={filter.value}
          style={[
            styles.filterButton,
            isCompact && styles.filterButtonCompact,
            filterType === filter.value && styles.filterButtonActive,
          ]}
          onPress={() => setFilterType(filter.value)}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterType === filter.value && styles.filterButtonTextActive,
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
