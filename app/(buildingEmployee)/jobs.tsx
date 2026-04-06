import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
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
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { apiService } from "../../lib/services/api";
import { orgBuildingsApi } from "../../lib/services/api/org-buildings";
import { uploadFileToServer } from "../../lib/utils/fileUpload";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";
import { getUnreadNotificationsCount } from "../../lib/utils/helpers";

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
  buildingId?: string;
  buildingName?: string;
  unitNumber?: string;
};

type AssignedBuilding = {
  id: string;
  name: string;
  address?: string;
};

type JobStatusFilter = "all" | StaffRequestStatus;

const mapStatusFromBackend = (status: any): StaffRequestStatus => {
  if (typeof status === "number") {
    switch (status) {
      case 0:
      case 1:
        return "assigned";
      case 2:
        return "in-progress";
      case 3:
        return "completed";
      case 4:
        return "cancelled";
      case 5:
        return "completed";
      case 6:
        return "cancelled";
      default:
        return "assigned";
    }
  }

  const normalized = String(status || "").toUpperCase();
  if (["OPEN", "NEW", "PENDING", "ASSIGNED"].includes(normalized)) return "assigned";
  if (["IN_PROGRESS", "INPROGRESS"].includes(normalized)) return "in-progress";
  if (["COMPLETED", "DONE"].includes(normalized)) return "completed";
  if (["CANCELLED", "CANCELED"].includes(normalized)) return "cancelled";
  return "assigned";
};

