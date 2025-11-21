import type { BuildingStatus, BuildingType } from "../../../lib/types";

export interface BuildingFormState {
  name: string;
  buildingType: BuildingType;
  developer: string;
  yearBuilt: string;
  totalFloors: string;
  status: BuildingStatus;
  emirate: string;
  community: string;
  street: string;
  plotNumber: string;
  buildingNumber: string;
  makaniNumber: string;
  address: string;
  city: string;
  country: string;
  utilityPremisesNumber: string;
  totalUnits: string;
  amenities: string[];
  studios: string;
  oneBedroom: string;
  twoBedroom: string;
  threeBedroom: string;
  fourPlusBedroom: string;
  commercial: string;
  managerId: string;
}
