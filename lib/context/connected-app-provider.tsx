import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { useAdminAppState } from './use-admin-app-state';
import { useAmenityVisitorAppState } from './use-amenity-visitor-app-state';
import { AuthProvider, useAuth } from './auth-context';
import { MessagingProvider, useMessaging } from './messaging-context';
import { NoticesProvider, useNotices } from './notices-context';
import {
  NotificationsProvider,
  useNotifications,
} from './notifications-context';
import { useOperationsAppState } from './use-operations-app-state';
import { usePropertyAppState } from './use-property-app-state';
import { RequestsProvider, useRequests } from './requests-context';
import { getUnreadNotificationsCount } from '../utils';

interface ConnectedAppProviderProps {
  children: ReactNode;
}

let hasWarnedAboutLegacyUseApp = false;

type AmenityVisitorAppState = ReturnType<typeof useAmenityVisitorAppState>;
type PropertyAppState = ReturnType<typeof usePropertyAppState>;
type OperationsAppState = ReturnType<typeof useOperationsAppState>;
type AdminAppState = ReturnType<typeof useAdminAppState>;

type ConnectedAppDomainContextValue = {
  amenityVisitor: AmenityVisitorAppState;
  property: PropertyAppState;
  operations: OperationsAppState;
  admin: AdminAppState;
};

const ConnectedAppDomainContext =
  createContext<ConnectedAppDomainContextValue | undefined>(undefined);

const ConnectedRequestsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { actions: notificationActions } = useNotifications();

  const handleNotificationCreate = (
    userId: string,
    title: string,
    message: string,
    type?: 'info' | 'success' | 'warning' | 'error',
  ) => {
    notificationActions.createNotification(userId, title, message, type);
  };

  return (
    <RequestsProvider onNotificationCreate={handleNotificationCreate}>
      {children}
    </RequestsProvider>
  );
};

const ConnectedAppDomainProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const auth = useAuth();
  const requests = useRequests();
  const notifications = useNotifications();

  const amenityVisitor = useAmenityVisitorAppState({
    auth,
    notifications,
  });

  const property = usePropertyAppState({
    auth,
    notifications,
    appendVisitorPass: amenityVisitor.appendVisitorPass,
  });

  const operations = useOperationsAppState({
    auth,
    notifications,
    requests,
    buildings: property.buildings,
    buildingEmployees: property.buildingEmployees,
    getManagedBuildingIds: property.getManagedBuildingIds,
    resolveServiceProviderIdentity: property.resolveServiceProviderIdentity,
  });

  const admin = useAdminAppState({
    auth,
    notifications,
    requests,
    buildings: property.buildings,
    getBuildings: property.getBuildings,
    getJobs: operations.getJobs,
    getBookingsByBuilding: amenityVisitor.getBookingsByBuilding,
    getVisitorsByBuilding: amenityVisitor.getVisitorsByBuilding,
  });

  const value = useMemo(
    () => ({
      amenityVisitor,
      property,
      operations,
      admin,
    }),
    [admin, amenityVisitor, operations, property],
  );

  return (
    <ConnectedAppDomainContext.Provider value={value}>
      {children}
    </ConnectedAppDomainContext.Provider>
  );
};

