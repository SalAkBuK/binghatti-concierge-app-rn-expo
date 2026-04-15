import type { Request, RequestTenancyContext, RequesterContext, User } from '../types';

const isActiveResident = (user: Pick<User, 'role' | 'persona'> | null | undefined) =>
  user?.role === 'tenant' && user.persona?.residentOccupancyStatus === 'ACTIVE';

export const buildActiveResidentRequesterContext = (
  user: Pick<User, 'id' | 'name' | 'role' | 'persona'> | null | undefined,
): RequesterContext | null => {
  if (!isActiveResident(user)) {
    return null;
  }

  return {
    isResident: true,
    residentOccupancyStatus: 'ACTIVE',
    isFormerResident: false,
    currentUnitOccupiedByRequester: true,
    currentUnitOccupant: {
      userId: String(user.id),
      name: user.name ?? null,
    },
  };
};

export const buildActiveResidentTenancyContext = (
  user: Pick<User, 'role' | 'persona'> | null | undefined,
): RequestTenancyContext | null => {
  if (!isActiveResident(user)) {
    return null;
  }

  return {
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
  };
};

export const applyActiveResidentLifecycleFallback = (
  request: Request,
  user: Pick<User, 'id' | 'name' | 'role' | 'persona'> | null | undefined,
): Request => {
  const requesterContext =
    request.requesterContext ?? buildActiveResidentRequesterContext(user);
  const requestTenancyContext =
    request.requestTenancyContext ?? buildActiveResidentTenancyContext(user);

  return {
    ...request,
    ...(requesterContext ? { requesterContext } : {}),
    ...(requestTenancyContext ? { requestTenancyContext } : {}),
  };
};

export const mergeResidentLifecycleContext = (
  request: Request,
  existing?: Pick<Request, 'requesterContext' | 'requestTenancyContext'> | null,
): Request => {
  const requesterContext = request.requesterContext ?? existing?.requesterContext;
  const requestTenancyContext =
    request.requestTenancyContext ?? existing?.requestTenancyContext;

  return {
    ...request,
    ...(requesterContext ? { requesterContext } : {}),
    ...(requestTenancyContext ? { requestTenancyContext } : {}),
  };
};
