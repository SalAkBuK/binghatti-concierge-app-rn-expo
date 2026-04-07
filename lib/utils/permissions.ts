import type { User } from '../types';

const BUILDING_EMPLOYEE_BASELINE_PERMISSIONS = new Set<string>([
  'buildings.read',
  'units.read',
  'residents.read',
  'residents.profile.read',
  'leases.read',
  'leases.documents.read',
  'leases.access_items.read',
  'leases.occupants.read',
  'contracts.read',
  'contracts.documents.read',
  'contracts.occupants.read',
  'requests.read',
  'requests.update_status',
  'requests.comment',
  'parkingSlots.read',
  'parkingAllocations.read',
  'vehicles.read',
  'visitors.create',
  'visitors.read',
  'visitors.update',
  'broadcasts.read',
  'notifications.read',
  'notifications.write',
  'messaging.read',
  'messaging.write',
]);

export const hasEffectivePermission = (
  user: Pick<User, 'role' | 'effectivePermissions'> | null | undefined,
  permission: string,
): boolean => {
  const effectivePermissions = user?.effectivePermissions ?? [];
  if (effectivePermissions.includes(permission)) {
    return true;
  }

  if (
    user?.role === 'building_employee' &&
    effectivePermissions.length === 0 &&
    BUILDING_EMPLOYEE_BASELINE_PERMISSIONS.has(permission)
  ) {
    return true;
  }

  return false;
};

