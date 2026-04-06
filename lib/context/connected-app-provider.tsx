import React, {
  ReactNode,
  createContext,
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

interface ConnectedAppProviderProps {
  children: ReactNode;
}

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

export { useAuth, useMessaging, useNotices, useNotifications, useRequests };
