import { Alert } from 'react-native';
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import { orgBuildingsApi } from '../../../services/api/org-buildings';
import type { Request, User } from '../../../types';
import {
  showErrorAlert,
  showSuccessAlert,
} from '../../../utils/alertHelpers';
import {
  getResponseItems,
  mapOrgBuildingRequestSummary,
} from './management-request-helpers';

export type RequestAssignmentMode =
  | 'service_provider'
  | 'building_employee';

export type AssignmentWorker = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
};

type UseRequestAssignmentFlowArgs = {
  closeRequestDetails: () => void;
  currentUser: User | null;
  managedBuildings: { id: string; name?: string }[];
  selectedRequest: Request | null;
  setBuildingRequests: Dispatch<SetStateAction<Request[]>>;
};

export const useRequestAssignmentFlow = ({
  closeRequestDetails,
  currentUser,
  managedBuildings,
  selectedRequest,
  setBuildingRequests,
}: UseRequestAssignmentFlowArgs) => {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentMode, setAssignmentMode] =
    useState<RequestAssignmentMode>('building_employee');
  const [maintenanceStaff, setMaintenanceStaff] = useState<AssignmentWorker[]>(
    [],
  );
  const [serviceProviders, setServiceProviders] = useState<AssignmentWorker[]>(
    [],
  );
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);

  const closeAssignModal = useCallback(() => {
    setShowAssignModal(false);
  }, []);

  const openAssignModal = useCallback(() => {
    if (!selectedRequest) return;

    if (
      selectedRequest.status !== 'pending' &&
      selectedRequest.status !== 'in-progress' &&
      (selectedRequest.status as string) !== 'assigned'
    ) {
      Alert.alert(
        'Cannot Assign',
        'Only pending, assigned, or in-progress requests can be (re)assigned. This request is already completed or cancelled.',
      );
      return;
    }

    setShowAssignModal(true);
  }, [selectedRequest]);

  useEffect(() => {
    const fetchWorkers = async () => {
      if (!showAssignModal || !selectedRequest?.buildingId) {
        setMaintenanceStaff([]);
        setServiceProviders([]);
        return;
      }

      setIsLoadingWorkers(true);
      try {
        const buildingId = selectedRequest.buildingId;
        console.log(
          '[ManagementRequests] Loading assignments for building:',
          buildingId,
        );
        const assignmentsResponse = await orgBuildingsApi.getAssignments(buildingId);
        const assignmentsPayload = getResponseItems(assignmentsResponse);

        console.log('[ManagementRequests] Assignments response:', assignmentsPayload);
        console.log(
          '[ManagementRequests] Assignments count:',
          assignmentsPayload.length,
        );

        const staffList = assignmentsPayload
          .map((assignment: any) => {
            const assignmentType = String(assignment?.type || '').toUpperCase();
            if (assignmentType !== 'STAFF') {
              return null;
            }

            const user = assignment.user ?? assignment;
            const id = String(
              assignment.userId ?? user?.id ?? user?.userId ?? '',
            );
            if (!id) return null;

            return {
              id,
              fullName:
                user?.fullName ||
                user?.name ||
                user?.email ||
                'Staff Member',
              email: user?.email || '',
              phoneNumber: user?.phone || user?.phoneNumber || '',
              isActive: true,
            };
          })
          .filter(Boolean) as AssignmentWorker[];

        console.log(
          '[ManagementRequests] Scoped staff list:',
          staffList.map((staff) => ({
            id: staff.id,
            name: staff.fullName,
            email: staff.email,
          })),
        );

        setMaintenanceStaff(staffList);
        setServiceProviders([]);
      } catch (error) {
        console.error('[Requests] Failed to fetch workers:', error);
        setMaintenanceStaff([]);
        setServiceProviders([]);
      } finally {
        setIsLoadingWorkers(false);
      }
    };

    void fetchWorkers();
  }, [selectedRequest?.buildingId, showAssignModal]);

  const handleAssignRequest = useCallback(
    async (workerId: string, workerName: string) => {
      if (!selectedRequest || !currentUser?.id) return;

      setIsAssigning(true);
      try {
        const buildingId = selectedRequest.buildingId;
        if (!buildingId) {
          throw new Error('Missing building information for this request.');
        }

        const response = await orgBuildingsApi.assignRequest(
          buildingId,
          selectedRequest.id,
          workerId,
        );
        if (response?.success === false) {
          throw new Error(response.message || 'Failed to assign request');
        }

        showSuccessAlert(`Request assigned to ${workerName}`);
        setShowAssignModal(false);
        closeRequestDetails();

        const refreshed = await orgBuildingsApi.getBuildingRequests(buildingId);
        const payload = getResponseItems(refreshed);

        if (payload.length > 0) {
          const buildingName = managedBuildings.find(
            (building) => building.id === buildingId,
          )?.name;
          const mappedRequests = payload.map((item: any) =>
            mapOrgBuildingRequestSummary(item, {
              buildingId,
              buildingName,
            }),
          );

          setBuildingRequests((previousRequests) => {
            const next = previousRequests.filter(
              (request) => request.buildingId !== buildingId,
            );
            return [...next, ...mappedRequests];
          });
        }
      } catch (error) {
        console.error('[Requests] Assignment failed:', error);
        showErrorAlert(error);
      } finally {
        setIsAssigning(false);
      }
    },
    [
      closeRequestDetails,
      currentUser?.id,
      managedBuildings,
      selectedRequest,
      setBuildingRequests,
    ],
  );

  return {
    showAssignModal,
    closeAssignModal,
    assignmentMode,
    setAssignmentMode,
    maintenanceStaff,
    serviceProviders,
    isAssigning,
    isLoadingWorkers,
    openAssignModal,
    handleAssignRequest,
  };
};
