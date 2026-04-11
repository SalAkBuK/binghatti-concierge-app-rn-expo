import {
  classifyOwnerRequestByTenancyCycle,
  groupOwnerRequestsByTenancyCycle,
} from '../owner-request-grouping';
import type { OwnerPortfolioRequest, RequestTenancyCycleLabel } from '../../types';

const buildRequest = (
  id: string,
  occupancyLabel?: RequestTenancyCycleLabel,
): OwnerPortfolioRequest =>
  ({
    id,
    orgId: 'org-1',
    orgName: 'Towerdesk',
    ownerId: 'owner-1',
    buildingId: 'building-1',
    buildingName: 'Twin Tower',
    unit: { id: 'unit-1', label: '101' },
    title: `Request ${id}`,
    description: `Description ${id}`,
    status: 'PENDING',
    priority: 'MEDIUM',
    type: 'MAINTENANCE',
    attachments: [],
    requestTenancyContext: occupancyLabel
      ? {
          occupancyIdAtCreation: `${id}-occupancy-created`,
          leaseIdAtCreation: `${id}-lease-created`,
          currentOccupancyId: `${id}-occupancy-current`,
          currentLeaseId: `${id}-lease-current`,
          isCurrentOccupancy: occupancyLabel === 'CURRENT_OCCUPANCY' ? true : false,
          isCurrentLease: occupancyLabel === 'CURRENT_OCCUPANCY' ? true : false,
          label: occupancyLabel,
          leaseLabel:
            occupancyLabel === 'CURRENT_OCCUPANCY'
              ? 'CURRENT_LEASE'
              : occupancyLabel === 'PREVIOUS_OCCUPANCY'
                ? 'PREVIOUS_LEASE'
                : occupancyLabel === 'NO_ACTIVE_OCCUPANCY'
                  ? 'NO_ACTIVE_LEASE'
                  : 'UNKNOWN_LEASE_CYCLE',
        }
      : undefined,
    createdAt: '2026-04-11T10:00:00.000Z',
    updatedAt: '2026-04-11T11:00:00.000Z',
  } as OwnerPortfolioRequest);

describe('owner request grouping', () => {
  it.each([
    ['CURRENT_OCCUPANCY', 'current'],
    ['PREVIOUS_OCCUPANCY', 'historical'],
    ['NO_ACTIVE_OCCUPANCY', 'historical'],
    ['UNKNOWN_TENANCY_CYCLE', 'uncategorized'],
  ] as const)(
    'classifies %s requests into the %s bucket',
    (label, expectedBucket) => {
      expect(
        classifyOwnerRequestByTenancyCycle(buildRequest('request-1', label)),
      ).toBe(expectedBucket);
    },
  );

  it('keeps requests without tenancy context uncategorized', () => {
    expect(classifyOwnerRequestByTenancyCycle(buildRequest('request-1'))).toBe(
      'uncategorized',
    );
  });

  it('groups mixed current, previous, no-active, legacy, and uncategorized requests', () => {
    const grouped = groupOwnerRequestsByTenancyCycle([
      buildRequest('current', 'CURRENT_OCCUPANCY'),
      buildRequest('previous', 'PREVIOUS_OCCUPANCY'),
      buildRequest('no-active', 'NO_ACTIVE_OCCUPANCY'),
      buildRequest('legacy', 'UNKNOWN_TENANCY_CYCLE'),
      buildRequest('uncategorized'),
    ]);

    expect(grouped.current.map((request) => request.id)).toEqual(['current']);
    expect(grouped.historical.map((request) => request.id)).toEqual([
      'previous',
      'no-active',
    ]);
    expect(grouped.uncategorized.map((request) => request.id)).toEqual([
      'legacy',
      'uncategorized',
    ]);
  });
});
