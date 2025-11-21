import { useCallback, useState } from "react";

import type { Rating, RatingSummary, Building } from "../../types";
import { DEFAULT_RATINGS, DEFAULT_RATING_SUMMARIES } from "../../utils/mockData";
import { generateId } from "../../utils";
import type { AuthContextType } from "../auth-context";
import type { NotificationsContextType } from "../notifications-context";
import type { RequestsContextType } from "../requests-context";

type AuthDependency = Pick<AuthContextType, "currentUser">;
type NotificationsDependency = Pick<NotificationsContextType, "actions">;
type RequestsDependency = Pick<RequestsContextType, "requests">;

export type RatingsModuleState = {
  ratings: Rating[];
  ratingSummaries: RatingSummary[];
};

export type RatingsModuleActions = {
  submitRating: (data: Partial<Rating>) => Promise<Rating>;
  getRatings: () => (Rating | string)[];
  getRatingByRequestId: (requestId: string) => Rating | undefined;
  getRatingSummaries: (role?: RatingSummary["role"]) => RatingSummary[];
  upsertRatingSummary: (summary: RatingSummary) => Promise<RatingSummary>;
};

type RatingsModuleDeps = {
  auth: AuthDependency;
  notifications: NotificationsDependency;
  requests: RequestsDependency;
  buildings: Building[];
};

export const useRatingsModule = ({
  auth,
  notifications,
  requests,
  buildings,
}: RatingsModuleDeps): {
  state: RatingsModuleState;
  actions: RatingsModuleActions;
} => {
  const [ratings, setRatings] = useState<Rating[]>(DEFAULT_RATINGS);
  const [ratingSummaries, setRatingSummaries] = useState<RatingSummary[]>(
    DEFAULT_RATING_SUMMARIES,
  );

  const submitRating = useCallback(
    async (ratingData: Partial<Rating>): Promise<Rating> =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (!auth.currentUser) {
            reject(new Error("User must be authenticated to submit ratings"));
            return;
          }

          const request = requests.requests.find(
            (r) => r.id === ratingData.requestId,
          );
          if (!request) {
            reject(new Error("Request not found"));
            return;
          }

          if (request.status !== "completed") {
            reject(new Error("Can only rate completed requests"));
            return;
          }

          const existingRating = ratings.find(
            (r) => r.requestId === ratingData.requestId,
          );
          if (existingRating) {
            reject(new Error("Request has already been rated"));
            return;
          }

          const newRating: Rating = {
            id: generateId(ratings).toString(),
            tenantId: auth.currentUser.id,
            requestId: ratingData.requestId || "",
            serviceProviderId:
              ratingData.serviceProviderId || request.assignedTo || "",
            buildingEmployeeId: ratingData.buildingEmployeeId,
            rating: ratingData.rating || 5,
            reviewText: ratingData.reviewText || "",
            attachments: ratingData.attachments || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setRatings((prev) => [...prev, newRating]);

          notifications.actions.createNotification(
            auth.currentUser.id,
            "Rating Submitted",
            `Thank you for rating the service for "${request.title}"`,
            "success",
          );

          resolve(newRating);
        }, 500);
      }),
    [ratings, requests.requests, auth.currentUser, notifications.actions],
  );

  const getRatings = useCallback(() => {
    if (!auth.currentUser) return [];

    if (auth.currentUser.role === "super_admin") {
      return buildings.map((building) => building.id);
    }
    return ratings.filter((rating) => rating.tenantId === auth.currentUser!.id);
  }, [ratings, auth.currentUser, buildings]);

  const getRatingByRequestId = useCallback(
    (requestId: string) => ratings.find((rating) => rating.requestId === requestId),
    [ratings],
  );

  const getRatingSummaries = useCallback(
    (role?: RatingSummary["role"]) => {
      if (!role) return ratingSummaries;
      return ratingSummaries.filter((summary) => summary.role === role);
    },
    [ratingSummaries],
  );

  const upsertRatingSummary = useCallback(
    async (summary: RatingSummary): Promise<RatingSummary> =>
      new Promise((resolve) => {
        setTimeout(() => {
          setRatingSummaries((prev) => {
            const exists = prev.some((item) => item.id === summary.id);
            if (exists) {
              return prev.map((item) =>
                item.id === summary.id ? summary : item,
              );
            }
            return [...prev, summary];
          });
          resolve(summary);
        }, 200);
      }),
    [],
  );

  return {
    state: {
      ratings,
      ratingSummaries,
    },
    actions: {
      submitRating,
      getRatings,
      getRatingByRequestId,
      getRatingSummaries,
      upsertRatingSummary,
    },
  };
};
