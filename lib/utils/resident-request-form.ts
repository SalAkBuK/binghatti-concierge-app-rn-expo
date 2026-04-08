import { Ionicons } from '@expo/vector-icons';

import type {
  Request,
  ResidentEmergencySignal,
} from '../types';
import type {
  CreateResidentRequestDTO,
  ResidentRequestPriority,
  ResidentRequestType,
  UpdateResidentRequestDTO,
} from '../services/api/resident-requests';

export type ResidentRequestFormValues = {
  type: ResidentRequestType;
  title: string;
  description: string;
  priority: ResidentRequestPriority;
  isEmergency: boolean;
  emergencySignals: ResidentEmergencySignal[];
};

export type ResidentRequestValidationErrors = {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  emergencySignals?: string;
};

export const RESIDENT_REQUEST_CATEGORY_OPTIONS: {
  label: string;
  value: ResidentRequestType;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    label: 'Plumbing / AC / Heating',
    value: 'PLUMBING_AC_HEATING',
    icon: 'water-outline',
  },
  { label: 'Electrical', value: 'ELECTRICAL', icon: 'flash-outline' },
  { label: 'Maintenance', value: 'MAINTENANCE', icon: 'construct-outline' },
  { label: 'Cleaning', value: 'CLEANING', icon: 'sparkles-outline' },
  { label: 'Other', value: 'OTHER', icon: 'apps-outline' },
];

export const RESIDENT_REQUEST_PRIORITY_OPTIONS: {
  label: string;
  value: ResidentRequestPriority;
}[] = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
];

export const RESIDENT_REQUEST_EMERGENCY_SIGNAL_OPTIONS: {
  label: string;
  value: ResidentEmergencySignal;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: 'Active leak', value: 'ACTIVE_LEAK', icon: 'water-outline' },
  { label: 'No power', value: 'NO_POWER', icon: 'flash-outline' },
  { label: 'Safety risk', value: 'SAFETY_RISK', icon: 'warning-outline' },
  { label: 'No cooling', value: 'NO_COOLING', icon: 'snow-outline' },
];

export const createResidentRequestFormDefaults = (
  overrides?: Partial<ResidentRequestFormValues>,
): ResidentRequestFormValues => ({
  type: 'PLUMBING_AC_HEATING',
  title: '',
  description: '',
  priority: 'MEDIUM',
  isEmergency: false,
  emergencySignals: [],
  ...overrides,
});

export const normalizeResidentEmergencySignals = (
  signals: unknown,
): ResidentEmergencySignal[] => {
  if (!Array.isArray(signals)) return [];

  return signals
    .map((signal) =>
      typeof signal === 'string' ? signal.trim().toUpperCase() : null,
    )
    .filter(
      (signal): signal is ResidentEmergencySignal =>
        signal === 'ACTIVE_LEAK' ||
        signal === 'NO_POWER' ||
        signal === 'SAFETY_RISK' ||
        signal === 'NO_COOLING',
    );
};

export const mapFrontendRequestTypeToResidentType = (
  type?: Request['type'] | string | null,
): ResidentRequestType => {
  const normalized = String(type || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '_');

  switch (normalized) {
    case 'CLEANING':
      return 'CLEANING';
    case 'ELECTRICAL':
      return 'ELECTRICAL';
    case 'PLUMBING':
    case 'PLUMBING_AC_HEATING':
    case 'HVAC':
      return 'PLUMBING_AC_HEATING';
    case 'OTHER':
      return 'OTHER';
    case 'REPAIR':
    case 'MAINTENANCE':
    default:
      return 'MAINTENANCE';
  }
};

export const mapFrontendRequestPriorityToResidentPriority = (
  priority?: Request['priority'] | string | null,
): ResidentRequestPriority => {
  const normalized = String(priority || '').trim().toUpperCase();

  switch (normalized) {
    case 'LOW':
      return 'LOW';
    case 'HIGH':
    case 'URGENT':
      return 'HIGH';
    case 'MEDIUM':
    default:
      return 'MEDIUM';
  }
};

export const requestToResidentRequestForm = (
  request: Pick<
    Request,
    'title' | 'description' | 'type' | 'priority' | 'isEmergency' | 'emergencySignals'
  >,
): ResidentRequestFormValues =>
  createResidentRequestFormDefaults({
    title: request.title || '',
    description: request.description || '',
    type: mapFrontendRequestTypeToResidentType(request.type),
    priority: mapFrontendRequestPriorityToResidentPriority(request.priority),
    isEmergency:
      Boolean(request.isEmergency) ||
      normalizeResidentEmergencySignals(request.emergencySignals).length > 0,
    emergencySignals: normalizeResidentEmergencySignals(request.emergencySignals),
  });

export const validateResidentRequestForm = (
  form: ResidentRequestFormValues,
): ResidentRequestValidationErrors => {
  const errors: ResidentRequestValidationErrors = {};

  if (!form.title.trim()) {
    errors.title = 'Title is required';
  } else if (form.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters long';
  }

  if (form.isEmergency && form.emergencySignals.length === 0) {
    errors.emergencySignals = 'Choose at least one emergency detail';
  }

  return errors;
};

export const buildResidentCreatePayload = (
  form: ResidentRequestFormValues,
): CreateResidentRequestDTO => ({
  title: form.title.trim(),
  description: form.description.trim(),
  type: form.type,
  priority: form.priority,
  isEmergency: form.isEmergency ? true : undefined,
  emergencySignals:
    form.isEmergency && form.emergencySignals.length > 0
      ? form.emergencySignals
      : undefined,
});

const areSignalsEqual = (
  left: ResidentEmergencySignal[],
  right: ResidentEmergencySignal[],
): boolean =>
  left.length === right.length &&
  left.every((signal, index) => signal === right[index]);

export const buildResidentUpdatePayload = (
  form: ResidentRequestFormValues,
  request: Pick<
    Request,
    'title' | 'description' | 'type' | 'priority' | 'isEmergency' | 'emergencySignals'
  >,
): UpdateResidentRequestDTO => {
  const current = requestToResidentRequestForm(request);
  const nextSignals = form.isEmergency ? form.emergencySignals : [];
  const payload: UpdateResidentRequestDTO = {};

  if (form.title.trim() !== current.title.trim()) {
    payload.title = form.title.trim();
  }

  if (form.description.trim() !== current.description.trim()) {
    payload.description = form.description.trim();
  }

  if (form.type !== current.type) {
    payload.type = form.type;
  }

  if (form.priority !== current.priority) {
    payload.priority = form.priority;
  }

  if (form.isEmergency !== current.isEmergency) {
    payload.isEmergency = form.isEmergency;
  }

  if (!areSignalsEqual(nextSignals, current.emergencySignals)) {
    payload.emergencySignals = nextSignals;
  }

  return payload;
};
