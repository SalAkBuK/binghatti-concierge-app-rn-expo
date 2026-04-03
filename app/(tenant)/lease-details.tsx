import DateTimePicker from "@react-native-community/datetimepicker";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
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
import { useApp } from "../../lib/context/connected-app-provider";
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
  const { currentUser, notifications, actions, isAuthenticated } = useApp();
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
      await actions.logout();
    } catch (error) {
      console.warn("[TenantContract] logout after 401 failed", error);
    } finally {
      router.replace("/auth" as any);
      unauthRef.current = false;
    }
  }, [actions]);

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
    onUnauthorized: handleUnauthorized,
  });

  useFocusEffect(
    useCallback(() => {
      void refetch({ showLoading: false, asRefresh: false });
    }, [refetch]),
  );

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
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <HeaderBar
          title="Contract"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        <View style={styles.card}>
          <Text style={styles.title}>Contracts</Text>
          <View style={styles.rowWrap}>
            {contracts.map((contract) => (
              <TouchableOpacity
                key={contract.id || contract.contractNumber || "contract"}
                style={[styles.pill, selectedContractId === contract.id && styles.pillActive]}
                onPress={() => setSelectedContractId(contract.id)}
              >
                <Text style={[styles.pillText, selectedContractId === contract.id && styles.pillTextActive]}>
                  {contract.contractNumber || contract.id || "Contract"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {contracts.length === 0 && !isLoading ? <Text style={styles.meta}>No contracts found.</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Summary</Text>
          {errorMessage ? <Text style={styles.err}>{errorMessage}</Text> : null}
          {!selectedContract ? (
            <Text style={styles.meta}>
              {isLoading || isLoadingContractDetail
                ? "Loading contract..."
                : "No contract selected."}
            </Text>
          ) : (
            <>
              <Text style={styles.meta}>Status: {selectedContract.status || "-"}</Text>
              <Text style={styles.meta}>Building: {selectedContract.buildingName || "-"}</Text>
              <Text style={styles.meta}>Unit: {selectedContract.unitLabel || "-"}</Text>
              <Text style={styles.meta}>Start: {fmtDate(selectedContract.startDate)}</Text>
              <Text style={styles.meta}>End: {fmtDate(selectedContract.endDate)}</Text>
              <Text style={styles.meta}>Latest Move In: {statusLabel(data.latestMoveInRequestStatus)}</Text>
              <Text style={styles.meta}>Latest Move Out: {statusLabel(data.latestMoveOutRequestStatus)}</Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Contract Details</Text>
          {!selectedContract ? (
            <Text style={styles.meta}>No contract selected.</Text>
          ) : (
            <>
              <Text style={styles.meta}>Ejari / Contract No: {fmtValue(selectedContract.contractNumber)}</Text>
              <Text style={styles.meta}>Contract Date: {fmtDate(selectedContract.contractDate)}</Text>
              <Text style={styles.meta}>Annual Rent: {fmtMoney(selectedContract.annualRent)}</Text>
              <Text style={styles.meta}>Contract Value: {fmtMoney(selectedContract.contractValue)}</Text>
              <Text style={styles.meta}>Security Deposit: {fmtMoney(selectedContract.securityDepositAmount)}</Text>
              <Text style={styles.meta}>Payment Frequency: {fmtValue(selectedContract.paymentFrequency)}</Text>
              <Text style={styles.meta}>Payment Mode: {fmtValue(selectedContract.paymentModeText)}</Text>
              <Text style={styles.meta}>No. of Cheques: {fmtValue(selectedContract.numberOfCheques)}</Text>

              <Text style={styles.blockTitle}>Property</Text>
              <Text style={styles.meta}>Type: {fmtValue(selectedContract.propertyTypeLabel)}</Text>
              <Text style={styles.meta}>Usage: {fmtValue(selectedContract.propertyUsage)}</Text>
              <Text style={styles.meta}>Property No: {fmtValue(selectedContract.propertyNumber)}</Text>
              <Text style={styles.meta}>Plot No: {fmtValue(selectedContract.plotNo)}</Text>
              <Text style={styles.meta}>DEWA Premises No: {fmtValue(selectedContract.premisesNoDewa)}</Text>
              <Text style={styles.meta}>Community: {fmtValue(selectedContract.locationCommunity)}</Text>
              <Text style={styles.meta}>Size (sqm): {fmtValue(selectedContract.propertySizeSqm)}</Text>

              <Text style={styles.blockTitle}>Unit</Text>
              <Text style={styles.meta}>Label: {fmtValue(selectedContract.unit?.label || selectedContract.unitLabel)}</Text>
              <Text style={styles.meta}>Floor: {fmtValue(selectedContract.unit?.floor)}</Text>
              <Text style={styles.meta}>Bedrooms: {fmtValue(selectedContract.unit?.bedrooms)}</Text>
              <Text style={styles.meta}>Bathrooms: {fmtValue(selectedContract.unit?.bathrooms)}</Text>
              <Text style={styles.meta}>Unit Size: {fmtValue(selectedContract.unit?.unitSize)}</Text>
              <Text style={styles.meta}>Unit Size Unit: {fmtValue(selectedContract.unit?.unitSizeUnit)}</Text>

              <Text style={styles.blockTitle}>Parties</Text>
              <Text style={styles.meta}>Landlord: {fmtValue(selectedContract.landlordNameSnapshot)}</Text>
              <Text style={styles.meta}>Landlord Email: {fmtValue(selectedContract.landlordEmailSnapshot)}</Text>
              <Text style={styles.meta}>Landlord Phone: {fmtValue(selectedContract.landlordPhoneSnapshot)}</Text>
              <Text style={styles.meta}>Owner: {fmtValue(selectedContract.ownerNameSnapshot)}</Text>
              <Text style={styles.meta}>Tenant: {fmtValue(selectedContract.tenantNameSnapshot)}</Text>
              <Text style={styles.meta}>Tenant Email: {fmtValue(selectedContract.tenantEmailSnapshot)}</Text>
              <Text style={styles.meta}>Tenant Phone: {fmtValue(selectedContract.tenantPhoneSnapshot)}</Text>
              <Text style={styles.meta}>Resident Name: {fmtValue(selectedContract.resident?.name)}</Text>
              <Text style={styles.meta}>Resident Email: {fmtValue(selectedContract.resident?.email)}</Text>
              <Text style={styles.meta}>Resident Phone: {fmtValue(selectedContract.resident?.phone)}</Text>

              <Text style={styles.blockTitle}>Additional Terms</Text>
              <Text style={styles.meta}>
                {selectedContract.additionalTerms && selectedContract.additionalTerms.length > 0
                  ? selectedContract.additionalTerms.join(", ")
                  : "-"}
              </Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.inline}>
            <Text style={styles.title}>Lease Documents</Text>
            {isLoadingLeaseDocuments ? (
              <ActivityIndicator size="small" color="#2563eb" />
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
                <View style={styles.docMeta}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {doc.fileName || doc.type || "Document"}
                  </Text>
                  <Text style={styles.docSub}>
                    {[doc.type, doc.createdAt ? fmtDate(doc.createdAt) : null]
                      .filter(Boolean)
                      .join(" - ") || "-"}
                  </Text>
                </View>
                <Text style={[styles.docOpen, !doc.url && styles.docOpenDisabled]}>
                  Open
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.inline}>
            <Text style={styles.title}>Move Request History</Text>
            {isLoadingHistory && activeHistoryContractId === selectedContractId ? <ActivityIndicator size="small" color="#2563eb" /> : null}
          </View>
          <HistoryList title="Move In" items={moveInHistory} />
          <HistoryList title="Move Out" items={moveOutHistory} />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Actions</Text>
          {!isLatestContractSelected ? (
            <Text style={styles.meta}>
              Move requests can only be submitted for the latest contract.
            </Text>
          ) : null}
          {canRequestMoveIn ? (
            <TouchableOpacity style={styles.btn} onPress={() => openMoveModal("move-in")}>
              <Text style={styles.btnText}>Request Move In</Text>
            </TouchableOpacity>
          ) : null}
          {canRequestMoveOut ? (
            <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => openMoveModal("move-out")}>
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
              multiline
            />
            <TouchableOpacity style={[styles.btn, isSubmitting && styles.disabled]} onPress={submitMoveRequest} disabled={isSubmitting}>
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
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1, paddingHorizontal: 18 },
  card: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 14, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
  meta: { fontSize: 13, color: "#4b5563", marginBottom: 4 },
  err: { fontSize: 13, color: "#b91c1c", marginBottom: 6 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inline: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pill: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#f9fafb" },
  pillActive: { borderColor: "#2563eb", backgroundColor: "#dbeafe" },
  pillText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  pillTextActive: { color: "#1d4ed8" },
  historyBlock: { marginTop: 6 },
  blockTitle: { fontSize: 13, fontWeight: "700", color: "#1f2937", marginBottom: 6 },
  historyItem: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 8, marginBottom: 6 },
  historyMain: { fontSize: 12, fontWeight: "600", color: "#111827" },
  historySub: { fontSize: 12, color: "#4b5563", marginTop: 2 },
  historyErr: { fontSize: 12, color: "#b91c1c", marginTop: 2 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  docMeta: { flex: 1, marginRight: 12 },
  docName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  docSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  docOpen: { fontSize: 12, fontWeight: "700", color: "#1d4ed8" },
  docOpenDisabled: { color: "#9ca3af" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  statusChip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipPending: { borderColor: "#fbbf24", backgroundColor: "#fffbeb" },
  statusChipApproved: { borderColor: "#86efac", backgroundColor: "#ecfdf5" },
  statusChipRejected: { borderColor: "#fca5a5", backgroundColor: "#fef2f2" },
  statusChipCancelled: { borderColor: "#d1d5db", backgroundColor: "#f3f4f6" },
  statusChipCompleted: { borderColor: "#93c5fd", backgroundColor: "#eff6ff" },
  statusChipText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  statusChipTextPending: { color: "#92400e" },
  statusChipTextApproved: { color: "#166534" },
  statusChipTextRejected: { color: "#991b1b" },
  statusChipTextCancelled: { color: "#374151" },
  statusChipTextCompleted: { color: "#1e3a8a" },
  btn: { backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 11, alignItems: "center", marginTop: 8 },
  btnSecondary: { backgroundColor: "#0891b2" },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  upload: { marginTop: 10, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#60a5fa", backgroundColor: "#eff6ff", borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  uploadText: { color: "#1e40af", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.6 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 18, gap: 12 },
  inputBtn: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 11 },
  notes: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, minHeight: 84, padding: 10, textAlignVertical: "top" },
});
