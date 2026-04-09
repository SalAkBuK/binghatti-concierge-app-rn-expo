import { Ionicons } from '@expo/vector-icons';
import { Tabs, router, usePathname } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/context/auth-context';
import { OwnerNotificationsProvider } from '../../lib/context/owner-notifications-context';
import { getFloatingTabBarLayout } from '../../lib/utils/tab-bar-layout';

type OwnerTabIconProps = {
  color: string;
  focused: boolean;
  name: keyof typeof Ionicons.glyphMap;
  activeName: keyof typeof Ionicons.glyphMap;
};

function OwnerTabIcon({
  color,
  focused,
  name,
  activeName,
}: OwnerTabIconProps) {
  return (
    <Ionicons
      name={focused ? activeName : name}
      size={focused ? 24 : 22}
      color={color}
    />
  );
}

export default function OwnerLayout() {
  const { isAuthenticated, currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const hasRedirectedToRole = useRef(false);
  const tabBarLayout = getFloatingTabBarLayout({
    bottomInset: insets.bottom,
    screenWidth: width,
  });

  useEffect(() => {
    if (
      isAuthenticated &&
      currentUser &&
      currentUser.role !== 'owner' &&
      !hasRedirectedToRole.current
    ) {
      hasRedirectedToRole.current = true;
      router.replace('/' as any);
    } else if (!currentUser || currentUser.role === 'owner') {
      hasRedirectedToRole.current = false;
    }
  }, [currentUser, isAuthenticated]);

  const shouldHideTabBar = useMemo(
    () =>
      pathname.startsWith('/(owner)/notifications') ||
      pathname.startsWith('/(owner)/requests/') ||
      pathname.startsWith('/(owner)/messages/'),
    [pathname],
  );

  if (!isAuthenticated || !currentUser || currentUser.role !== 'owner') {
    return null;
  }

  return (
    <OwnerNotificationsProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2B3437',
          tabBarInactiveTintColor: '#8A969B',
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,
          animation: 'fade',
          tabBarHideOnKeyboard: true,
          tabBarStyle: shouldHideTabBar
            ? { display: 'none' }
            : tabBarLayout.tabBarStyle,
          tabBarItemStyle: tabBarLayout.tabBarItemStyle,
          tabBarIconStyle: tabBarLayout.tabBarIconStyle,
          tabBarLabelStyle: tabBarLayout.tabBarLabelStyle,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <OwnerTabIcon
                color={color}
                focused={focused}
                name="home-outline"
                activeName="home"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="units"
          options={{
            title: 'Units',
            tabBarIcon: ({ color, focused }) => (
              <OwnerTabIcon
                color={color}
                focused={focused}
                name="business-outline"
                activeName="business"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="requests/index"
          options={{
            title: 'Requests',
            tabBarIcon: ({ color, focused }) => (
              <OwnerTabIcon
                color={color}
                focused={focused}
                name="clipboard-outline"
                activeName="clipboard"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="messages/index"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, focused }) => (
              <OwnerTabIcon
                color={color}
                focused={focused}
                name="chatbubbles-outline"
                activeName="chatbubbles"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <OwnerTabIcon
                color={color}
                focused={focused}
                name="person-outline"
                activeName="person"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="requests/[requestId]"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="messages/[conversationId]"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </OwnerNotificationsProvider>
  );
}
