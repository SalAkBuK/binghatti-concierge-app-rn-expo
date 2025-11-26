import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100, // Extra space for bottom tab bar
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  bannerIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bannerCopy: {
    flex: 1,
    gap: 4,
  },
  bannerHeadline: {
    fontSize: 16,
    fontWeight: "700",
  },
  bannerBody: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  managementIntro: {
    marginBottom: 20,
  },
  managementGreeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  managementSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  managementChipScroll: {
    marginBottom: 20,
  },
  managementChipRow: {
    gap: 12,
    paddingRight: 12,
  },
  managementChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  managementChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#7034FF",
  },
  managementChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  managementChipTextActive: {
    color: "#4C1D95",
  },
  managementEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  managementEmptyIcon: {
    marginBottom: 16,
  },
  managementEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  managementEmptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  kpiGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  kpiGridCompact: {
    gap: 8,
  },
  trendGrid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  trendGridCompact: {
    gap: 8,
  },
  operationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  operationsGridCompact: {
    flexDirection: "column",
    gap: 12,
  },
  operationCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  operationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  operationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  operationMetric: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  operationBody: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  providerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "700",
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  providerMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  listCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1,
    paddingRight: 12,
  },
  listCardBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FB923C",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  listCardBadgeMuted: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  listCardMeta: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 20,
  },
  listEmpty: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4C1D95",
  },
  timeline: {
    position: "relative",
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 18,
  },
  timelineIndicator: {
    alignItems: "center",
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  timelineTimestamp: {
    fontSize: 12,
    color: "#6B7280",
  },
});
