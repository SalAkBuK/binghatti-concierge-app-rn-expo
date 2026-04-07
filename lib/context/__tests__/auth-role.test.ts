import {
  hasCanonicalAccessAxes,
  resolveExplicitUserRole,
  resolveUserRole,
  shouldFetchAssignmentsForAuthRole,
  shouldProbeOwnerRuntimeForAuthRole,
} from '../auth-role';

describe('auth role helpers', () => {
  it('maps owner aliases without defaulting through tenant', () => {
    expect(resolveExplicitUserRole({ role: 'owner' })).toBe('owner');
    expect(resolveExplicitUserRole({ roleKey: 'property_owner' })).toBe('owner');
    expect(resolveExplicitUserRole({ roleName: 'landlord' })).toBe('owner');
  });

  it('returns null when the payload has no explicit role signal', () => {
    expect(resolveExplicitUserRole({})).toBeNull();
    expect(resolveExplicitUserRole({ orgId: null, role: '' })).toBeNull();
  });

  it('does not default to tenant when the payload has no resident or access axes', () => {
    expect(resolveUserRole({})).toBeNull();
  });

  it('derives building staff from building access role templates', () => {
    expect(
      resolveExplicitUserRole({
        buildingAccess: [{ roleTemplateKey: 'building_staff', scopeType: 'BUILDING' }],
      }),
    ).toBe('building_employee');
  });

  it('derives management from building manager-style access', () => {
    expect(
      resolveExplicitUserRole({
        buildingAccess: [{ roleTemplateKey: 'building_admin', scopeType: 'BUILDING' }],
      }),
    ).toBe('management');
  });

  it('derives admin from org access and only derives tenant when resident exists', () => {
    expect(
      resolveExplicitUserRole({
        orgAccess: [{ roleKey: 'org_admin', scopeType: 'ORG' }],
      }),
    ).toBe('admin');
    expect(resolveExplicitUserRole({ resident: { buildingId: 'b1' } })).toBe('tenant');
  });

  it('prefers staff/building access over resident fallback when both exist', () => {
    expect(
      resolveExplicitUserRole({
        buildingAccess: [{ roleTemplateKey: 'building_staff', scopeType: 'BUILDING' }],
        resident: { buildingId: 'b1' },
      }),
    ).toBe('building_employee');
  });

  it('detects canonical access axes from auth payloads', () => {
    expect(hasCanonicalAccessAxes({ buildingAccess: [{ roleTemplateKey: 'building_staff' }] })).toBe(true);
    expect(hasCanonicalAccessAxes({ orgAccess: [{ roleKey: 'org_admin' }] })).toBe(true);
    expect(hasCanonicalAccessAxes({ resident: { buildingId: 'b1' } })).toBe(true);
    expect(hasCanonicalAccessAxes({})).toBe(false);
  });

  it('only fetches assignments for staff-style or ambiguous auth roles', () => {
    expect(shouldFetchAssignmentsForAuthRole(null)).toBe(true);
    expect(shouldFetchAssignmentsForAuthRole('employee')).toBe(true);
    expect(shouldFetchAssignmentsForAuthRole('management')).toBe(true);
    expect(shouldFetchAssignmentsForAuthRole('building_employee')).toBe(true);
    expect(shouldFetchAssignmentsForAuthRole('tenant')).toBe(false);
    expect(shouldFetchAssignmentsForAuthRole('owner')).toBe(false);
  });

  it('only probes owner runtime for ambiguous or tenant-like roles', () => {
    expect(shouldProbeOwnerRuntimeForAuthRole(null)).toBe(true);
    expect(shouldProbeOwnerRuntimeForAuthRole('tenant')).toBe(true);
    expect(shouldProbeOwnerRuntimeForAuthRole('owner')).toBe(true);
    expect(shouldProbeOwnerRuntimeForAuthRole('management')).toBe(false);
  });
});
