import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useAuth } from '../../lib/context/auth-context';
import { ProviderPortalContextProvider } from '../../lib/context/provider-portal-context';
import { useProviderPortalRuntime } from '../../lib/hooks/provider/useProviderPortalRuntime';
import { useProviderUnauthorized } from '../../lib/hooks/provider/useProviderUnauthorized';
import { PROVIDER_PALETTE as P } from '../../lib/utils/provider-portal';

function ProviderAccessState({
  title,
  body,
  icon,
  actionLabel,
  onActionPress,
  secondaryLabel,
  onSecondaryPress,
}: {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  actionLabel: string;
  onActionPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.stateContainer}>
        <View style={styles.stateCard}>
          <View style={styles.stateIconWrap}>
            <Ionicons name={icon} size={28} color={P.primary} />
          </View>
          <Text style={styles.stateTitle}>{title}</Text>
          <Text style={styles.stateBody}>{body}</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.9}
            onPress={onActionPress}
          >
            <Text style={styles.primaryButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
          {secondaryLabel && onSecondaryPress ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.85}
              onPress={onSecondaryPress}
            >
              <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function ServiceProviderLayout() {
  const { isAuthenticated, currentUser, actions } = useAuth();
  const handleUnauthorized = useProviderUnauthorized();
  const runtime = useProviderPortalRuntime(
    Boolean(isAuthenticated && currentUser?.role === 'service_provider'),
  );

  useEffect(() => {
    if (
      isAuthenticated &&
      currentUser &&
      currentUser.role !== 'service_provider'
    ) {
      router.replace('/' as any);
    }
  }, [currentUser, isAuthenticated]);

  useEffect(() => {
    if (!runtime.error) {
      return;
    }

    void handleUnauthorized(runtime.error);
  }, [handleUnauthorized, runtime.error]);

  if (!isAuthenticated || !currentUser || currentUser.role !== 'service_provider') {
    return null;
  }

  const handleSignOut = () => {
    void actions.logout().then(() => router.replace('/auth' as any));
  };

  if (runtime.status === 'idle' || runtime.status === 'loading') {
    return <LoadingScreen message="Resolving provider access..." useLottie={false} />;
  }

  if (runtime.status === 'error') {
    return (
      <ProviderAccessState
        title="Unable to load provider access"
        body={
          runtime.errorMessage ||
          'The provider workspace could not resolve its runtime context.'
        }
        icon="alert-circle-outline"
        actionLabel="Retry"
        onActionPress={() => void runtime.refresh()}
        secondaryLabel="Sign Out"
        onSecondaryPress={handleSignOut}
      />
    );
  }

  if (runtime.status === 'no_access') {
    return (
      <ProviderAccessState
        title="No provider access"
        body="This account does not have any active provider memberships, so the worker portal cannot open."
        icon="lock-closed-outline"
        actionLabel="Retry Access"
        onActionPress={() => void runtime.refresh()}
        secondaryLabel="Sign Out"
        onSecondaryPress={handleSignOut}
      />
    );
  }

  if (runtime.status === 'ambiguous' || !runtime.runtime || !runtime.activeProvider) {
    return (
      <ProviderAccessState
        title="Provider access is ambiguous"
        body="This account has multiple active provider memberships. The mobile worker portal currently requires one active provider context before detail and write flows can open safely."
        icon="git-branch-outline"
        actionLabel="Retry Access"
        onActionPress={() => void runtime.refresh()}
        secondaryLabel="Sign Out"
        onSecondaryPress={handleSignOut}
      />
    );
  }

  return (
    <ProviderPortalContextProvider
      value={{
        runtime: runtime.runtime,
        activeProvider: runtime.activeProvider,
        refreshRuntime: runtime.refresh,
      }}
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="requests/[requestId]" />
      </Stack>
    </ProviderPortalContextProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: P.bg,
  },
  stateContainer: {
    flex: 1,
    paddingHorizontal: 22,
    justifyContent: 'center',
  },
  stateCard: {
    backgroundColor: P.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: 'center',
  },
  stateIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: P.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    marginTop: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: P.text,
    textAlign: 'center',
  },
  stateBody: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: P.muted,
    textAlign: 'center',
  },
  primaryButton: {
    minWidth: 180,
    marginTop: 20,
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: P.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    minWidth: 180,
    marginTop: 10,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: P.text,
  },
});
