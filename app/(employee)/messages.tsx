import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import { filterNotificationsByUser } from "../../lib/utils/helpers";

const NOTIFICATION_ROUTE = "/(modals)/notifications-hub";

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  isRead: boolean;
  type: "text" | "image" | "file";
  attachmentUrl?: string;
}

// Mock conversation data
const MOCK_MESSAGES: Message[] = [
  {
    id: "msg-1",
    text: "Welcome to the team! Let us know if you need anything.",
    senderId: "sp-company",
    senderName: "SP Manager",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    type: "text",
  },
  {
    id: "msg-2",
    text: "Thank you! Happy to be here. I've reviewed the job assignments.",
    senderId: "employee",
    senderName: "You",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    isRead: true,
    type: "text",
  },
  {
    id: "msg-3",
    text: "Great! You have a new job assignment at Marina Heights - Unit 1204. It's a plumbing repair that needs attention by tomorrow.",
    senderId: "sp-company",
    senderName: "SP Manager",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    type: "text",
  },
  {
    id: "msg-4",
    text: "I'll check it out first thing in the morning. Do I need any special tools?",
    senderId: "employee",
    senderName: "You",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 1800000).toISOString(),
    isRead: true,
    type: "text",
  },
  {
    id: "msg-5",
    text: "Standard plumbing kit should be sufficient. The issue is a leaky faucet in the kitchen. Let me know if you need parts ordered.",
    senderId: "sp-company",
    senderName: "SP Manager",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    isRead: true,
    type: "text",
  },
  {
    id: "msg-6",
    text: "Perfect, I have the standard kit. Will update you once I complete the job.",
    senderId: "employee",
    senderName: "You",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    type: "text",
  },
  {
    id: "msg-7",
    text: "Job at Marina Heights completed successfully. Replaced the faucet cartridge and tested - no more leaks.",
    senderId: "employee",
    senderName: "You",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    type: "text",
  },
  {
    id: "msg-8",
    text: "Excellent work! The tenant gave positive feedback. Your payment for this job will be processed this Friday.",
    senderId: "sp-company",
    senderName: "SP Manager",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    type: "text",
  },
  {
    id: "msg-9",
    text: "You have 2 new job assignments for next week. Check your jobs tab for details.",
    senderId: "sp-company",
    senderName: "SP Manager",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    type: "text",
  },
];

export default function EmployeeMessagesScreen() {
  const { currentUser, notifications } = useApp();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  // Get service provider name from user profile
  const spCompanyName = (currentUser?.profile as any)?.serviceProviderName || "Service Provider";

  // Sort messages by timestamp (newest first for inverted list)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Mark messages as read when screen loads
  useEffect(() => {
    const unreadMessages = messages.filter(
      (m) => !m.isRead && m.senderId !== "employee"
    );
    if (unreadMessages.length > 0) {
      setMessages((prev) =>
        prev.map((m) => ({
          ...m,
          isRead: true,
        }))
      );
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    setIsSending(true);

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text: inputText.trim(),
      senderId: "employee",
      senderName: currentUser?.name || "You",
      timestamp: new Date().toISOString(),
      isRead: true,
      type: "text",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");

    // Simulate sending delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSending(false);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const shouldShowDate = (currentMsg: Message, prevMsg?: Message) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const prevDate = new Date(prevMsg.timestamp).toDateString();
    return currentDate !== prevDate;
  };

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isEmployee = item.senderId === "employee";
      const prevMessage = sortedMessages[index + 1]; // Note: list is inverted
      const showDate = shouldShowDate(item, prevMessage);

      return (
        <View>
          {showDate && (
            <View style={styles.dateSeparator}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>
                {new Date(item.timestamp).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </Text>
              <View style={styles.dateLine} />
            </View>
          )}
          <View
            style={[
              styles.messageContainer,
              isEmployee ? styles.employeeMessage : styles.companyMessage,
            ]}
          >
            {!isEmployee && (
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>SP</Text>
                </View>
              </View>
            )}
            <View
              style={[
                styles.messageBubble,
                isEmployee ? styles.employeeBubble : styles.companyBubble,
              ]}
            >
              {!isEmployee && (
                <Text style={styles.senderName}>{item.senderName}</Text>
              )}
              <Text
                style={[
                  styles.messageText,
                  isEmployee ? styles.employeeText : styles.companyText,
                ]}
              >
                {item.text}
              </Text>
              <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.messageTime,
                    isEmployee ? styles.employeeTime : styles.companyTime,
                  ]}
                >
                  {formatMessageTime(item.timestamp)}
                </Text>
                {isEmployee && (
                  <Ionicons
                    name={item.isRead ? "checkmark-done" : "checkmark"}
                    size={14}
                    color={item.isRead ? "#10B981" : "#94A3B8"}
                    style={styles.readIndicator}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      );
    },
    [sortedMessages]
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <View style={styles.encryptionNotice}>
          <Ionicons name="lock-closed" size={14} color="#64748B" />
          <Text style={styles.encryptionText}>
            Messages are end-to-end encrypted
          </Text>
        </View>
      </View>
    ),
    []
  );

  const ListEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" />
        <Text style={styles.emptyStateText}>No messages yet</Text>
        <Text style={styles.emptyStateSubtext}>
          Start a conversation with your service provider
        </Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
          <HeaderBar
            title="Messages"
            subtitle={spCompanyName}
            hasUnreadNotifications={hasUnreadNotifications}
            onNotificationPress={() => router.push(NOTIFICATION_ROUTE as any)}
            showSideMenu={showSideMenu}
            onSideMenuToggle={setShowSideMenu}
          />

          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderAvatar}>
              <Ionicons name="business" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatHeaderName}>{spCompanyName}</Text>
              <View style={styles.onlineStatus}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.chatHeaderAction}>
              <Ionicons name="call-outline" size={22} color="#10B981" />
            </TouchableOpacity>
          </View>

          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={sortedMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            ListFooterComponent={ListHeader}
            ListEmptyComponent={ListEmpty}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            inverted
          />

          {/* Input Area */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="attach" size={24} color="#64748B" />
            </TouchableOpacity>
            <View style={styles.textInputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a message..."
                value={inputText}
                onChangeText={setInputText}
                placeholderTextColor="#94A3B8"
                multiline
                maxLength={1000}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() && !isSending ? "#FFFFFF" : "#94A3B8"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser?.role}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 12,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  chatHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  onlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  chatHeaderAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  listHeader: {
    paddingVertical: 16,
    alignItems: "center",
  },
  encryptionNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  encryptionText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dateText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    paddingHorizontal: 12,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  employeeMessage: {
    justifyContent: "flex-end",
  },
  companyMessage: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    marginRight: 8,
    alignSelf: "flex-end",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
  },
  employeeBubble: {
    backgroundColor: "#10B981",
    borderBottomRightRadius: 4,
  },
  companyBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  employeeText: {
    color: "#FFFFFF",
  },
  companyText: {
    color: "#0F172A",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: "500",
  },
  employeeTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  companyTime: {
    color: "#94A3B8",
  },
  readIndicator: {
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 24,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textInputWrapper: {
    flex: 1,
    marginHorizontal: 8,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    color: "#0F172A",
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
  },
});
