import React from 'react';
import { Text, BackHandler } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import type { User } from '../../lib/types';
import ManagementLayout from '../(management)/_layout';

const mockUseAuth = jest.fn();
const mockReplace = jest.fn();
const mockUsePathname = jest.fn();
const mockStackScreen = jest.fn();
const mockAddEventListener = jest.fn();

jest.mock('../../lib/context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../components/ui/ManagementTabBar', () => ({
  ManagementTabBar: () => {
    const { Text } = jest.requireActual('react-native');
    return <Text>Management Tab Bar</Text>;
  },
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  const Stack = Object.assign(
    ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    {
      Screen: (props: { name: string }) => {
        mockStackScreen(props);
        return <Text>{`screen:${props.name}`}</Text>;
      },
    },
  );

  return {
    Stack,
    router: {
      replace: (...args: unknown[]) => mockReplace(...args),
    },
    usePathname: () => mockUsePathname(),
  };
});

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'manager@example.com',
  name: 'Management User',
  role: 'management',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('ManagementLayout', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockStackScreen.mockClear();
    mockUsePathname.mockReturnValue('/(management)');
    jest.spyOn(console, 'log').mockImplementation(() => {});

    mockAddEventListener.mockReturnValue({
      remove: jest.fn(),
    });

    jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation(mockAddEventListener);
  });

  it('redirects unauthenticated users to auth', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      currentUser: null,
    });

    act(() => {
      TestRenderer.create(<ManagementLayout />);
    });

    expect(mockReplace).toHaveBeenCalledWith('/auth');
  });

  it('redirects authenticated non-management users to index routing', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser({ role: 'tenant' }),
    });

    act(() => {
      TestRenderer.create(<ManagementLayout />);
    });

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('renders the management stack and tab bar for management users', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser(),
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<ManagementLayout />);
    });

    const renderedTexts = tree!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .filter((value) => typeof value === 'string');

    expect(renderedTexts).toContain('Management Tab Bar');
    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'index' }),
    );
    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'requests' }),
    );
    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'more' }),
    );
    expect(mockStackScreen).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'profile' }),
    );
  });

  it('hides the management tab bar on the profile screen', () => {
    mockUsePathname.mockReturnValue('/(management)/profile');
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser(),
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<ManagementLayout />);
    });

    const renderedTexts = tree!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .filter((value) => typeof value === 'string');

    expect(renderedTexts).not.toContain('Management Tab Bar');
  });
});
