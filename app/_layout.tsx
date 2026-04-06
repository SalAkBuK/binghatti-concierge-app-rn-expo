import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { Alert, BackHandler, Platform } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { AppProvider } from "../lib/context/app-provider";
import { useAuth } from "../lib/context/auth-context";
import {
  isMountedPortalHome,
  MOUNTED_PORTAL_CONFIGS,
} from "../lib/config/portals";
import { formatCrashReport, getLastCrashReport } from "../lib/utils/crashReporter";

void SplashScreen.preventAutoHideAsync();

// Removed hardcoded anchor - let each role portal manage its own navigation

// Component to handle Android back button exit confirmation
function ExitConfirmationHandler() {
  const segments = useSegments();

  useEffect(() => {
    // Only handle back button on Android
    if (Platform.OS !== "android") {
      return;
    }

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        const isAtPortalHome = isMountedPortalHome(segments as string[]);

        if (isAtPortalHome) {
          // Show confirmation dialog
          Alert.alert(
            "Exit App",
            "Are you sure you want to exit from the application?",
            [
              {
                text: "No",
                onPress: () => null,
                style: "cancel",
              },
              {
                text: "Yes",
                onPress: () => BackHandler.exitApp(),
              },
            ],
            { cancelable: false }
          );
          return true; // Prevent default back button behavior
        }

        return false; // Allow default back button behavior for other screens
      }
    );

    return () => backHandler.remove();
  }, [segments]);

  return null;
}

function PasswordChangeGate() {
  const { isAuthenticated, currentUser } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.mustChangePassword) {
      return;
    }

    if (segments[0] !== "change-password") {
      router.replace("/change-password");
    }
  }, [currentUser?.mustChangePassword, isAuthenticated, router, segments]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Load the icon fonts explicitly so they are packaged in release builds
    ...Ionicons.font,
    ...MaterialIcons.font,
  });
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const logCrashReport = async () => {
      const report = await getLastCrashReport();
      if (report) {
        console.warn("[CrashReport] Last crash report:\n" + formatCrashReport(report));
      }
    };

    logCrashReport();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <PasswordChangeGate />
          <ExitConfirmationHandler />
          <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ headerShown: false }} />
          <Stack.Screen name="change-password" options={{ headerShown: false }} />
          <Stack.Screen name="portal-unavailable" options={{ headerShown: false }} />
          {MOUNTED_PORTAL_CONFIGS.map((portal) => (
            <Stack.Screen
              key={portal.segment}
              name={portal.segment}
              options={{ headerShown: false }}
            />
          ))}
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
          <Stack.Screen
            name="(modals)/notifications-hub"
            options={{
              presentation: "modal",
              headerShown: false,
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="(modals)/admin-notifications"
            options={{
              presentation: "modal",
              headerShown: false,
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="(modals)/request-details"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(modals)/notice-details"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(modals)/amenity-booking-form"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(modals)/register-visitor"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(modals)/submit-rating"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(modals)/approve-job-completion"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(modals)/request-provider-access"
            options={{
              presentation: "modal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(modals)/conversation-detail"
            options={{
              presentation: "modal",
              headerShown: false,
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="(modals)/new-conversation"
            options={{
              presentation: "modal",
              headerShown: false,
              animation: "slide_from_bottom",
            }}
          />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
