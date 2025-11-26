import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentWrapper: {
    flex: 1,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7034FF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tableContainer: {
    flex: 1,
  },
  cellText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  cellTextSmall: {
    fontSize: 13,
    color: "#6B7280",
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  labelOptional: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  sectionDivider: {
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  roleButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  roleButtonActive: {
    backgroundColor: "#7034FF",
    borderColor: "#7034FF",
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7034FF",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  hint: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 10,
  },
  infoBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 14,
    marginVertical: 16,
  },
  infoBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E40AF",
  },
  infoBoxText: {
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 20,
  },
  infoBoxLink: {
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  buildingsList: {
    gap: 10,
    marginTop: 8,
  },
  buildingOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  buildingOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  buildingOptionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  buildingOptionTextActive: {
    color: "#1E40AF",
  },
  buildingOptionAddress: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
});

export { styles };
