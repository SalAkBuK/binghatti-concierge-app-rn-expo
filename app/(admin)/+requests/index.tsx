import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../../components/ui/HeaderBar";
import { SideMenu } from "../../../components/ui/SideMenu";
import type { Job, Request, RequestStatus } from "../../../lib/types";
import { BuildingFilterChips } from "./_components/BuildingFilterChips";
import { ProviderAssignmentModal } from "./_components/ProviderAssignmentModal";
import { RequestDetailsModal } from "./_components/RequestDetailsModal";
import { RequestsList } from "./_components/RequestsList";
import { StatusFilterChips } from "./_components/StatusFilterChips";
import { SummaryTiles } from "./_components/SummaryTiles";
import { ADMIN_NOTIFICATION_ROUTE } from "./_constants";
import { useRequestsData } from "./_hooks/useRequestsData";
import type { StatusFilter } from "./_constants";
import { styles } from "./_styles";

export default function RequestsManagementScreen() {
  const { width } = useWindowDimensions();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedBuildingId, setSelectedBuildingId] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);

  const {
    scopedRequests,
    summary,
    buildingFilterOptions,
    buildingMap,
    managedBuildings,
    selectedBuildingName,
    hasUnreadNotifications,
    isManagement,
    isAdmin,
    jobs,
    serviceProviders,
    actions,
  } = useRequestsData({ selectedBuildingId, statusFilter, searchQuery });

  const {
    updateRequest,
    assignJob,
    createJob,
    updateJobStatus,
    setSelectedRequest: setSelectedRequestContext,
  } = actions;

  useEffect(() => {
    if (isManagement) {
      if (managedBuildings.length === 1) {
        setSelectedBuildingId(managedBuildings[0].id);
        return;
      }

      if (
        selectedBuildingId !== "all" &&
        !managedBuildings.some((building) => building.id === selectedBuildingId)
      ) {
        setSelectedBuildingId("all");
      }
    }
  }, [isManagement, managedBuildings, selectedBuildingId]);

  const pagePadding = Math.max(16, Math.min(28, width * 0.05));
  const isCompact = width < 900;

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getJobForRequest = (requestId: string) =>
    jobs.find((job) => job.requestId === requestId);

  const handleSelectRequest = (request: Request) => {
    setSelectedRequest(request);
    setSelectedRequestContext(request);
  };

  const handleStatusUpdate = async (
    request: Request,
    status: RequestStatus,
  ) => {
    if (request.status === status) return;
    setIsUpdatingStatus(true);
    try {
      await updateRequest(request.id, { status });
      Alert.alert("Status updated", `Request marked as ${status}`);
    } catch (error: any) {
      Alert.alert("Update failed", error?.message || "Unable to update request");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssignProvider = async (providerId: string) => {
    if (!selectedRequest) return;
    setIsAssigning(true);
    try {
      const existingJob = getJobForRequest(selectedRequest.id);
      if (existingJob) {
        await assignJob(existingJob.id, providerId);
      } else {
        await createJob({
          requestId: selectedRequest.id,
          title: selectedRequest.title,
          description: selectedRequest.description,
          type: selectedRequest.type,
          priority: selectedRequest.priority,
          buildingId: selectedRequest.buildingId,
          unitNumber: selectedRequest.apartment,
          assignedTo: providerId,
        });
      }
      Alert.alert("Assigned", "Service provider has been scheduled.");
      setShowProviderModal(false);
    } catch (error: any) {
      Alert.alert(
        "Assignment failed",
        error?.message || "Unable to assign service provider",
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleJobStatusUpdate = async (job: Job, status: Job["status"]) => {
    try {
      await updateJobStatus(job.id, status);
      Alert.alert("Work order updated", `Job now marked as ${status}`);
    } catch (error: any) {
      Alert.alert("Update failed", error?.message || "Unable to update job");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={[styles.scrollView, { paddingHorizontal: pagePadding }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Request Operations"
          subtitle={selectedBuildingName}
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          notificationRoute={ADMIN_NOTIFICATION_ROUTE}
        />

        <Animated.View entering={FadeInDown.delay(40).duration(320)}>
          <SummaryTiles summary={summary} isCompact={isCompact} />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(320)}
          style={styles.filtersContainer}
        >
          <BuildingFilterChips
            buildings={buildingFilterOptions}
            selectedBuildingId={selectedBuildingId}
            onSelect={setSelectedBuildingId}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(320)}
          style={styles.statusFilterRow}
        >
          <StatusFilterChips statusFilter={statusFilter} onSelect={setStatusFilter} />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(160).duration(320)}
          style={styles.searchContainer}
        >
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search requests, units, or keywords"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Animated.View>

        <View style={styles.listContainer}>
          <RequestsList
            requests={scopedRequests}
            buildingMap={buildingMap}
            getJobForRequest={getJobForRequest}
            onSelect={handleSelectRequest}
          />
        </View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />

      <RequestDetailsModal
        request={selectedRequest}
        pagePadding={pagePadding}
        buildingMap={buildingMap}
        getJobForRequest={getJobForRequest}
        isAdmin={isAdmin}
        isUpdatingStatus={isUpdatingStatus}
        isAssigning={isAssigning}
        onClose={() => setSelectedRequest(null)}
        onStatusUpdate={handleStatusUpdate}
        onJobStatusUpdate={handleJobStatusUpdate}
        onReassignProvider={() => setShowProviderModal(true)}
      />

      <ProviderAssignmentModal
        visible={showProviderModal}
        providers={serviceProviders}
        isAssigning={isAssigning}
        pagePadding={pagePadding}
        onSelect={handleAssignProvider}
        onClose={() => setShowProviderModal(false)}
      />
    </SafeAreaView>
  );
}
