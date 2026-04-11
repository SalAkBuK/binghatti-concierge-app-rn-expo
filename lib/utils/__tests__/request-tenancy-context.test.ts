import { getRequestLifecycleBadges } from '../request-tenancy-context';

describe('getRequestLifecycleBadges', () => {
  it('returns an empty array for nullish requests', () => {
    expect(getRequestLifecycleBadges(null)).toEqual([]);
    expect(getRequestLifecycleBadges(undefined)).toEqual([]);
  });

  it('shows legacy badges only when unknown cycles are unresolved', () => {
    expect(
      getRequestLifecycleBadges({
        requestTenancyContext: {
          label: 'UNKNOWN_TENANCY_CYCLE',
          leaseLabel: 'UNKNOWN_LEASE_CYCLE',
          tenancyContextSource: 'UNRESOLVED',
          leaseContextSource: 'UNRESOLVED',
        },
      }),
    ).toEqual([
      { key: 'occupancy', label: 'Legacy Stay', tone: 'neutral' },
      { key: 'lease', label: 'Legacy Lease', tone: 'neutral' },
    ]);
  });

  it('does not fabricate legacy badges for unknown cycles without unresolved sources', () => {
    expect(
      getRequestLifecycleBadges({
        requestTenancyContext: {
          label: 'UNKNOWN_TENANCY_CYCLE',
          leaseLabel: 'UNKNOWN_LEASE_CYCLE',
        },
      }),
    ).toEqual([]);
  });

  it('shows moved-out and lease-ended badges for no-active occupancy', () => {
    expect(
      getRequestLifecycleBadges({
        requesterContext: {
          isResident: true,
          residentOccupancyStatus: 'NONE',
          currentUnitOccupiedByRequester: false,
        },
        requestTenancyContext: {
          label: 'NO_ACTIVE_OCCUPANCY',
          leaseLabel: 'NO_ACTIVE_LEASE',
        },
      }),
    ).toEqual([
      {
        key: 'requester',
        label: 'Original Requester Moved Out',
        tone: 'warning',
      },
      {
        key: 'occupancy',
        label: 'Original Requester Moved Out',
        tone: 'warning',
      },
      { key: 'lease', label: 'Original Lease Ended', tone: 'warning' },
    ]);
  });

  it('keeps previous-stay classification while still showing requester is back in the unit', () => {
    expect(
      getRequestLifecycleBadges({
        requesterContext: {
          isResident: true,
          residentOccupancyStatus: 'ACTIVE',
          currentUnitOccupiedByRequester: true,
        },
        requestTenancyContext: {
          occupancyIdAtCreation: 'occ-old',
          currentOccupancyId: 'occ-new',
          leaseIdAtCreation: 'lease-old',
          currentLeaseId: 'lease-new',
          label: 'PREVIOUS_OCCUPANCY',
          leaseLabel: 'PREVIOUS_LEASE',
          tenancyContextSource: 'SNAPSHOT',
          leaseContextSource: 'SNAPSHOT',
        },
      }),
    ).toEqual([
      {
        key: 'requester',
        label: 'Original Requester Is Occupant',
        tone: 'success',
      },
      { key: 'occupancy', label: 'Previous Stay', tone: 'warning' },
      { key: 'lease', label: 'Previous Lease', tone: 'warning' },
    ]);
  });
});
