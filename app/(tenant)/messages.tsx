import React, { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../lib/context/auth-context";
import { useMessaging } from "../../lib/context/messaging-context";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import type { Conversation } from "../../lib/types";

const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  surfaceMuted: "#E8EDF0",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#34474D",
  primarySoft: "#DCE8EE",
  accent: "#F8EFE4",
  accentText: "#7A5A2B",
  warningBg: "#FDF1DB",
  warningText: "#9A5B00",
  shadow: "rgba(43, 52, 55, 0.08)",
};

type MessageFilter = "all" | "unread" | "staff" | "management";
type ConversationCategory = Exclude<MessageFilter, "all" | "unread"> | "resident";

type ConversationListItem = {
  conversation: Conversation;
  avatarColors: { bg: string; text: string };
  avatarLetter: string;
  category: ConversationCategory;
  contextLabel: string;
  displayName: string;
  preview: string;
  searchableText: string;
  time: string;
  timeLabel: string;
  unread: boolean;
  unreadCountLabel: string;
};

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
  return conversation.participants.filter((participant) => participant.id !== currentUserId);
}

function inferConversationCategory(
  conversation: Conversation,
  displayName: string,
  preview: string,
): Exclude<MessageFilter, "all" | "unread"> | "resident" {
  const searchable = `${displayName} ${conversation.subject ?? ""} ${preview}`.toLowerCase();
  const managementKeywords = [
    "management",
    "operations",
    "admin",
    "leasing",
    "accounts",
    "finance",
    "office",
  ];
  const staffKeywords = [
    "maintenance",
    "concierge",
    "security",
    "support",
    "technician",
    "service",
    "staff",
    "helpdesk",
  ];

  if (managementKeywords.some((keyword) => searchable.includes(keyword))) {
    return "management";
  }
  if (staffKeywords.some((keyword) => searchable.includes(keyword))) {
    return "staff";
  }
  return "resident";
}

function avatarPalette(seed: string) {
  const variants = [
    { bg: "#DCE8EE", text: "#41555C" },
    { bg: "#E7EEF9", text: "#3C5A8C" },
    { bg: "#F8EFE4", text: "#7A5A2B" },
    { bg: "#E4F4EA", text: "#25674A" },
  ];
  const code = seed
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return variants[code % variants.length];
}

function getConversationMeta(conversation: Conversation, currentUserId?: string) {
  const others = getOtherParticipants(conversation, currentUserId);
  const displayName =
    others.length > 0
      ? others.map((participant) => participant.name).join(", ")
      : conversation.subject || "Conversation";
  const preview = conversation.lastMessage?.content || conversation.subject || "No messages yet";
  const time = conversation.lastMessage?.createdAt || conversation.updatedAt;
  const unread = conversation.unreadCount > 0;
  const avatarLetter = (others[0]?.name || displayName || "?").charAt(0).toUpperCase();
  const category = inferConversationCategory(conversation, displayName, preview);
  const contextLabel =
    conversation.subject?.trim() ||
    (category === "management"
      ? "Management"
      : category === "staff"
        ? "Staff"
        : others.length > 1
          ? `${others.length} participants`
          : "Direct message");

  return {
    avatarLetter,
    category,
    contextLabel,
    displayName,
    preview,
    time,
    unread,
  };
}

function buildConversationListItem(
  conversation: Conversation,
  currentUserId?: string,
): ConversationListItem {
  const meta = getConversationMeta(conversation, currentUserId);

  return {
    conversation,
    avatarColors: avatarPalette(meta.displayName),
    avatarLetter: meta.avatarLetter,
    category: meta.category,
    contextLabel: meta.contextLabel,
    displayName: meta.displayName,
    preview: meta.preview,
    searchableText: `${meta.displayName} ${meta.preview} ${meta.contextLabel}`.toLowerCase(),
    time: meta.time,
    timeLabel: formatTime(meta.time),
    unread: meta.unread,
    unreadCountLabel: conversation.unreadCount > 99 ? "99+" : String(conversation.unreadCount),
  };
}

