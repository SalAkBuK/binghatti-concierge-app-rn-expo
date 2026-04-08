import { useCallback, useEffect, useState } from 'react';

import { providerPortalApi } from '../../services/api/provider-portal';
import type {
  ProviderPortalMembership,
  ProviderPortalRuntime,
} from '../../types';

export type ProviderPortalRuntimeStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'no_access'
  | 'ambiguous'
  | 'error';

type ProviderPortalRuntimeState = {
  status: ProviderPortalRuntimeStatus;
  runtime: ProviderPortalRuntime | null;
  activeProvider: ProviderPortalMembership | null;
  error: unknown;
  errorMessage: string | null;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

export const useProviderPortalRuntime = (
  enabled: boolean,
): ProviderPortalRuntimeState => {
  const [status, setStatus] = useState<ProviderPortalRuntimeStatus>(
    enabled ? 'loading' : 'idle',
  );
  const [runtime, setRuntime] = useState<ProviderPortalRuntime | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(
    async (asRefresh = false) => {
      if (!enabled) {
        setStatus('idle');
        setRuntime(null);
        setError(null);
        setErrorMessage(null);
        setIsRefreshing(false);
        return;
      }

      if (asRefresh) {
        setIsRefreshing(true);
      } else {
        setStatus('loading');
      }

      try {
        const nextRuntime = await providerPortalApi.getMe();
        const providers = nextRuntime.providers;

        setRuntime(nextRuntime);
        setError(null);
        setErrorMessage(null);

        if (providers.length === 0) {
          setStatus('no_access');
        } else if (providers.length > 1) {
          setStatus('ambiguous');
        } else {
          setStatus('ready');
        }
      } catch (nextError) {
        const status =
          nextError &&
          typeof nextError === 'object' &&
          'status' in nextError &&
          typeof (nextError as { status?: unknown }).status === 'number'
            ? ((nextError as { status?: number }).status as number)
            : undefined;

        if (status === 403) {
          setRuntime({
            user: null,
            providers: [],
          });
          setError(null);
          setErrorMessage(null);
          setStatus('no_access');
          return;
        }

        setRuntime(null);
        setError(nextError);
        setErrorMessage(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to resolve provider access.',
        );
        setStatus('error');
      } finally {
        setIsRefreshing(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const activeProvider =
    status === 'ready' && runtime?.providers.length === 1
      ? runtime.providers[0]
      : null;

  return {
    status,
    runtime,
    activeProvider,
    error,
    errorMessage,
    isRefreshing,
    refresh: useCallback(async () => {
      await load(true);
    }, [load]),
  };
};