const useConnectedAppContextValue = () => {
  const auth = useAuth();
  const requests = useRequests();
  const notifications = useNotifications();
  const notices = useNotices();
  const messaging = useMessaging();
  const { amenityVisitor, property, operations, admin } = useAppDomain();

  const createRequest = useCallback(
    (requestData: any) => {
      if (!auth.currentUser) {
        return Promise.reject(
          new Error('User must be authenticated to create requests'),
        );
      }

      return requests.actions.createRequest(requestData, auth.currentUser.id);
    },
    [auth.currentUser, requests.actions],
  );

  const broadcastNotificationToRole = useCallback(
    (role: any, title: string, message: string, type?: any) =>
      notifications.actions.broadcastNotificationToRole(
        role,
        title,
        message,
        type,
        auth.users,
      ),
    [auth.users, notifications.actions],
  );

  const setLoading = useCallback(
    (loading: boolean) => {
      auth.actions.setLoading(loading);
      requests.actions.setLoading(loading);
      notifications.actions.setLoading(loading);
      notices.actions.setLoading(loading);
    },
    [auth.actions, notices.actions, notifications.actions, requests.actions],
  );

  const setError = useCallback(
    (error: string) => {
      auth.actions.setError(error);
      requests.actions.setError(error);
      notifications.actions.setError(error);
      notices.actions.setError(error);
    },
    [auth.actions, notices.actions, notifications.actions, requests.actions],
  );

  const clearError = useCallback(() => {
    auth.actions.clearError();
    requests.actions.clearError();
    notifications.actions.clearError();
    notices.actions.clearError();
  }, [auth.actions, notices.actions, notifications.actions, requests.actions]);

  const refreshData = useCallback(() => {
    auth.actions.clearError();
    requests.actions.clearError();
    notifications.actions.clearError();
  }, [auth.actions, notifications.actions, requests.actions]);

  const goToHome = useCallback(() => {
    // Legacy navigation helper - can be implemented as needed
  }, []);

  const unreadCount = getUnreadNotificationsCount(
    notifications.notifications,
    auth.currentUser?.id,
  );

  const loading =
    auth.loading ||
    requests.loading ||
    notifications.loading ||
    notices.loading;

  const error =
    auth.error || requests.error || notifications.error || notices.error;

  const appActions = useMemo(
    () => ({
      setAuth: auth.actions.setAuth,
      login: auth.actions.login,
      logout: auth.actions.logout,
      updateProfile: auth.actions.updateProfile,
      updateUser: auth.actions.updateUser,
      addUser: auth.actions.addUser,
      deleteUser: auth.actions.deleteUser,

      createRequest,
      updateRequest: requests.actions.updateRequest,
      deleteRequest: requests.actions.deleteRequest,
      setSelectedRequest: requests.actions.setSelectedRequest,
      addRequestMessage: requests.actions.addRequestMessage,
      addRequestNote: requests.actions.addRequestNote,
      logTimelineEvent: requests.actions.logTimelineEvent,

      createNotification: notifications.actions.createNotification,
      broadcastNotificationToRole,
      refreshNotifications: notifications.actions.refreshNotifications,
      markNotificationAsRead: notifications.actions.markNotificationAsRead,
      markAllNotificationsAsRead:
        notifications.actions.markAllNotificationsAsRead,
      dismissNotification: notifications.actions.dismissNotification,
      undismissNotification: notifications.actions.undismissNotification,

      createNotice: notices.actions.createNotice,
      updateNotice: notices.actions.updateNotice,
      deleteNotice: notices.actions.deleteNotice,
      setSelectedNotice: notices.actions.setSelectedNotice,

      fetchConversations: messaging.actions.fetchConversations,
      openConversation: messaging.actions.openConversation,
      closeConversation: messaging.actions.closeConversation,
      sendConversationMessage: messaging.actions.sendMessage,
      createConversation: messaging.actions.createConversation,

      getAmenities: amenityVisitor.getAmenities,
      getAmenityById: amenityVisitor.getAmenityById,
      getAmenityConfigs: amenityVisitor.getAmenityConfigs,
      getAmenityConfigsByBuilding: amenityVisitor.getAmenityConfigsByBuilding,
      createAmenityConfig: amenityVisitor.createAmenityConfig,
      updateAmenityConfig: amenityVisitor.updateAmenityConfig,

      getUnitTypes: property.getUnitTypes,
      getUnitTypeById: property.getUnitTypeById,
      createUnitType: property.createUnitType,
      updateUnitType: property.updateUnitType,
      deleteUnitType: property.deleteUnitType,
      getUnitsByBuilding: property.getUnitsByBuilding,
      getUnitById: property.getUnitById,

      createBooking: amenityVisitor.createBooking,
      getBookings: amenityVisitor.getBookings,
      cancelBooking: amenityVisitor.cancelBooking,

      registerVisitor: amenityVisitor.registerVisitor,
      getVisitors: amenityVisitor.getVisitors,
      cancelVisitor: amenityVisitor.cancelVisitor,
      fetchResidentVisitors: amenityVisitor.fetchResidentVisitors,
      getResidentVisitors: amenityVisitor.getResidentVisitors,
      getResidentVisitor: amenityVisitor.getResidentVisitor,
      createResidentVisitor: amenityVisitor.createResidentVisitor,
      updateResidentVisitor: amenityVisitor.updateResidentVisitor,
      cancelResidentVisitor: amenityVisitor.cancelResidentVisitor,
      clearResidentVisitorsError: amenityVisitor.clearResidentVisitorsError,
      createVisitorPass: property.createVisitorPass,
      getVisitorPasses: amenityVisitor.getVisitorPasses,
      getVisitorPassesByBuilding: amenityVisitor.getVisitorPassesByBuilding,
      approveVisitorPass: amenityVisitor.approveVisitorPass,
      rejectVisitorPass: amenityVisitor.rejectVisitorPass,
      markVisitorPassCheckIn: amenityVisitor.markVisitorPassCheckIn,
      markVisitorPassComplete: amenityVisitor.markVisitorPassComplete,
      cancelVisitorPass: amenityVisitor.cancelVisitorPass,

      submitRating: operations.submitRating,
      getRatings: operations.getRatings,
      getRatingByRequestId: operations.getRatingByRequestId,

      getUsers: admin.getUsers,
      fetchAllUsersForBuildings: admin.fetchAllUsersForBuildings,
      createUser: admin.createUser,
      adminUpdateUser: admin.updateUser,
      adminDeleteUser: admin.deleteUser,

      getBuildings: property.getBuildings,
      getBuildingById: property.getBuildingById,
      createBuilding: property.createBuilding,
      updateBuilding: property.updateBuilding,
      deleteBuilding: property.deleteBuilding,
      assignManagerToBuilding: property.assignManagerToBuilding,
      assignAdminToBuilding: property.assignAdminToBuilding,
      assignMaintenanceStaffToBuilding:
        property.assignMaintenanceStaffToBuilding,
      getBuildingAdmins: property.getBuildingAdmins,
      getAdminBuildings: property.getAdminBuildings,
      refreshBuildings: property.refreshBuildings,
      removeAdminFromBuilding: property.removeAdminFromBuilding,
      getAdminAssignedBuildingIds: property.getAdminAssignedBuildingIds,
      getAdminAssignedBuildings: property.getAdminAssignedBuildings,
      getManagedBuildingIds: property.getManagedBuildingIds,
      getManagedBuildings: property.getManagedBuildings,
      getBuildingEmployees: property.getBuildingEmployees,
      getBuildingEmployeeByUserId: property.getBuildingEmployeeByUserId,
      getBuildingEmployeeScope: property.getBuildingEmployeeScope,
      getServiceProviders: property.getServiceProviders,
      createServiceProvider: property.createServiceProvider,
      updateServiceProvider: property.updateServiceProvider,
      getServiceProviderBuildingAssignments:
        property.getServiceProviderBuildingAssignments,
      getServiceProvidersForBuilding: property.getServiceProvidersForBuilding,
      assignServiceProviderToBuilding:
        property.assignServiceProviderToBuilding,
      removeServiceProviderFromBuilding:
        property.removeServiceProviderFromBuilding,
      updateServiceProviderAssignment:
        property.updateServiceProviderAssignment,
      createProviderAccessRequest: property.createProviderAccessRequest,
      updateProviderAccessRequest: property.updateProviderAccessRequest,
      approveProviderAccessRequest: property.approveProviderAccessRequest,
      rejectProviderAccessRequest: property.rejectProviderAccessRequest,
      getVisitorLogsByBuilding: amenityVisitor.getVisitorLogsByBuilding,
      getRatingSummaries: operations.getRatingSummaries,
      createUnit: property.createUnit,
      deleteUnit: property.deleteUnit,
      updateUnit: property.updateUnit,
      addBuildingEmployee: property.addBuildingEmployee,
      updateBuildingEmployee: property.updateBuildingEmployee,
      removeBuildingEmployee: property.removeBuildingEmployee,
      addVisitorLog: amenityVisitor.addVisitorLog,
      updateVisitorLog: amenityVisitor.updateVisitorLog,
      upsertRatingSummary: operations.upsertRatingSummary,

      getLeases: property.getLeases,
      getLeaseById: property.getLeaseById,
      getLeasesByBuilding: property.getLeasesByBuilding,
      getLeasesByTenant: property.getLeasesByTenant,
      createLease: property.createLease,
      updateLease: property.updateLease,
      terminateLease: property.terminateLease,

      getJobs: operations.getJobs,
      getJobById: operations.getJobById,
      createJob: operations.createJob,
      updateJobStatus: operations.updateJobStatus,
      bulkUpdateJobStatus: operations.bulkUpdateJobStatus,
      assignJob: operations.assignJob,
      assignJobToBuildingEmployee: operations.assignJobToBuildingEmployee,
      queueJobAssignment: operations.queueJobAssignment,
      promoteQueuedJobAssignment: operations.promoteQueuedJobAssignment,
      updateJob: operations.updateJob,

      acceptEmployeeJob: operations.acceptEmployeeJob,
      declineEmployeeJob: operations.declineEmployeeJob,
      startEmployeeJob: operations.startEmployeeJob,
      uploadEmployeeJobPhoto: operations.uploadEmployeeJobPhoto,
      addEmployeeJobAdditionalCost:
        operations.addEmployeeJobAdditionalCost,
      completeEmployeeJob: operations.completeEmployeeJob,
      submitJobEstimate: operations.submitJobEstimate,

      assignEmployeeToJob: operations.assignEmployeeToJob,
      approveJobAdditionalCost: operations.approveJobAdditionalCost,
      rejectJobAdditionalCost: operations.rejectJobAdditionalCost,
      overrideJobCompletion: operations.overrideJobCompletion,
      reviewJobEstimateAsProvider: operations.reviewJobEstimateAsProvider,

      approveTenantJobCompletion: operations.approveTenantJobCompletion,
      rejectTenantJobCompletion: operations.rejectTenantJobCompletion,
      reviewJobEstimateAsTenant: operations.reviewJobEstimateAsTenant,

      getAnalytics: admin.getAnalytics,
      getManagementAnalytics: admin.getManagementAnalytics,

      getPermissions: admin.getPermissions,
      getPermissionsByRole: admin.getPermissionsByRole,

      getRequestsByBuilding: admin.getRequestsByBuilding,
      getBookingsByBuilding: amenityVisitor.getBookingsByBuilding,
      getVisitorsByBuilding: amenityVisitor.getVisitorsByBuilding,

      setLoading,
      setError,
      clearError,

      refreshData,
      goToHome,
    }),
    [
      admin,
      amenityVisitor,
      auth.actions,
      broadcastNotificationToRole,
      clearError,
      createRequest,
      goToHome,
      messaging.actions,
      notices.actions,
      notifications.actions,
      operations,
      property,
      refreshData,
      requests.actions,
      setError,
      setLoading,
    ],
  );

  const value = useMemo(
    () => ({
      isAuthenticated: auth.isAuthenticated,
      currentUser: auth.currentUser,
      userRole: auth.userRole,
      users: auth.users,

      requests: requests.requests,
      selectedRequest: requests.selectedRequest,

      notifications: notifications.notifications,
      unreadCount,

      notices: notices.notices,
      selectedNotice: notices.selectedNotice,
      activeNoticesCount: notices.activeNoticesCount,
      maintenanceNotices: notices.notices,

      conversations: messaging.conversations,
      activeConversation: messaging.activeConversation,
      messagingUnreadCount: messaging.totalUnreadCount,

      amenities: amenityVisitor.amenities,
      amenityConfigs: amenityVisitor.amenityConfigs,
      bookings: amenityVisitor.bookings,
      visitors: amenityVisitor.visitors,
      residentVisitors: amenityVisitor.residentVisitors,
      residentVisitorsLoading: amenityVisitor.residentVisitorsLoading,
      residentVisitorsError: amenityVisitor.residentVisitorsError,
      visitorPasses: amenityVisitor.visitorPasses,
      ratings: operations.ratings,

      buildings: property.buildings,
      jobs: operations.jobs,
      analytics: admin.analytics,
      rolePermissions: admin.rolePermissions,
      unitTypes: property.unitTypes,
      buildingUnits: property.buildingUnits,
      leases: property.leases,
      buildingEmployees: property.buildingEmployees,
      serviceProviders: property.serviceProviders,
      providerAccessRequests: property.providerAccessRequests,
      visitorLogs: amenityVisitor.visitorLogs,
      ratingSummaries: operations.ratingSummaries,

      loading,
      error,
      actions: appActions,
    }),
    [
      admin,
      amenityVisitor,
      appActions,
      auth.currentUser,
      auth.isAuthenticated,
      auth.userRole,
      auth.users,
      error,
      loading,
      messaging.activeConversation,
      messaging.conversations,
      messaging.totalUnreadCount,
      notices.activeNoticesCount,
      notices.notices,
      notices.selectedNotice,
      notifications.notifications,
      operations.jobs,
      operations.ratings,
      operations.ratingSummaries,
      property,
      requests.requests,
      requests.selectedRequest,
      unreadCount,
    ],
  );

  return value;
};

export const ConnectedAppProvider: React.FC<ConnectedAppProviderProps> = ({
  children,
}) => {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <MessagingProvider>
          <NoticesProvider>
            <ConnectedRequestsProvider>
              <ConnectedAppDomainProvider>{children}</ConnectedAppDomainProvider>
            </ConnectedRequestsProvider>
          </NoticesProvider>
        </MessagingProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
};

export const useAppDomain = (): ConnectedAppDomainContextValue => {
  const context = useContext(ConnectedAppDomainContext);

  if (!context) {
    throw new Error(
      'useAppDomain must be used within a ConnectedAppProvider',
    );
  }

  return context;
};

export const useApp = () => {
  if (__DEV__ && !hasWarnedAboutLegacyUseApp) {
    hasWarnedAboutLegacyUseApp = true;
    console.warn(
      '[useApp] Legacy compatibility hook. Prefer useAuth(), useRequests(), useNotifications(), useNotices(), useMessaging(), or useAppDomain().',
    );
  }

  return useConnectedAppContextValue();
};

export { useAuth, useMessaging, useNotices, useNotifications, useRequests };
