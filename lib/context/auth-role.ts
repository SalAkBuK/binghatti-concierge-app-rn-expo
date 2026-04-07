import type { User } from '../types';

const getRoleCandidates = (payloadUser: any): (string | undefined)[] => {
  const candidates: (string | undefined)[] = [
    payloadUser?.role,
    payloadUser?.roleKey,
    payloadUser?.roleName,
    payloadUser?.userRole,
    payloadUser?.type,
  ];

  if (Array.isArray(payloadUser?.roles) && payloadUser.roles.length > 0) {
    candidates.push(
      payloadUser.roles[0]?.roleName ??
        payloadUser.roles[0]?.key ??
        payloadUser.roles[0]?.name,
    );
  }

  return candidates;
};

export const resolveExplicitUserRole = (
  payloadUser: any,
): User['role'] | null => {
  const rawRole = getRoleCandidates(payloadUser).find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );

  if (!rawRole) {
    return null;
  }

  const normalized = rawRole.toLowerCase().trim();

  if (['superadmin', 'super_admin', 'towerdesk'].includes(normalized)) {
    return 'super_admin';
  }

  if (['admin'].includes(normalized)) {
    return 'admin';
  }

  if (['owner', 'landlord', 'property_owner'].includes(normalized)) {
    return 'owner';
  }

  if (['manager', 'management'].includes(normalized)) {
    return 'management';
  }

  if (['serviceprovider', 'service_provider', 'provider'].includes(normalized)) {
    return 'service_provider';
  }

  if (
    ['building_employee', 'maintenancestaff', 'maintenance_staff', 'staff'].includes(
      normalized,
    )
  ) {
    return 'building_employee';
  }

  if (['employee'].includes(normalized)) {
    return 'employee';
  }

  if (['tenant', 'resident'].includes(normalized)) {
    return 'tenant';
  }

  return null;
};

export const resolveUserRole = (payloadUser: any): User['role'] =>
  resolveExplicitUserRole(payloadUser) ?? 'tenant';

export const shouldFetchAssignmentsForAuthRole = (
  role: User['role'] | null,
): boolean =>
  role == null ||
  role === 'employee' ||
  role === 'management' ||
  role === 'building_employee';

export const shouldProbeOwnerRuntimeForAuthRole = (
  role: User['role'] | null,
): boolean => role == null || role === 'tenant' || role === 'owner';
