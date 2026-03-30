import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type {
  ApiResponse,
  CreateResidentVisitorDTO,
  ResidentVisitor,
  ResidentVisitorStatus,
  ResidentVisitorType,
  UpdateResidentVisitorDTO,
} from "../../types";

const logResidentVisitorDebug = (label: string, payload: unknown): void => {
  if (!__DEV__) return;
  console.log(`[ResidentVisitors] ${label}`, payload);
};

const summarizeError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const candidate = error as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    details?: unknown;
  };

  return {
    message:
      typeof candidate.message === "string"
        ? candidate.message
        : String(candidate.message ?? "Unknown error"),
    status:
      typeof candidate.status === "number" ? candidate.status : candidate.status,
    code: candidate.code,
    details: candidate.details,
  };
};

const VISITOR_TYPES: ResidentVisitorType[] = [
  "GUEST_VISITOR",
  "DELIVERY_RIDER",
  "COURIER_PARCEL",
  "SERVICE_PROVIDER",
  "MAINTENANCE_TECHNICIAN",
  "HOUSEKEEPING_CLEANER",
  "CONTRACTOR_WORKER",
  "DRIVER_PICKUP",
  "SECURITY_STAFF_EXTERNAL",
  "OTHER",
];

const VISITOR_STATUSES: ResidentVisitorStatus[] = [
  "EXPECTED",
  "ARRIVED",
  "COMPLETED",
  "CANCELLED",
];

const toResidentVisitorType = (value: unknown): ResidentVisitorType => {
  const normalized = String(value || "").toUpperCase() as ResidentVisitorType;
  return VISITOR_TYPES.includes(normalized) ? normalized : "OTHER";
};

const toResidentVisitorStatus = (value: unknown): ResidentVisitorStatus => {
  const normalized = String(value || "").toUpperCase() as ResidentVisitorStatus;
  return VISITOR_STATUSES.includes(normalized) ? normalized : "EXPECTED";
};

const extractPayload = <T>(response: ApiResponse<T> | T): T => {
  if (response && typeof response === "object") {
    const payload = response as ApiResponse<T> & {
      item?: T;
      visitor?: T;
    };
    if (payload.data !== undefined) return payload.data;
    if (payload.items !== undefined) return payload.items;
    if (payload.item !== undefined) return payload.item;
    if (payload.visitor !== undefined) return payload.visitor;
  }
  return response as T;
};

const normalizeResidentVisitor = (payload: any): ResidentVisitor => ({
  id: String(payload?.id ?? ""),
  buildingId: String(payload?.buildingId ?? ""),
  type: toResidentVisitorType(payload?.type),
  status: toResidentVisitorStatus(payload?.status),
  visitorName: payload?.visitorName || "",
  phoneNumber: payload?.phoneNumber || "",
  emiratesId:
    payload?.emiratesId != null && payload?.emiratesId !== ""
      ? String(payload.emiratesId)
      : null,
  vehicleNumber:
    payload?.vehicleNumber != null && payload?.vehicleNumber !== ""
      ? String(payload.vehicleNumber)
      : null,
  expectedArrivalAt:
    payload?.expectedArrivalAt != null && payload?.expectedArrivalAt !== ""
      ? String(payload.expectedArrivalAt)
      : null,
  notes:
    payload?.notes != null && payload?.notes !== ""
      ? String(payload.notes)
      : null,
  unit: {
    id: String(payload?.unit?.id ?? ""),
    label: payload?.unit?.label || "",
  },
  tenantName:
    payload?.tenantName != null && payload?.tenantName !== ""
      ? String(payload.tenantName)
      : null,
  createdAt: payload?.createdAt || new Date().toISOString(),
  updatedAt: payload?.updatedAt || payload?.createdAt || new Date().toISOString(),
});

export class ResidentVisitorsApiService extends BaseApiService {
  async listVisitors(
    status?: ResidentVisitorStatus,
  ): Promise<ResidentVisitor[]> {
    const response = await this.get<ApiResponse<any[]>>(
      API_ENDPOINTS.resident.visitors,
      status ? { status } : undefined,
    );
    const payload = extractPayload<any[]>(response);
    return Array.isArray(payload)
      ? payload.map(normalizeResidentVisitor)
      : [];
  }

  async getVisitor(visitorId: string): Promise<ResidentVisitor> {
    const response = await this.get<ApiResponse<any>>(
      API_ENDPOINTS.resident.visitorDetail(visitorId),
    );
    return normalizeResidentVisitor(extractPayload<any>(response));
  }

  async createVisitor(
    payload: CreateResidentVisitorDTO,
  ): Promise<ResidentVisitor> {
    logResidentVisitorDebug("POST /resident/visitors request", {
      endpoint: API_ENDPOINTS.resident.visitors,
      payload,
    });

    try {
      const response = await this.post<ApiResponse<any>>(
        API_ENDPOINTS.resident.visitors,
        payload,
      );
      logResidentVisitorDebug("POST /resident/visitors response", response);
      return normalizeResidentVisitor(extractPayload<any>(response));
    } catch (error) {
      logResidentVisitorDebug(
        "POST /resident/visitors error",
        summarizeError(error),
      );
      throw error;
    }
  }

  async updateVisitor(
    visitorId: string,
    payload: UpdateResidentVisitorDTO,
  ): Promise<ResidentVisitor> {
    const response = await this.patch<ApiResponse<any>>(
      API_ENDPOINTS.resident.visitorDetail(visitorId),
      payload,
    );
    return normalizeResidentVisitor(extractPayload<any>(response));
  }

  async cancelVisitor(visitorId: string): Promise<ResidentVisitor> {
    const response = await this.post<ApiResponse<any>>(
      API_ENDPOINTS.resident.visitorCancel(visitorId),
    );
    return normalizeResidentVisitor(extractPayload<any>(response));
  }
}

export const residentVisitorsApi = new ResidentVisitorsApiService();
