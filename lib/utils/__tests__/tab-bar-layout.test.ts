import { Platform } from 'react-native';

import { getFloatingTabBarLayout } from '../tab-bar-layout';

describe('getFloatingTabBarLayout', () => {
  const setPlatform = (os: 'ios' | 'android') => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      get: () => os,
    });
  };

  it('compresses the floating tab bar on compact phones', () => {
    setPlatform('ios');

    const layout = getFloatingTabBarLayout({
      bottomInset: 0,
      screenWidth: 320,
    });

    expect(layout.tabBarStyle).toEqual(
      expect.objectContaining({
        bottom: 8,
        left: 12,
        right: 12,
        borderRadius: 24,
        paddingTop: 6,
        paddingBottom: 8,
        paddingHorizontal: 6,
        height: 64,
      }),
    );
    expect(layout.tabBarItemStyle).toEqual(
      expect.objectContaining({
        paddingTop: 2,
      }),
    );
    expect(layout.tabBarIconStyle).toEqual(
      expect.objectContaining({
        marginBottom: 4,
      }),
    );
    expect(layout.tabBarLabelStyle).toEqual(
      expect.objectContaining({
        fontSize: 10,
      }),
    );
  });

  it('keeps larger phones on the standard floating tab layout', () => {
    setPlatform('ios');

    const layout = getFloatingTabBarLayout({
      bottomInset: 34,
      screenWidth: 393,
    });

    expect(layout.tabBarStyle).toEqual(
      expect.objectContaining({
        bottom: 14,
        left: 16,
        right: 16,
        borderRadius: 28,
        paddingTop: 8,
        paddingBottom: 12,
        paddingHorizontal: 10,
        height: 72,
      }),
    );
    expect(layout.tabBarItemStyle).toEqual(
      expect.objectContaining({
        paddingTop: 0,
      }),
    );
    expect(layout.tabBarIconStyle).toEqual(
      expect.objectContaining({
        marginBottom: 7,
      }),
    );
    expect(layout.tabBarLabelStyle).toEqual(
      expect.objectContaining({
        fontSize: 11,
      }),
    );
  });

  it('raises the floating tab bar on Android to clear system navigation', () => {
    setPlatform('android');

    const layout = getFloatingTabBarLayout({
      bottomInset: 0,
      screenWidth: 393,
    });

    expect(layout.tabBarStyle).toEqual(
      expect.objectContaining({
        bottom: 24,
        left: 16,
        right: 16,
        borderRadius: 28,
        paddingTop: 8,
        paddingBottom: 10,
        paddingHorizontal: 10,
        height: 70,
      }),
    );
  });
});
