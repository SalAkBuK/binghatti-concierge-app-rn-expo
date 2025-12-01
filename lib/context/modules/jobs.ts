import { useCallback, useState } from "react";

import type {
  Building,
  BuildingEmployee,
  Job,
  JobAdditionalCost,
  JobAssignmentRecord,
  JobComplianceChecklistItem,
  JobCostBreakdownItem,
  JobEstimate,
  JobEstimateItem,
  JobEstimateStatus,
  CreateJobDTO,
  UpdateJobDTO,
} from "../../types";
import { DEFAULT_JOBS } from "../../utils/mockData";
import type { AuthContextType } from "../auth-context";
import type { NotificationsContextType } from "../notifications-context";
import type { RequestsContextType } from "../requests-context";

type AuthDependency = Pick<AuthContextType, "currentUser" | "users">;
type NotificationsDependency = Pick<NotificationsContextType, "actions">;
type RequestsDependency = Pick<RequestsContextType, "requests">;

type ResolveIdentity = (
  identifier?: string,
) => { id: string; name: string; notificationTargetId: string } | null;

type JobModuleDeps = {
  auth: AuthDependency;
  notifications: NotificationsDependency;
  requests: RequestsDependency;
  buildings: Building[];
  buildingEmployees: BuildingEmployee[];
  getManagedBuildingIds: () => string[];
  resolveServiceProviderIdentity: ResolveIdentity;
};

export type JobModuleState = {
  jobs: Job[];
};

export type JobModuleActions = {
  getJobs: (filter?: {
    status?: Job["status"];
    buildingId?: string;
    assignedTo?: string;
  }) => Job[];
  getJobById: (id: string) => Job | undefined;
  createJob: (data: CreateJobDTO) => Promise<Job>;
  updateJobStatus: (
    jobId: string,
    status: Job["status"],
    context?: {
      note?: string;
      attachments?: string[];
      assignedEmployeeId?: string;
      assignedEmployeeName?: string;
      scheduledDate?: string;
      cancellationReason?: string;
    },
  ) => Promise<Job>;
  bulkUpdateJobStatus: (
    payload: { jobIds: string[]; status: Job["status"]; note?: string },
  ) => Promise<Job[]>;
  assignJob: (
    jobId: string,
    payload: {
      serviceProviderId?: string;
      serviceProviderName?: string;
      buildingEmployeeId?: string;
      buildingEmployeeName?: string;
      scheduledDate?: string;
    },
  ) => Promise<Job>;
  assignJobToBuildingEmployee: (
    jobId: string,
    employeeId: string,
    options?: { scheduledDate?: string },
  ) => Promise<Job>;
  queueJobAssignment: (
    jobId: string,
    assignment: JobAssignmentRecord,
  ) => Promise<Job>;
  promoteQueuedJobAssignment: (
    jobId: string,
    assignmentId: string,
  ) => Promise<Job>;
  updateJob: (jobId: string, updates: UpdateJobDTO) => Promise<Job>;
  acceptEmployeeJob: (jobId: string, notes?: string) => Promise<Job>;
  declineEmployeeJob: (jobId: string, reason: string) => Promise<void>;
  startEmployeeJob: (jobId: string) => Promise<Job>;
  uploadEmployeeJobPhoto: (
    jobId: string,
    payload: { uri: string; uploadedBy: string },
  ) => Promise<Job>;
  addEmployeeJobAdditionalCost: (
    jobId: string,
    payload: JobAdditionalCost,
  ) => Promise<Job>;
  completeEmployeeJob: (
    jobId: string,
    payload: {
      notes?: string;
      attachments?: string[];
      requiresFollowUp?: boolean;
      completionSummary?: string;
    },
  ) => Promise<Job>;
  submitJobEstimate: (
    jobId: string,
    estimate: { items: Array<{ label: string; amount: number; description?: string; category?: JobEstimateItem["category"] }>; notes?: string },
  ) => Promise<Job>;
  assignEmployeeToJob: (
    jobId: string,
    employeeId: string,
    options?: { scheduledDate?: string },
  ) => Promise<Job>;
  approveJobAdditionalCost: (
    jobId: string,
    costId: string,
  ) => Promise<Job>;
  rejectJobAdditionalCost: (
    jobId: string,
    costId: string,
    reason: string,
  ) => Promise<Job>;
  overrideJobCompletion: (
    jobId: string,
    payload?: { note?: string },
  ) => Promise<Job>;
  reviewJobEstimateAsProvider: (
    jobId: string,
    decision: JobEstimateStatus,
    reason?: string,
  ) => Promise<Job>;
  approveTenantJobCompletion: (
    jobId: string,
    feedback?: string,
  ) => Promise<Job>;
  rejectTenantJobCompletion: (
    jobId: string,
    reason: string,
  ) => Promise<Job>;
  reviewJobEstimateAsTenant: (
    jobId: string,
    payload: { decision: JobEstimateStatus; notes?: string },
  ) => Promise<Job>;
};