function FilterChip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ConversationRow({
  item,
}: {
  item: ConversationListItem;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.rowCard, item.unread && styles.rowCardUnread]}
      onPress={() =>
        router.push({
          pathname: "/(modals)/conversation-detail",
          params: { conversationId: item.conversation.id },
        } as any)
      }
    >
      <View style={styles.rowAccent}>
        {item.unread ? <View style={styles.unreadRail} /> : null}
        <View style={[styles.avatar, { backgroundColor: item.avatarColors.bg }]}>
          <Text style={[styles.avatarText, { color: item.avatarColors.text }]}>
            {item.avatarLetter}
          </Text>
        </View>
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, item.unread && styles.nameUnread]} numberOfLines={1}>
            {item.displayName}
          </Text>
          <Text style={[styles.time, item.unread && styles.timeUnread]}>{item.timeLabel}</Text>
        </View>

        <View style={styles.metaLine}>
          <Text style={styles.metaText} numberOfLines={1}>
            {item.contextLabel}
          </Text>
          {item.category === "management" ? (
            <View style={[styles.metaBadge, styles.metaBadgePrimary]}>
              <Text style={[styles.metaBadgeText, styles.metaBadgeTextPrimary]}>Management</Text>
            </View>
          ) : null}
          {item.category === "staff" ? (
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>Staff</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.preview, item.unread && styles.previewUnread]} numberOfLines={2}>
          {item.preview}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {item.unread ? (
          <>
            <View style={styles.unreadDot} />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCountLabel}</Text>
            </View>
          </>
        ) : (
          <Ionicons name="chevron-forward" size={18} color="#93A1A7" />
        )}
      </View>
    </TouchableOpacity>
  );
}

const MemoizedConversationRow = React.memo(ConversationRow);

