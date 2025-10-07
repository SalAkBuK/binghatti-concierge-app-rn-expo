import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AnimatedButton } from "../ui/AnimatedButton";

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
  width?: number;
}

interface EntityTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowPress?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  keyExtractor: (item: T) => string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function EntityTable<T>({
  data,
  columns,
  onRowPress,
  loading = false,
  emptyMessage = "No data available",
  searchPlaceholder = "Search...",
  onSearch,
  keyExtractor,
  refreshing = false,
  onRefresh,
}: EntityTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const { width } = useWindowDimensions();
  const isCompact = width < 768;
  const cellMinWidth = Math.max(140, Math.min(220, width * 0.5));

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const renderItem = ({ item, index }: { item: T; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
      <AnimatedButton
        style={[styles.row, isCompact && styles.rowCompact]}
        onPress={() => onRowPress?.(item)}
        disabled={!onRowPress}
      >
        {columns.map((column) => {
          const baseStyle =
            column.width && !isCompact ? { width: column.width } : { flex: 1 };
          const responsiveStyle = isCompact
            ? {
                minWidth: cellMinWidth,
                flexBasis: cellMinWidth,
                marginRight: 0,
                marginBottom: 12,
              }
            : {};

          return (
            <View
              key={column.key}
              style={[styles.cell, baseStyle, responsiveStyle]}
            >
              {column.render(item)}
            </View>
          );
        })}
        {onRowPress && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#6B7280"
            style={isCompact ? styles.chevronIconCompact : undefined}
          />
        )}
      </AnimatedButton>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      {onSearch && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Table Header */}
      <View style={[styles.header, isCompact && styles.headerCompact]}>
        {columns.map((column) => {
          const baseStyle =
            column.width && !isCompact ? { width: column.width } : { flex: 1 };
          const responsiveStyle = isCompact
            ? {
                minWidth: cellMinWidth,
                flexBasis: cellMinWidth,
                marginRight: 0,
                marginBottom: 8,
              }
            : {};

          return (
            <View
              key={column.key}
              style={[styles.headerCell, baseStyle, responsiveStyle]}
            >
              <Text style={styles.headerText}>{column.label}</Text>
            </View>
          );
        })}
        {onRowPress && !isCompact && <View style={styles.chevronPlaceholder} />}
      </View>

      {/* Table Body */}
      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Loading...</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="documents-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateText}>{emptyMessage}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  header: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  headerCompact: {
    flexWrap: "wrap",
  },
  headerCell: {
    marginRight: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    textTransform: "uppercase",
  },
  chevronPlaceholder: {
    width: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rowCompact: {
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  cell: {
    marginRight: 12,
  },
  chevronIconCompact: {
    marginTop: 4,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
});
