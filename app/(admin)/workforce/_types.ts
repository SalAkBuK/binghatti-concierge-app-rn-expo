import type { BuildingEmployee } from "../../../lib/types";

export interface EmployeeFormData {
  name: string;
  role: string;
  phone: string;
  shift: NonNullable<BuildingEmployee["shift"]>;
  buildingId: string;
}

export interface StaffSummary {
  total: number;
  nightShift: number;
  avgRating: string;
}

export interface ProviderSummary {
  total: number;
  topPerformer: any;
  averageResponse: number;
}
