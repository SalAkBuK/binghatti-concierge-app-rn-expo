import { hasEffectivePermission } from '../permissions';

describe('hasEffectivePermission', () => {
  it('uses effective permissions when present', () => {
    expect(
      hasEffectivePermission(
        {
          role: 'building_employee',
          effectivePermissions: ['requests.read'],
        },
        'requests.read',
      ),
    ).toBe(true);

    expect(
      hasEffectivePermission(
        {
          role: 'building_employee',
          effectivePermissions: ['requests.read'],
        },
        'requests.update_status',
      ),
    ).toBe(false);
  });

  it('falls back to the building staff baseline when permissions are omitted', () => {
    expect(
      hasEffectivePermission(
        {
          role: 'building_employee',
          effectivePermissions: [],
        },
        'requests.update_status',
      ),
    ).toBe(true);

    expect(
      hasEffectivePermission(
        {
          role: 'building_employee',
          effectivePermissions: [],
        },
        'requests.assign',
      ),
    ).toBe(false);
  });
});

