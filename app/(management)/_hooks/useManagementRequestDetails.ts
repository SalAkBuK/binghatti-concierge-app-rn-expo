import { Alert } from 'react-native';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { useRequests } from '../../../lib/context/requests-context';
import { orgBuildingsApi } from '../../../lib/services/api/org-buildings';
import type {
  OrgBuildingRequestComment,
  Request,
  RequestComment,
  RequestStatus,
  User,
} from '../../../lib/types';
import {
  showErrorAlert,
  showSuccessAlert,
} from '../../../lib/utils/alertHelpers';
import {
  formatUserLabel,
  getResponseItems,
  mapPriorityFromApi,
  mapStatusFromApi,
} from './management-request-helpers';

export type RequestDetailAttachment = {
  id: string;
  fileUrl: string;
  fileName?: string;
  contentType?: string;
};

export type ManagementRequestDetailTab =
  | 'overview'
  | 'messages'
  | 'timeline';

type UseManagementRequestDetailsArgs = {
  buildingRequests: Request[];
  currentUser: User | null;
  preselectedBuildingId?: string;
  preselectedRequestId?: string;
  setBuildingRequests: Dispatch<SetStateAction<Request[]>>;
};

const formatStatusLabel = (status: RequestStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');

export const useManagementRequestDetails = ({
  buildingRequests,
  currentUser,
  preselectedBuildingId,
  preselectedRequestId,
  setBuildingRequests,
}: UseManagementRequestDetailsArgs) => {
  const { actions } = useRequests();
  const { setSelectedRequest: setSelectedRequestContext } = actions;

  const buildingRequestsRef = useRef<Request[]>([]);
  const selectedRequestRef = useRef<Request | null>(null);
  const lastFetchedRequestIdRef = useRef<string | null>(null);
  const pendingRequestIdRef = useRef<string | null>(null);

  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [detailTab, setDetailTab] =
    useState<ManagementRequestDetailTab>('overview');
  const [newMessage, setNewMessage] = useState('');
  const [isRequestDetailLoading, setIsRequestDetailLoading] = useState(false);
  const [requestComments, setRequestComments] = useState<RequestComment[]>([]);
  const [requestAttachments, setRequestAttachments] = useState<
    RequestDetailAttachment[]
  >([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const isRequestClosed =
    selectedRequest?.status === 'completed' ||
    selectedRequest?.status === 'cancelled';

  useEffect(() => {
    buildingRequestsRef.current = buildingRequests;
  }, [buildingRequests]);

  useEffect(() => {
    selectedRequestRef.current = selectedRequest;
  }, [selectedRequest]);

  const openRequestDetails = useCallback(
    (request: Request) => {
      const sameRequest = selectedRequestRef.current?.id === request.id;
      console.log('[ManagementRequests] Opening request details modal:', {
        requestId: request.id,
        buildingId: request.buildingId,
        status: request.status,
        assignedTo: request.assignedTo,
      });

      setSelectedRequest(request);
      setSelectedRequestContext(request);
      setDetailTab('overview');

      if (!sameRequest) {
        setRequestComments([]);
        setRequestAttachments([]);
        lastFetchedRequestIdRef.current = null;
      }
    },
    [setSelectedRequestContext],
  );

  const closeRequestDetails = useCallback(() => {
    setSelectedRequest(null);
    setSelectedRequestContext(null);
    setNewMessage('');
    setDetailTab('overview');
    setIsRequestDetailLoading(false);
  }, [setSelectedRequestContext]);

  const fetchRequestDetails = useCallback(
    async (
      requestId: string,
      options?: { force?: boolean; buildingId?: string },
    ) => {
      const normalizedId = String(requestId);
      if (!options?.force && lastFetchedRequestIdRef.current === normalizedId) {
        return;
      }

      console.log('[ManagementRequests] Fetching request details:', {
        requestId: normalizedId,
        force: options?.force ?? false,
      });

      setIsRequestDetailLoading(true);
      try {
        const baseRequest =
          buildingRequestsRef.current.find((request) => request.id === normalizedId) ||
          null;
        const buildingId =
          options?.buildingId ||
          baseRequest?.buildingId ||
          selectedRequestRef.current?.buildingId;

        if (!buildingId) {
          throw new Error('Missing building information for this request.');
        }

        const response = await orgBuildingsApi.getRequest(buildingId, requestId);
        const data = (response as any)?.data ?? response ?? {};
        console.log('[ManagementRequests] Raw request detail response:', response);

        const commentsResponse = await orgBuildingsApi.getComments(
          buildingId,
          requestId,
        );
        console.log('[ManagementRequests] Raw comments response:', commentsResponse);

        const commentItems = getResponseItems<OrgBuildingRequestComment>(
          commentsResponse,
        );
        const commentsPayload =
          commentItems.length > 0
            ? commentItems
            : Array.isArray(data.comments)
              ? data.comments
              : [];

        if (data) {
          const currentSelected = selectedRequestRef.current;
          const baseResolved =
            (currentSelected && currentSelected.id === normalizedId
              ? currentSelected
              : null) ||
            baseRequest ||
            null;
          const mappedStatus = mapStatusFromApi(data.status);
          const mappedPriority = mapPriorityFromApi(data.priority);
          const resolvedAssignedTo = formatUserLabel(
            data.assignedTo?.fullName ||
              data.assignedTo?.name ||
              data.assignedTo?.email ||
              baseResolved?.assignedTo,
          );

          const timelineEvents =
            Array.isArray(data.statusHistory) && data.statusHistory.length > 0
              ? data.statusHistory.map((historyItem: any, index: number) => {
                  const oldStatus = mapStatusFromApi(historyItem.oldStatus);
                  const newStatus = mapStatusFromApi(historyItem.newStatus);

                  const actorName =
                    historyItem.changedBy?.fullName ||
                    historyItem.changedBy?.email ||
                    (historyItem.changedById &&
                    currentUser?.id === historyItem.changedById
                      ? (currentUser as any)?.name ||
                        (currentUser as any)?.fullName ||
                        currentUser?.email ||
                        'Manager'
                      : historyItem.changedById
                        ? `User ${historyItem.changedById}`
                        : undefined);

                  return {
                    id: `history-${historyItem.id || index}`,
                    requestId: String(data.id ?? requestId),
                    eventType: 'status_change' as const,
                    title: `${formatStatusLabel(oldStatus)} → ${formatStatusLabel(newStatus)}`,
                    description: historyItem.note || undefined,
                    actorId: historyItem.changedBy?.id
                      ? String(historyItem.changedBy.id)
                      : historyItem.changedById
                        ? String(historyItem.changedById)
                        : undefined,
                    actorName,
                    metadata: {
                      oldStatus,
                      newStatus,
                    },
                    createdAt: historyItem.changedAt || new Date().toISOString(),
                  };
                })
              : [];

          const mappedComments: RequestComment[] = Array.isArray(commentsPayload)
            ? commentsPayload
                .map((comment, index) => {
                  const author = comment.author ?? undefined;
                  const userName =
                    author?.name?.trim() ||
                    author?.email?.trim() ||
                    'User';
                  const userId = author?.id ? String(author.id) : '';

                  return {
                    id: String(
                      comment.id ?? `${data.id ?? requestId}-comment-${index}`,
                    ),
                    requestId: String(data.id ?? requestId),
                    userId,
                    userName,
                    message: comment.message || comment.commentText || '',
                    createdAt: comment.createdAt || new Date().toISOString(),
                    channel: comment.channel || comment.visibility || 'internal',
                    attachments: Array.isArray(comment.attachments)
                      ? comment.attachments
                          .map((attachment: any) =>
                            attachment?.fileUrl ||
                            attachment?.url ||
                            attachment?.uri ||
                            attachment,
                          )
                          .filter(Boolean)
                      : undefined,
                  };
                })
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
                )
            : [];

          const mappedAttachments =
            Array.isArray(data.attachments) && data.attachments.length > 0
              ? data.attachments
                  .map((attachment: any, index: number) => ({
                    id: String(attachment.id ?? `${data.id}-att-${index}`),
                    fileUrl:
                      attachment.fileUrl ||
                      attachment.url ||
                      attachment.uri ||
                      '',
                    fileName: attachment.fileName || attachment.name,
                    contentType: attachment.contentType || attachment.mimeType,
                  }))
                  .filter((attachment: RequestDetailAttachment) => attachment.fileUrl)
              : [];

          const fallbackAttachments =
            !mappedAttachments.length && baseRequest?.attachments?.length
              ? baseRequest.attachments.map((uri, index) => ({
                  id: `${requestId}-fallback-${index}`,
                  fileUrl: uri,
                }))
              : [];
          const attachmentsForRequest =
            mappedAttachments.length > 0
              ? mappedAttachments
              : fallbackAttachments;

          setRequestComments(mappedComments);
          setRequestAttachments(attachmentsForRequest);

          const unit = data.unit || data.unitDetails;
          const mappedRequest: Request = {
            id: String(data.id ?? baseRequest?.id ?? requestId),
            title: data.title || baseRequest?.title || 'Untitled Request',
            description: data.description || baseRequest?.description || '',
            type: baseRequest?.type || 'maintenance',
            status: mappedStatus,
            priority: mappedPriority,
            tenantId: baseRequest?.tenantId || '',
            assignedTo: resolvedAssignedTo,
            buildingId: String(data.buildingId ?? baseRequest?.buildingId ?? ''),
            buildingName: data.buildingName || baseRequest?.buildingName,
            apartment:
              unit?.label ||
              data.unitLabel ||
              data.unitNumber ||
              baseRequest?.apartment ||
              '',
            tower: baseRequest?.tower,
            floor:
              data.floorNumber != null
                ? String(data.floorNumber)
                : unit?.floor != null
                  ? String(unit.floor)
                  : baseRequest?.floor,
            preferredTime: data.preferredTime || baseRequest?.preferredTime,
            contactPhone: data.contactPhone || baseRequest?.contactPhone,
            additionalNotes: data.additionalNotes || baseRequest?.additionalNotes,
            attachments:
              attachmentsForRequest.length > 0
                ? attachmentsForRequest.map((attachment) => attachment.fileUrl)
                : baseRequest?.attachments || [],
            slaDueAt: baseRequest?.slaDueAt,
            lastEscalatedAt: baseRequest?.lastEscalatedAt,
            comments: mappedComments,
            messages: baseRequest?.messages || [],
            notes: [],
            timeline:
              timelineEvents.length > 0
                ? timelineEvents
                : baseRequest?.timeline || [],
            createdAt:
              data.createdAt || baseRequest?.createdAt || new Date().toISOString(),
            updatedAt:
              data.updatedAt ||
              baseRequest?.updatedAt ||
              data.createdAt ||
              new Date().toISOString(),
          };

          const completedAt =
            (data as any).completedAt ||
            (baseRequest as any)?.completedAt ||
            undefined;
          const mappedRequestWithCompletion = completedAt
            ? ({ ...mappedRequest, completedAt } as Request)
            : mappedRequest;

          setSelectedRequest(mappedRequestWithCompletion);
          setSelectedRequestContext(mappedRequestWithCompletion);
          lastFetchedRequestIdRef.current = normalizedId;

          setBuildingRequests((previousRequests) =>
            previousRequests.map((request) =>
              request.id === String(data.id ?? normalizedId)
                ? {
                    ...request,
                    status: mappedStatus,
                    priority: mappedPriority,
                    assignedTo: resolvedAssignedTo || request.assignedTo,
                    updatedAt: mappedRequest.updatedAt || request.updatedAt,
                    createdAt: mappedRequest.createdAt || request.createdAt,
                    ...(completedAt ? { completedAt } : {}),
                  }
                : request,
            ),
          );
        }
      } catch (error) {
        console.error('[ManagementRequests] Failed to fetch request details:', error);
      } finally {
        setIsRequestDetailLoading(false);
      }
    },
    [currentUser, setBuildingRequests, setSelectedRequestContext],
  );

  const handleAddMessage = useCallback(async () => {
    if (!selectedRequest || !newMessage.trim() || !currentUser) return;
    if (isRequestClosed) return;

    const buildingId = selectedRequest.buildingId;
    if (!buildingId) {
      Alert.alert('Cannot send message', 'Missing building information.');
      return;
    }

    setIsSendingMessage(true);
    try {
      const response = await orgBuildingsApi.addComment(
        buildingId,
        selectedRequest.id,
        newMessage.trim(),
      );
      if (response?.success === false) {
        throw new Error(response.message || 'Failed to add comment');
      }

      setNewMessage('');
      await fetchRequestDetails(selectedRequest.id, { force: true });
    } catch (error) {
      showErrorAlert(error);
    } finally {
      setIsSendingMessage(false);
    }
  }, [
    currentUser,
    fetchRequestDetails,
    isRequestClosed,
    newMessage,
    selectedRequest,
  ]);

  const handleMarkAsCompleted = useCallback(async () => {
    if (!selectedRequest || !currentUser?.id) return;
    if ((selectedRequest.status as string) === 'assigned') {
      Alert.alert(
        'Cannot mark as completed',
        'This request is still assigned. The worker has not started the job yet.',
      );
      return;
    }

    Alert.alert(
      'Mark as Completed',
      'Are you sure you want to mark this request as completed?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            setIsRequestDetailLoading(true);
            try {
              const buildingId = selectedRequest.buildingId;
              if (!buildingId) {
                throw new Error('Missing building information for this request.');
              }

              const response = await orgBuildingsApi.updateRequestStatus(
                buildingId,
                selectedRequest.id,
                'COMPLETED',
              );
              if (response?.success === false) {
                throw new Error(response.message || 'Failed to update status');
              }

              showSuccessAlert('Request marked as completed');

              const updatedSelectedRequest = {
                ...selectedRequest,
                status: 'completed' as RequestStatus,
              };
              setSelectedRequest(updatedSelectedRequest);
              setSelectedRequestContext(updatedSelectedRequest);

              setBuildingRequests((previousRequests) =>
                previousRequests.map((request) =>
                  request.id === selectedRequest.id
                    ? { ...request, status: 'completed' as RequestStatus }
                    : request,
                ),
              );

              await fetchRequestDetails(selectedRequest.id, { force: true });
            } catch (error) {
              console.error(
                '[ManagementRequests] Failed to mark as completed:',
                error,
              );
              const errorStatus = (error as any)?.status;
              const errorCode = (error as any)?.code;
              if (errorStatus === 409 || errorCode === '409') {
                Alert.alert(
                  'Cannot mark as completed',
                  'This request is still assigned. The worker has not started the job yet.',
                );
              } else {
                showErrorAlert(error);
              }
            } finally {
              setIsRequestDetailLoading(false);
            }
          },
        },
      ],
    );
  }, [
    currentUser?.id,
    fetchRequestDetails,
    selectedRequest,
    setBuildingRequests,
    setSelectedRequestContext,
  ]);

  const handleCancelRequest = useCallback(async () => {
    if (!selectedRequest) return;

    Alert.alert('Cancel Request', 'Are you sure you want to cancel this request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setIsRequestDetailLoading(true);
          try {
            const buildingId = selectedRequest.buildingId;
            if (!buildingId) {
              throw new Error('Missing building information for this request.');
            }

            const response = await orgBuildingsApi.cancelRequest(
              buildingId,
              selectedRequest.id,
            );
            if (response?.success === false) {
              throw new Error(response.message || 'Failed to cancel request');
            }

            showSuccessAlert('Request cancelled');

            const updatedSelectedRequest = {
              ...selectedRequest,
              status: 'cancelled' as RequestStatus,
            };
            setSelectedRequest(updatedSelectedRequest);
            setSelectedRequestContext(updatedSelectedRequest);

            setBuildingRequests((previousRequests) =>
              previousRequests.map((request) =>
                request.id === selectedRequest.id
                  ? { ...request, status: 'cancelled' as RequestStatus }
                  : request,
              ),
            );

            await fetchRequestDetails(selectedRequest.id, { force: true });
          } catch (error) {
            console.error(
              '[ManagementRequests] Failed to cancel request:',
              error,
            );
            showErrorAlert(error);
          } finally {
            setIsRequestDetailLoading(false);
          }
        },
      },
    ]);
  }, [
    fetchRequestDetails,
    selectedRequest,
    setBuildingRequests,
    setSelectedRequestContext,
  ]);

  useEffect(() => {
    const requestId = preselectedRequestId ? String(preselectedRequestId) : null;
    if (!requestId || pendingRequestIdRef.current === requestId) {
      return;
    }

    const request = buildingRequests.find((item) => item.id === requestId);
    if (request) {
      pendingRequestIdRef.current = requestId;
      openRequestDetails(request);
      void fetchRequestDetails(requestId, { force: true });
      return;
    }

    if (preselectedBuildingId) {
      pendingRequestIdRef.current = requestId;
      void fetchRequestDetails(requestId, {
        force: true,
        buildingId: String(preselectedBuildingId),
      });
    }
  }, [
    buildingRequests,
    fetchRequestDetails,
    openRequestDetails,
    preselectedBuildingId,
    preselectedRequestId,
  ]);

  useEffect(() => {
    if (selectedRequest?.id) {
      const normalizedId = String(selectedRequest.id);
      if (lastFetchedRequestIdRef.current !== normalizedId) {
        void fetchRequestDetails(normalizedId);
      } else {
        setIsRequestDetailLoading(false);
      }
    }
  }, [fetchRequestDetails, selectedRequest?.id]);

  return {
    selectedRequest,
    detailTab,
    setDetailTab,
    newMessage,
    setNewMessage,
    isRequestDetailLoading,
    requestComments,
    requestAttachments,
    isSendingMessage,
    isRequestClosed,
    openRequestDetails,
    closeRequestDetails,
    handleAddMessage,
    handleMarkAsCompleted,
    handleCancelRequest,
  };
};
