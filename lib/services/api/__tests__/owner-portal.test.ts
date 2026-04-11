import { normalizeOwnerPortfolioRequest } from '../owner-portal';

describe('normalizeOwnerPortfolioRequest', () => {
  it('fills safe owner request defaults for legacy rows missing unit metadata', () => {
    const normalized = normalizeOwnerPortfolioRequest({
      id: 'request-1',
      orgId: 'org-1',
      orgName: '',
      ownerId: 'owner-1',
      buildingId: 'building-1',
      buildingName: '',
      unit: undefined as any,
      title: '',
      description: null as any,
      status: 'PENDING',
      priority: 'MEDIUM',
      type: 'MAINTENANCE',
      attachments: null as any,
      createdAt: '2026-04-11T10:00:00.000Z',
      updatedAt: '2026-04-11T11:00:00.000Z',
      requestTenancyContext: {
        occupancyIdAtCreation: null,
        leaseIdAtCreation: null,
        currentOccupancyId: null,
        currentLeaseId: null,
        isCurrentOccupancy: null,
        isCurrentLease: null,
        label: 'UNKNOWN_TENANCY_CYCLE',
        leaseLabel: 'UNKNOWN_LEASE_CYCLE',
        tenancyContextSource: 'UNRESOLVED',
        leaseContextSource: 'UNRESOLVED',
      },
    } as any);

    expect(normalized).toEqual(
      expect.objectContaining({
        buildingName: 'Unknown building',
        orgName: 'Owner scope',
        title: 'Maintenance request',
        description: '',
        attachments: [],
        unit: {
          id: 'unknown-unit',
          label: 'Unknown unit',
        },
        requestTenancyContext: expect.objectContaining({
          label: 'UNKNOWN_TENANCY_CYCLE',
          leaseLabel: 'UNKNOWN_LEASE_CYCLE',
          tenancyContextSource: 'UNRESOLVED',
          leaseContextSource: 'UNRESOLVED',
        }),
      }),
    );
  });
});
