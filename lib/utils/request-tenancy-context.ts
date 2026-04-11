import type {
  RequestLeaseCycleLabel,
  RequestTenancyContext,
  RequestTenancyCycleLabel,
  RequesterContext,
} from '../types';

export type RequestLifecycleBadgeTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning';

export type RequestLifecycleBadge = {
  key: 'requester' | 'occupancy' | 'lease';
  label: string;
  tone: RequestLifecycleBadgeTone;
};

const OCCUPANCY_LABELS: Record<RequestTenancyCycleLabel, RequestLifecycleBadge> = {
  CURRENT_OCCUPANCY: {
    key: 'occupancy',
    label: 'Current Stay',
    tone: 'success',
  },
  PREVIOUS_OCCUPANCY: {
    key: 'occupancy',
    label: 'Previous Stay',
    tone: 'warning',
  },
  NO_ACTIVE_OCCUPANCY: {
    key: 'occupancy',
    label: 'Original Requester Moved Out',
    tone: 'warning',
  },
  UNKNOWN_TENANCY_CYCLE: {
    key: 'occupancy',
    label: 'Legacy Stay',
    tone: 'neutral',
  },
};

const LEASE_LABELS: Record<RequestLeaseCycleLabel, RequestLifecycleBadge> = {
  CURRENT_LEASE: {
    key: 'lease',
    label: 'Current Lease',
    tone: 'info',
  },
  PREVIOUS_LEASE: {
    key: 'lease',
    label: 'Previous Lease',
    tone: 'warning',
  },
  NO_ACTIVE_LEASE: {
    key: 'lease',
    label: 'Original Lease Ended',
    tone: 'warning',
  },
  UNKNOWN_LEASE_CYCLE: {
    key: 'lease',
    label: 'Legacy Lease',
    tone: 'neutral',
  },
};

const getFallbackRequesterLifecycleBadge = (
  requesterContext?: RequesterContext | null,
): RequestLifecycleBadge | null => {
  if (!requesterContext || requesterContext.isResident !== true) {
    return null;
  }

  if (requesterContext.isFormerResident === true) {
    return {
      key: 'requester',
      label: 'Former Resident',
      tone: 'warning',
    };
  }

  if (requesterContext.currentUnitOccupiedByRequester === true) {
    return {
      key: 'requester',
      label: 'Original Requester Is Occupant',
      tone: 'success',
    };
  }

  if (requesterContext.currentUnitOccupiedByRequester === false) {
    return {
      key: 'requester',
      label: 'Original Requester Moved Out',
      tone: 'warning',
    };
  }

  if (requesterContext.residentOccupancyStatus === 'NONE') {
    return {
      key: 'requester',
      label: 'Requester Has No Occupancy',
      tone: 'warning',
    };
  }

  return {
    key: 'requester',
    label: 'Resident Requester',
    tone: 'info',
  };
};

export const getRequesterLifecycleBadge = (
  requesterContext?: RequesterContext | null,
  tenancyContext?: RequestTenancyContext | null,
): RequestLifecycleBadge | null => {
  if (tenancyContext?.label === 'NO_ACTIVE_OCCUPANCY') {
    return {
      key: 'requester',
      label: 'Original Requester Moved Out',
      tone: 'warning',
    };
  }

  if (
    requesterContext?.currentUnitOccupiedByRequester === true
  ) {
    return {
      key: 'requester',
      label: 'Original Requester Is Occupant',
      tone: 'success',
    };
  }

  if (
    tenancyContext?.occupancyIdAtCreation &&
    tenancyContext.currentOccupancyId &&
    tenancyContext.currentOccupancyId === tenancyContext.occupancyIdAtCreation
  ) {
    return {
      key: 'requester',
      label: 'Original Requester Is Occupant',
      tone: 'success',
    };
  }

  if (
    tenancyContext?.occupancyIdAtCreation &&
    tenancyContext.currentOccupancyId &&
    tenancyContext.currentOccupancyId !== tenancyContext.occupancyIdAtCreation
  ) {
    return null;
  }

  return getFallbackRequesterLifecycleBadge(requesterContext);
};

export const getOccupancyCycleBadge = (
  tenancyContext?: RequestTenancyContext | null,
): RequestLifecycleBadge | null => {
  if (!tenancyContext) {
    return null;
  }

  if (
    tenancyContext.label === 'UNKNOWN_TENANCY_CYCLE' &&
    tenancyContext.tenancyContextSource !== 'UNRESOLVED'
  ) {
    return null;
  }

  return OCCUPANCY_LABELS[tenancyContext.label] ?? null;
};

export const getLeaseCycleBadge = (
  tenancyContext?: RequestTenancyContext | null,
): RequestLifecycleBadge | null => {
  if (!tenancyContext) {
    return null;
  }

  if (
    tenancyContext.leaseLabel === 'UNKNOWN_LEASE_CYCLE' &&
    tenancyContext.leaseContextSource !== 'UNRESOLVED'
  ) {
    return null;
  }

  return LEASE_LABELS[tenancyContext.leaseLabel] ?? null;
};

export const getRequestLifecycleBadges = (value?: {
  requesterContext?: RequesterContext | null;
  requestTenancyContext?: RequestTenancyContext | null;
} | null): RequestLifecycleBadge[] => {
  const requesterContext = value?.requesterContext;
  const requestTenancyContext = value?.requestTenancyContext;

  return [
    getRequesterLifecycleBadge(requesterContext, requestTenancyContext),
    getOccupancyCycleBadge(requestTenancyContext),
    getLeaseCycleBadge(requestTenancyContext),
  ].filter((badge): badge is RequestLifecycleBadge => badge != null);
};
