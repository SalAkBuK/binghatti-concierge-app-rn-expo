import type { OwnerPortfolioRequest } from '../types';

export type OwnerRequestSectionKey =
  | 'current'
  | 'historical'
  | 'uncategorized';

export type OwnerRequestGroups = {
  current: OwnerPortfolioRequest[];
  historical: OwnerPortfolioRequest[];
  uncategorized: OwnerPortfolioRequest[];
};

export const classifyOwnerRequestByTenancyCycle = (
  request: OwnerPortfolioRequest,
): OwnerRequestSectionKey => {
  const occupancyLabel = request.requestTenancyContext?.label ?? null;

  if (occupancyLabel === 'CURRENT_OCCUPANCY') {
    return 'current';
  }

  if (
    occupancyLabel === 'PREVIOUS_OCCUPANCY' ||
    occupancyLabel === 'NO_ACTIVE_OCCUPANCY'
  ) {
    return 'historical';
  }

  return 'uncategorized';
};

export const groupOwnerRequestsByTenancyCycle = (
  requests: OwnerPortfolioRequest[],
): OwnerRequestGroups => {
  const groups: OwnerRequestGroups = {
    current: [],
    historical: [],
    uncategorized: [],
  };

  requests.forEach((request) => {
    groups[classifyOwnerRequestByTenancyCycle(request)].push(request);
  });

  return groups;
};
