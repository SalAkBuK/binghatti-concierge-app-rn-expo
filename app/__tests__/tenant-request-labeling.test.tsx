import React from "react";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import RequestDetailsScreen from "../(modals)/request-details";
import RequestHistoryScreen from "../(tenant)/request-history";
import RequestsScreen from "../(tenant)/requests";
import type {
  Request,
  RequestLeaseCycleLabel,
  RequestTenancyContextSource,
  RequestTenancyCycleLabel,
} from "../../lib/types";

const mockUseAuth = jest.fn();
const mockUseNotifications = jest.fn();
const mockUseRequestsContext = jest.fn();
const mockUseResidentTenancy = jest.fn();
const mockUseResidentRequests = jest.fn();
const mockUseRequestDetailsScreen = jest.fn();

jest.mock("react-native", () => {
  const React = jest.requireActual("react");
  const createMockComponent =
    (name: string) =>
      {
        const MockComponent = ({
          children,
          ...props
        }: {
          children?: React.ReactNode;
        }) => React.createElement(name, props, children);
        MockComponent.displayName = name;
        return MockComponent;
      };

  const renderMaybeComponent = (component?: React.ReactNode | (() => React.ReactNode)) => {
    if (typeof component === "function") {
      return component();
    }
    return component ?? null;
  };

  const FlatList = ({
    ListFooterComponent,
    ListHeaderComponent,
    data,
    renderItem,
  }: {
    ListFooterComponent?: React.ReactNode;
    ListHeaderComponent?: React.ReactNode;
    data?: unknown[];
    renderItem?: ({ item }: { item: unknown }) => React.ReactNode;
  }) => (
    <>
      {renderMaybeComponent(ListHeaderComponent)}
      {Array.isArray(data) && renderItem
        ? data.map((item, index) => <React.Fragment key={index}>{renderItem({ item })}</React.Fragment>)
        : null}
      {renderMaybeComponent(ListFooterComponent)}
    </>
  );

  return {
    ActivityIndicator: createMockComponent("ActivityIndicator"),
    Alert: {
      alert: jest.fn(),
    },
    FlatList,
    Image: createMockComponent("Image"),
    KeyboardAvoidingView: createMockComponent("KeyboardAvoidingView"),
    Platform: {
      OS: "ios",
    },
    RefreshControl: createMockComponent("RefreshControl"),
    ScrollView: createMockComponent("ScrollView"),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    Text: createMockComponent("Text"),
    TextInput: createMockComponent("TextInput"),
    TouchableOpacity: createMockComponent("TouchableOpacity"),
    View: createMockComponent("View"),
  };
});

jest.mock("../../lib/context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../lib/context/notifications-context", () => ({
  useNotifications: () => mockUseNotifications(),
}));

jest.mock("../../lib/context/requests-context", () => ({
  useRequests: () => mockUseRequestsContext(),
}));

jest.mock("../../lib/hooks/useResidentTenancy", () => ({
  useResidentTenancy: () => mockUseResidentTenancy(),
}));

jest.mock("../../lib/hooks/useResidentRequests", () => ({
  useResidentRequests: () => mockUseResidentRequests(),
}));

jest.mock("../../lib/hooks/modals/request-details/useRequestDetailsScreen", () => ({
  useRequestDetailsScreen: (...args: unknown[]) => mockUseRequestDetailsScreen(...args),
}));

jest.mock("../../components/ui/HeaderBar", () => ({
  HeaderBar: ({ title }: { title?: string }) => {
    const React = jest.requireActual("react");
    const { Text } = jest.requireMock("react-native");
    return title ? React.createElement(Text, null, title) : null;
  },
}));

jest.mock("../../components/ui/AnimatedButton", () => ({
  AnimatedButton: ({
    children,
    onPress,
  }: {
    children?: React.ReactNode;
    onPress?: () => void;
  }) => {
    const React = jest.requireActual("react");
    const { TouchableOpacity } = jest.requireMock("react-native");
    return React.createElement(TouchableOpacity, { onPress }, children);
  },
}));

jest.mock("../../components/ui/RequestsScreenSkeleton", () => ({
  RequestsScreenSkeleton: () => null,
}));

jest.mock("../../components/ui/SideMenu", () => ({
  SideMenu: () => null,
}));

jest.mock("../../components/ui/TenantLockedFeatureCard", () => ({
  TenantLockedFeatureCard: () => null,
}));

