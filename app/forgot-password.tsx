import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenEntrance } from '../components/ui/ScreenEntrance';
import { apiService } from '../lib/services/api';
import { getUserErrorMessage } from '../lib/services/api/errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const P = {
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceLow: '#F1F4F6',
  border: '#D9E0E4',
  text: '#2B3437',
  muted: '#667176',
  soft: '#7A8488',
  primary: '#4D6169',
  primaryDark: '#34474D',
  primarySoft: '#D6E4E8',
  infoBg: '#E7EEF9',
  infoText: '#3C5A8C',
  dangerBg: '#FCE3E0',
  dangerText: '#B24A41',
};

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Email is required');
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Enter a valid email address');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiService.forgotPassword({ email: normalizedEmail });
      router.replace(
        `/reset-password?email=${encodeURIComponent(normalizedEmail)}` as any,
      );
    } catch (requestError) {
      setError(getUserErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.85}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={18} color={P.primary} />
              <Text style={styles.backText}>Back to sign in</Text>
            </TouchableOpacity>

            <View style={styles.heroCard}>
              <LinearGradient
                colors={[P.primary, P.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroIconWrap}
              >
                <Ionicons name="mail-open-outline" size={22} color={P.surface} />
              </LinearGradient>

              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Tenant Access</Text>
                <Text style={styles.heroTitle}>Reset your password</Text>
                <Text style={styles.heroSubtitle}>
                  Enter the email tied to your resident account and we&apos;ll move
                  you to the reset flow.
                </Text>
              </View>

              <View style={styles.infoPill}>
                <Ionicons name="shield-checkmark-outline" size={14} color={P.infoText} />
                <Text style={styles.infoPillText}>
                  Keep the same work email you use for Towerdesk sign in.
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>Verification</Text>
                <Text style={styles.sectionTitle}>Email confirmation</Text>
              </View>

              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputShell,
                  isFocused && styles.inputShellFocused,
                  error && styles.inputShellError,
                ]}
              >
                <Ionicons name="mail-outline" size={18} color={P.soft} />
                <TextInput
                  style={styles.input}
                  placeholder="resident@example.com"
                  placeholderTextColor={P.soft}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (error) {
                      setError(null);
                    }
                  }}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={16} color={P.dangerText} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : (
                <Text style={styles.helperText}>
                  We&apos;ll use this email to verify your account and continue to the
                  reset step.
                </Text>
              )}

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                activeOpacity={0.9}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[P.primary, P.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color={P.surface} />
                  ) : (
                    <>
                      <Ionicons name="paper-plane-outline" size={18} color={P.surface} />
                      <Text style={styles.submitText}>Continue to Reset</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    marginBottom: 18,
  },
  backText: {
    fontSize: 13,
    fontWeight: '700',
    color: P.primary,
  },
  heroCard: {
    backgroundColor: P.surface,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: P.border,
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    marginTop: 16,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: P.soft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: P.text,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
  },
  infoPill: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.infoBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoPillText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: P.infoText,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: P.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: P.border,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: P.soft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: P.text,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: P.soft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputShellFocused: {
    backgroundColor: P.surface,
    borderColor: P.primary,
  },
  inputShellError: {
    borderColor: P.dangerText,
    backgroundColor: '#FFF5F4',
  },
  input: {
    flex: 1,
    minHeight: 54,
    fontSize: 15,
    color: P.text,
  },
  helperText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: P.soft,
  },
  errorBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: P.dangerBg,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: P.dangerText,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 18,
    borderRadius: 18,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: P.surface,
    fontSize: 15,
    fontWeight: '700',
  },
});
