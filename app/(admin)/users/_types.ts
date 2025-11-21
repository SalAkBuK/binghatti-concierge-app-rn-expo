import type { UserRole } from "../../../lib/types";

export interface UserFormState {
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  buildingId: string;
  tower: string;
  floor: string;
  apartment: string;
  emergencyContact: string;
  emergencyPhone: string;
}
