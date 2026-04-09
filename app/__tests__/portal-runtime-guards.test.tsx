import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import type { User } from '../../lib/types';
import BuildingEmployeeDashboard from '../(buildingEmployee)/index';
import OwnerHomeScreen from '../(owner)/index';
import TenantHomeScreen from '../(tenant)/index';

const mockUseAuth = jest.fn();
const mockUseNotifications = jest.fn();
const mockUseRequestsContext = jest.fn();
const mockUseResidentContract = jest.fn();
const mockUseResidentTenancy = jest.fn();
const mockUseResidentRequests = jest.fn();
const mockUseBroadcastNotifications = jest.fn();
const mockUseOwnerUnreadSummary = jest.fn();
const mockUseOwnerUnauthorized = jest.fn();
const mockPortalLoadErrorScreen = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockOwnerGetSummary = jest.fn();
const mockOwnerGetUnits = jest.fn();
const mockOwnerGetRequests = jest.fn();
const mockOwnerGetConversations = jest.fn();
const mockGetAssignedBuildings = jest.fn();
const mockGetBuildingRequests = jest.fn();

jest.mock('react-native', () => {
  const React = jest.requireActual('react');
  const createMockComponent =
    (name: string) =>
    ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
    }) =>
      React.createElement(name, props, children);

  return {
    Alert: {
      alert: jest.fn(),
    },
    ActivityIndicator: createMockComponent('ActivityIndicator'),
    Image: createMockComponent('Image'),
    RefreshControl: createMockComponent('RefreshControl'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    ScrollView: createMockComponent('ScrollView'),
    Text: createMockComponent('Text'),
    TouchableOpacity: createMockComponent('TouchableOpacity'),
    View: createMockComponent('View'),
  };
});

jest.mock('../../lib/context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../lib/context/notifications-context', () => ({
  useNotifications: () => mockUseNotifications(),
}));

jest.mock('../../lib/context/requests-context', () => ({
  useRequests: () => mockUseRequestsContext(),
}));

jest.mock('../../lib/hooks/useResidentSelfService', () => ({
  useResidentContract: () => mockUseResidentContract(),
}));

jest.mock('../../lib/hooks/useResidentTenancy', () => ({
  useResidentTenancy: () => mockUseResidentTenancy(),
}));

jest.mock('../../lib/hooks/useResidentRequests', () => ({
  useResidentRequests: () => mockUseResidentRequests(),
}));

jest.mock('../../lib/hooks/useBroadcastNotifications', () => ({
  useBroadcastNotifications: () => mockUseBroadcastNotifications(),
}));

jest.mock('../../lib/hooks/owner/useOwnerUnreadSummary', () => ({
  useOwnerUnreadSummary: () => mockUseOwnerUnreadSummary(),
}));

jest.mock('../../lib/hooks/owner/useOwnerUnauthorized', () => ({
  useOwnerUnauthorized: () => mockUseOwnerUnauthorized(),
}));

jest.mock('../../lib/services/api/owner-portal', () => ({
  ownerPortalApi: {
    getSummary: (...args: unknown[]) => mockOwnerGetSummary(...args),
    getUnits: (...args: unknown[]) => mockOwnerGetUnits(...args),
    getRequests: (...args: unknown[]) => mockOwnerGetRequests(...args),
    getConversations: (...args: unknown[]) => mockOwnerGetConversations(...args),
  },
}));

jest.mock('../../lib/services/api/org-buildings', () => ({
  orgBuildingsApi: {
    getAssignedBuildings: (...args: unknown[]) => mockGetAssignedBuildings(...args),
    getBuildingRequests: (...args: unknown[]) => mockGetBuildingRequests(...args),
  },
}));

jest.mock('../../components/ui/HeaderBar', () => ({
  HeaderBar: () => null,
}));

jest.mock('../../components/ui/HomeScreenSkeleton', () => ({
  HomeScreenSkeleton: () => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireMock('react-native');
    return React.createElement(Text, null, 'Loading');
  },
}));

jest.mock('../../components/ui/ScreenEntrance', () => ({
  ScreenEntrance: ({ children }: { children?: React.ReactNode }) => {
    const React = jest.requireActual('react');
    return React.createElement(React.Fragment, null, children);
  },
}));

jest.mock('../../components/ui/SideMenu', () => ({
  SideMenu: () => null,
}));

