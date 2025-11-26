import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import { BroadcastApiService } from "../../../lib/services/api/broadcast";
import type { Announcement, AnnouncementTemplate } from "../../../lib/types";
import { AnnouncementDetailsModal } from "./_components/AnnouncementDetailsModal";
import { ComposeAnnouncementModal } from "./_components/ComposeAnnouncementModal";
import { ADMIN_NOTIFICATION_ROUTE, getPriorityColor, getStatusColor } from "./_constants";
import { useBroadcastData } from "./_hooks/useBroadcastData";
import { styles } from "./_styles";
import type { ComposeFormData, RecipientPreviewData, TabType } from "./_types";

const broadcastService = new BroadcastApiService();

export default function BroadcastNotificationsScreen() {
  const { currentUser, allBuildings, hasUnreadNotifications } = useBroadcastData();
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>("announcements");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Templates state
  const [templates, setTemplates] = useState<AnnouncementTemplate[]>([]);

  // Form state
  const [formData, setFormData] = useState<ComposeFormData>({
    title: "",
    body: "",
    priority: "normal",
    targetType: "all_tenants",
    targetBuildingIds: [],
    scheduledFor: "",
    templateId: "",
  });

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [recipientPreview, setRecipientPreview] = useState<RecipientPreviewData | null>(null);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 768;

  // Load data
  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const response = await broadcastService.getAnnouncements(
        statusFilter !== "all" ? statusFilter : undefined
      );
      if (response.success && response.data) {
        setAnnouncements(response.data);
      }
    } catch (error) {
      console.error("Failed to load announcements:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await broadcastService.getTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTab === "announcements") {
      loadAnnouncements();
    } else {
      loadTemplates();
    }
  }, [selectedTab, loadAnnouncements, loadTemplates]);

  const handleUseTemplate = useCallback((template: AnnouncementTemplate) => {
    setFormData((prev) => ({
      ...prev,
      title: template.title,
      body: template.body,
      priority: template.priority,
      targetType: template.targetType,
      templateId: template.id,
    }));
    setShowComposeModal(true);
  }, []);

  const handlePreviewRecipients = async () => {
    try {
      const response = await broadcastService.previewRecipients({
        title: formData.title,
        body: formData.body,
        priority: formData.priority,
        targetType: formData.targetType,
        targetBuildingIds: formData.targetBuildingIds,
        createdBy: currentUser?.id || "admin",
      });

      if (response.success && response.data) {
        setRecipientPreview(response.data);
        setShowPreview(true);
      }
    } catch (error) {
      console.error("Failed to preview recipients:", error);
      Alert.alert("Error", "Failed to preview recipients");
    }
  };

  const handleSendAnnouncement = async () => {
    if (!formData.title || !formData.body) {
      Alert.alert("Error", "Please fill in title and message");
      return;
    }

    try {
      const createResponse = await broadcastService.createAnnouncement({
        title: formData.title,
        body: formData.body,
        priority: formData.priority,
        targetType: formData.targetType,
        targetBuildingIds: formData.targetBuildingIds,
        scheduledFor: formData.scheduledFor || undefined,
        templateId: formData.templateId || undefined,
        createdBy: currentUser?.id || "admin",
        createdByName: currentUser?.name || "Admin",
      });

      if (createResponse.success && createResponse.data) {
        if (!formData.scheduledFor) {
          const sendResponse = await broadcastService.sendAnnouncement(createResponse.data.id);
          if (sendResponse.success) {
            Alert.alert(
              "Success",
              `Announcement sent to ${sendResponse.data?.recipientCount || 0} recipients`
            );
          }
        } else {
          Alert.alert("Success", "Announcement scheduled successfully");
        }

        setShowComposeModal(false);
        resetForm();
        loadAnnouncements();
      }
    } catch (error) {
      console.error("Failed to send announcement:", error);
      Alert.alert("Error", "Failed to send announcement");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      body: "",
      priority: "normal",
      targetType: "all_tenants",
      targetBuildingIds: [],
      scheduledFor: "",
      templateId: "",
    });
    setRecipientPreview(null);
    setShowPreview(false);
  };

  const filteredAnnouncements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return announcements.filter((announcement) => {
      if (!query) return true;
      const haystack = `${announcement.title} ${announcement.body}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [announcements, searchQuery]);

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return templates.filter((template) => {
      if (!query) return true;
      const haystack = `${template.name} ${template.title} ${template.category}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [templates, searchQuery]);

  const renderAnnouncementItem = useCallback(({ item }: { item: Announcement }) => (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => {
          setSelectedAnnouncement(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.priorityIndicator,
                { backgroundColor: getPriorityColor(item.priority) },
              ]}
            />
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.body}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="people-outline" size={14} color="#666" />
            <Text style={styles.footerText}>
              {item.targetType === "all_tenants"
                ? "All Tenants"
                : `${item.targetBuildingIds?.length || 0} Buildings`}
            </Text>
          </View>
        </View>
        {item.deliveryStats && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Sent</Text>
              <Text style={styles.statValue}>{item.deliveryStats.sent}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Read</Text>
              <Text style={styles.statValue}>{item.deliveryStats.read}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Failed</Text>
              <Text style={[styles.statValue, styles.failedText]}>
                {item.deliveryStats.failed}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  ), []);

  const renderTemplateItem = useCallback(({ item }: { item: AnnouncementTemplate }) => (
    <View style={styles.card}>
      <Text style={styles.templateTitle}>{item.name}</Text>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDescription} numberOfLines={3}>
        {item.body}
      </Text>
      <View style={styles.templateFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="pricetag-outline" size={14} color="#666" />
          <Text style={styles.footerText}>{item.category}</Text>
        </View>
        <TouchableOpacity
          style={styles.useButton}
          onPress={() => handleUseTemplate(item)}
        >
          <Ionicons name="create-outline" size={14} color="#00796B" />
          <Text style={styles.useButtonText}>Use Template</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [handleUseTemplate]);

  const ListHeader = useCallback(() => (
    <View>
      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "announcements" && styles.activeTab]}
          onPress={() => setSelectedTab("announcements")}
        >
          <Ionicons
            name="megaphone-outline"
            size={20}
            color={selectedTab === "announcements" ? "#00796B" : "#666"}
          />
          <Text
            style={[styles.tabText, selectedTab === "announcements" && styles.activeTabText]}
          >
            Announcements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === "templates" && styles.activeTab]}
          onPress={() => setSelectedTab("templates")}
        >
          <Ionicons
            name="document-text-outline"
            size={20}
            color={selectedTab === "templates" ? "#00796B" : "#666"}
          />
          <Text style={[styles.tabText, selectedTab === "templates" && styles.activeTabText]}>
            Templates
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {selectedTab === "announcements" && (
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Status:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {["all", "draft", "scheduled", "sent", "cancelled"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    statusFilter === status && styles.activeFilterChip,
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === status && styles.activeFilterChipText,
                    ]}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${selectedTab}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        {/* Compose Button */}
        <TouchableOpacity
          style={styles.composeButton}
          onPress={() => setShowComposeModal(true)}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.composeButtonText}>Compose Announcement</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [selectedTab, statusFilter, searchQuery]);

  const ListEmptyAnnouncements = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="megaphone-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>No announcements found</Text>
    </View>
  ), []);

  const ListEmptyTemplates = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateText}>No templates found</Text>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
        <HeaderBar
          title="Broadcast Notifications"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00796B" />
          </View>
        ) : selectedTab === "announcements" ? (
          <FlatList
            data={filteredAnnouncements}
            keyExtractor={(item) => item.id}
            renderItem={renderAnnouncementItem}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmptyAnnouncements}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        ) : (
          <FlatList
            data={filteredTemplates}
            keyExtractor={(item) => item.id}
            renderItem={renderTemplateItem}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={ListEmptyTemplates}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}
      </View>

      {/* Modals */}
      <AnnouncementDetailsModal
        announcement={selectedAnnouncement}
        visible={showDetailModal}
        isCompact={isCompact}
        onClose={() => setShowDetailModal(false)}
        onRefresh={loadAnnouncements}
      />

      <ComposeAnnouncementModal
        visible={showComposeModal}
        isCompact={isCompact}
        formData={formData}
        allBuildings={allBuildings}
        recipientPreview={recipientPreview}
        showPreview={showPreview}
        onClose={() => {
          setShowComposeModal(false);
          resetForm();
        }}
        onFormChange={setFormData}
        onPreview={handlePreviewRecipients}
        onSubmit={handleSendAnnouncement}
      />
    </SafeAreaView>
  );
}
