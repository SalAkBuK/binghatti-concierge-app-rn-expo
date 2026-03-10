import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type {
  ApiResponse,
  ResidentActiveLease,
  ResidentLeaseDocument,
  ResidentActiveParkingAllocation,
} from "../../types";
import type { ResidentSelfServiceApi } from "./types";

type UnknownRecord = Record<string, unknown>;

const logResidentSelfService = (label: string, payload: unknown): void => {
  if (!__DEV__) return;
  console.log(`[ResidentSelfService] ${label}`, payload);
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readProp = (value: unknown, key: string): unknown =>
  isRecord(value) ? value[key] : undefined;

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return null;
};

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const firstDefined = (...values: unknown[]): unknown =>
  values.find((item) => item !== undefined && item !== null);

const unwrapResponseData = <T>(response: ApiResponse<T> | T): T => {
  if (isRecord(response)) {
    if ("data" in response) {
      return response.data as T;
    }
    if ("items" in response) {
      return response.items as T;
    }
    if ("result" in response) {
      return response.result as T;
    }
  }

  return response as T;
};

const mapLease = (payload: UnknownRecord): ResidentActiveLease => {
  const unit = readProp(payload, "unit");
  const occupancy = readProp(payload, "occupancy");
  const buildingUnit = readProp(payload, "buildingUnit");

  return {
    id: toStringOrNull(firstDefined(payload.id, payload.leaseId)),
    unitLabel: toStringOrNull(
      firstDefined(
        payload.unitLabel,
        payload.unitNumber,
        payload.apartment,
        readProp(unit, "label"),
        readProp(unit, "unitNumber"),
        readProp(unit, "number"),
        readProp(occupancy, "unitNumber"),
        readProp(buildingUnit, "label"),
      ),
    ),
    startDate: toStringOrNull(
      firstDefined(payload.startDate, payload.leaseStartDate, payload.commenceDate),
    ),
    endDate: toStringOrNull(
      firstDefined(payload.endDate, payload.leaseEndDate, payload.expiryDate),
    ),
    rentAmount: toNumberOrNull(
      firstDefined(payload.rentAmount, payload.rent, payload.monthlyRent),
    ),
    paymentFrequency: toStringOrNull(
      firstDefined(
        payload.paymentFrequency,
        payload.paymentTerm,
        payload.paymentCycle,
        payload.frequency,
      ),
    ),
  };
};

const getFilenameFromUrl = (url: string): string | null => {
  const sanitized = url.split("?")[0].split("#")[0];
  const lastSegment = sanitized.split("/").pop();
  if (!lastSegment) return null;

  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
};

const inferTypeFromFilename = (filename: string | null): string | null => {
  if (!filename || !filename.includes(".")) return null;
  const extension = filename.split(".").pop()?.trim().toLowerCase();
  return extension ? extension.toUpperCase() : null;
};

const mapDocument = (
  item: unknown,
  index: number,
): ResidentLeaseDocument | null => {
  if (typeof item === "string") {
    const url = toStringOrNull(item);
    if (!url) return null;
    const filename = getFilenameFromUrl(url) ?? `Document ${index + 1}`;

    return {
      id: `lease-document-${index + 1}`,
      filename,
      type: inferTypeFromFilename(filename),
      date: null,
      url,
    };
  }

  if (!isRecord(item)) {
    return null;
  }

  const url = toStringOrNull(
    firstDefined(item.url, item.fileUrl, item.documentUrl, item.downloadUrl, item.path),
  );
  const filename =
    toStringOrNull(
      firstDefined(
        item.filename,
        item.fileName,
        item.name,
        item.documentName,
        item.title,
      ),
    ) ??
    getFilenameFromUrl(url ?? "") ??
    `Document ${index + 1}`;

  return {
    id:
      toStringOrNull(firstDefined(item.id, item.documentId, item.fileId)) ??
      `lease-document-${index + 1}`,
    filename,
    type: toStringOrNull(
      firstDefined(
        item.type,
        item.documentType,
        item.mimeType,
        item.contentType,
        inferTypeFromFilename(filename),
      ),
    ),
    date: toStringOrNull(
      firstDefined(item.createdAt, item.uploadedAt, item.date, item.issuedAt),
    ),
    url,
  };
};

