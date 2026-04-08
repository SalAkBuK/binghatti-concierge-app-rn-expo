import type { Job, Request } from "../../../types";

export const REQUEST_DETAILS_PALETTE = {
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
} as const;

const P = REQUEST_DETAILS_PALETTE;

export const normalizeStatus = (status: any): Request["status"] => {
  if (!status) return "pending";

  const numeric = Number(status);
  if (!Number.isNaN(numeric)) {
    if (numeric === 1) return "pending";
    if (numeric === 2) return "assigned";
    if (numeric === 3) return "in-progress";
    if (numeric === 4) return "on-hold";
    if (numeric === 5) return "completed";
    if (numeric === 6) return "cancelled";
  }

  const normalized = String(status).toLowerCase().replace("_", "-");
  if (normalized === "pending" || normalized === "open") return "pending";
  if (normalized === "assigned") return "assigned";
  if (normalized === "on-hold" || normalized === "onhold") return "on-hold";
  if (normalized === "in-progress" || normalized === "inprogress") {
    return "in-progress";
  }
  if (
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "done"
  ) {
    return "completed";
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return "cancelled";
  }
  return "pending";
};

export const normalizePriority = (priority: any): Request["priority"] => {
  if (!priority && priority !== 0) return "medium";
  if (
    priority === 1 ||
    priority === "1" ||
    String(priority).toLowerCase() === "low"
  ) {
    return "low";
  }
  if (
    priority === 2 ||
    priority === "2" ||
    String(priority).toLowerCase() === "medium"
  ) {
    return "medium";
  }
  if (
    priority === 3 ||
    priority === "3" ||
    String(priority).toLowerCase() === "high"
  ) {
    return "high";
  }
  if (
    priority === 4 ||
    priority === "4" ||
    String(priority).toLowerCase() === "urgent"
  ) {
    return "urgent";
  }
  return "medium";
};

export const normalizeRequestType = (type: any): Request["type"] => {
  const normalized = String(type || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "_");

  switch (normalized) {
    case "CLEANING":
      return "cleaning";
    case "ELECTRICAL":
      return "electrical";
    case "PLUMBING":
      return "plumbing";
    case "HVAC":
    case "PLUMBING_AC_HEATING":
      return "hvac";
    case "REPAIR":
      return "repair";
    case "OTHER":
      return "other";
    case "MAINTENANCE":
    default:
      return "maintenance";
  }
};

export const formatRequestTypeLabel = (
  type?: Request["type"] | string | null,
): string => {
  const normalized = normalizeRequestType(type);

  switch (normalized) {
    case "hvac":
      return "Plumbing / AC / Heating";
    case "electrical":
      return "Electrical";
    case "plumbing":
      return "Plumbing";
    case "cleaning":
      return "Cleaning";
    case "repair":
      return "Repair";
    case "other":
      return "Other";
    default:
      return "Maintenance";
  }
};

export const normalizeAttachments = (attachments: any): string[] => {
  if (!Array.isArray(attachments)) return [];
  return attachments
    .map((attachment) => {
      if (!attachment) return null;
      if (typeof attachment === "string") return attachment;
      if (typeof attachment === "object") {
        return (
          attachment.fileUrl ||
          attachment.url ||
          attachment.uri ||
          attachment.file_url ||
          attachment.path ||
          null
        );
      }
      return null;
    })
    .filter((uri): uri is string => Boolean(uri));
};

export const isImageUri = (uri: string) =>
  /\.(png|jpe?g|gif|webp|bmp)$/i.test(uri);

export const getStatusColor = (status: Request["status"]) => {
  const colors = {
    pending: { bg: P.warningBg, text: P.warningText, border: "#F4D9A7" },
    assigned: { bg: P.infoBg, text: P.infoText, border: "#CADAF0" },
    "in-progress": { bg: P.infoBg, text: P.infoText, border: "#CADAF0" },
    "on-hold": { bg: P.accent, text: P.warningText, border: P.accentBorder },
    completed: { bg: P.successBg, text: P.successText, border: "#CBE7D5" },
    cancelled: { bg: P.surfaceLow, text: P.text, border: P.border },
  };
  return colors[status] || colors.pending;
};

