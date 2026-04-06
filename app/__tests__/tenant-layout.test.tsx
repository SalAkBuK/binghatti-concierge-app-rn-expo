import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import type { User } from '../../lib/types';
import TenantLayout from '../(tenant)/_layout';

const mockUseAuth = jest.fn();
const mockReplace = jest.fn();
const mockTabsScreen = jest.fn();
const mockUseSafeAreaInsets = jest.fn();

jest.mock('../../lib/context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockUseSafeAreaInsets(),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');

  const Tabs = Object.assign(
    ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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
  id: 'tenant-1',
  email: 'tenant@example.com',
  name: 'Tenant User',
  role: 'tenant',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('TenantLayout', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockTabsScreen.mockClear();
    mockUseSafeAreaInsets.mockReturnValue({
      top: 0,
      right: 0,
      bottom: 12,
      left: 0,
    });
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('renders nothing for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      currentUser: null,
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<TenantLayout />);
    });

    expect(tree!.toJSON()).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects authenticated non-tenant users back to index routing', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser({ role: 'management' }),
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<TenantLayout />);
    });

    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(tree!.toJSON()).toBeNull();
  });

  it('renders the tenant tab screens for tenant users', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser(),
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<TenantLayout />);
    });

    const renderedTexts = tree!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .filter((value) => typeof value === 'string');

    expect(mockReplace).not.toHaveBeenCalled();
    expect(renderedTexts).toContain('screen:index');
    expect(renderedTexts).toContain('screen:requests');
    expect(renderedTexts).toContain('screen:messages');
    expect(renderedTexts).toContain('screen:profile');
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'index',
        options: expect.objectContaining({ title: 'Home' }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'requests',
        options: expect.objectContaining({ title: 'Requests' }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'messages',
        options: expect.objectContaining({ title: 'Messages' }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'profile',
        options: expect.objectContaining({ title: 'Profile' }),
      }),
    );
  });

  it('keeps tenant detail routes hidden from the tab bar', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser(),
    });

    act(() => {
      TestRenderer.create(<TenantLayout />);
    });

    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'amenities',
        options: expect.objectContaining({ href: null }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'visitors',
        options: expect.objectContaining({ href: null }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'my-bookings',
        options: expect.objectContaining({ href: null }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'my-ratings',
        options: expect.objectContaining({ href: null }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'new-request',
        options: expect.objectContaining({ href: null }),
      }),
    );
    expect(mockTabsScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'lease-details',
        options: expect.objectContaining({ href: null }),
      }),
    );
  });
});
