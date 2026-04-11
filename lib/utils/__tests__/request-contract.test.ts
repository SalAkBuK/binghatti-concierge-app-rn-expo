import {
  extractNotificationMetadata,
  mapRequestContractFields,
  normalizeRequestQueue,
  normalizeRequestRecommendation,
} from '../request-contract';

describe('request contract helpers', () => {
  it('normalizes queue and recommendation values', () => {
    expect(normalizeRequestQueue('awaiting_owner')).toBe('AWAITING_OWNER');
    expect(normalizeRequestRecommendation('proceed_and_notify')).toBe(
      'PROCEED_AND_NOTIFY',
    );
  });

  it('maps shared request contract fields from top-level and policy payloads', () => {
    expect(
      mapRequestContractFields({
        ownerApprovalStatus: 'pending',
        queue: 'ready_to_assign',
        policy: {
          isEmergency: true,
          isUpgrade: false,
          recommendation: 'request_owner_approval',
        },
      }),
    ).toEqual({
      ownerApprovalStatus: 'PENDING',
      queue: 'READY_TO_ASSIGN',
      policy: {
        isEmergency: true,
        isUpgrade: false,
        recommendation: 'REQUEST_OWNER_APPROVAL',
      },
      isEmergency: true,
      isUpgrade: false,
      recommendation: 'REQUEST_OWNER_APPROVAL',
    });
  });

  it('maps requester and tenancy lifecycle context from backend payloads', () => {
    expect(
      mapRequestContractFields({
        requesterContext: {
          isResident: true,
          residentOccupancyStatus: 'former',
          residentInviteStatus: 'expired',
          isFormerResident: true,
          currentUnitOccupiedByRequester: false,
          currentUnitOccupant: {
            userId: 'user-2',
            name: 'Current Occupant',
          },
        },
        requestTenancyContext: {
          occupancyIdAtCreation: 'occ-1',
          leaseIdAtCreation: 'lease-1',
          currentOccupancyId: 'occ-2',
          currentLeaseId: 'lease-2',
          isCurrentOccupancy: false,
          isCurrentLease: false,
          label: 'previous_occupancy',
          leaseLabel: 'previous_lease',
          tenancyContextSource: 'historical_inference',
          leaseContextSource: 'snapshot',
        },
      }),
    ).toEqual({
      requesterContext: {
        isResident: true,
        residentOccupancyStatus: 'FORMER',
        residentInviteStatus: 'EXPIRED',
        isFormerResident: true,
        currentUnitOccupiedByRequester: false,
        currentUnitOccupant: {
          userId: 'user-2',
          name: 'Current Occupant',
        },
      },
      requestTenancyContext: {
        occupancyIdAtCreation: 'occ-1',
        leaseIdAtCreation: 'lease-1',
        currentOccupancyId: 'occ-2',
        currentLeaseId: 'lease-2',
        isCurrentOccupancy: false,
        isCurrentLease: false,
        label: 'PREVIOUS_OCCUPANCY',
        leaseLabel: 'PREVIOUS_LEASE',
        tenancyContextSource: 'HISTORICAL_INFERENCE',
        leaseContextSource: 'SNAPSHOT',
      },
    });
  });

  it('preserves notification metadata when the backend sends top-level keys', () => {
    expect(
      extractNotificationMetadata({
        requestId: 'req-1',
        ownerApprovalStatus: 'APPROVED',
        isEmergency: true,
      }),
    ).toEqual({
      data: {
        requestId: 'req-1',
        ownerApprovalStatus: 'APPROVED',
        isEmergency: true,
      },
      ownerApprovalStatus: 'APPROVED',
      isEmergency: true,
    });
  });
});
