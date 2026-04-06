import React, { ReactNode } from "react";

import { ConnectedAppProvider } from "./connected-app-provider";

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return <ConnectedAppProvider>{children}</ConnectedAppProvider>;
};

export {
  useAppDomain,
  useAuth,
  useMessaging,
  useNotices,
  useNotifications,
  useRequests,
} from "./connected-app-provider";
