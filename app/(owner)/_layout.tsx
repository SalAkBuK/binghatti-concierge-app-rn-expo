import { Ionicons } from '@expo/vector-icons';
import { Tabs, router, usePathname } from 'expo-router';
import React, { useEffect, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../lib/context/auth-context';
import { OwnerNotificationsProvider } from '../../lib/context/owner-notifications-context';

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
  const pathname = usePathname();
  const hasRedirectedToRole = useRef(false);
  const hasBottomGestureInset = insets.bottom > 0;
  const tabBarBottomOffset = hasBottomGestureInset ? 14 : 10;
  const tabBarPaddingBottom = hasBottomGestureInset ? 12 : 10;
  const tabBarHeight = 60 + tabBarPaddingBottom;

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
            : {
                position: 'absolute',
                bottom: tabBarBottomOffset,
                left: 16,
                right: 16,
                width: undefined,
                backgroundColor: '#FFFFFF',
                borderTopWidth: 0,
                borderRadius: 28,
                paddingBottom: tabBarPaddingBottom,
                paddingTop: 8,
                paddingHorizontal: 10,
                minHeight: tabBarHeight,
                height: tabBarHeight,
                shadowColor: 'rgba(43, 52, 55, 0.18)',
                shadowOffset: {
                  width: 0,
                  height: -6,
                },
                shadowOpacity: 1,
                shadowRadius: 24,
                elevation: 18,
                opacity: 1,
              },
          tabBarItemStyle: {
            paddingTop: 0,
          },
          tabBarIconStyle: {
            marginBottom: 7,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.2,
            marginTop: 0,
          },
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
          name="notifications"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color, focused }) => (
              <OwnerTabIcon
                color={color}
                focused={focused}
                name="notifications-outline"
                activeName="notifications"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="requests/[requestId]"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="messages/[conversationId]"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </OwnerNotificationsProvider>
  );
}
