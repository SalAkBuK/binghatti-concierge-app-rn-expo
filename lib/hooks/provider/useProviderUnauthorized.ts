import { router } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '../../context/auth-context';

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
};

export const useProviderUnauthorized = () => {
  const { actions } = useAuth();

  return useCallback(
    async (error: unknown): Promise<boolean> => {
      if (getStatusCode(error) !== 401) {
        return false;
      }

      try {
        await actions.logout();
      } catch (logoutError) {
        console.warn('[ProviderPortal] Failed to clear session after 401', logoutError);
      }

      router.replace('/auth' as any);
      return true;
    },
    [actions],
  );
};
