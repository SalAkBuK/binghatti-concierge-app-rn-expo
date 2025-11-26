import { useMemo } from "react";

import { useApp } from "../../../../lib/context/connected-app-provider";
import type { Job, JobStatus } from "../../../../lib/types";
import { filterNotificationsByUser } from "../../../../lib/utils/helpers";

export function useJobsData() {
  const { currentUser, notifications, actions } = useApp();

  const isManagement = currentUser?.role === "management";
  const managedBuildingIds = useMemo(() => {
    if (!isManagement) return [];
    return actions.getManagedBuildingIds?.() ?? [];
  }, [actions, isManagement]);

  const allJobs = actions.getJobs();

  const scopedJobs = useMemo(() => {
    if (!isManagement) return allJobs;
    if (!managedBuildingIds.length) {
      return [];
    }
    return allJobs.filter((job: Job) => managedBuildingIds.includes(job.buildingId));
  }, [allJobs, isManagement, managedBuildingIds]);

  const hasUnreadNotifications = useMemo(() => {
    const userNotifications = filterNotificationsByUser(
      notifications || [],
      currentUser?.id,
    );
    return userNotifications.some((notif) => !notif.read);
  }, [notifications, currentUser?.id]);

  const jobStatusBadge = (status: JobStatus) => {
    const palette = {
      pending: { bg: "#FEF3C7", text: "#92400E" },
      assigned: { bg: "#DBEAFE", text: "#1E40AF" },
      "in-progress": { bg: "#E0E7FF", text: "#4338CA" },
      completed: { bg: "#D1FAE5", text: "#065F46" },
      cancelled: { bg: "#FEE2E2", text: "#DC2626" },
    } as const;

    const colors = palette[status];
    return colors;
  };

  return {
    actions,
    scopedJobs,
    hasUnreadNotifications,
    jobStatusBadge,
  };
}
