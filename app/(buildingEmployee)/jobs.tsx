import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import apiService from "../../lib/services/api";
import { getUserErrorMessage } from "../../lib/services/api/errors";
import { maintenanceApi } from "../../lib/services/api/maintenance";
import { uploadFileToServer } from "../../lib/utils/fileUpload";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";

type StaffRequestStatus =
  | "pending"
  | "assigned"
  | "in-progress"
  | "on-hold"
  | "completed"
  | "cancelled";

type StaffJob = {
  id: string;
  title: string;
  description?: string;
  status: StaffRequestStatus;
  priority: "low" | "medium" | "high" | "urgent";
  createdAt?: string;
  buildingId?: number;
  buildingName?: string;
  unitNumber?: string;
};

type JobStatusFilter = "all" | StaffRequestStatus;

// Map backend status codes to frontend-friendly statuses
const mapStatusFromBackend = (status: number): StaffRequestStatus => {
  switch (status) {
    case 1:
      return "pending";
    case 2:
      return "assigned";
    case 3:
      return "in-progress";
    case 4:
      return "on-hold";
    case 5:
      return "completed";
    case 6:
      return "cancelled";
    default:
      return "pending";
  }
};

const mapPriorityFromBackend = (priority: number): StaffJob["priority"] => {
  switch (priority) {
    case 1:
      return "low";
    case 2:
      return "medium";
    case 3:
      return "high";
    case 4:
      return "urgent";
    default:
      return "medium";
  }
};

const STATUS_CODES = {
  inProgress: 3,
  onHold: 4,
  completed: 5,
} as const;

const normalizeId = (value: number | string | null | undefined): number | undefined => {
  if (value == null) return undefined;
  const num = typeof value === "string" ? parseInt(value.replace(/\D/g, ""), 10) : value;
  return Number.isFinite(num) ? num : undefined;
};

