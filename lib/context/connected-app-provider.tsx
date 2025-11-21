import React, { ReactNode, useState, useCallback } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { RequestsProvider, useRequests } from "./requests-context";
import {
  NotificationsProvider,
  useNotifications,
} from "./notifications-context";
import { NoticesProvider, useNotices } from "./notices-context";
import { useAmenityModule } from "./modules/amenities";
import { useVisitorModule } from "./modules/visitors";
import { useRatingsModule } from "./modules/ratings";
import { usePropertyModule } from "./modules/property";
import { useJobModule } from "./modules/jobs";
import type {
  Building,
  UnitType,
  BuildingUnit,
  BuildingEmployee,
  ServiceProviderProfile,
  ServiceProviderBuildingAssignment,
  ProviderAccessRequest,
  VisitorLog,
  RatingSummary,
  Lease,
  BuildingAmenityConfig,
  VisitorPass,
  Job,
  JobCostBreakdownItem,
  JobComplianceChecklistItem,
  JobAssignmentRecord,
  JobAdditionalCost,
  JobEstimate,
  JobEstimateItem,
  JobEstimateStatus,
  Analytics,
  RolePermissions,
  CreateUserDTO,
  UpdateUserDTO,
  CreateBuildingDTO,
  UpdateBuildingDTO,
  CreateJobDTO,
  UpdateJobDTO,
  BulkUpdateJobStatusDTO,
  QueueJobAssignmentDTO,
  User,
  CreateVisitorPassDTO,
} from "../types";
import {
  DEFAULT_ANALYTICS,
  DEFAULT_ROLE_PERMISSIONS,
} from "../utils/mockData";
import { generateId } from "../utils";

interface ConnectedAppProviderProps {
  children: ReactNode;
}

/**
 * Internal component that connects contexts together
 * This ensures that RequestsProvider can access NotificationsProvider actions
 */
const ConnectedRequestsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { actions: notificationActions } = useNotifications();
  const { users } = useAuth();

  const handleNotificationCreate = (
    userId: string,
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => {
    notificationActions.createNotification(userId, title, message, type);
  };

  const handleRoleBroadcast = (
    role: any,
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => {
    notificationActions.broadcastNotificationToRole(
      role,
      title,
      message,
      type,
      users,
    );
  };

  return (
    <RequestsProvider onNotificationCreate={handleNotificationCreate}>
      {children}
    </RequestsProvider>
  );
};

/**
 * Root provider with proper context composition and connection
 */
export const ConnectedAppProvider: React.FC<ConnectedAppProviderProps> = ({
  children,
}) => {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <NoticesProvider>
          <ConnectedRequestsProvider>{children}</ConnectedRequestsProvider>
        </NoticesProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
};

// Convenience hooks that combine multiple contexts
export const useApp = () => {
  const auth = useAuth();
  const requests = useRequests();
  const notifications = useNotifications();
  const notices = useNotices();

  const {
    state: { amenities, amenityConfigs, bookings },
    actions: amenityActions,
  } = useAmenityModule({ auth, notifications });
  const {
    getAmenities,
    getAmenityById,
    getAmenityConfigs,
    getAmenityConfigsByBuilding,
    updateAmenityConfig,
    createAmenityConfig,
    createBooking,
    getBookings,
    cancelBooking,
    getBookingsByBuilding,
  } = amenityActions;

  const {
    state: { visitors, visitorPasses, visitorLogs },
    actions: visitorActions,
  } = useVisitorModule({ auth, notifications });
  const {
    registerVisitor,
    getVisitors,
    cancelVisitor,
    appendVisitorPass,
    getVisitorPasses,
    getVisitorPassesByBuilding,
    approveVisitorPass,
    rejectVisitorPass,
    markVisitorPassCheckIn,
    markVisitorPassComplete,
    cancelVisitorPass,
    addVisitorLog,
    updateVisitorLog,
    getVisitorLogsByBuilding,
    getVisitorsByBuilding,
  } = visitorActions;

  const {
    state: propertyState,
    actions: propertyActions,
  } = usePropertyModule({ auth, notifications, appendVisitorPass });
  const {
    buildings,
    unitTypes,
    buildingUnits,
    leases,
    buildingEmployees,
    serviceProviders,
    serviceProviderAssignments,
    providerAccessRequests,
  } = propertyState;
  const {
    getBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    getManagedBuildingIds,
    getManagedBuildings,
    getUnitTypes,
    getUnitTypeById,
    createUnitType,
    updateUnitType,
    deleteUnitType,
    getUnitsByBuilding,
    getUnitById,
    createUnit,
    updateUnit,
    deleteUnit,
    getBuildingEmployees,
    getBuildingEmployeeByUserId,
    getBuildingEmployeeScope,
    addBuildingEmployee,
    updateBuildingEmployee,
    removeBuildingEmployee,
    getServiceProviders,
    createServiceProvider,
    getServiceProviderBuildingAssignments,
    getServiceProvidersForBuilding,
    assignServiceProviderToBuilding,
    removeServiceProviderFromBuilding,
    updateServiceProviderAssignment,
    createProviderAccessRequest,
    updateProviderAccessRequest,
    approveProviderAccessRequest,
    rejectProviderAccessRequest,
    resolveServiceProviderIdentity,
    getLeases,
    getLeaseById,
    getLeasesByBuilding,
    getLeasesByTenant,
    createLease,
    updateLease,
    terminateLease,
    createVisitorPass,
  } = propertyActions;

  const [analytics] = useState<Analytics>(DEFAULT_ANALYTICS);
  const [rolePermissions] = useState<RolePermissions[]>(DEFAULT_ROLE_PERMISSIONS);

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
    submitRating,
    getRatings,
    getRatingByRequestId,
    getRatingSummaries,
    upsertRatingSummary,
  } = ratingsActions;

  const getUsers = useCallback(() => Object.values(auth.users), [auth.users]);

  const createUser = useCallback(
    async (userData: CreateUserDTO): Promise<User> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can create users"));
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const newUser: User = {
            id: generateId(Object.values(auth.users)).toString(),
            email: userData.email,
            name: userData.name,
            role: userData.role,
            profile: {
              name: userData.name,
              phone: userData.phone,
              apartment: userData.apartment,
              tower: userData.tower,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          auth.actions.addUser(userData.email, newUser);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "User Created",
            `New ${userData.role} user "${userData.name}" has been created`,
            "success",
          );

          resolve(newUser);
        }, 500);
      });
    },
    [auth.currentUser, auth.users, auth.actions, notifications.actions],
  );

  const updateUser = useCallback(
    async (userId: string, updates: UpdateUserDTO): Promise<User> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can update users"));
      }

      const existingUser =
        auth.users[userId] ||
        Object.values(auth.users).find((u) => u.id === userId);

      if (!existingUser) {
        return Promise.reject(new Error("User not found"));
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const updatedUser: User = {
            ...existingUser,
            ...updates,
            profile: {
              ...existingUser.profile,
              name: updates.name || existingUser.profile?.name,
              phone: updates.phone || existingUser.profile?.phone,
              apartment: updates.apartment || existingUser.profile?.apartment,
              tower: updates.tower || existingUser.profile?.tower,
            },
            updatedAt: new Date().toISOString(),
          };

          auth.actions.updateUser(updatedUser.email, updatedUser);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "User Updated",
            `User "${updatedUser.name}" has been updated`,
            "success",
          );

          resolve(updatedUser);
        }, 500);
      });
    },
    [auth.currentUser, auth.users, auth.actions, notifications.actions],
  );

  const deleteUser = useCallback(
    async (userId: string): Promise<void> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can delete users"));
      }

      const userRecord =
        auth.users[userId] ||
        Object.values(auth.users).find((u) => u.id === userId);

      if (!userRecord) {
        return Promise.reject(new Error("User not found"));
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          auth.actions.deleteUser(userRecord.email);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "User Deleted",
            `User "${userRecord.name || userRecord.email}" has been deleted`,
            "info",
          );

          resolve();
        }, 500);
      });
    },
    [auth.currentUser, auth.users, auth.actions, notifications.actions],
  );

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
  const {
    getJobs,
    getJobById,
    createJob,
    updateJobStatus,
    bulkUpdateJobStatus,
    assignJob: assignJobInternal,
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
  } = jobActions;

  const assignJob = useCallback(
    (jobId: string, serviceProviderId: string, options?: { scheduledDate?: string }) =>
      assignJobInternal(jobId, {
        serviceProviderId,
        scheduledDate: options?.scheduledDate,
      }),
    [assignJobInternal],
  );

  const getRequestsByBuilding = useCallback(
    (buildingId: string) => {
      if (!buildingId) return [];
      return (requests.requests || []).filter(
        (req) => req.buildingId === buildingId,
      );
    },
    [requests.requests],
  );

  const getManagementAnalytics = useCallback(
    (buildingId: string) => {
      if (!buildingId) return null;

      const building = buildings.find((b) => b.id === buildingId);
      if (!building) return null;

      const buildingRequests = getRequestsByBuilding(buildingId);
      const buildingJobs = getJobs({ buildingId });
      const buildingBookings = getBookingsByBuilding(buildingId);
      const buildingVisitors = getVisitorsByBuilding(buildingId);

      const now = new Date();
      const todayDate = now.toISOString().split("T")[0];
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);

      const totalRequests = buildingRequests.length;
      const pendingRequests = buildingRequests.filter(
        (req) => req.status === "pending",
      ).length;
      const inProgressRequests = buildingRequests.filter(
        (req) => req.status === "in-progress",
      ).length;
      const completedRequests = buildingRequests.filter(
        (req) => req.status === "completed",
      );
      const completedThisWeek = completedRequests.filter((req) => {
        const ts = new Date(req.updatedAt || req.createdAt || "").getTime();
        return !Number.isNaN(ts) && ts >= sevenDaysAgo.getTime();
      }).length;
      const completionRate =
        totalRequests === 0
          ? analytics.completionRate
          : Math.round((completedRequests.length / totalRequests) * 100);

      const openJobs = buildingJobs.filter(
        (job) => job.status !== "completed" && job.status !== "cancelled",
      );
      const jobsInProgress = buildingJobs.filter(
        (job) => job.status === "in-progress",
      ).length;

      const bookingsToday = buildingBookings.filter(
        (booking) => booking.slotDate === todayDate,
      );

      const upcomingBookings = buildingBookings
        .filter((booking) => booking.slotDate >= todayDate)
        .sort((a, b) => a.slotDate.localeCompare(b.slotDate))
        .slice(0, 5);

      const visitorsToday = buildingVisitors.filter((visitor) => {
        const day =
          visitor.expectedArrivalTime?.split("T")[0] ||
          visitor.expectedDepartureTime?.split("T")[0];
        return day === todayDate;
      });

      const requestsToday = buildingRequests
        .filter(
          (req) => (req.createdAt || "").split("T")[0] === todayDate,
        )
        .slice(0, 5);

      const occupancyRate =
        building.totalUnits > 0
          ? Math.round((building.occupiedUnits / building.totalUnits) * 100)
          : analytics.occupancyRate;

      return {
        building,
        metrics: {
          totalRequests,
          pendingRequests,
          inProgressRequests,
          completedThisWeek,
          completionRate,
          openJobsCount: openJobs.length,
          jobsInProgress,
          bookingsToday: bookingsToday.length,
          upcomingBookingsCount: upcomingBookings.length,
          visitorsToday: visitorsToday.length,
          occupancyRate,
        },
        lists: {
          requestsToday,
          upcomingBookings,
          visitorsToday,
          activeJobs: openJobs.slice(0, 5),
        },
      };
    },
    [
      analytics.completionRate,
      analytics.occupancyRate,
      buildings,
      getBookingsByBuilding,
      getJobs,
      getRequestsByBuilding,
      getVisitorsByBuilding,
    ],
  );

  // Admin actions - Analytics
  const getAnalytics = useCallback(() => {
    // In a real app, this would calculate from actual data
    return analytics;
  }, [analytics]);

  // Admin actions - Permissions
  const getPermissions = useCallback(() => {
    return rolePermissions;
  }, [rolePermissions]);

  const getPermissionsByRole = useCallback(
    (role: User["role"]) => {
      return rolePermissions.find((rp) => rp.role === role);
    },
    [rolePermissions],
  );

  return {
    // Auth state
    isAuthenticated: auth.isAuthenticated,
    currentUser: auth.currentUser,
    userRole: auth.userRole,
    users: auth.users,

    // Request state
    requests: requests.requests,
    selectedRequest: requests.selectedRequest,

    // Notification state
    notifications: notifications.notifications,
    unreadCount: notifications.unreadCount,

    // Notices state
    notices: notices.notices,
    selectedNotice: notices.selectedNotice,
    activeNoticesCount: notices.activeNoticesCount,
    maintenanceNotices: notices.notices, // Legacy compatibility

    // New state - Amenities, Bookings, Visitors, Ratings
    amenities,
    amenityConfigs,
    bookings,
    visitors,
    visitorPasses,
    ratings,

    // Admin state - Buildings, Jobs, Analytics, Permissions
    buildings,
    jobs,
    analytics,
    rolePermissions,
    unitTypes,
    buildingUnits,
    leases,
    buildingEmployees,
    serviceProviders,
    providerAccessRequests,
    visitorLogs,
    ratingSummaries,

    // Combined loading state
    loading:
      auth.loading ||
      requests.loading ||
      notifications.loading ||
      notices.loading,

    // Combined error state
    error: auth.error || requests.error || notifications.error || notices.error,

    // All actions
    actions: {
      // Auth actions
      setAuth: auth.actions.setAuth,
      login: auth.actions.login,
      register: auth.actions.register,
      logout: auth.actions.logout,
      updateProfile: auth.actions.updateProfile,
      updateUser: auth.actions.updateUser,
      addUser: auth.actions.addUser,
      deleteUser: auth.actions.deleteUser,

      // Request actions
      createRequest: (requestData: any) => {
        if (!auth.currentUser) {
          return Promise.reject(
            new Error("User must be authenticated to create requests"),
          );
        }
        return requests.actions.createRequest(
          requestData,
          auth.currentUser.id,
        );
      },
      updateRequest: requests.actions.updateRequest,
      deleteRequest: requests.actions.deleteRequest,
      setSelectedRequest: requests.actions.setSelectedRequest,
      addRequestMessage: requests.actions.addRequestMessage,
      addRequestNote: requests.actions.addRequestNote,
      logTimelineEvent: requests.actions.logTimelineEvent,

      // Notification actions
      createNotification: notifications.actions.createNotification,
      broadcastNotificationToRole: (
        role: any,
        title: string,
        message: string,
        type?: any,
      ) =>
        notifications.actions.broadcastNotificationToRole(
          role,
          title,
          message,
          type,
          auth.users,
        ),
      markNotificationAsRead: notifications.actions.markNotificationAsRead,
      markAllNotificationsAsRead:
        notifications.actions.markAllNotificationsAsRead,
      deleteNotification: notifications.actions.deleteNotification,
      deleteAllNotifications: notifications.actions.deleteAllNotifications,

      // Notice actions
      createNotice: notices.actions.createNotice,
      updateNotice: notices.actions.updateNotice,
      deleteNotice: notices.actions.deleteNotice,
      setSelectedNotice: notices.actions.setSelectedNotice,

      // Amenity actions
      getAmenities,
      getAmenityById,
      getAmenityConfigs,
      getAmenityConfigsByBuilding,
      createAmenityConfig,
      updateAmenityConfig,
      getUnitTypes,
      getUnitTypeById,
      createUnitType,
      updateUnitType,
      deleteUnitType,
      getUnitsByBuilding,
      getUnitById,

      // Booking actions
      createBooking,
      getBookings,
      cancelBooking,

      // Visitor actions
      registerVisitor,
      getVisitors,
      cancelVisitor,
      createVisitorPass,
      getVisitorPasses,
      getVisitorPassesByBuilding,
      approveVisitorPass,
      rejectVisitorPass,
      markVisitorPassCheckIn,
      markVisitorPassComplete,
      cancelVisitorPass,

      // Rating actions
      submitRating,
      getRatings,
      getRatingByRequestId,

      // Admin actions - Users
      getUsers,
      createUser,
      adminUpdateUser: updateUser,
      adminDeleteUser: deleteUser,

      // Admin actions - Buildings
      getBuildings,
      getBuildingById,
      createBuilding,
      updateBuilding,
      deleteBuilding,
      getBuildingEmployees,
      getBuildingEmployeeByUserId,
      getBuildingEmployeeScope,
      getServiceProviders,
      createServiceProvider,
      getServiceProviderBuildingAssignments,
      getServiceProvidersForBuilding,
      assignServiceProviderToBuilding,
      removeServiceProviderFromBuilding,
      updateServiceProviderAssignment,
      createProviderAccessRequest,
      updateProviderAccessRequest,
      approveProviderAccessRequest,
      rejectProviderAccessRequest,
      getVisitorLogsByBuilding,
      getRatingSummaries,
      createUnit,
      deleteUnit,
      updateUnit,
      addBuildingEmployee,
      updateBuildingEmployee,
      removeBuildingEmployee,
      addVisitorLog,
      updateVisitorLog,
      upsertRatingSummary,

      // Lease actions
      getLeases,
      getLeaseById,
      getLeasesByBuilding,
      getLeasesByTenant,
      createLease,
      updateLease,
      terminateLease,

      // Admin actions - Jobs
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

      // Employee actions - Jobs
      acceptEmployeeJob,
      declineEmployeeJob,
      startEmployeeJob,
      uploadEmployeeJobPhoto,
      addEmployeeJobAdditionalCost,
      completeEmployeeJob,
      submitJobEstimate,

      // Service provider actions - Jobs
      assignEmployeeToJob,
      approveJobAdditionalCost,
      rejectJobAdditionalCost,
      overrideJobCompletion,
      reviewJobEstimateAsProvider,

      // Tenant actions - Jobs
      approveTenantJobCompletion,
      rejectTenantJobCompletion,
      reviewJobEstimateAsTenant,

      // Admin actions - Analytics
      getAnalytics,
      getManagementAnalytics,

      // Admin actions - Permissions
      getPermissions,
      getPermissionsByRole,

      // Management helpers
      getManagedBuildingIds,
      getManagedBuildings,
      getRequestsByBuilding,
      getBookingsByBuilding,
      getVisitorsByBuilding,

      // Utility actions
      setLoading: (loading: boolean) => {
        auth.actions.setLoading(loading);
        requests.actions.setLoading(loading);
        notifications.actions.setLoading(loading);
        notices.actions.setLoading(loading);
      },
      setError: (error: string) => {
        auth.actions.setError(error);
        requests.actions.setError(error);
        notifications.actions.setError(error);
        notices.actions.setError(error);
      },
      clearError: () => {
        auth.actions.clearError();
        requests.actions.clearError();
        notifications.actions.clearError();
        notices.actions.clearError();
      },

      // Legacy compatibility
      refreshData: () => {
        auth.actions.clearError();
        requests.actions.clearError();
        notifications.actions.clearError();
      },
      goToHome: () => {
        // Legacy navigation helper - can be implemented as needed
      },
    },
  };
};

// Re-export individual hooks
export { useAuth, useRequests, useNotifications, useNotices };
