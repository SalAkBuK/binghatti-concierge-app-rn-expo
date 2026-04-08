import {
  buildResidentUpdatePayload,
  createResidentRequestFormDefaults,
  requestToResidentRequestForm,
  validateResidentRequestForm,
} from '../resident-request-form';
import type { Request } from '../../types';

const baseRequest: Request = {
  id: 'req-1',
  tenantId: 'tenant-1',
  title: 'AC not cooling',
  description: 'Living room AC is blowing warm air.',
  type: 'hvac',
  status: 'pending',
  priority: 'medium',
  attachments: [],
  comments: [],
  messages: [],
  notes: [],
  timeline: [],
  createdAt: '2026-04-08T10:00:00.000Z',
  updatedAt: '2026-04-08T10:00:00.000Z',
};

describe('resident request form helpers', () => {
  it('maps a tenant request into backend edit form values', () => {
    expect(
      requestToResidentRequestForm({
        ...baseRequest,
        isEmergency: true,
        emergencySignals: ['NO_POWER'],
      }),
    ).toEqual({
      type: 'PLUMBING_AC_HEATING',
      title: 'AC not cooling',
      description: 'Living room AC is blowing warm air.',
      priority: 'MEDIUM',
      isEmergency: true,
      emergencySignals: ['NO_POWER'],
    });
  });

  it('builds a PATCH payload with the newly supported resident fields', () => {
    const nextForm = createResidentRequestFormDefaults({
      title: 'No power in kitchen',
      description: 'Sockets and lights stopped working this morning.',
      type: 'ELECTRICAL',
      priority: 'HIGH',
      isEmergency: true,
      emergencySignals: ['NO_POWER', 'SAFETY_RISK'],
    });

    expect(buildResidentUpdatePayload(nextForm, baseRequest)).toEqual({
      title: 'No power in kitchen',
      description: 'Sockets and lights stopped working this morning.',
      type: 'ELECTRICAL',
      priority: 'HIGH',
      isEmergency: true,
      emergencySignals: ['NO_POWER', 'SAFETY_RISK'],
    });
  });

  it('sends emergency removal when a resident turns emergency off', () => {
    const currentRequest: Request = {
      ...baseRequest,
      isEmergency: true,
      emergencySignals: ['ACTIVE_LEAK'],
    };

    const nextForm = createResidentRequestFormDefaults({
      title: currentRequest.title,
      description: currentRequest.description,
      type: 'PLUMBING_AC_HEATING',
      priority: 'MEDIUM',
      isEmergency: false,
      emergencySignals: [],
    });

    expect(buildResidentUpdatePayload(nextForm, currentRequest)).toEqual({
      isEmergency: false,
      emergencySignals: [],
    });
  });

  it('requires at least one emergency signal when emergency is enabled', () => {
    expect(
      validateResidentRequestForm(
        createResidentRequestFormDefaults({
          title: 'No power in kitchen',
          isEmergency: true,
          emergencySignals: [],
        }),
      ),
    ).toEqual({
      emergencySignals: 'Choose at least one emergency detail',
    });
  });
});
