import DateTimePicker from "@react-native-community/datetimepicker";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useAuth } from "../../lib/context/auth-context";
import { useNotifications } from "../../lib/context/notifications-context";
import { useResidentContract } from "../../lib/hooks/useResidentSelfService";
import type { ResidentMoveRequest, ResidentMoveRequestStatus } from "../../lib/types";
import { showErrorAlert, showSuccessAlert } from "../../lib/utils/alertHelpers";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";

type MoveRequestType = "move-in" | "move-out";
type MoveStatusTone =
  | "neutral"
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed";

const P = {
  bg: "#F8F9FA",
  surface: "#FFFFFF",
  surfaceLow: "#F1F4F6",
  surfaceMid: "#EAF0F3",
  border: "#D9E0E4",
  text: "#2B3437",
  muted: "#667176",
  soft: "#7A8488",
  primary: "#4D6169",
  primaryDark: "#34474D",
  primarySoft: "#D6E4E8",
  accent: "#F7EEDF",
  accentBorder: "#EBD8BB",
  successBg: "#E4F4EA",
  successText: "#25674A",
  warningBg: "#FDF1DB",
  warningText: "#9A5B00",
  dangerBg: "#FCE3E0",
  dangerText: "#B24A41",
  infoBg: "#E7EEF9",
  infoText: "#3C5A8C",
};

const statusLabel = (status: ResidentMoveRequestStatus) =>
  status ? status.replace(/_/g, " ") : "NO REQUEST";

const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

const moveRequestErrorMessageByStatus = (
  statusCode: number | undefined,
): string | undefined => {
  if (statusCode === 400) return "This contract is not valid for this action.";
  if (statusCode === 409)
    return "A pending or approved move request already exists.";
  if (statusCode === 401 || statusCode === 403)
    return "You are not authorized to perform this action.";
  return undefined;
};

const statusTone = (status: ResidentMoveRequestStatus): MoveStatusTone => {
  if (!status) return "neutral";
  if (status === "PENDING") return "pending";
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "CANCELLED") return "cancelled";
  if (status === "COMPLETED") return "completed";
  return "neutral";
};

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-US") : "-";
const fmtDateTime = (value: string | Date) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const fmtValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "-";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "-";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "-";
};
const fmtMoney = (value?: string | null) => {
  if (!value) return "-";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  return `AED ${parsed.toLocaleString("en-US")}`;
};

const formatStatusLabel = (value?: string | null) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Not available";

const mimeFromName = (name: string, fallback?: string | null) => {
  if (fallback) return fallback;
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
};

const HistoryList = ({ title, items }: { title: string; items: ResidentMoveRequest[] }) => (
  <View style={styles.historyBlock}>
    <Text style={styles.blockTitle}>{title}</Text>
    {items.length === 0 ? (
      <Text style={styles.meta}>No history found.</Text>
    ) : (
      items.map((item) => (
        <View key={item.id || `${title}-${item.createdAt}`} style={styles.historyItem}>
          <Text style={styles.historyMain}>{fmtDateTime(item.requestedMoveAt || item.createdAt || "")}</Text>
          <Text style={styles.historySub}>Status: {statusLabel(item.status)}</Text>
          {item.notes ? <Text style={styles.historySub}>Notes: {item.notes}</Text> : null}
          {item.rejectionReason ? (
            <Text style={styles.historyErr}>Rejection: {item.rejectionReason}</Text>
          ) : null}
        </View>
      ))
    )}
  </View>
);

const StatusChip = ({
  label,
  status,
}: {
  label: string;
  status: ResidentMoveRequestStatus;
}) => {
  const tone = statusTone(status);
  return (
    <View
      style={[
        styles.statusChip,
        tone === "pending" && styles.statusChipPending,
        tone === "approved" && styles.statusChipApproved,
        tone === "rejected" && styles.statusChipRejected,
        tone === "cancelled" && styles.statusChipCancelled,
        tone === "completed" && styles.statusChipCompleted,
      ]}
    >
      <Text
        style={[
          styles.statusChipText,
          tone === "pending" && styles.statusChipTextPending,
          tone === "approved" && styles.statusChipTextApproved,
          tone === "rejected" && styles.statusChipTextRejected,
          tone === "cancelled" && styles.statusChipTextCancelled,
          tone === "completed" && styles.statusChipTextCompleted,
        ]}
      >
        {label}: {statusLabel(status)}
      </Text>
    </View>
  );
};

