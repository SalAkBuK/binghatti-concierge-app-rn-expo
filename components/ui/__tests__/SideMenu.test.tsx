import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import { SideMenu } from '../SideMenu';
import type { User } from '../../../lib/types';

const mockUseAuth = jest.fn();
const mockUseMessaging = jest.fn();
const mockUseResidentTenancy = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

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
    Dimensions: {
      get: () => ({
        width: 390,
        height: 844,
      }),
    },
    Image: createMockComponent('Image'),
    Modal: createMockComponent('Modal'),
    ScrollView: createMockComponent('ScrollView'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      absoluteFill: {},
    },
    Text: createMockComponent('Text'),
    TouchableOpacity: createMockComponent('TouchableOpacity'),
    View: createMockComponent('View'),
  };
});

jest.mock('../../../lib/context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../lib/context/messaging-context', () => ({
  useMessaging: () => mockUseMessaging(),
}));

jest.mock('../../../lib/hooks/useResidentTenancy', () => ({
  useResidentTenancy: () => mockUseResidentTenancy(),
}));

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  usePathname: () => '/(tenant)',
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '1.0.0',
    },
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children?: React.ReactNode }) => {
    const React = jest.requireActual('react');
    const { View } = jest.requireMock('react-native');
    return React.createElement(View, null, children);
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireMock('react-native');
    return React.createElement(Text, null, name);
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
  cancelAnimation: jest.fn(),
  Easing: {
    out: jest.fn((value) => value),
    in: jest.fn((value) => value),
    cubic: 'cubic',
  },
  runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  useAnimatedStyle: () => ({}),
  useSharedValue: (value: unknown) => ({ value }),
  withTiming: (value: unknown) => value,
}));

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'tenant-1',
  email: 'tenant@example.com',
  name: 'Tenant User',
  role: 'tenant',
  persona: {
    isResident: true,
    residentOccupancyStatus: 'ACTIVE',
  } as any,
  mobileWorkspaces: ['resident'],
  activeWorkspace: 'resident',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const buildAuthValue = (user: User) => ({
  currentUser: user,
  actions: {
    logout: jest.fn().mockResolvedValue(undefined),
  },
});

const getRenderedTexts = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity)
    .filter((value) => typeof value === 'string');

describe('SideMenu', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    mockUseMessaging.mockReturnValue({
      totalUnreadCount: 3,
    });
    mockUseResidentTenancy.mockReturnValue({
      canCreateMaintenanceRequest: true,
      canManageVisitors: true,
      isFormerResident: false,
      isPreMoveIn: false,
    });
  });

  it('shows the full resident menu for active residents', () => {
    mockUseAuth.mockReturnValue(buildAuthValue(buildUser()));

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<SideMenu isVisible onClose={jest.fn()} />);
    });

    const renderedTexts = getRenderedTexts(tree!);

    expect(renderedTexts).toContain('Requests');
    expect(renderedTexts).toContain('Messages');
    expect(renderedTexts).toContain('Visitors');
    expect(renderedTexts).toContain('New');
    expect(renderedTexts).toContain('Lease Details');
    expect(renderedTexts).toContain('Profile');
    expect(renderedTexts).not.toContain('Home');
  });

  it.each([
    ['NONE', 'pre-move-in'],
    ['FORMER', 'former resident'],
  ])(
    'shows the limited resident menu for %s occupancy',
    (residentOccupancyStatus) => {
      mockUseAuth.mockReturnValue(
        buildAuthValue(
          buildUser({
            persona: {
              isResident: true,
              residentOccupancyStatus,
            } as any,
          }),
        ),
      );

      let tree: TestRenderer.ReactTestRenderer;

      act(() => {
        tree = TestRenderer.create(<SideMenu isVisible onClose={jest.fn()} />);
      });

      const renderedTexts = getRenderedTexts(tree!);

      expect(renderedTexts).toContain('Home');
      expect(renderedTexts).toContain('Lease Details');
      expect(renderedTexts).toContain('Profile');
      expect(renderedTexts).not.toContain('Requests');
      expect(renderedTexts).not.toContain('Messages');
      expect(renderedTexts).not.toContain('Visitors');
      expect(renderedTexts).not.toContain('New');
    },
  );

  it('keeps workspace switching available for limited resident states when multiple workspaces exist', () => {
    mockUseAuth.mockReturnValue(
      buildAuthValue(
        buildUser({
          persona: {
            isResident: true,
            isOwner: true,
            residentOccupancyStatus: 'FORMER',
          } as any,
          mobileWorkspaces: ['resident', 'owner'],
          activeWorkspace: 'resident',
        }),
      ),
    );

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<SideMenu isVisible onClose={jest.fn()} />);
    });

    const renderedTexts = getRenderedTexts(tree!);

    expect(renderedTexts).toContain('Switch Workspace');
    expect(renderedTexts).toContain('Home');
    expect(renderedTexts).not.toContain('Requests');
  });
});
