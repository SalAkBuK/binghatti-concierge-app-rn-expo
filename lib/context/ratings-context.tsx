import React, { ReactNode, useMemo } from "react";

import { useAppDomain } from "./connected-app-provider";
import type { Rating } from "../types";

interface RatingsActions {
  submitRating: (ratingData: {
    requestId: string;
    serviceProviderId: string;
    rating: number;
    reviewText?: string;
    attachments?: string[];
  }) => Promise<Rating>;
  getRatingByRequestId: (requestId: string) => Rating | undefined;
  updateRating: (id: string, updates: Partial<Rating>) => Promise<Rating>;
  deleteRating: (id: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  clearError: () => void;
}

interface RatingsContextValue {
  ratings: Rating[];
  loading: boolean;
  error: string | null;
  actions: RatingsActions;
}

interface RatingsProviderProps {
  children: ReactNode;
}

const unsupportedLegacyMutation = async <T,>(
  actionName: "updateRating" | "deleteRating",
): Promise<T> => {
  throw new Error(
    `${actionName} is not supported through the legacy ratings context. Use the operations domain instead.`,
  );
};

export const RatingsProvider: React.FC<RatingsProviderProps> = ({ children }) => {
  return <>{children}</>;
};

export const useRatings = (): RatingsContextValue => {
  const {
    operations: { ratings, submitRating, getRatingByRequestId },
  } = useAppDomain();

  const actions = useMemo<RatingsActions>(
    () => ({
      submitRating,
      getRatingByRequestId,
      updateRating: (id, updates) =>
        unsupportedLegacyMutation<Rating>("updateRating"),
      deleteRating: (id) => unsupportedLegacyMutation<void>("deleteRating"),
      setLoading: () => {
        // Legacy no-op. Loading is owned by the active operations domain.
      },
      setError: () => {
        // Legacy no-op. Error state is owned by the active operations domain.
      },
      clearError: () => {
        // Legacy no-op. Error state is owned by the active operations domain.
      },
    }),
    [getRatingByRequestId, submitRating],
  );

  return {
    ratings,
    loading: false,
    error: null,
    actions,
  };
};
