import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { Request } from '../../../lib/types';
import type {
  AssignmentWorker,
  RequestAssignmentMode,
} from '../_hooks/useRequestAssignmentFlow';

type ManagementRequestAssignmentModalProps = {
  assignmentMode: RequestAssignmentMode;
  isAssigning: boolean;
  isLoadingWorkers: boolean;
  maintenanceStaff: AssignmentWorker[];
  onAssignRequest: (workerId: string, workerName: string) => void;
  onClose: () => void;
  selectedRequest: Request | null;
  serviceProviders: AssignmentWorker[];
  setAssignmentMode: (mode: RequestAssignmentMode) => void;
  visible: boolean;
};

export const ManagementRequestAssignmentModal = ({
  assignmentMode,
  isAssigning,
  isLoadingWorkers,
  maintenanceStaff,
  onAssignRequest,
  onClose,
  selectedRequest,
  serviceProviders,
  setAssignmentMode,
  visible,
}: ManagementRequestAssignmentModalProps) => {
  const isReassign =
    selectedRequest?.status === 'in-progress' ||
    (selectedRequest?.status as string) === 'assigned';
  const visibleWorkers =
    assignmentMode === 'building_employee'
      ? maintenanceStaff
      : serviceProviders;
  const emptyLabel =
    assignmentMode === 'building_employee'
      ? 'No maintenance staff assigned to this building'
      : 'No service providers assigned to this building';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isReassign ? 'Re-assign Request' : 'Assign Request'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.modalScrollView}
          contentContainerStyle={styles.modalContent}
        >
          <View style={styles.assignmentModeSelector}>
            <TouchableOpacity
              style={[
                styles.modeTab,
                assignmentMode === 'building_employee' && styles.modeTabActive,
              ]}
              onPress={() => setAssignmentMode('building_employee')}
            >
              <Ionicons
                name="people"
                size={20}
                color={
                  assignmentMode === 'building_employee' ? '#FFFFFF' : '#6B7280'
                }
              />
              <Text
                style={[
                  styles.modeTabText,
                  assignmentMode === 'building_employee' &&
                    styles.modeTabTextActive,
                ]}
              >
                Maintenance Staff
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTab,
                assignmentMode === 'service_provider' && styles.modeTabActive,
              ]}
              onPress={() => setAssignmentMode('service_provider')}
            >
              <Ionicons
                name="business"
                size={20}
                color={
                  assignmentMode === 'service_provider' ? '#FFFFFF' : '#6B7280'
                }
              />
              <Text
                style={[
                  styles.modeTabText,
                  assignmentMode === 'service_provider' &&
                    styles.modeTabTextActive,
                ]}
              >
                Service Provider
              </Text>
            </TouchableOpacity>
          </View>

          {isLoadingWorkers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading workers...</Text>
            </View>
          ) : (
            <View style={styles.workersList}>
              {visibleWorkers.length > 0 ? (
                visibleWorkers.map((worker) => (
                  <TouchableOpacity
                    key={worker.id}
                    style={styles.workerCard}
                    onPress={() => onAssignRequest(worker.id, worker.fullName)}
                    disabled={isAssigning}
                  >
                    <View style={styles.workerInfo}>
                      <Text style={styles.workerName}>{worker.fullName}</Text>
                      <Text style={styles.workerMeta}>{worker.email}</Text>
                      {worker.phoneNumber ? (
                        <Text style={styles.workerMeta}>{worker.phoneNumber}</Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyWorkers}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={32}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyWorkersText}>{emptyLabel}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: {
    width: 24,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: 24,
  },
  assignmentModeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  modeTabActive: {
    backgroundColor: '#2563EB',
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  workersList: {
    gap: 12,
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  workerInfo: {
    flex: 1,
    gap: 4,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  workerMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyWorkers: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 56,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  emptyWorkersText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
