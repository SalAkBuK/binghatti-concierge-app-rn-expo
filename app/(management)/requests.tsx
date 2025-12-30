import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
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
import { orgBuildingsApi } from "../../lib/services/api/org-buildings";
import type {
  Building,
  OrgBuildingRequestComment,
  Request,
  RequestComment,
  RequestPriority,
  RequestStatus,
} from "../../lib/types";
import {
  filterNotificationsByUser,
  formatDateTime,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";

// Helper function to map backend status to frontend status
// 1=New, 2=Assigned, 3=InProgress, 4=OnHold, 5=Completed, 6=Cancelled
const mapStatusFromApi = (status: any): RequestStatus => {
  if (typeof status === "number") {
    switch (status) {
      case 0:
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
  }

  const normalized = String(status || "").toUpperCase();
  if (["OPEN"].includes(normalized)) return "pending";
  if (["ASSIGNED"].includes(normalized)) return "assigned";
  if (["IN_PROGRESS"].includes(normalized)) return "in-progress";
  if (["COMPLETED"].includes(normalized)) return "completed";
  if (["CANCELED", "CANCELLED"].includes(normalized)) return "cancelled";
  return "pending";
};

// Helper function to map backend priority to frontend priority
const mapPriorityFromApi = (priority: any): RequestPriority => {
  if (typeof priority === "number") {
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
  }

  const normalized = String(priority || "").toUpperCase();
  if (normalized === "LOW") return "low";
  if (normalized === "NORMAL" || normalized === "MEDIUM") return "medium";
  if (normalized === "HIGH") return "high";
  if (normalized === "URGENT") return "urgent";
  return "medium";
};

const formatUserLabel = (value?: string | null) => {
  if (!value) return "";
  if (!value.includes("@")) return value;
  const namePart = value.split("@")[0] || "";
  const cleaned = namePart.replace(/[._-]+/g, " ").trim();
  if (!cleaned) return value;
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

type StatusFilter = "all" | RequestStatus;
type PriorityFilter = "all" | Request["priority"];
type TypeFilter = "all" | NonNullable<Request["type"]>;

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Assigned", value: "assigned" },
  { label: "In Progress", value: "in-progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const REQUESTS_REFETCH_COOLDOWN_MS = 15000;

export default function ManagementRequestsScreen() {
  const params = useLocalSearchParams<{
    statusFilter?: string;
    requestId?: string;
    buildingId?: string;
  }>();
  const {
    currentUser,
    notifications,
    actions,
  } = useApp();
  const {
    setSelectedRequest: setSelectedRequestContext,
  } = actions;

  // State for API-fetched data
  const [managedBuildings, setManagedBuildings] = useState<Building[]>([]);
  const [buildingRequests, setBuildingRequests] = useState<Request[]>([]);
  const buildingRequestsRef = useRef<Request[]>([]);
  const selectedRequestRef = useRef<Request | null>(null);
  const lastFetchedRequestIdRef = useRef<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (params.statusFilter as StatusFilter) || "all"
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "messages" | "timeline">("overview");
  const [newMessage, setNewMessage] = useState("");
  const [isRequestDetailLoading, setIsRequestDetailLoading] = useState(false);
  const [requestComments, setRequestComments] = useState<RequestComment[]>([]);
  const [requestAttachments, setRequestAttachments] = useState<
    { id: string; fileUrl: string; fileName?: string; contentType?: string }[]
  >([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Assignment modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<"service_provider" | "building_employee">("building_employee");
  const [maintenanceStaff, setMaintenanceStaff] = useState<{
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    isActive: boolean;
  }[]>([]);
  const [serviceProviders, setServiceProviders] = useState<{
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    isActive: boolean;
  }[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);

  // Pagination state
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasAnimatedHeaderRef = useRef(false);
  const lastRequestsFetchAtRef = useRef(0);
  const isRequestsFetchInFlightRef = useRef(false);
  const pendingRequestIdRef = useRef<string | null>(null);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isRequestClosed =
    selectedRequest?.status === "completed" || selectedRequest?.status === "cancelled";

  // Fetch buildings and requests from API
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.id) {
        setLoadingData(false);
        return;
      }

      const now = Date.now();
      if (isRequestsFetchInFlightRef.current) {
        return;
      }
      if (now - lastRequestsFetchAtRef.current < REQUESTS_REFETCH_COOLDOWN_MS) {
        return;
      }

      isRequestsFetchInFlightRef.current = true;
      lastRequestsFetchAtRef.current = now;
      setLoadingData(true);
      try {
        // Fetch buildings for this manager
        console.log("[ManagementRequests] Fetching assigned buildings for manager:", currentUser.id);
        const buildingsResponse = await orgBuildingsApi.getAssignedBuildings();
        const buildingsPayload = Array.isArray(buildingsResponse)
          ? buildingsResponse
          : Array.isArray(buildingsResponse?.data)
            ? buildingsResponse.data
            : [];

        if (buildingsPayload.length > 0) {
          const buildings = buildingsPayload.map((building: any): Building => ({
            id: String(building?.id ?? building?.buildingId ?? ""),
            name:
              building?.name ||
              building?.buildingName ||
              building?.title ||
              "Building",
            address: building?.address || "",
            city: building?.city || "",
            country: building?.country || "",
            emirate: building?.emirate,
            community: building?.community,
            street: building?.street,
            plotNumber: building?.plotNumber,
            buildingNumber: building?.buildingNumber,
            makaniNumber: building?.makaniNumber,
            buildingType: building?.buildingType,
            developer: building?.developer,
            yearBuilt: building?.yearBuilt,
            totalFloors: building?.totalFloors,
            utilityPremisesNumber: building?.utilityPremisesNumber,
            managerId: building?.managerId,
            managerName: building?.managerName,
            totalUnits: building?.totalUnits ?? 0,
            occupiedUnits: building?.occupiedUnits ?? 0,
            unitBreakdown: building?.unitBreakdown,
            amenities: building?.amenities ?? [],
            status: building?.status ?? "active",
            createdAt: building?.createdAt ?? new Date().toISOString(),
            updatedAt: building?.updatedAt ?? new Date().toISOString(),
            location: building?.location,
            units: building?.units,
          }));

          setManagedBuildings(buildings);
          console.log("[ManagementRequests] Buildings fetched:", buildings.length);

          // Fetch requests for all buildings in parallel
          if (buildings.length > 0) {
            const requestsPromises = buildings.map((building) =>
              orgBuildingsApi.getBuildingRequests(building.id),
            );

            const requestsResponses = await Promise.all(requestsPromises);

            // Combine all requests from all buildings
            const allRequests: Request[] = [];
            requestsResponses.forEach((response, index) => {
              const payload = Array.isArray(response)
                ? response
                : Array.isArray(response?.data)
                  ? response.data
                  : [];

              if (payload.length > 0) {
                const buildingId = buildings[index].id;
                const buildingName = buildings[index].name;
                const mappedRequests = payload.map((item: any) => {
                  const unit = item.unit || item.unitDetails;
                  return {
                    id: String(item.id),
                    type: "maintenance",
                    buildingId: String(item.buildingId ?? buildingId),
                    buildingName: item.buildingName || buildingName,
                    tenantId:
                      item.createdByUserId != null
                        ? String(item.createdByUserId)
                        : item.createdById != null
                          ? String(item.createdById)
                          : item.createdByTenantId != null
                            ? String(item.createdByTenantId)
                            : "",
                    title: item.title || "Untitled Request",
                    description: item.description || "",
                    status: mapStatusFromApi(item.status),
                    priority: mapPriorityFromApi(item.priority),
                    createdAt: item.createdAt || new Date().toISOString(),
                    updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
                    apartment:
                      unit?.label ||
                      item.unitLabel ||
                      item.unitNumber ||
                      item.apartment ||
                      "",
                    floor:
                      item.floorNumber != null
                        ? String(item.floorNumber)
                        : unit?.floor != null
                          ? String(unit.floor)
                          : "",
                    contactPhone: item.contactPhone || "",
                    preferredTime: item.preferredTime || "",
                    additionalNotes: item.additionalNotes || "",
                    assignedTo: formatUserLabel(
                      item.assignedTo?.fullName ||
                        item.assignedTo?.name ||
                        item.assignedTo?.email ||
                        (item.assignedEmployeeId ? String(item.assignedEmployeeId) : undefined) ||
                        (item.assignedToId ? String(item.assignedToId) : undefined),
                    ),
                    attachments: Array.isArray(item.attachments)
                      ? item.attachments
                          .map((att: any) => att.fileUrl || att.url || att.uri || "")
                          .filter(Boolean)
                      : [],
                    comments: [],
                    messages: [],
                    notes: [],
                    timeline: [],
                  } as Request;
                });
                allRequests.push(...mappedRequests);
              }
            });

            console.log('[ManagementRequests] Total requests fetched:', allRequests.length);
            setBuildingRequests(allRequests);
          } else {
            setBuildingRequests([]);
          }
        } else {
          setManagedBuildings([]);
          setBuildingRequests([]);
        }
      } catch (error) {
        console.error('[ManagementRequests] Failed to fetch data:', error);
        setManagedBuildings([]);
        setBuildingRequests([]);
      } finally {
        setLoadingData(false);
        isRequestsFetchInFlightRef.current = false;
      }
    };

    fetchData();
  }, [currentUser?.id]);

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

  // Update status filter when navigation params change
  useEffect(() => {
    if (params.statusFilter) {
      setStatusFilter(params.statusFilter as StatusFilter);
    }
  }, [params.statusFilter]);

  const priorityOptions = useMemo(() => {
    const priorities = new Set<Request["priority"]>();
    buildingRequests.forEach((request) => {
      if (request.priority) {
        priorities.add(request.priority);
      }
    });
    return ["all", ...Array.from(priorities)] as PriorityFilter[];
  }, [buildingRequests]);

  const typeOptions = useMemo(() => {
    const types = new Set<NonNullable<Request["type"]>>();
    buildingRequests.forEach((request) => {
      if (request.type) {
        types.add(request.type);
      }
    });
    return ["all", ...Array.from(types)] as TypeFilter[];
  }, [buildingRequests]);

  useEffect(() => {
    buildingRequestsRef.current = buildingRequests;
  }, [buildingRequests]);

  useEffect(() => {
    selectedRequestRef.current = selectedRequest;
  }, [selectedRequest]);

  // Removed jobs and getJobForRequest - no longer needed after Jobs screen consolidation

  const scopedRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const buildingScope =
      selectedBuildingId === "all"
        ? managedBuildings.map((building) => building.id)
        : [selectedBuildingId];

    return buildingRequests
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
    buildingRequests,
    managedBuildings,
    selectedBuildingId,
    statusFilter,
    priorityFilter,
    typeFilter,
    searchQuery,
  ]);

  // Paginated requests - only show items up to current page
  const paginatedRequests = useMemo(() => {
    return scopedRequests.slice(0, currentPage * ITEMS_PER_PAGE);
  }, [scopedRequests, currentPage, ITEMS_PER_PAGE]);

  const hasMoreRequests = paginatedRequests.length < scopedRequests.length;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBuildingId, statusFilter, priorityFilter, typeFilter]);

  // Removed jobForSelectedRequest - no longer needed since we handle assignment directly

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  const buildingFilterOptions = useMemo(() => {
    if (!managedBuildings.length) return [];
    return managedBuildings;
  }, [managedBuildings]);

  const isImageAttachment = (attachment: {
    fileUrl: string;
    fileName?: string;
    contentType?: string;
  }) => {
    const name = (attachment.fileName || attachment.fileUrl || "").toLowerCase();
    if (attachment.contentType?.startsWith("image/")) return true;
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
  };

  const isImageUri = (uri: string) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(uri);

  const handleAddMessage = async () => {
    if (!selectedRequest || !newMessage.trim() || !currentUser) return;
    if (isRequestClosed) return;

    const buildingId = selectedRequest.buildingId;
    if (!buildingId) {
      Alert.alert("Cannot send message", "Missing building information.");
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
        throw new Error(response.message || "Failed to add comment");
      }
      setNewMessage("");
      await fetchRequestDetails(selectedRequest.id, { force: true });
    } catch (error) {
      showErrorAlert(error);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Fetch workers when assign modal is opened
  useEffect(() => {
    const fetchWorkers = async () => {
      if (!showAssignModal || !selectedRequest?.buildingId) {
        setMaintenanceStaff([]);
        setServiceProviders([]);
        return;
      }

      setIsLoadingWorkers(true);
      try {
        const buildingId = selectedRequest.buildingId;
        console.log(
          "[ManagementRequests] Loading assignments for building:",
          buildingId,
        );
        const assignmentsResponse = await orgBuildingsApi.getAssignments(buildingId);
        const assignmentsPayload = Array.isArray(assignmentsResponse)
          ? assignmentsResponse
          : Array.isArray(assignmentsResponse?.data)
            ? assignmentsResponse.data
            : [];

        console.log("[ManagementRequests] Assignments response:", assignmentsPayload);
        console.log(
          "[ManagementRequests] Assignments count:",
          assignmentsPayload.length,
        );

        const staffList = assignmentsPayload
          .map((assignment: any) => {
            const assignmentType = String(assignment?.type || "").toUpperCase();
            if (assignmentType !== "STAFF") {
              return null;
            }
            const user = assignment.user ?? assignment;
            const id = String(assignment.userId ?? user?.id ?? user?.userId ?? "");
            if (!id) return null;
            return {
              id,
              fullName:
                user?.fullName ||
                user?.name ||
                user?.email ||
                "Staff Member",
              email: user?.email || "",
              phoneNumber: user?.phone || user?.phoneNumber || "",
              isActive: true,
            };
          })
          .filter(Boolean) as {
          id: string;
          fullName: string;
          email: string;
          phoneNumber: string;
          isActive: boolean;
        }[];

        console.log(
          "[ManagementRequests] Scoped staff list:",
          staffList.map((staff) => ({
            id: staff.id,
            name: staff.fullName,
            email: staff.email,
          })),
        );

        setMaintenanceStaff(staffList);
        setServiceProviders([]);
      } catch (error) {
        console.error('[Requests] Failed to fetch workers:', error);
        setMaintenanceStaff([]);
        setServiceProviders([]);
      } finally {
        setIsLoadingWorkers(false);
      }
    };

    fetchWorkers();
  }, [showAssignModal, selectedRequest?.buildingId]);

  const handleAssignRequest = async (workerId: string, workerName: string) => {
    if (!selectedRequest || !currentUser?.id) return;

    setIsAssigning(true);
    try {
      const buildingId = selectedRequest.buildingId;
      if (!buildingId) {
        throw new Error("Missing building information for this request.");
      }

      const response = await orgBuildingsApi.assignRequest(
        buildingId,
        selectedRequest.id,
        workerId,
      );
      if (response?.success === false) {
        throw new Error(response.message || "Failed to assign request");
      }

      showSuccessAlert(`Request assigned to ${workerName}`);
      setShowAssignModal(false);
      setSelectedRequest(null);

      // Refresh requests for this building
      const refreshed = await orgBuildingsApi.getBuildingRequests(buildingId);
      const payload = Array.isArray(refreshed)
        ? refreshed
        : Array.isArray(refreshed?.data)
          ? refreshed.data
          : [];

      if (payload.length > 0) {
        const buildingName = managedBuildings.find((b) => b.id === buildingId)?.name;
        const mappedRequests = payload.map((item: any) => {
          const unit = item.unit || item.unitDetails;
          return {
            id: String(item.id),
            type: "maintenance",
            buildingId: String(item.buildingId ?? buildingId),
            buildingName: item.buildingName || buildingName,
            tenantId:
              item.createdByUserId != null
                ? String(item.createdByUserId)
                : item.createdById != null
                  ? String(item.createdById)
                  : item.createdByTenantId != null
                    ? String(item.createdByTenantId)
                    : "",
            title: item.title || "Untitled Request",
            description: item.description || "",
            status: mapStatusFromApi(item.status),
            priority: mapPriorityFromApi(item.priority),
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
            apartment:
              unit?.label ||
              item.unitLabel ||
              item.unitNumber ||
              item.apartment ||
              "",
            floor:
              item.floorNumber != null
                ? String(item.floorNumber)
                : unit?.floor != null
                  ? String(unit.floor)
                  : "",
            contactPhone: item.contactPhone || "",
            preferredTime: item.preferredTime || "",
            additionalNotes: item.additionalNotes || "",
            assignedTo: formatUserLabel(
              item.assignedTo?.fullName ||
                item.assignedTo?.name ||
                item.assignedTo?.email ||
                (item.assignedEmployeeId ? String(item.assignedEmployeeId) : undefined) ||
                (item.assignedToId ? String(item.assignedToId) : undefined),
            ),
            attachments: Array.isArray(item.attachments)
              ? item.attachments
                  .map((att: any) => att.fileUrl || att.url || att.uri || "")
                  .filter(Boolean)
              : [],
            comments: [],
            messages: [],
            notes: [],
            timeline: [],
          } as Request;
        });

        setBuildingRequests((prev) => {
          const next = prev.filter((req) => req.buildingId !== buildingId);
          return [...next, ...mappedRequests];
        });
      }
    } catch (error) {
      console.error('[Requests] Assignment failed:', error);
      showErrorAlert(error);
    } finally {
      setIsAssigning(false);
    }
  };

  const openAssignModal = () => {
    if (!selectedRequest) return;

    // Allow assignment for pending, assigned, and in-progress requests
    if (
      selectedRequest.status !== "pending" &&
      selectedRequest.status !== "in-progress" &&
      (selectedRequest.status as string) !== "assigned"
    ) {
      Alert.alert(
        "Cannot Assign",
        "Only pending, assigned, or in-progress requests can be (re)assigned. This request is already completed or cancelled."
      );
      return;
    }

    setShowAssignModal(true);
  };

  const handleMarkAsCompleted = async () => {
    if (!selectedRequest || !currentUser?.id) return;
    if ((selectedRequest.status as string) === "assigned") {
      Alert.alert(
        "Cannot mark as completed",
        "This request is still assigned. The worker has not started the job yet.",
      );
      return;
    }

    // Confirm action
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
            setIsRequestDetailLoading(true);
            try {
              const buildingId = selectedRequest.buildingId;
              if (!buildingId) {
                throw new Error("Missing building information for this request.");
              }

              const response = await orgBuildingsApi.updateRequestStatus(
                buildingId,
                selectedRequest.id,
                "COMPLETED",
              );
              if (response?.success === false) {
                throw new Error(response.message || "Failed to update status");
              }

              showSuccessAlert('Request marked as completed');

              // Update the selected request locally
              setSelectedRequest(prev => prev ? { ...prev, status: 'completed' } : null);

              // Update in the list
              setBuildingRequests(prev => prev.map(req =>
                req.id === selectedRequest.id
                  ? { ...req, status: 'completed' as RequestStatus }
                  : req
              ));

              // Fetch fresh details
              await fetchRequestDetails(selectedRequest.id, { force: true });
            } catch (error) {
              console.error('[Requests] Failed to mark as completed:', error);
              const errorStatus = (error as any)?.status;
              const errorCode = (error as any)?.code;
              if (errorStatus === 409 || errorCode === "409") {
                Alert.alert(
                  "Cannot mark as completed",
                  "This request is still assigned. The worker has not started the job yet.",
                );
              } else {
                showErrorAlert(error);
              }
            } finally {
              setIsRequestDetailLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCancelRequest = async () => {
    if (!selectedRequest) return;
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel this request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setIsRequestDetailLoading(true);
            try {
              const buildingId = selectedRequest.buildingId;
              if (!buildingId) {
                throw new Error("Missing building information for this request.");
              }

              const response = await orgBuildingsApi.cancelRequest(
                buildingId,
                selectedRequest.id,
              );
              if (response?.success === false) {
                throw new Error(response.message || "Failed to cancel request");
              }

              showSuccessAlert("Request cancelled");
              setSelectedRequest((prev) =>
                prev ? { ...prev, status: "cancelled" } : null,
              );
              setBuildingRequests((prev) =>
                prev.map((req) =>
                  req.id === selectedRequest.id
                    ? { ...req, status: "cancelled" as RequestStatus }
                    : req,
                ),
              );
              await fetchRequestDetails(selectedRequest.id, { force: true });
            } catch (error) {
              console.error("[ManagementRequests] Failed to cancel request:", error);
              showErrorAlert(error);
            } finally {
              setIsRequestDetailLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreRequests) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setIsLoadingMore(false);
      }, 300);
    }
  };

  const handleRefresh = async () => {
    if (!currentUser?.id) return;

    setIsRefreshing(true);
    setCurrentPage(1);
    if (isRequestsFetchInFlightRef.current) {
      setIsRefreshing(false);
      return;
    }

    lastRequestsFetchAtRef.current = 0;
    try {
      console.log("[ManagementRequests] Refreshing assigned buildings for manager:", currentUser.id);
      const buildingsResponse = await orgBuildingsApi.getAssignedBuildings();
      const buildingsPayload = Array.isArray(buildingsResponse)
        ? buildingsResponse
        : Array.isArray(buildingsResponse?.data)
          ? buildingsResponse.data
          : [];

      if (buildingsPayload.length > 0) {
        const buildings = buildingsPayload.map((building: any): Building => ({
          id: String(building?.id ?? building?.buildingId ?? ""),
          name:
            building?.name ||
            building?.buildingName ||
            building?.title ||
            "Building",
          address: building?.address || "",
          city: building?.city || "",
          country: building?.country || "",
          emirate: building?.emirate,
          community: building?.community,
          street: building?.street,
          plotNumber: building?.plotNumber,
          buildingNumber: building?.buildingNumber,
          makaniNumber: building?.makaniNumber,
          buildingType: building?.buildingType,
          developer: building?.developer,
          yearBuilt: building?.yearBuilt,
          totalFloors: building?.totalFloors,
          utilityPremisesNumber: building?.utilityPremisesNumber,
          managerId: building?.managerId,
          managerName: building?.managerName,
          totalUnits: building?.totalUnits ?? 0,
          occupiedUnits: building?.occupiedUnits ?? 0,
          unitBreakdown: building?.unitBreakdown,
          amenities: building?.amenities ?? [],
          status: building?.status ?? "active",
          createdAt: building?.createdAt ?? new Date().toISOString(),
          updatedAt: building?.updatedAt ?? new Date().toISOString(),
          location: building?.location,
          units: building?.units,
        }));

        setManagedBuildings(buildings);

        if (buildings.length > 0) {
          const requestsPromises = buildings.map((building) =>
            orgBuildingsApi.getBuildingRequests(building.id),
          );

          const requestsResponses = await Promise.all(requestsPromises);
          const allRequests: Request[] = [];

          requestsResponses.forEach((response, index) => {
            const payload = Array.isArray(response)
              ? response
              : Array.isArray(response?.data)
                ? response.data
                : [];

            if (payload.length > 0) {
              const buildingId = buildings[index].id;
              const buildingName = buildings[index].name;
              const mappedRequests = payload.map((item: any) => {
                const unit = item.unit || item.unitDetails;
                return {
                  id: String(item.id),
                  type: "maintenance",
                  buildingId: String(item.buildingId ?? buildingId),
                  buildingName: item.buildingName || buildingName,
                  tenantId:
                    item.createdByUserId != null
                      ? String(item.createdByUserId)
                      : item.createdById != null
                        ? String(item.createdById)
                        : item.createdByTenantId != null
                          ? String(item.createdByTenantId)
                          : "",
                  title: item.title || "Untitled Request",
                  description: item.description || "",
                  status: mapStatusFromApi(item.status),
                  priority: mapPriorityFromApi(item.priority),
                  createdAt: item.createdAt || new Date().toISOString(),
                  updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
                  apartment:
                    unit?.label ||
                    item.unitLabel ||
                    item.unitNumber ||
                    item.apartment ||
                    "",
                  floor:
                    item.floorNumber != null
                      ? String(item.floorNumber)
                      : unit?.floor != null
                        ? String(unit.floor)
                        : "",
                  contactPhone: item.contactPhone || "",
                  preferredTime: item.preferredTime || "",
                  additionalNotes: item.additionalNotes || "",
                  assignedTo: formatUserLabel(
                    item.assignedTo?.fullName ||
                      item.assignedTo?.name ||
                      item.assignedTo?.email ||
                      (item.assignedEmployeeId ? String(item.assignedEmployeeId) : undefined) ||
                      (item.assignedToId ? String(item.assignedToId) : undefined),
                  ),
                  attachments: Array.isArray(item.attachments)
                    ? item.attachments
                        .map((att: any) => att.fileUrl || att.url || att.uri || "")
                        .filter(Boolean)
                    : [],
                  comments: [],
                  messages: [],
                  notes: [],
                  timeline: [],
                } as Request;
              });
              allRequests.push(...mappedRequests);
            }
          });

          console.log("[ManagementRequests] Refreshed requests:", allRequests.length);
          setBuildingRequests(allRequests);
        } else {
          setBuildingRequests([]);
        }
      } else {
        setManagedBuildings([]);
        setBuildingRequests([]);
      }
    } catch (error) {
      console.error("[ManagementRequests] Failed to refresh:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const requestStatusBadge = (status: RequestStatus) => {
    const palette = {
      pending: { bg: "#FEF3C7", text: "#92400E" },
      assigned: { bg: "#DBEAFE", text: "#1D4ED8" },
      "in-progress": { bg: "#DBEAFE", text: "#1D4ED8" },
      "on-hold": { bg: "#FED7AA", text: "#9A3412" },
      completed: { bg: "#DCFCE7", text: "#047857" },
      cancelled: { bg: "#FEE2E2", text: "#DC2626" },
    };
    const colors = palette[status] ?? palette.pending;
    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor: colors.bg },
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            { color: colors.text },
          ]}
        >
          {status.toUpperCase()}
        </Text>
      </View>
    );
  };

  const openRequestDetails = useCallback((request: Request) => {
    const sameRequest = selectedRequestRef.current?.id === request.id;
    console.log("[ManagementRequests] Opening request details modal:", {
      requestId: request.id,
      buildingId: request.buildingId,
      status: request.status,
      assignedTo: request.assignedTo,
    });
    setSelectedRequest(request);
    setSelectedRequestContext(request);
    setDetailTab("overview");
    if (!sameRequest) {
      setRequestComments([]);
      setRequestAttachments([]);
      lastFetchedRequestIdRef.current = null;
    }
  }, [setSelectedRequestContext]);

  const closeRequestDetails = () => {
    setSelectedRequest(null);
    setSelectedRequestContext(null);
    setNewMessage("");
    setDetailTab("overview");
    setIsRequestDetailLoading(false);
  };

  const fetchRequestDetails = useCallback(
    async (
      requestId: string,
      options?: { force?: boolean; buildingId?: string },
    ) => {
      const normalizedId = String(requestId);
      if (!options?.force && lastFetchedRequestIdRef.current === normalizedId) {
        return;
      }

      console.log("[ManagementRequests] Fetching request details:", {
        requestId: normalizedId,
        force: options?.force ?? false,
      });
      setIsRequestDetailLoading(true);
      try {
        const baseRequest =
          buildingRequestsRef.current.find((req) => req.id === normalizedId) || null;
        const buildingId =
          options?.buildingId ||
          baseRequest?.buildingId ||
          selectedRequestRef.current?.buildingId;
        if (!buildingId) {
          throw new Error("Missing building information for this request.");
        }

        const response = await orgBuildingsApi.getRequest(buildingId, requestId);
        const data = (response as any)?.data ?? response ?? {};
        console.log("[ManagementRequests] Raw request detail response:", response);

        const commentsResponse = await orgBuildingsApi.getComments(buildingId, requestId);
        console.log("[ManagementRequests] Raw comments response:", commentsResponse);
        const commentsPayload = Array.isArray(commentsResponse)
          ? commentsResponse
          : Array.isArray(commentsResponse?.data)
            ? commentsResponse.data
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
                  const oldStatusLabel = oldStatus.charAt(0).toUpperCase() + oldStatus.slice(1).replace('-', ' ');
                  const newStatusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1).replace('-', ' ');

                  // Get the actor who made the change
                  const actorName = historyItem.changedBy?.fullName ||
                                   historyItem.changedBy?.email ||
                                   (historyItem.changedById && currentUser?.id === historyItem.changedById
                                     ? (currentUser as any)?.name || (currentUser as any)?.fullName || currentUser?.email || 'Manager'
                                     : historyItem.changedById
                                       ? `User ${historyItem.changedById}`
                                       : undefined);

                  return {
                    id: `history-${historyItem.id || index}`,
                    requestId: String(data.id ?? requestId),
                    eventType: "status_change" as const,
                    title: `${oldStatusLabel} → ${newStatusLabel}`,
                    description: historyItem.note || undefined,
                    actorId: historyItem.changedBy?.id ? String(historyItem.changedBy.id) : (historyItem.changedById ? String(historyItem.changedById) : undefined),
                    actorName,
                    metadata: {
                      oldStatus,
                      newStatus,
                    },
                    createdAt: historyItem.changedAt,
                  };
                })
              : [];

          const mappedComments: RequestComment[] = Array.isArray(commentsPayload)
            ? (commentsPayload as OrgBuildingRequestComment[])
                .map((comment) => {
                  const author = comment.author ?? undefined;
                  const userName =
                    author?.name?.trim() ||
                    author?.email?.trim() ||
                    "User";
                  const userId = author?.id ? String(author.id) : "";

                  return {
                    id: String(comment.id ?? `${data.id}-comment-${Math.random().toString(36).slice(2)}`),
                    requestId: String(data.id ?? requestId),
                    userId,
                    userName,
                    message:
                      comment.message ||
                      comment.commentText ||
                      "",
                    createdAt: comment.createdAt || new Date().toISOString(),
                    channel: comment.channel || comment.visibility || "internal",
                    attachments: Array.isArray(comment.attachments)
                      ? comment.attachments
                          .map((att: any) => att.fileUrl || att.url || att.uri || att)
                          .filter(Boolean)
                      : undefined,
                  };
                })
                .sort(
                  (a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                )
            : [];

          const mappedAttachments =
            Array.isArray(data.attachments) && data.attachments.length > 0
              ? data.attachments
                  .map((attachment: any, index: number) => ({
                    id: String(attachment.id ?? `${data.id}-att-${index}`),
                    fileUrl: attachment.fileUrl || attachment.url || attachment.uri || "",
                    fileName: attachment.fileName || attachment.name,
                    contentType: attachment.contentType || attachment.mimeType,
                  }))
                  .filter((attachment) => attachment.fileUrl)
              : [];

          const fallbackAttachments =
            !mappedAttachments.length && baseRequest?.attachments?.length
              ? baseRequest.attachments.map((uri, index) => ({
                  id: `${requestId}-fallback-${index}`,
                  fileUrl: uri,
                }))
              : [];
          const attachmentsForRequest =
            mappedAttachments.length > 0 ? mappedAttachments : fallbackAttachments;

          setRequestComments(mappedComments);
          setRequestAttachments(attachmentsForRequest);

          const unit = data.unit || data.unitDetails;
          const mappedRequest: Request = {
            id: String(data.id ?? baseRequest?.id ?? requestId),
            title: data.title || baseRequest?.title || "Untitled Request",
            description: data.description || baseRequest?.description || "",
            type: baseRequest?.type || "maintenance",
            status: mappedStatus,
            priority: mappedPriority,
            tenantId: baseRequest?.tenantId || "",
            assignedTo: resolvedAssignedTo,
            buildingId: String(data.buildingId ?? baseRequest?.buildingId ?? ""),
            buildingName: data.buildingName || baseRequest?.buildingName,
            apartment:
              unit?.label ||
              data.unitLabel ||
              data.unitNumber ||
              baseRequest?.apartment ||
              "",
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
                ? attachmentsForRequest.map((att) => att.fileUrl)
                : baseRequest?.attachments || [],
            slaDueAt: baseRequest?.slaDueAt,
            lastEscalatedAt: baseRequest?.lastEscalatedAt,
            comments: mappedComments,
            messages: baseRequest?.messages || [],
            notes: [],
            timeline: timelineEvents.length > 0 ? timelineEvents : baseRequest?.timeline || [],
            createdAt: data.createdAt || baseRequest?.createdAt || new Date().toISOString(),
            updatedAt:
              data.updatedAt || baseRequest?.updatedAt || data.createdAt || new Date().toISOString(),
          };

          const completedAt =
            (data as any).completedAt || (baseRequest as any)?.completedAt || undefined;
          const mappedRequestWithCompletion = completedAt
            ? ({ ...mappedRequest, completedAt } as Request)
            : mappedRequest;

          setSelectedRequest(mappedRequestWithCompletion);
          setSelectedRequestContext(mappedRequestWithCompletion);
          lastFetchedRequestIdRef.current = normalizedId;

          setBuildingRequests((prev) =>
            prev.map((req) =>
              req.id === String(data.id ?? normalizedId)
                ? {
                    ...req,
                    status: mappedStatus,
                    priority: mappedPriority,
                    assignedTo: resolvedAssignedTo || req.assignedTo,
                    updatedAt: mappedRequest.updatedAt || req.updatedAt,
                    createdAt: mappedRequest.createdAt || req.createdAt,
                    ...(completedAt ? { completedAt } : null),
                  }
                : req,
            ),
          );
        }
      } catch (error) {
        console.error("[ManagementRequests] Failed to fetch request details:", error);
      } finally {
        setIsRequestDetailLoading(false);
      }
    },
    [currentUser, setSelectedRequestContext],
  );

  useEffect(() => {
    const requestId = params.requestId ? String(params.requestId) : null;
    if (!requestId || pendingRequestIdRef.current === requestId) {
      return;
    }

    const request = buildingRequests.find((item) => item.id === requestId);
    if (request) {
      pendingRequestIdRef.current = requestId;
      openRequestDetails(request);
      fetchRequestDetails(requestId, { force: true });
      return;
    }

    if (params.buildingId) {
      pendingRequestIdRef.current = requestId;
      fetchRequestDetails(requestId, {
        force: true,
        buildingId: String(params.buildingId),
      });
    }
  }, [
    buildingRequests,
    fetchRequestDetails,
    openRequestDetails,
    params.buildingId,
    params.requestId,
  ]);

  useEffect(() => {
    if (selectedRequest?.id) {
      const normalizedId = String(selectedRequest.id);
      if (lastFetchedRequestIdRef.current !== normalizedId) {
        fetchRequestDetails(normalizedId);
      } else {
        setIsRequestDetailLoading(false);
      }
    }
  }, [selectedRequest?.id, fetchRequestDetails]);

  const renderHeader = () => {
    const shouldAnimateHeader = !hasAnimatedHeaderRef.current;
    hasAnimatedHeaderRef.current = true;

    const getHeaderEntering = (delay: number) =>
      shouldAnimateHeader ? FadeInDown.delay(delay).duration(280) : undefined;

    return (
    <>
      <HeaderBar
          title="Service Requests"
          subtitle="Track and resolve maintenance across your buildings"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
        />

        {managedBuildings.length > 1 ? (
          <Animated.View
            entering={getHeaderEntering(80)}
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
          entering={getHeaderEntering(120)}
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFiltersScroll}
            style={styles.statusFiltersWrapper}
          >
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
          </ScrollView>
        </Animated.View>

        {priorityOptions.length > 1 && (
          <Animated.View
            entering={getHeaderEntering(140)}
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
            entering={getHeaderEntering(160)}
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
    </>
  );
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.emptyState, { paddingTop: 100 }]}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.emptyStateTitle}>Loading requests...</Text>
          <Text style={styles.emptyStateBody}>
            Fetching data from the server
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, paddingHorizontal: pagePadding }}>
        {renderHeader()}

        {paginatedRequests.length === 0 ? (
          <View style={[styles.emptyState, styles.emptyStateStandalone]}>
            <Ionicons name="clipboard-outline" size={40} color="#CBD5F5" />
            <Text style={styles.emptyStateTitle}>No requests found</Text>
            <Text style={styles.emptyStateBody}>
              Adjust your filters or select another building to see requests.
            </Text>
          </View>
        ) : (
          <FlatList
            data={paginatedRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item: request }) => {
              return (
                <TouchableOpacity
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
                      {request.status === "completed"
                        ? request.assignedTo
                          ? `Completed by ${request.assignedTo}`
                          : "Completed"
                        : request.assignedTo
                          ? `Assigned to ${request.assignedTo}`
                          : "Not assigned"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
            }}
            ListFooterComponent={() => {
              if (isLoadingMore) {
                return (
                  <View style={styles.loadingFooter}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.loadingFooterText}>Loading more...</Text>
                  </View>
                );
              }
              if (hasMoreRequests && paginatedRequests.length > 0) {
                return (
                  <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                    <Text style={styles.loadMoreButtonText}>
                      Load More ({scopedRequests.length - paginatedRequests.length} remaining)
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#2563EB" />
                  </TouchableOpacity>
                );
              }
              if (paginatedRequests.length > 0 && !hasMoreRequests) {
                return (
                  <View style={styles.endReachedFooter}>
                    <Text style={styles.endReachedText}>
                      Showing all {paginatedRequests.length} requests
                    </Text>
                  </View>
                );
              }
              return null;
            }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#2563EB"
                colors={["#2563EB"]}
              />
            }
            contentContainerStyle={[
              styles.requestList,
              { paddingBottom: 120 },
            ]}
            style={styles.flatList}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={5}
          />
        )}
      </View>

      {/* Assignment Modal */}
      <Modal
        visible={showAssignModal}
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedRequest?.status === "in-progress" ||
              (selectedRequest?.status as string) === "assigned"
                ? "Re-assign Request"
                : "Assign Request"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.assignmentModeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeTab,
                  assignmentMode === "building_employee" && styles.modeTabActive,
                ]}
                onPress={() => setAssignmentMode("building_employee")}
              >
                <Ionicons
                  name="people"
                  size={20}
                  color={assignmentMode === "building_employee" ? "#FFFFFF" : "#6B7280"}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    assignmentMode === "building_employee" && styles.modeTabTextActive,
                  ]}
                >
                  Maintenance Staff
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeTab,
                  assignmentMode === "service_provider" && styles.modeTabActive,
                ]}
                onPress={() => setAssignmentMode("service_provider")}
              >
                <Ionicons
                  name="business"
                  size={20}
                  color={assignmentMode === "service_provider" ? "#FFFFFF" : "#6B7280"}
                />
                <Text
                  style={[
                    styles.modeTabText,
                    assignmentMode === "service_provider" && styles.modeTabTextActive,
                  ]}
                >
                  Service Provider
                </Text>
              </TouchableOpacity>
            </View>

            {isLoadingWorkers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Loading workers...</Text>
              </View>
            ) : (
              <View style={styles.workersList}>
                {assignmentMode === "building_employee" ? (
                  maintenanceStaff.length > 0 ? (
                    maintenanceStaff.map((staff) => (
                      <TouchableOpacity
                        key={staff.id}
                        style={styles.workerCard}
                        onPress={() => handleAssignRequest(staff.id, staff.fullName)}
                        disabled={isAssigning}
                      >
                        <View style={styles.workerInfo}>
                          <Text style={styles.workerName}>{staff.fullName}</Text>
                          <Text style={styles.workerMeta}>{staff.email}</Text>
                          {staff.phoneNumber && (
                            <Text style={styles.workerMeta}>{staff.phoneNumber}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyWorkers}>
                      <Ionicons name="alert-circle-outline" size={32} color="#94A3B8" />
                      <Text style={styles.emptyWorkersText}>
                        No maintenance staff assigned to this building
                      </Text>
                    </View>
                  )
                ) : (
                  serviceProviders.length > 0 ? (
                    serviceProviders.map((provider) => (
                      <TouchableOpacity
                        key={provider.id}
                        style={styles.workerCard}
                        onPress={() => handleAssignRequest(provider.id, provider.fullName)}
                        disabled={isAssigning}
                      >
                        <View style={styles.workerInfo}>
                          <Text style={styles.workerName}>{provider.fullName}</Text>
                          <Text style={styles.workerMeta}>{provider.email}</Text>
                          {provider.phoneNumber && (
                            <Text style={styles.workerMeta}>{provider.phoneNumber}</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyWorkers}>
                      <Ionicons name="alert-circle-outline" size={32} color="#94A3B8" />
                      <Text style={styles.emptyWorkersText}>
                        No service providers assigned to this building
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

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
            {(["overview", "messages"] as const).map((tab) => (
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
            {isRequestDetailLoading ? (
              <View style={styles.detailLoadingRow}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.detailLoadingText}>Syncing latest details...</Text>
              </View>
            ) : null}
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
                {selectedRequest.assignedTo ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Assigned To:</Text>
                    <Text style={styles.detailValue}>{selectedRequest.assignedTo}</Text>
                  </View>
                ) : null}
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
                {(selectedRequest as any).completedAt ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Completed:</Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime((selectedRequest as any).completedAt)}
                    </Text>
                  </View>
                ) : null}
                {selectedRequest.slaDueAt && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>SLA Due:</Text>
                    <Text style={styles.detailValue}>{formatDateTime(selectedRequest.slaDueAt)}</Text>
                  </View>
                )}

                <View style={styles.assignmentSection}>
                  <View style={styles.assignmentHeaderRow}>
                    <Text style={styles.assignmentTitle}>Assignment Status</Text>
                    {selectedRequest.assignedTo && (
                      <View style={styles.jobStatusBadge}>
                        <Text style={styles.jobStatusText}>
                          {selectedRequest.status.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  {selectedRequest.assignedTo ? (
                    <>
                      <View style={styles.jobDetailsCard}>
                        <View style={styles.jobDetailRow}>
                          <Text style={styles.jobDetailLabel}>Assigned To</Text>
                          <Text style={styles.jobDetailValue}>
                            {selectedRequest.assignedTo}
                          </Text>
                        </View>
                        <View style={styles.jobDetailRow}>
                          <Text style={styles.jobDetailLabel}>Status</Text>
                          <Text style={styles.jobDetailValue}>
                            {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1).replace('-', ' ')}
                          </Text>
                        </View>
                      </View>
                      {(selectedRequest.status === "in-progress" ||
                        (selectedRequest.status as string) === "assigned") && (
                        <>
                          <View style={styles.actionButtonsRow}>
                            <TouchableOpacity
                              style={styles.reassignButton}
                              onPress={openAssignModal}
                            >
                              <Ionicons name="swap-horizontal" size={18} color="#2563EB" />
                              <Text style={styles.reassignButtonText}>Re-assign</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.completeButton}
                              onPress={handleMarkAsCompleted}
                            >
                              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                              <Text style={styles.completeButtonText}>Mark Completed</Text>
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancelRequest}
                          >
                            <Ionicons name="close-circle" size={18} color="#DC2626" />
                            <Text style={styles.cancelButtonText}>Cancel Request</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  ) : selectedRequest?.status === "completed" ? (
                    <View style={styles.noJobCard}>
                      <Ionicons name="checkmark-circle-outline" size={24} color="#16A34A" />
                      <Text style={styles.noJobText}>Completed</Text>
                      <Text style={styles.noJobHint}>Request was completed</Text>
                    </View>
                  ) : (
                    <View style={styles.noJobCard}>
                      <Ionicons name="construct-outline" size={24} color="#9CA3AF" />
                      <Text style={styles.noJobText}>Request not yet assigned</Text>
                      {selectedRequest.status === "pending" ? (
                        <>
                          <Text style={styles.noJobHint}>Assign this request to maintenance staff or a service provider</Text>
                          <TouchableOpacity
                            style={styles.assignButton}
                            onPress={openAssignModal}
                          >
                            <Ionicons name="person-add" size={18} color="#FFFFFF" />
                            <Text style={styles.assignButtonText}>Assign Request</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancelRequest}
                          >
                            <Ionicons name="close-circle" size={18} color="#DC2626" />
                            <Text style={styles.cancelButtonText}>Cancel Request</Text>
                          </TouchableOpacity>
                        </>
                      ) : selectedRequest.status === "on-hold" ? (
                        <>
                          <Text style={styles.noJobHint}>This request is on hold</Text>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancelRequest}
                          >
                            <Ionicons name="close-circle" size={18} color="#DC2626" />
                            <Text style={styles.cancelButtonText}>Cancel Request</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Text style={styles.noJobHint}>This request is {selectedRequest.status}</Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}

            {detailTab === "messages" && (
              <View style={styles.messagesSection}>
                <Text style={styles.sectionTitle}>Messages</Text>
                <Text style={styles.sectionSubtitle}>Communication thread for this request</Text>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.noteInput}
                    placeholder={
                      isRequestClosed
                        ? "Messaging disabled for closed requests"
                        : "Type message..."
                    }
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={!isRequestClosed}
                  />
                  <TouchableOpacity
                    style={[
                      styles.addButton,
                      (!newMessage.trim() || isSendingMessage || isRequestClosed) &&
                        styles.addButtonDisabled,
                    ]}
                    onPress={handleAddMessage}
                    disabled={!newMessage.trim() || isSendingMessage || isRequestClosed}
                  >
                    {isSendingMessage ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.addButtonText}>Send</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {requestComments.length > 0 ? (
                  requestComments.map((comment) => (
                    <View key={comment.id} style={styles.messageCard}>
                      <View style={styles.messageHeader}>
                        <Text style={styles.messageSender}>
                          {comment.userName || "User"}
                        </Text>
                        {comment.channel ? (
                          <Text style={styles.messageRole}>({comment.channel})</Text>
                        ) : null}
                      </View>
                      <Text style={styles.messageBody}>
                        {comment.message || comment.body || ""}
                      </Text>
                      {comment.attachments && comment.attachments.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.messageAttachments}
                          contentContainerStyle={{ gap: 10 }}
                        >
                          {comment.attachments.map((uri) => {
                            const showImage = isImageUri(uri);
                            return (
                              <TouchableOpacity
                                key={uri}
                                onPress={() => Linking.openURL(uri)}
                                activeOpacity={0.85}
                              >
                                {showImage ? (
                                  <Image
                                    source={{ uri }}
                                    style={styles.messageAttachmentImage}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View style={styles.messageAttachmentPlaceholder}>
                                    <Ionicons name="document-outline" size={24} color="#2563EB" />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      ) : null}
                      <Text style={styles.messageTime}>
                        {formatDateTime(comment.createdAt)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No messages yet</Text>
                )}

                {requestAttachments.length > 0 ? (
                  <View style={styles.attachmentsSection}>
                    <Text style={styles.sectionTitle}>Attachments</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 12 }}
                    >
                      {requestAttachments.map((attachment) => {
                        const isImage = isImageAttachment(attachment);
                        return (
                          <TouchableOpacity
                            key={attachment.id}
                            style={styles.attachmentCard}
                            onPress={() => Linking.openURL(attachment.fileUrl)}
                            activeOpacity={0.85}
                          >
                            {isImage ? (
                              <Image
                                source={{ uri: attachment.fileUrl }}
                                style={styles.attachmentImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.attachmentPlaceholder}>
                                <Ionicons name="document-outline" size={28} color="#2563EB" />
                              </View>
                            )}
                            <Text style={styles.attachmentLabel} numberOfLines={1}>
                              {attachment.fileName || "Attachment"}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
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
  scrollViewContent: {
    paddingBottom: 120,
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
    marginTop: -10,
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
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  statusFiltersWrapper: {
    marginTop: 4,
  },
  statusFiltersScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 4,
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
  detailLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  detailLoadingText: {
    fontSize: 12,
    color: "#6B7280",
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
  messageAttachments: {
    marginTop: 8,
  },
  messageAttachmentImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  messageAttachmentPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentsSection: {
    gap: 8,
    marginTop: 8,
  },
  attachmentCard: {
    width: 140,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  attachmentImage: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  attachmentPlaceholder: {
    width: "100%",
    height: 120,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
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
  flatList: {
    flex: 1,
  },
  emptyStateStandalone: {
    marginTop: 16,
    paddingVertical: 24,
  },
  requestListEmpty: {
    paddingVertical: 24,
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 24,
  },
  loadingFooterText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginVertical: 16,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },
  endReachedFooter: {
    alignItems: "center",
    paddingVertical: 20,
    paddingBottom: 40,
  },
  endReachedText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
  },
  assignButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  reassignButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  reassignButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  completeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#16A34A",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  assignmentModeSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  modeTabActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  modeTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  modeTabTextActive: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  workersList: {
    gap: 12,
  },
  workerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  workerInfo: {
    flex: 1,
    gap: 4,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  workerMeta: {
    fontSize: 13,
    color: "#6B7280",
  },
  emptyWorkers: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyWorkersText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
  },
});