export default function TenantContractScreen() {
  const { currentUser, isAuthenticated, actions: authActions } = useAuth();
  const { notifications } = useNotifications();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveType, setMoveType] = useState<MoveRequestType>("move-in");
  const [requestedMoveAt, setRequestedMoveAt] = useState<Date>(
    () => new Date(Date.now() + 60 * 60 * 1000),
  );
  const [notes, setNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const unauthRef = useRef(false);
  const previousLatestContractIdRef = useRef<string | null>(null);

  const handleUnauthorized = useCallback(async () => {
    if (unauthRef.current) return;
    unauthRef.current = true;
    try {
      await authActions.logout();
    } catch (error) {
      console.warn("[TenantContract] logout after 401 failed", error);
    } finally {
      router.replace("/auth" as any);
      unauthRef.current = false;
    }
  }, [authActions]);

  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth" as any);
  }, [isAuthenticated]);

  const {
    data,
    contracts,
    contractDetailsById,
    activeLeaseDocuments,
    moveInHistory,
    moveOutHistory,
    activeHistoryContractId,
    isLoading,
    isRefreshing,
    isLoadingContractDetail,
    isLoadingLeaseDocuments,
    isLoadingHistory,
    errorMessage,
    isRequestingMoveIn,
    isRequestingMoveOut,
    isUploadingSignedContract,
    refetch,
    refetchContractDetail,
    refetchActiveLeaseDocuments,
    refetchHistory,
    requestMoveIn,
    requestMoveOut,
    uploadSignedContract,
  } = useResidentContract({
    enabled: Boolean(currentUser?.id && isAuthenticated),
    loadActiveLeaseDocumentsOnMount: true,
    onUnauthorized: handleUnauthorized,
  });

  useEffect(() => {
    if (!selectedContractId) {
      setSelectedContractId(data.contract?.id || contracts[0]?.id || null);
      return;
    }
    const exists = contracts.some((c) => c.id === selectedContractId) || selectedContractId === data.contract?.id;
    if (!exists) setSelectedContractId(data.contract?.id || contracts[0]?.id || null);
  }, [contracts, data.contract?.id, selectedContractId]);

  useEffect(() => {
    const latestId = data.contract?.id || null;
    if (
      latestId &&
      previousLatestContractIdRef.current &&
      latestId !== previousLatestContractIdRef.current
    ) {
      setSelectedContractId(latestId);
    }
    previousLatestContractIdRef.current = latestId;
  }, [data.contract?.id]);

  useEffect(() => {
    if (!selectedContractId) return;
    void Promise.all([
      refetchContractDetail(selectedContractId),
      refetchHistory(selectedContractId),
    ]).catch(showErrorAlert);
  }, [refetchContractDetail, refetchHistory, selectedContractId]);

  const onRefresh = useCallback(async () => {
    await refetch({ asRefresh: true, showLoading: false });
    const jobs: Promise<unknown>[] = [refetchActiveLeaseDocuments()];
    if (selectedContractId) {
      jobs.push(refetchContractDetail(selectedContractId));
      jobs.push(refetchHistory(selectedContractId));
    }
    await Promise.all(jobs);
  }, [refetch, refetchActiveLeaseDocuments, refetchContractDetail, refetchHistory, selectedContractId]);

  const userNotifications = filterNotificationsByUser(notifications || [], currentUser?.id);
  const hasUnreadNotifications = getUnreadNotificationsCount(userNotifications) > 0;
  const selectedContract = useMemo(
    () => {
      if (selectedContractId && contractDetailsById[selectedContractId]) {
        return contractDetailsById[selectedContractId];
      }
      return (
        contracts.find((item) => item.id === selectedContractId) ||
        (selectedContractId === data.contract?.id ? data.contract : data.contract)
      );
    },
    [contractDetailsById, contracts, data.contract, selectedContractId],
  );
  const latestContractId = data.contract?.id || null;
  const actionContractId = latestContractId;
  const isLatestContractSelected =
    selectedContractId === null || selectedContractId === latestContractId;
  const canRequestMoveIn = isLatestContractSelected && data.canRequestMoveIn;
  const canRequestMoveOut = isLatestContractSelected && data.canRequestMoveOut;
  const isSubmitting = moveType === "move-in" ? isRequestingMoveIn : isRequestingMoveOut;
  const contractStatusLabel = formatStatusLabel(selectedContract?.status);
  const buildingLabel = fmtValue(selectedContract?.buildingName);
  const unitLabel = fmtValue(selectedContract?.unit?.label || selectedContract?.unitLabel);
  const contractValue = fmtMoney(selectedContract?.annualRent || selectedContract?.contractValue);
  const depositValue = fmtMoney(selectedContract?.securityDepositAmount);
  const paymentStatusLabel =
    data.latestMoveOutRequestStatus === "APPROVED"
      ? "Moving Out"
      : data.latestMoveInRequestStatus === "APPROVED"
        ? "Move-In Approved"
        : "Current Lease";

  const openMoveModal = (type: MoveRequestType) => {
    setMoveType(type);
    setRequestedMoveAt(new Date(Date.now() + 60 * 60 * 1000));
    setNotes("");
    setShowMoveModal(true);
  };

  const submitMoveRequest = async () => {
    if (!actionContractId) return showErrorAlert(new Error("Missing contract id"));
    if (requestedMoveAt.getTime() <= Date.now()) {
      return showErrorAlert(new Error("Move date and time must be in the future"));
    }
    const payload = { requestedMoveAt: requestedMoveAt.toISOString(), notes: notes.trim() || undefined };
    try {
      if (moveType === "move-in") {
        await requestMoveIn(actionContractId, payload);
        showSuccessAlert("Move-in request submitted.");
      } else {
        await requestMoveOut(actionContractId, payload);
        showSuccessAlert("Move-out request submitted.");
      }
      setShowMoveModal(false);
    } catch (error) {
      showErrorAlert(
        error,
        moveRequestErrorMessageByStatus(getStatusCode(error)),
      );
    }
  };

  const uploadSignedDoc = async () => {
    if (!actionContractId) return showErrorAlert(new Error("Missing contract id"));
    setIsPickingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      const fileName = file.name || file.uri.split("/").pop() || `signed-${Date.now()}.pdf`;
      const mimeType = mimeFromName(fileName, file.mimeType);
      const info = await FileSystem.getInfoAsync(file.uri);
      const sizeBytes =
        typeof file.size === "number" && file.size > 0
          ? file.size
          : info.exists && typeof info.size === "number"
            ? info.size
            : 0;
      if (!sizeBytes) throw new Error("Unable to determine file size");
      await uploadSignedContract({
        contractId: actionContractId,
        fileUri: file.uri,
        fileName,
        mimeType,
        sizeBytes,
      });
      showSuccessAlert("Signed contract uploaded.");
    } catch (error) {
      showErrorAlert(error);
    } finally {
      setIsPickingFile(false);
    }
  };

  const openDocument = async (url?: string | null) => {
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) throw new Error("Unable to open this document URL");
      await Linking.openURL(url);
    } catch (error) {
      showErrorAlert(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 28 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={P.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          showTitle={false}
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
          textColor={P.text}
        />

        <LinearGradient
          colors={[P.primary, P.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>Lease Workspace</Text>
              <Text style={styles.heroTitle}>
                {selectedContract ? contractValue : "Contract Details"}
              </Text>
              <Text style={styles.heroSubtitle}>
                {selectedContract
                  ? `${buildingLabel} • ${unitLabel}`
                  : isLoading || isLoadingContractDetail
                    ? "Loading your contract..."
                    : "No contract selected."}
              </Text>
            </View>
            <View style={styles.heroStatusWrap}>
              <Text style={styles.heroStatusLabel}>Status</Text>
              <Text style={styles.heroStatusValue}>{contractStatusLabel}</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaLabel}>Lease End</Text>
              <Text style={styles.heroMetaValue}>{fmtDate(selectedContract?.endDate)}</Text>
            </View>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaLabel}>Deposit</Text>
              <Text style={styles.heroMetaValue}>{depositValue}</Text>
            </View>
            <View style={styles.heroMetaCard}>
              <Text style={styles.heroMetaLabel}>Move Status</Text>
              <Text style={styles.heroMetaValue}>{paymentStatusLabel}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Available Contracts</Text>
              <Text style={styles.title}>Select Contract</Text>
            </View>
            {isLoading ? <ActivityIndicator size="small" color={P.primary} /> : null}
          </View>
          <View style={styles.rowWrap}>
            {contracts.map((contract) => (
              <TouchableOpacity
                key={contract.id || contract.contractNumber || "contract"}
                style={[styles.pill, selectedContractId === contract.id && styles.pillActive]}
                onPress={() => setSelectedContractId(contract.id)}
              >
                <Text style={[styles.pillText, selectedContractId === contract.id && styles.pillTextActive]}>
                  {contract.contractNumber || contract.unitLabel || "Contract"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {contracts.length === 0 && !isLoading ? <Text style={styles.meta}>No contracts found.</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Overview</Text>
              <Text style={styles.title}>Lease Summary</Text>
            </View>
            {isLoadingContractDetail ? <ActivityIndicator size="small" color={P.primary} /> : null}
          </View>
          {errorMessage ? <Text style={styles.err}>{errorMessage}</Text> : null}
          {!selectedContract ? (
            <Text style={styles.meta}>
              {isLoading || isLoadingContractDetail
                ? "Loading contract..."
                : "No contract selected."}
            </Text>
          ) : (
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Status</Text>
                <Text style={styles.summaryItemValue}>{contractStatusLabel}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Building</Text>
                <Text style={styles.summaryItemValue}>{buildingLabel}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Unit</Text>
                <Text style={styles.summaryItemValue}>{unitLabel}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Start</Text>
                <Text style={styles.summaryItemValue}>{fmtDate(selectedContract.startDate)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>End</Text>
                <Text style={styles.summaryItemValue}>{fmtDate(selectedContract.endDate)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Move In</Text>
                <Text style={styles.summaryItemValue}>{statusLabel(data.latestMoveInRequestStatus)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>Move Out</Text>
                <Text style={styles.summaryItemValue}>{statusLabel(data.latestMoveOutRequestStatus)}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Lease Agreement</Text>
              <Text style={styles.title}>Contract Details</Text>
            </View>
            <Ionicons name="document-text-outline" size={18} color={P.soft} />
          </View>
          {!selectedContract ? (
            <Text style={styles.meta}>No contract selected.</Text>
          ) : (
            <>
              <Text style={styles.blockTitle}>Agreement</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Ejari / Contract No</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.contractNumber)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Contract Date</Text>
                  <Text style={styles.detailValue}>{fmtDate(selectedContract.contractDate)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Annual Rent</Text>
                  <Text style={styles.detailValue}>{fmtMoney(selectedContract.annualRent)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Contract Value</Text>
                  <Text style={styles.detailValue}>{fmtMoney(selectedContract.contractValue)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Security Deposit</Text>
                  <Text style={styles.detailValue}>{fmtMoney(selectedContract.securityDepositAmount)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Billing Cycle</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.paymentFrequency)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Payment Mode</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.paymentModeText)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>No. of Cheques</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.numberOfCheques)}</Text>
                </View>
              </View>

              <Text style={styles.blockTitle}>Property</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.propertyTypeLabel)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Usage</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.propertyUsage)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Property No</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.propertyNumber)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Plot No</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.plotNo)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>DEWA Premises</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.premisesNoDewa)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Community</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.locationCommunity)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Size (sqm)</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.propertySizeSqm)}</Text>
                </View>
              </View>

              <Text style={styles.blockTitle}>Unit</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Label</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.unit?.label || selectedContract.unitLabel)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Floor</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.unit?.floor)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Bedrooms</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.unit?.bedrooms)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Bathrooms</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.unit?.bathrooms)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Unit Size</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.unit?.unitSize)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Size Unit</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.unit?.unitSizeUnit)}</Text>
                </View>
              </View>

              <Text style={styles.blockTitle}>Parties</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Landlord</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.landlordNameSnapshot)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Landlord Email</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.landlordEmailSnapshot)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Landlord Phone</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.landlordPhoneSnapshot)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Owner</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.ownerNameSnapshot)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Tenant</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.tenantNameSnapshot)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Tenant Email</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.tenantEmailSnapshot)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Tenant Phone</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.tenantPhoneSnapshot)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Resident Name</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.resident?.name)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Resident Email</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.resident?.email)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Resident Phone</Text>
                  <Text style={styles.detailValue}>{fmtValue(selectedContract.resident?.phone)}</Text>
                </View>
              </View>

              <Text style={styles.blockTitle}>Additional Terms</Text>
              <View style={styles.termsCard}>
                <Text style={styles.meta}>
                  {selectedContract.additionalTerms && selectedContract.additionalTerms.length > 0
                    ? selectedContract.additionalTerms.join(", ")
                    : "-"}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Vault</Text>
              <Text style={styles.title}>Lease Documents</Text>
            </View>
            {isLoadingLeaseDocuments ? (
              <ActivityIndicator size="small" color={P.primary} />
            ) : null}
          </View>
          {activeLeaseDocuments.length === 0 ? (
            <Text style={styles.meta}>No lease documents available.</Text>
          ) : (
            activeLeaseDocuments.map((doc, index) => (
              <TouchableOpacity
                key={doc.id || `${doc.type || "doc"}-${doc.createdAt || index}`}
                style={styles.docRow}
                onPress={() => void openDocument(doc.url)}
                disabled={!doc.url}
              >
                <View style={styles.docIconWrap}>
                  <Ionicons name="document-text-outline" size={18} color={P.primary} />
                </View>
                <View style={styles.docMeta}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.fileName || doc.type || "Document"}
                  </Text>
                  <Text style={styles.docSub}>
                    {[doc.type, doc.createdAt ? fmtDate(doc.createdAt) : null]
                      .filter(Boolean)
                      .join(" • ") || "-"}
                  </Text>
                </View>
                <Ionicons
                  name={doc.url ? "open-outline" : "close-circle-outline"}
                  size={18}
                  color={doc.url ? P.primary : P.soft}
                />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>History</Text>
              <Text style={styles.title}>Move Requests</Text>
            </View>
            {isLoadingHistory && activeHistoryContractId === selectedContractId ? <ActivityIndicator size="small" color={P.primary} /> : null}
          </View>
          <HistoryList title="Move In" items={moveInHistory} />
          <HistoryList title="Move Out" items={moveOutHistory} />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>Actions</Text>
              <Text style={styles.title}>Resident Requests</Text>
            </View>
          </View>
          {!isLatestContractSelected ? (
            <Text style={styles.metaNotice}>
              Move requests can only be submitted for the latest contract.
            </Text>
          ) : null}
          {canRequestMoveIn ? (
            <TouchableOpacity style={styles.btn} onPress={() => openMoveModal("move-in")}>
              <Ionicons name="enter-outline" size={16} color={P.surface} />
              <Text style={styles.btnText}>Request Move In</Text>
            </TouchableOpacity>
          ) : null}
          {canRequestMoveOut ? (
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => openMoveModal("move-out")}>
              <Ionicons name="exit-outline" size={16} color={P.surface} />
              <Text style={styles.btnText}>Request Move Out</Text>
            </TouchableOpacity>
          ) : null}
          {isLatestContractSelected && !canRequestMoveIn && !canRequestMoveOut ? (
            <View style={styles.statusRow}>
              <StatusChip label="Move In" status={data.latestMoveInRequestStatus} />
              <StatusChip label="Move Out" status={data.latestMoveOutRequestStatus} />
            </View>
          ) : null}
          <TouchableOpacity
            style={[styles.upload, (isUploadingSignedContract || isPickingFile) && styles.disabled]}
            disabled={isUploadingSignedContract || isPickingFile}
            onPress={uploadSignedDoc}
          >
            <Ionicons name="cloud-upload-outline" size={16} color={P.primary} />
            <Text style={styles.uploadText}>
              {isUploadingSignedContract || isPickingFile ? "Uploading..." : "Upload Signed Contract"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal transparent visible={showMoveModal} onRequestClose={() => setShowMoveModal(false)} animationType="slide">
        <View style={[styles.modalOverlay, { paddingBottom: insets.bottom }]}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>{moveType === "move-in" ? "Request Move In" : "Request Move Out"}</Text>
            <Text style={styles.meta}>Choose your preferred date and leave any relevant notes.</Text>
            <TouchableOpacity
              style={styles.inputBtn}
              onPress={() => {
                if (Platform.OS === "ios") {
                  setShowDatePicker((prev) => !prev);
                } else {
                  setShowDatePicker(true);
                }
              }}
            >
              <Text style={styles.meta}>{fmtDateTime(requestedMoveAt)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={requestedMoveAt}
                mode={Platform.OS === "ios" ? "datetime" : "date"}
                minimumDate={new Date()}
                onChange={(_, value) => {
                  if (!value) return;
                  if (Platform.OS === "ios") {
                    setRequestedMoveAt(value);
                    return;
                  }
                  setShowDatePicker(false);
                  const next = new Date(requestedMoveAt);
                  next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
                  setRequestedMoveAt(next);
                  setShowTimePicker(true);
                }}
              />
            )}
            {Platform.OS === "android" && showTimePicker ? (
              <DateTimePicker
                value={requestedMoveAt}
                mode="time"
                onChange={(_, value) => {
                  setShowTimePicker(false);
                  if (!value) return;
                  const next = new Date(requestedMoveAt);
                  next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                  setRequestedMoveAt(next);
                }}
              />
            ) : null}
            <TextInput
              style={styles.notes}
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={P.soft}
              multiline
            />
            <TouchableOpacity style={[styles.btn, isSubmitting && styles.disabled]} onPress={submitMoveRequest} disabled={isSubmitting}>
              <Ionicons name="checkmark-circle-outline" size={16} color={P.surface} />
              <Text style={styles.btnText}>{isSubmitting ? "Submitting..." : "Submit Request"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SideMenu isVisible={showSideMenu} onClose={() => setShowSideMenu(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.bg },
  scroll: { flex: 1, paddingHorizontal: 20 },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  heroCopy: { flex: 1, gap: 8 },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.74)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800",
    color: P.surface,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.78)",
  },
  heroStatusWrap: {
    alignItems: "flex-end",
    gap: 4,
  },
  heroStatusLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  heroStatusValue: {
    fontSize: 13,
    fontWeight: "700",
    color: P.surface,
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: 10,
  },
  heroMetaCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.14)",
    padding: 14,
    justifyContent: "space-between",
  },
  heroMetaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  heroMetaValue: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: P.surface,
  },
  card: {
    backgroundColor: P.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: P.border,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  title: { fontSize: 19, fontWeight: "700", color: P.text, marginBottom: 0 },
  meta: { fontSize: 13, color: P.muted, lineHeight: 20 },
  metaNotice: {
    fontSize: 13,
    color: P.warningText,
    lineHeight: 20,
    backgroundColor: P.accent,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: P.accentBorder,
    marginBottom: 6,
  },
  err: { fontSize: 13, color: P.dangerText, marginBottom: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: P.surfaceLow,
  },
  pillActive: { borderColor: P.primary, backgroundColor: P.primarySoft },
  pillText: { fontSize: 12, fontWeight: "600", color: P.text },
  pillTextActive: { color: P.primary },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryItem: {
    width: "48%",
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: P.border,
  },
  summaryItemLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  summaryItemValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: P.text,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: P.text,
    marginTop: 4,
    marginBottom: 10,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  detailItem: {
    width: "48%",
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: P.border,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: P.soft,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: P.text,
  },
  termsCard: {
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: P.border,
  },
  historyBlock: { marginTop: 6 },
  historyItem: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    backgroundColor: P.surfaceLow,
  },
  historyMain: { fontSize: 13, fontWeight: "700", color: P.text },
  historySub: { fontSize: 12, color: P.muted, marginTop: 4, lineHeight: 18 },
  historyErr: { fontSize: 12, color: P.dangerText, marginTop: 4, lineHeight: 18 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    padding: 12,
    marginTop: 10,
    backgroundColor: P.surfaceLow,
    gap: 12,
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: P.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  docMeta: { flex: 1 },
  docName: { fontSize: 13, fontWeight: "700", color: P.text },
  docSub: { fontSize: 12, color: P.soft, marginTop: 3 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  statusChip: {
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.surfaceLow,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipPending: { borderColor: "#F4D9A7", backgroundColor: P.warningBg },
  statusChipApproved: { borderColor: "#CBE7D5", backgroundColor: P.successBg },
  statusChipRejected: { borderColor: "#E9B7B0", backgroundColor: P.dangerBg },
  statusChipCancelled: { borderColor: P.border, backgroundColor: P.surfaceLow },
  statusChipCompleted: { borderColor: "#CADAF0", backgroundColor: P.infoBg },
  statusChipText: { fontSize: 12, fontWeight: "700", color: P.text },
  statusChipTextPending: { color: P.warningText },
  statusChipTextApproved: { color: P.successText },
  statusChipTextRejected: { color: P.dangerText },
  statusChipTextCancelled: { color: P.text },
  statusChipTextCompleted: { color: P.infoText },
  btn: {
    backgroundColor: P.primary,
    borderRadius: 18,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  btnSecondary: { backgroundColor: P.primaryDark },
  btnText: { color: P.surface, fontSize: 14, fontWeight: "700" },
  upload: {
    marginTop: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: P.primary,
    backgroundColor: P.surfaceLow,
    borderRadius: 18,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  uploadText: { color: P.primary, fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(43,52,55,0.4)" },
  modalCard: {
    backgroundColor: P.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderColor: P.border,
  },
  inputBtn: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    padding: 14,
    backgroundColor: P.surfaceLow,
  },
  notes: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 18,
    minHeight: 96,
    padding: 14,
    textAlignVertical: "top",
    backgroundColor: P.surfaceLow,
    color: P.text,
  },
});
