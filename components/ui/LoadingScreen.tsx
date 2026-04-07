import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface LoadingScreenProps {
  message?: string;
  useLottie?: boolean;
  lottieSource?: any;
  isFinishing?: boolean;
}

const P = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceLow: '#F1F4F6',
  text: '#2B3437',
  muted: '#586064',
  soft: '#8B9599',
  primary: '#4D6169',
  primaryDark: '#41555D',
};

export function LoadingScreen({
  message = 'Building workspace environment...',
  isFinishing = false,
}: LoadingScreenProps) {
  const screenOpacity = useSharedValue(1);
  const screenScale = useSharedValue(1);
  const screenTranslateY = useSharedValue(0);
  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-12);
  const monogramScale = useSharedValue(0.96);
  const monogramOpacity = useSharedValue(0);
  const monogramTranslateY = useSharedValue(18);
  const monogramRotate = useSharedValue(0);
  const markScale = useSharedValue(0.88);
  const brandOpacity = useSharedValue(0);
  const brandTranslateY = useSharedValue(16);
  const footerOpacity = useSharedValue(0);
  const footerTranslateY = useSharedValue(14);
  const messageOpacity = useSharedValue(0.4);
  const progressWidth = useSharedValue(0.18);
  const progressSweep = useSharedValue(-0.32);
  const topGlowX = useSharedValue(0);
  const topGlowY = useSharedValue(0);
  const bottomGlowX = useSharedValue(0);
  const bottomGlowY = useSharedValue(0);
  const gridOpacity = useSharedValue(0.16);
  const gridLift = useSharedValue(0);

  useEffect(() => {
    headerOpacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.ease),
    });

    headerTranslateY.value = withTiming(0, {
      duration: 700,
      easing: Easing.out(Easing.ease),
    });

    monogramOpacity.value = withSequence(
      withDelay(
        140,
        withTiming(1, {
          duration: 900,
          easing: Easing.out(Easing.ease),
        }),
      ),
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.94, {
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );

    monogramTranslateY.value = withSequence(
      withDelay(
        140,
        withTiming(0, {
          duration: 900,
          easing: Easing.out(Easing.ease),
        }),
      ),
      withRepeat(
        withSequence(
          withTiming(-5, {
            duration: 2800,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 2800,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );

    monogramScale.value = withSequence(
      withDelay(
        140,
        withTiming(1, {
          duration: 900,
          easing: Easing.out(Easing.ease),
        }),
      ),
      withRepeat(
        withSequence(
          withTiming(1.025, {
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );

    monogramRotate.value = withDelay(
      220,
      withRepeat(
        withSequence(
          withTiming(-0.55, {
            duration: 3200,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.55, {
            duration: 3600,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 2600,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      ),
    );

    markScale.value = withSequence(
      withDelay(
        260,
        withTiming(1, {
          duration: 800,
          easing: Easing.out(Easing.ease),
        }),
      ),
      withRepeat(
        withSequence(
          withTiming(1.03, {
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.97, {
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );

    brandOpacity.value = withSequence(
      withDelay(
        320,
        withTiming(1, {
          duration: 820,
          easing: Easing.out(Easing.ease),
        }),
      ),
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 2400,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.92, {
            duration: 2400,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );

    brandTranslateY.value = withSequence(
      withDelay(
        320,
        withTiming(0, {
          duration: 820,
          easing: Easing.out(Easing.ease),
        }),
      ),
      withRepeat(
        withSequence(
          withTiming(-2, {
            duration: 2400,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: 2400,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );

    footerOpacity.value = withDelay(
      520,
      withTiming(1, {
        duration: 760,
        easing: Easing.out(Easing.ease),
      }),
    );

    footerTranslateY.value = withDelay(
      520,
      withTiming(0, {
        duration: 760,
        easing: Easing.out(Easing.ease),
      }),
    );

    messageOpacity.value = withDelay(
      620,
      withRepeat(
        withSequence(
          withTiming(0.56, {
            duration: 1700,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.32, {
            duration: 1700,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      ),
    );

    progressWidth.value = withDelay(
      540,
      withTiming(1, {
        duration: 1600,
        easing: Easing.inOut(Easing.ease),
      }),
    );

    progressSweep.value = withDelay(
      900,
      withRepeat(
        withTiming(1.18, {
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        false,
      ),
    );

    topGlowX.value = withRepeat(
      withSequence(
        withTiming(14, {
          duration: 4200,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(-9, {
          duration: 4200,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    topGlowY.value = withRepeat(
      withSequence(
        withTiming(10, {
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(-6, {
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    bottomGlowX.value = withRepeat(
      withSequence(
        withTiming(-18, {
          duration: 4700,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(10, {
          duration: 4700,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    bottomGlowY.value = withRepeat(
      withSequence(
        withTiming(-12, {
          duration: 4300,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(8, {
          duration: 4300,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    gridOpacity.value = withRepeat(
      withSequence(
        withTiming(0.24, {
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.1, {
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );

    gridLift.value = withRepeat(
      withSequence(
        withTiming(-4, {
          duration: 3600,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 3600,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );
  }, [
    bottomGlowX,
    bottomGlowY,
    footerOpacity,
    footerTranslateY,
    headerOpacity,
    headerTranslateY,
    brandOpacity,
    brandTranslateY,
    gridLift,
    gridOpacity,
    markScale,
    messageOpacity,
    monogramOpacity,
    monogramRotate,
    monogramScale,
    monogramTranslateY,
    progressSweep,
    progressWidth,
    topGlowX,
    topGlowY,
  ]);

  useEffect(() => {
    if (isFinishing) {
      screenOpacity.value = withTiming(0, {
        duration: 360,
        easing: Easing.inOut(Easing.ease),
      });
      screenScale.value = withTiming(1.02, {
        duration: 360,
        easing: Easing.inOut(Easing.ease),
      });
      screenTranslateY.value = withTiming(-10, {
        duration: 360,
        easing: Easing.inOut(Easing.ease),
      });
      return;
    }

    screenOpacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
    screenScale.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
    screenTranslateY.value = withTiming(0, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
  }, [isFinishing, screenOpacity, screenScale, screenTranslateY]);

  const screenAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: screenOpacity.value,
    transform: [
      { translateY: screenTranslateY.value },
      { scale: screenScale.value },
    ] as any,
  }));

  const headerAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }] as any,
  }));

  const monogramAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: monogramOpacity.value,
    transform: [
      { translateY: monogramTranslateY.value },
      { rotate: `${monogramRotate.value}deg` },
      { scale: monogramScale.value },
    ] as any,
  }));

  const markAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [{ scale: markScale.value }] as any,
  }));

  const brandAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: brandOpacity.value,
    transform: [{ translateY: brandTranslateY.value }] as any,
  }));

  const footerAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: footerOpacity.value,
    transform: [{ translateY: footerTranslateY.value }] as any,
  }));

  const messageAnimatedStyle = useAnimatedStyle<TextStyle>(() => ({
    opacity: messageOpacity.value,
  }));

  const progressAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const progressGlowAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    left: `${progressSweep.value * 100}%`,
  }));

  const topGlowAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: topGlowX.value },
      { translateY: topGlowY.value },
    ] as any,
  }));

  const bottomGlowAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    transform: [
      { translateX: bottomGlowX.value },
      { translateY: bottomGlowY.value },
    ] as any,
  }));

  const gridAnimatedStyle = useAnimatedStyle<ViewStyle>(() => ({
    opacity: gridOpacity.value,
    transform: [{ translateY: gridLift.value }] as any,
  }));

  return (
    <Animated.View style={[styles.container, screenAnimatedStyle]}>
      <View style={styles.background}>
        <View style={styles.rightTone} />
        <View style={styles.leftTone} />
        <Animated.View style={[styles.topGlow, topGlowAnimatedStyle]} />
        <Animated.View style={[styles.bottomGlow, bottomGlowAnimatedStyle]} />
        <Animated.View style={[styles.gridAccent, gridAnimatedStyle]} />
        <Animated.View style={[styles.gridAccentSecondary, gridAnimatedStyle]} />
      </View>

      <Animated.View style={[styles.header, headerAnimatedStyle]}>
        <View style={styles.headerColumn}>
          <Text style={styles.headerLabel}>Digital Curator v2.4</Text>
          <View style={styles.headerRule} />
        </View>
        <Text style={styles.headerLabel}>Established MMXXIV</Text>
      </Animated.View>

      <View style={styles.centerSection}>
        <Animated.View style={[styles.monogramShell, monogramAnimatedStyle]}>
          <View style={styles.monogramGlow} />
          <View style={styles.monogramGlassRing} />
          <Text style={styles.monogramLetter}>T</Text>
          <Animated.View style={[styles.monogramMark, markAnimatedStyle]}>
            <View style={styles.monogramDot} />
            <View style={[styles.monogramLine, styles.monogramLineLeft]} />
            <View style={[styles.monogramLine, styles.monogramLineCenter]} />
            <View style={[styles.monogramLine, styles.monogramLineRight]} />
          </Animated.View>
        </Animated.View>

        <Animated.View style={brandAnimatedStyle}>
          <Text style={styles.brand}>Towerdesk</Text>
          <Text style={styles.subbrand}>Architectural Intelligence</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, footerAnimatedStyle]}>
        <Animated.Text style={[styles.message, messageAnimatedStyle]}>
          {message.toUpperCase()}
        </Animated.Text>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          <Animated.View
            style={[styles.progressGlow, progressGlowAnimatedStyle]}
          />
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Encryption: Active</Text>
          <Text style={styles.statusText}>Assets: Optimized</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
    paddingHorizontal: 22,
    paddingTop: 56,
    paddingBottom: 44,
    justifyContent: 'space-between',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  rightTone: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '46%',
    height: '100%',
    backgroundColor: 'rgba(241, 244, 246, 0.68)',
  },
  leftTone: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '62%',
    height: 230,
    backgroundColor: 'rgba(241, 244, 246, 0.45)',
  },
  topGlow: {
    position: 'absolute',
    top: -40,
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(232, 240, 243, 0.95)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 80,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(208, 230, 239, 0.28)',
  },
  gridAccent: {
    position: 'absolute',
    right: 24,
    bottom: 86,
    width: 104,
    height: 104,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(208, 230, 239, 0.8)',
  },
  gridAccentSecondary: {
    position: 'absolute',
    right: 62,
    bottom: 124,
    width: 64,
    height: 64,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(208, 230, 239, 0.48)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerColumn: {
    gap: 8,
  },
  headerLabel: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: P.soft,
  },
  headerRule: {
    width: 34,
    height: 1.5,
    backgroundColor: 'rgba(77, 97, 105, 0.18)',
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  monogramShell: {
    width: 124,
    height: 124,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: 'rgba(42, 52, 55, 0.09)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 34,
    elevation: 7,
    overflow: 'hidden',
  },
  monogramGlow: {
    position: 'absolute',
    top: -14,
    right: -12,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(77, 97, 105, 0.05)',
  },
  monogramGlassRing: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(77, 97, 105, 0.05)',
  },
  monogramLetter: {
    position: 'absolute',
    fontSize: 64,
    fontWeight: '900',
    letterSpacing: -2.5,
    color: 'rgba(77, 97, 105, 0.12)',
  },
  monogramMark: {
    width: 34,
    height: 38,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  monogramDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: P.primaryDark,
    backgroundColor: 'transparent',
    marginBottom: 5,
  },
  monogramLine: {
    position: 'absolute',
    bottom: 0,
    width: 1.5,
    borderRadius: 999,
    backgroundColor: P.primaryDark,
  },
  monogramLineLeft: {
    height: 17,
    left: 9,
    transform: [{ rotate: '23deg' }],
  },
  monogramLineCenter: {
    height: 20,
    left: 16,
  },
  monogramLineRight: {
    height: 17,
    right: 9,
    transform: [{ rotate: '-23deg' }],
  },
  brand: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -1.3,
    color: P.text,
    textAlign: 'center',
  },
  subbrand: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 4.1,
    textTransform: 'uppercase',
    color: P.muted,
    textAlign: 'center',
  },
  footer: {
    gap: 18,
  },
  message: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(88, 96, 100, 0.55)',
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    backgroundColor: P.primary,
  },
  progressGlow: {
    position: 'absolute',
    top: -2,
    width: '22%',
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  statusText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: 'rgba(88, 96, 100, 0.55)',
  },
});
