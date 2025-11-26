import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    BackHandler,
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

interface FormErrors {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
}

// Validation constants
const MIN_PASSWORD_LENGTH = 8;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/; // Allows optional + and 10-15 digits

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
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const placeholderColor = "#94A3B8";

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isSignUp) {
          // If in sign-up mode, toggle back to login mode
          setIsSignUp(false);
          return true; // Prevent default back navigation
        }
        // If in login mode, allow default behavior (exit app or go back)
        return false;
      }
    );

    return () => backHandler.remove();
  }, [isSignUp]);

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email || !email.trim()) {
      return "Email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Enter a valid email address";
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password || !password.trim()) {
      return "Password is required";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
    }
    return undefined;
  };

  const validateName = (name: string): string | undefined => {
    if (!name || !name.trim()) {
      return "Username is required";
    }
    if (name.trim().length < 2) {
      return "Username must be at least 2 characters";
    }
    return undefined;
  };

  const validatePhone = (phone: string): string | undefined => {
    if (!phone || !phone.trim()) {
      return "Phone number is required";
    }
    // Remove spaces and dashes for validation
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (!PHONE_REGEX.test(cleanPhone)) {
      return "Enter a valid phone number (10-15 digits)";
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Common validations
    newErrors.email = validateEmail(formData.email);
    newErrors.password = validatePassword(formData.password);

    // Sign-up specific validations
    if (isSignUp) {
      newErrors.name = validateName(formData.name);
      newErrors.phone = validatePhone(formData.phone);
    }

    setErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some((error) => error !== undefined);
  };

  const handleSubmit = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await actions.register({
          email: formData.email.trim(),
          password: formData.password,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
        } as any);
        Alert.alert(
          "Success",
          "Account created successfully! Please sign in.",
          [{
            text: "OK",
            onPress: () => {
              setIsSignUp(false);
              // Clear form data
              setFormData({
                email: "",
                password: "",
                name: "",
                phone: "",
                role: "tenant",
              });
              setErrors({});
            }
          }],
        );
      } else {
        await actions.login({
          email: formData.email.trim(),
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
    // Clear error for this field when user starts typing
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
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
              console.error("Failed to clear auth cache:", error);
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
          {/* Back button - only show in sign-up mode */}
          {isSignUp && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setIsSignUp(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#2563eb" />
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          )}

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
                    style={[
                      styles.input,
                      errors.name && styles.inputError
                    ]}
                    placeholder="Full Name (Username)"
                    placeholderTextColor={placeholderColor}
                    value={formData.name}
                    onChangeText={(text) => updateFormData("name", text)}
                    autoCapitalize="words"
                    textContentType="name"
                  />
                  {errors.name && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={14} color="#ef4444" />
                      <Text style={styles.errorText}>{errors.name}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      errors.phone && styles.inputError
                    ]}
                    placeholder="Phone Number"
                    placeholderTextColor={placeholderColor}
                    value={formData.phone}
                    onChangeText={(text) => updateFormData("phone", text)}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                  />
                  {errors.phone && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={14} color="#ef4444" />
                      <Text style={styles.errorText}>{errors.phone}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Select Role</Text>
                  <Picker
                    selectedValue={formData.role}
                    onValueChange={(value) => updateFormData("role", value as string)}
                    style={[styles.picker, styles.pickerText]}
                    itemStyle={styles.pickerText}
                    dropdownIconColor="#6b7280"
                    mode="dropdown"
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
                style={[
                  styles.input,
                  errors.email && styles.inputError
                ]}
                placeholder="Email"
                placeholderTextColor={placeholderColor}
                value={formData.email}
                onChangeText={(text) => updateFormData("email", text)}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {errors.email && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input,
                  errors.password && styles.inputError
                ]}
                placeholder="Password"
                placeholderTextColor={placeholderColor}
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
              {errors.password && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.password}</Text>
                </View>
              )}
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  backButtonText: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: "600",
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
  inputError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    flex: 1,
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
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  pickerLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
    marginLeft: 4,
    fontWeight: "500",
  },
  picker: {
    height: 50,
    color: "#111827",
  },
  pickerText: {
    color: "#111827",
    fontSize: 16,
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
