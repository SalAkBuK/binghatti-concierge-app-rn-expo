import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type { ApiResponse, ResidentEmergencySignal } from "../../types";

export interface ResidentRequestAttachmentInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export type ResidentRequestType =
  | "CLEANING"
  | "ELECTRICAL"
  | "MAINTENANCE"
  | "PLUMBING_AC_HEATING"
  | "OTHER";

export type ResidentRequestPriority = "LOW" | "MEDIUM" | "HIGH";

export interface CreateResidentRequestDTO {
  title: string;
  description: string;
  type?: ResidentRequestType;
  priority?: ResidentRequestPriority;
  attachments?: ResidentRequestAttachmentInput[];
  isEmergency?: boolean;
  emergencySignals?: ResidentEmergencySignal[];
}

export interface UpdateResidentRequestDTO {
  title?: string;
  description?: string;
  type?: ResidentRequestType;
  priority?: ResidentRequestPriority;
  isEmergency?: boolean;
  emergencySignals?: ResidentEmergencySignal[];
}

export class ResidentRequestsApiService extends BaseApiService {
  async getRequests(): Promise<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>(API_ENDPOINTS.residentRequests.list);
  }

  async getRequest(id: string): Promise<ApiResponse<any>> {
    return this.get<ApiResponse<any>>(API_ENDPOINTS.residentRequests.detail(id));
  }

  async createRequest(
    payload: CreateResidentRequestDTO,
  ): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: "POST",
      url: API_ENDPOINTS.residentRequests.list,
      data: payload,
      timeout: 30000,
    });
  }

  async updateRequest(
    id: string,
    payload: UpdateResidentRequestDTO,
  ): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>({
      method: "PATCH",
      url: API_ENDPOINTS.residentRequests.update(id),
      data: payload,
      timeout: 30000,
    });
  }

  async cancelRequest(id: string): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>(API_ENDPOINTS.residentRequests.cancel(id));
  }

  async addComment(id: string, message: string): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>(API_ENDPOINTS.residentRequests.comments(id), {
      message,
    });
  }

  async getComments(id: string): Promise<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>(API_ENDPOINTS.residentRequests.comments(id));
  }
}

export const residentRequestsApi = new ResidentRequestsApiService();
