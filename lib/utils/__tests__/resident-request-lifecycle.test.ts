import {
  applyActiveResidentLifecycleFallback,
  mergeResidentLifecycleContext,
} from '../resident-request-lifecycle';
import type { Request, User } from '../../types';

const buildUser = (): User =>
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
    profile: {},
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
});
