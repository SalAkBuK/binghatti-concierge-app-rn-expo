import {
  applyActiveResidentLifecycleFallback,
  mergeResidentLifecycleContext,
} from '../resident-request-lifecycle';
import type { Request, User } from '../../types';

const buildUser = (
  overrides?: Partial<User>,
): User =>
  ({
    id: 'resident-1',
    email: 'resident@example.com',
    name: 'Resident User',
    role: 'tenant',
    persona: {
      isResident: true,
      residentOccupancyStatus: 'ACTIVE',
      residentInviteStatus: null,
      keys: ['RESIDENT'],
      isOwner: false,
      isServiceProvider: false,
      serviceProviderRoles: [],
      isBuildingStaff: false,
      buildingStaffRoleKeys: [],
    },
    resident: null,
    profile: {},
    createdAt: '2026-04-11T10:00:00.000Z',
    updatedAt: '2026-04-11T10:00:00.000Z',
    ...overrides,
  } as User);

const buildRequest = (overrides?: Partial<Request>): Request =>
  ({
    id: 'request-1',
    tenantId: 'resident-1',
    title: 'Leaky tap',
    description: 'Kitchen sink issue',
    type: 'maintenance',
    status: 'pending',
    priority: 'medium',
    attachments: [],
    comments: [],
    messages: [],
    notes: [],
    timeline: [],
    createdAt: '2026-04-11T10:00:00.000Z',
    updatedAt: '2026-04-11T11:00:00.000Z',
    ...overrides,
  } as Request);

describe('resident request lifecycle helpers', () => {
  it('stamps newly created requests as current for active residents when lifecycle data is missing', () => {
    const request = applyActiveResidentLifecycleFallback(buildRequest(), buildUser());

    expect(request.requesterContext).toEqual({
      isResident: true,
      residentOccupancyStatus: 'ACTIVE',
      isFormerResident: false,
      currentUnitOccupiedByRequester: true,
      currentUnitOccupant: {
        userId: 'resident-1',
        name: 'Resident User',
      },
    });
    expect(request.requestTenancyContext).toEqual({
      occupancyIdAtCreation: null,
      leaseIdAtCreation: null,
      currentOccupancyId: null,
      currentLeaseId: null,
      isCurrentOccupancy: true,
      isCurrentLease: true,
      label: 'CURRENT_OCCUPANCY',
      leaseLabel: 'CURRENT_LEASE',
      tenancyContextSource: 'SNAPSHOT',
      leaseContextSource: 'SNAPSHOT',
    });
  });

  it('preserves locally known lifecycle data when the refresh payload drops it', () => {
    const existing = buildRequest({
      requesterContext: {
        isResident: true,
        residentOccupancyStatus: 'ACTIVE',
        isFormerResident: false,
        currentUnitOccupiedByRequester: true,
      },
      requestTenancyContext: {
        label: 'CURRENT_OCCUPANCY',
        leaseLabel: 'CURRENT_LEASE',
        isCurrentOccupancy: true,
        isCurrentLease: true,
      },
    });
    const refreshed = buildRequest({
      title: 'Leaky tap updated',
      requesterContext: undefined,
      requestTenancyContext: undefined,
    });

    expect(mergeResidentLifecycleContext(refreshed, existing)).toEqual(
      expect.objectContaining({
        title: 'Leaky tap updated',
        requesterContext: existing.requesterContext,
        requestTenancyContext: existing.requestTenancyContext,
      }),
    );
  });

  it('does not overwrite backend lifecycle context when it is already present', () => {
    const request = applyActiveResidentLifecycleFallback(
      buildRequest({
        requesterContext: {
          isResident: true,
          residentOccupancyStatus: 'FORMER',
          isFormerResident: true,
          currentUnitOccupiedByRequester: false,
        },
        requestTenancyContext: {
          occupancyIdAtCreation: 'occupancy-old',
          leaseIdAtCreation: 'lease-old',
          currentOccupancyId: 'occupancy-current',
          currentLeaseId: 'lease-current',
          isCurrentOccupancy: false,
          isCurrentLease: false,
          label: 'PREVIOUS_OCCUPANCY',
          leaseLabel: 'PREVIOUS_LEASE',
          tenancyContextSource: 'SNAPSHOT',
          leaseContextSource: 'SNAPSHOT',
        },
      }),
      buildUser(),
    );

    expect(request.requesterContext).toEqual({
      isResident: true,
      residentOccupancyStatus: 'FORMER',
      isFormerResident: true,
      currentUnitOccupiedByRequester: false,
    });
    expect(request.requestTenancyContext).toEqual({
      occupancyIdAtCreation: 'occupancy-old',
      leaseIdAtCreation: 'lease-old',
      currentOccupancyId: 'occupancy-current',
      currentLeaseId: 'lease-current',
      isCurrentOccupancy: false,
      isCurrentLease: false,
      label: 'PREVIOUS_OCCUPANCY',
      leaseLabel: 'PREVIOUS_LEASE',
      tenancyContextSource: 'SNAPSHOT',
      leaseContextSource: 'SNAPSHOT',
    });
  });

  it('treats returning residents with active resident access as current even before persona catches up', () => {
    const request = applyActiveResidentLifecycleFallback(
      buildRequest(),
      buildUser({
        persona: {
          isResident: true,
          residentOccupancyStatus: 'FORMER',
          residentInviteStatus: null,
          keys: ['RESIDENT'],
          isOwner: false,
          isServiceProvider: false,
          serviceProviderRoles: [],
          isBuildingStaff: false,
          buildingStaffRoleKeys: [],
        },
        resident: {
          occupancyId: 'occupancy-1',
          buildingId: 'building-1',
          unitId: 'unit-1',
          unitLabel: '1204',
        },
      }),
    );

    expect(request.requesterContext).toEqual({
      isResident: true,
      residentOccupancyStatus: 'ACTIVE',
      isFormerResident: false,
      currentUnitOccupiedByRequester: true,
      currentUnitOccupant: {
        userId: 'resident-1',
        name: 'Resident User',
      },
    });
    expect(request.requestTenancyContext).toEqual({
      occupancyIdAtCreation: null,
      leaseIdAtCreation: null,
      currentOccupancyId: null,
      currentLeaseId: null,
      isCurrentOccupancy: true,
      isCurrentLease: true,
      label: 'CURRENT_OCCUPANCY',
      leaseLabel: 'CURRENT_LEASE',
      tenancyContextSource: 'SNAPSHOT',
      leaseContextSource: 'SNAPSHOT',
    });
  });
});
