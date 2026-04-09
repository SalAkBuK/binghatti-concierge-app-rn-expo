import React, { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../lib/context/auth-context";
import { useMessaging } from "../../lib/context/messaging-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { useResidentTenancy } from "../../lib/hooks/useResidentTenancy";
import type { Conversation } from "../../lib/types";
import { filterNotificationsByUser, getUnreadNotificationsCount } from "../../lib/utils/helpers";
import {
  getTenantConversationAvatarLetter,
  getTenantConversationAvatarUrl,
  getTenantConversationContextLabel,
  getTenantConversationDisplayName,
  getTenantLastSenderLabel,
  isTenantManagementConversation,
} from "../../lib/utils/tenant-messaging-privacy";
import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";

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
const CONVERSATIONS_PER_PAGE = 10;

type ConversationListItem = {
  conversation: Conversation;
  avatarColors: { bg: string; text: string };
  avatarLetter: string;
  avatarUrl: string | null;
  category: ConversationCategory;
  categoryLabel: string;
  contextLabel: string;
  displayName: string;
  lastSenderLabel: string | null;
  messageCountLabel: string;
  preview: string;
  searchableText: string;
  time: string;
  timeLabel: string;
  unread: boolean;
  unreadCountLabel: string;
  showCategoryBadge: boolean;
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
): ConversationCategory {
  const searchable = `${displayName} ${conversation.subject ?? ""} ${preview}`.toLowerCase();
  const managementKeywords = ["management", "operations", "admin", "leasing", "accounts", "finance", "office"];
  const staffKeywords = ["maintenance", "concierge", "security", "support", "technician", "service", "staff", "helpdesk"];

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
  const code = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return variants[code % variants.length];
}

function getConversationCategoryMeta(category: ConversationCategory) {
  switch (category) {
    case "management":
      return {
        label: "Management",
        icon: "briefcase-outline" as const,
        badgeBg: P.primarySoft,
        badgeText: P.primary,
      };
    case "staff":
      return {
        label: "Staff",
        icon: "construct-outline" as const,
        badgeBg: P.accent,
        badgeText: P.accentText,
      };
    default:
      return {
        label: "Direct",
        icon: "people-outline" as const,
        badgeBg: P.surfaceLow,
        badgeText: P.muted,
      };
  }
}

function getConversationMeta(conversation: Conversation, currentUserId?: string) {
  const others = getOtherParticipants(conversation, currentUserId);
  const isManagement = isTenantManagementConversation(conversation, currentUserId);
  const displayName = getTenantConversationDisplayName(conversation, currentUserId);
  const preview = conversation.lastMessage?.content || conversation.subject || "No messages yet";
  const time = conversation.lastMessage?.createdAt || conversation.updatedAt;
  const unread = conversation.unreadCount > 0;
  const avatarLetter = getTenantConversationAvatarLetter(conversation, currentUserId);
  const avatarUrl = getTenantConversationAvatarUrl(conversation, currentUserId);
  const category = isManagement
    ? "management"
    : inferConversationCategory(conversation, displayName, preview);
  const categoryLabel = getConversationCategoryMeta(category).label;
  const lastSenderLabel = getTenantLastSenderLabel(conversation, currentUserId);
  const contextLabel = isManagement
    ? getTenantConversationContextLabel(conversation, currentUserId)
    : conversation.subject?.trim() ||
      (category === "staff"
        ? "Support team"
        : others.length > 1
          ? `${others.length} participants`
          : "Direct message");

  return {
    avatarLetter,
    avatarUrl,
    category,
    categoryLabel,
    contextLabel,
    displayName,
    lastSenderLabel,
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
    avatarUrl: meta.avatarUrl,
    category: meta.category,
    categoryLabel: meta.categoryLabel,
    contextLabel: meta.contextLabel,
    displayName: meta.displayName,
    lastSenderLabel: meta.lastSenderLabel,
    messageCountLabel:
      conversation.participants.length > 2 ? `${conversation.participants.length} people` : "Direct thread",
    preview: meta.preview,
    searchableText:
      `${meta.displayName} ${meta.preview} ${meta.contextLabel} ${meta.categoryLabel} ${meta.lastSenderLabel ?? ""}`.toLowerCase(),
    time: meta.time,
    timeLabel: formatTime(meta.time),
    unread: meta.unread,
    unreadCountLabel: conversation.unreadCount > 99 ? "99+" : String(conversation.unreadCount),
    showCategoryBadge: meta.category !== "resident",
  };
}

function FilterChip({
  active,
  count,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Ionicons name={icon} size={14} color={active ? "#F8F9FA" : P.muted} />
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
      <View style={[styles.filterChipCount, active && styles.filterChipCountActive]}>
        <Text style={[styles.filterChipCountText, active && styles.filterChipCountTextActive]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function InboxAction({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.inboxAction, primary && styles.inboxActionPrimary]}
    >
      <Ionicons name={icon} size={16} color={primary ? "#EEF7FB" : P.primary} />
      <Text style={[styles.inboxActionText, primary && styles.inboxActionTextPrimary]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ConversationRow({
  item,
}: {
  item: ConversationListItem;
}) {
  const categoryMeta = getConversationCategoryMeta(item.category);

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
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: item.avatarColors.bg }]}>
            <Text style={[styles.avatarText, { color: item.avatarColors.text }]}>
              {item.avatarLetter}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, item.unread && styles.nameUnread]} numberOfLines={1}>
            {item.displayName}
          </Text>
          <Text style={[styles.time, item.unread && styles.timeUnread]}>{item.timeLabel}</Text>
        </View>

        <View style={styles.metaLine}>
          <View style={styles.metaLead}>
            <Ionicons name={categoryMeta.icon} size={12} color={P.soft} />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.contextLabel}
            </Text>
          </View>
          {item.showCategoryBadge ? (
            <View style={[styles.metaBadge, { backgroundColor: categoryMeta.badgeBg }]}>
              <Text style={[styles.metaBadgeText, { color: categoryMeta.badgeText }]}>
                {item.categoryLabel}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>{item.messageCountLabel}</Text>
          </View>
        </View>

        <Text style={[styles.preview, item.unread && styles.previewUnread]} numberOfLines={2}>
          {item.lastSenderLabel ? `${item.lastSenderLabel}: ` : ""}
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
  const { notifications } = useNotifications();
  const insets = useSafeAreaInsets();
  const {
    canCreateManagementConversation,
    isFormerResident,
    statusMessage,
  } = useResidentTenancy({
    enabled: Boolean(currentUser?.role === "tenant" && currentUser?.id),
  });
  const tabBarHeight = useBottomTabBarHeight();
  const fabBottomOffset = tabBarHeight + Math.max(insets.bottom, 24) + 28;
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<MessageFilter>("all");
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [page, setPage] = useState(1);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const userNotifications = useMemo(
    () => filterNotificationsByUser(notifications || [], currentUser?.id),
    [currentUser?.id, notifications],
  );
  const hasUnreadNotifications = getUnreadNotificationsCount(userNotifications) > 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await actions.fetchConversations();
    setRefreshing(false);
  }, [actions]);

  const conversationItems = useMemo(
    () =>
      conversations
        .map((conversation) => buildConversationListItem(conversation, currentUser?.id))
        .sort((a, b) => Date.parse(b.time) - Date.parse(a.time)),
    [conversations, currentUser?.id],
  );

  const summary = useMemo(() => {
    const unreadThreads = conversationItems.filter((conversation) => conversation.unread).length;
    const staffThreads = conversationItems.filter((conversation) => conversation.category === "staff").length;
    const managementThreads = conversationItems.filter(
      (conversation) => conversation.category === "management",
    ).length;

    return {
      total: conversationItems.length,
      unread: unreadThreads,
      staff: staffThreads,
      management: managementThreads,
    };
  }, [conversationItems]);

  const filteredConversations = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();

    return conversationItems.filter((conversation) => {
      const matchesQuery = !query || conversation.searchableText.includes(query);

      if (!matchesQuery) return false;
      if (activeFilter === "all") return true;
      if (activeFilter === "unread") return conversation.unread;
      return conversation.category === activeFilter;
    });
  }, [activeFilter, conversationItems, deferredSearchQuery]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredConversations.length / CONVERSATIONS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = (currentPage - 1) * CONVERSATIONS_PER_PAGE;
  const paginatedConversations = useMemo(
    () =>
      filteredConversations.slice(
        pageStartIndex,
        pageStartIndex + CONVERSATIONS_PER_PAGE,
      ),
    [filteredConversations, pageStartIndex],
  );
  const visibleRangeStart = filteredConversations.length === 0 ? 0 : pageStartIndex + 1;
  const visibleRangeEnd = pageStartIndex + paginatedConversations.length;

  const hasActiveQuery = searchQuery.trim().length > 0 || activeFilter !== "all";

  const featuredConversation = useMemo(
    () => filteredConversations.find((conversation) => conversation.unread) ?? filteredConversations[0] ?? null,
    [filteredConversations],
  );

  const filterOptions = useMemo(
    () => [
      { key: "all" as const, label: "All", icon: "mail-outline" as const, count: summary.total },
      {
        key: "unread" as const,
        label: "Unread",
        icon: "radio-button-on-outline" as const,
        count: summary.unread,
      },
      {
        key: "staff" as const,
        label: "Staff",
        icon: "construct-outline" as const,
        count: summary.staff,
      },
      {
        key: "management" as const,
        label: "Management",
        icon: "briefcase-outline" as const,
        count: summary.management,
      },
    ],
    [summary.management, summary.staff, summary.total, summary.unread],
  );

  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => <MemoizedConversationRow item={item} />,
    [],
  );

  useEffect(() => {
    setPage(1);
  }, [activeFilter, deferredSearchQuery]);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  const keyExtractor = useCallback((item: ConversationListItem) => item.conversation.id, []);

  const header = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <View>
          <HeaderBar
            title="Messages"
            hasUnreadNotifications={hasUnreadNotifications}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
            textColor={P.text}
          />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlowPrimary} />
          <View style={styles.heroGlowSecondary} />

          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Conversation overview</Text>
            <Text style={styles.heroTitle}>Everything you need to follow up, in one inbox</Text>
            <Text style={styles.heroSubtitle}>
              Scan unread threads, search by team, and jump straight into the conversations that still need your attention.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{summary.total}</Text>
              <Text style={styles.heroStatLabel}>Total threads</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{summary.unread}</Text>
              <Text style={styles.heroStatLabel}>Unread now</Text>
            </View>
          </View>

          <View style={styles.heroActionRow}>
            {canCreateManagementConversation ? (
              <InboxAction
                icon="create-outline"
                label="New message"
                onPress={() => router.push("/(modals)/new-conversation" as any)}
                primary
              />
            ) : null}
            <InboxAction icon="refresh-outline" label="Refresh" onPress={onRefresh} />
          </View>
        </View>

        {isFormerResident ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={P.warningText} />
            <Text style={styles.infoBannerText}>{statusMessage}</Text>
          </View>
        ) : null}

        {featuredConversation ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.featuredCard}
            onPress={() =>
              router.push({
                pathname: "/(modals)/conversation-detail",
                params: { conversationId: featuredConversation.conversation.id },
              } as any)
            }
          >
            <View style={styles.featuredHeader}>
              <View style={styles.featuredHeaderCopy}>
                <Text style={styles.featuredEyebrow}>
                  {featuredConversation.unread ? "Needs attention" : "Latest thread"}
                </Text>
                <Text style={styles.featuredTitle} numberOfLines={1}>
                  {featuredConversation.displayName}
                </Text>
              </View>
              <View style={styles.featuredTimeWrap}>
                <Text style={styles.featuredTime}>{featuredConversation.timeLabel}</Text>
              </View>
            </View>

            <View style={styles.featuredBadgeRow}>
              {featuredConversation.showCategoryBadge ? (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>{featuredConversation.categoryLabel}</Text>
                </View>
              ) : null}
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>{featuredConversation.contextLabel}</Text>
              </View>
            </View>

            <Text style={styles.featuredPreview} numberOfLines={2}>
              {featuredConversation.lastSenderLabel ? `${featuredConversation.lastSenderLabel}: ` : ""}
              {featuredConversation.preview}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={styles.searchShell}>
          <Ionicons name="search" size={18} color={P.soft} />
          <TextInput
            value={searchQuery}
            onChangeText={(value) => {
              startTransition(() => {
                setSearchQuery(value);
              });
            }}
            placeholder="Search conversations"
            placeholderTextColor="#8A969B"
            style={styles.searchInput}
          />
          {hasActiveQuery ? (
            <View style={styles.searchStatusPill}>
              <Text style={styles.searchStatusPillText}>{filteredConversations.length}</Text>
            </View>
          ) : null}
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => {
                startTransition(() => {
                  setSearchQuery("");
                });
              }}
              style={styles.clearSearchButton}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={16} color={P.soft} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filterOptions.map((option) => (
            <FilterChip
              key={option.key}
              active={activeFilter === option.key}
              count={option.count}
              icon={option.icon}
              label={option.label}
              onPress={() => {
                startTransition(() => {
                  setActiveFilter(option.key);
                  setPage(1);
                });
              }}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>
            {filteredConversations.length === conversationItems.length && !searchQuery
              ? "All conversations"
              : `${filteredConversations.length} result${filteredConversations.length === 1 ? "" : "s"}`}
          </Text>
          <Text style={styles.sectionMeta}>{loading ? "Syncing..." : "Sorted by latest activity"}</Text>
        </View>
      </View>
    ),
    [
      activeFilter,
      canCreateManagementConversation,
      conversationItems.length,
      featuredConversation,
      filterOptions,
      filteredConversations.length,
      hasUnreadNotifications,
      hasActiveQuery,
      isFormerResident,
      loading,
      onRefresh,
      searchQuery,
      showSideMenu,
      statusMessage,
      summary.total,
      summary.unread,
    ],
  );

  if (loading && conversations.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={P.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={paginatedConversations}
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
          paginatedConversations.length === 0 && styles.emptyListContent,
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
        ListFooterComponent={
          filteredConversations.length > 0 && totalPages > 1 ? (
            <View style={styles.paginationContainer}>
              <Text style={styles.paginationSummary}>
                Showing {visibleRangeStart}-{visibleRangeEnd} of {filteredConversations.length}
              </Text>
              <View style={styles.paginationControls}>
                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    currentPage === 1 && styles.paginationButtonDisabled,
                  ]}
                  onPress={() => setPage((prevPage) => Math.max(1, prevPage - 1))}
                  disabled={currentPage === 1}
                >
                  <Ionicons
                    name="chevron-back"
                    size={16}
                    color={currentPage === 1 ? P.soft : P.primary}
                  />
                  <Text
                    style={[
                      styles.paginationButtonText,
                      currentPage === 1 && styles.paginationButtonTextDisabled,
                    ]}
                  >
                    Previous
                  </Text>
                </TouchableOpacity>

                <View style={styles.paginationPagePill}>
                  <Text style={styles.paginationPageText}>
                    Page {currentPage} / {totalPages}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.paginationButton,
                    currentPage === totalPages && styles.paginationButtonDisabled,
                  ]}
                  onPress={() =>
                    setPage((prevPage) => Math.min(totalPages, prevPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <Text
                    style={[
                      styles.paginationButtonText,
                      currentPage === totalPages &&
                        styles.paginationButtonTextDisabled,
                    ]}
                  >
                    Next
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={currentPage === totalPages ? P.soft : P.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.listFooterSpacer} />
          )
        }
      />

      {canCreateManagementConversation ? (
        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.fabWrap, { bottom: fabBottomOffset }]}
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

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </SafeAreaView>
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
    position: "relative",
    overflow: "hidden",
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
  heroGlowPrimary: {
    position: "absolute",
    right: -30,
    top: -26,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: "#ECF3F6",
  },
  heroGlowSecondary: {
    position: "absolute",
    right: 44,
    bottom: -36,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3EADF",
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
  heroActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  inboxAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
    borderWidth: 1,
    borderColor: P.border,
  },
  inboxActionPrimary: {
    backgroundColor: P.primary,
    borderColor: P.primary,
  },
  inboxActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.primary,
  },
  inboxActionTextPrimary: {
    color: "#EEF7FB",
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: P.surfaceLow,
  },
  heroStatValue: {
    fontSize: 26,
    fontWeight: "800",
    color: P.text,
  },
  heroStatLabel: {
    marginTop: 4,
    fontSize: 13,
    color: P.muted,
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
  featuredCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 24,
    backgroundColor: P.surface,
    borderWidth: 1,
    borderColor: P.border,
  },
  featuredHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  featuredHeaderCopy: {
    flex: 1,
  },
  featuredEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: P.primary,
  },
  featuredTitle: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "800",
    color: P.text,
  },
  featuredTimeWrap: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
  },
  featuredTime: {
    fontSize: 12,
    fontWeight: "700",
    color: P.soft,
  },
  featuredBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  featuredBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: P.surfaceLow,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: P.muted,
  },
  featuredPreview: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 21,
    color: P.muted,
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
  searchStatusPill: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: P.primarySoft,
  },
  searchStatusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: P.primary,
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
    paddingRight: 4,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  filterChipCount: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(43, 52, 55, 0.08)",
  },
  filterChipCountActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  filterChipCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: P.text,
  },
  filterChipCountTextActive: {
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
  paginationContainer: {
    alignItems: "center",
    gap: 12,
    paddingTop: 18,
    paddingBottom: 8,
  },
  paginationSummary: {
    fontSize: 12,
    color: P.soft,
    fontWeight: "600",
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 14,
    backgroundColor: P.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: P.border,
  },
  paginationButtonDisabled: {
    backgroundColor: P.surfaceLow,
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.primary,
  },
  paginationButtonTextDisabled: {
    color: P.soft,
  },
  paginationPagePill: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: P.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
  },
  paginationPageText: {
    fontSize: 13,
    fontWeight: "700",
    color: P.text,
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
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
  metaLead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
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
  metaBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: P.muted,
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
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: P.muted,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: P.primary,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EEF7FB",
  },
  listFooterSpacer: {
    height: 8,
  },
  fabWrap: {
    position: "absolute",
    right: 24,
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: P.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
});
