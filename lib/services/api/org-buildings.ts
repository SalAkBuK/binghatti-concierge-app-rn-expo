import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type { ApiResponse, OrgBuildingRequestComment } from "../../types";

export interface OrgBuildingAttachmentInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface OrgBuildingAssignment {
  buildingId?: string;
  buildingName?: string;
  type?: string;
  userId?: string;
  user?: {
    id?: string;
    name?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
}

export class OrgBuildingsApiService extends BaseApiService {
  async getAssignedBuildings(): Promise<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>(API_ENDPOINTS.orgBuildings.assigned);
  }

  async getBuilding(buildingId: string | number): Promise<ApiResponse<any>> {
    return this.get<ApiResponse<any>>(API_ENDPOINTS.orgBuildings.detail(buildingId));
  }

  async getOccupancyCount(
    buildingId: string | number,
  ): Promise<ApiResponse<{ active: number }>> {
    return this.get<ApiResponse<{ active: number }>>(
      API_ENDPOINTS.orgBuildings.occupancyCount(buildingId),
    );
  }

  async getUnitsCount(
    buildingId: string | number,
  ): Promise<ApiResponse<{ total: number; vacant: number }>> {
    return this.get<ApiResponse<{ total: number; vacant: number }>>(
      API_ENDPOINTS.orgBuildings.unitsCount(buildingId),
    );
  }

  async getBuildingRequests(
    buildingId: string | number,
    params?: {
      status?: string;
      ownerApprovalStatus?: string;
      queue?: string;
    },
  ): Promise<ApiResponse<any[]>> {
    return this.get<ApiResponse<any[]>>(
      API_ENDPOINTS.orgBuildings.requests(buildingId),
      params,
    );
  }

  async getRequest(
    buildingId: string | number,
    requestId: string | number,
  ): Promise<ApiResponse<any>> {
    return this.get<ApiResponse<any>>(API_ENDPOINTS.orgBuildings.request(buildingId, requestId));
  }

  async updateRequestStatus(
    buildingId: string | number,
    requestId: string | number,
    status: "IN_PROGRESS" | "COMPLETED",
  ): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>(
      API_ENDPOINTS.orgBuildings.requestStatus(buildingId, requestId),
      { status },
    );
  }

  async cancelRequest(
    buildingId: string | number,
    requestId: string | number,
  ): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>(
      API_ENDPOINTS.orgBuildings.requestCancel(buildingId, requestId),
      {},
    );
  }

  async addComment(
    buildingId: string | number,
    requestId: string | number,
    message: string,
  ): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>(
      API_ENDPOINTS.orgBuildings.requestComments(buildingId, requestId),
      { message },
    );
  }

  async getComments(
    buildingId: string | number,
    requestId: string | number,
  ): Promise<ApiResponse<OrgBuildingRequestComment[]>> {
    return this.get<ApiResponse<OrgBuildingRequestComment[]>>(
      API_ENDPOINTS.orgBuildings.requestComments(buildingId, requestId),
    );
  }

  async getAssignments(
    buildingId: string | number,
  ): Promise<ApiResponse<OrgBuildingAssignment[]>> {
    return this.get<ApiResponse<OrgBuildingAssignment[]>>(
      API_ENDPOINTS.orgBuildings.assignments(buildingId),
    );
  }

  async assignRequest(
    buildingId: string | number,
    requestId: string | number,
    staffUserId: string | number,
  ): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>(
      API_ENDPOINTS.orgBuildings.requestAssign(buildingId, requestId),
      { staffUserId },
    );
  }

  async addAttachments(
    buildingId: string | number,
    requestId: string | number,
    attachments: OrgBuildingAttachmentInput[],
  ): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>(
      API_ENDPOINTS.orgBuildings.requestAttachments(buildingId, requestId),
      { attachments },
    );
  }
}

export const orgBuildingsApi = new OrgBuildingsApiService();