const mapParking = (payload: UnknownRecord): ResidentActiveParkingAllocation => {
  return {
    id: toStringOrNull(firstDefined(payload.id, payload.allocationId)),
    slotCode: toStringOrNull(
      firstDefined(payload.slotCode, payload.slotNumber, payload.bayCode, payload.code),
    ),
    level: toStringOrNull(
      firstDefined(payload.level, payload.floor, payload.parkingLevel),
    ),
    type: toStringOrNull(
      firstDefined(payload.type, payload.parkingType, payload.vehicleType),
    ),
    startDate: toStringOrNull(
      firstDefined(payload.startDate, payload.allocatedFrom, payload.allocationStartDate),
    ),
  };
};

export class ResidentSelfServiceApiService
  extends BaseApiService
  implements ResidentSelfServiceApi
{
  async getResidentActiveLease(): Promise<ResidentActiveLease | null> {
    try {
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.leaseActive,
      );
      logResidentSelfService("GET /resident/lease/active raw response", response);

      const payload = unwrapResponseData(response);
      logResidentSelfService("GET /resident/lease/active unwrapped payload", payload);

      if (!payload || !isRecord(payload)) {
        logResidentSelfService(
          "GET /resident/lease/active normalized",
          null,
        );
        return null;
      }

      const normalized = mapLease(payload);
      logResidentSelfService(
        "GET /resident/lease/active normalized",
        normalized,
      );
      return normalized;
    } catch (error) {
      logResidentSelfService("GET /resident/lease/active error", error);
      throw error;
    }
  }

  async getResidentActiveLeaseDocuments(): Promise<ResidentLeaseDocument[]> {
    try {
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.leaseActiveDocuments,
      );
      logResidentSelfService(
        "GET /resident/lease/active/documents raw response",
        response,
      );

      const payload = unwrapResponseData(response);
      logResidentSelfService(
        "GET /resident/lease/active/documents unwrapped payload",
        payload,
      );

      if (!payload) {
        logResidentSelfService(
          "GET /resident/lease/active/documents normalized",
          [],
        );
        return [];
      }

      const documentsSource = Array.isArray(payload)
        ? payload
        : Array.isArray(readProp(payload, "documents"))
          ? (readProp(payload, "documents") as unknown[])
          : [];

      const normalized = documentsSource
        .map((item, index) => mapDocument(item, index))
        .filter((document): document is ResidentLeaseDocument => document !== null);
      logResidentSelfService(
        "GET /resident/lease/active/documents normalized",
        normalized,
      );
      return normalized;
    } catch (error) {
      logResidentSelfService(
        "GET /resident/lease/active/documents error",
        error,
      );
      throw error;
    }
  }

  async getResidentActiveParkingAllocation():
    Promise<ResidentActiveParkingAllocation | null> {
    try {
      const response = await this.get<ApiResponse<unknown> | unknown>(
        API_ENDPOINTS.resident.parkingActiveAllocation,
      );
      logResidentSelfService(
        "GET /resident/parking/active-allocation raw response",
        response,
      );

      const payload = unwrapResponseData(response);
      logResidentSelfService(
        "GET /resident/parking/active-allocation unwrapped payload",
        payload,
      );

      if (!payload || !isRecord(payload)) {
        logResidentSelfService(
          "GET /resident/parking/active-allocation normalized",
          null,
        );
        return null;
      }

      const normalized = mapParking(payload);
      logResidentSelfService(
        "GET /resident/parking/active-allocation normalized",
        normalized,
      );
      return normalized;
    } catch (error) {
      logResidentSelfService(
        "GET /resident/parking/active-allocation error",
        error,
      );
      throw error;
    }
  }
}

export const residentSelfServiceApi = new ResidentSelfServiceApiService();
