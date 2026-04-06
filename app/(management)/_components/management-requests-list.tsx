import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { Request, RequestStatus } from '../../../lib/types';
import { formatDateTime } from '../../../lib/utils/helpers';

type ManagementRequestsListProps = {
  hasMoreRequests: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  onLoadMore: () => void;
  onOpenRequestDetails: (request: Request) => void;
  onRefresh: () => void;
  paginatedRequests: Request[];
  remainingRequestsCount: number;
};

const requestStatusBadge = (status: RequestStatus) => {
  const palette = {
    pending: { bg: '#FEF3C7', text: '#92400E' },
    assigned: { bg: '#DBEAFE', text: '#1D4ED8' },
    'in-progress': { bg: '#DBEAFE', text: '#1D4ED8' },
    'on-hold': { bg: '#FED7AA', text: '#9A3412' },
    completed: { bg: '#DCFCE7', text: '#047857' },
    cancelled: { bg: '#FEE2E2', text: '#DC2626' },
  };
  const colors = palette[status] ?? palette.pending;

  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>
        {status.toUpperCase()}
      </Text>
    </View>
  );
};

export const ManagementRequestsList = ({
  hasMoreRequests,
  isLoadingMore,
  isRefreshing,
  onLoadMore,
  onOpenRequestDetails,
  onRefresh,
  paginatedRequests,
  remainingRequestsCount,
}: ManagementRequestsListProps) => {
  return (
    <FlatList
      data={paginatedRequests}
      keyExtractor={(item) => item.id}
      renderItem={({ item: request }) => (
        <TouchableOpacity
          style={styles.requestCard}
          onPress={() => onOpenRequestDetails(request)}
        >
          <View style={styles.requestCardHeader}>
            <View style={styles.requestHeaderLeft}>
              <Text style={styles.requestTitle}>{request.title}</Text>
              <Text style={styles.requestMeta}>
                Unit {request.apartment || 'N/A'} · {request.type?.toUpperCase()}
              </Text>
            </View>
            {requestStatusBadge(request.status)}
          </View>

          {request.description ? (
            <Text style={styles.requestDescription} numberOfLines={2}>
              {request.description}
            </Text>
          ) : null}

          <View style={styles.requestFooter}>
            <View style={styles.footerMetaRow}>
              <Ionicons name="time-outline" size={14} color="#64748B" />
              <Text style={styles.footerMetaText}>
                {formatDateTime(request.createdAt)}
              </Text>
            </View>
            <View style={styles.footerMetaRow}>
              <Ionicons name="construct-outline" size={14} color="#64748B" />
              <Text style={styles.footerMetaText}>
                {request.status === 'completed'
                  ? request.assignedTo
                    ? `Completed by ${request.assignedTo}`
                    : 'Completed'
                  : request.assignedTo
                    ? `Assigned to ${request.assignedTo}`
                    : 'Not assigned'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      ListFooterComponent={() => {
        if (isLoadingMore) {
          return (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingFooterText}>Loading more...</Text>
            </View>
          );
        }

        if (hasMoreRequests && paginatedRequests.length > 0) {
          return (
            <TouchableOpacity style={styles.loadMoreButton} onPress={onLoadMore}>
              <Text style={styles.loadMoreButtonText}>
                Load More ({remainingRequestsCount} remaining)
              </Text>
              <Ionicons name="chevron-down" size={16} color="#2563EB" />
            </TouchableOpacity>
          );
        }

        if (paginatedRequests.length > 0 && !hasMoreRequests) {
          return (
            <View style={styles.endReachedFooter}>
              <Text style={styles.endReachedText}>
                Showing all {paginatedRequests.length} requests
              </Text>
            </View>
          );
        }

        return null;
      }}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#2563EB"
          colors={['#2563EB']}
        />
      }
      contentContainerStyle={styles.requestList}
      style={styles.flatList}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={5}
    />
  );
};

const styles = StyleSheet.create({
  requestList: {
    marginTop: 16,
    gap: 16,
    paddingBottom: 120,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  requestCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  requestHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  requestMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  requestDescription: {
    fontSize: 14,
    color: '#4B5563',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerMetaText: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  flatList: {
    flex: 1,
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  loadingFooterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginVertical: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  endReachedFooter: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  endReachedText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
