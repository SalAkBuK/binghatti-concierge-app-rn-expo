import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Alert } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  useAppDomain,
  useAuth,
  useRequests,
} from "../../../context/connected-app-provider";
import { upsertResidentRequestSnapshot } from "../../useResidentRequests";
import { apiService } from "../../../services/api";
import { maintenanceApi } from "../../../services/api/maintenance";
import { residentRequestsApi } from "../../../services/api/resident-requests";
import type { Request, RequestPriority } from "../../../types";
import {
  normalizeAttachments,
  normalizePriority,
  normalizeStatus,
} from "./request-details-helpers";

export type RequestDetailsComment = {
  id: string;
  message: string;
  createdAt: string;
  author: string;
  attachments?: string[];
};

export type RequestDetailsEditForm = {
  title: string;
  description: string;
  priority: RequestPriority;
};

const mapCommentAttachments = (comment: any): string[] | undefined => {
  if (!Array.isArray(comment.attachments) || comment.attachments.length === 0) {
    return undefined;
  }

  const attachments = comment.attachments
    .map(
      (attachment: any) =>
        attachment.fileUrl ||
        attachment.url ||
        attachment.uri ||
        attachment.file_url ||
        attachment.path ||
        null,
    )
    .filter(Boolean) as string[];

  return attachments.length > 0 ? attachments : undefined;
};