const mapPriorityFromBackend = (priority: any): StaffJob["priority"] => {
  if (typeof priority === "number") {
    switch (priority) {
      case 0:
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
  }

  const normalized = String(priority || "").toUpperCase();
  if (["LOW", "1"].includes(normalized)) return "low";
  if (["MEDIUM", "NORMAL", "2"].includes(normalized)) return "medium";
  if (["HIGH", "3"].includes(normalized)) return "high";
  if (["URGENT", "4"].includes(normalized)) return "urgent";
  return "medium";
};

const normalizeId = (value: number | string | null | undefined): number | undefined => {
  if (value == null) return undefined;
  const num = typeof value === "string" ? parseInt(value.replace(/\D/g, ""), 10) : value;
  return Number.isFinite(num) ? num : undefined;
};

export default function BuildingEmployeeJobsScreen() {
  const { isAuthenticated, currentUser } = useAuth();
  const { notifications } = useNotifications();
  const tabBarHeight = useBottomTabBarHeight();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<JobStatusFilter>("all");
  const [assignedJobs, setAssignedJobs] = useState<StaffJob[]>([]);
  const [assignedBuildings, setAssignedBuildings] = useState<AssignedBuilding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<StaffJob | null>(null);
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
      user?: { id?: number | string; userId?: number; fullName?: string; name?: string; email?: string };
      userName?: string;
    }[]
  >([]);
  const [jobAttachments, setJobAttachments] = useState<{
    id: string;
    fileUrl: string;
    fileName: string;
    contentType: string;
  }[]>([]);
  const fetchedManagerBuildingsRef = useRef<Set<string>>(new Set());
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

  const staffId = useMemo(
    () => (currentUser?.id ? String(currentUser.id) : null),
    [currentUser?.id],
  );

  const fetchAssignedJobs = useCallback(async () => {
    if (!isAuthenticated || currentUser?.role !== "building_employee") {
      setAssignedJobs([]);
      setAssignedBuildings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const buildingsResponse = await orgBuildingsApi.getAssignedBuildings();
      const buildingsPayload = Array.isArray(buildingsResponse)
        ? buildingsResponse
        : Array.isArray(buildingsResponse?.data)
          ? buildingsResponse.data
          : [];

      const mappedBuildings: AssignedBuilding[] = buildingsPayload.map((building: any) => ({
        id: String(building?.id ?? building?.buildingId ?? ""),
        name:
          building?.name ||
          building?.buildingName ||
          building?.title ||
          "Building",
        address: building?.address,
      }));

      setAssignedBuildings(mappedBuildings);

      if (mappedBuildings.length === 0) {
        setAssignedJobs([]);
        return;
      }

      const jobArrays = await Promise.all(
        mappedBuildings.map(async (building) => {
          try {
            const response = await orgBuildingsApi.getBuildingRequests(building.id);
            const payload = Array.isArray(response)
              ? response
              : Array.isArray(response?.data)
                ? response.data
                : [];
            return payload.map((item: any) => {
              const unit = item?.unit || item?.unitDetails;
              return {
                id: String(item?.id ?? item?.requestId ?? ""),
                title: item?.title || "Maintenance request",
                description: item?.description || "",
                status: mapStatusFromBackend(item?.status),
                priority: mapPriorityFromBackend(item?.priority),
                createdAt: item?.createdAt || item?.created_at,
                buildingId: String(item?.buildingId ?? item?.building?.id ?? building.id),
                buildingName:
                  item?.building?.name ||
                  item?.buildingName ||
                  building.name,
                unitNumber:
                  unit?.label ||
                  item?.unitLabel ||
                  item?.unitNumber ||
                  item?.apartment ||
                  "",
              } as StaffJob;
            });
          } catch (error) {
            console.error(
              `[BuildingEmployeeJobs] Failed to fetch requests for building ${building.id}`,
              error,
            );
            return [];
          }
        }),
      );

      const mapped = jobArrays.flat();
      mapped.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setAssignedJobs(mapped);
    } catch (error) {
      console.error("[BuildingEmployeeJobs] Failed to fetch assigned jobs", error);
      showErrorAlert(error);
      setAssignedJobs([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.role, isAuthenticated]);

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
    getUnreadNotificationsCount(notifications || [], currentUser?.id) > 0;

  const stats = useMemo(
    () => ({
      total: assignedJobs.length,
      assigned: assignedJobs.filter(
        (job) => job.status === "assigned" || job.status === "pending",
      ).length,
      inProgress: assignedJobs.filter((job) => job.status === "in-progress").length,
      completed: assignedJobs.filter((job) => job.status === "completed").length,
      cancelled: assignedJobs.filter((job) => job.status === "cancelled").length,
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
    { label: "Assigned", value: "assigned" },
    { label: "In Progress", value: "in-progress" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  const statusBadgeStyle = (status: StaffRequestStatus) => {
    switch (status) {
      case "pending":
      case "assigned":
        return { bg: "#FEF3C7", color: "#92400E", label: "Assigned" };
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

      const buildingKey = String(buildingId);
      if (fetchedManagerBuildingsRef.current.has(buildingKey)) return;

      // Manager lookup endpoint is deprecated; rely on comment payloads instead.
      fetchedManagerBuildingsRef.current.add(buildingKey);
    },
    [],
  );

  const mapComments = useCallback(
    (payload: any[], jobId?: string): typeof jobComments => {
      const idBase = jobId || selectedJob?.id || "job";
      return payload.map((comment: any, index: number) => ({
        id: comment?.id ?? `${idBase}-comment-${index}`,
        commentText: comment?.message || comment?.commentText || comment?.text || "",
        createdAt: comment?.createdAt || comment?.created_at || new Date().toISOString(),
        userId: comment?.userId ?? comment?.user?.id ?? comment?.user?.userId,
        user: comment?.user,
        userName:
          comment?.userName ||
          comment?.author?.fullName ||
          comment?.author?.name ||
          comment?.author?.email,
      }));
    },
    [selectedJob?.id],
  );

  const mapAttachments = useCallback(
    (payload: any[], jobId?: string): typeof jobAttachments => {
      const idBase = jobId || selectedJob?.id || "job";
      return payload
        .map((attachment: any, index: number) => ({
          id: attachment?.id ?? `${idBase}-attachment-${index}`,
          fileUrl:
            attachment?.fileUrl ||
            attachment?.url ||
            attachment?.uri ||
            attachment?.path ||
            "",
          fileName:
            attachment?.fileName ||
            attachment?.name ||
            `Attachment ${index + 1}`,
          contentType:
            attachment?.mimeType ||
            attachment?.contentType ||
            "application/octet-stream",
        }))
        .filter((attachment) => Boolean(attachment.fileUrl));
    },
    [selectedJob?.id],
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
      selectedJob?.buildingId ?? currentUser?.profile?.buildingId,
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
  }, [jobComments, staffId, currentUser, tenantNames]);

  const handleOpenJob = async (job: StaffJob) => {
    setSelectedJob(job);
    setJobComments([]);
    setJobAttachments([]);

    // Fetch fresh details (description/building/comments/attachments) when opening the modal
    setDetailLoading(true);
    try {
      const buildingId =
        job.buildingId || currentUser?.profile?.buildingId || assignedBuildings[0]?.id;
      if (!buildingId) {
        throw new Error("No building assignment found for this request.");
      }

      const response = await orgBuildingsApi.getRequest(buildingId, job.id);
      const apiRequest = response?.data ?? response ?? {};
      const resolvedBuildingId = String(
        apiRequest?.buildingId ??
          apiRequest?.building?.id ??
          job.buildingId ??
          buildingId,
      );

      const unit = apiRequest?.unit || apiRequest?.unitDetails;
      const mappedJob: StaffJob = {
        id: String(apiRequest?.id ?? job.id),
        title: apiRequest?.title || job.title,
        description: apiRequest?.description || job.description || "",
        status: mapStatusFromBackend(apiRequest?.status ?? job.status),
        priority: mapPriorityFromBackend(apiRequest?.priority ?? job.priority),
        createdAt: apiRequest?.createdAt || job.createdAt,
        buildingId: resolvedBuildingId,
        buildingName:
          apiRequest?.building?.name ||
          apiRequest?.buildingName ||
          job.buildingName,
        unitNumber:
          unit?.label ||
          apiRequest?.unitLabel ||
          apiRequest?.unitNumber ||
          job.unitNumber,
      };

      setSelectedJob(mappedJob);
      setAssignedJobs((prev) =>
        prev.map((item) => (item.id === mappedJob.id ? mappedJob : item)),
      );

      fetchManagerNamesForBuilding(mappedJob.buildingId);

      const commentsResponse = await orgBuildingsApi.getComments(
        resolvedBuildingId,
        mappedJob.id,
      );
      const commentsPayload = Array.isArray(commentsResponse)
        ? commentsResponse
        : Array.isArray(commentsResponse?.data)
          ? commentsResponse.data
          : [];
      setJobComments(mapComments(commentsPayload, mappedJob.id));

      if (Array.isArray(apiRequest?.attachments)) {
        setJobAttachments(mapAttachments(apiRequest.attachments, mappedJob.id));
      } else {
        setJobAttachments([]);
      }
    } catch (error) {
      console.warn("[BuildingEmployeeJobs] Failed to refresh request details", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (
    apiStatus: "IN_PROGRESS" | "COMPLETED",
    nextStatus: StaffRequestStatus,
  ) => {
    if (!selectedJob) return;

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
              await performStatusUpdate(apiStatus, nextStatus);
            }
          }
        ]
      );
      return;
    }

    // For other statuses, update directly
    await performStatusUpdate(apiStatus, nextStatus);
  };

  const performStatusUpdate = async (
    apiStatus: "IN_PROGRESS" | "COMPLETED",
    nextStatus: StaffRequestStatus,
  ) => {
    if (!selectedJob) return;
    setStatusUpdating(true);
    try {
      const buildingId =
        selectedJob.buildingId || currentUser?.profile?.buildingId || assignedBuildings[0]?.id;
      if (!buildingId) {
        throw new Error("No building assignment found for this request.");
      }

      const response = await orgBuildingsApi.updateRequestStatus(
        buildingId,
        selectedJob.id,
        apiStatus,
      );
      const responseHasSuccess =
        response && typeof response === "object" && "success" in response;
      if (responseHasSuccess && response.success === false) {
        throw new Error(response.message || "Failed to update request status");
      }

      const updatedStatus = mapStatusFromBackend(
        response?.data?.status ?? apiStatus,
      );

      setAssignedJobs((prev) =>
        prev.map((job) =>
          job.id === selectedJob.id ? { ...job, status: updatedStatus } : job,
        ),
      );
      setSelectedJob((prev) => (prev ? { ...prev, status: updatedStatus } : prev));
      showSuccessAlert(`Request marked as ${statusBadgeStyle(updatedStatus).label}.`);
    } catch (error) {
      console.error("[BuildingEmployeeJobs] Failed to update status", error);
      showErrorAlert(error);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedJob || !commentText.trim() || isJobClosed) return;

    const buildingId =
      selectedJob.buildingId || currentUser?.profile?.buildingId || assignedBuildings[0]?.id;
    if (!buildingId) {
      showErrorAlert(new Error("No building assignment found for this request."));
      return;
    }

    setIsAddingComment(true);
    try {
      const response = await orgBuildingsApi.addComment(
        buildingId,
        selectedJob.id,
        commentText.trim(),
      );
      const responseHasSuccess =
        response && typeof response === "object" && "success" in response;
      if (responseHasSuccess && response.success === false) {
        throw new Error(response.message || "Failed to add comment");
      }

      const refreshed = await orgBuildingsApi.getComments(
        buildingId,
        selectedJob.id,
      );
      const refreshedPayload = Array.isArray(refreshed)
        ? refreshed
        : Array.isArray(refreshed?.data)
          ? refreshed.data
          : [];
      setJobComments(mapComments(refreshedPayload, selectedJob.id));

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
    if (!selectedJob) return;

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
    if (!selectedJob) return;

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
    if (!selectedJob) return;

    const buildingId =
      selectedJob.buildingId || currentUser?.profile?.buildingId || assignedBuildings[0]?.id;
    if (!buildingId) {
      showErrorAlert(new Error("No building assignment found for this request."));
      return;
    }

    setIsUploadingAttachment(true);
    try {
      // Upload file to server (currently using mock - see fileUpload.ts)
      const uploadedUrl = await uploadFileToServer(fileUri);

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

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const sizeBytes =
        fileInfo.exists && typeof fileInfo.size === "number" ? fileInfo.size : 0;

      const response = await orgBuildingsApi.addAttachments(
        buildingId,
        selectedJob.id,
        [
          {
            fileName,
            mimeType: contentType,
            sizeBytes,
            url: uploadedUrl,
          },
        ],
      );
      const responseHasSuccess =
        response && typeof response === "object" && "success" in response;
      if (responseHasSuccess && response.success === false) {
        throw new Error(response.message || "Failed to upload attachment");
      }

      const refreshed = await orgBuildingsApi.getRequest(buildingId, selectedJob.id);
      const apiRequest = refreshed?.data ?? refreshed ?? {};
      if (Array.isArray(apiRequest.attachments)) {
        setJobAttachments(mapAttachments(apiRequest.attachments, selectedJob.id));
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
    if (!selectedJob) return;

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
              {stats.assigned}
            </Text>
            <Text style={styles.summaryLabel}>Assigned</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {stats.inProgress}
            </Text>
            <Text style={styles.summaryLabel}>In Progress</Text>
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
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
          >
            <View style={styles.modalCard}>
              {/* Fixed Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleWrap}>
                  <Ionicons name="construct-outline" size={24} color="#2563EB" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle} numberOfLines={2}>
                      {selectedJob?.title}
                    </Text>
                    {selectedJob?.buildingName ? (
                      <Text style={styles.modalSubtitle} numberOfLines={1}>
                        {selectedJob.buildingName}
                        {selectedJob.unitNumber ? ` · Unit ${selectedJob.unitNumber}` : ""}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedJob(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Scrollable Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
              >
              {selectedJob ? (
              <>
                {/* Status & Priority Section */}
                <View style={styles.detailsCard}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBadgeStyle(selectedJob.status).bg }]}>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: statusBadgeStyle(selectedJob.status).color },
                        ]}
                      >
                        {statusBadgeStyle(selectedJob.status).label}
                      </Text>
                    </View>
                    <View style={styles.priorityBadge}>
                      <Ionicons name="flag" size={14} color="#DC2626" />
                      <Text style={styles.priorityBadgeText}>
                        {selectedJob.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {selectedJob.createdAt && (
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={18} color="#6B7280" />
                      <Text style={styles.infoText}>
                        {new Date(selectedJob.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  )}

                  {detailLoading ? (
                    <View style={styles.loadingInline}>
                      <ActivityIndicator size="small" color="#2563EB" />
                      <Text style={styles.loadingText}>Loading details...</Text>
                    </View>
                  ) : selectedJob.description ? (
                    <View style={styles.descriptionSection}>
                      <Text style={styles.descriptionLabel}>Description</Text>
                      <Text style={styles.descriptionText}>{selectedJob.description}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Action Buttons */}
                {!isJobClosed && (
                  <View style={styles.actionsCard}>
                    {selectedJob.status === "assigned" && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.startButton, statusUpdating && styles.disabledButton]}
                        disabled={statusUpdating}
                        onPress={() => updateStatus("IN_PROGRESS", "in-progress")}
                      >
                        <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Start Work</Text>
                      </TouchableOpacity>
                    )}

                    {selectedJob.status === "in-progress" && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton, statusUpdating && styles.disabledButton]}
                        disabled={statusUpdating}
                        onPress={() => updateStatus("COMPLETED", "completed")}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Mark as Completed</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {isJobClosed && (
                  <View style={styles.closedBanner}>
                    <Ionicons
                      name={selectedJob.status === "cancelled" ? "close-circle" : "checkmark-done-circle"}
                      size={20}
                      color={selectedJob.status === "cancelled" ? "#DC2626" : "#047857"}
                    />
                    <Text style={[styles.closedBannerText, selectedJob.status === "cancelled" && { color: "#DC2626" }]}>
                      {selectedJob.status === "cancelled"
                        ? "This request has been cancelled"
                        : "This request has been completed"}
                    </Text>
                  </View>
                )}

                {/* Comments Section */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="chatbubbles" size={20} color="#2563EB" />
                    <Text style={styles.sectionTitle}>
                      Comments {jobComments.length > 0 ? `(${jobComments.length})` : ""}
                    </Text>
                  </View>

                  {!isJobClosed && (
                    <View style={styles.inputSection}>
                      <TextInput
                        style={styles.commentInput}
                        placeholder="Add a comment..."
                        placeholderTextColor="#9CA3AF"
                        multiline
                        value={commentText}
                        onChangeText={setCommentText}
                        maxLength={500}
                      />
                      <TouchableOpacity
                        style={[
                          styles.sendButton,
                          (!commentText.trim() || isAddingComment) && styles.disabledButton
                        ]}
                        onPress={handleAddComment}
                        disabled={!commentText.trim() || isAddingComment}
                      >
                        {isAddingComment ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="send" size={18} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {jobComments.length > 0 ? (
                    <View style={styles.commentsContainer}>
                      {jobComments
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((comment) => {
                          const author = resolveCommentAuthor(comment);
                          return (
                            <View key={comment.id} style={styles.commentBubble}>
                              <View style={styles.commentHeader}>
                                <View style={styles.avatarCircle}>
                                  <Text style={styles.avatarText}>
                                    {author.charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                                <View style={styles.commentMeta}>
                                  <Text style={styles.commentAuthor}>{author}</Text>
                                  <Text style={styles.commentDate}>
                                    {new Date(comment.createdAt).toLocaleString()}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.commentText}>{comment.commentText}</Text>
                            </View>
                          );
                        })}
                    </View>
                  ) : (
                    <View style={styles.emptySection}>
                      <Ionicons name="chatbubbles-outline" size={32} color="#CBD5E1" />
                      <Text style={styles.emptyText}>No comments yet</Text>
                    </View>
                  )}
                </View>

                {/* Attachments Section */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="attach" size={20} color="#2563EB" />
                    <Text style={styles.sectionTitle}>
                      Attachments {jobAttachments.length > 0 ? `(${jobAttachments.length})` : ""}
                    </Text>
                  </View>

                  {!isJobClosed && (
                    <TouchableOpacity
                      style={[
                        styles.uploadButton,
                        isUploadingAttachment && styles.disabledButton
                      ]}
                      onPress={showAttachmentOptions}
                      disabled={isUploadingAttachment}
                    >
                      {isUploadingAttachment ? (
                        <ActivityIndicator size="small" color="#2563EB" />
                      ) : (
                        <>
                          <Ionicons name="cloud-upload-outline" size={20} color="#2563EB" />
                          <Text style={styles.uploadButtonText}>Upload Photo or Document</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {jobAttachments.length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.attachmentsScroll}
                    >
                      {jobAttachments.map((attachment) => {
                        const isImage = attachment.contentType.startsWith('image/');
                        return (
                          <TouchableOpacity
                            key={attachment.id}
                            style={styles.attachmentCard}
                            onPress={() => Linking.openURL(attachment.fileUrl)}
                          >
                            {isImage ? (
                              <Image
                                source={{ uri: attachment.fileUrl }}
                                style={styles.attachmentPreview}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.documentPreview}>
                                <Ionicons name="document-text" size={32} color="#2563EB" />
                              </View>
                            )}
                            <Text style={styles.attachmentLabel} numberOfLines={2}>
                              {attachment.fileName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <View style={styles.emptySection}>
                      <Ionicons name="document-attach-outline" size={32} color="#CBD5E1" />
                      <Text style={styles.emptyText}>No attachments yet</Text>
                    </View>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  modalTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 24,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
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
  // New redesigned modal styles
  detailsCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#FEF2F2",
    borderRadius: 999,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#6B7280",
  },
  loadingText: {
    fontSize: 13,
    color: "#6B7280",
  },
  descriptionSection: {
    gap: 6,
    marginTop: 4,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  actionsCard: {
    gap: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startButton: {
    backgroundColor: "#2563EB",
  },
  completeButton: {
    backgroundColor: "#16A34A",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  closedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    padding: 14,
  },
  closedBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#047857",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  inputSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
    minHeight: 44,
    textAlignVertical: "top",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  commentsContainer: {
    gap: 12,
  },
  commentBubble: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  commentMeta: {
    flex: 1,
    gap: 2,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  commentDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  commentText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginLeft: 42,
  },
  emptySection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 2,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 16,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  attachmentsScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  attachmentCard: {
    width: 100,
    gap: 8,
  },
  attachmentPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  documentPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentLabel: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 14,
  },
});
