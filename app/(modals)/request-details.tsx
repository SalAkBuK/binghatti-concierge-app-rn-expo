import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ImageViewer } from "../../components/ui/ImageViewer";
import { useApp } from "../../lib/context/connected-app-provider";
import { apiService } from "../../lib/services/api";
import { maintenanceApi } from "../../lib/services/api/maintenance";
import { residentRequestsApi } from "../../lib/services/api/resident-requests";
import type { Job, Request } from "../../lib/types";


export default function RequestDetailsScreen() {
  const params = useLocalSearchParams<{ initialTab?: string | string[] }>();
  const { selectedRequest, actions, jobs, currentUser } = useApp();
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "comments">("overview");
  const [comments, setComments] = useState<
    {
      id: string;
      message: string;
      createdAt: string;
      author: string;
      attachments?: string[];
    }[]
  >([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const assignedUserIdRef = useRef<string | null>(null);
  const assignedUserNameRef = useRef<string | null>(null);
  const managerNamesRef = useRef<Record<string, string>>({});
  const [resolvedBuildingName, setResolvedBuildingName] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: selectedRequest?.title || "",
    description: selectedRequest?.description || "",
    priority: selectedRequest?.priority || ("medium" as const),
  });
  const [loading, setLoading] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const isTenantUser = currentUser?.role === "tenant";
  const actionsRef = useRef(actions);
  const lastDetailsFetchRef = useRef<{ id: string | null; inFlight: boolean }>({
    id: null,
    inFlight: false,
  });

  // Check if this is a backend request (don't show jobs for backend requests)
  const isBackendRequest = (selectedRequest as any)?._source === "backend";
  const requestedInitialTab = Array.isArray(params.initialTab)
    ? params.initialTab[0]
    : params.initialTab;

  const job = useMemo(() => {
    if (!selectedRequest || isBackendRequest) {
      return undefined;
    }
    return jobs.find((item) => item.requestId === selectedRequest.id);
  }, [jobs, selectedRequest, isBackendRequest]);

  // Fetch fresh request details from backend when modal opens
  const resolveCommentAuthor = useCallback((comment: any): string => {
    const commentUserIdRaw = comment.userId ?? comment.user?.userId ?? "";
    const commentUserId = commentUserIdRaw ? String(commentUserIdRaw) : "";
    const currentUserId =
      currentUser?.id !== undefined && currentUser?.id !== null
        ? String(currentUser.id)
        : null;

    const directName =
      comment.user?.fullName ||
      comment.user?.name ||
      comment.user?.email ||
      (typeof comment.author === "string"
        ? comment.author
        : comment.author?.fullName ||
          comment.author?.name ||
          comment.author?.email ||
          null);

    if (currentUserId && commentUserId && currentUserId === commentUserId) {
      return (
        (currentUser as any)?.name ||
        (currentUser as any)?.fullName ||
        currentUser?.email ||
        "You"
      );
    }

    const assignedId = assignedUserIdRef.current;
    if (assignedId && commentUserId && commentUserId === assignedId) {
      return assignedUserNameRef.current || selectedRequest?.assignedTo || "Assigned";
    }

    const managerName = managerNamesRef.current[commentUserId];
    if (managerName) {
      return managerName;
    }

    if (directName) return String(directName);
    if (comment.user?.userId) return `User ${comment.user.userId}`;
    return "User";
  }, [currentUser, selectedRequest?.assignedTo]);
  const resolveCommentAuthorRef = useRef(resolveCommentAuthor);

  useEffect(() => {
    resolveCommentAuthorRef.current = resolveCommentAuthor;
  }, [resolveCommentAuthor]);

  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const fetchDetails = useCallback(async () => {
    if (!selectedRequest?.id) return;
    const requestId = String(selectedRequest.id);
    const lastFetch = lastDetailsFetchRef.current;
    if (lastFetch.id !== requestId) {
      lastFetch.id = requestId;
    }
    if (lastFetch.inFlight) return;
    lastFetch.inFlight = true;
    setFetchingDetails(true);
    try {
        if (!isTenantUser) {
          const buildingIdForManagers =
            selectedRequest.buildingId ||
            (selectedRequest as any).profile?.buildingId ||
            currentUser?.profile?.buildingId;

          if (buildingIdForManagers) {
            const buildingIdNum =
              typeof buildingIdForManagers === "string"
                ? parseInt(String(buildingIdForManagers).replace(/\D/g, ""), 10)
                : buildingIdForManagers;
            if (Number.isFinite(buildingIdNum)) {
              try {
                const managersResponse = await apiService.admin.getBuildingManagers(buildingIdNum);
                if (managersResponse.success && Array.isArray(managersResponse.data)) {
                  const mapped: Record<string, string> = {};
                  managersResponse.data.forEach((mgr: any) => {
                    const id = mgr.id ?? mgr.userId ?? mgr.managerId;
                    if (id != null) {
                      mapped[String(id)] =
                        mgr.fullName ||
                        mgr.name ||
                        mgr.email ||
                        (mgr.userId ? `User ${mgr.userId}` : "Manager");
                    }
                  });
                  managerNamesRef.current = mapped;
                }
              } catch (managerErr) {
                console.warn("[RequestDetails] Failed to fetch building managers", managerErr);
              }
            }
          }
        }

        if (isTenantUser) {
          const response = await residentRequestsApi.getRequest(selectedRequest.id);
          if (response.success && response.data) {
            const apiRequest = response.data;
            const assignedUserId =
              apiRequest.assignedTo?.id != null
                ? String(apiRequest.assignedTo.id)
                : apiRequest.assignedToId != null
                  ? String(apiRequest.assignedToId)
                  : null;
            const assignedUserName =
              apiRequest.assignedTo?.fullName ||
              apiRequest.assignedTo?.name ||
              apiRequest.assignedTo?.email ||
              (assignedUserId ? `User ${assignedUserId}` : selectedRequest.assignedTo);
            assignedUserIdRef.current = assignedUserId;
            assignedUserNameRef.current = assignedUserName || null;

            const updatedRequest: Request = {
              ...selectedRequest,
              id: String(apiRequest.id ?? selectedRequest.id),
              title: apiRequest.title ?? selectedRequest.title,
              description: apiRequest.description ?? selectedRequest.description,
              status: normalizeStatus(apiRequest.status ?? selectedRequest.status),
              priority: normalizePriority(apiRequest.priority ?? selectedRequest.priority),
              attachments: normalizeAttachments(
                apiRequest.attachments ?? selectedRequest.attachments,
              ),
              assignedTo: assignedUserName || selectedRequest.assignedTo,
              buildingId: apiRequest.buildingId
                ? String(apiRequest.buildingId)
                : selectedRequest.buildingId,
              apartment: apiRequest.unitNumber ?? selectedRequest.apartment,
              floor: apiRequest.floorNumber != null ? String(apiRequest.floorNumber) : selectedRequest.floor,
              buildingName: apiRequest.buildingName ?? selectedRequest.buildingName,
              createdAt: apiRequest.createdAt ?? selectedRequest.createdAt,
              updatedAt: apiRequest.updatedAt ?? selectedRequest.updatedAt,
            };

            actionsRef.current.setSelectedRequest?.(updatedRequest);
            if (updatedRequest.buildingName) {
              setResolvedBuildingName(updatedRequest.buildingName);
            }
          }

          const commentsResponse = await residentRequestsApi.getComments(selectedRequest.id);
          const commentsPayload = Array.isArray(commentsResponse)
            ? commentsResponse
            : Array.isArray(commentsResponse?.data)
              ? commentsResponse.data
              : [];
          if (commentsPayload.length > 0) {
            const mappedComments = commentsPayload
              .map((comment: any, index: number) => {
                const id = String(comment.id ?? `${selectedRequest.id}-comment-${index}`);
                const message = comment.commentText || comment.message || comment.text || "";
                const createdAt = comment.createdAt || comment.created_at || new Date().toISOString();
                const author = resolveCommentAuthorRef.current(comment);
                const attachments =
                  Array.isArray(comment.attachments) && comment.attachments.length > 0
                    ? comment.attachments
                        .map(
                          (att: any) =>
                            att.fileUrl || att.url || att.uri || att.file_url || att.path || null,
                        )
                        .filter(Boolean) as string[]
                    : undefined;
                return { id, message, createdAt, author, attachments };
              })
              .sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              );
            setComments(mappedComments);
          } else {
            setComments([]);
          }
        } else {
          const response = await maintenanceApi.getMaintenanceRequestById(selectedRequest.id);
          if (response.success && response.data) {
            const apiRequest = response.data;
            const assignedUserId =
              apiRequest.assignedTo?.id != null ? String(apiRequest.assignedTo.id) : null;
            const assignedUserName =
              apiRequest.assignedTo?.fullName ||
              apiRequest.assignedTo?.email ||
              (assignedUserId ? `User ${assignedUserId}` : selectedRequest.assignedTo);
            assignedUserIdRef.current = assignedUserId;
            assignedUserNameRef.current = assignedUserName || null;
            const updatedRequest: Request = {
              ...selectedRequest,
              id: String(apiRequest.id ?? selectedRequest.id),
              title: apiRequest.title ?? selectedRequest.title,
              description: apiRequest.description ?? selectedRequest.description,
              status: normalizeStatus(apiRequest.status ?? selectedRequest.status),
              priority: normalizePriority(apiRequest.priority ?? selectedRequest.priority),
              attachments: normalizeAttachments(
                apiRequest.attachments ?? selectedRequest.attachments,
              ),
              assignedTo:
                assignedUserName ||
                apiRequest.assignedToId ||
                selectedRequest.assignedTo,
              buildingId: apiRequest.buildingId ? String(apiRequest.buildingId) : selectedRequest.buildingId,
              apartment: apiRequest.unitNumber ?? selectedRequest.apartment,
              floor: apiRequest.floorNumber != null ? String(apiRequest.floorNumber) : selectedRequest.floor,
              buildingName: apiRequest.buildingName ?? selectedRequest.buildingName,
              updatedAt: apiRequest.updatedAt ?? selectedRequest.updatedAt,
            };

            actionsRef.current.setSelectedRequest?.(updatedRequest);
            if (Array.isArray(apiRequest.comments)) {
              const mappedComments = apiRequest.comments
                .map((comment: any, index: number) => {
                  const id = String(comment.id ?? `${apiRequest.id}-comment-${index}`);
                  const message = comment.commentText || comment.message || comment.text || "";
                  const createdAt = comment.createdAt || new Date().toISOString();
                  const author = resolveCommentAuthorRef.current(comment);
                  const attachments =
                    Array.isArray(comment.attachments) && comment.attachments.length > 0
                      ? comment.attachments
                          .map(
                            (att: any) =>
                              att.fileUrl || att.url || att.uri || att.file_url || att.path || null,
                          )
                          .filter(Boolean) as string[]
                      : undefined;
                  return { id, message, createdAt, author, attachments };
                })
                .sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                );
              setComments(mappedComments);
            } else {
              setComments([]);
            }
            if (updatedRequest.buildingName) {
              setResolvedBuildingName(updatedRequest.buildingName);
            }
          }
        }
    } catch (error) {
      console.error("[RequestDetails] Failed to fetch request details:", error);
    } finally {
      setFetchingDetails(false);
      lastDetailsFetchRef.current.inFlight = false;
    }
  }, [
    isTenantUser,
    currentUser,
    selectedRequest,
  ]);

  useEffect(() => {
    void fetchDetails();
  }, [fetchDetails]);

  useFocusEffect(
    useCallback(() => {
      void fetchDetails();
    }, [fetchDetails]),
  );

  useEffect(() => {
    setComments([]);
    setResolvedBuildingName(null);
    lastDetailsFetchRef.current = {
      id: selectedRequest?.id ? String(selectedRequest.id) : null,
      inFlight: false,
    };
  }, [
    selectedRequest?.id,
  ]);

  useEffect(() => {
    setDetailTab("overview");
    setNewComment("");
    setShowEditMode(false);
    setEditForm({
      title: selectedRequest?.title || "",
      description: selectedRequest?.description || "",
      priority: selectedRequest?.priority || ("medium" as const),
    });
    assignedUserIdRef.current = null;
    assignedUserNameRef.current = null;
    managerNamesRef.current = {};
  }, [
    selectedRequest?.id,
    selectedRequest?.title,
    selectedRequest?.description,
    selectedRequest?.priority,
  ]);

  useEffect(() => {
    if (requestedInitialTab === "comments") {
      setDetailTab("comments");
      return;
    }

    setDetailTab("overview");
  }, [requestedInitialTab, selectedRequest?.id]);

  // Resolve building name to mirror the welcome card display
  useEffect(() => {
    const resolveBuilding = async () => {
      if (!selectedRequest) return;

      // Prefer buildingName on the request
      if ((selectedRequest as any).buildingName) {
        setResolvedBuildingName((selectedRequest as any).buildingName);
        return;
      }

      const buildingId =
        (selectedRequest as any).buildingId ||
        (selectedRequest as any).profile?.buildingId ||
        currentUser?.profile?.buildingId;

      if (!buildingId) return;

      try {
        const building = actionsRef.current.getBuildingById?.(String(buildingId));
        if (building?.name) {
          setResolvedBuildingName(building.name);
        }
      } catch (error) {
        console.warn("[RequestDetails] Failed to resolve building name", error);
      }
    };

    resolveBuilding();
  }, [selectedRequest, currentUser?.profile?.buildingId]);

  // Helper functions
  const normalizeStatus = (status: any): Request["status"] => {
    if (!status) return "pending";
    // Handle numeric status codes from backend (1=New, 2=Assigned, 3=InProgress, 4=OnHold, 5=Completed, 6=Cancelled)
    const numeric = Number(status);
    if (!Number.isNaN(numeric)) {
      if (numeric === 1) return "pending";
      if (numeric === 2 || numeric === 3) return "in-progress"; // Assigned / InProgress
      if (numeric === 4) return "on-hold";
      if (numeric === 5) return "completed";
      if (numeric === 6) return "cancelled";
    }

    const normalized = String(status).toLowerCase().replace("_", "-");
    if (normalized === "pending") return "pending";
    if (normalized === "open") return "pending";
    if (normalized === "on-hold" || normalized === "onhold") return "on-hold";
    if (normalized === "in-progress" || normalized === "inprogress" || normalized === "assigned") return "in-progress";
    if (normalized === "completed" || normalized === "complete" || normalized === "done") return "completed";
    if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
    return "pending";
  };

  const normalizePriority = (priority: any): Request["priority"] => {
    if (!priority && priority !== 0) return "medium";
    if (priority === 1 || priority === "1" || String(priority).toLowerCase() === "low") return "low";
    if (priority === 2 || priority === "2" || String(priority).toLowerCase() === "medium") return "medium";
    if (priority === 3 || priority === "3" || String(priority).toLowerCase() === "high") return "high";
    if (priority === 4 || priority === "4" || String(priority).toLowerCase() === "urgent") return "urgent";
    return "medium";
  };

  const normalizeAttachments = (attachments: any): string[] => {
    if (!Array.isArray(attachments)) return [];
    return attachments
      .map((attachment) => {
        if (!attachment) return null;
        if (typeof attachment === "string") return attachment;
        if (typeof attachment === "object") {
          return (
            attachment.fileUrl ||
            attachment.url ||
            attachment.uri ||
            attachment.file_url ||
            attachment.path ||
            null
          );
        }
        return null;
      })
      .filter((uri): uri is string => Boolean(uri));
  };

  const isImageUri = (uri: string) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(uri);

  const getStatusColor = (status: Request["status"]) => {
    const colors = {
      pending: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
      "in-progress": { bg: "#DBEAFE", text: "#1E40AF", border: "#BFDBFE" },
      "on-hold": { bg: "#FFE4E6", text: "#BE123C", border: "#FECDD3" },
      completed: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
      cancelled: { bg: "#F3F4F6", text: "#1F2937", border: "#E5E7EB" },
    };
    return colors[status] || colors.pending;
  };

  const getPriorityColor = (priority: Request["priority"]) => {
    const colors = {
      low: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0" },
      medium: { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
      high: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
      urgent: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
    };
    return colors[priority] || colors.medium;
  };

  const getStatusIcon = (status: Request["status"]) => {
    const icons = {
      pending: "time-outline",
      "in-progress": "sync-outline",
      "on-hold": "pause-circle-outline",
      completed: "checkmark-circle-outline",
      cancelled: "close-circle-outline",
    } as const;
    return icons[status] || "time-outline";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProgressPercentage = (status: Request["status"]) => {
    const progress = {
      pending: 25,
      "in-progress": 75,
      "on-hold": 60,
      completed: 100,
      cancelled: 0,
    };
    return progress[status] || 0;
  };

  const getJobStatusMeta = (status: Job["status"]) => {
    const meta: Record<
      Job["status"],
      { label: string; bg: string; text: string; border: string }
    > = {
      pending: {
        label: "Pending Assignment",
        bg: "#FEF3C7",
        text: "#92400E",
        border: "#FDE68A",
      },
      assigned: {
        label: "Assigned",
        bg: "#DBEAFE",
        text: "#1D4ED8",
        border: "#BFDBFE",
      },
      "in-progress": {
        label: "In Progress",
        bg: "#E0F2FE",
        text: "#0369A1",
        border: "#BAE6FD",
      },
      "follow-up": {
        label: "Follow-up Required",
        bg: "#FEF3C7",
        text: "#92400E",
        border: "#FDE68A",
      },
      completed: {
        label: "Completed",
        bg: "#D1FAE5",
        text: "#047857",
        border: "#A7F3D0",
      },
      cancelled: {
        label: "Cancelled",
        bg: "#FEE2E2",
        text: "#B91C1C",
        border: "#FCA5A5",
      },
    };

    return meta[status];
  };

  const getCompletionStatusMeta = (
    status: Job["completionStatus"],
  ): { label: string; subtitle: string; bg: string; text: string } | null => {
    if (!status) {
      return null;
    }

    const map = {
      awaiting_tenant_approval: {
        label: "Awaiting Your Approval",
        subtitle:
          "Review the completion report to approve or request follow-up.",
        bg: "#DBEAFE",
        text: "#1D4ED8",
      },
      tenant_approved: {
        label: "Approved",
        subtitle: "You confirmed this job was completed to your satisfaction.",
        bg: "#D1FAE5",
        text: "#047857",
      },
      sp_override_approved: {
        label: "Marked Complete",
        subtitle:
          "Service provider closed this job on your behalf. Reach out if something looks off.",
        bg: "#FEF3C7",
        text: "#92400E",
      },
    } as const;

    return map[status];
  };

  const formatCurrency = (amount: number) => {
    return `AED ${amount.toLocaleString()}`;
  };

  // Event handlers
  const handleApproveEstimate = (jobId: string) => {
    Alert.alert(
      "Approve Estimate",
      "Do you want to proceed with the proposed costs?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await actions.reviewJobEstimateAsTenant?.(jobId, { decision: "approve" });
              Alert.alert("Estimate Approved", "Thank you for confirming.");
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ||
                  "Unable to approve the estimate. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  const handleDeclineEstimate = (jobId: string) => {
    Alert.prompt(
      "Request Changes",
      "Tell us what needs to change before work begins.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          style: "destructive",
          onPress: async (reason) => {
            if (!reason?.trim()) {
              Alert.alert(
                "Reason Required",
                "Please explain why you're declining the estimate.",
              );
              return;
            }
            try {
              await actions.reviewJobEstimateAsTenant?.(
                jobId,
                { decision: "decline", notes: reason.trim() },
              );
              Alert.alert(
                "Changes Requested",
                "The service provider has been notified.",
              );
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message ||
                  "Unable to submit your request. Please try again.",
              );
            }
          },
        },
      ],
      "plain-text",
    );
  };

  const handleReviewCompletion = (jobId: string) => {
    router.push({
      pathname: "/(modals)/approve-job-completion",
      params: { jobId },
    });
  };

  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      if (isTenantUser) {
        console.log('[RequestDetails] Cancelling resident request:', selectedRequest.id);
        const response = await residentRequestsApi.cancelRequest(selectedRequest.id);

        const responseHasSuccess =
          response && typeof response === "object" && "success" in response;
        if (responseHasSuccess && response.success === false) {
          throw new Error((response as any).message || "Failed to cancel request");
        }

        setShowDeleteConfirm(false);
        Alert.alert("Success", "Request cancelled successfully", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
        return;
      }

      console.log('[RequestDetails] Deleting maintenance request:', selectedRequest.id);
      const response = await maintenanceApi.deleteMaintenanceRequest(selectedRequest.id);

      if (response.success) {
        setShowDeleteConfirm(false);
        Alert.alert("Success", "Request cancelled successfully", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error(response.message || 'Failed to delete request');
      }
    } catch (err: any) {
      console.error('[RequestDetails] Error deleting request:', err);
      Alert.alert("Error", err.message || "Failed to cancel request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      if (isTenantUser) {
        const payload = {
          title: editForm.title,
          description: editForm.description,
        };
        const response = await residentRequestsApi.updateRequest(selectedRequest.id, payload);

        const responseHasSuccess =
          response && typeof response === "object" && "success" in response;
        if (responseHasSuccess && response.success === false) {
          throw new Error((response as any)?.message || "Failed to update request");
        }

        const apiRequest =
          response && typeof response === "object" && "data" in response && response.data
            ? response.data
            : response && typeof response === "object"
              ? response
              : {};
        const updatedRequest: Request = {
          ...selectedRequest,
          title: apiRequest.title ?? payload.title ?? selectedRequest.title,
          description: apiRequest.description ?? payload.description ?? selectedRequest.description,
          status: normalizeStatus(apiRequest.status ?? selectedRequest.status),
          priority: normalizePriority(apiRequest.priority ?? selectedRequest.priority),
          attachments: normalizeAttachments(
            apiRequest.attachments ?? selectedRequest.attachments,
          ),
          updatedAt: apiRequest.updatedAt ?? selectedRequest.updatedAt,
        };

        actions.setSelectedRequest?.(updatedRequest);
        setShowEditMode(false);
        Alert.alert("Success", "Request updated successfully");
        return;
      }

      await actions.updateRequest(selectedRequest.id, editForm);
      setShowEditMode(false);
      Alert.alert("Success", "Request updated successfully");
    } catch (err) {
      Alert.alert("Error", "Failed to update request");
      console.error("Error updating request:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedRequest || !newComment.trim() || !currentUser?.id) return;
    const requestStatus = normalizeStatus(selectedRequest.status);
    if (requestStatus === "cancelled" || requestStatus === "completed") return;

    setIsPostingComment(true);
    try {
      if (isTenantUser) {
        const response = await residentRequestsApi.addComment(
          selectedRequest.id,
          newComment.trim(),
        );
        if (response?.success === false) {
          throw new Error(response?.message || "Failed to add comment");
        }
        setNewComment("");
        const refreshed = await residentRequestsApi.getComments(selectedRequest.id);
        const refreshedPayload = Array.isArray(refreshed)
          ? refreshed
          : Array.isArray(refreshed?.data)
            ? refreshed.data
            : [];
        if (refreshedPayload.length > 0) {
          const mappedComments = refreshedPayload
            .map((comment: any, index: number) => {
              const id = String(comment.id ?? `${selectedRequest.id}-comment-${index}`);
              const message = comment.commentText || comment.message || comment.text || "";
              const createdAt = comment.createdAt || comment.created_at || new Date().toISOString();
              const author = resolveCommentAuthor(comment);
              const attachments =
                Array.isArray(comment.attachments) && comment.attachments.length > 0
                  ? comment.attachments
                      .map(
                        (att: any) =>
                          att.fileUrl || att.url || att.uri || att.file_url || att.path || null,
                      )
                      .filter(Boolean) as string[]
                  : undefined;
              return { id, message, createdAt, author, attachments };
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setComments(mappedComments);
        } else {
          setComments([]);
        }
        return;
      }

      const requestIdNum = Number(selectedRequest.id);
      const userIdNum =
        typeof currentUser.id === "string"
          ? parseInt(currentUser.id, 10)
          : currentUser.id;

      if (!Number.isFinite(requestIdNum) || !Number.isFinite(userIdNum)) {
        Alert.alert("Error", "Missing request or user details.");
        return;
      }

      await maintenanceApi.addMaintenanceRequestComment({
        requestId: requestIdNum,
        userId: userIdNum,
        commentText: newComment.trim(),
      });
      setNewComment("");
      // Refresh comments
      const refreshed = await maintenanceApi.getMaintenanceRequestById(selectedRequest.id);
      if (refreshed.success && refreshed.data?.comments) {
        const mappedComments = refreshed.data.comments
          .map((comment: any, index: number) => {
            const id = String(comment.id ?? `${selectedRequest.id}-comment-${index}`);
            const message = comment.commentText || comment.message || comment.text || "";
            const createdAt = comment.createdAt || new Date().toISOString();
            const author = resolveCommentAuthor(comment);
            const attachments =
              Array.isArray(comment.attachments) && comment.attachments.length > 0
                ? comment.attachments
                    .map(
                      (att: any) =>
                        att.fileUrl || att.url || att.uri || att.file_url || att.path || null,
                    )
                    .filter(Boolean) as string[]
                : undefined;
            return { id, message, createdAt, author, attachments };
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setComments(mappedComments);
      }
    } catch (error) {
      console.error("[RequestDetails] Failed to add comment:", error);
      Alert.alert("Error", "Could not add your comment. Please try again.");
    } finally {
      setIsPostingComment(false);
    }
  };

  if (!selectedRequest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubble-outline"
            size={64}
            color="#D1D5DB"
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No request selected</Text>
          <Text style={styles.emptyText}>
            Please select a request to view its details
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.back()}
          >
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const normalizedStatus = normalizeStatus(selectedRequest.status);
  const normalizedPriority = normalizePriority(selectedRequest.priority);
  const normalizedAttachments = normalizeAttachments(selectedRequest.attachments);

  const canEdit = normalizedStatus === "pending";
  const canDelete = normalizedStatus === "pending";
  const canCancel = normalizedStatus === "in-progress";
  const canProvideFeedback = false;
  const statusColors = getStatusColor(normalizedStatus);
  const priorityColors = getPriorityColor(normalizedPriority);
  const statusIcon = getStatusIcon(normalizedStatus);
  const jobStatusMeta = job ? getJobStatusMeta(job.status) : null;
  const estimate = job?.estimate;
  const additionalCosts = job?.additionalCosts ?? [];
  const hasAdditionalCosts = additionalCosts.length > 0;
  const approvedAdditionalCostTotal = hasAdditionalCosts
    ? additionalCosts
        .filter((cost) => cost.status === "approved")
        .reduce((sum, cost) => sum + cost.amount, 0)
    : 0;
  const pendingAdditionalCostCount = hasAdditionalCosts
    ? additionalCosts.filter((cost) => cost.status === "pending").length
    : 0;
  const estimateAwaitingTenant = estimate?.status === "sp_approved";
  const estimateApproved = estimate?.status === "tenant_approved";
  const estimateDeclined = estimate?.status === "tenant_declined";
  const estimateRejectedByProvider = estimate?.status === "sp_rejected";
  const estimateDraftOrSubmitted =
    estimate?.status === "draft" || estimate?.status === "submitted";
  const completionMeta = getCompletionStatusMeta(job?.completionStatus);
  const awaitingCompletionApproval =
    job?.completionStatus === "awaiting_tenant_approval";
  const completionRejectedReason = job?.completionRejectionReason;
  const estimateStatusDetails = estimate
    ? (() => {
        if (estimateApproved) {
          return {
            icon: "checkmark-circle" as const,
            color: "#10B981",
            text: "You approved this estimate. Work can proceed.",
          };
        }
        if (estimateDeclined) {
          return {
            icon: "alert-circle" as const,
            color: "#F97316",
            text: "You requested changes to this estimate.",
          };
        }
        if (estimateRejectedByProvider) {
          return {
            icon: "alert-circle" as const,
            color: "#F97316",
            text:
              "Service provider requested revisions before sharing with you.",
          };
        }
        if (estimateAwaitingTenant) {
          return {
            icon: "time-outline" as const,
            color: "#2563EB",
            text: actions.reviewJobEstimateAsTenant
              ? "Waiting for your decision."
              : "Awaiting your review. Contact the concierge team if you need help.",
          };
        }
        if (estimateDraftOrSubmitted) {
          return {
            icon: "time-outline" as const,
            color: "#2563EB",
            text:
              "Waiting for the service team to review and share the estimate.",
          };
        }
        return {
          icon: "information-circle-outline" as const,
          color: "#2563EB",
          text: "Estimate status updated.",
        };
      })()
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Request Details</Text>
              <Text style={styles.headerSubtitle}>#{selectedRequest.id}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {canEdit && (
              <TouchableOpacity
                onPress={() => {
                  if (selectedRequest) {
                    setEditForm({
                      title: selectedRequest.title || "",
                      description: selectedRequest.description || "",
                      priority: selectedRequest.priority || ("medium" as const),
                    });
                  }
                  setShowEditMode(true);
                }}
                style={styles.editButton}
              >
                <Ionicons name="pencil" size={20} color="#2563EB" />
              </TouchableOpacity>
            )}
            {canDelete && (
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(true)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(true)}
                style={styles.deleteButton}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Tabs */}
          <View style={styles.tabRow}>
            {(["overview", "comments"] as const).map((tab) => {
              const active = detailTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, active && styles.tabButtonActive]}
                  onPress={() => setDetailTab(tab)}
                >
                  <Text
                    style={[styles.tabButtonText, active && styles.tabButtonTextActive]}
                  >
                    {tab === "overview" ? "Overview" : "Comments"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {detailTab === "overview" ? (
            <>
              {/* Request Header Card */}
              <Animated.View
                entering={FadeIn.duration(400)}
                style={styles.card}
              >
                {showEditMode ? (
                  <View style={styles.editForm}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Title</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.title}
                        onChangeText={(text) =>
                          setEditForm((prev) => ({ ...prev, title: text }))
                        }
                        placeholder="Request title"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Description</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={editForm.description}
                        onChangeText={(text) =>
                          setEditForm((prev) => ({ ...prev, description: text }))
                        }
                        placeholder="Describe your request"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>

                    {!isTenantUser && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Priority</Text>
                        <View style={styles.priorityButtons}>
                          {(["low", "medium", "high", "urgent"] as const).map(
                            (priority) => (
                              <TouchableOpacity
                                key={priority}
                                onPress={() =>
                                  setEditForm((prev) => ({ ...prev, priority }))
                                }
                                style={[
                                  styles.priorityButton,
                                  editForm.priority === priority &&
                                    styles.priorityButtonActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.priorityButtonText,
                                    editForm.priority === priority &&
                                      styles.priorityButtonTextActive,
                                  ]}
                                >
                                  {priority.charAt(0).toUpperCase() +
                                    priority.slice(1)}
                                </Text>
                              </TouchableOpacity>
                            ),
                          )}
                        </View>
                      </View>
                    )}

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowEditMode(false)}
                        disabled={loading}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleUpdateRequest}
                        disabled={loading}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.requestTitle}>{selectedRequest.title}</Text>

                    {/* Status Badges */}
                    <View style={styles.badges}>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: statusColors.bg,
                            borderColor: statusColors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={statusIcon}
                          size={14}
                          color={statusColors.text}
                        />
                        <Text
                          style={[styles.badgeText, { color: statusColors.text }]}
                        >
                          {normalizedStatus.replace("-", " ")}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: priorityColors.bg,
                            borderColor: priorityColors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: priorityColors.text },
                          ]}
                        >
                          {normalizedPriority}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
                        ]}
                      >
                        <Text style={[styles.badgeText, { color: "#1F2937" }]}>
                          {selectedRequest.type}
                        </Text>
                      </View>
                    </View>

                    {/* Assignment */}
                    {selectedRequest.assignedTo && (
                      <View style={styles.assignedRow}>
                        <Ionicons name="person-outline" size={16} color="#1F2937" />
                        <Text style={styles.assignedLabel}>Assigned to</Text>
                        <Text style={styles.assignedValue}>
                          {selectedRequest.assignedTo}
                        </Text>
                      </View>
                    )}

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressPercentage}>
                          {getProgressPercentage(normalizedStatus)}%
                        </Text>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${getProgressPercentage(normalizedStatus)}%`,
                              backgroundColor:
                                normalizedStatus === "completed"
                                  ? "#10B981"
                                  : normalizedStatus === "in-progress"
                                    ? "#3B82F6"
                                    : normalizedStatus === "cancelled"
                                      ? "#9CA3AF"
                                      : "#F59E0B",
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Description */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Description</Text>
                      <View style={styles.descriptionBox}>
                        <Text style={styles.descriptionText}>
                          {selectedRequest.description}
                        </Text>
                      </View>
                    </View>

                    {/* Additional Notes */}
                    {selectedRequest.additionalNotes && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Additional Notes</Text>
                        <View style={styles.notesBox}>
                          <Text style={styles.notesText}>
                            {selectedRequest.additionalNotes}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Attachments */}
                    {normalizedAttachments.length > 0 && (
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>
                            Photos ({normalizedAttachments.length})
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.attachmentsScroll}
                          >
                            {normalizedAttachments.map((attachment, index) => (
                              <TouchableOpacity
                                key={index}
                                style={styles.attachmentImageContainer}
                                onPress={() => {
                                  setSelectedImageIndex(index);
                                  setShowImageViewer(true);
                                }}
                              >
                                <Image
                                  source={{ uri: attachment }}
                                  style={styles.attachmentImage}
                                  resizeMode="cover"
                                />
                                <View style={styles.attachmentOverlay}>
                                  <Ionicons
                                    name="expand-outline"
                                    size={20}
                                    color="#FFFFFF"
                                  />
                                </View>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                  </View>
                )}
              </Animated.View>

              {/* Location Information */}
              {(selectedRequest.apartment ||
                selectedRequest.tower ||
                selectedRequest.buildingId ||
                selectedRequest.floor ||
                resolvedBuildingName) && (
                <Animated.View
                  entering={FadeInDown.delay(50).duration(400)}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons name="location-outline" size={20} color="#6B7280" />
                    <Text style={styles.cardTitle}>Location</Text>
                  </View>

                  {/* Building Name (if available) */}
                  {(resolvedBuildingName || selectedRequest.buildingName) && (
                    <Text style={styles.buildingName}>
                      {resolvedBuildingName || selectedRequest.buildingName}
                    </Text>
                  )}

                  {/* Unit Details */}
                  <View style={styles.locationDetails}>
                    {selectedRequest.apartment && (
                      <View style={styles.locationDetailRow}>
                        <Text style={styles.locationDetailLabel}>Unit:</Text>
                        <Text style={styles.locationDetailValue}>
                          {selectedRequest.apartment || currentUser?.profile?.apartment || "-"}
                    
                        </Text>
                      </View>
                    )}

                    {selectedRequest.tower && (
                      <View style={styles.locationDetailRow}>
                        <Text style={styles.locationDetailLabel}>Tower:</Text>
                        <Text style={styles.locationDetailValue}>
                          {selectedRequest.tower}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}

              {/* Timeline */}
              <Animated.View
                entering={FadeInDown.delay(100).duration(400)}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                  <Text style={styles.cardTitle}>Timeline</Text>
                </View>
                <View style={styles.timelineItem}>
                  <Text style={styles.timelineLabel}>Created</Text>
                  <Text style={styles.timelineValue}>
                    {formatDate(selectedRequest.createdAt)}
                  </Text>
                </View>
                {selectedRequest.updatedAt !== selectedRequest.createdAt && (
                  <View style={styles.timelineItem}>
                    <Text style={styles.timelineLabel}>Last Updated</Text>
                    <Text style={styles.timelineValue}>
                      {formatDate(selectedRequest.updatedAt)}
                    </Text>
                  </View>
                )}
              </Animated.View>

              {/* Job Overview */}
              {job && (
                <Animated.View
                  entering={FadeInDown.delay(130).duration(400)}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons name="briefcase-outline" size={20} color="#6B7280" />
                    <Text style={styles.cardTitle}>Job Overview</Text>
                  </View>

                  <View style={styles.jobStatusRow}>
                    {jobStatusMeta && (
                      <View
                        style={[
                          styles.jobStatusBadge,
                          {
                            backgroundColor: jobStatusMeta.bg,
                            borderColor: jobStatusMeta.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.jobStatusBadgeText,
                            { color: jobStatusMeta.text },
                          ]}
                        >
                          {jobStatusMeta.label}
                        </Text>
                      </View>
                    )}
                    {completionMeta && (
                      <View
                        style={[
                          styles.jobStatusBadge,
                          {
                            backgroundColor: completionMeta.bg,
                            borderColor: completionMeta.bg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.jobStatusBadgeText,
                            { color: completionMeta.text },
                          ]}
                        >
                          {completionMeta.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {completionMeta && (
                    <Text style={styles.completionSubtitle}>
                      {completionMeta.subtitle}
                    </Text>
                  )}

                  {completionRejectedReason && (
                    <View style={styles.rejectionNotice}>
                      <Ionicons name="alert-circle" size={18} color="#DC2626" />
                      <Text style={styles.rejectionNoticeText}>
                        {completionRejectedReason}
                      </Text>
                    </View>
                  )}

                  <View style={styles.jobInfoGrid}>
                    <View style={styles.jobInfoItem}>
                      <Text style={styles.jobInfoLabel}>Assigned To</Text>
                      <Text style={styles.jobInfoValue}>
                        {job.assignedToEmployeeName ||
                          job.assignedToName ||
                          "To be assigned"}
                      </Text>
                    </View>
                    <View style={styles.jobInfoItem}>
                      <Text style={styles.jobInfoLabel}>Service Provider</Text>
                      <Text style={styles.jobInfoValue}>
                        {job.assignedToName || "Not yet assigned"}
                      </Text>
                    </View>
                    {job.scheduledDate && (
                      <View style={styles.jobInfoItem}>
                        <Text style={styles.jobInfoLabel}>Scheduled</Text>
                        <Text style={styles.jobInfoValue}>
                          {formatDate(job.scheduledDate)}
                        </Text>
                      </View>
                    )}
                    {job.startedAt && (
                      <View style={styles.jobInfoItem}>
                        <Text style={styles.jobInfoLabel}>Started</Text>
                        <Text style={styles.jobInfoValue}>
                          {formatDate(job.startedAt)}
                        </Text>
                      </View>
                    )}
                    {job.completedDate && (
                      <View style={styles.jobInfoItem}>
                        <Text style={styles.jobInfoLabel}>Completed</Text>
                        <Text style={styles.jobInfoValue}>
                          {formatDate(job.completedDate)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {job.completionNotes && (
                    <View style={styles.jobNotes}>
                      <Text style={styles.jobNotesLabel}>Completion Notes</Text>
                      <Text style={styles.jobNotesText}>{job.completionNotes}</Text>
                    </View>
                  )}

                  {job.completionFeedback && (
                    <View style={styles.jobNotes}>
                      <Text style={styles.jobNotesLabel}>Your Feedback</Text>
                      <Text style={styles.jobNotesText}>
                        {job.completionFeedback}
                      </Text>
                    </View>
                  )}

                  {awaitingCompletionApproval && actions.approveTenantJobCompletion && (
                    <TouchableOpacity
                      style={styles.reviewCompletionButton}
                      onPress={() => handleReviewCompletion(job.id)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.reviewCompletionButtonText}>
                        Review & Confirm Completion
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#FFFFFF"
                        style={{ opacity: 0.8 }}
                      />
                    </TouchableOpacity>
                  )}

                  {!awaitingCompletionApproval &&
                    job.status === "completed" &&
                    !completionMeta && (
                      <View style={styles.jobCompletionInfo}>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#10B981"
                        />
                        <Text style={styles.jobCompletionInfoText}>
                          Job marked completed on{" "}
                          {job.completedDate
                            ? formatDate(job.completedDate)
                            : "the latest update"}
                          .
                        </Text>
                      </View>
                    )}
                </Animated.View>
              )}

              {/* Estimate */}
              {job && estimate && (
                <Animated.View
                  entering={FadeInDown.delay(160).duration(400)}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons name="receipt-outline" size={20} color="#6B7280" />
                    <Text style={styles.cardTitle}>Cost Estimate</Text>
                  </View>
                  <Text style={styles.estimateMeta}>
                    Submitted on {formatDate(estimate.createdAt)}
                  </Text>
                  {estimate.notes && (
                    <Text style={styles.estimateNotes}>{estimate.notes}</Text>
                  )}
                  <View style={styles.estimateItems}>
                    {estimate.items.map((item) => (
                      <View key={item.id} style={styles.estimateItemRow}>
                        <View style={styles.estimateItemInfo}>
                          <Text style={styles.estimateItemLabel}>{item.label}</Text>
                          {item.description && (
                            <Text style={styles.estimateItemDescription}>
                              {item.description}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.estimateItemAmount}>
                          {formatCurrency(item.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.estimateTotalRow}>
                    <Text style={styles.estimateTotalLabel}>Total</Text>
                    <Text style={styles.estimateTotalAmount}>
                      {formatCurrency(estimate.subtotal)}
                    </Text>
                  </View>

                  {estimateAwaitingTenant && actions.reviewJobEstimateAsTenant ? (
                    <View style={styles.estimateActionRow}>
                      <TouchableOpacity
                        style={[styles.estimateActionButton, styles.estimateDecline]}
                        onPress={() => handleDeclineEstimate(job.id)}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={18}
                          color="#EF4444"
                        />
                        <Text style={styles.estimateDeclineText}>
                          Request Changes
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.estimateActionButton, styles.estimateApprove]}
                        onPress={() => handleApproveEstimate(job.id)}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={styles.estimateApproveText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  ) : estimateStatusDetails ? (
                    <View style={styles.estimateStatusBanner}>
                      <Ionicons
                        name={estimateStatusDetails.icon}
                        size={18}
                        color={estimateStatusDetails.color}
                      />
                      <Text
                        style={[
                          styles.estimateStatusText,
                          { color: estimateStatusDetails.color },
                        ]}
                      >
                        {estimateStatusDetails.text}
                      </Text>
                    </View>
                  ) : null}
                </Animated.View>
              )}

              {/* Additional Costs */}
              {job && hasAdditionalCosts && (
                <Animated.View
                  entering={FadeInDown.delay(190).duration(400)}
                  style={styles.card}
                >
                  <View style={styles.cardHeader}>
                    <Ionicons name="cash-outline" size={20} color="#6B7280" />
                    <Text style={styles.cardTitle}>Additional Costs</Text>
                  </View>
                  <View style={styles.additionalCostSummary}>
                    <View style={styles.additionalCostChip}>
                      <Ionicons name="checkmark-circle" size={16} color="#047857" />
                      <Text style={styles.additionalCostChipText}>
                        Approved: {formatCurrency(approvedAdditionalCostTotal)}
                      </Text>
                    </View>
                    {pendingAdditionalCostCount > 0 && (
                      <View
                        style={[
                          styles.additionalCostChip,
                          styles.additionalCostChipPending,
                        ]}
                      >
                        <Ionicons name="time-outline" size={16} color="#92400E" />
                        <Text
                          style={[
                            styles.additionalCostChipText,
                            { color: "#92400E" },
                          ]}
                        >
                          Pending: {pendingAdditionalCostCount}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.additionalCostList}>
                    {additionalCosts.map((cost) => (
                      <View key={cost.id} style={styles.additionalCostItem}>
                        <View style={styles.additionalCostHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.additionalCostTitle}>
                              {cost.description}
                            </Text>
                            <Text style={styles.additionalCostMeta}>
                              {cost.category
                                ? `${cost.category} • `
                                : ""}
                              Added by {cost.employeeName}
                            </Text>
                          </View>
                          <Text style={styles.additionalCostAmount}>
                            {formatCurrency(cost.amount)}
                          </Text>
                        </View>
                        <View style={styles.additionalCostStatusRow}>
                          <Ionicons
                            name={
                              cost.status === "approved"
                                ? "checkmark-circle"
                                : cost.status === "rejected"
                                  ? "close-circle"
                                  : "time-outline"
                            }
                            size={16}
                            color={
                              cost.status === "approved"
                                ? "#10B981"
                                : cost.status === "rejected"
                                  ? "#EF4444"
                                  : "#F59E0B"
                            }
                          />
                          <Text style={styles.additionalCostStatusText}>
                            {cost.status === "approved"
                              ? `Approved${
                                  cost.approvedAt
                                    ? ` on ${new Date(
                                        cost.approvedAt,
                                      ).toLocaleDateString()}`
                                    : ""
                                }`
                              : cost.status === "rejected"
                                ? `Rejected${
                                    cost.rejectionReason
                                      ? ` – ${cost.rejectionReason}`
                                      : ""
                                  }`
                                : "Awaiting service provider review"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </Animated.View>
              )}

              {/* Rating Section */}
              {canProvideFeedback && (
                <Animated.View
                  entering={FadeInDown.delay(260).duration(400)}
                  style={styles.card}
                >
                  <View style={styles.ratingSection}>
                    <Text style={styles.sectionTitle}>Rate This Service</Text>
                    <Text style={styles.ratingPromptText}>
                      How was your experience with this request?
                    </Text>
                    <TouchableOpacity
                      style={styles.ratingButton}
                      onPress={() => {
                        // Check if rating already exists
                        const existingRating = actions.getRatingByRequestId(selectedRequest.id);
                        if (existingRating) {
                          // Navigate to ratings screen to view existing rating
                          router.push("/(tenant)/my-ratings");
                        } else {
                          // Navigate to submit rating modal
                          router.push({
                            pathname: "/(modals)/submit-rating",
                            params: {
                              requestId: selectedRequest.id,
                              serviceProviderId: selectedRequest.assignedTo || "default-provider",
                              requestTitle: selectedRequest.title,
                              serviceProviderName: "Service Provider",
                            },
                          });
                        }
                      }}
                    >
                      <Ionicons name="star-outline" size={20} color="#fff" />
                      <Text style={styles.ratingButtonText}>
                        {actions.getRatingByRequestId(selectedRequest.id)
                          ? "View Your Rating"
                          : "Leave a Rating"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </>
          ) : (
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Ionicons name="chatbubbles-outline" size={20} color="#6B7280" />
                <Text style={styles.cardTitle}>Comments</Text>
              </View>

              {fetchingDetails && comments.length === 0 ? (
                <View style={styles.commentsEmpty}>
                  <ActivityIndicator color="#2563EB" />
                  <Text style={styles.commentsEmptyText}>Loading comments…</Text>
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.commentsEmpty}>
                  <Ionicons name="chatbox-ellipses-outline" size={22} color="#9CA3AF" />
                  <Text style={styles.commentsEmptyText}>No comments yet.</Text>
                </View>
              ) : (
                <View style={styles.commentsList}>
                  {comments.map((comment) => (
                    <View key={comment.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <Ionicons name="person-circle-outline" size={20} color="#6B7280" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.commentAuthor}>{comment.author}</Text>
                          <Text style={styles.commentTime}>{formatDate(comment.createdAt)}</Text>
                        </View>
                      </View>
                      <Text style={styles.commentBody}>{comment.message}</Text>
                      {comment.attachments && comment.attachments.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 10, marginTop: 8 }}
                        >
                          {comment.attachments.map((uri, idx) => {
                            const isImage = isImageUri(uri);
                            return (
                              <TouchableOpacity
                                key={`${comment.id}-${idx}`}
                                style={styles.commentAttachment}
                                onPress={() => Linking.openURL(uri)}
                                activeOpacity={0.85}
                              >
                                {isImage ? (
                                  <Image
                                    source={{ uri }}
                                    style={styles.commentAttachmentImage}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View style={styles.commentAttachmentPlaceholder}>
                                    <Ionicons name="document-outline" size={20} color="#2563EB" />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.commentInputBox}>
                <Text style={styles.commentInputLabel}>Add a comment</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder={
                    normalizedStatus === "cancelled"
                      ? "Comments are disabled for cancelled requests"
                      : normalizedStatus === "completed"
                      ? "Comments are disabled for completed requests"
                      : "Share an update or ask a question…"
                  }
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  editable={normalizedStatus !== "cancelled" && normalizedStatus !== "completed"}
                />
                <TouchableOpacity
                  style={[
                    styles.commentSendButton,
                    (!newComment.trim() || isPostingComment || normalizedStatus === "cancelled" || normalizedStatus === "completed") && styles.commentSendButtonDisabled,
                  ]}
                  onPress={handleSubmitComment}
                  disabled={!newComment.trim() || isPostingComment || normalizedStatus === "cancelled" || normalizedStatus === "completed"}
                >
                  {isPostingComment ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                      <Text style={styles.commentSendText}>Post Comment</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.modalContent}
          >
            <View style={styles.modalIcon}>
              <Ionicons name="trash-outline" size={32} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Cancel Request</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to cancel this request? This action cannot
              be undone.
            </Text>
            <View style={styles.modalRequestInfo}>
              <Text style={styles.modalRequestTitle}>
                {selectedRequest.title}
              </Text>
              <Text style={styles.modalRequestId}>
                Request #{selectedRequest.id}
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={handleDeleteRequest}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalDeleteButtonText}>
                    Cancel Request
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Image Viewer */}
      {selectedRequest && normalizedAttachments.length > 0 && (
        <ImageViewer
          images={normalizedAttachments}
          initialIndex={selectedImageIndex}
          visible={showImageViewer}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  buildingName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 4,
  },
  locationDetails: {
    marginTop: 8,
    gap: 6,
  },
  locationDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationDetailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  locationDetailValue: {
    fontSize: 12,
    color: "#374151",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#2563EB",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  assignedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  assignedLabel: {
    fontSize: 13,
    color: "#4B5563",
  },
  assignedValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  progressPercentage: {
    fontSize: 14,
    color: "#6B7280",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  descriptionBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  notesBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
  },
  notesText: {
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
  },
  attachmentsScroll: {
    marginTop: 12,
  },
  attachmentImageContainer: {
    position: "relative",
    marginRight: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  attachmentImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  attachmentOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 16,
    padding: 6,
  },
  commentsEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  commentsEmptyText: {
    fontSize: 13,
    color: "#6B7280",
  },
  commentsList: {
    gap: 12,
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 8,
  },
  commentHeader: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  commentTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  commentBody: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  commentAttachment: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  commentAttachmentImage: {
    width: "100%",
    height: "100%",
  },
  commentAttachmentPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  commentInputBox: {
    gap: 10,
  },
  commentInputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    backgroundColor: "#FFFFFF",
    textAlignVertical: "top",
  },
  commentSendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
  },
  commentSendButtonDisabled: {
    opacity: 0.6,
  },
  commentSendText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  locationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 14,
    color: "#6B7280",
  },
  timelineItem: {
    marginBottom: 12,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 14,
    color: "#6B7280",
  },
  jobStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  jobStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  jobStatusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  completionSubtitle: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 12,
    lineHeight: 18,
  },
  rejectionNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  rejectionNoticeText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
    lineHeight: 18,
  },
  jobInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    columnGap: 16,
    marginBottom: 12,
  },
  jobInfoItem: {
    flexBasis: "48%",
    minWidth: 140,
  },
  jobInfoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  jobInfoValue: {
    fontSize: 14,
    color: "#1F2937",
  },
  jobNotes: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  jobNotesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  jobNotesText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  reviewCompletionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  reviewCompletionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  jobCompletionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  jobCompletionInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#047857",
    lineHeight: 18,
  },
  estimateMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  estimateNotes: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 12,
    lineHeight: 18,
  },
  estimateItems: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  estimateItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  estimateItemInfo: {
    flex: 1,
  },
  estimateItemLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  estimateItemDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  estimateItemAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  estimateTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    paddingTop: 12,
    marginTop: 4,
  },
  estimateTotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  estimateTotalAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  estimateActionRow: {
    flexDirection: "row",
    gap: 12,
  },
  estimateActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  estimateDecline: {
    backgroundColor: "#FEE2E2",
  },
  estimateApprove: {
    backgroundColor: "#2563EB",
  },
  estimateDeclineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  estimateApproveText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  estimateStatusBanner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  estimateStatusText: {
    flex: 1,
    fontSize: 13,
    color: "#1D4ED8",
    lineHeight: 18,
  },
  additionalCostSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  additionalCostChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  additionalCostChipPending: {
    backgroundColor: "#FEF3C7",
  },
  additionalCostChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#047857",
  },
  additionalCostList: {
    gap: 16,
  },
  additionalCostItem: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#F9FAFB",
    gap: 12,
  },
  additionalCostHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  additionalCostTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  additionalCostMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  additionalCostAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  additionalCostStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  additionalCostStatusText: {
    flex: 1,
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
  },
  contactPhone: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  preferredTime: {
    marginTop: 4,
  },
  preferredTimeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  preferredTimeValue: {
    fontSize: 14,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  editForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  priorityButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  priorityButton: {
    flexBasis: "48%",
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  priorityButtonActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  priorityButtonTextActive: {
    color: "#fff",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  ratingSection: {
    alignItems: "center",
    paddingVertical: 8,
  },
  ratingPromptText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    textAlign: "center",
  },
  ratingButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#356FEC",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    gap: 10,
  },
  ratingButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalRequestInfo: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  modalRequestTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  modalRequestId: {
    fontSize: 12,
    color: "#6B7280",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  modalDeleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
