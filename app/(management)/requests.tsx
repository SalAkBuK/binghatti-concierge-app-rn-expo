import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import type { Building, Job, Request, RequestStatus } from "../../lib/types";
import { getUserErrorMessage } from "../../lib/services/api/errors";
import {
  filterNotificationsByUser,
  formatDateTime,
} from "../../lib/utils/helpers";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type StatusFilter = "all" | RequestStatus;
type PriorityFilter = "all" | Request["priority"];
type TypeFilter = "all" | NonNullable<Request["type"]>;

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function ManagementRequestsScreen() {
  const {
    currentUser,
    notifications,
    requests: requestItems,
    actions,
  } = useApp();
  const {
    getBuildings,
    getManagedBuildings,
    getJobs,
    setSelectedRequest: setSelectedRequestContext,
    addRequestNote,
    addRequestMessage,
  } = actions;

  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "notes" | "messages" | "timeline">("overview");
  const [newNote, setNewNote] = useState("");
  const [newMessage, setNewMessage] = useState("");

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 900;
  const allBuildings = useMemo(() => getBuildings(), [getBuildings]);
  const managedBuildings = useMemo(
    () => getManagedBuildings?.() ?? allBuildings,
    [getManagedBuildings, allBuildings],
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    managedBuildings.length === 1 ? managedBuildings[0].id : "all",
  );

  useEffect(() => {
    if (!managedBuildings.length) {
      setSelectedBuildingId("all");
      return;
    }

    if (
      selectedBuildingId !== "all" &&
      !managedBuildings.some((building) => building.id === selectedBuildingId)
    ) {
      setSelectedBuildingId("all");
    }
  }, [managedBuildings, selectedBuildingId]);

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    managedBuildings.forEach((building) => map.set(building.id, building));
    return map;
  }, [managedBuildings]);

  const priorityOptions = useMemo(() => {
    const priorities = new Set<Request["priority"]>();
    requestItems.forEach((request) => {
      if (request.priority) {
        priorities.add(request.priority);
      }
    });
    return ["all", ...Array.from(priorities)] as PriorityFilter[];
  }, [requestItems]);

  const typeOptions = useMemo(() => {
    const types = new Set<NonNullable<Request["type"]>>();
    requestItems.forEach((request) => {
      if (request.type) {
        types.add(request.type);
      }
    });
    return ["all", ...Array.from(types)] as TypeFilter[];
  }, [requestItems]);

  const jobs = useMemo(() => getJobs(), [getJobs]);
  const getJobForRequest = useCallback(
    (requestId: string): Job | undefined => {
      return jobs.find((job) => job.requestId === requestId);
    },
    [jobs],
  );

  const scopedRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const buildingScope =
      selectedBuildingId === "all"
        ? managedBuildings.map((building) => building.id)
        : [selectedBuildingId];

    return requestItems
      .filter((request) => {
        if (!request.buildingId) return false;
        return buildingScope.includes(request.buildingId);
      })
      .filter((request) => {
        if (priorityFilter === "all") return true;
        return request.priority === priorityFilter;
      })
      .filter((request) => {
        if (typeFilter === "all") return true;
        return request.type === typeFilter;
      })
      .filter((request) => {
        if (statusFilter === "all") return true;
        return request.status === statusFilter;
      })
      .filter((request) => {
        if (!query) return true;
        const haystack = `${request.title} ${request.description} ${request.apartment || ""} ${request.type || ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [
    requestItems,
    managedBuildings,
    selectedBuildingId,
    statusFilter,
    priorityFilter,
    typeFilter,
    searchQuery,
  ]);

  const jobForSelectedRequest = useMemo(() => {
    if (!selectedRequest) {
      return undefined;
    }
    return getJobForRequest(selectedRequest.id);
  }, [selectedRequest, getJobForRequest]);

  const summary = useMemo(() => {
    const buildingScoped = requestItems.filter((request) => {
      if (!request.buildingId) return false;
      if (selectedBuildingId === "all") {
        return managedBuildings.some(
          (building) => building.id === request.buildingId,
        );
      }
      return request.buildingId === selectedBuildingId;
    });

    const openRequests = buildingScoped.filter(
      (req) => req.status === "pending" || req.status === "in-progress",
    );
    const resolvedRequests = buildingScoped.filter(
      (req) => req.status === "completed",
    );
    const pendingAssignments = buildingScoped.filter(
      (req) => !req.assignedTo,
    );

    return {
      total: buildingScoped.length,
      open: openRequests.length,
      resolved: resolvedRequests.length,
      unassigned: pendingAssignments.length,
    };
  }, [requestItems, selectedBuildingId, managedBuildings]);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications = userNotifications.some((notif) => !notif.read);

  const buildingFilterOptions = useMemo(() => {
    if (!managedBuildings.length) return [];
    return managedBuildings;
  }, [managedBuildings]);

  const selectedBuildingName =
    selectedBuildingId !== "all"
      ? buildingMap.get(selectedBuildingId)?.name
      : "All Buildings";

  const handleAddNote = async () => {
    if (!selectedRequest || !newNote.trim() || !currentUser) return;

    try {
      await addRequestNote({
        requestId: selectedRequest.id,
        authorId: currentUser.id,
        authorName: currentUser.name,
        body: newNote.trim(),
        visibility: "management",
      });
      setNewNote("");
      Alert.alert("Note added", "Internal note saved successfully");
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Failed to add note", errorMessage);
    }
  };

  const handleAddMessage = async () => {
    if (!selectedRequest || !newMessage.trim() || !currentUser) return;

    try {
      await addRequestMessage({
        requestId: selectedRequest.id,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        channel: "internal",
        body: newMessage.trim(),
      });
      setNewMessage("");
      Alert.alert("Message sent", "Message added to request");
    } catch (error) {
      const errorMessage = getUserErrorMessage(error);
      Alert.alert("Failed to send message", errorMessage);
    }
  };

  const requestStatusBadge = (status: RequestStatus) => {
    const palette = {
      pending: { bg: "#FEF3C7", text: "#92400E" },
      "in-progress": { bg: "#DBEAFE", text: "#1D4ED8" },
      completed: { bg: "#DCFCE7", text: "#047857" },
      cancelled: { bg: "#FEE2E2", text: "#DC2626" },
    };
    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: palette[status].bg },
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            { color: palette[status].text },
          ]}
        >
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const openRequestDetails = (request: Request) => {
    setSelectedRequest(request);
    setSelectedRequestContext(request);
  };

  const closeRequestDetails = () => {
    setSelectedRequest(null);
    setSelectedRequestContext(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Service Requests"
          subtitle="Track and resolve maintenance across your buildings"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        <Animated.View
          entering={FadeInDown.delay(40).duration(280)}
          style={[
            styles.summaryRow,
            isCompact && styles.summaryRowCompact,
          ]}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryMeta}>{selectedBuildingName}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Open</Text>
            <Text style={styles.summaryValue}>{summary.open}</Text>
            <Text style={styles.summaryMeta}>Pending / In progress</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Resolved</Text>
            <Text style={styles.summaryValue}>{summary.resolved}</Text>
            <Text style={styles.summaryMeta}>Completed last 30 days</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Unassigned</Text>
            <Text style={styles.summaryValue}>{summary.unassigned}</Text>
            <Text style={styles.summaryMeta}>Needs provider</Text>
          </View>
        </Animated.View>

        {managedBuildings.length > 1 ? (
          <Animated.View
            entering={FadeInDown.delay(80).duration(280)}
            style={styles.filterRow}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRowContent}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedBuildingId === "all" && styles.filterChipActive,
                ]}
                onPress={() => setSelectedBuildingId("all")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedBuildingId === "all" &&
                      styles.filterChipTextActive,
                  ]}
                >
                  All buildings
                </Text>
              </TouchableOpacity>
              {buildingFilterOptions.map((building) => (
                <TouchableOpacity
                  key={building.id}
                  style={[
                    styles.filterChip,
                    selectedBuildingId === building.id &&
                      styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedBuildingId(building.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedBuildingId === building.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {building.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={FadeInDown.delay(120).duration(280)}
          style={styles.searchRow}
        >
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search requests, units, descriptions…"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.statusFilters}>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusFilterButton,
                  statusFilter === option.value &&
                    styles.statusFilterButtonActive,
                ]}
                onPress={() => setStatusFilter(option.value)}
              >
                <Text
                  style={[
                    styles.statusFilterLabel,
                    statusFilter === option.value &&
                      styles.statusFilterLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {priorityOptions.length > 1 && (
          <Animated.View
            entering={FadeInDown.delay(140).duration(280)}
            style={styles.secondaryFilterRow}
          >
            <Text style={styles.secondaryFilterLabel}>Priority</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.secondaryFilterPills}
            >
              {(priorityOptions as PriorityFilter[]).map((option) => (
                <TouchableOpacity
                  key={`priority-${option}`}
                  style={[
                    styles.secondaryPill,
                    priorityFilter === option && styles.secondaryPillActive,
                  ]}
                  onPress={() => setPriorityFilter(option)}
                >
                  <Text
                    style={[
                      styles.secondaryPillText,
                      priorityFilter === option &&
                        styles.secondaryPillTextActive,
                    ]}
                  >
                    {option === "all"
                      ? "All"
                      : option.replace(/_/g, " ").toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {typeOptions.length > 1 && (
          <Animated.View
            entering={FadeInDown.delay(160).duration(280)}
            style={styles.secondaryFilterRow}
          >
            <Text style={styles.secondaryFilterLabel}>Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.secondaryFilterPills}
            >
              {(typeOptions as TypeFilter[]).map((option) => (
                <TouchableOpacity
                  key={`type-${option}`}
                  style={[
                    styles.secondaryPill,
                    typeFilter === option && styles.secondaryPillActive,
                  ]}
                  onPress={() => setTypeFilter(option)}
                >
                  <Text
                    style={[
                      styles.secondaryPillText,
                      typeFilter === option &&
                        styles.secondaryPillTextActive,
                    ]}
                  >
                    {option === "all"
                      ? "All"
                      : option.replace(/_/g, " ").toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        <Animated.View
          entering={FadeInDown.delay(200).duration(320)}
          style={styles.requestList}
        >
          {scopedRequests.length ? (
            scopedRequests.map((request) => {
              const job = getJobForRequest(request.id);
              return (
                <TouchableOpacity
                  key={request.id}
                  style={styles.requestCard}
                  onPress={() => openRequestDetails(request)}
                >
                  <View style={styles.requestCardHeader}>
                    <View style={styles.requestHeaderLeft}>
                      <Text style={styles.requestTitle}>{request.title}</Text>
                      <Text style={styles.requestMeta}>
                        Unit {request.apartment || "N/A"} ·{" "}
                        {request.type?.toUpperCase()}
                      </Text>
                    </View>
                    {requestStatusBadge(request.status)}
                  </View>

                  {request.description ? (
                    <Text style={styles.requestDescription} numberOfLines={2}>
                      {request.description}
                    </Text>
                  ) : null}

                  <View style={styles.requestFooter}>
                    <View style={styles.footerMetaRow}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color="#64748B"
                      />
                      <Text style={styles.footerMetaText}>
                        {formatDateTime(request.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.footerMetaRow}>
                      <Ionicons
                        name="construct-outline"
                        size={14}
                        color="#64748B"
                      />
                      <Text style={styles.footerMetaText}>
                        {job
                          ? `Job ${job.status.toUpperCase()}`
                          : "No job assigned"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="clipboard-outline"
                size={40}
                color="#CBD5F5"
              />
              <Text style={styles.emptyStateTitle}>No requests found</Text>
              <Text style={styles.emptyStateBody}>
                Adjust your filters or select another building to see requests.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      <Modal
        visible={!!selectedRequest}
        animationType="slide"
        onRequestClose={closeRequestDetails}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeRequestDetails}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabBar}>
            {(["overview", "notes", "messages", "timeline"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, detailTab === tab && styles.tabActive]}
                onPress={() => setDetailTab(tab)}
              >
                <Text style={[styles.tabText, detailTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {detailTab === "overview" && selectedRequest && (
              <View style={styles.overviewSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Title:</Text>
                  <Text style={styles.detailValue}>{selectedRequest.title}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>{selectedRequest.description}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <View>{requestStatusBadge(selectedRequest.status)}</View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Priority:</Text>
                  <Text style={styles.detailValue}>{selectedRequest.priority}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>{selectedRequest.type}</Text>
                </View>
                {selectedRequest.apartment && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Unit:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.apartment}</Text>
                  </View>
                )}
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>{formatDateTime(selectedRequest.createdAt)}</Text>
                </View>
                {selectedRequest.slaDueAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>SLA Due:</Text>
                    <Text style={styles.detailValue}>{formatDateTime(selectedRequest.slaDueAt)}</Text>
                  </View>
                )}

                <View style={styles.assignmentSection}>
                  <View style={styles.assignmentHeaderRow}>
                    <Text style={styles.assignmentTitle}>Work Order Status</Text>
                    {jobForSelectedRequest && (
                      <View style={styles.jobStatusBadge}>
                        <Text style={styles.jobStatusText}>
                          {jobForSelectedRequest.status.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  {jobForSelectedRequest ? (
                    <View style={styles.jobDetailsCard}>
                      <View style={styles.jobDetailRow}>
                        <Text style={styles.jobDetailLabel}>Job ID</Text>
                        <Text style={styles.jobDetailValue}>#{jobForSelectedRequest.id.slice(0, 8)}</Text>
                      </View>
                      <View style={styles.jobDetailRow}>
                        <Text style={styles.jobDetailLabel}>Assigned To</Text>
                        <Text style={styles.jobDetailValue}>
                          {jobForSelectedRequest.assignmentTargetType === "building_employee"
                            ? jobForSelectedRequest.assignedBuildingEmployeeName || "Building Team"
                            : jobForSelectedRequest.assignedToName || "Service Provider"}
                        </Text>
                      </View>
                      {jobForSelectedRequest.scheduledDate && (
                        <View style={styles.jobDetailRow}>
                          <Text style={styles.jobDetailLabel}>Scheduled</Text>
                          <Text style={styles.jobDetailValue}>
                            {formatDateTime(jobForSelectedRequest.scheduledDate)}
                          </Text>
                        </View>
                      )}
                      {jobForSelectedRequest.estimatedCost && (
                        <View style={styles.jobDetailRow}>
                          <Text style={styles.jobDetailLabel}>Est. Cost</Text>
                          <Text style={styles.jobDetailValue}>
                            AED {jobForSelectedRequest.estimatedCost}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noJobCard}>
                      <Ionicons name="construct-outline" size={24} color="#9CA3AF" />
                      <Text style={styles.noJobText}>No work order created yet</Text>
                      <Text style={styles.noJobHint}>Create a job from the Jobs tab to assign this request</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {detailTab === "notes" && (
              <View style={styles.notesSection}>
                <Text style={styles.sectionTitle}>Internal Notes</Text>
                <Text style={styles.sectionSubtitle}>Management-only notes, not visible to tenants</Text>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Add internal note..."
                    value={newNote}
                    onChangeText={setNewNote}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.addButton, !newNote.trim() && styles.addButtonDisabled]}
                    onPress={handleAddNote}
                    disabled={!newNote.trim()}
                  >
                    <Text style={styles.addButtonText}>Add Note</Text>
                  </TouchableOpacity>
                </View>

                {selectedRequest?.notes && selectedRequest.notes.length > 0 ? (
                  selectedRequest.notes.map((note) => (
                    <View key={note.id} style={styles.noteCard}>
                      <View style={styles.noteHeader}>
                        <Text style={styles.noteAuthor}>{note.authorName}</Text>
                        <Text style={styles.noteTime}>{formatDateTime(note.createdAt)}</Text>
                      </View>
                      <Text style={styles.noteBody}>{note.body}</Text>
                      <View style={styles.noteFooter}>
                        <Text style={styles.noteVisibility}>Visibility: {note.visibility}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No notes yet</Text>
                )}
              </View>
            )}

            {detailTab === "messages" && (
              <View style={styles.messagesSection}>
                <Text style={styles.sectionTitle}>Messages</Text>
                <Text style={styles.sectionSubtitle}>Communication thread for this request</Text>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Type message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.addButton, !newMessage.trim() && styles.addButtonDisabled]}
                    onPress={handleAddMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Text style={styles.addButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>

                {selectedRequest?.messages && selectedRequest.messages.length > 0 ? (
                  selectedRequest.messages.map((message) => (
                    <View key={message.id} style={styles.messageCard}>
                      <View style={styles.messageHeader}>
                        <Text style={styles.messageSender}>{message.senderName}</Text>
                        <Text style={styles.messageRole}>({message.senderRole})</Text>
                      </View>
                      <Text style={styles.messageBody}>{message.body}</Text>
                      <Text style={styles.messageTime}>{formatDateTime(message.createdAt)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No messages yet</Text>
                )}
              </View>
            )}

            {detailTab === "timeline" && (
              <View style={styles.timelineSection}>
                <Text style={styles.sectionTitle}>Activity Timeline</Text>
                <Text style={styles.sectionSubtitle}>Full history of this request</Text>

                {selectedRequest?.timeline && selectedRequest.timeline.length > 0 ? (
                  selectedRequest.timeline.map((event, index) => (
                    <View key={event.id} style={styles.timelineItem}>
                      <View style={styles.timelineDot} />
                      {index < (selectedRequest.timeline?.length || 0) - 1 && <View style={styles.timelineLine} />}
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>{event.title}</Text>
                        {event.description && (
                          <Text style={styles.timelineDescription}>{event.description}</Text>
                        )}
                        {event.actorName && (
                          <Text style={styles.timelineActor}>by {event.actorName}</Text>
                        )}
                        <Text style={styles.timelineTime}>{formatDateTime(event.createdAt)}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No timeline events</Text>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    marginTop: 20,
  },
  summaryRowCompact: {
    flexDirection: "column",
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  summaryMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  filterRow: {
    marginTop: 16,
  },
  filterRowContent: {
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#1D4ED8",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  searchRow: {
    marginTop: 20,
    gap: 16,
  },
  secondaryFilterRow: {
    marginTop: 16,
    gap: 10,
  },
  secondaryFilterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  secondaryFilterPills: {
    gap: 10,
    paddingTop: 4,
  },
  secondaryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  secondaryPillActive: {
    backgroundColor: "#1D4ED8",
  },
  secondaryPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  secondaryPillTextActive: {
    color: "#FFFFFF",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  statusFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statusFilterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
  },
  statusFilterButtonActive: {
    backgroundColor: "#1D4ED8",
  },
  statusFilterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusFilterLabelActive: {
    color: "#FFFFFF",
  },
  requestList: {
    marginTop: 16,
    gap: 16,
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  requestCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  requestHeaderLeft: {
    flex: 1,
    gap: 4,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  requestMeta: {
    fontSize: 13,
    color: "#6B7280",
  },
  requestDescription: {
    fontSize: 14,
    color: "#4B5563",
  },
  requestFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  footerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerMetaText: {
    fontSize: 12,
    color: "#64748B",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 64,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  emptyStateBody: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.2)",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  modalContent: {
    padding: 24,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563EB",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  tabTextActive: {
    color: "#2563EB",
    fontWeight: "600",
  },
  overviewSection: {
    gap: 16,
  },
  detailRow: {
    flexDirection: "row",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  assignmentSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  assignmentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  assignmentMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  jobStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
  },
  jobStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  notesSection: {
    gap: 16,
  },
  messagesSection: {
    gap: 16,
  },
  timelineSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: -8,
  },
  inputGroup: {
    gap: 12,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
    minHeight: 80,
  },
  addButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.5,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  noteCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  noteTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  noteBody: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  noteFooter: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
    marginTop: 4,
  },
  noteVisibility: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  messageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  messageRole: {
    fontSize: 12,
    color: "#6B7280",
  },
  messageBody: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "right",
  },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    position: "relative",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    marginTop: 4,
  },
  timelineLine: {
    position: "absolute",
    left: 4.5,
    top: 14,
    bottom: -16,
    width: 1,
    backgroundColor: "#D1D5DB",
  },
  timelineContent: {
    flex: 1,
    gap: 4,
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  timelineDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  timelineActor: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  timelineTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 24,
    fontStyle: "italic",
  },
  jobDetailsCard: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  jobDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobDetailLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748B",
  },
  jobDetailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E40AF",
  },
  noJobCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  noJobText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  noJobHint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