jest.mock('../../components/ui/PortalLoadErrorScreen', () => ({
  PortalLoadErrorScreen: (props: {
    portalLabel: string;
    message: string;
    onRetry: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
  }) => {
    const React = jest.requireActual('react');
    const { Text, TouchableOpacity } = jest.requireMock('react-native');
    mockPortalLoadErrorScreen(props);
    return (
      <React.Fragment>
        <Text>{props.portalLabel}</Text>
        <Text>{props.message}</Text>
        <TouchableOpacity onPress={props.onRetry}>
          <Text>Retry</Text>
        </TouchableOpacity>
        {props.onSecondaryAction ? (
          <TouchableOpacity onPress={props.onSecondaryAction}>
            <Text>{props.secondaryActionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </React.Fragment>
    );
  },
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 0,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireMock('react-native');
    return React.createElement(Text, null, name);
  },
}));

jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => {
    const React = jest.requireActual('react');
    const { View } = jest.requireMock('react-native');
    return React.createElement(View, null, children);
  },
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: ({ children }: { children?: React.ReactNode }) => {
      const React = jest.requireActual('react');
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

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => {
    const React = jest.requireActual('react');
    const { View } = jest.requireMock('react-native');
    return React.createElement(View, null, children);
  },
}));

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'user@example.com',
  name: 'Test User',
  role: 'tenant',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const buildAuthValue = (overrides: Record<string, unknown> = {}) => ({
  isAuthenticated: true,
  currentUser: buildUser(),
  actions: {
    logout: jest.fn().mockResolvedValue(undefined),
  },
  ...overrides,
});

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('Portal runtime guards', () => {
  beforeEach(() => {
    mockPortalLoadErrorScreen.mockClear();
    mockReplace.mockClear();
    mockPush.mockClear();
    mockOwnerGetSummary.mockReset();
    mockOwnerGetUnits.mockReset();
    mockOwnerGetRequests.mockReset();
    mockOwnerGetConversations.mockReset();
    mockGetAssignedBuildings.mockReset();
    mockGetBuildingRequests.mockReset();
    mockUseNotifications.mockReturnValue({
      notifications: [],
      actions: {
        markNotificationAsRead: jest.fn().mockResolvedValue(undefined),
      },
    });
    mockUseRequestsContext.mockReturnValue({
      actions: {
        setSelectedRequest: jest.fn(),
      },
    });
    mockUseResidentRequests.mockReturnValue({
      requests: [],
      refreshRequests: jest.fn().mockResolvedValue(undefined),
      isRefreshing: false,
    });
    mockUseBroadcastNotifications.mockReturnValue({
      notifications: [],
      isLoading: false,
      isRefreshing: false,
      errorMessage: null,
      refetch: jest.fn().mockResolvedValue(undefined),
    });
    mockUseOwnerUnreadSummary.mockReturnValue({
      conversationUnreadCount: 0,
      notificationUnreadCount: 0,
      requestCommentUnreadCount: 0,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseOwnerUnauthorized.mockReturnValue(jest.fn().mockResolvedValue(false));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows a full-screen recovery state for tenant critical load failures', () => {
    const refetchContract = jest.fn().mockResolvedValue(undefined);
    const refetchTenancy = jest.fn().mockResolvedValue(undefined);

    mockUseAuth.mockReturnValue(
      buildAuthValue({
        currentUser: buildUser({ role: 'tenant' }),
      }),
    );
    mockUseResidentContract.mockReturnValue({
      data: { contract: null },
      errorMessage: 'Unable to load your contract details right now. Please try again.',
      isLoading: false,
      moveOutHistory: [],
      refetch: refetchContract,
      refetchHistory: jest.fn().mockResolvedValue(undefined),
      isRefreshing: false,
    });
    mockUseResidentTenancy.mockReturnValue({
      canCreateMaintenanceRequest: true,
      canManageVisitors: true,
      displayBuildingName: null,
      displayUnitLabel: null,
      errorMessage: null,
      isFormerResident: false,
      isLoading: false,
      refetch: refetchTenancy,
      statusMessage: '',
      statusTitle: '',
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<TenantHomeScreen />);
    });

    expect(mockPortalLoadErrorScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        portalLabel: 'Resident Workspace',
        message: 'Unable to load your contract details right now. Please try again.',
      }),
    );

    const retryButton = tree!.root.findAllByType(TouchableOpacity)[0];

    act(() => {
      retryButton.props.onPress();
    });

    expect(refetchContract).toHaveBeenCalledWith({ asRefresh: false, showLoading: true });
    expect(refetchTenancy).toHaveBeenCalledWith({ asRefresh: false, showLoading: true });
  });

  it('shows a full-screen recovery state for owner dashboard failures', async () => {
    mockUseAuth.mockReturnValue(
      buildAuthValue({
        currentUser: buildUser({ role: 'owner' }),
      }),
    );
    mockOwnerGetSummary.mockRejectedValue(new Error('Owner portfolio failed'));
    mockOwnerGetUnits.mockResolvedValue([]);
    mockOwnerGetRequests.mockResolvedValue([]);
    mockOwnerGetConversations.mockResolvedValue({ items: [] });

    let tree: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(<OwnerHomeScreen />);
    });
    await flushEffects();

    expect(mockPortalLoadErrorScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        portalLabel: 'Owner Workspace',
        message: 'Owner portfolio failed',
      }),
    );

    await act(async () => {
      tree!.root.findAllByType(TouchableOpacity)[0].props.onPress();
      await Promise.resolve();
    });

    expect(mockOwnerGetSummary).toHaveBeenCalledTimes(2);
  });

  it('fails closed when building employee request hydration breaks on first load', async () => {
    mockUseAuth.mockReturnValue(
      buildAuthValue({
        currentUser: buildUser({ role: 'building_employee' }),
      }),
    );
    mockGetAssignedBuildings.mockResolvedValue([
      { id: 'building-1', name: 'Tower One' },
    ]);
    mockGetBuildingRequests.mockRejectedValue(
      new Error('Building request feed failed'),
    );

    let tree: TestRenderer.ReactTestRenderer;

    await act(async () => {
      tree = TestRenderer.create(<BuildingEmployeeDashboard />);
    });
    await flushEffects();

    expect(mockPortalLoadErrorScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        portalLabel: 'Building Operations',
        message: 'Building request feed failed',
      }),
    );

    await act(async () => {
      tree!.root.findAllByType(TouchableOpacity)[0].props.onPress();
      await Promise.resolve();
    });

    expect(mockGetAssignedBuildings).toHaveBeenCalledTimes(2);
    expect(mockGetBuildingRequests).toHaveBeenCalledTimes(2);
  });
});
