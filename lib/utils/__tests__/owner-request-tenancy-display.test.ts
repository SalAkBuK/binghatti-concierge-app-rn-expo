import {
  getOwnerCurrentOccupantName,
  getOwnerLeaseSummary,
  getOwnerPrimaryLifecycleBadge,
  getOwnerRequesterName,
  getOwnerSecondaryLifecycleBadge,
  getOwnerTenancySummary,
  getOwnerTenancyUnresolvedMessage,
} from '../owner-request-tenancy-display';
import type { OwnerPortfolioRequest } from '../../types';

const buildRequest = (
  overrides: Partial<OwnerPortfolioRequest> = {},
): OwnerPortfolioRequest =>
  ({
    id: 'request-1',
    orgId: 'org-1',
    orgName: 'Towerdesk',
    ownerId: 'owner-1',
    buildingId: 'building-1',
    buildingName: 'Twin Tower',
    unit: { id: 'unit-1', label: '101' },
    createdBy: {
      id: 'tenant-1',
      name: 'Amina Noor',
      email: 'amina@example.com',
    },
    title: 'AC issue',
    description: 'Cooling stopped',
    status: 'PENDING',
    priority: 'MEDIUM',
    type: 'MAINTENANCE',
    attachments: [],
    createdAt: '2026-04-11T10:00:00.000Z',
    updatedAt: '2026-04-11T11:00:00.000Z',
    ...overrides,
  } as OwnerPortfolioRequest);

describe('owner request tenancy display', () => {
  it('maps current-tenant requests to owner-facing labels', () => {
    const request = buildRequest({
      requestTenancyContext: {
        label: 'CURRENT_OCCUPANCY',
        leaseLabel: 'CURRENT_LEASE',
      },
      requesterContext: {
        isResident: true,
        currentUnitOccupiedByRequester: true,
      },
    });

    expect(getOwnerPrimaryLifecycleBadge(request)).toEqual({
      label: 'Current Tenant',
      tone: 'success',
    });
    expect(getOwnerSecondaryLifecycleBadge(request)).toEqual({
      label: 'Current Lease',
      tone: 'info',
    });
    expect(getOwnerRequesterName(request)).toBe('Amina Noor');
    expect(getOwnerCurrentOccupantName(request)).toBe('Amina Noor');
    expect(getOwnerTenancySummary(request)).toBe('Current Tenant');
    expect(getOwnerLeaseSummary(request)).toBe('Current');
  });

  it('shows the move-out move-back-in edge case clearly', () => {
    const request = buildRequest({
      requestTenancyContext: {
        label: 'PREVIOUS_OCCUPANCY',
        leaseLabel: 'PREVIOUS_LEASE',
      },
      requesterContext: {
        isResident: true,
        currentUnitOccupiedByRequester: true,
      },
    });

    expect(getOwnerPrimaryLifecycleBadge(request)).toEqual({
      label: 'Past Tenant',
      tone: 'warning',
    });
    expect(getOwnerSecondaryLifecycleBadge(request)).toEqual({
      label: 'Original Requester Still in Unit',
      tone: 'info',
    });
    expect(getOwnerCurrentOccupantName(request)).toBe('Amina Noor');
    expect(getOwnerTenancySummary(request)).toBe('Past Tenant');
    expect(getOwnerLeaseSummary(request)).toBe('Past');
  });

  it('marks unresolved unknown rows as legacy records', () => {
    const request = buildRequest({
      requestTenancyContext: {
        label: 'UNKNOWN_TENANCY_CYCLE',
        leaseLabel: 'UNKNOWN_LEASE_CYCLE',
        tenancyContextSource: 'UNRESOLVED',
        leaseContextSource: 'UNRESOLVED',
      },
      requesterContext: {
        isResident: true,
        currentUnitOccupiedByRequester: false,
        currentUnitOccupant: {
          userId: 'tenant-2',
          name: 'Omar Ali',
        },
      },
    });

    expect(getOwnerPrimaryLifecycleBadge(request)).toEqual({
      label: 'Legacy Record',
      tone: 'neutral',
    });
    expect(getOwnerSecondaryLifecycleBadge(request)).toBeNull();
    expect(getOwnerCurrentOccupantName(request)).toBe('Omar Ali');
    expect(getOwnerTenancySummary(request)).toBe('Legacy Record');
    expect(getOwnerLeaseSummary(request)).toBe('Unknown');
    expect(getOwnerTenancyUnresolvedMessage(request)).toBe(
      'This request is older and could not be linked to a verified tenancy record.',
    );
  });
});
