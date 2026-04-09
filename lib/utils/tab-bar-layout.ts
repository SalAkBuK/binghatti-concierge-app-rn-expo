import { Platform, type TextStyle, type ViewStyle } from 'react-native';

type FloatingTabBarLayoutInput = {
  bottomInset: number;
  screenWidth: number;
};

type FloatingTabBarLayout = {
  tabBarStyle: ViewStyle;
  tabBarItemStyle: ViewStyle;
  tabBarIconStyle: TextStyle;
  tabBarLabelStyle: TextStyle;
};

export function getFloatingTabBarLayout({
  bottomInset,
  screenWidth,
}: FloatingTabBarLayoutInput): FloatingTabBarLayout {
  const isAndroid = Platform.OS === 'android';
  const hasBottomInset = bottomInset > 0;
  const isCompactPhone = screenWidth < 360;
  const isSpaciousPhone = screenWidth >= 430;

  const horizontalInset = isCompactPhone ? 12 : isSpaciousPhone ? 18 : 16;
  const paddingHorizontal = isCompactPhone ? 6 : isSpaciousPhone ? 12 : 10;
  const paddingTop = isCompactPhone ? 6 : 8;
  const paddingBottom = hasBottomInset
    ? isCompactPhone
      ? 10
      : 12
    : isCompactPhone
      ? 8
      : 10;
  const tabBarHeight = (isCompactPhone ? 56 : isSpaciousPhone ? 62 : 60) + paddingBottom;
  const bottomOffset = isAndroid
    ? Math.max(bottomInset + 8, isCompactPhone ? 20 : 24)
    : hasBottomInset
      ? 14
      : isCompactPhone
        ? 8
        : 10;

  return {
    tabBarStyle: {
      position: 'absolute',
      bottom: bottomOffset,
      left: horizontalInset,
      right: horizontalInset,
      width: undefined,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 0,
      borderRadius: isCompactPhone ? 24 : 28,
      paddingBottom,
      paddingTop,
      paddingHorizontal,
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
      paddingTop: isCompactPhone ? 2 : 0,
    },
    tabBarIconStyle: {
      marginBottom: isCompactPhone ? 4 : 7,
    },
    tabBarLabelStyle: {
      fontSize: isCompactPhone ? 10 : 11,
      fontWeight: '700',
      letterSpacing: isCompactPhone ? 0.15 : 0.2,
      marginTop: 0,
    },
  };
}
