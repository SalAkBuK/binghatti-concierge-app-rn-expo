import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useMessaging } from "../../lib/context/messaging-context";
import type { Conversation } from "../../lib/types";

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getOtherParticipants(conversation: Conversation, currentUserId?: string) {
  return conversation.participants.filter((p) => p.id !== currentUserId);
}

interface ConversationsTabProps {
  userId?: string;
  onRefresh?: () => void;
}

function ConversationRow({
  conversation,
  currentUserId,
  index,
}: {
  conversation: Conversation;
  currentUserId?: string;
  index: number;
}) {
  const others = getOtherParticipants(conversation, currentUserId);
  const displayName =
    others.length > 0
      ? others.map((p) => p.name).join(", ")
      : conversation.subject || "Conversation";
  const avatarLetter = (others[0]?.name || "?").charAt(0).toUpperCase();
  const preview = conversation.lastMessage?.content || conversation.subject || "";
  const time = conversation.lastMessage?.createdAt || conversation.updatedAt;
  const unread = conversation.unreadCount > 0;

  const handlePress = () => {
    router.back();
    setTimeout(() => {
      router.push({
        pathname: "/(modals)/conversation-detail",
        params: { conversationId: conversation.id },
      } as any);
    }, 150);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(250)}>
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={[styles.avatar, unread && styles.avatarUnread]}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>

        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.time, unread && styles.timeUnread]}>{formatTime(time)}</Text>
          </View>
          {conversation.subject ? (
            <Text style={[styles.subject, unread && styles.nameUnread]} numberOfLines={1}>
              {conversation.subject}
            </Text>
          ) : null}
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
            {preview}
          </Text>
        </View>

        {unread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ConversationsTab({ userId, onRefresh }: ConversationsTabProps) {
  const { conversations, loading, actions } = useMessaging();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await actions.fetchConversations();
    onRefresh?.();
    setRefreshing(false);
  }, [actions, onRefresh]);

  const renderItem = useCallback(
    ({ item, index }: { item: Conversation; index: number }) => (
      <ConversationRow conversation={item} currentUserId={userId} index={index} />
    ),
    [userId],
  );

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  const handleNewConversation = () => {
    router.back();
    setTimeout(() => {
      router.push("/(modals)/new-conversation" as any);
    }, 150);
  };

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#336BE3" />
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={[
        styles.list,
        conversations.length === 0 && styles.emptyList,
      ]}
      refreshing={refreshing}
      onRefresh={handleRefresh}
      ListHeaderComponent={
        conversations.length > 0 ? (
          <TouchableOpacity
            style={styles.newConversationButton}
            onPress={handleNewConversation}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={18} color="#336BE3" />
            <Text style={styles.newConversationText}>New Conversation</Text>
          </TouchableOpacity>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={56} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a new conversation to get in touch with staff or management.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={handleNewConversation}
          >
            <Ionicons name="create-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.emptyButtonText}>New Message</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
  },
  newConversationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderStyle: "dashed",
  },
  newConversationText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#336BE3",
    marginLeft: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarUnread: {
    backgroundColor: "#336BE3",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  rowContent: {
    flex: 1,
    marginRight: 8,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
    flex: 1,
    marginRight: 8,
  },
  nameUnread: {
    fontWeight: "700",
    color: "#111827",
  },
  subject: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
    color: "#94A3B8",
  },
  timeUnread: {
    color: "#336BE3",
    fontWeight: "600",
  },
  preview: {
    fontSize: 12,
    color: "#94A3B8",
  },
  previewUnread: {
    color: "#64748B",
  },
  unreadBadge: {
    backgroundColor: "#336BE3",
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#334155",
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 18,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#336BE3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
