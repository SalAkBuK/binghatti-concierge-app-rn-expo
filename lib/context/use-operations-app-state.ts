import { useCallback } from "react";

import type { Building, BuildingEmployee } from "../types";
import type { AuthContextType } from "./auth-context";
import { useJobModule } from "./modules/jobs";
import { useRatingsModule } from "./modules/ratings";
import type { NotificationsContextType } from "./notifications-context";
import type { RequestsContextType } from "./requests-context";

type UseOperationsAppStateParams = {
  auth: AuthContextType;
  notifications: NotificationsContextType;
  requests: RequestsContextType;
  buildings: Building[];
  buildingEmployees: BuildingEmployee[];
  getManagedBuildingIds: () => string[];
  resolveServiceProviderIdentity: (
    identifier?: string,
  ) => { id: string; name: string; notificationTargetId: string } | null;
};

export const useOperationsAppState = ({
  auth,
  notifications,
  requests,
  buildings,
  buildingEmployees,
  getManagedBuildingIds,
  resolveServiceProviderIdentity,
}: UseOperationsAppStateParams) => {
  const {
    state: { ratings, ratingSummaries },
    actions: ratingsActions,
  } = useRatingsModule({
    auth,
    notifications,
    requests,
    buildings,
  });
  const {
    state: { jobs },
    actions: jobActions,
  } = useJobModule({
    auth,
    notifications,
    requests,
    buildings,
    buildingEmployees,
    getManagedBuildingIds,
    resolveServiceProviderIdentity,
  });

  const assignJob = useCallback(
    (
      jobId: string,
      serviceProviderId: string,
      options?: { scheduledDate?: string },
    ) =>
      jobActions.assignJob(jobId, {
        serviceProviderId,
        scheduledDate: options?.scheduledDate,
      }),
    [jobActions],
  );

  return {
    ratings,
    ratingSummaries,
    jobs,
    submitRating: ratingsActions.submitRating,
    getRatings: ratingsActions.getRatings,
    getRatingByRequestId: ratingsActions.getRatingByRequestId,
    getRatingSummaries: ratingsActions.getRatingSummaries,
    upsertRatingSummary: ratingsActions.upsertRatingSummary,
    getJobs: jobActions.getJobs,
    getJobById: jobActions.getJobById,
    createJob: jobActions.createJob,
    updateJobStatus: jobActions.updateJobStatus,
    bulkUpdateJobStatus: jobActions.bulkUpdateJobStatus,
    assignJob,
    assignJobToBuildingEmployee: jobActions.assignJobToBuildingEmployee,
    queueJobAssignment: jobActions.queueJobAssignment,
    promoteQueuedJobAssignment: jobActions.promoteQueuedJobAssignment,
    updateJob: jobActions.updateJob,
    acceptEmployeeJob: jobActions.acceptEmployeeJob,
    declineEmployeeJob: jobActions.declineEmployeeJob,
    startEmployeeJob: jobActions.startEmployeeJob,
    uploadEmployeeJobPhoto: jobActions.uploadEmployeeJobPhoto,
    addEmployeeJobAdditionalCost: jobActions.addEmployeeJobAdditionalCost,
    completeEmployeeJob: jobActions.completeEmployeeJob,
    submitJobEstimate: jobActions.submitJobEstimate,
    assignEmployeeToJob: jobActions.assignEmployeeToJob,
    approveJobAdditionalCost: jobActions.approveJobAdditionalCost,
    rejectJobAdditionalCost: jobActions.rejectJobAdditionalCost,
    overrideJobCompletion: jobActions.overrideJobCompletion,
    reviewJobEstimateAsProvider: jobActions.reviewJobEstimateAsProvider,
    approveTenantJobCompletion: jobActions.approveTenantJobCompletion,
    rejectTenantJobCompletion: jobActions.rejectTenantJobCompletion,
    reviewJobEstimateAsTenant: jobActions.reviewJobEstimateAsTenant,
  };
};
