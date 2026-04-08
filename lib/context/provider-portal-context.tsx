import React, { createContext, useContext } from 'react';

import type {
  ProviderPortalMembership,
  ProviderPortalRuntime,
} from '../types';

type ProviderPortalContextValue = {
  runtime: ProviderPortalRuntime;
  activeProvider: ProviderPortalMembership;
  refreshRuntime: () => Promise<void>;
};

const ProviderPortalContext =
  createContext<ProviderPortalContextValue | undefined>(undefined);

interface ProviderPortalContextProviderProps {
  children: React.ReactNode;
  value: ProviderPortalContextValue;
}

export function ProviderPortalContextProvider({
  children,
  value,
}: ProviderPortalContextProviderProps) {
  return (
    <ProviderPortalContext.Provider value={value}>
      {children}
    </ProviderPortalContext.Provider>
  );
}

export const useProviderPortalContext = (): ProviderPortalContextValue => {
  const context = useContext(ProviderPortalContext);

  if (!context) {
    throw new Error(
      'useProviderPortalContext must be used within a ProviderPortalContextProvider',
    );
  }

  return context;
};