export const useRequestDetailsScreen = (requestedInitialTab?: string) => {
  const { currentUser } = useAuth();
  const { selectedRequest, actions: requestActions } = useRequests();
  const {
    operations: {
      jobs,
      reviewJobEstimateAsTenant,
      approveTenantJobCompletion,
      getRatingByRequestId,
    },
    property: { getBuildingById },
  } = useAppDomain();
  const { setSelectedRequest, updateRequest } = requestActions;

  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "comments">("overview");
  const [comments, setComments] = useState<RequestDetailsComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const assignedUserIdRef = useRef<string | null>(null);
  const assignedUserNameRef = useRef<string | null>(null);
  const managerNamesRef = useRef<Record<string, string>>({});
  const [resolvedBuildingName, setResolvedBuildingName] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const [editForm, setEditForm] = useState<RequestDetailsEditForm>({
    title: selectedRequest?.title || "",
    description: selectedRequest?.description || "",
    priority: selectedRequest?.priority || ("medium" as const),
  });
  const [loading, setLoading] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const isTenantUser = currentUser?.role === "tenant";
  const lastDetailsFetchRef = useRef<{ id: string | null; inFlight: boolean }>({
    id: null,
    inFlight: false,
  });

  const isBackendRequest = (selectedRequest as any)?._source === "backend";

  const job = useMemo(() => {
    if (!selectedRequest || isBackendRequest) {
      return undefined;
    }
    return jobs.find((item) => item.requestId === selectedRequest.id);
  }, [isBackendRequest, jobs, selectedRequest]);

  const resolveCommentAuthor = useCallback(
    (comment: any): string => {
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
    },
    [currentUser, selectedRequest?.assignedTo],
  );
  const resolveCommentAuthorRef = useRef(resolveCommentAuthor);

  useEffect(() => {
    resolveCommentAuthorRef.current = resolveCommentAuthor;
  }, [resolveCommentAuthor]);

  const mapComments = useCallback((payload: any[], requestId: string) => {
    return payload
      .map((comment: any, index: number) => ({
        id: String(comment.id ?? `${requestId}-comment-${index}`),
        message: comment.commentText || comment.message || comment.text || "",
        createdAt:
          comment.createdAt || comment.created_at || new Date().toISOString(),
        author: resolveCommentAuthorRef.current(comment),
        attachments: mapCommentAttachments(comment),
      }))
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, []);

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
              const managersResponse =
                await apiService.admin.getBuildingManagers(buildingIdNum);
              if (managersResponse.success && Array.isArray(managersResponse.data)) {
                const mapped: Record<string, string> = {};
                managersResponse.data.forEach((manager: any) => {
                  const id = manager.id ?? manager.userId ?? manager.managerId;
                  if (id != null) {
                    mapped[String(id)] =
                      manager.fullName ||
                      manager.name ||
                      manager.email ||
                      (manager.userId ? `User ${manager.userId}` : "Manager");
                  }
                });
                managerNamesRef.current = mapped;
              }
            } catch (managerError) {
              console.warn(
                "[RequestDetails] Failed to fetch building managers",
                managerError,
              );
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
            floor:
              apiRequest.floorNumber != null
                ? String(apiRequest.floorNumber)
                : selectedRequest.floor,
            buildingName: apiRequest.buildingName ?? selectedRequest.buildingName,
            createdAt: apiRequest.createdAt ?? selectedRequest.createdAt,
            updatedAt: apiRequest.updatedAt ?? selectedRequest.updatedAt,
          };

          setSelectedRequest(updatedRequest);
          if (currentUser?.id) {
            upsertResidentRequestSnapshot(currentUser.id, updatedRequest);
          }
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
        setComments(
          commentsPayload.length > 0 ? mapComments(commentsPayload, requestId) : [],
        );
      } else {
        const response = await maintenanceApi.getMaintenanceRequestById(selectedRequest.id);
        if (response.success && response.data) {
          const apiRequest = response.data;
          const assignedUserId =
            apiRequest.assignedTo?.id != null
              ? String(apiRequest.assignedTo.id)
              : null;
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
              assignedUserName || apiRequest.assignedToId || selectedRequest.assignedTo,
            buildingId: apiRequest.buildingId
              ? String(apiRequest.buildingId)
              : selectedRequest.buildingId,
            apartment: apiRequest.unitNumber ?? selectedRequest.apartment,
            floor:
              apiRequest.floorNumber != null
                ? String(apiRequest.floorNumber)
                : selectedRequest.floor,
            buildingName: apiRequest.buildingName ?? selectedRequest.buildingName,
            updatedAt: apiRequest.updatedAt ?? selectedRequest.updatedAt,
          };

          setSelectedRequest(updatedRequest);
          setComments(
            Array.isArray(apiRequest.comments)
              ? mapComments(apiRequest.comments, String(apiRequest.id ?? requestId))
              : [],
          );
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
    currentUser,
    isTenantUser,
    mapComments,
    selectedRequest,
    setSelectedRequest,
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
  }, [selectedRequest?.id]);

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
    selectedRequest?.description,
    selectedRequest?.id,
    selectedRequest?.priority,
    selectedRequest?.title,
  ]);

  useEffect(() => {
    if (requestedInitialTab === "comments") {
      setDetailTab("comments");
      return;
    }

    setDetailTab("overview");
  }, [requestedInitialTab, selectedRequest?.id]);

  useEffect(() => {
    const resolveBuilding = async () => {
      if (!selectedRequest) return;

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
        const building = getBuildingById(String(buildingId));
        if (building?.name) {
          setResolvedBuildingName(building.name);
        }
      } catch (error) {
        console.warn("[RequestDetails] Failed to resolve building name", error);
      }
    };

    void resolveBuilding();
  }, [currentUser?.profile?.buildingId, getBuildingById, selectedRequest]);

  const handleApproveEstimate = useCallback(
    (jobId: string) => {
      Alert.alert("Approve Estimate", "Do you want to proceed with the proposed costs?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              await reviewJobEstimateAsTenant?.(jobId, { decision: "approve" });
              Alert.alert("Estimate Approved", "Thank you for confirming.");
            } catch (error: any) {
              Alert.alert(
                "Error",
                error?.message || "Unable to approve the estimate. Please try again.",
              );
            }
          },
        },
      ]);
    },
    [reviewJobEstimateAsTenant],
  );

  const handleDeclineEstimate = useCallback(
    (jobId: string) => {
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
                await reviewJobEstimateAsTenant?.(jobId, {
                  decision: "decline",
                  notes: reason.trim(),
                });
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
    },
    [reviewJobEstimateAsTenant],
  );

  const handleReviewCompletion = useCallback((jobId: string) => {
    router.push({
      pathname: "/(modals)/approve-job-completion",
      params: { jobId },
    });
  }, []);

  const handleDeleteRequest = useCallback(async () => {
    if (!selectedRequest) return;

    setLoading(true);
    try {
      if (isTenantUser) {
        const response = await residentRequestsApi.cancelRequest(selectedRequest.id);
        const responseHasSuccess =
          response && typeof response === "object" && "success" in response;
        if (responseHasSuccess && response.success === false) {
          throw new Error((response as any).message || "Failed to cancel request");
        }

        if (currentUser?.id) {
          const responsePayload =
            response && typeof response === "object" && "data" in response && response.data
              ? response.data
              : response;
          const cancelledRequest: Request = {
            ...selectedRequest,
            status: normalizeStatus(responsePayload?.status ?? "cancelled"),
            updatedAt:
              responsePayload?.updatedAt ??
              responsePayload?.cancelledAt ??
              new Date().toISOString(),
          };
          setSelectedRequest(cancelledRequest);
          upsertResidentRequestSnapshot(currentUser.id, cancelledRequest);
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
        throw new Error(response.message || "Failed to delete request");
      }
    } catch (error: any) {
      console.error("[RequestDetails] Error deleting request:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to cancel request. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, isTenantUser, selectedRequest, setSelectedRequest]);

  const handleUpdateRequest = useCallback(async () => {
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
          description:
            apiRequest.description ??
            payload.description ??
            selectedRequest.description,
          status: normalizeStatus(apiRequest.status ?? selectedRequest.status),
          priority: normalizePriority(apiRequest.priority ?? selectedRequest.priority),
          attachments: normalizeAttachments(
            apiRequest.attachments ?? selectedRequest.attachments,
          ),
          updatedAt: apiRequest.updatedAt ?? selectedRequest.updatedAt,
        };

        setSelectedRequest(updatedRequest);
        if (currentUser?.id) {
          upsertResidentRequestSnapshot(currentUser.id, updatedRequest);
        }
        setShowEditMode(false);
        Alert.alert("Success", "Request updated successfully");
        return;
      }

      await updateRequest(selectedRequest.id, editForm);
      setShowEditMode(false);
      Alert.alert("Success", "Request updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update request");
      console.error("Error updating request:", error);
    } finally {
      setLoading(false);
    }
  }, [
    currentUser?.id,
    editForm,
    isTenantUser,
    selectedRequest,
    setSelectedRequest,
    updateRequest,
  ]);

  const handleSubmitComment = useCallback(async () => {
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
          const mappedComments = mapComments(
            refreshedPayload,
            String(selectedRequest.id),
          );
          setComments(mappedComments);

          const updatedRequest: Request = {
            ...selectedRequest,
            updatedAt: mappedComments[0]?.createdAt ?? new Date().toISOString(),
          };
          setSelectedRequest(updatedRequest);
          upsertResidentRequestSnapshot(currentUser.id, updatedRequest);
        } else {
          setComments([]);
          const updatedRequest: Request = {
            ...selectedRequest,
            updatedAt: new Date().toISOString(),
          };
          setSelectedRequest(updatedRequest);
          upsertResidentRequestSnapshot(currentUser.id, updatedRequest);
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

      const refreshed = await maintenanceApi.getMaintenanceRequestById(selectedRequest.id);
      if (refreshed.success && refreshed.data?.comments) {
        setComments(
          mapComments(refreshed.data.comments, String(selectedRequest.id)),
        );
      }
    } catch (error) {
      console.error("[RequestDetails] Failed to add comment:", error);
      Alert.alert("Error", "Could not add your comment. Please try again.");
    } finally {
      setIsPostingComment(false);
    }
  }, [
    currentUser?.id,
    isTenantUser,
    mapComments,
    newComment,
    selectedRequest,
    setSelectedRequest,
  ]);

  return {
    currentUser,
    selectedRequest,
    job,
    comments,
    detailTab,
    setDetailTab,
    fetchingDetails,
    newComment,
    setNewComment,
    isPostingComment,
    resolvedBuildingName,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showEditMode,
    setShowEditMode,
    editForm,
    setEditForm,
    loading,
    showImageViewer,
    setShowImageViewer,
    selectedImageIndex,
    setSelectedImageIndex,
    reviewJobEstimateAsTenant,
    approveTenantJobCompletion,
    getRatingByRequestId,
    handleApproveEstimate,
    handleDeclineEstimate,
    handleReviewCompletion,
    handleDeleteRequest,
    handleUpdateRequest,
    handleSubmitComment,
  };
};