jest.mock("../../components/ui/ImageViewer", () => ({
  ImageViewer: () => null,
}));

jest.mock("../../components/modals/request-details/request-details-comments", () => ({
  RequestDetailsComments: () => null,
}));

jest.mock("../../components/modals/request-details/request-details-delete-modal", () => ({
  RequestDetailsDeleteModal: () => null,
}));

jest.mock("@react-navigation/bottom-tabs", () => ({
  useBottomTabBarHeight: () => 0,
}));

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    callback();
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = jest.requireActual("react");
    const { Text } = jest.requireMock("react-native");
    return React.createElement(Text, null, name);
  },
}));

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => {
    const React = jest.requireActual("react");
    const { View } = jest.requireMock("react-native");
    return React.createElement(View, null, children);
  },
}));

jest.mock("react-native-reanimated", () => ({
  __esModule: true,
  default: {
    View: ({ children }: { children?: React.ReactNode }) => {
      const React = jest.requireActual("react");
      return React.createElement(React.Fragment, null, children);
    },
  },
  FadeIn: {
    duration: () => ({}),
  },
  FadeInDown: {
    delay: () => ({
      duration: () => ({}),
    }),
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => {
    const React = jest.requireActual("react");
    const { View } = jest.requireMock("react-native");
    return React.createElement(View, null, children);
  },
}));

const buildRequest = (
  id: string,
  label: RequestTenancyCycleLabel,
  leaseLabel: RequestLeaseCycleLabel,
  {
    status,
    tenancyContextSource,
    leaseContextSource,
    currentUnitOccupiedByRequester,
  }: {
    status?: Request["status"];
    tenancyContextSource?: RequestTenancyContextSource;
    leaseContextSource?: RequestTenancyContextSource;
    currentUnitOccupiedByRequester?: boolean | null;
  } = {},
): Request =>
  ({
    id,
    tenantId: "tenant-1",
    title: `Request ${id}`,
    description: `Description ${id}`,
    apartment: "101",
    type: "maintenance",
    status: status ?? "pending",
    priority: "medium",
    createdAt: "2026-04-11T10:00:00.000Z",
    updatedAt: "2026-04-11T11:00:00.000Z",
    attachments: [],
    comments: [],
    messages: [],
    notes: [],
    timeline: [],
    emergencySignals: [],
    requesterContext: {
      isResident: true,
      residentOccupancyStatus:
        label === "CURRENT_OCCUPANCY"
          ? "ACTIVE"
          : label === "NO_ACTIVE_OCCUPANCY"
            ? "NONE"
            : "FORMER",
      residentInviteStatus: "ACCEPTED",
      isFormerResident: label === "PREVIOUS_OCCUPANCY",
      currentUnitOccupiedByRequester:
        currentUnitOccupiedByRequester ?? label === "CURRENT_OCCUPANCY",
      currentUnitOccupant:
        label === "PREVIOUS_OCCUPANCY"
          ? {
              userId: "tenant-2",
              name: "Current Occupant",
            }
          : null,
    },
    requestTenancyContext: {
      occupancyIdAtCreation: `${id}-occupancy-created`,
      leaseIdAtCreation: `${id}-lease-created`,
      currentOccupancyId:
        label === "NO_ACTIVE_OCCUPANCY" || label === "UNKNOWN_TENANCY_CYCLE"
          ? null
          : `${id}-occupancy-current`,
      currentLeaseId:
        leaseLabel === "NO_ACTIVE_LEASE" || leaseLabel === "UNKNOWN_LEASE_CYCLE"
          ? null
          : `${id}-lease-current`,
      isCurrentOccupancy: label === "CURRENT_OCCUPANCY" ? true : label === "PREVIOUS_OCCUPANCY" ? false : null,
      isCurrentLease: leaseLabel === "CURRENT_LEASE" ? true : leaseLabel === "PREVIOUS_LEASE" ? false : null,
      label,
      leaseLabel,
      ...(tenancyContextSource ? { tenancyContextSource } : {}),
      ...(leaseContextSource ? { leaseContextSource } : {}),
    },
    _source: "backend",
  } as Request);

const buildDetailValue = (selectedRequest: Request) => ({
  currentUser: {
    id: "tenant-1",
    role: "tenant",
    name: "Tenant User",
  },
  selectedRequest,
  job: undefined,
  comments: [],
  detailTab: "overview",
  setDetailTab: jest.fn(),
  fetchingDetails: false,
  historyUnavailable: false,
  historyUnavailableMessage: null,
  newComment: "",
  setNewComment: jest.fn(),
  isPostingComment: false,
  resolvedBuildingName: "Binghatti Heights",
  showDeleteConfirm: false,
  setShowDeleteConfirm: jest.fn(),
  showEditMode: false,
  setShowEditMode: jest.fn(),
  editForm: {
    title: selectedRequest.title,
    description: selectedRequest.description,
    type: "maintenance",
    priority: "medium",
    isEmergency: false,
    emergencySignals: [],
  },
  editValidationErrors: {},
  loading: false,
  showImageViewer: false,
  setShowImageViewer: jest.fn(),
  selectedImageIndex: 0,
  setSelectedImageIndex: jest.fn(),
  reviewJobEstimateAsTenant: undefined,
  approveTenantJobCompletion: undefined,
  getRatingByRequestId: jest.fn(),
  handleApproveEstimate: jest.fn(),
  handleDeclineEstimate: jest.fn(),
  handleReviewCompletion: jest.fn(),
  handleDeleteRequest: jest.fn(),
  handleCancelEdit: jest.fn(),
  handleUpdateRequest: jest.fn(),
  updateEditFormField: jest.fn(),
  toggleEditEmergencySignal: jest.fn(),
  handleSubmitComment: jest.fn(),
});

const getRenderedText = (renderer: TestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity)
    .filter((value): value is string => typeof value === "string");

const normalizeTextValues = (values: unknown[]) =>
  values
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map((value) => String(value));

const getTouchableTextContent = (
  renderer: TestRenderer.ReactTestRenderer,
  label: string,
) => {
  const touchable = renderer.root
    .findAll((node) => node.type === "TouchableOpacity")
    .find((node) =>
      node
        .findAllByType(Text)
        .map((textNode) => textNode.props.children)
        .flat(Infinity)
        .includes(label),
    );

  if (!touchable) {
    throw new Error(`Touchable with label "${label}" not found`);
  }

  return touchable
    .findAllByType(Text)
    .map((textNode) => textNode.props.children)
    .flat(Infinity)
    .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
    .map((value) => String(value));
};

const expectSummaryValue = (
  renderer: TestRenderer.ReactTestRenderer,
  label: string,
  expectedValue: string,
) => {
  const labelNode = renderer.root
    .findAllByType(Text)
    .find((node) => node.props.children === label);

  if (!labelNode?.parent) {
    throw new Error(`Summary card with label "${label}" not found`);
  }

  const cardText = labelNode.parent
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity);

  expect(normalizeTextValues(cardText)).toContain(expectedValue);
};

