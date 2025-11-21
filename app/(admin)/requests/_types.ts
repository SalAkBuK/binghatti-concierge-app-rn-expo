import type { useApp } from "../../../lib/context/connected-app-provider";
import type {
  Building,
  Job,
  Request,
  RequestStatus,
  ServiceProviderProfile,
} from "../../../lib/types";

export type StatusFilter = "all" | RequestStatus;

export interface RequestSummary {
  total: number;
  open: number;
  resolved: number;
  unassigned: number;
}

export type RequestActions = ReturnType<typeof useApp>["actions"];

export interface UseRequestsDataResult {
  scopedRequests: Request[];
  summary: RequestSummary;
  buildingFilterOptions: Building[];
  buildingMap: Map<string, Building>;
  managedBuildings: Building[];
  selectedBuildingName: string;
  hasUnreadNotifications: boolean;
  isManagement: boolean;
  isAdmin: boolean;
  jobs: Job[];
  serviceProviders: ServiceProviderProfile[];
  actions: RequestActions;
}
