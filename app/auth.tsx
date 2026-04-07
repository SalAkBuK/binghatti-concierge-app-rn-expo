import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '../components/ui/LoadingScreen';
import { ScreenEntrance } from '../components/ui/ScreenEntrance';
import { useAuth } from '../lib/context/auth-context';
import { STORAGE_KEYS } from '../lib/utils/constants';

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

const MIN_PASSWORD_LENGTH = 8;

const P = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceLow: '#F1F4F6',
  surfaceHigh: '#DBE4E7',
  text: '#2B3437',
  muted: '#586064',
  soft: '#727C80',
  primary: '#4D6169',
  primaryDark: '#41555D',
  primarySoft: '#D0E6EF',
  accent: '#EEF5F8',
  accentText: '#596063',
  warningBg: '#FDF1DB',
  warningText: '#9A5B00',
  error: '#B24844',
  shadow: 'rgba(42, 52, 55, 0.08)',
};

export default function AuthScreen() {
  const { actions, isAuthenticated, currentUser } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<keyof FormData | null>(null);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      router.replace('/');
    }
  }, [currentUser, isAuthenticated]);

  const validateEmail = (email: string): string | undefined => {
    if (!email || !email.trim()) {
      return 'Email is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Enter a valid email address';
    }

    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password || !password.trim()) {
      return 'Password is required';
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`;
    }

    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    newErrors.email = validateEmail(formData.email);
    newErrors.password = validatePassword(formData.password);
    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== undefined);
  };

  const updateFormData = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));

    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await actions.login({
        email: formData.email.trim(),
        password: formData.password,
      });
      router.replace('/');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Authentication failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password' as any);
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached user data and reset to default users. This fixes role/authentication issues. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(STORAGE_KEYS.users);
              Alert.alert('Success', 'Cache cleared! Please restart the app.');
            } catch (error) {
              console.error('Failed to clear auth cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ],
    );
  };

  const handleInfoLink = (label: string) => {
    Alert.alert(label, 'This link is not wired in the mobile app yet.');
  };

  if (loading) {
    return <LoadingScreen message='Signing in...' useLottie={false} />;
  }

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.backgroundLayer}>
          <View style={styles.topGlow} />
          <View style={styles.bottomGlow} />
          <View style={styles.gridPattern} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps='handled'
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <Text style={styles.brand}>Towerdesk</Text>
          </View>

          <View style={styles.heroSection}>
            <Text style={styles.heroEyebrow}>Access Management</Text>
            <Text style={styles.heroTitle}>
              Welcome to{'\n'}Towerdesk
            </Text>
            <Text style={styles.heroSubtitle}>
              The architectural hub for your property operations.
            </Text>

            <View style={styles.heroAccentCard}>
              <View style={styles.heroAccentGlow} />
              <Ionicons name='business-outline' size={28} color={P.primary} />
              <Text style={styles.heroAccentText}>
                Resident, management, and workforce access from one polished gateway.
              </Text>
            </View>
          </View>

          <View style={styles.cardWrap}>
            <View style={styles.cardShadowLayer} />
            <View style={styles.card}>
              <View style={styles.cardHighlight} />

              <View style={styles.formSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Work Email</Text>
                  <View
                    style={[
                      styles.inputShell,
                      focusedField === 'email' && styles.inputShellFocused,
                      errors.email && styles.inputShellError,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder='name@company.com'
                      placeholderTextColor='#96A2A7'
                      value={formData.email}
                      onChangeText={(text) => updateFormData('email', text)}
                      keyboardType='email-address'
                      textContentType='emailAddress'
                      autoCapitalize='none'
                      autoCorrect={false}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <View
                      style={[
                        styles.inputUnderline,
                        focusedField === 'email' && styles.inputUnderlineActive,
                        errors.email && styles.inputUnderlineError,
                      ]}
                    />
                  </View>
                  {errors.email ? (
                    <View style={styles.errorRow}>
                      <Ionicons name='alert-circle' size={14} color={P.error} />
                      <Text style={styles.errorText}>{errors.email}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.passwordLabelRow}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TouchableOpacity
                      onPress={handleForgotPassword}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.inlineLink}>Forgot Password?</Text>
                    </TouchableOpacity>
                  </View>
                  <View
                    style={[
                      styles.inputShell,
                      focusedField === 'password' && styles.inputShellFocused,
                      errors.password && styles.inputShellError,
                    ]}
                  >
                    <TextInput
                      style={[styles.input, styles.passwordInput]}
                      placeholder='........'
                      placeholderTextColor='#96A2A7'
                      value={formData.password}
                      onChangeText={(text) => updateFormData('password', text)}
                      secureTextEntry={!showPassword}
                      textContentType='password'
                      autoCapitalize='none'
                      autoCorrect={false}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword((prev) => !prev)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={P.soft}
                      />
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.inputUnderline,
                        focusedField === 'password' && styles.inputUnderlineActive,
                        errors.password && styles.inputUnderlineError,
                      ]}
                    />
                  </View>
                  {errors.password ? (
                    <View style={styles.errorRow}>
                      <Ionicons name='alert-circle' size={14} color={P.error} />
                      <Text style={styles.errorText}>{errors.password}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                activeOpacity={0.9}
                style={styles.submitWrap}
              >
                <LinearGradient
                  colors={[P.primary, P.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitButton}
                >
                  <Text style={styles.submitButtonText}>Sign In</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>Or continue with</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={styles.socialButton}
                  activeOpacity={0.85}
                  onPress={() => Alert.alert('Google', 'Social login is not available yet.')}
                >
                  <Ionicons name='logo-google' size={15} color={P.text} />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialButton}
                  activeOpacity={0.85}
                  onPress={() => Alert.alert('Apple', 'Social login is not available yet.')}
                >
                  <Ionicons name='logo-apple' size={15} color={P.text} />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.demoBadge}>
                <Ionicons name='information-circle-outline' size={15} color={P.warningText} />
                <Text style={styles.demoText}>Demo version with mock-friendly data flows</Text>
              </View>

              <TouchableOpacity
                style={styles.clearCacheButton}
                onPress={handleClearCache}
                activeOpacity={0.85}
              >
                <Ionicons name='refresh-outline' size={16} color={P.muted} />
                <Text style={styles.clearCacheText}>Clear cached users</Text>
              </TouchableOpacity>

              <Text style={styles.contactLine}>
                Don&apos;t have an account?{' '}
                <Text style={styles.contactLineStrong}>Contact Management</Text>
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerCopyright}>
              © 2024 Towerdesk. All rights reserved.
            </Text>
            <View style={styles.footerLinks}>
              <Pressable onPress={() => handleInfoLink('Privacy Policy')}>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </Pressable>
              <Pressable onPress={() => handleInfoLink('Terms of Service')}>
                <Text style={styles.footerLink}>Terms of Service</Text>
              </Pressable>
              <Pressable onPress={() => handleInfoLink('Contact Support')}>
                <Text style={styles.footerLink}>Contact Support</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenEntrance>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    top: -120,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(77, 97, 105, 0.09)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -100,
    left: -90,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(208, 230, 239, 0.8)',
  },
  gridPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 30,
  },
  header: {
    paddingTop: 8,
  },
  brand: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: P.text,
  },
  heroSection: {
    marginTop: 34,
    marginBottom: 28,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.3,
    textTransform: 'uppercase',
    color: P.muted,
  },
  heroTitle: {
    marginTop: 12,
    fontSize: 42,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1.9,
    color: P.text,
  },
  heroSubtitle: {
    marginTop: 16,
    maxWidth: 250,
    fontSize: 12,
    lineHeight: 19,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: P.muted,
  },
  heroAccentCard: {
    marginTop: 24,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.55)',
    padding: 18,
    overflow: 'hidden',
  },
  heroAccentGlow: {
    position: 'absolute',
    right: -24,
    top: -10,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(77, 97, 105, 0.08)',
  },
  heroAccentText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: P.muted,
    maxWidth: 250,
  },
  cardWrap: {
    position: 'relative',
  },
  cardShadowLayer: {
    position: 'absolute',
    top: 16,
    right: 0,
    bottom: -10,
    left: 16,
    borderRadius: 32,
    backgroundColor: 'rgba(241, 244, 246, 0.88)',
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 1,
    shadowRadius: 34,
    elevation: 6,
  },
  cardHighlight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 120,
    height: 120,
    borderBottomLeftRadius: 120,
    backgroundColor: 'rgba(77, 97, 105, 0.06)',
  },
  formSection: {
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    paddingHorizontal: 2,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: P.muted,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  inlineLink: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: P.primary,
  },
  inputShell: {
    position: 'relative',
    borderRadius: 18,
    backgroundColor: P.surfaceHigh,
    overflow: 'hidden',
  },
  inputShellFocused: {
    backgroundColor: P.surface,
  },
  inputShellError: {
    backgroundColor: '#FDECEC',
  },
  input: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: P.text,
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  inputUnderline: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: 2,
    backgroundColor: 'transparent',
  },
  inputUnderlineActive: {
    backgroundColor: P.primary,
  },
  inputUnderlineError: {
    backgroundColor: P.error,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: P.error,
  },
  submitWrap: {
    marginTop: 26,
  },
  submitButton: {
    minHeight: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(77, 97, 105, 0.32)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#EEF9FF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 18,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E1EAEC',
  },
  dividerText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: '#96A2A7',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  socialButtonText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: P.text,
  },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: P.warningBg,
  },
  demoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: P.warningText,
    fontWeight: '600',
  },
  clearCacheButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clearCacheText: {
    fontSize: 12,
    fontWeight: '700',
    color: P.muted,
  },
  contactLine: {
    marginTop: 20,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: P.muted,
  },
  contactLineStrong: {
    color: P.primary,
    fontWeight: '800',
  },
  footer: {
    marginTop: 32,
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 8,
  },
  footerCopyright: {
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: P.soft,
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  footerLink: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: P.soft,
  },
});
