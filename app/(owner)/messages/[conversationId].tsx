import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderBar } from '../../../components/ui/HeaderBar';
import { ScreenEntrance } from '../../../components/ui/ScreenEntrance';
import { useAuth } from '../../../lib/context/auth-context';
import { useOwnerUnreadSummary } from '../../../lib/hooks/owner/useOwnerUnreadSummary';
import { useOwnerUnauthorized } from '../../../lib/hooks/owner/useOwnerUnauthorized';
import { ownerPortalApi } from '../../../lib/services/api/owner-portal';
import type { ConversationMessage, OwnerConversationDetail } from '../../../lib/types';
import {
  formatOwnerDateTime,
  getOwnerConversationDisplayName,
  OWNER_PALETTE as P,
} from '../../../lib/utils/owner-portal';

export default function OwnerConversationDetailScreen() {
  const { conversationId, returnTo } = useLocalSearchParams<{
    conversationId?: string;
    returnTo?: string;
  }>();
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const handleUnauthorized = useOwnerUnauthorized();
  const {
    conversationUnreadCount,
    notificationUnreadCount,
    refresh: refreshUnreadSummary,
  } = useOwnerUnreadSummary({
    enabled: currentUser?.role === 'owner',
  });
  const [conversation, setConversation] = useState<OwnerConversationDetail | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const applyMessageToConversation = useCallback(
    (
      currentConversation: OwnerConversationDetail | null,
      message: ConversationMessage,
    ): OwnerConversationDetail | null => {
      if (!currentConversation) {
        return currentConversation;
      }

      return {
        ...currentConversation,
        unreadCount: 0,
        updatedAt: message.createdAt,
        lastMessage: message,
        messages: [...currentConversation.messages, message],
      };
    },
    [],
  );

  const load = useCallback(async () => {
    if (!conversationId) {
      setErrorMessage('Conversation not found.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const detail = await ownerPortalApi.getConversation(conversationId);
      setConversation(detail);
      setErrorMessage(null);

      await ownerPortalApi.markConversationRead(conversationId);
      setConversation((currentConversation) =>
        currentConversation
          ? {
              ...currentConversation,
              unreadCount: 0,
            }
          : currentConversation,
      );
      await refreshUnreadSummary();
    } catch (error) {
      if (await handleUnauthorized(error)) {
        return;
      }

      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status?: unknown }).status
          : undefined;

      setErrorMessage(
        status === 404
          ? 'This conversation is outside the current owner scope.'
          : error instanceof Error
            ? error.message
            : 'Unable to load conversation.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, handleUnauthorized, refreshUnreadSummary]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!conversation) {
      return;
    }

    scrollToBottom();
  }, [conversation, scrollToBottom]);

  const handleSend = useCallback(async () => {
    const trimmedMessage = messageDraft.trim();
    if (!conversationId || !trimmedMessage || !conversation) return;

    const previousConversation = conversation;
    const optimisticMessage: ConversationMessage = {
      id: `owner-optimistic-${Date.now()}`,
      content: trimmedMessage,
      sender: {
        id: currentUser?.id ?? '',
        name: currentUser?.name ?? currentUser?.fullName ?? 'You',
        avatarUrl: null,
      },
      createdAt: new Date().toISOString(),
    };

    setIsSending(true);
    setErrorMessage(null);
    setMessageDraft('');
    setConversation((currentConversation) =>
      applyMessageToConversation(currentConversation, optimisticMessage),
    );
    scrollToBottom();

    try {
      const serverMessage = await ownerPortalApi.sendConversationMessage(
        conversationId,
        trimmedMessage,
      );

      if (serverMessage) {
        setConversation((currentConversation) => {
          if (!currentConversation) {
            return currentConversation;
          }

          return {
            ...currentConversation,
            unreadCount: 0,
            updatedAt: serverMessage.createdAt,
            lastMessage: serverMessage,
            messages: currentConversation.messages.map((message) =>
              message.id === optimisticMessage.id ? serverMessage : message,
            ),
          };
        });
      }
    } catch (error) {
      setConversation(previousConversation);
      setMessageDraft(trimmedMessage);

      if (await handleUnauthorized(error)) {
        return;
      }

      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status?: unknown }).status
          : undefined;

      setErrorMessage(
        status === 404
          ? 'This conversation is outside the current owner scope.'
          : error instanceof Error
            ? error.message
            : 'Unable to send message.',
      );
    } finally {
      setIsSending(false);
    }
  }, [
    applyMessageToConversation,
    conversation,
    conversationId,
    currentUser?.fullName,
    currentUser?.id,
    currentUser?.name,
    handleUnauthorized,
    messageDraft,
    scrollToBottom,
  ]);

  const participantsLabel = useMemo(() => {
    if (!conversation) return '';

    return conversation.participants
      .map((participant) => participant.name)
      .join(', ');
  }, [conversation]);

  const handleBackNavigation = useCallback(() => {
    const fallbackRoute = '/(owner)/messages';
    const destination =
      typeof returnTo === 'string' && returnTo.trim().length > 0
        ? returnTo
        : fallbackRoute;

    router.replace(destination as any);
  }, [returnTo]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          handleBackNavigation();
          return true;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [handleBackNavigation]),
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={P.primary} />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>{errorMessage || 'Conversation not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScreenEntrance>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <HeaderBar
            title={getOwnerConversationDisplayName(conversation, currentUser?.id)}
            subtitle={conversation.buildingName || conversation.orgName || 'Conversation'}
            showBackButton
            hasUnreadNotifications={notificationUnreadCount > 0}
            messagingUnreadCount={conversationUnreadCount}
            notificationRoute="/(modals)/owner-alerts"
            textColor={P.text}
            horizontalPadding={20}
            menuMargin={0}
            notificationMargin={0}
            onBackPress={handleBackNavigation}
          />

          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Participants</Text>
            <Text style={styles.metaValue}>{participantsLabel}</Text>
            {conversation.subject ? (
              <>
                <Text style={[styles.metaLabel, styles.metaLabelSpacing]}>Subject</Text>
                <Text style={styles.metaValue}>{conversation.subject}</Text>
              </>
            ) : null}
          </View>

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={18} color={P.dangerText} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={[
              styles.messagesContent,
              { paddingBottom: 16 + Math.max(insets.bottom, 8) },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            {conversation.messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubble-outline" size={26} color={P.soft} />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>
                  This thread is empty. Send the first message below.
                </Text>
              </View>
            ) : (
              conversation.messages.map((message) => {
                const isCurrentUser = message.sender.id === currentUser?.id;

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      isCurrentUser ? styles.messageBubbleCurrent : styles.messageBubbleOther,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageSender,
                        isCurrentUser && styles.messageSenderCurrent,
                      ]}
                    >
                      {isCurrentUser ? 'You' : message.sender.name}
                    </Text>
                    <Text
                      style={[
                        styles.messageBody,
                        isCurrentUser && styles.messageBodyCurrent,
                      ]}
                    >
                      {message.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageMeta,
                        isCurrentUser && styles.messageMetaCurrent,
                      ]}
                    >
                      {formatOwnerDateTime(message.createdAt)}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View
            style={[
              styles.composerCard,
              { paddingBottom: 12 + Math.max(insets.bottom - 4, 0) },
            ]}
          >
            <View style={styles.composerInputWrap}>
              <Ionicons name="chatbox-ellipses-outline" size={18} color={P.soft} />
              <TextInput
                style={styles.composerInput}
                placeholder="Write a message"
                placeholderTextColor={P.soft}
                value={messageDraft}
                onChangeText={setMessageDraft}
                multiline
                editable={!isSending}
                textAlignVertical="top"
                autoCorrect
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageDraft.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={() => void handleSend()}
              disabled={!messageDraft.trim() || isSending}
              activeOpacity={0.88}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>
                {isSending ? 'Sending' : 'Send'}
              </Text>
            </TouchableOpacity>
          </View>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: P.muted,
  },
  metaCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: P.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.border,
    padding: 16,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: P.soft,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  metaLabelSpacing: {
    marginTop: 12,
  },
  metaValue: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: P.text,
    fontWeight: '600',
  },
  errorCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: P.dangerBg,
  },
  errorText: {
    flex: 1,
    color: P.dangerText,
    fontSize: 13,
    fontWeight: '600',
  },
  messagesScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    gap: 10,
  },
  emptyState: {
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 20,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '700',
    color: P.text,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '88%',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageBubbleCurrent: {
    alignSelf: 'flex-end',
    backgroundColor: P.primary,
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '700',
    color: P.primary,
  },
  messageSenderCurrent: {
    color: 'rgba(255,255,255,0.88)',
  },
  messageBody: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: P.text,
  },
  messageBodyCurrent: {
    color: '#FFFFFF',
  },
  messageMeta: {
    marginTop: 8,
    fontSize: 11,
    color: P.soft,
  },
  messageMetaCurrent: {
    color: 'rgba(255,255,255,0.74)',
  },
  composerCard: {
    margin: 20,
    marginTop: 12,
    backgroundColor: P.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: P.border,
    padding: 12,
  },
  composerInputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
  },
  composerInput: {
    flex: 1,
    minHeight: 46,
    maxHeight: 140,
    fontSize: 14,
    color: P.text,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
  },
  sendButton: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: P.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.55,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
