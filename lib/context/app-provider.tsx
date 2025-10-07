import React, { ReactNode } from "react";
import { AuthProvider } from "./auth-context";
import { RequestsProvider } from "./requests-context";
import { NotificationsProvider } from "./notifications-context";

interface AppProviderProps {
  children: ReactNode;
}

/**
 * Root provider that composes all domain-specific contexts
 * This provides a clean separation of concerns while maintaining a single provider
 * at the app level for easy setup.
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <RequestsProvider
          onNotificationCreate={(userId, title, message, type) => {
            // This will be handled by NotificationsProvider through the useNotifications hook
            // in components that need to create notifications from requests
          }}
        >
          {children}
        </RequestsProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
};

// Re-export all hooks for easy importing
export { useAuth } from "./auth-context";
export { useRequests } from "./requests-context";
export { useNotifications } from "./notifications-context";
