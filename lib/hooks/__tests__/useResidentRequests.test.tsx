import React, { useEffect } from 'react';
import TestRenderer, { act } from 'react-test-renderer';

import { useResidentRequests } from '../useResidentRequests';
import type { User } from '../../types';

const mockUseAsyncStorage = jest.fn();
const mockGetRequests = jest.fn();
const mockRemoveItem = jest.fn();
const mockSetItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    removeItem: (...args: unknown[]) => mockRemoveItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

jest.mock('../useAsyncStorage', () => ({
  useAsyncStorage: (...args: unknown[]) => mockUseAsyncStorage(...args),
}));

jest.mock('../../services/api/resident-requests', () => ({
  residentRequestsApi: {
    getRequests: (...args: unknown[]) => mockGetRequests(...args),
  },
}));

type HookSnapshot = ReturnType<typeof useResidentRequests>;

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

function Probe({
  currentUser,
  onChange,
}: {
  currentUser: User | null;
  onChange: (value: HookSnapshot) => void;
}) {
  const value = useResidentRequests({
    currentUser,
    notifications: [],
  });

  useEffect(() => {
    onChange(value);
  }, [onChange, value]);

  return null;
}

const buildUser = (occupancyStatus: 'ACTIVE' | 'FORMER'): User =>
  ({
    id: 'resident-1',
    email: 'resident@example.com',
    name: 'Resident User',
    role: 'tenant',
    persona: {
      isResident: true,
      residentOccupancyStatus: occupancyStatus,
      residentInviteStatus: null,
      keys: ['RESIDENT'],
      isOwner: false,
      isServiceProvider: false,
      serviceProviderRoles: [],
      isBuildingStaff: false,
      buildingStaffRoleKeys: [],
    },
    profile: {
      buildingName: 'Binghatti Heights',
      apartment: '1204',
      floor: '12',
    },
  } as User);

describe('useResidentRequests', () => {
  let renderer: TestRenderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    mockUseAsyncStorage.mockReset();
    mockUseAsyncStorage.mockReturnValue([
      { items: [], fetchedAt: null },
      jest.fn(),
      false,
    ]);
    mockGetRequests.mockReset();
    mockGetRequests.mockResolvedValue({
      data: [
        {
          id: 'request-1',
          title: 'Leaky tap',
          description: 'Kitchen sink issue',
          type: 'MAINTENANCE',
          status: 'ASSIGNED',
          priority: 'MEDIUM',
          createdAt: '2026-04-11T09:00:00.000Z',
          updatedAt: '2026-04-11T10:00:00.000Z',
        },
      ],
    });
    mockRemoveItem.mockReset();
    mockRemoveItem.mockResolvedValue(undefined);
    mockSetItem.mockReset();
    mockSetItem.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => {
        renderer?.unmount();
      });
      renderer = null;
    }
  });

  it('reloads request history automatically when the same resident regains active occupancy', async () => {
    const snapshots: HookSnapshot[] = [];

    await act(async () => {
      renderer = TestRenderer.create(
        <Probe
          currentUser={buildUser('ACTIVE')}
          onChange={(value) => snapshots.push(value)}
        />,
      );
    });
    await flushEffects();

    let latest = snapshots[snapshots.length - 1];
    expect(latest.historyUnavailable).toBe(false);
    expect(latest.requests).toHaveLength(1);
    expect(mockGetRequests).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer?.update(
        <Probe
          currentUser={buildUser('FORMER')}
          onChange={(value) => snapshots.push(value)}
        />,
      );
    });
    await flushEffects();

    latest = snapshots[snapshots.length - 1];
    expect(latest.historyUnavailable).toBe(true);
    expect(latest.requests).toEqual([]);

    await act(async () => {
      renderer?.update(
        <Probe
          currentUser={buildUser('ACTIVE')}
          onChange={(value) => snapshots.push(value)}
        />,
      );
    });
    await flushEffects();

    latest = snapshots[snapshots.length - 1];
    expect(latest.historyUnavailable).toBe(false);
    expect(latest.requests).toHaveLength(1);
    expect(mockGetRequests).toHaveBeenCalledTimes(2);
  });
});
