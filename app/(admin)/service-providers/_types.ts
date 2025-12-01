import type { Building, ProviderAccessRequest, ServiceProviderProfile } from "../../../lib/types";
import type { useApp } from "../../../lib/context/connected-app-provider";

export interface ProviderAssignmentState {
  selectedProvider: ServiceProviderProfile | null;
  selectedBuildings: Set<string>;
  selectedSpecialties: string[];
  assignmentNotes: string;
}

export interface CreateProviderFormState {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  buildingIds: string[];
}

export interface UseServiceProvidersDataResult {
  serviceProviders: ServiceProviderProfile[];
  pendingRequests: ProviderAccessRequest[];
  buildingOptions: Building[];
  managedBuildings: Building[];
  hasUnreadNotifications: boolean;
  actions: ReturnType<typeof useApp>["actions"];
  currentUser: ReturnType<typeof useApp>["currentUser"];
}
