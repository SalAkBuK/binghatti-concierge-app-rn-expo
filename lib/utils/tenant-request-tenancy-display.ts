import type { Request } from '../types';

export type TenantRequestSectionKey = 'current' | 'archived' | 'older';

export type TenantRequestGroups = {
  current: Request[];
  archived: Request[];
  older: Request[];
};

export type TenantLifecycleChipTone = 'success' | 'warning' | 'neutral';

export type TenantLifecycleChip = {
  label: 'Current' | 'Archived' | 'Older Record';
  tone: TenantLifecycleChipTone;
};

export const TENANT_REQUEST_SECTION_COPY: Record<
  TenantRequestSectionKey,
  {
    title: string;
    subtitle: string;
  }
> = {
  current: {
    title: 'Current Requests',
    subtitle: 'Requests from your current stay.',
  },
  archived: {
    title: 'Archived Requests',
    subtitle: 'Requests saved from a previous stay.',
  },
  older: {
    title: 'Older Records',
    subtitle: 'Older requests with limited history.',
  },
};

export const classifyTenantRequestByTenancyCycle = (
  request: Pick<Request, 'requestTenancyContext' | 'requesterContext'>,
): TenantRequestSectionKey => {
  switch (request.requestTenancyContext?.label) {
    case 'CURRENT_OCCUPANCY':
      return 'current';
    case 'PREVIOUS_OCCUPANCY':
    case 'NO_ACTIVE_OCCUPANCY':
      return 'archived';
    case 'UNKNOWN_TENANCY_CYCLE':
      return request.requestTenancyContext.tenancyContextSource === 'UNRESOLVED'
        ? 'older'
        : 'archived';
    default:
      if (request.requesterContext?.currentUnitOccupiedByRequester === true) {
        return 'current';
      }

      if (
        request.requesterContext?.currentUnitOccupiedByRequester === false ||
        request.requesterContext?.isFormerResident === true ||
        request.requesterContext?.residentOccupancyStatus === 'FORMER' ||
        request.requesterContext?.residentOccupancyStatus === 'NONE'
      ) {
        return 'archived';
      }

      return 'archived';
  }
};

export const groupTenantRequestsByTenancyCycle = (
  requests: Request[],
): TenantRequestGroups => {
  const groups: TenantRequestGroups = {
    current: [],
    archived: [],
    older: [],
  };

  requests.forEach((request) => {
    groups[classifyTenantRequestByTenancyCycle(request)].push(request);
  });

  return groups;
};

export const getTenantLifecycleChip = (
  request: Pick<Request, 'requestTenancyContext' | 'requesterContext'>,
): TenantLifecycleChip | null => {
  switch (classifyTenantRequestByTenancyCycle(request)) {
    case 'current':
      return { label: 'Current', tone: 'success' };
    case 'older':
      return { label: 'Older Record', tone: 'neutral' };
    case 'archived':
      return { label: 'Archived', tone: 'warning' };
    default:
      return null;
  }
};

export const getTenantLifecycleMessage = (
  request: Pick<Request, 'requestTenancyContext' | 'requesterContext'>,
): string | null => {
  switch (classifyTenantRequestByTenancyCycle(request)) {
    case 'current':
      return null;
    case 'older':
      return 'This is an older request with limited history.';
    case 'archived':
    default:
      return 'This request is archived from a previous stay.';
  }
};
