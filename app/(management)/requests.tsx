import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SideMenu } from "../../components/ui/SideMenu";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { ManagementRequestAssignmentModal } from "../../components/management/requests/management-request-assignment-modal";
import { ManagementRequestDetailModal } from "../../components/management/requests/management-request-detail-modal";
import { ManagementRequestsFilters } from "../../components/management/requests/management-requests-filters";
import { ManagementRequestsList } from "../../components/management/requests/management-requests-list";
import { useManagementRequestDetails } from "../../lib/hooks/management/requests/useManagementRequestDetails";
import { useManagementRequestsScreen } from "../../lib/hooks/management/requests/useManagementRequestsScreen";
import { useRequestAssignmentFlow } from "../../lib/hooks/management/requests/useRequestAssignmentFlow";

const MANAGEMENT_NOTIFICATION_ROUTE = "/(modals)/admin-notifications";

export default function ManagementRequestsScreen() {
  const params = useLocalSearchParams<{
    statusFilter?: string;
    requestId?: string;
    buildingId?: string;
  }>();
  const { currentUser } = useAuth();
  const { notifications } = useNotifications();
  const { width } = useWindowDimensions();
  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const {
    managedBuildings,
    buildingRequests,
    setBuildingRequests,
    loadingData,
    showSideMenu,
    setShowSideMenu,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    typeFilter,
    setTypeFilter,
    selectedBuildingId,
    setSelectedBuildingId,
    hasUnreadNotifications,
    buildingFilterOptions,
    priorityOptions,
    typeOptions,
    paginatedRequests,
    hasMoreRequests,
    scopedRequests,
    isLoadingMore,
    isRefreshing,
    shouldAnimateHeader,
    handleLoadMore,
    handleRefresh,
  } = useManagementRequestsScreen({
    currentUserId: currentUser?.id,
    notifications,
    statusFilterParam: params.statusFilter,
  });
  const {
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
  } = useManagementRequestDetails({
    buildingRequests,
    currentUser,
    preselectedBuildingId: params.buildingId
      ? String(params.buildingId)
      : undefined,
    preselectedRequestId: params.requestId
      ? String(params.requestId)
      : undefined,
    setBuildingRequests,
  });
  const {
    showAssignModal,
    closeAssignModal,
    assignmentMode,
    setAssignmentMode,
    maintenanceStaff,
    serviceProviders,
    isAssigning,
    isLoadingWorkers,
    openAssignModal,
    handleAssignRequest,
  } = useRequestAssignmentFlow({
    closeRequestDetails,
    currentUser,
    managedBuildings,
    selectedRequest,
    setBuildingRequests,
  });

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
        <ManagementRequestsFilters
          buildingFilterOptions={buildingFilterOptions}
          hasUnreadNotifications={hasUnreadNotifications}
          notificationRoute={MANAGEMENT_NOTIFICATION_ROUTE}
          onSideMenuToggle={setShowSideMenu}
          pageAnimated={shouldAnimateHeader}
          priorityFilter={priorityFilter}
          priorityOptions={priorityOptions}
          searchQuery={searchQuery}
          selectedBuildingId={selectedBuildingId}
          setPriorityFilter={setPriorityFilter}
          setSearchQuery={setSearchQuery}
          setSelectedBuildingId={setSelectedBuildingId}
          setStatusFilter={setStatusFilter}
          setTypeFilter={setTypeFilter}
          showSideMenu={showSideMenu}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          typeOptions={typeOptions}
        />

        {paginatedRequests.length === 0 ? (
          <View style={[styles.emptyState, styles.emptyStateStandalone]}>
            <Ionicons name="clipboard-outline" size={40} color="#CBD5F5" />
            <Text style={styles.emptyStateTitle}>No requests found</Text>
            <Text style={styles.emptyStateBody}>
              Adjust your filters or select another building to see requests.
            </Text>
          </View>
        ) : (
          <ManagementRequestsList
            hasMoreRequests={hasMoreRequests}
            isLoadingMore={isLoadingMore}
            isRefreshing={isRefreshing}
            onLoadMore={handleLoadMore}
            onOpenRequestDetails={openRequestDetails}
            onRefresh={handleRefresh}
            paginatedRequests={paginatedRequests}
            remainingRequestsCount={scopedRequests.length - paginatedRequests.length}
          />
        )}
      </View>

      <ManagementRequestAssignmentModal
        visible={showAssignModal}
        onClose={closeAssignModal}
        selectedRequest={selectedRequest}
        assignmentMode={assignmentMode}
        setAssignmentMode={setAssignmentMode}
        maintenanceStaff={maintenanceStaff}
        serviceProviders={serviceProviders}
        isAssigning={isAssigning}
        isLoadingWorkers={isLoadingWorkers}
        onAssignRequest={handleAssignRequest}
      />

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      <ManagementRequestDetailModal
        selectedRequest={selectedRequest}
        detailTab={detailTab}
        setDetailTab={setDetailTab}
        isRequestDetailLoading={isRequestDetailLoading}
        isRequestClosed={isRequestClosed}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        isSendingMessage={isSendingMessage}
        requestComments={requestComments}
        requestAttachments={requestAttachments}
        onClose={closeRequestDetails}
        onAddMessage={handleAddMessage}
        onOpenAssignModal={openAssignModal}
        onMarkAsCompleted={handleMarkAsCompleted}
        onCancelRequest={handleCancelRequest}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
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
  emptyStateStandalone: {
    marginTop: 16,
    paddingVertical: 24,
  },
});
