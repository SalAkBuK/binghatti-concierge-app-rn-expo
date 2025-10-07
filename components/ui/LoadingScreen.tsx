import React, { useEffect } from "react";
import { View, StyleSheet, Text, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
// Uncomment the line below when you add a Lottie animation file
// import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface LoadingScreenProps {
  message?: string;
  useLottie?: boolean;
  lottieSource?: any;
}

export function LoadingScreen({
  message = "Loading...",
  useLottie = false,
  lottieSource,
}: LoadingScreenProps) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Pulsing animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    // Rotating animation
    rotate.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false,
    );

    // Fade animation
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const animatedSpinnerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotate.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#7034FF", "#1B28B1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Lottie Animation Section */}
          {useLottie && lottieSource ? (
            <View style={styles.lottieContainer}>
              {/* Uncomment when you add a Lottie file */}
              {/* <LottieView
                source={lottieSource}
                autoPlay
                loop
                style={styles.lottie}
              /> */}
              <Text style={styles.placeholder}>
                Add your Lottie animation file to{"\n"}
                assets/lottie/ directory
              </Text>
            </View>
          ) : (
            <>
              {/* Custom Loading Animation */}
              <Animated.View style={[styles.logoCircle, animatedLogoStyle]}>
                <LinearGradient
                  colors={["#FFFFFF", "rgba(255,255,255,0.8)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoText}>TD</Text>
                </LinearGradient>
              </Animated.View>

              <Animated.View style={[styles.spinner, animatedSpinnerStyle]}>
                <View style={styles.spinnerDot} />
                <View style={[styles.spinnerDot, styles.spinnerDot2]} />
                <View style={[styles.spinnerDot, styles.spinnerDot3]} />
              </Animated.View>
            </>
          )}

          <Text style={styles.message}>{message}</Text>
          <Text style={styles.appName}>Tower Desk</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  lottieContainer: {
    width: 200,
    height: 200,
    marginBottom: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    width: 200,
    height: 200,
  },
  placeholder: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  logoGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 48,
    fontWeight: "700",
    color: "#7034FF",
  },
  spinner: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  spinnerDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    top: 0,
  },
  spinnerDot2: {
    transform: [{ rotate: "120deg" }],
  },
  spinnerDot3: {
    transform: [{ rotate: "240deg" }],
  },
  message: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  appName: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "400",
  },
});
