import React, { useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";

import { invalidateResidentTenancy, useResidentTenancy } from "../useResidentTenancy";

const mockGetResidentIdentity = jest.fn();
const mockGetResidentLatestContract = jest.fn();
const mockRemoveAppStateListener = jest.fn();
const mockUseAuth = jest.fn();
const mockRefreshCurrentUser = jest.fn();

jest.mock("react-native", () => ({
  AppState: {
    currentState: "active",
    addEventListener: jest.fn(() => ({
      remove: mockRemoveAppStateListener,
    })),
  },
}));

jest.mock("../../services/api/resident-self-service", () => ({
  residentSelfServiceApi: {
    getResidentIdentity: (...args: unknown[]) => mockGetResidentIdentity(...args),
    getResidentLatestContract: (...args: unknown[]) => mockGetResidentLatestContract(...args),
  },
}));

jest.mock("../../context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

type HookSnapshot = ReturnType<typeof useResidentTenancy>;

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

function Probe({
  onChange,
}: {
  onChange: (value: HookSnapshot) => void;
}) {
  const value = useResidentTenancy();

  useEffect(() => {
    onChange(value);
  }, [onChange, value]);

  return null;
}

const buildIdentity = (withOccupancy: boolean) => ({
  user: {
    id: "resident-1",
    email: "resident@example.com",
    name: "Resident User",
    phone: null,
    avatarUrl: null,
  },
  occupancy: withOccupancy
    ? {
        id: "occupancy-1",
        buildingId: "building-1",
        buildingName: "Binghatti Heights",
        unitId: "unit-1",
        unitLabel: "1204",
        floorNumber: "12",
      }
    : null,
});

const buildLatestContract = ({
  canRequestMoveIn = false,
  latestMoveInRequestStatus = null,
  status = "ACTIVE",
}: {
  canRequestMoveIn?: boolean;
  latestMoveInRequestStatus?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "COMPLETED" | null;
  status?: "ACTIVE" | "ENDED" | "CANCELLED";
}) => ({
  contract: {
    id: "contract-1",
    status,
    buildingName: "Binghatti Heights",
    unitLabel: "1204",
  },
  canRequestMoveIn,
  canRequestMoveOut: false,
  latestMoveInRequestStatus,
  latestMoveOutRequestStatus: null,
});

describe("useResidentTenancy", () => {
  let renderer: TestRenderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    mockGetResidentIdentity.mockReset();
    mockGetResidentLatestContract.mockReset();
    mockRemoveAppStateListener.mockReset();
    mockRefreshCurrentUser.mockReset();
    mockRefreshCurrentUser.mockResolvedValue(null);
    mockUseAuth.mockReturnValue({
      currentUser: null,
      actions: {
        refreshCurrentUser: mockRefreshCurrentUser,
      },
    });
  });

  afterEach(async () => {
    if (renderer) {
      await act(async () => {
        renderer?.unmount();
      });
      renderer = null;
    }
    invalidateResidentTenancy();
  });

  it("derives pre_move_in when the contract is active but occupancy is missing", async () => {
    mockGetResidentIdentity.mockResolvedValue(buildIdentity(false));
    mockGetResidentLatestContract.mockResolvedValue(
      buildLatestContract({ canRequestMoveIn: true }),
    );

    const snapshots: HookSnapshot[] = [];

    await act(async () => {
      renderer = TestRenderer.create(<Probe onChange={(value) => snapshots.push(value)} />);
    });
    await flushEffects();

    const latest = snapshots[snapshots.length - 1];

    expect(latest.mode).toBe("pre_move_in");
    expect(latest.isPreMoveIn).toBe(true);
    expect(latest.canCreateMaintenanceRequest).toBe(false);
    expect(latest.canManageVisitors).toBe(false);
    expect(latest.statusTitle).toBe("Before you move in");
    expect(latest.preMoveInActionLabel).toBe("Schedule Move-In");
  });

  it("derives active when occupancy exists for a live contract", async () => {
    mockUseAuth.mockReturnValue({
      currentUser: {
        persona: {
          residentOccupancyStatus: "ACTIVE",
        },
      },
      actions: {
        refreshCurrentUser: mockRefreshCurrentUser,
      },
    });
    mockGetResidentIdentity.mockResolvedValue(buildIdentity(true));
    mockGetResidentLatestContract.mockResolvedValue(buildLatestContract({}));

    const snapshots: HookSnapshot[] = [];

    await act(async () => {
      renderer = TestRenderer.create(<Probe onChange={(value) => snapshots.push(value)} />);
    });
    await flushEffects();

    const latest = snapshots[snapshots.length - 1];

    expect(latest.mode).toBe("active");
    expect(latest.isPreMoveIn).toBe(false);
    expect(latest.canCreateMaintenanceRequest).toBe(true);
    expect(latest.canCreateManagementConversation).toBe(true);
  });

  it("keeps former resident semantics for ended contracts without occupancy", async () => {
    mockGetResidentIdentity.mockResolvedValue(buildIdentity(false));
    mockGetResidentLatestContract.mockResolvedValue(
      buildLatestContract({ status: "ENDED" }),
    );

    const snapshots: HookSnapshot[] = [];

    await act(async () => {
      renderer = TestRenderer.create(<Probe onChange={(value) => snapshots.push(value)} />);
    });
    await flushEffects();

    const latest = snapshots[snapshots.length - 1];

    expect(latest.mode).toBe("former_resident");
    expect(latest.isFormerResident).toBe(true);
    expect(latest.isPreMoveIn).toBe(false);
    expect(latest.statusTitle).toBe("Former resident");
  });

  it("prefers pre-move-in over stale FORMER persona when a live contract exists without occupancy", async () => {
    mockUseAuth.mockReturnValue({
      currentUser: {
        persona: {
          residentOccupancyStatus: "FORMER",
        },
      },
      actions: {
        refreshCurrentUser: mockRefreshCurrentUser,
      },
    });
    mockGetResidentIdentity.mockResolvedValue(buildIdentity(false));
    mockGetResidentLatestContract.mockResolvedValue(
      buildLatestContract({ canRequestMoveIn: true }),
    );

    const snapshots: HookSnapshot[] = [];

    await act(async () => {
      renderer = TestRenderer.create(<Probe onChange={(value) => snapshots.push(value)} />);
    });
    await flushEffects();

    const latest = snapshots[snapshots.length - 1];

    expect(latest.mode).toBe("pre_move_in");
    expect(latest.isPreMoveIn).toBe(true);
    expect(latest.isFormerResident).toBe(false);
    expect(latest.preMoveInActionLabel).toBe("Schedule Move-In");
  });

  it("keeps pre-move-in locking when persona says NONE even if occupancy is present", async () => {
    mockUseAuth.mockReturnValue({
      currentUser: {
        persona: {
          isResident: true,
          residentOccupancyStatus: "NONE",
        },
      },
      actions: {
        refreshCurrentUser: mockRefreshCurrentUser,
      },
    });
    mockGetResidentIdentity.mockResolvedValue(buildIdentity(true));
    mockGetResidentLatestContract.mockResolvedValue(buildLatestContract({}));

    const snapshots: HookSnapshot[] = [];

    await act(async () => {
      renderer = TestRenderer.create(<Probe onChange={(value) => snapshots.push(value)} />);
    });
    await flushEffects();

    const latest = snapshots[snapshots.length - 1];

    expect(latest.mode).toBe("pre_move_in");
    expect(latest.isPreMoveIn).toBe(true);
    expect(latest.canCreateMaintenanceRequest).toBe(false);
    expect(latest.canManageVisitors).toBe(false);
    expect(mockRefreshCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("refreshes the auth session when occupancy becomes active before persona catches up", async () => {
    mockUseAuth.mockReturnValue({
      currentUser: {
        id: "resident-1",
        persona: {
          isResident: true,
          residentOccupancyStatus: "FORMER",
        },
      },
      actions: {
        refreshCurrentUser: mockRefreshCurrentUser,
      },
    });
    mockGetResidentIdentity.mockResolvedValue(buildIdentity(true));
    mockGetResidentLatestContract.mockResolvedValue(buildLatestContract({}));

    const snapshots: HookSnapshot[] = [];

    await act(async () => {
      renderer = TestRenderer.create(<Probe onChange={(value) => snapshots.push(value)} />);
    });
    await flushEffects();

    const latest = snapshots[snapshots.length - 1];

    expect(latest.mode).toBe("active");
    expect(mockRefreshCurrentUser).toHaveBeenCalledTimes(1);
  });
});
