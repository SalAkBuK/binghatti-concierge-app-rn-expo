import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedButton } from "../components/ui/AnimatedButton";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { useApp } from "../lib/context/connected-app-provider";
import { STORAGE_KEYS } from "../lib/utils/constants";

interface FormData {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: string;
}

export default function AuthScreen() {
  const { actions } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "tenant",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!formData.email || !formData.password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (isSignUp && !formData.name) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await actions.register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone,
          role: formData.role, // Pass the selected role
        } as any);
        Alert.alert(
          "Success",
          "Account created successfully! Please sign in.",
          [{ text: "OK", onPress: () => setIsSignUp(false) }],
        );
      } else {
        await actions.login({
          email: formData.email,
          password: formData.password,
        });

        // Navigate back to index which will redirect based on user role
        router.replace("/");
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Authentication failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearCache = async () => {
    Alert.alert(
      "Clear Cache",
      "This will clear all cached user data and reset to default users. This fixes role/authentication issues. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEYS.users);
              Alert.alert("Success", "Cache cleared! Please restart the app.");
            } catch (error) {
              Alert.alert("Error", "Failed to clear cache");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <LoadingScreen
        message={isSignUp ? "Creating account..." : "Signing in..."}
        useLottie={false}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="business" size={32} color="#2563eb" />
            </View>
            <Text style={styles.title}>Tower Desk</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? "Create your account" : "Sign in to continue"}
            </Text>
            {/* Demo Version Badge */}
            <View style={styles.demoBadge}>
              <Ionicons name="information-circle-outline" size={14} color="#f59e0b" />
              <Text style={styles.demoText}>DEMO VERSION - Mock Data</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            {isSignUp && (
              <>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={formData.name}
                    onChangeText={(text) => updateFormData("name", text)}
                    autoCapitalize="words"
                    textContentType="name"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChangeText={(text) => updateFormData("phone", text)}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                  />
                </View>

                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.role}
                    onValueChange={(value) => updateFormData("role", value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Tenant" value="tenant" />
                    <Picker.Item
                      label="Service Provider"
                      value="service_provider"
                    />
                    <Picker.Item label="Employee" value="employee" />
                    <Picker.Item label="Management" value="management" />
                    <Picker.Item label="Admin" value="admin" />
                  </Picker>
                </View>
              </>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={formData.email}
                onChangeText={(text) => updateFormData("email", text)}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={formData.password}
                onChangeText={(text) => updateFormData("password", text)}
                secureTextEntry={!showPassword}
                textContentType="password"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            <AnimatedButton style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {isSignUp ? "Create Account" : "Sign In"}
              </Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.switchButton}
              onPress={() => setIsSignUp(!isSignUp)}
            >
              <Text style={styles.switchButtonText}>
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </Text>
            </AnimatedButton>

            <TouchableOpacity
              style={styles.clearCacheButton}
              onPress={handleClearCache}
            >
              <Ionicons name="refresh-outline" size={16} color="#6b7280" />
              <Text style={styles.clearCacheText}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  formContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputContainer: {
    marginBottom: 16,
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: "white",
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    marginTop: 24,
    alignItems: "center",
  },
  switchButtonText: {
    color: "#2563eb",
    fontSize: 14,
  },
  clearCacheButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 8,
    gap: 8,
  },
  clearCacheText: {
    color: "#6b7280",
    fontSize: 12,
  },
  demoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  demoText: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "600",
  },
});
