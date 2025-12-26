import type { UserRole } from "../../../lib/types";

export interface UserFormState {
  name: string;
  email: string;
  phone: string;
  password: string;        // Required by backend
  address: string;         // Required by backend
  nationality: string;     // Required by backend
  role: UserRole;
  buildingId: string;
  tower: string;
  floor: string;           // For tenants, this is the floorNumber
  apartment: string;       // For tenants, this is the unitNumber
  emergencyContact: string;
  emergencyPhone: string;
  entranceDate: string;    // For tenants - ISO date string
}
