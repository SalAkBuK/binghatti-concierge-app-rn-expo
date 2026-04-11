import type { User } from "../types";

export const RESIDENT_HISTORY_UNAVAILABLE_MESSAGE =
  "Your resident history is unavailable because this account does not currently have an active occupancy.";

const ACTIVE_OCCUPANCY_REQUIRED_BACKEND_MESSAGE = "active occupancy required";

const getNestedMessages = (value: unknown, messages: string[]): void => {
  if (!value) return;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      messages.push(trimmed);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => getNestedMessages(item, messages));
    return;
  }

  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    getNestedMessages(candidate.message, messages);
    getNestedMessages(candidate.error, messages);
    getNestedMessages(candidate.details, messages);
    getNestedMessages(candidate.response, messages);
    getNestedMessages(candidate.data, messages);
  }
};

export const getErrorStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

export const isActiveOccupancyRequiredError = (error: unknown): boolean => {
  if (getErrorStatusCode(error) !== 403) {
    return false;
  }

  const messages: string[] = [];
  getNestedMessages(error, messages);

  return messages.some((message) =>
    message.toLowerCase().includes(ACTIVE_OCCUPANCY_REQUIRED_BACKEND_MESSAGE),
  );
};

export const getResidentOccupancyStatus = (
  user: Pick<User, "persona"> | null | undefined,
): string | null => {
  const status = user?.persona?.residentOccupancyStatus;
  return typeof status === "string" && status.trim().length > 0
    ? status.trim().toUpperCase()
    : null;
};

export const hasActiveResidentHistoryAccess = (
  user: Pick<User, "persona" | "role"> | null | undefined,
): boolean => {
  if (user?.role !== "tenant") {
    return true;
  }

  return getResidentOccupancyStatus(user) === "ACTIVE";
};
