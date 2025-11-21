import type { BuildingStatus } from "../../../../lib/types";

export const getStatusColor = (status: BuildingStatus | string) => {
  const colors = {
    active: { bg: "#D1FAE5", text: "#065F46" },
    maintenance: { bg: "#FEF3C7", text: "#92400E" },
    inactive: { bg: "#FEE2E2", text: "#DC2626" },
  } as const;

  return colors[status as keyof typeof colors] || colors.active;
};
