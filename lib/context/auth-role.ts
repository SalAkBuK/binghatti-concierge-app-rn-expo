import type { User } from '../types';

const asArray = (value: unknown): Record<string, any>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (entry): entry is Record<string, any> =>
        entry != null && typeof entry === 'object',
    );
  }

  if (value != null && typeof value === 'object') {
    return [value as Record<string, any>];
  }

  return [];
};

const normalizeRoleValue = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0
    ? value.toLowerCase().trim()
    : null;

const resolveNormalizedRole = (
  normalized: string | null,
): User['role'] | null => {
  if (!normalized) {
    return null;
  }

  if (['superadmin', 'super_admin', 'towerdesk'].includes(normalized)) {
    return 'super_admin';
  }

  if (['admin', 'org_admin'].includes(normalized)) {
    return 'admin';
  }

  if (['owner', 'landlord', 'property_owner'].includes(normalized)) {
    return 'owner';
  }

  if (
    [
      'manager',
      'management',
      'building_admin',
      'building_manager',
      'manager_assignment',
    ].includes(normalized)
  ) {
    return 'management';
  }

  if (['serviceprovider', 'service_provider', 'provider'].includes(normalized)) {
    return 'service_provider';
  }

  if (
    [
      'building_employee',
      'maintenancestaff',
      'maintenance_staff',
      'staff',
      'building_staff',
      'worker',
    ].includes(normalized)
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

const getBuildingAccessEntries = (payloadUser: any): Record<string, any>[] => [
  ...asArray(payloadUser?.buildingAccess),
  ...asArray(payloadUser?.buildingAssignments),
];

const getOrgAccessEntries = (payloadUser: any): Record<string, any>[] =>
  asArray(payloadUser?.orgAccess);

const resolveRoleFromAccessEntries = (
  payloadUser: any,
): User['role'] | null => {
  const buildingRoleCandidates = getBuildingAccessEntries(payloadUser).flatMap(
    (entry) => [
      entry?.roleTemplateKey,
      entry?.roleKey,
      entry?.roleName,
      entry?.type,
      entry?.name,
      entry?.key,
    ],
  );

  const buildingRole = buildingRoleCandidates
    .map((candidate) => resolveNormalizedRole(normalizeRoleValue(candidate)))
    .find((role) => role === 'management' || role === 'building_employee');

  if (buildingRole) {
    return buildingRole;
  }

  const orgRoleCandidates = getOrgAccessEntries(payloadUser).flatMap((entry) => [
    entry?.roleTemplateKey,
    entry?.roleKey,
    entry?.roleName,
    entry?.type,
    entry?.name,
    entry?.key,
  ]);

  const orgRole = orgRoleCandidates
    .map((candidate) => resolveNormalizedRole(normalizeRoleValue(candidate)))
    .find((role) => role != null);

  if (orgRole) {
    return orgRole;
  }

  if (payloadUser?.resident) {
    return 'tenant';
  }

  return null;
};

export const resolveExplicitUserRole = (
  payloadUser: any,
): User['role'] | null => {
  const rawRole = getRoleCandidates(payloadUser).find(
    (value) => typeof value === 'string' && value.trim().length > 0,
  );

  const explicitRole = resolveNormalizedRole(normalizeRoleValue(rawRole));
  if (explicitRole) {
    return explicitRole;
  }

  return resolveRoleFromAccessEntries(payloadUser);
};

export const resolveUserRole = (payloadUser: any): User['role'] | null =>
  resolveExplicitUserRole(payloadUser);

export const hasCanonicalAccessAxes = (payloadUser: any): boolean =>
  getOrgAccessEntries(payloadUser).length > 0 ||
  getBuildingAccessEntries(payloadUser).length > 0 ||
  payloadUser?.resident != null;

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
