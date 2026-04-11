import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useMessaging } from "../../lib/context/messaging-context";
import { useAuth } from "../../lib/context/auth-context";
import type {
  ConversationMessage,
  ConversationParticipant,
} from "../../lib/types";
import { RESIDENT_HISTORY_UNAVAILABLE_MESSAGE } from "../../lib/utils/resident-history-access";
import {
  getTenantConversationDisplayName,
  getTenantMessageSenderName,
  shouldHideTenantParticipantDetails,
} from "../../lib/utils/tenant-messaging-privacy";

const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#34474D",
  primarySoft: "#DCE8EE",
  accent: "#F8EFE4",
  accentText: "#7A5A2B",
  shadow: "rgba(43, 52, 55, 0.08)",
};

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function shouldShowDateSeparator(
  messages: ConversationMessage[],
  index: number,
): boolean {
  if (index === 0) return true;
  const current = new Date(messages[index].createdAt).toDateString();
  const previous = new Date(messages[index - 1].createdAt).toDateString();
  return current !== previous;
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export default function ConversationDetailModal() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { activeConversation, error, loading, actions } = useMessaging();
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (conversationId) {
      actions.openConversation(conversationId);
    }
    return () => {
      actions.closeConversation();
    };
  }, [conversationId, actions]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (activeConversation?.messages?.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeConversation?.messages?.length]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || !conversationId || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      await actions.sendMessage(conversationId, content);
    } finally {
      setSending(false);
    }
  }, [text, conversationId, sending, actions]);

  const messages = useMemo(
    () => activeConversation?.messages ?? [],
    [activeConversation?.messages],
  );

  const threadParticipants = useMemo(
    () => activeConversation?.participants ?? [],
    [activeConversation?.participants],
  );
  const isTenantUser = currentUser?.role === "tenant";
  const others = useMemo(
    () => threadParticipants.filter((participant) => participant.id !== currentUser?.id),
    [currentUser?.id, threadParticipants],
  );
  const hideParticipantDetails =
    Boolean(
      isTenantUser &&
        activeConversation &&
        shouldHideTenantParticipantDetails(activeConversation, currentUser?.id),
    );
  const participantSummary = hideParticipantDetails
    ? "Management team"
    : others.length > 0
      ? others.map((p) => p.name).join(", ")
      : "No participants yet";
  const conversationTitle = activeConversation?.subject?.trim() || "";
  const isGroupConversation = others.length > 1;
  const participantCount = threadParticipants.length;
  const primaryParticipant = isGroupConversation ? null : others[0] ?? null;
  const primaryParticipantName =
    hideParticipantDetails && activeConversation
      ? getTenantConversationDisplayName(activeConversation, currentUser?.id)
      : primaryParticipant?.name?.trim() || conversationTitle || "Conversation";
  const primaryParticipantAvatar =
    hideParticipantDetails ? null : primaryParticipant?.avatarUrl?.trim() || null;
  const headerTitle = hideParticipantDetails
    ? "Management"
    : conversationTitle
      ? conversationTitle
      : isGroupConversation
        ? `${participantCount} people`
        : primaryParticipantName;
  const headerSubtitle = hideParticipantDetails
    ? conversationTitle || "Management team"
    : conversationTitle
      ? participantSummary
      : isGroupConversation
        ? participantSummary
        : messages.length > 0
          ? "In conversation"
          : "Online";
  const onlineLabel = messages.length > 0 ? "In conversation" : "Online";
  const historyUnavailable =
    error === RESIDENT_HISTORY_UNAVAILABLE_MESSAGE && !loading && !activeConversation;

  const renderParticipantRow = useCallback(
    (participant: ConversationParticipant) => {
      const isCurrentUser = participant.id === currentUser?.id;
      const participantName =
        !isCurrentUser && hideParticipantDetails ? "Management" : participant.name;

      return (
        <View key={participant.id} style={styles.participantRow}>
          {!hideParticipantDetails && participant.avatarUrl ? (
            <Image
              source={{ uri: participant.avatarUrl }}
              style={styles.participantAvatarImage}
            />
          ) : (
            <View style={styles.participantAvatarFallback}>
              <Text style={styles.participantAvatarFallbackText}>
                {getInitials(participantName)}
              </Text>
            </View>
          )}

          <View style={styles.participantCopy}>
            <Text style={styles.participantName}>
              {participantName}
            </Text>
            <Text style={styles.participantMeta}>
              {isCurrentUser ? "You" : hideParticipantDetails ? "Management" : "Participant"}
            </Text>
          </View>

          {isCurrentUser ? (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          ) : null}
        </View>
      );
    },
    [currentUser?.id, hideParticipantDetails],
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: ConversationMessage; index: number }) => {
      const isMe = item.sender.id === currentUser?.id;
      const showDate = shouldShowDateSeparator(messages, index);
      const isOptimistic = item.id.startsWith("optimistic-");
      const senderName =
        activeConversation && isTenantUser
          ? getTenantMessageSenderName(activeConversation, item, currentUser?.id)
          : item.sender.name;

      return (
        <>
          {showDate && (
            <View style={styles.dateSeparator}>
              <Text style={styles.dateSeparatorText}>
                {formatDateSeparator(item.createdAt)}
              </Text>
            </View>
          )}
          <View
            style={[styles.messageBubbleRow, isMe ? styles.myRow : styles.otherRow]}
          >
            {!isMe && (
              !hideParticipantDetails && item.sender.avatarUrl ? (
                <Image
                  source={{ uri: item.sender.avatarUrl }}
                  style={styles.senderAvatarImage}
                />
              ) : (
                <View style={styles.senderAvatar}>
                  <Text style={styles.senderAvatarText}>
                    {getInitials(senderName)}
                  </Text>
                </View>
              )
            )}
            <View style={styles.bubbleWrapper}>
              {!isMe ? <Text style={styles.senderName}>{senderName}</Text> : null}
              {isMe ? (
                <LinearGradient
                  colors={[P.primary, P.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.bubble,
                    styles.myBubble,
                    isOptimistic && styles.optimisticBubble,
                  ]}
                >
                  <Text style={[styles.bubbleText, styles.myBubbleText]}>
                    {item.content}
                  </Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.bubble,
                    styles.otherBubble,
                    isOptimistic && styles.optimisticBubble,
                  ]}
                >
                  <Text style={[styles.bubbleText, styles.otherBubbleText]}>
                    {item.content}
                  </Text>
                </View>
              )}
              <View style={[styles.messageMetaRow, isMe ? styles.myMetaRow : styles.otherMetaRow]}>
                <Text
                  style={[styles.messageTime, isMe ? styles.myTime : styles.otherTime]}
                >
                  {formatMessageTime(item.createdAt)}
                  {isOptimistic ? " ..." : ""}
                </Text>
                {isMe ? (
                  <Ionicons
                    name="checkmark-done"
                    size={12}
                    color={P.primary}
                    style={styles.messageStatusIcon}
                  />
                ) : null}
              </View>
            </View>
          </View>
        </>
      );
    },
    [activeConversation, currentUser?.id, hideParticipantDetails, isTenantUser, messages],
  );

  const keyExtractor = useCallback(
    (item: ConversationMessage) => item.id,
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
        <View style={styles.backgroundDecoration}>
          <View style={styles.backgroundGlowPrimary} />
          <View style={styles.backgroundGlowSecondary} />
        </View>

        <View style={[styles.headerShell, { paddingTop: Math.max(insets.top, 8) }]}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={20} color={P.text} />
            </TouchableOpacity>

            <View style={styles.headerIdentity}>
              <View style={styles.headerAvatarWrap}>
                {isGroupConversation ? (
                  <View style={styles.groupAvatarFallback}>
                    <Ionicons name="people-outline" size={18} color={P.primaryDark} />
                    <Text style={styles.groupAvatarCount}>{participantCount}</Text>
                  </View>
                ) : primaryParticipantAvatar ? (
                  <Image
                    source={{ uri: primaryParticipantAvatar }}
                    style={styles.headerAvatarImage}
                  />
                ) : (
                  <View style={styles.headerAvatarFallback}>
                    <Text style={styles.headerAvatarFallbackText}>
                      {getInitials(primaryParticipantName)}
                    </Text>
                  </View>
                )}
                {!isGroupConversation ? <View style={styles.headerOnlineDot} /> : null}
              </View>

              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {headerTitle}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={isGroupConversation || conversationTitle ? 2 : 1}>
                  {headerSubtitle || onlineLabel}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
              {!isTenantUser ? (
                <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.85}>
                  <Ionicons name="call-outline" size={18} color={P.text} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.headerIconButton}
                activeOpacity={0.85}
                onPress={() => setShowParticipantsModal(true)}
                disabled={threadParticipants.length === 0 || hideParticipantDetails}
              >
                <Ionicons name="information-circle-outline" size={18} color={P.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loading && messages.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={P.primary} />
          </View>
        ) : historyUnavailable ? (
          <View style={styles.centered}>
            <View style={styles.lockedState}>
              <Ionicons name="lock-closed-outline" size={28} color={P.primary} />
              <Text style={styles.lockedTitle}>Resident history unavailable</Text>
              <Text style={styles.lockedText}>
                {RESIDENT_HISTORY_UNAVAILABLE_MESSAGE}
              </Text>
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            contentContainerStyle={[
              styles.messagesList,
              messages.length === 0 && styles.messagesListEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            ListEmptyComponent={
              <View style={styles.emptyMessages}>
                <Text style={styles.emptyMessagesTitle}>No messages yet</Text>
                <Text style={styles.emptyMessagesText}>
                  Start the conversation with a clear first message.
                </Text>
              </View>
            }
          />
        )}

        {!historyUnavailable ? (
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <View style={styles.composerCard}>
              {!isTenantUser ? (
                <TouchableOpacity style={styles.attachButton} activeOpacity={0.85}>
                  <Ionicons name="add-circle" size={20} color={P.muted} />
                </TouchableOpacity>
              ) : null}
              <View style={styles.inputShell}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type a message..."
                  placeholderTextColor="#8A969B"
                  value={text}
                  onChangeText={setText}
                  multiline
                  maxLength={2000}
                  onSubmitEditing={handleSend}
                  blurOnSubmit={false}
                />
                <View style={styles.inputFocusLine} />
              </View>
              <View style={styles.composerActions}>
                {text.trim().length > 0 ? (
                  <Text style={styles.composerHint}>{text.trim().length}/2000</Text>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    (!text.trim() || sending) && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!text.trim() || sending}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={
                      !text.trim() || sending
                        ? ["#AAB7BC", "#8F9DA3"]
                        : [P.primary, P.primaryDark]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sendButtonGradient}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#EEF7FB" />
                    ) : (
                      <Ionicons name="send" size={16} color="#EEF7FB" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}

        <Modal
          animationType="fade"
          transparent
          visible={showParticipantsModal && !hideParticipantDetails}
          onRequestClose={() => setShowParticipantsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.modalBackdrop}
              onPress={() => setShowParticipantsModal(false)}
            />
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalEyebrow}>Thread Participants</Text>
                  <Text style={styles.modalTitle}>
                    {participantCount === 1 ? "1 person" : `${participantCount} people`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowParticipantsModal(false)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="close" size={18} color={P.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Everyone currently visible in this conversation thread.
              </Text>

              <ScrollView
                style={styles.participantsScroll}
                contentContainerStyle={styles.participantsScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {threadParticipants.length > 0 ? (
                  threadParticipants.map(renderParticipantRow)
                ) : (
                  <View style={styles.participantsEmptyState}>
                    <Text style={styles.participantsEmptyTitle}>No participants found</Text>
                    <Text style={styles.participantsEmptyText}>
                      This thread does not expose participant details yet.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
    backgroundColor: P.bg,
  },
  headerShell: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  headerIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 4,
  },
  headerAvatarWrap: {
    position: "relative",
    width: 40,
    height: 40,
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarFallbackText: {
    fontSize: 13,
    fontWeight: "800",
    color: P.primaryDark,
  },
  groupAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: P.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
  },
  groupAvatarCount: {
    fontSize: 11,
    fontWeight: "800",
    color: P.primaryDark,
  },
  headerOnlineDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: P.surfaceLow,
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: P.text,
  },
  headerSubtitle: {
    marginTop: 1,
    fontSize: 11,
    color: P.muted,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  lockedState: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    gap: 12,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: P.text,
    textAlign: "center",
  },
  lockedText: {
    fontSize: 14,
    lineHeight: 21,
    color: P.muted,
    textAlign: "center",
  },
  backgroundDecoration: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
    overflow: "hidden",
  },
  backgroundGlowPrimary: {
    position: "absolute",
    top: -180,
    right: -170,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(77, 97, 105, 0.07)",
  },
  backgroundGlowSecondary: {
    position: "absolute",
    bottom: -180,
    left: -190,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(114, 91, 63, 0.05)",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 124,
    flexGrow: 1,
  },
  messagesListEmpty: {
    justifyContent: "center",
  },
  dateSeparator: {
    alignItems: "center",
    marginBottom: 28,
  },
  dateSeparatorText: {
    fontSize: 10,
    color: P.soft,
    backgroundColor: P.surfaceLow,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  messageBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 22,
    maxWidth: "84%",
  },
  myRow: {
    alignSelf: "flex-end",
  },
  otherRow: {
    alignSelf: "flex-start",
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: P.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginBottom: 6,
  },
  senderAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    marginBottom: 6,
  },
  senderAvatarText: {
    fontSize: 12,
    fontWeight: "800",
    color: P.primaryDark,
  },
  bubbleWrapper: {
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  senderName: {
    display: "none",
  },
  bubble: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  myBubble: {
    maxWidth: 270,
    borderBottomRightRadius: 8,
  },
  otherBubble: {
    backgroundColor: P.surfaceLow,
    borderBottomLeftRadius: 8,
  },
  optimisticBubble: {
    opacity: 0.7,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 23,
  },
  myBubbleText: {
    color: "#EEF7FB",
  },
  otherBubbleText: {
    color: P.text,
  },
  messageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  myMetaRow: {
    alignSelf: "flex-end",
  },
  otherMetaRow: {
    alignSelf: "flex-start",
  },
  messageTime: {
    fontSize: 10,
    fontWeight: "500",
  },
  myTime: {
    color: P.soft,
    textAlign: "right",
  },
  otherTime: {
    color: P.soft,
  },
  messageStatusIcon: {
    marginTop: 1,
  },
  emptyMessages: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 44,
    paddingHorizontal: 24,
  },
  emptyMessagesTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: P.text,
  },
  emptyMessagesText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: P.muted,
    textAlign: "center",
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 0,
    backgroundColor: "transparent",
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  composerCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 28,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  inputShell: {
    flex: 1,
    position: "relative",
    backgroundColor: P.surfaceLow,
    borderRadius: 999,
    minHeight: 46,
    justifyContent: "center",
  },
  textInput: {
    minHeight: 46,
    maxHeight: 104,
    paddingHorizontal: 18,
    paddingVertical: 11,
    fontSize: 15,
    lineHeight: 21,
    color: P.text,
  },
  inputFocusLine: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 6,
    height: 2,
    backgroundColor: P.primary,
    opacity: 0,
  },
  composerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
  },
  composerHint: {
    fontSize: 10,
    fontWeight: "700",
    color: P.soft,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    borderRadius: 22,
    overflow: "hidden",
  },
  sendButtonDisabled: {
    opacity: 0.9,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(16, 24, 28, 0.34)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalSheet: {
    backgroundColor: P.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    minHeight: 260,
    maxHeight: "68%",
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: P.border,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  modalHeaderCopy: {
    flex: 1,
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: P.primary,
  },
  modalTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "800",
    color: P.text,
  },
  modalSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: P.muted,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.surfaceLow,
  },
  participantsScroll: {
    marginTop: 18,
  },
  participantsScrollContent: {
    paddingBottom: 8,
    gap: 10,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
  },
  participantAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  participantAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: P.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  participantAvatarFallbackText: {
    fontSize: 14,
    fontWeight: "800",
    color: P.primaryDark,
  },
  participantCopy: {
    flex: 1,
    minWidth: 0,
  },
  participantName: {
    fontSize: 15,
    fontWeight: "800",
    color: P.text,
  },
  participantMeta: {
    marginTop: 4,
    fontSize: 12,
    color: P.muted,
  },
  youBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: P.primarySoft,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: P.primaryDark,
  },
  participantsEmptyState: {
    paddingVertical: 28,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  participantsEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: P.text,
  },
  participantsEmptyText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: P.muted,
    textAlign: "center",
  },
});
