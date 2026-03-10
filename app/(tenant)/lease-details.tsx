import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { openBrowserAsync, WebBrowserPresentationStyle } from "expo-web-browser";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { HeaderBar } from "../../components/ui/HeaderBar";
import { SideMenu } from "../../components/ui/SideMenu";
import { useApp } from "../../lib/context/connected-app-provider";
import {
  useResidentActiveLease,
  useResidentLeaseDocuments,
  useResidentActiveParking,
} from "../../lib/hooks/useResidentSelfService";
import {
  filterNotificationsByUser,
  getUnreadNotificationsCount,
} from "../../lib/utils/helpers";

export default function TenantLeaseDetailsScreen() {
  const { currentUser, notifications, actions, isAuthenticated } = useApp();
  const tabBarHeight = useBottomTabBarHeight();
  const [showSideMenu, setShowSideMenu] = useState(false);
  const isHandlingUnauthorizedRef = useRef(false);

  const handleUnauthorized = useCallback(async () => {
    if (isHandlingUnauthorizedRef.current) {
      return;
    }

    isHandlingUnauthorizedRef.current = true;
    try {
      await actions.logout();
    } catch (error) {
      console.warn("[TenantLeaseDetails] Failed to clear session after 401:", error);
    } finally {
      router.replace("/auth" as any);
      isHandlingUnauthorizedRef.current = false;
    }
  }, [actions]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth" as any);
    }
  }, [isAuthenticated]);

  const enabled = Boolean(currentUser?.id && isAuthenticated);

  const {
    data: activeLease,
    isLoading: isLeaseLoading,
    isRefreshing: isLeaseRefreshing,
    errorMessage: leaseErrorMessage,
    refetch: refetchLease,
  } = useResidentActiveLease({
    enabled,
    onUnauthorized: handleUnauthorized,
  });

  const {
    data: leaseDocuments,
    isLoading: isDocumentsLoading,
    isRefreshing: isDocumentsRefreshing,
    errorMessage: documentsErrorMessage,
    refetch: refetchLeaseDocuments,
  } = useResidentLeaseDocuments({
    enabled,
    onUnauthorized: handleUnauthorized,
  });

  const {
    data: parkingAllocation,
    isLoading: isParkingLoading,
    isRefreshing: isParkingRefreshing,
    errorMessage: parkingErrorMessage,
    refetch: refetchParking,
  } = useResidentActiveParking({
    enabled,
    onUnauthorized: handleUnauthorized,
  });

  const refreshAll = useCallback(
    async (asRefresh: boolean) => {
      await Promise.all([
        refetchLease({ asRefresh, showLoading: !asRefresh }),
        refetchLeaseDocuments({ asRefresh, showLoading: !asRefresh }),
        refetchParking({ asRefresh, showLoading: !asRefresh }),
      ]);
    },
    [refetchLease, refetchLeaseDocuments, refetchParking],
  );

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      void refreshAll(false);
    }, [enabled, refreshAll]),
  );

  const onRefresh = useCallback(async () => {
    await refreshAll(true);
  }, [refreshAll]);

  const isRefreshing =
    isLeaseRefreshing || isDocumentsRefreshing || isParkingRefreshing;

  const formatDate = (value: string | null | undefined): string => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRent = (value: number | null | undefined): string => {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return `AED ${value.toLocaleString("en-US")}`;
  };

  const formatPaymentFrequency = (value: string | null | undefined): string => {
    if (!value) return "-";
    return value
      .replace(/[_-]/g, " ")
      .trim()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  };

  const openDocument = useCallback(async (url: string | null) => {
    if (!url) return;

    try {
      await openBrowserAsync(url, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
      });
    } catch (error) {
      console.error("[TenantLeaseDetails] Failed to open lease document:", error);
    }
  }, []);

  const userNotifications = filterNotificationsByUser(
    notifications || [],
    currentUser?.id,
  );
  const hasUnreadNotifications =
    getUnreadNotificationsCount(userNotifications) > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <HeaderBar
          title="Lease & Parking"
          hasUnreadNotifications={hasUnreadNotifications}
          showSideMenu={showSideMenu}
          onSideMenuToggle={setShowSideMenu}
        />

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Active Lease</Text>

          {isLeaseLoading && !activeLease ? (
            <Text style={styles.cardMeta}>Loading lease details...</Text>
          ) : leaseErrorMessage ? (
            <>
              <Text style={styles.cardError}>{leaseErrorMessage}</Text>
              <TouchableOpacity
                style={styles.inlineRetryButton}
                onPress={() => void refetchLease({ asRefresh: true, showLoading: false })}
              >
                <Text style={styles.inlineRetryText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : !activeLease ? (
            <Text style={styles.cardEmpty}>No active lease found</Text>
          ) : (
            <View style={styles.detailsBlock}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Unit</Text>
                <Text style={styles.value}>{activeLease.unitLabel || "-"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Lease Dates</Text>
                <Text style={styles.value}>
                  {formatDate(activeLease.startDate)} - {formatDate(activeLease.endDate)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Rent</Text>
                <Text style={styles.value}>{formatRent(activeLease.rentAmount)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Payment</Text>
                <Text style={styles.value}>
                  {formatPaymentFrequency(activeLease.paymentFrequency)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Lease Documents</Text>

          {isDocumentsLoading && leaseDocuments.length === 0 ? (
            <Text style={styles.cardMeta}>Loading lease documents...</Text>
          ) : documentsErrorMessage ? (
            <>
              <Text style={styles.cardError}>{documentsErrorMessage}</Text>
              <TouchableOpacity
                style={styles.inlineRetryButton}
                onPress={() => void refetchLeaseDocuments({ asRefresh: true, showLoading: false })}
              >
                <Text style={styles.inlineRetryText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : leaseDocuments.length === 0 ? (
            <Text style={styles.cardEmpty}>No lease documents available</Text>
          ) : (
            leaseDocuments.map((document) => (
              <TouchableOpacity
                key={document.id}
                style={styles.documentRow}
                onPress={() => void openDocument(document.url)}
                disabled={!document.url}
              >
                <View style={styles.documentMeta}>
                  <Text style={styles.documentFilename} numberOfLines={1}>
                    {document.filename}
                  </Text>
                  <Text style={styles.documentSubtext}>
                    {[document.type, formatDate(document.date)]
                      .filter((value) => value && value !== "-")
                      .join(" • ")}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.documentAction,
                    !document.url && styles.documentActionDisabled,
                  ]}
                >
                  Open
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Parking</Text>

          {isParkingLoading && !parkingAllocation ? (
            <Text style={styles.cardMeta}>Loading parking details...</Text>
          ) : parkingErrorMessage ? (
            <>
              <Text style={styles.cardError}>{parkingErrorMessage}</Text>
              <TouchableOpacity
                style={styles.inlineRetryButton}
                onPress={() => void refetchParking({ asRefresh: true, showLoading: false })}
              >
                <Text style={styles.inlineRetryText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : !parkingAllocation ? (
            <Text style={styles.cardEmpty}>No parking slot assigned</Text>
          ) : (
            <View style={styles.detailsBlock}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Slot</Text>
                <Text style={styles.value}>{parkingAllocation.slotCode || "-"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Level</Text>
                <Text style={styles.value}>{parkingAllocation.level || "-"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Type</Text>
                <Text style={styles.value}>{parkingAllocation.type || "-"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Start Date</Text>
                <Text style={styles.value}>
                  {formatDate(parkingAllocation.startDate)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <SideMenu
        isVisible={showSideMenu}
        onClose={() => setShowSideMenu(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  cardMeta: {
    fontSize: 13,
    color: "#6B7280",
  },
  cardError: {
    fontSize: 13,
    color: "#B91C1C",
    marginBottom: 10,
  },
  cardEmpty: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
  },
  inlineRetryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inlineRetryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3730A3",
  },
  detailsBlock: {
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontSize: 13,
    color: "#6B7280",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  documentMeta: {
    flex: 1,
    marginRight: 12,
  },
  documentFilename: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  documentSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  documentAction: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  documentActionDisabled: {
    color: "#9CA3AF",
  },
});
