import React from 'react';
import { Text } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';

import OwnerHomeScreen from '../(owner)/index';

const mockUseAuth = jest.fn();
const mockUseOwnerUnreadSummary = jest.fn();
const mockUseOwnerUnauthorized = jest.fn();
const mockGetSummary = jest.fn();
const mockGetUnits = jest.fn();
const mockGetRequests = jest.fn();
const mockGetConversations = jest.fn();

jest.mock('react-native', () => {
  const React = jest.requireActual('react');
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

  return {
    ActivityIndicator: createMockComponent('ActivityIndicator'),
    RefreshControl: createMockComponent('RefreshControl'),
    ScrollView: createMockComponent('ScrollView'),
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
    },
    Text: createMockComponent('Text'),
    TouchableOpacity: createMockComponent('TouchableOpacity'),
    View: createMockComponent('View'),
  };
});

jest.mock('../../lib/context/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../lib/hooks/owner/useOwnerUnreadSummary', () => ({
  useOwnerUnreadSummary: () => mockUseOwnerUnreadSummary(),
}));

jest.mock('../../lib/hooks/owner/useOwnerUnauthorized', () => ({
  useOwnerUnauthorized: () => mockUseOwnerUnauthorized(),
}));

jest.mock('../../lib/services/api/owner-portal', () => ({
  ownerPortalApi: {
    getSummary: (...args: unknown[]) => mockGetSummary(...args),
    getUnits: (...args: unknown[]) => mockGetUnits(...args),
    getRequests: (...args: unknown[]) => mockGetRequests(...args),
    getConversations: (...args: unknown[]) => mockGetConversations(...args),
  },
}));

jest.mock('../../components/ui/HeaderBar', () => ({
  HeaderBar: () => null,
}));