export const getPriorityColor = (priority: Request["priority"]) => {
  const colors = {
    low: { bg: P.successBg, text: P.successText, border: "#CBE7D5" },
    medium: { bg: P.warningBg, text: P.warningText, border: "#F4D9A7" },
    high: { bg: "#FFEDD5", text: "#B45309", border: "#F2CDA5" },
    urgent: { bg: P.dangerBg, text: P.dangerText, border: "#E9B7B0" },
  };
  return colors[priority] || colors.medium;
};

export const getStatusIcon = (status: Request["status"]) => {
  const icons = {
    pending: "time-outline",
    assigned: "person-outline",
    "in-progress": "sync-outline",
    "on-hold": "pause-circle-outline",
    completed: "checkmark-circle-outline",
    cancelled: "close-circle-outline",
  } as const;
  return icons[status] || "time-outline";
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatShortDateTime = (dateString?: string | null) => {
  if (!dateString) return "Pending";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Pending";
  return (
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }) +
    ", " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })
  );
};

export const getProgressPercentage = (status: Request["status"]) => {
  const progress = {
    pending: 25,
    assigned: 50,
    "in-progress": 75,
    "on-hold": 60,
    completed: 100,
    cancelled: 0,
  };
  return progress[status] || 0;
};

export const getTenantRequestStatusLabel = (status: Request["status"]) => {
  switch (status) {
    case "pending":
      return "Submitted";
    case "assigned":
      return "Assigned";
    case "in-progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Canceled";
    case "on-hold":
      return "On Hold";
    default:
      return "Submitted";
  }
};

export const getTenantRequestNextStep = (status: Request["status"]) => {
  switch (status) {
    case "pending":
      return "Management will review your report and assign the right team.";
    case "assigned":
      return "Your issue has been assigned. Check back here for visit timing and service updates.";
    case "in-progress":
      return "Work is currently underway. Use comments if you need to share anything with management.";
    case "completed":
      return "This issue has been marked completed. If anything is still unresolved, submit a new request or contact management.";
    case "cancelled":
      return "This request has been canceled. Submit a new maintenance issue if you still need support.";
    case "on-hold":
      return "This request is temporarily on hold. Management will update you with the next step.";
    default:
      return "Management will review your report and update this timeline.";
  }
};

export const getJobStatusMeta = (status: Job["status"]) => {
  const meta: Record<
    Job["status"],
    { label: string; bg: string; text: string; border: string }
  > = {
    pending: {
      label: "Pending Assignment",
      bg: P.warningBg,
      text: P.warningText,
      border: "#F4D9A7",
    },
    assigned: {
      label: "Assigned",
      bg: P.infoBg,
      text: P.infoText,
      border: "#CADAF0",
    },
    "in-progress": {
      label: "In Progress",
      bg: P.infoBg,
      text: P.infoText,
      border: "#CADAF0",
    },
    "follow-up": {
      label: "Follow-up Required",
      bg: P.accent,
      text: P.warningText,
      border: P.accentBorder,
    },
    completed: {
      label: "Completed",
      bg: P.successBg,
      text: P.successText,
      border: "#CBE7D5",
    },
    cancelled: {
      label: "Cancelled",
      bg: P.dangerBg,
      text: P.dangerText,
      border: "#E9B7B0",
    },
  };

  return meta[status];
};

export const getCompletionStatusMeta = (
  status: Job["completionStatus"],
): { label: string; subtitle: string; bg: string; text: string } | null => {
  if (!status) {
    return null;
  }

  const map = {
    awaiting_tenant_approval: {
      label: "Awaiting Your Approval",
      subtitle:
        "Review the completion report to approve or request follow-up.",
      bg: P.infoBg,
      text: P.infoText,
    },
    tenant_approved: {
      label: "Approved",
      subtitle: "You confirmed this job was completed to your satisfaction.",
      bg: P.successBg,
      text: P.successText,
    },
    sp_override_approved: {
      label: "Marked Complete",
      subtitle:
        "Service provider closed this job on your behalf. Reach out if something looks off.",
      bg: P.accent,
      text: P.warningText,
    },
  } as const;

  return map[status];
};

export const formatCurrency = (amount: number) => {
  return `AED ${amount.toLocaleString()}`;
};