export default function MessagesScreen() {
  const { conversations, loading, actions } = useMessaging();
  const { currentUser } = useAuth();
  const {
    canCreateManagementConversation,
    isFormerResident,
    statusMessage,
  } = useResidentTenancy({
    enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id),
  });
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<MessageFilter>("all");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await actions.fetchConversations();
    setRefreshing(false);
  }, [actions]);

  const conversationItems = useMemo(
    () => conversations.map((conversation) => buildConversationListItem(conversation, currentUser?.id)),
    [conversations, currentUser?.id],
  );

  const summary = useMemo(() => {
    const unreadThreads = conversationItems.filter((conversation) => conversation.unread).length;
    return {
      total: conversationItems.length,
      unread: unreadThreads,
    };
  }, [conversationItems]);

  const filteredConversations = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();

    return conversationItems.filter((conversation) => {
      const matchesQuery =
        !query ||
        conversation.searchableText.includes(query);

      if (!matchesQuery) return false;
      if (activeFilter === "all") return true;
      if (activeFilter === "unread") return conversation.unread;
      return conversation.category === activeFilter;
    });
  }, [activeFilter, conversationItems, deferredSearchQuery]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => (
      <MemoizedConversationRow item={item} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: ConversationListItem) => item.conversation.id, []);

  const header = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconButton}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={22} color={P.text} />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>Resident inbox and ongoing conversations</Text>
          </View>

          <View style={styles.headerActionSlot}>
            {summary.unread > 0 ? (
              <View style={styles.headerPill}>
                <Text style={styles.headerPillText}>{summary.unread} unread</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Conversation overview</Text>
            <Text style={styles.heroTitle}>A quieter inbox for building support</Text>
            <Text style={styles.heroSubtitle}>
              Search messages, scan unread threads, and jump back into the conversations that still need attention.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{summary.total}</Text>
              <Text style={styles.heroStatLabel}>Total threads</Text>
            </View>
            <LinearGradient
              colors={[P.primary, P.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroStatCardPrimary}
            >
              <Text style={styles.heroStatValuePrimary}>{summary.unread}</Text>
              <Text style={styles.heroStatLabelPrimary}>Unread now</Text>
            </LinearGradient>
          </View>
        </View>

        {isFormerResident ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={P.warningText} />
            <Text style={styles.infoBannerText}>{statusMessage}</Text>
          </View>
        ) : null}

        <View style={styles.searchShell}>
          <Ionicons name="search" size={18} color={P.soft} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations"
            placeholderTextColor="#8A969B"
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearSearchButton}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={16} color={P.soft} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <FilterChip active={activeFilter === "all"} label="All" onPress={() => setActiveFilter("all")} />
          <FilterChip
            active={activeFilter === "unread"}
            label="Unread"
            onPress={() => setActiveFilter("unread")}
          />
          <FilterChip active={activeFilter === "staff"} label="Staff" onPress={() => setActiveFilter("staff")} />
          <FilterChip
            active={activeFilter === "management"}
            label="Management"
            onPress={() => setActiveFilter("management")}
          />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {filteredConversations.length === conversationItems.length && !searchQuery
              ? "All conversations"
              : `${filteredConversations.length} result${filteredConversations.length === 1 ? "" : "s"}`}
          </Text>
          <Text style={styles.sectionMeta}>Pull to refresh</Text>
        </View>
      </View>
    ),
    [
      activeFilter,
      conversationItems.length,
      filteredConversations.length,
      isFormerResident,
      searchQuery,
      statusMessage,
      summary.total,
      summary.unread,
    ],
  );

  if (loading && conversations.length === 0) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top + 24 }]}>
        <ActivityIndicator size="large" color={P.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={filteredConversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        windowSize={8}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: tabBarHeight + (canCreateManagementConversation ? 96 : 32),
          },
          filteredConversations.length === 0 && styles.emptyListContent,
        ]}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.rowSpacer} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={P.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery || activeFilter !== "all" ? "No conversations match this view" : "No conversations yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || activeFilter !== "all"
                ? "Try a broader search or switch back to a different filter."
                : canCreateManagementConversation
                  ? "Start a new conversation to reach staff or management."
                  : "Existing conversations remain available here for follow-up and history."}
            </Text>
            {canCreateManagementConversation && !searchQuery && activeFilter === "all" ? (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push("/(modals)/new-conversation" as any)}
                activeOpacity={0.9}
              >
                <Text style={styles.emptyButtonText}>New Message</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      {canCreateManagementConversation ? (
        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.fabWrap, { bottom: tabBarHeight + 24 }]}
          onPress={() => router.push("/(modals)/new-conversation" as any)}
        >
          <LinearGradient
            colors={[P.primary, P.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#EEF7FB" />
          </LinearGradient>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: P.bg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: P.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  headerBlock: {
    paddingBottom: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
  },
  headerCopy: {
    flex: 1,
    marginLeft: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: P.text,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: P.muted,
  },
  headerActionSlot: {
    minWidth: 72,
    alignItems: "flex-end",
  },
  headerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
  },
  headerPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.primary,
  },
  heroCard: {
    backgroundColor: P.surface,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: P.border,
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  heroCopy: {
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: P.primary,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: P.text,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: P.muted,
  },
  heroStats: {
    flexDirection: "row",
    marginTop: 18,
    gap: 12,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: P.surfaceLow,
  },
  heroStatCardPrimary: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroStatValue: {
    fontSize: 26,
    fontWeight: "800",
    color: P.text,
  },
  heroStatValuePrimary: {
    fontSize: 26,
    fontWeight: "800",
    color: "#EEF7FB",
  },
  heroStatLabel: {
    marginTop: 4,
    fontSize: 13,
    color: P.muted,
  },
  heroStatLabelPrimary: {
    marginTop: 4,
    fontSize: 13,
    color: "#DCE8EE",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: P.warningBg,
    borderWidth: 1,
    borderColor: "#EBC98C",
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: P.warningText,
  },
  searchShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: P.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: P.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: P.text,
    paddingVertical: 0,
  },
  clearSearchButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.surfaceLow,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    marginBottom: 18,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: P.surfaceMuted,
  },
  filterChipActive: {
    backgroundColor: P.text,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.muted,
  },
  filterChipTextActive: {
    color: "#F8F9FA",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: P.text,
  },
  sectionMeta: {
    fontSize: 12,
    color: P.soft,
  },
  rowSpacer: {
    height: 12,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: P.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowCardUnread: {
    borderColor: "#C4D5DD",
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 3,
  },
  rowAccent: {
    position: "relative",
    justifyContent: "center",
  },
  unreadRail: {
    position: "absolute",
    left: -16,
    top: -16,
    bottom: -16,
    width: 4,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    backgroundColor: P.primary,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  rowContent: {
    flex: 1,
    gap: 6,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: P.text,
  },
  nameUnread: {
    color: "#1F2A2E",
  },
  time: {
    fontSize: 12,
    fontWeight: "600",
    color: P.soft,
  },
  timeUnread: {
    color: P.primary,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 12,
    color: P.soft,
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
  },
  metaBadgePrimary: {
    backgroundColor: P.primarySoft,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: P.muted,
  },
  metaBadgeTextPrimary: {
    color: P.primary,
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
    color: P.muted,
  },
  previewUnread: {
    color: "#48565B",
  },
  rowRight: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minWidth: 32,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: P.primary,
  },
  badge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.text,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#F8F9FA",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 40,
    borderRadius: 28,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.primarySoft,
  },
  emptyTitle: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "800",
    color: P.text,
    textAlign: "center",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: P.muted,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: P.text,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#F8F9FA",
  },
  fabWrap: {
    position: "absolute",
    right: 22,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
});
