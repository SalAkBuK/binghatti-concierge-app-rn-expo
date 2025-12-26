import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * ErrorBoundaryTest Component
 *
 * A test component to verify ErrorBoundary works correctly.
 *
 * ⚠️ FOR TESTING ONLY - Remove this component before production build
 *
 * Usage:
 * 1. Import this component in any screen
 * 2. Render it: <ErrorBoundaryTest />
 * 3. Tap "Trigger Error" button
 * 4. Verify ErrorBoundary catches the error and shows fallback UI
 * 5. Tap "Try Again" to reset the error
 * 6. Remove this component when testing is complete
 *
 * Example:
 * ```tsx
 * import { ErrorBoundaryTest } from '@/components/ErrorBoundaryTest';
 *
 * export default function MyScreen() {
 *   return (
 *     <View>
 *       {__DEV__ && <ErrorBoundaryTest />}
 *       <Text>My Screen Content</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function ErrorBoundaryTest() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    // This will trigger the ErrorBoundary
    throw new Error('Test error: ErrorBoundary is working correctly!');
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>🧪 Error Boundary Test</Text>
        <Text style={styles.subtitle}>
          Tap the button below to trigger an error and test the ErrorBoundary
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setShouldThrow(true)}
          accessibilityLabel="Trigger test error"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>💥 Trigger Error</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Note: This component is for testing only.{'\n'}
          Remove before production build.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    margin: 16,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  card: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#92400E',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
