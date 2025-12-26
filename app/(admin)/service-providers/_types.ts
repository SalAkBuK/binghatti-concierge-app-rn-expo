import type { Building, ProviderAccessRequest, ServiceProviderProfile } from "../../../lib/types";
import type { useApp } from "../../../lib/context/connected-app-provider";

export interface ProviderAssignmentState {
  selectedProvider: ServiceProviderProfile | null;
  selectedBuildings: Set<string>;
  selectedSpecialties: string[];
  assignmentNotes: string;
}

export interface CreateProviderFormState {
  name: string; // company name
  fullName: string; // contact person
  email: string;
  password: string;
  phone: string;
  address: string;
  nationality: string;
  companyName: string;
  specialty: string;
  jobTitle: string;
  skills: string;
  buildingIds: string[];
}

export type EditProviderFormState = Omit<CreateProviderFormState, "buildingIds">;

export interface UseServiceProvidersDataResult {
  serviceProviders: ServiceProviderProfile[];
  pendingRequests: ProviderAccessRequest[];
  buildingOptions: Building[];
  managedBuildings: Building[];
  hasUnreadNotifications: boolean;
  actions: ReturnType<typeof useApp>["actions"];
  currentUser: ReturnType<typeof useApp>["currentUser"];
}
