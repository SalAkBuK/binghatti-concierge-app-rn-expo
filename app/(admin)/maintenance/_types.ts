import type { Building, MaintenanceType } from "../../../lib/types";

export interface MaintenanceFormState {
  buildingId: string;
  title: string;
  description: string;
  maintenanceType: MaintenanceType;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  affectedAreas: string[];
  estimatedImpact: string;
  notifyTenants: boolean;
  notificationMessage: string;
  notes: string;
}

export interface MaintenanceSummary {
  upcoming: number;
  completed: number;
  inProgress: number;
}

export interface UseMaintenanceDataResult {
  buildingOptions: Building[];
  hasUnreadNotifications: boolean;
}
