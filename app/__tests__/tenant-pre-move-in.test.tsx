import React from "react";
import { Text } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import TenantHomeScreen from "../(tenant)/index";
import MessagesScreen from "../(tenant)/messages";
import RequestsScreen from "../(tenant)/requests";
import VisitorsScreen from "../(tenant)/visitors";

const mockUseAuth = jest.fn();
const mockUseNotifications = jest.fn();
const mockUseRequestsContext = jest.fn();
const mockUseResidentContract = jest.fn();
const mockUseResidentTenancy = jest.fn();
const mockUseResidentRequests = jest.fn();
const mockUseResidentParkingAllocation = jest.fn();
const mockUseBroadcastNotifications = jest.fn();
const mockUseMessaging = jest.fn();
const mockUseAppDomain = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockContractRefetch = jest.fn();
const mockTenancyRefetch = jest.fn();

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
    ListEmptyComponent,
    ListFooterComponent,
    ListHeaderComponent,
    data,
    renderItem,
  }: {
    ListEmptyComponent?: React.ReactNode;
    ListFooterComponent?: React.ReactNode;
    ListHeaderComponent?: React.ReactNode;
    data?: unknown[];
    renderItem?: ({ item }: { item: unknown }) => React.ReactNode;
  }) => (
    <>
      {renderMaybeComponent(ListHeaderComponent)}
      {Array.isArray(data) && renderItem ? data.map((item, index) => <React.Fragment key={index}>{renderItem({ item })}</React.Fragment>) : null}
      {Array.isArray(data) && data.length === 0 ? renderMaybeComponent(ListEmptyComponent) : null}
      {renderMaybeComponent(ListFooterComponent)}
    </>
  );

  return {
    ActivityIndicator: createMockComponent("ActivityIndicator"),
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

jest.mock("../../lib/context/messaging-context", () => ({
  useMessaging: () => mockUseMessaging(),
}));

jest.mock("../../lib/context/connected-app-provider", () => ({
  useAppDomain: () => mockUseAppDomain(),
}));

jest.mock("../../lib/hooks/useResidentSelfService", () => ({
  useResidentContract: () => mockUseResidentContract(),
}));

jest.mock("../../lib/hooks/useResidentTenancy", () => ({
  useResidentTenancy: () => mockUseResidentTenancy(),
}));

jest.mock("../../lib/hooks/useResidentRequests", () => ({
  useResidentRequests: () => mockUseResidentRequests(),
}));

jest.mock("../../lib/hooks/useResidentParkingAllocation", () => ({
  useResidentParkingAllocation: () => mockUseResidentParkingAllocation(),
}));

jest.mock("../../lib/hooks/useBroadcastNotifications", () => ({
  useBroadcastNotifications: () => mockUseBroadcastNotifications(),
}));

jest.mock("../../components/ui/HeaderBar", () => ({
  HeaderBar: ({ title }: { title?: string }) => {
    const React = jest.requireActual("react");
    const { Text } = jest.requireMock("react-native");
    return title ? React.createElement(Text, null, title) : null;
  },
}));

jest.mock("../../components/ui/HomeScreenSkeleton", () => ({
  HomeScreenSkeleton: () => null,
}));

jest.mock("../../components/ui/RequestsScreenSkeleton", () => ({
  RequestsScreenSkeleton: () => null,
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

jest.mock("../../components/ui/PortalLoadErrorScreen", () => ({
  PortalLoadErrorScreen: () => null,
}));

jest.mock("../../components/ui/ScreenEntrance", () => ({
  ScreenEntrance: ({ children }: { children?: React.ReactNode }) => {
    const React = jest.requireActual("react");
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock("../../components/ui/SideMenu", () => ({
  SideMenu: () => null,
}));

jest.mock("../../components/ui/TenantAnnouncementModal", () => ({
  TenantAnnouncementModal: () => null,
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
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
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
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

const buildAuthValue = () => ({
  currentUser: {
    id: "tenant-1",
    role: "tenant",
    name: "Tenant User",
    profile: {
      apartment: "1204",
      buildingName: "Binghatti Heights",
      floor: "12",
    },
  },
  isAuthenticated: true,
  actions: {
    logout: jest.fn().mockResolvedValue(undefined),
  },
});

const preMoveInTenancy = {
  canCreateMaintenanceRequest: false,
  canCreateManagementConversation: false,
  canManageVisitors: false,
  displayBuildingName: "Binghatti Heights",
  displayUnitLabel: "1204",
  errorMessage: null,
  isFormerResident: false,
  isLoading: false,
  isPreMoveIn: true,
  preMoveInActionLabel: "Schedule Move-In",
  preMoveInStatusMessage:
    "Your contract is active, but resident services unlock only after move-in is completed.",
  preMoveInStatusTitle: "Before you move in",
  refetch: jest.fn().mockResolvedValue(undefined),
  statusMessage:
    "Your contract is active, but resident services unlock only after move-in is completed.",
  statusTitle: "Before you move in",
};

const formerResidentTenancy = {
  ...preMoveInTenancy,
  canCreateManagementConversation: false,
  canCreateMaintenanceRequest: false,
  canManageVisitors: false,
  isFormerResident: true,
  isPreMoveIn: false,
  preMoveInActionLabel: "Review Lease Details",
  preMoveInStatusMessage:
    "You no longer have an active unit in this building. You can still view your previous contract details and history here.",
  preMoveInStatusTitle: "Former resident",
  statusMessage:
    "You no longer have an active unit in this building. You can still view your previous contract details and history here.",
  statusTitle: "Former resident",
};

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const getRenderedTexts = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity)
    .filter((value) => typeof value === "string");

describe("Tenant pre-move-in screens", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockContractRefetch.mockReset();
    mockContractRefetch.mockResolvedValue(undefined);
    mockTenancyRefetch.mockReset();
    mockTenancyRefetch.mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(buildAuthValue());
    mockUseNotifications.mockReturnValue({
      notifications: [],
      actions: {
        markNotificationAsRead: jest.fn().mockResolvedValue(undefined),
        dismissNotification: jest.fn().mockResolvedValue(undefined),
      },
    });
    mockUseRequestsContext.mockReturnValue({
      actions: {
        setSelectedRequest: jest.fn(),
      },
    });
    mockUseResidentContract.mockReturnValue({
      data: {
        canRequestMoveIn: false,
        contract: {
          id: "contract-1",
          endDate: "2026-12-31T00:00:00.000Z",
        },
      },
      errorMessage: null,
      isLoading: false,
      isRefreshing: false,
      moveOutHistory: [],
      refetch: mockContractRefetch,
      refetchHistory: jest.fn().mockResolvedValue(undefined),
    });
    mockUseResidentTenancy.mockReturnValue({
      ...preMoveInTenancy,
      refetch: mockTenancyRefetch,
    });
    mockUseResidentRequests.mockReturnValue({
      errorMessage: null,
      historyUnavailable: false,
      isLoading: false,
      isRefreshing: false,
      refreshRequests: jest.fn().mockResolvedValue(undefined),
      requests: [
        {
          id: "request-1",
          title: "Leaky tap",
          description: "Kitchen sink issue",
          status: "pending",
          priority: "medium",
        },
      ],
    });
    mockUseResidentParkingAllocation.mockReturnValue({
      data: null,
      errorMessage: null,
      isLoading: false,
      isRefreshing: false,
      refetch: jest.fn().mockResolvedValue(undefined),
    });
    mockUseBroadcastNotifications.mockReturnValue({
      notifications: [],
      isLoading: false,
      isRefreshing: false,
      errorMessage: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });
    mockUseMessaging.mockReturnValue({
      error: null,
      conversations: [],
      loading: false,
      actions: {
        fetchConversations: jest.fn().mockResolvedValue(undefined),
      },
    });
    mockUseAppDomain.mockReturnValue({
      amenityVisitor: {
        residentVisitors: [],
        residentVisitorsLoading: false,
        fetchResidentVisitors: jest.fn().mockResolvedValue(undefined),
        cancelResidentVisitor: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("turns the tenant home into a move-in hub during pre_move_in", async () => {
    let tree: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(<TenantHomeScreen />);
    });
    await flushEffects();

    const renderedTexts = getRenderedTexts(tree!);

    expect(renderedTexts).toContain("Before you move in");
    expect(renderedTexts).toContain("Features unlock after move-in");
    expect(renderedTexts).toContain("Request Move In");
    expect(renderedTexts).toContain("1204 - Floor 12");
    expect(renderedTexts).not.toContain("Active Service Requests");
    expect(renderedTexts).not.toContain("New Request");
  });

  it("refreshes contract data without directly refetching tenancy on pre-move-in focus", async () => {
    await act(async () => {
      TestRenderer.create(<TenantHomeScreen />);
    });
    await flushEffects();

    expect(mockContractRefetch).toHaveBeenCalledWith({
      asRefresh: true,
      showLoading: false,
    });
    expect(mockTenancyRefetch).not.toHaveBeenCalled();
  });

  it("shows only current-stay items in Active Service Requests", async () => {
    mockUseResidentTenancy.mockReturnValue({
      ...preMoveInTenancy,
      canCreateMaintenanceRequest: true,
      canCreateManagementConversation: true,
      canManageVisitors: true,
      isPreMoveIn: false,
      statusMessage: "",
      statusTitle: "Active resident",
    });
    mockUseResidentRequests.mockReturnValue({
      errorMessage: null,
      historyUnavailable: false,
      isLoading: false,
      isRefreshing: false,
      refreshRequests: jest.fn().mockResolvedValue(undefined),
      requests: [
        {
          id: "request-current",
          title: "Current leak",
          description: "Active current-stay request",
          status: "pending",
          priority: "medium",
          updatedAt: "2026-04-11T11:00:00.000Z",
          createdAt: "2026-04-11T10:00:00.000Z",
          requestTenancyContext: {
            label: "CURRENT_OCCUPANCY",
          },
        },
        {
          id: "request-archived",
          title: "Archived repair",
          description: "Older stay request still open",
          status: "assigned",
          priority: "medium",
          updatedAt: "2026-04-11T12:00:00.000Z",
          createdAt: "2026-04-11T09:00:00.000Z",
          requestTenancyContext: {
            label: "PREVIOUS_OCCUPANCY",
          },
        },
      ],
    });

    let tree: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(<TenantHomeScreen />);
    });
    await flushEffects();

    const renderedTexts = getRenderedTexts(tree!);

    expect(renderedTexts).toContain("Active Service Requests");
    expect(renderedTexts).toContain("Current leak");
    expect(renderedTexts).not.toContain("Archived repair");
  });

  it("locks the requests screen until move-in completes", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<RequestsScreen />);
    });

    const renderedTexts = getRenderedTexts(tree!);

    expect(renderedTexts).toContain("My Requests");
    expect(renderedTexts).toContain("Before you move in");
    expect(renderedTexts).toContain("Request Move In");
    expect(renderedTexts).not.toContain("New Request");
  });

  it("locks the messages screen until move-in completes", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<MessagesScreen />);
    });

    const renderedTexts = getRenderedTexts(tree!);

    expect(renderedTexts).toContain("Messages");
    expect(renderedTexts).toContain("Before you move in");
    expect(renderedTexts).toContain("Request Move In");
    expect(renderedTexts).not.toContain("New message");
  });

  it("locks the visitors screen until move-in completes", () => {
    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<VisitorsScreen />);
    });

    const renderedTexts = getRenderedTexts(tree!);

    expect(renderedTexts).toContain("Visitors");
    expect(renderedTexts).toContain("Before you move in");
    expect(renderedTexts).toContain("Request Move In");
    expect(renderedTexts).not.toContain("Guest Access");
  });

  it("locks former resident screens when active occupancy is required", async () => {
    mockUseResidentTenancy.mockReturnValue(formerResidentTenancy);
    mockUseAppDomain.mockReturnValue({
      amenityVisitor: {
        residentVisitors: [
          {
            id: "visitor-1",
            visitorName: "Ayaan Khan",
            phoneNumber: "+971500000000",
            type: "GUEST_VISITOR",
            status: "EXPECTED",
            expectedArrivalAt: "2026-04-11T10:00:00.000Z",
            createdAt: "2026-04-10T08:00:00.000Z",
            unit: {
              label: "1204",
            },
          },
        ],
        residentVisitorsLoading: false,
        fetchResidentVisitors: jest.fn().mockResolvedValue(undefined),
        cancelResidentVisitor: jest.fn().mockResolvedValue(undefined),
      },
    });
    mockUseResidentRequests.mockReturnValue({
      errorMessage:
        "Your resident history is unavailable because this account does not currently have an active occupancy.",
      historyUnavailable: true,
      isLoading: false,
      isRefreshing: false,
      refreshRequests: jest.fn().mockResolvedValue(undefined),
      requests: [],
    });
    mockUseMessaging.mockReturnValue({
      error:
        "Your resident history is unavailable because this account does not currently have an active occupancy.",
      conversations: [],
      loading: false,
      actions: {
        fetchConversations: jest.fn().mockResolvedValue(undefined),
      },
    });

    let homeTree: TestRenderer.ReactTestRenderer;
    let requestsTree: TestRenderer.ReactTestRenderer;
    let messagesTree: TestRenderer.ReactTestRenderer;
    let visitorsTree: TestRenderer.ReactTestRenderer;

    await act(async () => {
      homeTree = TestRenderer.create(<TenantHomeScreen />);
      requestsTree = TestRenderer.create(<RequestsScreen />);
      messagesTree = TestRenderer.create(<MessagesScreen />);
      visitorsTree = TestRenderer.create(<VisitorsScreen />);
    });
    await flushEffects();

    const homeTexts = getRenderedTexts(homeTree!);
    const requestsTexts = getRenderedTexts(requestsTree!);
    const messagesTexts = getRenderedTexts(messagesTree!);
    const visitorsTexts = getRenderedTexts(visitorsTree!);

    expect(homeTexts).toContain("Former resident");
    expect(homeTexts).toContain("Resident history unavailable");
    expect(homeTexts).not.toContain("Active Service Requests");
    expect(requestsTexts).toContain("Resident history unavailable");
    expect(requestsTexts).toContain(
      "Your resident history is unavailable because this account does not currently have an active occupancy.",
    );
    expect(requestsTexts).not.toContain("New Request");
    expect(messagesTexts).toContain(
      "Resident history unavailable",
    );
    expect(messagesTexts).toContain(
      "Your resident history is unavailable because this account does not currently have an active occupancy.",
    );
    expect(messagesTexts).not.toContain("New message");
    expect(visitorsTexts).toContain("Resident history unavailable");
    expect(visitorsTexts).not.toContain("Edit");
    expect(visitorsTexts).not.toContain("Cancel");
  });
});
