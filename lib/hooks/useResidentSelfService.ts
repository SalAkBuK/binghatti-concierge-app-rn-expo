import { useCallback, useEffect, useRef, useState } from "react";

import { residentSelfServiceApi } from "../services/api/resident-self-service";
import type {
  ResidentActiveLease,
  ResidentLeaseDocument,
  ResidentActiveParkingAllocation,
} from "../types";

type RefetchOptions = {
  asRefresh?: boolean;
  showLoading?: boolean;
};

type InternalLoadOptions = {
  showLoading: boolean;
  asRefresh: boolean;
};

type HookOptions = {
  enabled?: boolean;
  onUnauthorized?: () => void | Promise<void>;
};

type HookResult<T> = {
  data: T;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
  refetch: (options?: RefetchOptions) => Promise<void>;
};

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

const getErrorMessage = (
  status: number | undefined,
  fallbackMessage: string,
): string => {
  if (status === 403) {
    return "Access to this information is currently unavailable.";
  }

  return fallbackMessage;
};

const useResidentResource = <T>(
  initialData: T,
  fetcher: () => Promise<T>,
  fallbackErrorMessage: string,
  options?: HookOptions,
): HookResult<T> => {
  const enabled = options?.enabled ?? true;
  const onUnauthorized = options?.onUnauthorized;
  const initialDataRef = useRef(initialData);
  const fetcherRef = useRef(fetcher);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    onUnauthorizedRef.current = onUnauthorized;
  }, [onUnauthorized]);

  const load = useCallback(
    async ({ showLoading, asRefresh }: InternalLoadOptions): Promise<void> => {
      if (!enabled) {
        setData(initialDataRef.current);
        setErrorMessage(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      if (showLoading) {
        setIsLoading(true);
      }
      if (asRefresh) {
        setIsRefreshing(true);
      }

      try {
        const nextData = await fetcherRef.current();
        setData(nextData);
        setErrorMessage(null);
      } catch (error) {
        const statusCode = getStatusCode(error);

        if (statusCode === 401) {
          await onUnauthorizedRef.current?.();
          return;
        }

        setErrorMessage(getErrorMessage(statusCode, fallbackErrorMessage));
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
        if (asRefresh) {
          setIsRefreshing(false);
        }
        inFlightRef.current = false;
      }
    },
    [enabled, fallbackErrorMessage],
  );

  useEffect(() => {
    void load({ showLoading: true, asRefresh: false });
  }, [load]);

  const refetch = useCallback(
    async (refetchOptions?: RefetchOptions) => {
      const asRefresh = refetchOptions?.asRefresh ?? false;
      const showLoading = refetchOptions?.showLoading ?? !asRefresh;
      await load({ showLoading, asRefresh });
    },
    [load],
  );

  return {
    data,
    isLoading,
    isRefreshing,
    errorMessage,
    refetch,
  };
};

export const useResidentActiveLease = (
  options?: HookOptions,
): HookResult<ResidentActiveLease | null> => {
  const fetchLease = useCallback(
    () => residentSelfServiceApi.getResidentActiveLease(),
    [],
  );

  return useResidentResource<ResidentActiveLease | null>(
    null,
    fetchLease,
    "Unable to load your lease details right now. Please try again.",
    options,
  );
};

export const useResidentLeaseDocuments = (
  options?: HookOptions,
): HookResult<ResidentLeaseDocument[]> => {
  const fetchDocuments = useCallback(
    () => residentSelfServiceApi.getResidentActiveLeaseDocuments(),
    [],
  );

  return useResidentResource<ResidentLeaseDocument[]>(
    [],
    fetchDocuments,
    "Unable to load lease documents right now. Please try again.",
    options,
  );
};

export const useResidentActiveParking = (
  options?: HookOptions,
): HookResult<ResidentActiveParkingAllocation | null> => {
  const fetchParking = useCallback(
    () => residentSelfServiceApi.getResidentActiveParkingAllocation(),
    [],
  );

  return useResidentResource<ResidentActiveParkingAllocation | null>(
    null,
    fetchParking,
    "Unable to load parking details right now. Please try again.",
    options,
  );
};
