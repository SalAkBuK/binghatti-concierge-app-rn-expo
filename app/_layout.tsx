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
import { ConnectedAppProvider as AppProvider } from "../lib/context/connected-app-provider";
import { ErrorBoundary } from "../components/ErrorBoundary";

void SplashScreen.preventAutoHideAsync();

// Removed hardcoded anchor - let each role portal manage its own navigation

// Component to handle Android back button exit confirmation
function ExitConfirmationHandler() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Only handle back button on Android
    if (Platform.OS !== "android") {
      return;
    }

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Check if we're at a main portal home screen
        // This includes both the portal root and the main index/home tab
        const isPortal =
          segments[0] === "(tenant)" ||
          segments[0] === "(management)" ||
          segments[0] === "(admin)" ||
          segments[0] === "(superadmin)" ||
          segments[0] === "(employee)" ||
          segments[0] === "(buildingEmployee)" ||
          segments[0] === "(serviceProvider)";

        // Treat as "home" only when at portal root or its index tab (not deep screens)
        const isAtPortalHome =
          isPortal &&
          (segments.length === 1 ||
            (segments.length === 2 &&
              (segments[1] === undefined ||
                segments[1] === "index" ||
                segments[1] === "")));

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

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <ExitConfirmationHandler />
          <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tenant)" options={{ headerShown: false }} />
          <Stack.Screen name="(management)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="(superadmin)" options={{ headerShown: false }} />
          <Stack.Screen name="(serviceProvider)" options={{ headerShown: false }} />
          <Stack.Screen name="(employee)" options={{ headerShown: false }} />
          <Stack.Screen name="(buildingEmployee)" options={{ headerShown: false }} />
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
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
