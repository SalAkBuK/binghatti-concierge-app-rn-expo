import type { OwnerPortfolioRequest } from '../types';

export type OwnerTenancyBadgeTone = 'neutral' | 'info' | 'success' | 'warning';

export type OwnerTenancyBadge = {
  label: string;
  tone: OwnerTenancyBadgeTone;
};

export type OwnerRequestSectionKey = 'current' | 'historical' | 'uncategorized';

export const OWNER_REQUEST_SECTION_COPY: Record<
  OwnerRequestSectionKey,
  {
    title: string;
    subtitle: string;
  }
> = {
  current: {
    title: 'Current Tenant Requests',
    subtitle: 'Requests tied to the tenant currently in the unit.',
  },
  historical: {
    title: 'Past Tenant Requests',
    subtitle: 'Requests from earlier stays, including tenants who have since moved out.',
  },
  uncategorized: {
    title: 'Unclassified Legacy Requests',
    subtitle:
      'Older requests that could not be matched to a verified tenancy record stay separate.',
  },
};

const getActorName = (
  actor?: OwnerPortfolioRequest['createdBy'] | OwnerPortfolioRequest['assignedTo'] | null,
): string | null => {
  if (!actor) {
    return null;
  }

  return actor.name?.trim() || actor.email?.trim() || null;
};

export const getOwnerRequesterName = (
  request?: Pick<OwnerPortfolioRequest, 'createdBy'> | null,
): string => getActorName(request?.createdBy) || 'Not provided';

export const getOwnerCurrentOccupantName = (
  request?: Pick<OwnerPortfolioRequest, 'createdBy' | 'requesterContext'> | null,
): string | null => {
  const currentOccupantName = request?.requesterContext?.currentUnitOccupant?.name?.trim();
  if (currentOccupantName) {
    return currentOccupantName;
  }

  if (request?.requesterContext?.currentUnitOccupiedByRequester === true) {
    return getOwnerRequesterName(request);
  }

  return null;
};

export const getOwnerPrimaryLifecycleBadge = (
  request?: Pick<OwnerPortfolioRequest, 'requestTenancyContext'> | null,
): OwnerTenancyBadge | null => {
  switch (request?.requestTenancyContext?.label) {
    case 'CURRENT_OCCUPANCY':
      return { label: 'Current Tenant', tone: 'success' };
    case 'PREVIOUS_OCCUPANCY':
      return { label: 'Past Tenant', tone: 'warning' };
    case 'NO_ACTIVE_OCCUPANCY':
      return { label: 'Requester Moved Out', tone: 'warning' };
    case 'UNKNOWN_TENANCY_CYCLE':
      return { label: 'Legacy Record', tone: 'neutral' };
    default:
      return null;
  }
};

export const getOwnerSecondaryLifecycleBadge = (
  request?: Pick<OwnerPortfolioRequest, 'requestTenancyContext' | 'requesterContext'> | null,
): OwnerTenancyBadge | null => {
  if (
    request?.requestTenancyContext?.label !== 'CURRENT_OCCUPANCY' &&
    request?.requesterContext?.currentUnitOccupiedByRequester === true
  ) {
    return {
      label: 'Original Requester Still in Unit',
      tone: 'info',
    };
  }

  switch (request?.requestTenancyContext?.leaseLabel) {
    case 'CURRENT_LEASE':
      return { label: 'Current Lease', tone: 'info' };
    case 'PREVIOUS_LEASE':
    case 'NO_ACTIVE_LEASE':
      return { label: 'Past Lease', tone: 'warning' };
    default:
      return null;
  }
};

export const getOwnerTenancySummary = (
  request?: Pick<OwnerPortfolioRequest, 'requestTenancyContext'> | null,
): 'Current Tenant' | 'Past Tenant' | 'Legacy Record' => {
  switch (request?.requestTenancyContext?.label) {
    case 'CURRENT_OCCUPANCY':
      return 'Current Tenant';
    case 'PREVIOUS_OCCUPANCY':
    case 'NO_ACTIVE_OCCUPANCY':
      return 'Past Tenant';
    default:
      return 'Legacy Record';
  }
};

export const getOwnerLeaseSummary = (
  request?: Pick<OwnerPortfolioRequest, 'requestTenancyContext'> | null,
): 'Current' | 'Past' | 'Unknown' => {
  switch (request?.requestTenancyContext?.leaseLabel) {
    case 'CURRENT_LEASE':
      return 'Current';
    case 'PREVIOUS_LEASE':
    case 'NO_ACTIVE_LEASE':
      return 'Past';
    default:
      return 'Unknown';
  }
};

export const getOwnerTenancyUnresolvedMessage = (
  request?: Pick<OwnerPortfolioRequest, 'requestTenancyContext'> | null,
): string | null => {
  if (
    request?.requestTenancyContext?.tenancyContextSource === 'UNRESOLVED' ||
    request?.requestTenancyContext?.leaseContextSource === 'UNRESOLVED'
  ) {
    return 'This request is older and could not be linked to a verified tenancy record.';
  }

  return null;
};
