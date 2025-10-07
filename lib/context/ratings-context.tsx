import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import type { Rating } from "../types";

interface RatingsState {
  ratings: Rating[];
  loading: boolean;
  error: string | null;
}

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

const RatingsContext = createContext<RatingsContextValue | undefined>(undefined);

interface RatingsProviderProps {
  children: ReactNode;
}

export const RatingsProvider: React.FC<RatingsProviderProps> = ({ children }) => {
  const [state, setState] = useState<RatingsState>({
    ratings: [],
    loading: false,
    error: null,
  });

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const submitRating = useCallback(
    async (ratingData: {
      requestId: string;
      serviceProviderId: string;
      rating: number;
      reviewText?: string;
      attachments?: string[];
    }): Promise<Rating> => {
      try {
        setLoading(true);
        clearError();

        // TODO: Replace with actual API call
        // const response = await api.submitRating(ratingData);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const newRating: Rating = {
          id: `rating-${Date.now()}`,
          tenantId: "current-user-id", // TODO: Get from auth context
          requestId: ratingData.requestId,
          serviceProviderId: ratingData.serviceProviderId,
          rating: ratingData.rating,
          reviewText: ratingData.reviewText || "",
          attachments: ratingData.attachments || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setState((prev) => ({
          ...prev,
          ratings: [...prev.ratings, newRating],
        }));

        return newRating;
      } catch (error: any) {
        const errorMessage = error.message || "Failed to submit rating";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, clearError]
  );

  const getRatingByRequestId = useCallback(
    (requestId: string): Rating | undefined => {
      return state.ratings.find((rating) => rating.requestId === requestId);
    },
    [state.ratings]
  );

  const updateRating = useCallback(
    async (id: string, updates: Partial<Rating>): Promise<Rating> => {
      try {
        setLoading(true);
        clearError();

        // TODO: Replace with actual API call
        // const response = await api.updateRating(id, updates);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        setState((prev) => {
          const ratingIndex = prev.ratings.findIndex((r) => r.id === id);
          if (ratingIndex === -1) {
            throw new Error("Rating not found");
          }

          const updatedRating = {
            ...prev.ratings[ratingIndex],
            ...updates,
            updatedAt: new Date().toISOString(),
          };

          const newRatings = [...prev.ratings];
          newRatings[ratingIndex] = updatedRating;

          return {
            ...prev,
            ratings: newRatings,
          };
        });

        const updatedRating = state.ratings.find((r) => r.id === id);
        if (!updatedRating) {
          throw new Error("Rating not found after update");
        }

        return updatedRating;
      } catch (error: any) {
        const errorMessage = error.message || "Failed to update rating";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [state.ratings, setLoading, setError, clearError]
  );

  const deleteRating = useCallback(
    async (id: string): Promise<void> => {
      try {
        setLoading(true);
        clearError();

        // TODO: Replace with actual API call
        // await api.deleteRating(id);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        setState((prev) => ({
          ...prev,
          ratings: prev.ratings.filter((r) => r.id !== id),
        }));
      } catch (error: any) {
        const errorMessage = error.message || "Failed to delete rating";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, clearError]
  );

  const actions: RatingsActions = {
    submitRating,
    getRatingByRequestId,
    updateRating,
    deleteRating,
    setLoading,
    setError,
    clearError,
  };

  const value: RatingsContextValue = {
    ratings: state.ratings,
    loading: state.loading,
    error: state.error,
    actions,
  };

  return (
    <RatingsContext.Provider value={value}>
      {children}
    </RatingsContext.Provider>
  );
};

export const useRatings = (): RatingsContextValue => {
  const context = useContext(RatingsContext);
  if (!context) {
    throw new Error("useRatings must be used within a RatingsProvider");
  }
  return context;
};
