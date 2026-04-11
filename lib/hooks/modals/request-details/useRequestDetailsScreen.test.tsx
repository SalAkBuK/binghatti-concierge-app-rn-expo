import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useRequestDetailsScreen } from "./useRequestDetailsScreen";
import type { Request } from "../../../types";

const mockUseAuth = jest.fn();
const mockUseRequests = jest.fn();
const mockUseAppDomain = jest.fn();
const mockGetRequest = jest.fn();
const mockGetComments = jest.fn();
const mockUpsertResidentRequestSnapshot = jest.fn();
const mockClearResidentRequestsCache = jest.fn();

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = jest.requireActual("react");
    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

jest.mock("../../../context/connected-app-provider", () => ({
  useAuth: () => mockUseAuth(),
  useRequests: () => mockUseRequests(),
  useAppDomain: () => mockUseAppDomain(),
}));

jest.mock("../../useResidentRequests", () => ({
  clearResidentRequestsCache: (...args: unknown[]) => mockClearResidentRequestsCache(...args),
  upsertResidentRequestSnapshot: (...args: unknown[]) =>
    mockUpsertResidentRequestSnapshot(...args),
}));

jest.mock("../../../services/api", () => ({
  apiService: {
    admin: {
      getBuildingManagers: jest.fn(),
    },
  },
}));

jest.mock("../../../services/api/maintenance", () => ({
  maintenanceApi: {
    getMaintenanceRequestById: jest.fn(),
    deleteMaintenanceRequest: jest.fn(),
    addMaintenanceRequestComment: jest.fn(),
  },
}));

jest.mock("../../../services/api/resident-requests", () => ({
  residentRequestsApi: {
    getRequest: (...args: unknown[]) => mockGetRequest(...args),
    getComments: (...args: unknown[]) => mockGetComments(...args),
    cancelRequest: jest.fn(),
    updateRequest: jest.fn(),
    addComment: jest.fn(),
  },
}));

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

function Probe() {
  useRequestDetailsScreen();
  return null;
}

const baseRequest: Request = {
  id: "request-1",
  tenantId: "tenant-1",
  title: "Legacy request",
  description: "Original request description",
  type: "maintenance",
  status: "pending",
  priority: "medium",
  attachments: [],
  comments: [],
  messages: [],
  notes: [],
  timeline: [],
  emergencySignals: [],
  createdAt: "2026-04-11T09:00:00.000Z",
  updatedAt: "2026-04-11T10:00:00.000Z",
  _source: "backend",
};

describe("useRequestDetailsScreen", () => {
  beforeEach(() => {
    mockGetRequest.mockReset();
    mockGetComments.mockReset();
    mockUpsertResidentRequestSnapshot.mockReset();
    mockClearResidentRequestsCache.mockReset();

    mockUseAuth.mockReturnValue({
      bootstrapStatus: "ready",
      currentUser: {
        id: "tenant-1",
        email: "tenant@example.com",
        role: "tenant",
        persona: {
          isResident: true,
          residentOccupancyStatus: "ACTIVE",
        },
      },
    });

    mockUseRequests.mockReturnValue({
      selectedRequest: baseRequest,
      actions: {
        setSelectedRequest: jest.fn(),
        updateRequest: jest.fn(),
      },
    });

    mockUseAppDomain.mockReturnValue({
      operations: {
        jobs: [],
        reviewJobEstimateAsTenant: undefined,
        approveTenantJobCompletion: undefined,
        getRatingByRequestId: jest.fn(),
      },
      property: {
        getBuildingById: jest.fn(),
      },
    });

    mockGetRequest.mockResolvedValue({
      success: true,
      data: {
        id: "request-1",
        title: "Legacy request",
        description: "Original request description",
        type: "MAINTENANCE",
        status: "ASSIGNED",
        priority: "MEDIUM",
        requesterContext: {
          isResident: true,
          residentOccupancyStatus: "FORMER",
          residentInviteStatus: "ACCEPTED",
          isFormerResident: true,
          currentUnitOccupiedByRequester: false,
          currentUnitOccupant: {
            userId: "tenant-2",
            name: "Current Occupant",
          },
        },
        requestTenancyContext: {
          occupancyIdAtCreation: "occupancy-old",
          leaseIdAtCreation: "lease-old",
          currentOccupancyId: "occupancy-current",
          currentLeaseId: "lease-current",
          isCurrentOccupancy: false,
          isCurrentLease: false,
          label: "PREVIOUS_OCCUPANCY",
          leaseLabel: "PREVIOUS_LEASE",
          tenancyContextSource: "SNAPSHOT",
          leaseContextSource: "SNAPSHOT",
        },
        createdAt: "2026-04-11T09:00:00.000Z",
        updatedAt: "2026-04-11T11:00:00.000Z",
      },
    });
    mockGetComments.mockResolvedValue({
      data: [],
    });
  });

  it("waits for auth bootstrap before fetching request details", async () => {
    const authState: {
      bootstrapStatus: "restoring" | "ready";
      currentUser: null | {
        id: string;
        email: string;
        role: string;
        persona: {
          isResident: boolean;
          residentOccupancyStatus: string;
        };
      };
    } = {
      bootstrapStatus: "restoring",
      currentUser: null,
    };

    mockUseAuth.mockImplementation(() => authState);

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(<Probe />);
    });
    await flushEffects();

    expect(mockGetRequest).not.toHaveBeenCalled();
    expect(mockGetComments).not.toHaveBeenCalled();

    authState.bootstrapStatus = "ready";
    authState.currentUser = {
      id: "tenant-1",
      email: "tenant@example.com",
      role: "tenant",
      persona: {
        isResident: true,
        residentOccupancyStatus: "ACTIVE",
      },
    };

    await act(async () => {
      renderer!.update(<Probe />);
    });
    await flushEffects();

    expect(mockGetRequest).toHaveBeenCalledWith("request-1");
    expect(mockGetComments).toHaveBeenCalledWith("request-1");
  });

  it("retains requester and tenancy lifecycle context after tenant detail refetch", async () => {
    const setSelectedRequest = jest.fn();
    mockUseRequests.mockReturnValue({
      selectedRequest: baseRequest,
      actions: {
        setSelectedRequest,
        updateRequest: jest.fn(),
      },
    });

    await act(async () => {
      TestRenderer.create(<Probe />);
    });
    await flushEffects();

    expect(mockGetRequest).toHaveBeenCalledWith("request-1");
    expect(setSelectedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterContext: expect.objectContaining({
          isFormerResident: true,
          residentOccupancyStatus: "FORMER",
          currentUnitOccupiedByRequester: false,
        }),
        requestTenancyContext: expect.objectContaining({
          label: "PREVIOUS_OCCUPANCY",
          leaseLabel: "PREVIOUS_LEASE",
          isCurrentOccupancy: false,
          isCurrentLease: false,
          tenancyContextSource: "SNAPSHOT",
          leaseContextSource: "SNAPSHOT",
        }),
      }),
    );
    expect(mockUpsertResidentRequestSnapshot).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({
        requestTenancyContext: expect.objectContaining({
          label: "PREVIOUS_OCCUPANCY",
        }),
      }),
    );
  });
});
