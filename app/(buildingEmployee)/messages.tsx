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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useMessaging } from "../../lib/context/messaging-context";
import { useAuth } from "../../lib/context/auth-context";
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

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/(modals)/conversation-detail",
            params: { conversationId: conversation.id },
          } as any)
        }
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
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MessagesScreen() {
  const { conversations, loading, actions } = useMessaging();
  const { currentUser } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await actions.fetchConversations();
    setRefreshing(false);
  }, [actions]);

  const renderItem = useCallback(
    ({ item, index }: { item: Conversation; index: number }) => (
      <ConversationRow conversation={item} currentUserId={currentUser?.id} index={index} />
    ),
    [currentUser?.id],
  );

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.composeButton}
          onPress={() => router.push("/(modals)/new-conversation" as any)}
        >
          <Ionicons name="create-outline" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading && conversations.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabBarHeight + 16 },
            conversations.length === 0 && styles.emptyList,
          ]}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Start a new conversation to communicate with tenants or management.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push("/(modals)/new-conversation" as any)}
              >
                <Text style={styles.emptyButtonText}>New Message</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  composeButton: {
    padding: 4,
  },
  list: {
    paddingTop: 8,
  },
  emptyList: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarUnread: {
    backgroundColor: "#2563EB",
  },
  avatarText: {
    fontSize: 18,
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
    fontSize: 15,
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
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: "#94A3B8",
  },
  timeUnread: {
    color: "#2563EB",
    fontWeight: "600",
  },
  preview: {
    fontSize: 13,
    color: "#94A3B8",
  },
  previewUnread: {
    color: "#64748B",
  },
  badge: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
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
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#334155",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
