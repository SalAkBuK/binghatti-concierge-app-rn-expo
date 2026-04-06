import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMessaging } from "../../lib/context/messaging-context";
import { useAuth } from "../../lib/context/auth-context";
import type { ConversationMessage } from "../../lib/types";

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

export default function ConversationDetailModal() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const { activeConversation, loading, actions } = useMessaging();
  const { currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
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

  const others = activeConversation
    ? activeConversation.participants.filter((p) => p.id !== currentUser?.id)
    : [];
  const headerTitle =
    activeConversation?.subject ||
    (others.length > 0 ? others.map((p) => p.name).join(", ") : "Conversation");

  const renderMessage = useCallback(
    ({ item, index }: { item: ConversationMessage; index: number }) => {
      const isMe = item.sender.id === currentUser?.id;
      const showDate = shouldShowDateSeparator(messages, index);
      const isOptimistic = item.id.startsWith("optimistic-");

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
              <View style={styles.senderAvatar}>
                <Text style={styles.senderAvatarText}>
                  {(item.sender.name || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.bubbleWrapper}>
              {!isMe && (
                <Text style={styles.senderName}>{item.sender.name}</Text>
              )}
              <View
                style={[
                  styles.bubble,
                  isMe ? styles.myBubble : styles.otherBubble,
                  isOptimistic && styles.optimisticBubble,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    isMe ? styles.myBubbleText : styles.otherBubbleText,
                  ]}
                >
                  {item.content}
                </Text>
              </View>
              <Text
                style={[styles.messageTime, isMe ? styles.myTime : styles.otherTime]}
              >
                {formatMessageTime(item.createdAt)}
                {isOptimistic ? " ..." : ""}
              </Text>
            </View>
          </View>
        </>
      );
    },
    [currentUser?.id, messages],
  );

  const keyExtractor = useCallback(
    (item: ConversationMessage) => item.id,
    [],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          {others.length > 0 && activeConversation?.subject && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {others.map((p) => p.name).join(", ")}
            </Text>
          )}
        </View>
        <View style={{ width: 32 }} />
      </View>

      {/* Messages */}
      {loading && messages.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#336BE3" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>
                No messages yet. Say hello!
              </Text>
            </View>
          }
        />
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#94A3B8"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || sending) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: 12,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: "#94A3B8",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
  },
  messageBubbleRow: {
    flexDirection: "row",
    marginBottom: 8,
    maxWidth: "85%",
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
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginTop: 16,
  },
  senderAvatarText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bubbleWrapper: {
    flexShrink: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myBubble: {
    backgroundColor: "#336BE3",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  optimisticBubble: {
    opacity: 0.7,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myBubbleText: {
    color: "#FFFFFF",
  },
  otherBubbleText: {
    color: "#1E293B",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 3,
  },
  myTime: {
    color: "#94A3B8",
    textAlign: "right",
    marginRight: 4,
  },
  otherTime: {
    color: "#94A3B8",
    marginLeft: 4,
  },
  emptyMessages: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1E293B",
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#336BE3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  sendButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
});
