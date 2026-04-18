import {
  classifyTenantRequestByTenancyCycle,
  getTenantLifecycleChip,
  getTenantLifecycleMessage,
  groupTenantRequestsByTenancyCycle,
} from '../tenant-request-tenancy-display';
import type { Request } from '../../types';

const buildRequest = (
  id: string,
  requestTenancyContext?: Request['requestTenancyContext'],
  requesterContext?: Request['requesterContext'],
) =>
  ({
    id,
    tenantId: 'tenant-1',
    title: `Request ${id}`,
    description: `Description ${id}`,
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
    requestTenancyContext,
    requesterContext,
  } as Request);

describe('tenant request tenancy display', () => {
  it('groups current, archived, and older requests in plain-language buckets', () => {
    const grouped = groupTenantRequestsByTenancyCycle([
      buildRequest('current', {
        label: 'CURRENT_OCCUPANCY',
        leaseLabel: 'CURRENT_LEASE',
      }),
      buildRequest('previous', {
        label: 'PREVIOUS_OCCUPANCY',
        leaseLabel: 'PREVIOUS_LEASE',
      }),
      buildRequest('moved-out', {
        label: 'NO_ACTIVE_OCCUPANCY',
        leaseLabel: 'NO_ACTIVE_LEASE',
      }),
      buildRequest('legacy', {
        label: 'UNKNOWN_TENANCY_CYCLE',
        leaseLabel: 'UNKNOWN_LEASE_CYCLE',
        tenancyContextSource: 'UNRESOLVED',
      }),
    ]);

    expect(grouped.current.map((request) => request.id)).toEqual(['current']);
    expect(grouped.archived.map((request) => request.id)).toEqual([
      'previous',
      'moved-out',
    ]);
    expect(grouped.older.map((request) => request.id)).toEqual(['legacy']);
  });

  it('treats backend unknown tenancy as older records instead of archive', () => {
    const request = buildRequest('legacy', {
      label: 'UNKNOWN_TENANCY_CYCLE',
      leaseLabel: 'UNKNOWN_LEASE_CYCLE',
      tenancyContextSource: 'HISTORICAL_INFERENCE',
    });

    expect(classifyTenantRequestByTenancyCycle(request)).toBe('older');
    expect(getTenantLifecycleChip(request)).toEqual({
      label: 'Older Record',
      tone: 'neutral',
    });
    expect(getTenantLifecycleMessage(request)).toBe(
      'This is an older request with limited history.',
    );
  });

  it('treats requester-context current occupancy as current when tenancy context is missing', () => {
    const request = buildRequest(
      'current-fallback',
      undefined,
      {
        isResident: true,
        residentOccupancyStatus: 'ACTIVE',
        isFormerResident: false,
        currentUnitOccupiedByRequester: true,
      },
    );

    expect(classifyTenantRequestByTenancyCycle(request)).toBe('current');
    expect(getTenantLifecycleChip(request)).toEqual({
      label: 'Current',
      tone: 'success',
    });
  });
});
