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
  getId?: (item: T) => string | number;
  onRowPress?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  keyExtractor?: (item: T, index: number) => string;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * Universal key extractor that safely handles any entity type
 * Works for Admin, Management, and all other roles
 *
 * Priority order for key generation:
 * 1. item.id (if valid string/number)
 * 2. item.email (common identifier)
 * 3. item.name (fallback)
 * 4. index (last resort - stable for static lists)
 */
function defaultKeyExtractor<T>(item: T, index: number): string {
  const entity = item as any;

  // Try ID first
  if (entity.id != null && entity.id !== undefined && entity.id !== '' && entity.id !== 'NaN') {
    const idString = String(entity.id);
    if (idString !== 'NaN' && idString !== 'undefined' && idString !== 'null') {
      return idString;
    }
  }

  // Try email
  if (entity.email && typeof entity.email === 'string' && entity.email.length > 0) {
    return `email_${entity.email}`;
  }

  // Try name
  if (entity.name && typeof entity.name === 'string' && entity.name.length > 0) {
    return `name_${entity.name}_${index}`;
  }

  // Fallback to index (stable for static lists)
  return `index_${index}`;
}

export function EntityTable<T>({
  data,
  columns,
  getId,
  onRowPress,
  loading = false,
  emptyMessage = "No data available",
  searchPlaceholder = "Search...",
  onSearch,
  keyExtractor = defaultKeyExtractor,
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

  // Wrap keyExtractor to add validation and logging
  const safeKeyExtractor = (item: T, index: number): string => {
    try {
      const primaryKey = getId ? getId(item) : undefined;
      const key = primaryKey !== undefined && primaryKey !== null && `${primaryKey}` !== "NaN"
        ? String(primaryKey)
        : keyExtractor(item, index);

      // Validate the key
      if (!key || key === 'undefined' || key === 'null' || key === 'NaN') {
        console.warn('[EntityTable] Invalid key generated:', key, 'for item:', item);
        return defaultKeyExtractor(item, index);
      }

      return key;
    } catch (error) {
      console.error('[EntityTable] Error in keyExtractor:', error, 'for item:', item);
      return defaultKeyExtractor(item, index);
    }
  };

  const renderItem = React.useCallback(
    ({ item, index }: { item: T; index: number }) => {
      // Only animate first 15 items to prevent memory accumulation and lag
      // Cap animation delay to max 300ms to avoid stacked delays
      const shouldAnimate = index < 15;
      const animationDelay = shouldAnimate ? Math.min(index * 20, 300) : 0;

      const content = (
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
      );

      // Only wrap first 15 items with animation
      return shouldAnimate ? (
        <Animated.View entering={FadeInDown.delay(animationDelay).duration(300)}>
          {content}
        </Animated.View>
      ) : (
        <View>{content}</View>
      );
    },
    [cellMinWidth, columns, isCompact, onRowPress],
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
          keyExtractor={safeKeyExtractor}
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
    paddingBottom: 100, // Extra space for bottom tab bar (74px + safe area insets)
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
