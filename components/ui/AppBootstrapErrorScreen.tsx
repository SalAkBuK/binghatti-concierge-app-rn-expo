import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AppBootstrapErrorScreenProps = {
  message: string;
  onRetry: () => void;
  onContinueToSignIn: () => void;
};

const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  primary: "#4D6169",
  primaryDark: "#34474D",
  surfaceLow: "#F1F4F6",
};

export function AppBootstrapErrorScreen({
  message,
  onRetry,
  onContinueToSignIn,
}: AppBootstrapErrorScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Workspace Recovery</Text>
          <Text style={styles.title}>The app could not finish loading</Text>
          <Text style={styles.body}>{message}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onContinueToSignIn}
          >
            <Text style={styles.secondaryButtonText}>Continue to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: "center",
  },
  card: {
    backgroundColor: P.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: P.primary,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: P.text,
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
  },
  primaryButton: {
    marginTop: 22,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: P.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: P.border,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: P.primaryDark,
  },
});
