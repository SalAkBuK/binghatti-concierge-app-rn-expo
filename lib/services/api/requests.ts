// Requests API service

import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type { RequestsApi, RequestListParams } from "./types";
import type {
  CreateRequestDTO,
  UpdateRequestDTO,
  ApiResponse,
  Request,
} from "../../types";

export class RequestsApiService extends BaseApiService implements RequestsApi {
  async getRequests(
    params?: RequestListParams,
  ): Promise<ApiResponse<Request[]>> {
    try {
      const response = await this.get<ApiResponse<Request[]>>(
        API_ENDPOINTS.requests.list,
        params,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async getRequest(id: string): Promise<ApiResponse<Request>> {
    try {
      const response = await this.get<ApiResponse<Request>>(
        API_ENDPOINTS.requests.update(id),
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async createRequest(data: CreateRequestDTO): Promise<ApiResponse<Request>> {
    try {
      const response = await this.post<ApiResponse<Request>>(
        API_ENDPOINTS.requests.create,
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateRequest(
    id: string,
    data: UpdateRequestDTO,
  ): Promise<ApiResponse<Request>> {
    try {
      const response = await this.put<ApiResponse<Request>>(
        API_ENDPOINTS.requests.update(id),
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteRequest(id: string): Promise<ApiResponse> {
    try {
      const response = await this.delete<ApiResponse>(
        API_ENDPOINTS.requests.delete(id),
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async addComment(requestId: string, message: string): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        `${API_ENDPOINTS.requests.update(requestId)}/comments`,
        { message },
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Helper methods for specific request operations
  async getRequestsByStatus(
    status: Request["status"],
    params?: Omit<RequestListParams, "status">,
  ): Promise<ApiResponse<Request[]>> {
    return this.getRequests({ ...params, status });
  }

  async getRequestsByPriority(
    priority: Request["priority"],
    params?: Omit<RequestListParams, "priority">,
  ): Promise<ApiResponse<Request[]>> {
    return this.getRequests({ ...params, priority });
  }

  async getRequestsByType(
    type: Request["type"],
    params?: Omit<RequestListParams, "type">,
  ): Promise<ApiResponse<Request[]>> {
    return this.getRequests({ ...params, type });
  }

  async getRequestsByTenant(
    tenantId: string,
    params?: Omit<RequestListParams, "tenantId">,
  ): Promise<ApiResponse<Request[]>> {
    return this.getRequests({ ...params, tenantId });
  }

  async getAssignedRequests(
    assignedTo: string,
    params?: Omit<RequestListParams, "assignedTo">,
  ): Promise<ApiResponse<Request[]>> {
    return this.getRequests({ ...params, assignedTo });
  }

  // Status update helpers
  async markAsInProgress(id: string): Promise<ApiResponse<Request>> {
    return this.updateRequest(id, { status: "in-progress" });
  }

  async markAsCompleted(id: string): Promise<ApiResponse<Request>> {
    return this.updateRequest(id, { status: "completed" });
  }

  async markAsCancelled(id: string): Promise<ApiResponse<Request>> {
    return this.updateRequest(id, { status: "cancelled" });
  }

  async assignRequest(
    id: string,
    assignedTo: string,
  ): Promise<ApiResponse<Request>> {
    return this.updateRequest(id, { assignedTo });
  }

  async changePriority(
    id: string,
    priority: Request["priority"],
  ): Promise<ApiResponse<Request>> {
    return this.updateRequest(id, { priority });
  }
}
