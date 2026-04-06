import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { HeaderBar } from '../../../components/ui/HeaderBar';
import type { Building, Request, RequestStatus } from '../../../lib/types';

type StatusFilter = 'all' | RequestStatus;
type PriorityFilter = 'all' | Request['priority'];
type TypeFilter = 'all' | NonNullable<Request['type']>;

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

type ManagementRequestsFiltersProps = {
  buildingFilterOptions: Building[];
  hasUnreadNotifications: boolean;
  notificationRoute: string;
  onSideMenuToggle: (visible: boolean) => void;
  pageAnimated: boolean;
  priorityFilter: PriorityFilter;
  priorityOptions: PriorityFilter[];
  searchQuery: string;
  selectedBuildingId: string;
  setPriorityFilter: (value: PriorityFilter) => void;
  setSearchQuery: (value: string) => void;
  setSelectedBuildingId: (value: string) => void;
  setStatusFilter: (value: StatusFilter) => void;
  setTypeFilter: (value: TypeFilter) => void;
  showSideMenu: boolean;
  statusFilter: StatusFilter;
  typeFilter: TypeFilter;
  typeOptions: TypeFilter[];
};

export const ManagementRequestsFilters = ({
  buildingFilterOptions,
  hasUnreadNotifications,
  notificationRoute,
  onSideMenuToggle,
  pageAnimated,
  priorityFilter,
  priorityOptions,
  searchQuery,
  selectedBuildingId,
  setPriorityFilter,
  setSearchQuery,
  setSelectedBuildingId,
  setStatusFilter,
  setTypeFilter,
  showSideMenu,
  statusFilter,
  typeFilter,
  typeOptions,
}: ManagementRequestsFiltersProps) => {
  const getHeaderEntering = (delay: number) =>
    pageAnimated ? FadeInDown.delay(delay).duration(280) : undefined;

  return (
    <>
      <HeaderBar
        title="Service Requests"
        subtitle="Track and resolve maintenance across your buildings"
        hasUnreadNotifications={hasUnreadNotifications}
        showSideMenu={showSideMenu}
        onSideMenuToggle={onSideMenuToggle}
        notificationRoute={notificationRoute}
      />

      {buildingFilterOptions.length > 1 ? (
        <Animated.View
          entering={getHeaderEntering(80)}
          style={styles.filterRow}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRowContent}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedBuildingId === 'all' && styles.filterChipActive,
              ]}
              onPress={() => setSelectedBuildingId('all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedBuildingId === 'all' && styles.filterChipTextActive,
                ]}
              >
                All buildings
              </Text>
            </TouchableOpacity>
            {buildingFilterOptions.map((building) => (
              <TouchableOpacity
                key={building.id}
                style={[
                  styles.filterChip,
                  selectedBuildingId === building.id && styles.filterChipActive,
                ]}
                onPress={() => setSelectedBuildingId(building.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedBuildingId === building.id &&
                      styles.filterChipTextActive,
                  ]}
                >
                  {building.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}

      <Animated.View entering={getHeaderEntering(120)} style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests, units, descriptions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFiltersScroll}
          style={styles.statusFiltersWrapper}
        >
          {STATUS_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.statusFilterButton,
                statusFilter === option.value && styles.statusFilterButtonActive,
              ]}
              onPress={() => setStatusFilter(option.value)}
            >
              <Text
                style={[
                  styles.statusFilterLabel,
                  statusFilter === option.value && styles.statusFilterLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {priorityOptions.length > 1 ? (
        <Animated.View
          entering={getHeaderEntering(140)}
          style={styles.secondaryFilterRow}
        >
          <Text style={styles.secondaryFilterLabel}>Priority</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.secondaryFilterPills}
          >
            {priorityOptions.map((option) => (
              <TouchableOpacity
                key={`priority-${option}`}
                style={[
                  styles.secondaryPill,
                  priorityFilter === option && styles.secondaryPillActive,
                ]}
                onPress={() => setPriorityFilter(option)}
              >
                <Text
                  style={[
                    styles.secondaryPillText,
                    priorityFilter === option && styles.secondaryPillTextActive,
                  ]}
                >
                  {option === 'all'
                    ? 'All'
                    : option.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}

      {typeOptions.length > 1 ? (
        <Animated.View
          entering={getHeaderEntering(160)}
          style={styles.secondaryFilterRow}
        >
          <Text style={styles.secondaryFilterLabel}>Type</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.secondaryFilterPills}
          >
            {typeOptions.map((option) => (
              <TouchableOpacity
                key={`type-${option}`}
                style={[
                  styles.secondaryPill,
                  typeFilter === option && styles.secondaryPillActive,
                ]}
                onPress={() => setTypeFilter(option)}
              >
                <Text
                  style={[
                    styles.secondaryPillText,
                    typeFilter === option && styles.secondaryPillTextActive,
                  ]}
                >
                  {option === 'all'
                    ? 'All'
                    : option.replace(/_/g, ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    marginTop: 16,
  },
  filterRowContent: {
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#1D4ED8',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  searchRow: {
    marginTop: -10,
    gap: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  statusFiltersWrapper: {
    marginTop: 4,
  },
  statusFiltersScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 4,
  },
  statusFilterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  statusFilterButtonActive: {
    backgroundColor: '#1D4ED8',
  },
  statusFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusFilterLabelActive: {
    color: '#FFFFFF',
  },
  secondaryFilterRow: {
    marginTop: 16,
    gap: 10,
  },
  secondaryFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryFilterPills: {
    gap: 10,
    paddingTop: 4,
  },
  secondaryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  secondaryPillActive: {
    backgroundColor: '#1D4ED8',
  },
  secondaryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  secondaryPillTextActive: {
    color: '#FFFFFF',
  },
});