export default function BuildingEmployeeJobsScreen() {
  const { isAuthenticated, currentUser, notifications } = useApp();
  const tabBarHeight = useBottomTabBarHeight();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobStatusFilter>("all");
  const [assignedJobs, setAssignedJobs] = useState<StaffJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<StaffJob | null>(null);
  const [detailNote, setDetailNote] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [jobComments, setJobComments] = useState<
    {
      id: number | string;
      commentText: string;
      createdAt: string;
      userId?: number | string;
      user?: { userId?: number; fullName?: string; name?: string; email?: string };
      userName?: string;
    }[]
  >([]);
  const [jobAttachments, setJobAttachments] = useState<{
    id: number;
    fileUrl: string;
    fileName: string;
    contentType: string;
  }[]>([]);
  const [managerNames, setManagerNames] = useState<Record<string, string>>({});
  const fetchedManagerBuildingsRef = useRef<Set<number>>(new Set());
  const managerNamesRef = useRef<Record<string, string>>({});
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});
  const tenantNamesRef = useRef<Record<string, string>>({});
  const isJobClosed =
    selectedJob?.status === "completed" || selectedJob?.status === "cancelled";

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  const staffId = useMemo(() => {
    if (!currentUser?.id) return null;
    const parsed = Number(
      (currentUser as any).staffId ||
        (currentUser as any).maintenanceStaffId ||
        (currentUser.profile as any)?.staffId ||
        currentUser.id,
    );
    return Number.isFinite(parsed) ? parsed : null;
  }, [currentUser]);

  const fetchAssignedJobs = useCallback(async () => {
    if (!staffId) {
      setAssignedJobs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await maintenanceApi.getMaintenanceRequestsByStaffId(staffId);
      if (response.success && Array.isArray(response.data)) {
        const mapped: StaffJob[] = response.data.map((item: any) => ({
          id: String(item.id),
          title: item.title || "Maintenance request",
          description: item.description || "",
          status: mapStatusFromBackend(item.status),
          priority: mapPriorityFromBackend(item.priority),
          createdAt: item.createdAt,
          buildingId: normalizeId(item.buildingId ?? item.building?.id ?? (item as any).buildingID),
          buildingName: item.buildingName,
          unitNumber: item.unitNumber,
        }));

        // Sort by createdAt date, newest first
        mapped.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setAssignedJobs(mapped);
      } else {
        setAssignedJobs([]);
      }
    } catch (error) {
      console.error("[BuildingEmployeeJobs] Failed to fetch assigned jobs", error);
      showErrorAlert(error);
      setAssignedJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchAssignedJobs();
  }, [fetchAssignedJobs]);

  const filteredJobs = useMemo(() => {
    if (selectedStatus === "all") {
      return assignedJobs;
    }
    return assignedJobs.filter((job) => job.status === selectedStatus);
  }, [assignedJobs, selectedStatus]);

  const hasUnreadNotifications =
    notifications?.some((notification) => !notification.read) ?? false;

  const stats = useMemo(
    () => ({
      total: assignedJobs.length,
      inProgress: assignedJobs.filter((job) => job.status === "in-progress").length,
      onHold: assignedJobs.filter((job) => job.status === "on-hold").length,
      completed: assignedJobs.filter((job) => job.status === "completed").length,
    }),
    [assignedJobs],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAssignedJobs();
    setRefreshing(false);
  };

  const filters: { label: string; value: JobStatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "In Progress", value: "in-progress" },
    { label: "On Hold", value: "on-hold" },
    { label: "Completed", value: "completed" },
  ];

  const statusBadgeStyle = (status: StaffRequestStatus) => {
    switch (status) {
      case "pending":
      case "assigned":
        return { bg: "#FEF3C7", color: "#92400E", label: "Pending" };
      case "in-progress":
        return { bg: "#DBEAFE", color: "#1D4ED8", label: "In Progress" };
      case "on-hold":
        return { bg: "#FFE4E6", color: "#BE123C", label: "On Hold" };
      case "completed":
        return { bg: "#DCFCE7", color: "#047857", label: "Completed" };
      case "cancelled":
        return { bg: "#FEE2E2", color: "#B91C1C", label: "Cancelled" };
      default:
        return { bg: "#E5E7EB", color: "#374151", label: status };
    }
  };

  const fetchManagerNamesForBuilding = useCallback(
    async (buildingId?: number | string) => {
      if (buildingId == null) return;

      const buildingIdNum =
        typeof buildingId === "string"
          ? parseInt(String(buildingId).replace(/\D/g, ""), 10)
          : buildingId;

      if (!Number.isFinite(buildingIdNum)) return;
      if (fetchedManagerBuildingsRef.current.has(buildingIdNum)) return;

      try {
        const response = await apiService.admin.getBuildingManagers(buildingIdNum);
        if (response.success && Array.isArray(response.data)) {
          const mapped: Record<string, string> = {};
          response.data.forEach((mgr: any) => {
            const displayName =
              mgr.fullName ||
              mgr.name ||
              mgr.email ||
              (mgr.userId ? `User ${mgr.userId}` : "Manager");

            const possibleIds = [mgr.userId, mgr.managerId, mgr.id];
            possibleIds.forEach((pid) => {
              if (pid != null) {
                mapped[String(pid)] = displayName;
              }
            });
          });

          fetchedManagerBuildingsRef.current.add(buildingIdNum);
          managerNamesRef.current = { ...managerNamesRef.current, ...mapped };
          setManagerNames((prev) => ({ ...prev, ...mapped }));
        }
      } catch (error) {
        console.warn("[BuildingEmployeeJobs] Failed to fetch building managers", error);
      }
    },
    [],
  );

  const resolveCommentAuthor = useCallback(
    (comment: any): string => {
      const commentUserIdRaw =
        comment.userId ?? comment.user?.userId ?? comment.user?.id ?? comment.user?.userID ?? "";
      const commentUserId = commentUserIdRaw ? String(commentUserIdRaw) : "";
      const staffIdStr = staffId != null ? String(staffId) : null;
      const currentUserId =
        currentUser?.id !== undefined && currentUser?.id !== null
          ? String(currentUser.id)
          : null;

      const workerName =
        (currentUser as any)?.name ||
        (currentUser as any)?.fullName ||
        currentUser?.email;

      if (commentUserId && staffIdStr && commentUserId === staffIdStr) {
        return workerName || `User ${commentUserId}`;
      }
      if (commentUserId && currentUserId && commentUserId === currentUserId && workerName) {
        return workerName;
      }

      const managerName = managerNamesRef.current[commentUserId];
      if (managerName) return managerName;

      const tenantName = tenantNamesRef.current[commentUserId];
      if (tenantName) return tenantName;

      const directName =
        comment.user?.fullName ||
        comment.user?.name ||
        comment.user?.email ||
        comment.userName ||
        comment.author;

      if (directName) return directName;
      if (commentUserId) return `User ${commentUserId}`;
      return "User";
    },
    [currentUser, staffId],
  );

  useEffect(() => {
    fetchManagerNamesForBuilding(
      selectedJob?.buildingId ?? normalizeId(currentUser?.profile?.buildingId),
    );
  }, [selectedJob?.buildingId, currentUser?.profile?.buildingId, fetchManagerNamesForBuilding]);

  // Once worker and manager names are known, resolve any remaining commenter as tenant
  useEffect(() => {
    const workerIdStr = staffId != null ? String(staffId) : null;
    const workerName =
      (currentUser as any)?.name || (currentUser as any)?.fullName || currentUser?.email || null;
    const hasManagerNames = Object.keys(managerNamesRef.current).length > 0;

    if (!workerIdStr || !workerName || !hasManagerNames || jobComments.length === 0) {
      return;
    }

    // Find a commenter that is not the worker or a manager and hasn't been resolved yet
    const unknownComment = jobComments.find((comment) => {
      const idRaw =
        comment.userId ??
        comment.user?.userId ??
        comment.user?.id ??
        (comment.user as any)?.userID ??
        null;
      if (!idRaw) return false;
      const idStr = String(idRaw);
      if (idStr === workerIdStr) return false;
      if (managerNamesRef.current[idStr]) return false;
      if (tenantNamesRef.current[idStr]) return false;
      return true;
    });

    if (!unknownComment) return;

    const unknownIdRaw =
      unknownComment.userId ??
      unknownComment.user?.userId ??
      unknownComment.user?.id ??
      (unknownComment.user as any)?.userID;
    const unknownIdStr = unknownIdRaw ? String(unknownIdRaw) : "";
    const tenantIdNum = normalizeId(unknownIdRaw as any);

    const storeTenantName = (name: string) => {
      tenantNamesRef.current = { ...tenantNamesRef.current, [unknownIdStr]: name };
      setTenantNames((prev) => ({ ...prev, [unknownIdStr]: name }));
    };

    if (!tenantIdNum) {
      storeTenantName("Tenant");
      return;
    }

    (async () => {
      try {
        const response = await apiService.tenants.getTenantById(tenantIdNum);
        if (response.success && response.data) {
          const tenantName =
            response.data.fullName ||
            response.data.name ||
            response.data.email ||
            `Tenant ${unknownIdStr}`;
          storeTenantName(tenantName);
        } else {
          storeTenantName("Tenant");
        }
      } catch (error) {
        console.warn("[BuildingEmployeeJobs] Failed to fetch tenant name", error);
        storeTenantName("Tenant");
      }
    })();
  }, [jobComments, staffId, currentUser, managerNames, tenantNames]);

  const handleOpenJob = async (job: StaffJob) => {
    setSelectedJob(job);
    setDetailNote("");
    setJobComments([]);
    setJobAttachments([]);

    // Fetch fresh details (description/building/comments/attachments) when opening the modal
    setDetailLoading(true);
    try {
      const response = await maintenanceApi.getMaintenanceRequestById(job.id);
      if (response.success && response.data) {
        const apiRequest = response.data;
        const resolvedBuildingId = normalizeId(
          apiRequest.buildingId ??
            apiRequest.building?.id ??
            (apiRequest as any).buildingID ??
            job.buildingId ??
            currentUser?.profile?.buildingId,
        );
        const mappedJob: StaffJob = {
          id: String(apiRequest.id ?? job.id),
          title: apiRequest.title || job.title,
          description: apiRequest.description || job.description || "",
          status: mapStatusFromBackend(apiRequest.status ?? job.status),
          priority: mapPriorityFromBackend(apiRequest.priority ?? job.priority),
          createdAt: apiRequest.createdAt || job.createdAt,
          buildingId: Number.isFinite(resolvedBuildingId) ? resolvedBuildingId : undefined,
          buildingName: apiRequest.buildingName || job.buildingName,
          unitNumber: apiRequest.unitNumber || job.unitNumber,
        };
        setSelectedJob(mappedJob);
        setAssignedJobs((prev) =>
          prev.map((item) => (item.id === mappedJob.id ? mappedJob : item)),
        );

        // Fetch managers for this building once so we can resolve names in comments
        fetchManagerNamesForBuilding(mappedJob.buildingId);

        // Set comments and attachments
        if (apiRequest.comments && Array.isArray(apiRequest.comments)) {
          setJobComments(apiRequest.comments);
        }
        if (apiRequest.attachments && Array.isArray(apiRequest.attachments)) {
          setJobAttachments(apiRequest.attachments);
        }
      }
    } catch (error) {
      console.warn("[BuildingEmployeeJobs] Failed to refresh request details", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (newStatusCode: number, nextStatus: StaffRequestStatus) => {
    if (!selectedJob || !staffId) return;

    // Show confirmation for marking as completed
    if (nextStatus === "completed") {
      Alert.alert(
        "Mark as Completed",
        "Are you sure you want to mark this request as completed?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Complete",
            style: "default",
            onPress: async () => {
              await performStatusUpdate(newStatusCode, nextStatus);
            }
          }
        ]
      );
      return;
    }

    // For other statuses, update directly
    await performStatusUpdate(newStatusCode, nextStatus);
  };

  const performStatusUpdate = async (newStatusCode: number, nextStatus: StaffRequestStatus) => {
    if (!selectedJob || !staffId) return;
    setStatusUpdating(true);
    try {
      await maintenanceApi.updateMaintenanceRequestStatus({
        requestId: Number(selectedJob.id),
        newStatus: newStatusCode,
        changedById: staffId,
        note: detailNote.trim() || undefined,
      });

      setAssignedJobs((prev) =>
        prev.map((job) =>
          job.id === selectedJob.id ? { ...job, status: nextStatus } : job,
        ),
      );
      setSelectedJob((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      showSuccessAlert(`Request marked as ${statusBadgeStyle(nextStatus).label}.`);
    } catch (error) {
      console.error("[BuildingEmployeeJobs] Failed to update status", error);
      showErrorAlert(error);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedJob || !staffId || !commentText.trim() || isJobClosed) return;

    setIsAddingComment(true);
    try {
      await maintenanceApi.addMaintenanceRequestComment({
        requestId: Number(selectedJob.id),
        userId: staffId,
        commentText: commentText.trim(),
      });

      // Refresh comments list
      const response = await maintenanceApi.getMaintenanceRequestById(selectedJob.id);
      if (response.success && response.data?.comments) {
        setJobComments(response.data.comments);
      }

      showSuccessAlert("Comment added successfully");
      setCommentText("");
    } catch (error) {
      console.error("[BuildingEmployeeJobs] Failed to add comment", error);
      showErrorAlert(error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handlePickImage = async () => {
    if (!selectedJob || !staffId) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAttachment(result.assets[0].uri, result.assets[0].fileName || 'image.jpg');
      }
    } catch (error) {
      console.error("[BuildingEmployeeJobs] Failed to pick image", error);
      showErrorAlert(error);
    }
  };

  const handlePickDocument = async () => {
    if (!selectedJob || !staffId) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        await uploadAttachment(file.uri, file.name);
      }
    } catch (error) {
      console.error("[BuildingEmployeeJobs] Failed to pick document", error);
      showErrorAlert(error);
    }
  };

  const uploadAttachment = async (fileUri: string, fileName: string) => {
    if (!selectedJob || !staffId) return;

    setIsUploadingAttachment(true);
    try {
      // Upload file to server (currently using mock - see fileUpload.ts)
      const uploadedUrl = await uploadFileToServer(fileUri, Number(selectedJob.id));

      // Get file extension to determine content type
      const extension = fileName.split('.').pop()?.toLowerCase() || '';
      let contentType = 'application/octet-stream';

      if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      } else if (extension === 'pdf') {
        contentType = 'application/pdf';
      } else if (extension === 'doc') {
        contentType = 'application/msword';
      } else if (extension === 'docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      }

      // Add attachment to maintenance request
      await maintenanceApi.addMaintenanceRequestAttachment({
        requestId: Number(selectedJob.id),
        uploadedById: staffId,
        fileUrl: uploadedUrl,
        fileName: fileName,
        contentType: contentType,
      });

      // Refresh attachments list
      const response = await maintenanceApi.getMaintenanceRequestById(selectedJob.id);
      if (response.success && response.data?.attachments) {
        setJobAttachments(response.data.attachments);
      }

      showSuccessAlert("Attachment uploaded successfully");
    } catch (error) {
      console.error("[BuildingEmployeeJobs] Failed to upload attachment", error);
      showErrorAlert(error);
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleTakePhoto = async () => {
    if (!selectedJob || !staffId) return;

    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow camera access to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAttachment(result.assets[0].uri, result.assets[0].fileName || 'photo.jpg');
      }
    } catch (error) {
      console.error("[BuildingEmployeeJobs] Failed to take photo", error);
      showErrorAlert(error);
    }
  };

  const showAttachmentOptions = () => {
    Alert.alert(
      "Add Attachment",
      "Choose attachment source",
      [
        {
          text: "Take Photo",
          onPress: handleTakePhoto,
        },
        {
          text: "Photo Library",
          onPress: handlePickImage,
        },
        {
          text: "Document",
          onPress: handlePickDocument,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  if (!isAuthenticated || !currentUser) {
    return null;
  }

  if (currentUser.role !== "building_employee") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed-outline" size={48} color="#94A3B8" />
          <Text style={styles.emptyTitle}>Access Restricted</Text>
          <Text style={styles.emptySubtitle}>
            This workspace is only available to building employees.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 32 + tabBarHeight },
        ]}
      >
        <HeaderBar
          title="Maintenance Jobs"
          subtitle={`${filteredJobs.length} ${filteredJobs.length === 1 ? "job" : "jobs"}`}
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        {!staffId && (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={40} color="#F59E0B" />
            <Text style={styles.emptyCardTitle}>No staff ID found</Text>
            <Text style={styles.emptyCardSubtitle}>
              We could not detect your maintenance staff ID. Please re-login or contact support.
            </Text>
          </View>
        )}

        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.filtersContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {filters.map((filter) => {
              const active = selectedStatus === filter.value;
              return (
                <TouchableOpacity
                  key={filter.value}
                  style={[
                    styles.filterChip,
                    active && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedStatus(filter.value)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(400)}
          style={styles.summaryRow}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {stats.inProgress}
            </Text>
            <Text style={styles.summaryLabel}>In Progress</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {stats.onHold}
            </Text>
            <Text style={styles.summaryLabel}>On Hold</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {stats.completed}
            </Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(400)}
          style={styles.listContainer}
        >
          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.emptyCardSubtitle}>Loading assigned jobs...</Text>
            </View>
          ) : filteredJobs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="construct-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyCardTitle}>No jobs to show</Text>
              <Text style={styles.emptyCardSubtitle}>
                Jobs assigned to you will appear here.
              </Text>
            </View>
          ) : (
            filteredJobs.map((job) => {
              const statusToken = statusBadgeStyle(job.status);
              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  activeOpacity={0.9}
                  onPress={() => handleOpenJob(job)}
                >
                  <View style={styles.jobHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusToken.bg }]}>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: statusToken.color },
                        ]}
                      >
                        {statusToken.label}
                      </Text>
                    </View>
                    {job.priority && (
                      <Text style={styles.priorityText}>
                        {job.priority.toUpperCase()} PRIORITY
                      </Text>
                    )}
                  </View>
                  <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
                  {job.description ? (
                    <Text style={styles.jobDescription} numberOfLines={3}>
                      {job.description}
                    </Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <Ionicons name="home-outline" size={16} color="#6B7280" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {job.buildingName || "Assigned building"} · {job.unitNumber || "Unit"}
                    </Text>
                  </View>

                  {job.createdAt && (
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {new Date(job.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </Animated.View>
      </ScrollView>

      {/* Request detail modal */}
      <Modal
        visible={!!selectedJob}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedJob(null)}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleWrap}>
                  <Ionicons name="construct-outline" size={22} color="#111827" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle} numberOfLines={2}>
                      {selectedJob?.title}
                    </Text>
                    {selectedJob?.buildingName ? (
                      <Text style={styles.modalSubtitle} numberOfLines={1}>
                        {selectedJob.buildingName}
                        {selectedJob.unitNumber ? ` · ${selectedJob.unitNumber}` : ""}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => setSelectedJob(null)}>
                  <Ionicons name="close" size={22} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
              {selectedJob ? (
              <>
                <View style={[styles.statusBadge, { backgroundColor: statusBadgeStyle(selectedJob.status).bg, alignSelf: "flex-start" }]}>
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: statusBadgeStyle(selectedJob.status).color },
                    ]}
                  >
                    {statusBadgeStyle(selectedJob.status).label}
                  </Text>
                </View>

                <View style={styles.modalMeta}>
                  <View style={styles.metaRow}>
                    <Ionicons name="flag-outline" size={16} color="#6B7280" />
                    <Text style={styles.metaText}>
                      Priority: {selectedJob.priority.toUpperCase()}
                    </Text>
                  </View>
                  {selectedJob.createdAt && (
                    <View style={styles.metaRow}>
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <Text style={styles.metaText}>
                        Created {new Date(selectedJob.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>

                {detailLoading ? (
                  <View style={styles.loadingInline}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.emptyCardSubtitle}>Fetching latest details...</Text>
                  </View>
                ) : selectedJob.description ? (
                  <Text style={styles.modalDescription}>{selectedJob.description}</Text>
                ) : null}

                

                {isJobClosed && (
                  <View style={styles.completedBanner}>
                    <Ionicons name="checkmark-done-outline" size={18} color="#047857" />
                    <Text style={styles.completedBannerText}>
                      {selectedJob.status === "cancelled"
                        ? "This request is cancelled. Commenting and attachments are disabled."
                        : "This request is completed. Commenting and attachments are disabled."}
                    </Text>
                  </View>
                )}

                {/* Comment Section */}
                <View style={styles.commentBox}>
                  <Text style={styles.label}>Add Comment</Text>
                  <TextInput
                    style={styles.noteInput}
                    placeholder={
                      isJobClosed
                        ? "Commenting is disabled for closed requests."
                        : "Add a comment about this request..."
                    }
                    multiline
                    value={commentText}
                    onChangeText={setCommentText}
                    editable={!isJobClosed}
                  />
                  <TouchableOpacity
                    style={[
                      styles.addCommentButton,
                      (!commentText.trim() || isAddingComment || isJobClosed) && styles.disabledButton
                    ]}
                    onPress={handleAddComment}
                    disabled={!commentText.trim() || isAddingComment || isJobClosed}
                  >
                    {isAddingComment ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="chatbox-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.addCommentButtonText}>Add Comment</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Attachment Section */}
                <View style={styles.attachmentBox}>
                  <Text style={styles.label}>Add Attachment</Text>
                  <TouchableOpacity
                    style={[
                      styles.attachmentButton,
                      (isUploadingAttachment || isJobClosed) && styles.disabledButton
                    ]}
                    onPress={showAttachmentOptions}
                    disabled={isUploadingAttachment || isJobClosed}
                  >
                    {isUploadingAttachment ? (
                      <ActivityIndicator size="small" color="#2563EB" />
                    ) : (
                      <>
                        <Ionicons name="attach" size={20} color="#2563EB" />
                        <Text style={styles.attachmentButtonText}>Upload Photo or Document</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Display Existing Comments */}
                {jobComments.length > 0 && (
                  <View style={styles.displaySection}>
                    <Text style={styles.sectionTitle}>Comments ({jobComments.length})</Text>
                    <View style={styles.commentsList}>
                      {jobComments
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((comment) => {
                          const author = resolveCommentAuthor(comment);
                          return (
                            <View key={comment.id} style={styles.commentItem}>
                              <View style={styles.commentHeader}>
                                <Ionicons name="person-circle" size={20} color="#6B7280" />
                                <Text style={styles.commentUser}>{author}</Text>
                                <Text style={styles.commentTime}>
                                  {new Date(comment.createdAt).toLocaleString()}
                                </Text>
                              </View>
                              <Text style={styles.commentContent}>{comment.commentText}</Text>
                            </View>
                          );
                        })}
                    </View>
                  </View>
                )}

                {/* Display Existing Attachments */}
                {jobAttachments.length > 0 && (
                  <View style={styles.displaySection}>
                    <Text style={styles.sectionTitle}>Attachments ({jobAttachments.length})</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.attachmentsList}
                    >
                      {jobAttachments.map((attachment) => {
                        const isImage = attachment.contentType.startsWith('image/');
                        return (
                          <TouchableOpacity
                            key={attachment.id}
                            style={styles.attachmentItem}
                            onPress={() => {
                              if (isImage) {
                                // Open image in full screen or external viewer
                                Linking.openURL(attachment.fileUrl);
                              } else {
                                // Open document in browser
                                Linking.openURL(attachment.fileUrl);
                              }
                            }}
                          >
                            {isImage ? (
                              <Image
                                source={{ uri: attachment.fileUrl }}
                                style={styles.attachmentImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.attachmentDoc}>
                                <Ionicons name="document-outline" size={40} color="#2563EB" />
                              </View>
                            )}
                            <Text style={styles.attachmentName} numberOfLines={1}>
                              {attachment.fileName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.modalActions}>
                  {selectedJob.status === "in-progress" && (
                    <>
                      <TouchableOpacity
                        style={[styles.secondaryButton, statusUpdating && styles.disabledButton]}
                        disabled={statusUpdating}
                        onPress={() => updateStatus(STATUS_CODES.onHold, "on-hold")}
                      >
                        <Ionicons name="pause" size={18} color="#1F2937" />
                        <Text style={styles.secondaryButtonText}>Put On Hold</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.primaryButton, statusUpdating && styles.disabledButton]}
                        disabled={statusUpdating}
                        onPress={() => updateStatus(STATUS_CODES.completed, "completed")}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Mark Completed</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {selectedJob.status === "on-hold" && (
                    <>
                      <TouchableOpacity
                        style={[styles.secondaryButton, statusUpdating && styles.disabledButton]}
                        disabled={statusUpdating}
                        onPress={() => updateStatus(STATUS_CODES.inProgress, "in-progress")}
                      >
                        <Ionicons name="play" size={18} color="#1F2937" />
                        <Text style={styles.secondaryButtonText}>Resume Work</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.primaryButton, statusUpdating && styles.disabledButton]}
                        disabled={statusUpdating}
                        onPress={() => updateStatus(STATUS_CODES.completed, "completed")}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Mark Completed</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {selectedJob.status === "completed" && (
                    <Text style={styles.completedHint}>This request is already completed.</Text>
                  )}

                  {selectedJob.status !== "in-progress" &&
                    selectedJob.status !== "on-hold" &&
                    selectedJob.status !== "completed" && (
                      <Text style={styles.completedHint}>
                        This request is awaiting progress updates.
                      </Text>
                    )}
                </View>
              </>
            ) : null}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
        userRole={currentUser.role}
      />
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  filtersContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  filtersScrollContent: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#2563EB",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  listContainer: {
    gap: 16,
    width: '100%',
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 48,
    alignItems: "center",
    gap: 12,
  },
  emptyCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptyCardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    paddingHorizontal: 24,
    textAlign: "center",
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 32,
    alignItems: "center",
    gap: 12,
  },
  jobCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  jobDescription: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
    flexShrink: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modalScrollContent: {
    paddingBottom: 32,
    gap: 16,
  },
  modalTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  modalMeta: {
    gap: 6,
  },
  modalDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  noteBox: {
    gap: 8,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  commentBox: {
    gap: 8,
    marginTop: 8,
  },
  addCommentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    borderRadius: 10,
  },
  addCommentButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  attachmentBox: {
    gap: 8,
    marginTop: 8,
  },
  attachmentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
    paddingVertical: 16,
    borderRadius: 10,
  },
  attachmentButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
  modalActions: {
    gap: 10,
    marginTop: 24,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E5E7EB",
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.6,
  },
  completedHint: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF3",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
  },
  completedBannerText: {
    flex: 1,
    color: "#047857",
    fontSize: 13,
    fontWeight: "600",
  },
  loadingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displaySection: {
    gap: 12,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  commentsList: {
    gap: 12,
  },
  commentItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  commentTime: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  commentContent: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  attachmentsList: {
    flexDirection: "row",
  },
  attachmentItem: {
    marginRight: 12,
    width: 120,
    gap: 8,
  },
  attachmentImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  attachmentDoc: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentName: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
});
