// Employee API service

import { BaseApiService } from "./base";
import { API_ENDPOINTS } from "../../utils/constants";
import type { EmployeeApi, EmployeeJobListParams, EmployeeMessageListParams, EmployeeEarningsParams } from "./types";
import type {
  AcceptJobAssignmentDTO,
  DeclineJobAssignmentDTO,
  StartJobDTO,
  UploadJobPhotoDTO,
  AddJobAdditionalCostDTO,
  CompleteJobDTO,
  SendEmployeeMessageDTO,
  ApiResponse,
  Job,
  EmployeeMessage,
  EmployeeEarnings,
  User,
} from "../../types";

export class EmployeeApiService extends BaseApiService implements EmployeeApi {
  // Job Management
  async getJobs(
    params?: EmployeeJobListParams,
  ): Promise<ApiResponse<Job[]>> {
    try {
      const response = await this.get<ApiResponse<Job[]>>(
        API_ENDPOINTS.employee.jobs,
        params,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async getJob(id: string): Promise<ApiResponse<Job>> {
    try {
      const response = await this.get<ApiResponse<Job>>(
        API_ENDPOINTS.employee.job(id),
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async acceptJob(
    id: string,
    data: AcceptJobAssignmentDTO,
  ): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        API_ENDPOINTS.employee.acceptJob(id),
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async declineJob(
    id: string,
    data: DeclineJobAssignmentDTO,
  ): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        API_ENDPOINTS.employee.declineJob(id),
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async startJob(id: string, data: StartJobDTO): Promise<ApiResponse<Job>> {
    try {
      const response = await this.post<ApiResponse<Job>>(
        API_ENDPOINTS.employee.startJob(id),
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async uploadPhoto(
    id: string,
    data: UploadJobPhotoDTO,
  ): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        API_ENDPOINTS.employee.uploadPhoto(id),
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async addAdditionalCost(
    id: string,
    data: AddJobAdditionalCostDTO,
  ): Promise<ApiResponse> {
    try {
      const response = await this.post<ApiResponse>(
        API_ENDPOINTS.employee.addCost(id),
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async completeJob(
    id: string,
    data: CompleteJobDTO,
  ): Promise<ApiResponse<Job>> {
    try {
      const response = await this.post<ApiResponse<Job>>(
        API_ENDPOINTS.employee.completeJob(id),
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Messaging
  async getMessages(
    params?: EmployeeMessageListParams,
  ): Promise<ApiResponse<EmployeeMessage[]>> {
    try {
      const response = await this.get<ApiResponse<EmployeeMessage[]>>(
        API_ENDPOINTS.employee.messages,
        params,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async sendMessage(
    data: SendEmployeeMessageDTO,
  ): Promise<ApiResponse<EmployeeMessage>> {
    try {
      const response = await this.post<ApiResponse<EmployeeMessage>>(
        API_ENDPOINTS.employee.sendMessage,
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Earnings
  async getEarnings(
    params?: EmployeeEarningsParams,
  ): Promise<ApiResponse<EmployeeEarnings>> {
    try {
      const response = await this.get<ApiResponse<EmployeeEarnings>>(
        API_ENDPOINTS.employee.earnings,
        params,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Profile
  async getProfile(): Promise<ApiResponse<User>> {
    try {
      const response = await this.get<ApiResponse<User>>(
        API_ENDPOINTS.employee.profile,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const response = await this.put<ApiResponse<User>>(
        API_ENDPOINTS.employee.updateProfile,
        data,
      );

      return response;
    } catch (error) {
      throw error;
    }
  }

  // Helper methods for specific job operations
  async getJobsByStatus(
    status: Job["status"],
    params?: Omit<EmployeeJobListParams, "status">,
  ): Promise<ApiResponse<Job[]>> {
    return this.getJobs({ ...params, status });
  }

  async getAssignedJobs(
    params?: EmployeeJobListParams,
  ): Promise<ApiResponse<Job[]>> {
    return this.getJobs({ ...params, status: "assigned" });
  }

  async getInProgressJobs(
    params?: EmployeeJobListParams,
  ): Promise<ApiResponse<Job[]>> {
    return this.getJobs({ ...params, status: "in-progress" });
  }

  async getCompletedJobs(
    params?: EmployeeJobListParams,
  ): Promise<ApiResponse<Job[]>> {
    return this.getJobs({ ...params, status: "completed" });
  }

  async getUnreadMessages(
    params?: Omit<EmployeeMessageListParams, "unreadOnly">,
  ): Promise<ApiResponse<EmployeeMessage[]>> {
    return this.getMessages({ ...params, unreadOnly: true });
  }

  async getCurrentMonthEarnings(): Promise<ApiResponse<EmployeeEarnings>> {
    const now = new Date();
    return this.getEarnings({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    });
  }

  async getYearEarnings(year: number): Promise<ApiResponse<EmployeeEarnings>> {
    return this.getEarnings({ year });
  }
}