jest.mock('../../components/ui/PortalLoadErrorScreen', () => ({
  PortalLoadErrorScreen: () => null,
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

jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireMock('react-native');
    return React.createElement(Text, null, name);
  },
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  useBottomTabBarHeight: () => 0,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => {
    const React = jest.requireActual('react');
    const { View } = jest.requireMock('react-native');
    return React.createElement(View, null, children);
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

const flushEffects = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('OwnerHomeScreen request grouping', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      currentUser: {
        id: 'owner-1',
        name: 'Owner User',
        role: 'owner',
      },
      actions: {
        logout: jest.fn().mockResolvedValue(undefined),
      },
    });
    mockUseOwnerUnreadSummary.mockReturnValue({
      conversationUnreadCount: 0,
      notificationUnreadCount: 0,
      requestCommentUnreadCount: 0,
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseOwnerUnauthorized.mockReturnValue(jest.fn().mockResolvedValue(false));
    mockGetSummary.mockResolvedValue({
      buildingCount: 1,
      unitCount: 1,
    });
    mockGetUnits.mockResolvedValue([
      {
        unitId: 'unit-1',
        unitLabel: '101',
        buildingId: 'building-1',
        buildingName: 'Twin Tower',
        orgName: 'Towerdesk',
      },
    ]);
    mockGetRequests.mockResolvedValue([
      {
        id: 'req-current',
        orgId: 'org-1',
        orgName: 'Towerdesk',
        ownerId: 'owner-1',
        buildingId: 'building-1',
        buildingName: 'Twin Tower',
        unit: { id: 'unit-1', label: '101' },
        createdBy: {
          id: 'tenant-1',
          name: 'Amina Noor',
          email: 'amina@example.com',
        },
        title: 'Current stay plumbing',
        description: 'Current occupant issue',
        status: 'PENDING',
        priority: 'MEDIUM',
        type: 'MAINTENANCE',
        attachments: [],
        requestTenancyContext: {
          occupancyIdAtCreation: 'occ-1',
          leaseIdAtCreation: 'lease-1',
          currentOccupancyId: 'occ-1',
          currentLeaseId: 'lease-1',
          isCurrentOccupancy: true,
          isCurrentLease: true,
          label: 'CURRENT_OCCUPANCY',
          leaseLabel: 'CURRENT_LEASE',
        },
        requesterContext: {
          isResident: true,
          currentUnitOccupiedByRequester: true,
        },
        createdAt: '2026-04-11T10:00:00.000Z',
        updatedAt: '2026-04-11T11:00:00.000Z',
      },
      {
        id: 'req-previous',
        orgId: 'org-1',
        orgName: 'Towerdesk',
        ownerId: 'owner-1',
        buildingId: 'building-1',
        buildingName: 'Twin Tower',
        unit: { id: 'unit-1', label: '101' },
        createdBy: {
          id: 'tenant-2',
          name: 'Sara Khan',
          email: 'sara@example.com',
        },
        title: 'Previous stay AC issue',
        description: 'Former occupant issue',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        type: 'MAINTENANCE',
        attachments: [],
        requestTenancyContext: {
          occupancyIdAtCreation: 'occ-old',
          leaseIdAtCreation: 'lease-old',
          currentOccupancyId: 'occ-1',
          currentLeaseId: 'lease-1',
          isCurrentOccupancy: false,
          isCurrentLease: false,
          label: 'PREVIOUS_OCCUPANCY',
          leaseLabel: 'PREVIOUS_LEASE',
        },
        requesterContext: {
          isResident: true,
          currentUnitOccupiedByRequester: true,
        },
        createdAt: '2026-04-10T10:00:00.000Z',
        updatedAt: '2026-04-10T11:00:00.000Z',
      },
      {
        id: 'req-uncategorized',
        orgId: 'org-1',
        orgName: 'Towerdesk',
        ownerId: 'owner-1',
        buildingId: 'building-1',
        buildingName: 'Twin Tower',
        unit: { id: 'unit-1', label: '101' },
        createdBy: {
          id: 'tenant-3',
          name: 'Legacy Resident',
          email: 'legacy@example.com',
        },
        title: 'Legacy uncategorized request',
        description: 'Missing tenancy context',
        status: 'PENDING',
        priority: 'MEDIUM',
        type: 'MAINTENANCE',
        attachments: [],
        requestTenancyContext: {
          occupancyIdAtCreation: null,
          leaseIdAtCreation: null,
          currentOccupancyId: null,
          currentLeaseId: null,
          isCurrentOccupancy: null,
          isCurrentLease: null,
          label: 'UNKNOWN_TENANCY_CYCLE',
          leaseLabel: 'UNKNOWN_LEASE_CYCLE',
          tenancyContextSource: 'UNRESOLVED',
          leaseContextSource: 'UNRESOLVED',
        },
        requesterContext: {
          isResident: true,
          currentUnitOccupiedByRequester: false,
          currentUnitOccupant: {
            userId: 'tenant-4',
            name: 'Omar Ali',
          },
        },
        createdAt: '2026-04-09T10:00:00.000Z',
        updatedAt: '2026-04-09T11:00:00.000Z',
      },
    ]);
    mockGetConversations.mockResolvedValue({ items: [] });
  });

  it('renders recent requests in current, historical, and uncategorized sections', async () => {
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = TestRenderer.create(<OwnerHomeScreen />);
    });
    await flushEffects();

    const renderedTexts = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .filter((value): value is string => typeof value === 'string');

    expect(renderedTexts).toContain('Current Tenant Requests');
    expect(renderedTexts).toContain('Past Tenant Requests');
    expect(renderedTexts).toContain('Unclassified Legacy Requests');
    expect(renderedTexts).toContain('Current stay plumbing');
    expect(renderedTexts).toContain('Previous stay AC issue');
    expect(renderedTexts).toContain('Legacy uncategorized request');
    expect(renderedTexts).toContain('Requester: Amina Noor');
    expect(renderedTexts).toContain('Current tenant: Amina Noor');
    expect(renderedTexts).toContain('Requester: Sara Khan');
    expect(renderedTexts).toContain('Current tenant: Sara Khan');
    expect(renderedTexts).toContain('Current tenant: Omar Ali');
    expect(renderedTexts).toContain('Current Tenant');
    expect(renderedTexts).toContain('Past Tenant');
    expect(renderedTexts).toContain('Legacy Record');

    expect(
      renderedTexts.indexOf('Current Tenant Requests'),
    ).toBeLessThan(renderedTexts.indexOf('Current stay plumbing'));
    expect(
      renderedTexts.indexOf('Past Tenant Requests'),
    ).toBeLessThan(renderedTexts.indexOf('Previous stay AC issue'));
    expect(
      renderedTexts.indexOf('Unclassified Legacy Requests'),
    ).toBeLessThan(renderedTexts.indexOf('Legacy uncategorized request'));
  });
});
