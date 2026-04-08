import type {
  Building,
  Request,
  RequestPriority,
  RequestStatus,
} from '../../../types';
import { mapRequestContractFields } from '../../../utils/request-contract';

export const mapStatusFromApi = (status: any): RequestStatus => {
  if (typeof status === 'number') {
    switch (status) {
      case 0:
      case 1:
        return 'pending';
      case 2:
        return 'assigned';
      case 3:
        return 'in-progress';
      case 4:
        return 'on-hold';
      case 5:
        return 'completed';
      case 6:
        return 'cancelled';
      default:
        return 'pending';
    }
  }

  const normalized = String(status || '').toUpperCase();
  if (['OPEN'].includes(normalized)) return 'pending';
  if (['ASSIGNED'].includes(normalized)) return 'assigned';
  if (['IN_PROGRESS'].includes(normalized)) return 'in-progress';
  if (['COMPLETED'].includes(normalized)) return 'completed';
  if (['CANCELED', 'CANCELLED'].includes(normalized)) return 'cancelled';
  return 'pending';
};

export const mapPriorityFromApi = (priority: any): RequestPriority => {
  if (typeof priority === 'number') {
    switch (priority) {
      case 1:
        return 'low';
      case 2:
        return 'medium';
      case 3:
        return 'high';
      case 4:
        return 'urgent';
      default:
        return 'medium';
    }
  }

  const normalized = String(priority || '').toUpperCase();
  if (normalized === 'LOW') return 'low';
  if (normalized === 'NORMAL' || normalized === 'MEDIUM') return 'medium';
  if (normalized === 'HIGH') return 'high';
  if (normalized === 'URGENT') return 'urgent';
  return 'medium';
};

export const formatUserLabel = (value?: string | null) => {
  if (!value) return '';
  if (!value.includes('@')) return value;

  const namePart = value.split('@')[0] || '';
  const cleaned = namePart.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return value;

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const getResponseItems = <T>(
  response: { data?: T[] } | T[] | null | undefined,
): T[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

export const mapOrgAssignedBuilding = (building: any): Building => ({
  id: String(building?.id ?? building?.buildingId ?? ''),
  name:
    building?.name ||
    building?.buildingName ||
    building?.title ||
    'Building',
  address: building?.address || '',
  city: building?.city || '',
  country: building?.country || '',
  emirate: building?.emirate,
  community: building?.community,
  street: building?.street,
  plotNumber: building?.plotNumber,
  buildingNumber: building?.buildingNumber,
  makaniNumber: building?.makaniNumber,
  buildingType: building?.buildingType,
  developer: building?.developer,
  yearBuilt: building?.yearBuilt,
  totalFloors: building?.totalFloors,
  utilityPremisesNumber: building?.utilityPremisesNumber,
  managerId: building?.managerId,
  managerName: building?.managerName,
  totalUnits: building?.totalUnits ?? 0,
  occupiedUnits: building?.occupiedUnits ?? 0,
  unitBreakdown: building?.unitBreakdown,
  amenities: building?.amenities ?? [],
  status: building?.status ?? 'active',
  createdAt: building?.createdAt ?? new Date().toISOString(),
  updatedAt: building?.updatedAt ?? new Date().toISOString(),
  location: building?.location,
  units: building?.units,
});

export const mapOrgBuildingRequestSummary = (
  item: any,
  fallback: { buildingId: string; buildingName?: string },
): Request => {
  const unit = item.unit || item.unitDetails;
  const contractFields = mapRequestContractFields(item);

  return {
    id: String(item.id),
    type: 'maintenance',
    buildingId: String(item.buildingId ?? fallback.buildingId),
    buildingName: item.buildingName || fallback.buildingName,
    tenantId:
      item.createdByUserId != null
        ? String(item.createdByUserId)
        : item.createdById != null
          ? String(item.createdById)
          : item.createdByTenantId != null
            ? String(item.createdByTenantId)
            : '',
    title: item.title || 'Untitled Request',
    description: item.description || '',
    status: mapStatusFromApi(item.status),
    priority: mapPriorityFromApi(item.priority),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
    apartment:
      unit?.label ||
      item.unitLabel ||
      item.unitNumber ||
      item.apartment ||
      '',
    floor:
      item.floorNumber != null
        ? String(item.floorNumber)
        : unit?.floor != null
          ? String(unit.floor)
          : '',
    contactPhone: item.contactPhone || '',
    preferredTime: item.preferredTime || '',
    additionalNotes: item.additionalNotes || '',
    assignedTo: formatUserLabel(
      item.assignedTo?.fullName ||
        item.assignedTo?.name ||
        item.assignedTo?.email ||
        (item.assignedEmployeeId ? String(item.assignedEmployeeId) : undefined) ||
        (item.assignedToId ? String(item.assignedToId) : undefined),
    ),
    attachments: Array.isArray(item.attachments)
      ? item.attachments
          .map((attachment: any) =>
            typeof attachment === 'string'
              ? attachment
              : attachment?.fileUrl || attachment?.url || attachment?.uri || '',
          )
          .filter(Boolean)
      : [],
    ...contractFields,
    comments: [],
    messages: [],
    notes: [],
    timeline: [],
  };
};
