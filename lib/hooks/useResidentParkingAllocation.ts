import { AppState, type AppStateStatus } from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

import { residentSelfServiceApi } from "../services/api/resident-self-service";
import type { ResidentParkingAllocation } from "../types";

type RefetchOptions = {
  asRefresh?: boolean;
  showLoading?: boolean;
};

type HookOptions = {
  enabled?: boolean;
  onUnauthorized?: () => void | Promise<void>;
};

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

export const useResidentParkingAllocation = (options?: HookOptions) => {
  const enabled = options?.enabled ?? true;
  const onUnauthorizedRef = useRef(options?.onUnauthorized);
  const [data, setData] = useState<ResidentParkingAllocation | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    onUnauthorizedRef.current = options?.onUnauthorized;
  }, [options?.onUnauthorized]);

  const refetch = useCallback(
    async (refetchOptions: RefetchOptions = {}): Promise<void> => {
      if (!enabled) {
        setData(null);
        setIsLoading(false);
        setIsRefreshing(false);
        setErrorMessage(null);
        return;
      }

      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;
      if (refetchOptions.showLoading ?? !refetchOptions.asRefresh) {
        setIsLoading(true);
      }
      if (refetchOptions.asRefresh) {
        setIsRefreshing(true);
      }

      try {
        const allocation = await residentSelfServiceApi.getResidentActiveParkingAllocation();
        setData(allocation);
        setErrorMessage(null);
      } catch (error) {
        if (getStatusCode(error) === 401) {
          await onUnauthorizedRef.current?.();
          return;
        }

        console.error("[ResidentParking] Failed to fetch active parking allocation:", error);
        setData(null);
        setErrorMessage("Unable to load your active parking allocation right now.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        inFlightRef.current = false;
      }
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setErrorMessage(null);
      return;
    }

    void refetch({ showLoading: true });
  }, [enabled, refetch]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        void refetch({ asRefresh: true, showLoading: false });
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, refetch]);

  return {
    data,
    errorMessage,
    isLoading,
    isRefreshing,
    refetch,
  };
};