describe("tenant request lifecycle labeling", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      currentUser: {
        id: "tenant-1",
        role: "tenant",
        name: "Tenant User",
      },
    });
    mockUseNotifications.mockReturnValue({
      notifications: [],
    });
    mockUseRequestsContext.mockReturnValue({
      actions: {
        setSelectedRequest: jest.fn(),
      },
    });
    mockUseResidentTenancy.mockReturnValue({
      canCreateMaintenanceRequest: true,
      isFormerResident: false,
      isLoading: false,
      isPreMoveIn: false,
      preMoveInActionLabel: "Request Move In",
      preMoveInStatusMessage: "",
      preMoveInStatusTitle: "",
      refetch: jest.fn(),
      statusMessage: "",
      statusTitle: "",
    });
  });

  it("shows only current-stay requests on the tenant requests screen", () => {
    mockUseResidentRequests.mockReturnValue({
      requests: [
        buildRequest("current", "CURRENT_OCCUPANCY", "CURRENT_LEASE", {
          status: "pending",
        }),
        buildRequest("previous", "PREVIOUS_OCCUPANCY", "PREVIOUS_LEASE", {
          status: "assigned",
        }),
        buildRequest("none", "NO_ACTIVE_OCCUPANCY", "NO_ACTIVE_LEASE", {
          status: "completed",
        }),
        buildRequest("legacy", "UNKNOWN_TENANCY_CYCLE", "UNKNOWN_LEASE_CYCLE", {
          status: "pending",
          tenancyContextSource: "UNRESOLVED",
          leaseContextSource: "UNRESOLVED",
        }),
      ],
      errorMessage: null,
      historyUnavailable: false,
      isLoading: false,
      isRefreshing: false,
      refreshRequests: jest.fn(),
    });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<RequestsScreen />);
    });

    let text = getRenderedText(renderer!);

    expect(text).toContain("Current Requests");
    expect(text).not.toContain("View History (3)");
    expect(text).toContain("Request current");
    expect(text).not.toContain("Request previous");
    expect(text).not.toContain("Request none");
    expect(text).not.toContain("Request legacy");
    expect(text).not.toContain("Archived Requests");
    expect(text).not.toContain("Older Records");
    expect(text).toContain("Current");
    expect(text).not.toContain("Current Stay");
    expect(text).not.toContain("Previous Stay");
    expect(text).not.toContain("Legacy Stay");
    expect(text).not.toContain("Current Lease");
    expect(text).not.toContain("Previous Lease");
    expect(text).not.toContain("Original Requester Is Occupant");
    expect(text).toContain(
      "1 current request are visible in your active stay.",
    );
    expect(getTouchableTextContent(renderer!, "All")).toEqual(["All", "1"]);
    expect(getTouchableTextContent(renderer!, "Submitted")).toEqual([
      "Submitted",
      "1",
    ]);
    expect(getTouchableTextContent(renderer!, "Assigned")).toEqual([
      "Assigned",
      "0",
    ]);
    expect(getTouchableTextContent(renderer!, "Completed")).toEqual([
      "Completed",
      "0",
    ]);
    expectSummaryValue(renderer!, "Open Requests", "01");
    expectSummaryValue(renderer!, "In Progress", "00");
    expectSummaryValue(renderer!, "Completed", "00");
  });

  it("shows archived and legacy items on the tenant request history screen", () => {
    mockUseResidentRequests.mockReturnValue({
      requests: [
        buildRequest("current", "CURRENT_OCCUPANCY", "CURRENT_LEASE", {
          status: "pending",
        }),
        buildRequest("previous", "PREVIOUS_OCCUPANCY", "PREVIOUS_LEASE", {
          status: "assigned",
        }),
        buildRequest("none", "NO_ACTIVE_OCCUPANCY", "NO_ACTIVE_LEASE", {
          status: "completed",
        }),
        buildRequest("legacy", "UNKNOWN_TENANCY_CYCLE", "UNKNOWN_LEASE_CYCLE", {
          status: "pending",
          tenancyContextSource: "UNRESOLVED",
          leaseContextSource: "UNRESOLVED",
        }),
      ],
      errorMessage: null,
      historyUnavailable: false,
      isLoading: false,
      isRefreshing: false,
      refreshRequests: jest.fn(),
    });

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<RequestHistoryScreen />);
    });

    const text = getRenderedText(renderer!);

    expect(text).toContain("Request History");
    expect(text).toContain("Current (1)");
    expect(text).toContain("Archived Requests");
    expect(text).toContain("Older Records");
    expect(text).toContain("Request previous");
    expect(text).toContain("Request none");
    expect(text).toContain("Request legacy");
    expect(text).not.toContain("Request current");
    expect(text).toContain("Archived");
    expect(text).toContain("Older Record");
    expect(text).toContain(
      "3 requests are available in your history.",
    );
    expect(getTouchableTextContent(renderer!, "All")).toEqual(["All", "3"]);
    expect(getTouchableTextContent(renderer!, "Submitted")).toEqual([
      "Submitted",
      "1",
    ]);
    expect(getTouchableTextContent(renderer!, "Assigned")).toEqual([
      "Assigned",
      "1",
    ]);
    expect(getTouchableTextContent(renderer!, "Completed")).toEqual([
      "Completed",
      "1",
    ]);
    expectSummaryValue(renderer!, "Open Requests", "02");
    expectSummaryValue(renderer!, "In Progress", "01");
    expectSummaryValue(renderer!, "Completed", "01");
  });

  it("shows plain-language archived messaging in tenant request detail", () => {
    mockUseRequestDetailsScreen.mockReturnValue(
      buildDetailValue(
        buildRequest("legacy", "PREVIOUS_OCCUPANCY", "PREVIOUS_LEASE", {
          currentUnitOccupiedByRequester: true,
        }),
      ),
    );

    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<RequestDetailsScreen />);
    });

    const text = getRenderedText(renderer!);

    expect(text).toContain("This request is archived from a previous stay.");
    expect(text).toContain(
      "Archived requests are view-only. You cannot edit, cancel, or comment on them.",
    );
    expect(text).not.toContain("Previous Stay");
    expect(text).not.toContain("Previous Lease");
    expect(text).not.toContain("Original Requester Is Occupant");
  });
});
