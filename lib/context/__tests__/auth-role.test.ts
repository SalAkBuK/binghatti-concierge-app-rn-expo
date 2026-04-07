import {
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

  it('keeps the legacy tenant fallback only in resolveUserRole', () => {
    expect(resolveUserRole({})).toBe('tenant');
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