export const useJobModule = ({
  auth,
  notifications,
  requests,
  buildings,
  buildingEmployees,
  getManagedBuildingIds,
  resolveServiceProviderIdentity,
}: JobModuleDeps): {
  state: JobModuleState;
  actions: JobModuleActions;
} => {
  const [jobs, setJobs] = useState<Job[]>(DEFAULT_JOBS);

  const getJobs = useCallback(
    (filter?: { status?: Job["status"]; buildingId?: string; assignedTo?: string }) => {
      let filtered = jobs;

      if (filter?.status) {
        filtered = filtered.filter((j) => j.status === filter.status);
      }

      if (filter?.buildingId) {
        filtered = filtered.filter((j) => j.buildingId === filter.buildingId);
      }

      if (filter?.assignedTo) {
        filtered = filtered.filter((j) => j.assignedTo === filter.assignedTo);
      }

      return filtered;
    },
    [jobs],
  );

  const getJobById = useCallback(
    (id: string) => jobs.find((job) => job.id === id),
    [jobs],
  );

  const createJob = useCallback(
    async (jobData: CreateJobDTO): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(
          new Error("Only authenticated users can create jobs"),
        );
      }

      const role = auth.currentUser.role;
      const isAdmin = role === "admin" || role === "super_admin";
      const isManagement = role === "management";

      if (!isAdmin && !isManagement) {
        return Promise.reject(
          new Error("You do not have permission to create jobs"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const building = buildings.find((b) => b.id === jobData.buildingId);
          if (!building) {
            reject(new Error("Building not found"));
            return;
          }

          if (isManagement) {
            const managedBuildings = getManagedBuildingIds();
            const managesBuilding = managedBuildings.includes(building.id);
            const isBuildingManager = building.managerId === auth.currentUser!.id;

            if (!managesBuilding || !isBuildingManager) {
              reject(
                new Error("Only the assigned building manager can create jobs for this building"),
              );
              return;
            }
          }

          const assignedIdentity = resolveServiceProviderIdentity(
            jobData.assignedTo,
          );

          const buildingEmployeeAssignment = jobData.assignedBuildingEmployeeId
            ? buildingEmployees.find(
                (employee) => employee.id === jobData.assignedBuildingEmployeeId,
              )
            : undefined;

          if (jobData.assignedTo && !assignedIdentity) {
            reject(new Error("Assigned service provider not found"));
            return;
          }

          if (
            jobData.assignmentTargetType === "building_employee" &&
            !buildingEmployeeAssignment
          ) {
            reject(new Error("Building employee not found"));
            return;
          }

          const costBreakdown: JobCostBreakdownItem[] =
            jobData.costBreakdown?.map((item, index) => ({
              id: item.id ?? `job-${Date.now()}-cost-${index}`,
              label: item.label,
              amount: item.amount,
              category: item.category,
              description: item.description,
            })) ?? [];

          const complianceChecklist: JobComplianceChecklistItem[] =
            jobData.complianceChecklist?.map((item, index) => ({
              id: item.id ?? `job-${Date.now()}-check-${index}`,
              label: item.label,
              description: item.description,
              completed: item.completed ?? false,
              completedAt: item.completedAt,
              completedBy: item.completedBy,
              notes: item.notes,
            })) ?? [];

          const assignmentTargetType =
            jobData.assignmentTargetType ??
            (buildingEmployeeAssignment
              ? "building_employee"
              : assignedIdentity
                ? "service_provider"
                : undefined);

          const assignmentHistory: JobAssignmentRecord[] = [];

          const assignmentRecordBase = {
            id: `job-assign-${Date.now()}`,
            assignedAt: new Date().toISOString(),
            assignedBy: auth.currentUser!.id,
            assignedByName: auth.currentUser!.name || auth.currentUser!.email || "",
            status: "pending" as JobAssignmentRecord["status"],
          };

          if (assignedIdentity) {
            assignmentHistory.push({
              ...assignmentRecordBase,
              targetType: "service_provider",
              serviceProviderId: assignedIdentity.id,
              serviceProviderName: assignedIdentity.name,
              scheduledDate: jobData.scheduledDate,
            });
          } else if (buildingEmployeeAssignment) {
            assignmentHistory.push({
              ...assignmentRecordBase,
              targetType: "building_employee",
              buildingEmployeeId: buildingEmployeeAssignment.id,
              buildingEmployeeName: buildingEmployeeAssignment.name,
              scheduledDate: jobData.scheduledDate,
            });
          }

          const newJob: Job = {
            id: `job-${Date.now()}`,
            title: jobData.title,
            description: jobData.description,
            buildingId: jobData.buildingId,
            buildingName: building.name,
            requestedBy: jobData.requestedBy,
            requestedByName: jobData.requestedByName,
            requestId: jobData.requestId,
            priority: jobData.priority ?? "medium",
            status: jobData.status ?? "pending",
            scheduledDate: jobData.scheduledDate,
            assignedTo: assignedIdentity?.notificationTargetId,
            assignedToName: assignedIdentity?.name,
            assignedToEmployeeId: jobData.assignedEmployeeId,
            assignedToEmployeeName: jobData.assignedEmployeeName,
            assignedBuildingEmployeeId: buildingEmployeeAssignment?.id,
            assignedBuildingEmployeeName: buildingEmployeeAssignment?.name,
            assignmentTargetType,
            estimatedHours: jobData.estimatedHours,
            completionNotes: jobData.completionNotes,
            costBreakdown,
            complianceChecklist,
            assignmentHistory,
            assignmentQueue: jobData.assignmentQueue ?? [],
            photos: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setJobs((prev) => [newJob, ...prev]);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Job Created",
            `Job "${newJob.title}" has been created`,
            "success",
          );

          resolve(newJob);
        }, 400);
      });
    },
    [
      auth.currentUser,
      buildings,
      buildingEmployees,
      getManagedBuildingIds,
      notifications.actions,
      resolveServiceProviderIdentity,
    ],
  );

  const updateJobStatus = useCallback(
    async (
      jobId: string,
      status: Job["status"],
      context?: {
        note?: string;
        attachments?: string[];
        assignedEmployeeId?: string;
        assignedEmployeeName?: string;
        scheduledDate?: string;
        cancellationReason?: string;
      },
    ): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              updatedJob = {
                ...job,
                status,
                updatedAt: new Date().toISOString(),
                cancelledReason:
                  status === "cancelled" ? context?.cancellationReason : job.cancelledReason,
                assignedToEmployeeId:
                  context?.assignedEmployeeId ?? job.assignedToEmployeeId,
                assignedToEmployeeName:
                  context?.assignedEmployeeName ?? job.assignedToEmployeeName,
                scheduledDate: context?.scheduledDate ?? job.scheduledDate,
              };

              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          resolve(updatedJob);
        }, 300);
      });
    },
    [jobs, auth.currentUser],
  );

  const bulkUpdateJobStatus = useCallback(
    async (payload: { jobIds: string[]; status: Job["status"]; note?: string }): Promise<Job[]> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const updatedJobs: Job[] = [];

          setJobs((prev) =>
            prev.map((job) => {
              if (!payload.jobIds.includes(job.id)) {
                return job;
              }

              const updatedJob = {
                ...job,
                status: payload.status,
                updatedAt: new Date().toISOString(),
              };
              updatedJobs.push(updatedJob);
              return updatedJob;
            }),
          );

          resolve(updatedJobs);
        }, 400);
      });
    },
    [jobs, auth.currentUser],
  );

  const assignJob = useCallback(
    async (
      jobId: string,
      payload: {
        serviceProviderId?: string;
        serviceProviderName?: string;
        buildingEmployeeId?: string;
        buildingEmployeeName?: string;
        scheduledDate?: string;
      },
    ): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      if (
        !payload.serviceProviderId &&
        !payload.buildingEmployeeId
      ) {
        return Promise.reject(
          new Error("Please specify a service provider or building employee"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              const building = buildings.find((b) => b.id === job.buildingId);
              if (!building) {
                return job;
              }

              if (payload.buildingEmployeeId) {
                const employee = buildingEmployees.find(
                  (emp) => emp.id === payload.buildingEmployeeId,
                );
                if (!employee) {
                  reject(new Error("Building employee not found"));
                  return job;
                }

                updatedJob = {
                  ...job,
                  assignedTo: undefined,
                  assignedToName: undefined,
                  assignedToEmployeeId: undefined,
                  assignedToEmployeeName: undefined,
                  assignedBuildingEmployeeId: employee.id,
                  assignedBuildingEmployeeName: employee.name,
                  assignmentTargetType: "building_employee",
                  status: "assigned",
                  scheduledDate:
                    payload.scheduledDate || job.scheduledDate,
                  updatedAt: new Date().toISOString(),
                  assignmentHistory: [
                    ...(job.assignmentHistory ?? []),
                    {
                      id: `assign-${Date.now()}`,
                      assignedAt: new Date().toISOString(),
                      assignedBy: auth.currentUser!.id,
                      assignedByName:
                        auth.currentUser!.name || auth.currentUser!.email || "",
                      status: "accepted",
                      targetType: "building_employee",
                      buildingEmployeeId: employee.id,
                      buildingEmployeeName: employee.name,
                      scheduledDate: payload.scheduledDate || job.scheduledDate,
                    },
                  ],
                };
              } else if (payload.serviceProviderId) {
                const identity = resolveServiceProviderIdentity(
                  payload.serviceProviderId,
                );
                if (!identity) {
                  reject(new Error("Service provider not found"));
                  return job;
                }

                updatedJob = {
                  ...job,
                  assignedTo: identity.notificationTargetId,
                  assignedToName: payload.serviceProviderName ?? identity.name,
                  assignedBuildingEmployeeId: undefined,
                  assignedBuildingEmployeeName: undefined,
                  assignmentTargetType: "service_provider",
                  status: "assigned",
                  scheduledDate:
                    payload.scheduledDate || job.scheduledDate,
                  updatedAt: new Date().toISOString(),
                  assignmentHistory: [
                    ...(job.assignmentHistory ?? []),
                    {
                      id: `assign-${Date.now()}`,
                      assignedAt: new Date().toISOString(),
                      assignedBy: auth.currentUser!.id,
                      assignedByName:
                        auth.currentUser!.name || auth.currentUser!.email || "",
                      status: "accepted",
                      targetType: "service_provider",
                      serviceProviderId: identity.id,
                      serviceProviderName:
                        payload.serviceProviderName ?? identity.name,
                      scheduledDate: payload.scheduledDate || job.scheduledDate,
                    },
                  ],
                };
              }

              return updatedJob ?? job;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser, buildings, buildingEmployees, resolveServiceProviderIdentity],
  );

  const assignJobToBuildingEmployee = useCallback(
    async (
      jobId: string,
      employeeId: string,
      options?: { scheduledDate?: string },
    ): Promise<Job> =>
      assignJob(jobId, {
        buildingEmployeeId: employeeId,
        scheduledDate: options?.scheduledDate,
      }),
    [assignJob],
  );

  const queueJobAssignment = useCallback(
    async (jobId: string, assignment: JobAssignmentRecord): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              updatedJob = {
                ...job,
                assignmentQueue: [
                  ...(job.assignmentQueue ?? []),
                  assignment,
                ],
                updatedAt: new Date().toISOString(),
              };
              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          resolve(updatedJob);
        }, 250);
      });
    },
    [jobs, auth.currentUser],
  );

  const promoteQueuedJobAssignment = useCallback(
    async (jobId: string, assignmentId: string): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;
          let promoted = false;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              const queue = job.assignmentQueue ?? [];
              const nextAssignment = queue.find((assignment) => assignment.id === assignmentId);
              if (!nextAssignment) {
                return job;
              }

              const remainingQueue = queue.filter(
                (assignment) => assignment.id !== assignmentId,
              );

              const assignmentRecord: JobAssignmentRecord = {
                ...nextAssignment,
                status: "accepted",
                assignedAt: new Date().toISOString(),
                assignedBy: auth.currentUser!.id,
                assignedByName:
                  auth.currentUser!.name || auth.currentUser!.email || "",
              };

              if (nextAssignment.targetType === "service_provider") {
                updatedJob = {
                  ...job,
                  assignedTo: nextAssignment.serviceProviderId,
                  assignedToName: nextAssignment.serviceProviderName,
                  assignmentTargetType: "service_provider",
                  assignedBuildingEmployeeId: undefined,
                  assignedBuildingEmployeeName: undefined,
                  status: "assigned",
                  scheduledDate:
                    nextAssignment.scheduledDate || job.scheduledDate,
                  assignmentHistory: [
                    ...(job.assignmentHistory ?? []),
                    assignmentRecord,
                  ],
                  assignmentQueue: remainingQueue,
                  updatedAt: new Date().toISOString(),
                };
              } else {
                updatedJob = {
                  ...job,
                  assignedTo: undefined,
                  assignedToName: nextAssignment.buildingEmployeeName,
                  assignmentTargetType: "building_employee",
                  assignedBuildingEmployeeId: nextAssignment.buildingEmployeeId,
                  assignedBuildingEmployeeName:
                    nextAssignment.buildingEmployeeName,
                  status: "assigned",
                  scheduledDate:
                    nextAssignment.scheduledDate || job.scheduledDate,
                  assignmentHistory: [
                    ...(job.assignmentHistory ?? []),
                    assignmentRecord,
                  ],
                  assignmentQueue: remainingQueue,
                  updatedAt: new Date().toISOString(),
                };
              }

              promoted = true;

              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          if (!promoted) {
            reject(new Error("No queued assignments available"));
            return;
          }

          resolve(updatedJob);
        }, 300);
      });
    },
    [jobs, auth.currentUser],
  );

  const updateJob = useCallback(
    async (jobId: string, updates: UpdateJobDTO): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      if (
        updates.status &&
        auth.currentUser.role === "service_provider" &&
        (updates.status === "in-progress" || updates.status === "completed")
      ) {
        return Promise.reject(
          new Error("Only the assigned employee can update job progress"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId) {
                const {
                  costBreakdown: costUpdates,
                  complianceChecklist: checklistUpdates,
                  ...otherUpdates
                } = updates;

                const normalizedCostBreakdown: JobCostBreakdownItem[] =
                  costUpdates?.map((item, index) => ({
                    id: item.id ?? `job-${jobId}-cost-${Date.now()}-${index}`,
                    label: item.label ?? "Cost Item",
                    amount: item.amount ?? 0,
                    category: item.category,
                    description: item.description,
                  })) ?? job.costBreakdown ?? [];

                const normalizedChecklist: JobComplianceChecklistItem[] =
                  checklistUpdates?.map((item, index) => ({
                    id:
                      item.id ??
                      `job-${jobId}-check-${Date.now()}-${index}`,
                    label: item.label ?? "Checklist Item",
                    description: item.description,
                    completed: item.completed ?? false,
                    completedAt: item.completedAt,
                    completedBy: item.completedBy,
                    notes: item.notes,
                  })) ?? job.complianceChecklist ?? [];

                const assignedUser =
                  otherUpdates.assignedTo !== undefined
                    ? auth.users[otherUpdates.assignedTo] ||
                      Object.values(auth.users).find(
                        (u) => u.id === otherUpdates.assignedTo,
                      )
                    : job.assignedTo
                        ? auth.users[job.assignedTo] ||
                          Object.values(auth.users).find(
                            (u) => u.id === job.assignedTo,
                          )
                        : undefined;

                if (otherUpdates.assignedTo && !assignedUser) {
                  return job;
                }

                updatedJob = {
                  ...job,
                  ...otherUpdates,
                  costBreakdown: normalizedCostBreakdown,
                  complianceChecklist: normalizedChecklist,
                  assignedTo: assignedUser ? assignedUser.id : job.assignedTo,
                  assignedToName: assignedUser?.name,
                  updatedAt: new Date().toISOString(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (!updatedJob) {
            reject(
              updates.assignedTo
                ? new Error("Assigned user not found")
                : new Error("Job not found"),
            );
            return;
          }

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Job Updated",
            `Job "${updatedJob.title}" has been updated`,
            "success",
          );

          resolve(updatedJob);
        }, 500);
      });
    },
    [jobs, auth.currentUser, auth.users, notifications.actions],
  );

  const acceptEmployeeJob = useCallback(
    async (jobId: string, notes?: string): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "employee") {
        return Promise.reject(new Error("Only employees can accept jobs"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId && job.assignedToEmployeeId === auth.currentUser!.id) {
                updatedJob = {
                  ...job,
                  status: "assigned",
                  acceptedAt: new Date().toISOString(),
                  acceptanceNotes: notes,
                  updatedAt: new Date().toISOString(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found or not assigned to you"));
            return;
          }

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Job Accepted",
            `You have accepted the job "${updatedJob.title}"`,
            "success",
          );

          resolve(updatedJob);
        }, 500);
      });
    },
    [jobs, auth.currentUser, notifications.actions],
  );

  const declineEmployeeJob = useCallback(
    async (jobId: string, reason: string): Promise<void> => {
      if (!auth.currentUser || auth.currentUser.role !== "employee") {
        return Promise.reject(new Error("Only employees can decline jobs"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let declinedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId && job.assignedToEmployeeId === auth.currentUser!.id) {
                declinedJob = {
                  ...job,
                  assignedToEmployeeId: undefined,
                  assignedToEmployeeName: undefined,
                  status: "pending",
                  declinedBy: auth.currentUser!.id,
                  declineReason: reason,
                  updatedAt: new Date().toISOString(),
                };
                return declinedJob;
              }
              return job;
            }),
          );

          if (!declinedJob) {
            reject(new Error("Job not found or not assigned to you"));
            return;
          }

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Job Declined",
            `You have declined the job "${declinedJob.title}"`,
            "info",
          );

          resolve();
        }, 500);
      });
    },
    [jobs, auth.currentUser, notifications.actions],
  );

  const startEmployeeJob = useCallback(
    async (jobId: string): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "employee") {
        return Promise.reject(new Error("Only employees can start jobs"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId && job.assignedToEmployeeId === auth.currentUser!.id) {
                updatedJob = {
                  ...job,
                  status: "in-progress",
                  workStartedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found or not assigned to you"));
            return;
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser],
  );

  const uploadEmployeeJobPhoto = useCallback(
    async (
      jobId: string,
      payload: { uri: string; uploadedBy: string },
    ): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "employee") {
        return Promise.reject(new Error("Only employees can upload photos"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId && job.assignedToEmployeeId === auth.currentUser!.id) {
                updatedJob = {
                  ...job,
                  photos: [
                    ...(job.photos ?? []),
                    {
                      id: `job-photo-${Date.now()}`,
                      uri: payload.uri,
                      uploadedAt: new Date().toISOString(),
                      uploadedBy: payload.uploadedBy,
                    },
                  ],
                  updatedAt: new Date().toISOString(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found or not assigned to you"));
            return;
          }

          resolve(updatedJob);
        }, 250);
      });
    },
    [jobs, auth.currentUser],
  );

  const addEmployeeJobAdditionalCost = useCallback(
    async (jobId: string, payload: JobAdditionalCost): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "employee") {
        return Promise.reject(new Error("Only employees can add costs"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId && job.assignedToEmployeeId === auth.currentUser!.id) {
                updatedJob = {
                  ...job,
                  additionalCosts: [
                    ...(job.additionalCosts ?? []),
                    {
                      ...payload,
                      id: payload.id ?? `job-cost-${Date.now()}`,
                      createdAt: new Date().toISOString(),
                      status: "pending",
                    },
                  ],
                  updatedAt: new Date().toISOString(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found or not assigned to you"));
            return;
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser],
  );

  const completeEmployeeJob = useCallback(
    async (
      jobId: string,
      payload: {
        notes?: string;
        attachments?: string[];
        requiresFollowUp?: boolean;
        completionSummary?: string;
      },
    ): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "employee") {
        return Promise.reject(new Error("Only employees can complete jobs"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId && job.assignedToEmployeeId === auth.currentUser!.id) {
                updatedJob = {
                  ...job,
                  status: payload.requiresFollowUp ? "follow-up" : "completed",
                  completionNotes: payload.notes,
                  completionSummary: payload.completionSummary,
                  completionAttachments: payload.attachments ?? job.completionAttachments,
                  completedAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found or not assigned to you"));
            return;
          }

          resolve(updatedJob);
        }, 500);
      });
    },
    [jobs, auth.currentUser],
  );

  const submitJobEstimate = useCallback(
    async (
      jobId: string,
      estimateInput: {
        items: Array<{
          label: string;
          amount: number;
          description?: string;
          category?: JobEstimateItem["category"];
        }>;
        notes?: string;
      },
    ): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "employee") {
        return Promise.reject(new Error("Only employees can submit estimates"));
      }

      if (!estimateInput.items.length) {
        return Promise.reject(new Error("At least one estimate item is required"));
      }

      const parsedItems: JobEstimateItem[] = estimateInput.items.map(
        (item, index) => ({
          id: `job-${jobId}-estimate-item-${Date.now()}-${index}`,
          label: item.label || "Line item",
          amount: Math.max(0, Number(item.amount) || 0),
          description: item.description,
          category: item.category,
        }),
      );

      if (parsedItems.some((item) => item.amount <= 0)) {
        return Promise.reject(
          new Error("Estimate item amounts must be greater than zero"),
        );
      }

      const subtotal = parsedItems.reduce((sum, item) => sum + item.amount, 0);
      const now = new Date().toISOString();

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (
                job.id === jobId &&
                job.assignedToEmployeeId === auth.currentUser!.id
              ) {
                const existingEstimate = job.estimate;
                const estimate: JobEstimate = {
                  id:
                    existingEstimate?.id ??
                    `job-${jobId}-estimate-${Date.now()}`,
                  jobId,
                  createdBy: existingEstimate?.createdBy ?? auth.currentUser!.id,
                  createdByName:
                    existingEstimate?.createdByName ??
                    auth.currentUser!.name ??
                    auth.currentUser!.email ??
                    "",
                  createdAt: existingEstimate?.createdAt ?? now,
                  status: "submitted",
                  items: parsedItems,
                  subtotal,
                  notes: estimateInput.notes,
                  updatedAt: now,
                  spApprovedBy: undefined,
                  spApprovedByName: undefined,
                  spDecisionAt: undefined,
                  tenantDecisionBy: undefined,
                  tenantDecisionByName: undefined,
                  tenantDecisionAt: undefined,
                  rejectionReason: undefined,
                };

                updatedJob = {
                  ...job,
                  estimate,
                  updatedAt: now,
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found or not assigned to you"));
            return;
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser],
  );

  const assignEmployeeToJob = useCallback(
    async (
      jobId: string,
      employeeId: string,
      options?: { scheduledDate?: string },
    ): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      // Find the employee user
      const employeeUser = auth.users[employeeId];
      if (!employeeUser) {
        return Promise.reject(new Error("Employee not found"));
      }

      // Verify employee belongs to current service provider
      if (
        employeeUser.role !== "employee" ||
        employeeUser.profile?.serviceProviderId !== auth.currentUser.id
      ) {
        return Promise.reject(
          new Error("Employee does not belong to your organization"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              // Verify job is assigned to this service provider
              if (job.assignedTo !== auth.currentUser!.id) {
                reject(
                  new Error("Job is not assigned to your organization"),
                );
                return job;
              }

              const employeeName =
                employeeUser.name ||
                employeeUser.profile?.name ||
                employeeUser.email ||
                "Employee";

              updatedJob = {
                ...job,
                assignedToEmployeeId: employeeId,
                assignedToEmployeeName: employeeName,
                scheduledDate: options?.scheduledDate || job.scheduledDate,
                status: job.status === "assigned" ? "assigned" : job.status,
                updatedAt: new Date().toISOString(),
              };

              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          // Send notification to employee
          notifications.actions.addNotification({
            id: `notif-emp-assign-${Date.now()}`,
            type: "info",
            title: "New Job Assignment",
            message: `You have been assigned to: ${updatedJob.title}`,
            userId: employeeId,
            read: false,
            createdAt: new Date().toISOString(),
          });

          resolve(updatedJob);
        }, 400);
      });
    },
    [auth.currentUser, auth.users, notifications.actions],
  );

  const approveJobAdditionalCost = useCallback(
    async (jobId: string, costId: string): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "service_provider") {
        return Promise.reject(new Error("Only service providers can approve costs"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              const additionalCosts = (job.additionalCosts ?? []).map((cost) =>
                cost.id === costId
                  ? {
                      ...cost,
                      status: "approved" as JobAdditionalCost["status"],
                      approvedBy: auth.currentUser!.id,
                      approvedByName: auth.currentUser!.name,
                      approvedAt: new Date().toISOString(),
                    }
                  : cost,
              );

              updatedJob = {
                ...job,
                additionalCosts,
                updatedAt: new Date().toISOString(),
              };
              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job or cost not found"));
            return;
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser],
  );

  const rejectJobAdditionalCost = useCallback(
    async (jobId: string, costId: string, reason: string): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "service_provider") {
        return Promise.reject(new Error("Only service providers can reject costs"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              const additionalCosts = (job.additionalCosts ?? []).map((cost) =>
                cost.id === costId
                  ? {
                      ...cost,
                      status: "rejected" as JobAdditionalCost["status"],
                      rejectionReason: reason,
                      approvedBy: undefined,
                      approvedByName: undefined,
                      approvedAt: undefined,
                    }
                  : cost,
              );

              updatedJob = {
                ...job,
                additionalCosts,
                updatedAt: new Date().toISOString(),
              };
              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job or cost not found"));
            return;
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser],
  );

  const overrideJobCompletion = useCallback(
    async (jobId: string, payload?: { note?: string }): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "service_provider") {
        return Promise.reject(
          new Error("Only service providers can override completion"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              updatedJob = {
                ...job,
                status: "completed",
                completionNotes: payload?.note ?? job.completionNotes,
                updatedAt: new Date().toISOString(),
              };
              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(
              new Error(
                "Job not found or you are not authorized to override its completion",
              ),
            );
            return;
          }

          const tenantRequest = requests.requests.find(
            (req) => req.id === updatedJob!.requestId,
          );

          if (tenantRequest?.tenantId) {
            notifications.actions.createNotification(
              tenantRequest.tenantId,
              "Job Completed",
              `Service provider has approved "${updatedJob.title}" on your behalf.`,
              "info",
            );
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser, notifications.actions, requests.requests],
  );

  const reviewJobEstimateAsProvider = useCallback(
    async (
      jobId: string,
      decision: JobEstimateStatus,
      reason?: string,
    ): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "service_provider") {
        return Promise.reject(
          new Error("Only service providers can review estimates"),
        );
      }

      if (!["approved", "rejected"].includes(decision)) {
        return Promise.reject(
          new Error("Invalid decision. Must be approved or rejected."),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;
          const now = new Date().toISOString();

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId || !job.estimate) {
                return job;
              }

              updatedJob = {
                ...job,
                estimate: {
                  ...job.estimate,
                  status: decision,
                  spApprovedBy:
                    decision === "approved" ? auth.currentUser!.id : undefined,
                  spApprovedByName:
                    decision === "approved"
                      ? auth.currentUser!.name || auth.currentUser!.email || ""
                      : undefined,
                  spDecisionAt: now,
                  rejectionReason: decision === "rejected" ? reason : undefined,
                },
                updatedAt: now,
              };

              if (decision === "approved") {
                updatedJob.assignmentHistory = [
                  ...(job.assignmentHistory ?? []),
                  {
                    id: `estimate-${jobId}-${Date.now()}`,
                    assignedAt: now,
                    assignedBy: auth.currentUser!.id,
                    assignedByName:
                      auth.currentUser!.name || auth.currentUser!.email || "",
                    status: "accepted",
                    targetType: "service_provider",
                    serviceProviderId: auth.currentUser!.id,
                    serviceProviderName:
                      auth.currentUser!.name || auth.currentUser!.email || "",
                  },
                ];
              }

              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job or estimate not found"));
            return;
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser],
  );

  const approveTenantJobCompletion = useCallback(
    async (jobId: string, feedback?: string): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "tenant") {
        return Promise.reject(
          new Error("Only tenants can approve job completion"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              updatedJob = {
                ...job,
                completionStatus: "tenant_approved",
                completionApprovedBy: auth.currentUser!.id,
                completionApprovedByName:
                  auth.currentUser!.name || auth.currentUser!.email || "",
                completionApprovedAt: new Date().toISOString(),
                completionFeedback: feedback,
                completionRejectionReason: undefined,
                completionRejectedAt: undefined,
                completionRejectedBy: undefined,
                completionRejectedByName: undefined,
                status: "completed",
                updatedAt: new Date().toISOString(),
              };
              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          if (updatedJob.assignedTo) {
            notifications.actions.createNotification(
              updatedJob.assignedTo,
              "Tenant Approved Job",
              `${auth.currentUser!.name || "Tenant"} approved "${updatedJob.title}".`,
              "success",
            );
          }

          if (updatedJob.assignedToEmployeeId) {
            notifications.actions.createNotification(
              updatedJob.assignedToEmployeeId,
              "Job Approved",
              `Tenant approved "${updatedJob.title}".`,
              "success",
            );
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser, notifications.actions],
  );

  const rejectTenantJobCompletion = useCallback(
    async (jobId: string, reason: string): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "tenant") {
        return Promise.reject(
          new Error("Only tenants can reject job completion"),
        );
      }

      if (!reason.trim()) {
        return Promise.reject(
          new Error("Please provide a reason for rejecting the completion"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              updatedJob = {
                ...job,
                completionStatus: undefined,
                completionRejectionReason: reason,
                completionRejectedBy: auth.currentUser!.id,
                completionRejectedByName:
                  auth.currentUser!.name || auth.currentUser!.email || "",
                completionRejectedAt: new Date().toISOString(),
                completionFeedback: undefined,
                status: "in-progress",
                updatedAt: new Date().toISOString(),
              };
              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          if (updatedJob.assignedTo) {
            notifications.actions.createNotification(
              updatedJob.assignedTo,
              "Completion Rejected",
              `${auth.currentUser!.name || "Tenant"} requested changes for "${updatedJob.title}".`,
              "warning",
            );
          }

          if (updatedJob.assignedToEmployeeId) {
            notifications.actions.createNotification(
              updatedJob.assignedToEmployeeId,
              "Completion Rejected",
              `Tenant requested follow-up on "${updatedJob.title}".`,
              "warning",
            );
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser, notifications.actions],
  );

  const reviewJobEstimateAsTenant = useCallback(
    async (
      jobId: string,
      payload: { decision: JobEstimateStatus | "approve" | "decline" | "approved" | "rejected"; notes?: string },
    ): Promise<Job> => {
      if (!auth.currentUser || auth.currentUser.role !== "tenant") {
        return Promise.reject(
          new Error("Only tenants can review job estimates"),
        );
      }

      const normalizedDecision =
        payload.decision === "approve" || payload.decision === "approved" || payload.decision === "tenant_approved"
          ? ("tenant_approved" as JobEstimateStatus)
          : payload.decision === "decline" ||
              payload.decision === "rejected" ||
              payload.decision === "tenant_declined"
            ? ("tenant_declined" as JobEstimateStatus)
            : null;

      if (!normalizedDecision) {
        return Promise.reject(
          new Error("Invalid decision. Must be approve/decline."),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (!job.estimate || job.id !== jobId) {
                return job;
              }

              updatedJob = {
                ...job,
                estimate: {
                  ...job.estimate,
                  status: normalizedDecision,
                  tenantDecisionBy: auth.currentUser!.id,
                  tenantDecisionByName:
                    auth.currentUser!.name || auth.currentUser!.email || "",
                  tenantDecisionAt: new Date().toISOString(),
                  rejectionReason:
                    normalizedDecision === "tenant_declined" ? payload.notes : undefined,
                },
                updatedAt: new Date().toISOString(),
              };

              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job or estimate not found"));
            return;
          }

          const employeeRecipient = updatedJob.assignedToEmployeeId;
          if (employeeRecipient) {
            notifications.actions.createNotification(
              employeeRecipient,
              normalizedDecision === "tenant_approved"
                ? "Estimate Approved"
                : "Estimate Declined",
              normalizedDecision === "tenant_approved"
                ? `${auth.currentUser!.name || "Tenant"} approved the estimate for "${updatedJob.title}".`
                : `${auth.currentUser!.name || "Tenant"} declined the estimate for "${updatedJob.title}".`,
              normalizedDecision === "tenant_approved" ? "success" : "warning",
            );
          }

          if (updatedJob.assignedTo) {
            notifications.actions.createNotification(
              updatedJob.assignedTo,
              normalizedDecision === "tenant_approved"
                ? "Tenant Approved Estimate"
                : "Tenant Declined Estimate",
              normalizedDecision === "tenant_approved"
                ? `${auth.currentUser!.name || "Tenant"} approved the estimate for "${updatedJob.title}".`
                : `${auth.currentUser!.name || "Tenant"} declined the estimate for "${updatedJob.title}".`,
              normalizedDecision === "tenant_approved" ? "success" : "warning",
            );
          }

          resolve(updatedJob);
        }, 400);
      });
    },
    [jobs, auth.currentUser, notifications.actions],
  );

  return {
    state: { jobs },
    actions: {
      getJobs,
      getJobById,
      createJob,
      updateJobStatus,
      bulkUpdateJobStatus,
      assignJob,
      assignJobToBuildingEmployee,
      queueJobAssignment,
      promoteQueuedJobAssignment,
      updateJob,
      acceptEmployeeJob,
      declineEmployeeJob,
      startEmployeeJob,
      uploadEmployeeJobPhoto,
      addEmployeeJobAdditionalCost,
      completeEmployeeJob,
      submitJobEstimate,
      assignEmployeeToJob,
      approveJobAdditionalCost,
      rejectJobAdditionalCost,
      overrideJobCompletion,
      reviewJobEstimateAsProvider,
      approveTenantJobCompletion,
      rejectTenantJobCompletion,
      reviewJobEstimateAsTenant,
    },
  };
};
