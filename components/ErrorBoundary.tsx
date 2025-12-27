import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { recordCrash } from '../lib/utils/crashReporter';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: React.ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the app.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <ErrorBoundary fallback={(error, errorInfo, reset) => (
 *   <CustomErrorScreen error={error} onReset={reset} />
 * )}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console for development
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error component stack:', errorInfo.componentStack);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    void recordCrash(error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you would send this to an error reporting service:
    // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.resetError
        );
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 * Displayed when an error is caught and no custom fallback is provided
 */
interface FallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  onReset: () => void;
}

function DefaultErrorFallback({ error, errorInfo, onReset }: FallbackProps) {
  const isDevelopment = __DEV__;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
        </View>

        {/* Error Title */}
        <Text style={styles.title}>Oops! Something went wrong</Text>

        {/* User-friendly message */}
        <Text style={styles.message}>
          We apologize for the inconvenience. The app encountered an unexpected error.
        </Text>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onReset}
          accessibilityLabel="Try again"
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>

        {/* Development Mode: Show Error Details */}
        {isDevelopment && (
          <View style={styles.errorDetailsContainer}>
            <Text style={styles.detailsTitle}>Error Details (Dev Mode)</Text>

            <View style={styles.errorBox}>
              <Text style={styles.errorType}>{error.name}</Text>
              <Text style={styles.errorMessage}>{error.message}</Text>

              {error.stack && (
                <ScrollView
                  style={styles.stackTrace}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={true}
                >
                  <Text style={styles.stackTraceText}>{error.stack}</Text>
                </ScrollView>
              )}
            </View>

            {errorInfo?.componentStack && (
              <View style={styles.errorBox}>
                <Text style={styles.errorType}>Component Stack</Text>
                <ScrollView
                  style={styles.stackTrace}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={true}
                >
                  <Text style={styles.stackTraceText}>
                    {errorInfo.componentStack}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Help Text */}
        <Text style={styles.helpText}>
          If this problem persists, please contact support.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7034FF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorDetailsContainer: {
    width: '100%',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: '#B91C1C',
    marginBottom: 8,
    fontWeight: '600',
  },
  stackTrace: {
    maxHeight: 150,
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
  },
  stackTraceText: {
    fontSize: 11,
    color: '#7F1D1D',
    fontFamily: 'monospace',
  },
  helpText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
});
