import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import type { User } from '../../lib/types';
import BuildingEmployeeLayout from '../(buildingEmployee)/_layout';

const mockUseAuth = jest.fn();
const mockReplace = jest.fn();
const mockTabs = jest.fn();
const mockTabsScreen = jest.fn();
const mockUseSafeAreaInsets = jest.fn();

jest.mock('../../lib/context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = jest.requireActual('react-native');
    return <Text>{`icon:${name}`}</Text>;
  },
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  const Tabs = Object.assign(
    ({ children, ...props }: { children?: React.ReactNode }) => {
      mockTabs(props);
      return <>{children}</>;
    },
    {
      Screen: (props: { name: string; options?: Record<string, unknown> }) => {
        mockTabsScreen(props);
        return <Text>{`screen:${props.name}`}</Text>;
      },
    },
  );

  return {
    Tabs,
    router: {
      replace: (...args: unknown[]) => mockReplace(...args),
    },
  };
});

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'employee-1',
  email: 'employee@example.com',
  name: 'Building Employee',
  role: 'building_employee',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('BuildingEmployeeLayout', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockReplace.mockClear();
    mockTabs.mockClear();
    mockTabsScreen.mockClear();
    mockUseSafeAreaInsets.mockReturnValue({
      top: 0,
      right: 0,
      bottom: 10,
      left: 0,
    });
  });

  it('redirects unauthenticated users to auth', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      currentUser: null,
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<BuildingEmployeeLayout />);
    });

    expect(mockReplace).toHaveBeenCalledWith('/auth');
    expect(tree!.toJSON()).toBeNull();
  });

  it('redirects authenticated non-building-employee users back to index routing', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser({ role: 'management' }),
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<BuildingEmployeeLayout />);
    });

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(tree!.toJSON()).toBeNull();
  });

  it('registers the visible building-employee tab screens', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser(),
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<BuildingEmployeeLayout />);
    });

    const renderedTexts = tree!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .filter((value) => typeof value === 'string');

    expect(mockReplace).not.toHaveBeenCalled();
    expect(renderedTexts).toContain('screen:index');
    expect(renderedTexts).toContain('screen:jobs');
    expect(renderedTexts).toContain('screen:profile');
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'index',
        options: expect.objectContaining({ title: 'Dashboard' }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'jobs',
        options: expect.objectContaining({ title: 'Jobs' }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'profile',
        options: expect.objectContaining({ title: 'Profile' }),
      }),
    );
  });

  it('keeps non-primary building-employee routes hidden from the tab bar', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser(),
    });

    act(() => {
      TestRenderer.create(<BuildingEmployeeLayout />);
    });

    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'amenities',
        options: expect.objectContaining({
          href: null,
          title: 'Amenities',
        }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'shifts',
        options: expect.objectContaining({
          href: null,
          title: 'Shifts',
        }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'messages',
        options: expect.objectContaining({ href: null }),
      }),
    );
  });

  it('uses safe-area aware bottom tab styling', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser(),
    });

    act(() => {
      TestRenderer.create(<BuildingEmployeeLayout />);
    });

    expect(mockTabs).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOptions: expect.objectContaining({
          tabBarStyle: expect.objectContaining({
            paddingBottom: 10,
            height: 84,
          }),
        }),
      }),
    );
  });
});
