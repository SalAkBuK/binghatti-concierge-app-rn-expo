// Maintenance Scheduling API service

import type {
  MaintenanceSchedule,
  CreateMaintenanceScheduleDTO,
  UpdateMaintenanceScheduleDTO,
  TenantImpact,
  ScheduleConflict,
  ApiResponse,
} from "../../types";
import { BaseApiService } from "./base";

export class MaintenanceApiService extends BaseApiService {
  /**
   * Get all maintenance schedules for a building
   * @param buildingId - Building ID
   * @param params - Optional query params (status, startDate, endDate)
   */
  async getSchedules(
    buildingId: string,
    params?: {
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ApiResponse<MaintenanceSchedule[]>> {
    return this.get<ApiResponse<MaintenanceSchedule[]>>(
      `/management/buildings/${buildingId}/maintenance-schedules`,
      params,
    );
  }

  /**
   * Get a specific maintenance schedule by ID
   * @param scheduleId - Schedule ID
   */
  async getSchedule(scheduleId: string): Promise<ApiResponse<MaintenanceSchedule>> {
    return this.get<ApiResponse<MaintenanceSchedule>>(
      `/management/maintenance-schedules/${scheduleId}`,
    );
  }

  /**
   * Create a new maintenance schedule
   * @param data - Schedule data
   */
  async createSchedule(
    data: CreateMaintenanceScheduleDTO,
  ): Promise<ApiResponse<MaintenanceSchedule>> {
    return this.post<ApiResponse<MaintenanceSchedule>>(
      `/management/buildings/${data.buildingId}/maintenance-schedules`,
      data,
    );
  }

  /**
   * Update maintenance schedule details
   * @param scheduleId - Schedule ID
   * @param data - Updated schedule data
   */
  async updateSchedule(
    scheduleId: string,
    data: UpdateMaintenanceScheduleDTO,
  ): Promise<ApiResponse<MaintenanceSchedule>> {
    return this.put<ApiResponse<MaintenanceSchedule>>(
      `/management/maintenance-schedules/${scheduleId}`,
      data,
    );
  }

  /**
   * Cancel a maintenance schedule
   * @param scheduleId - Schedule ID
   * @param reason - Cancellation reason
   */
  async cancelSchedule(
    scheduleId: string,
    reason: string,
  ): Promise<ApiResponse<MaintenanceSchedule>> {
    return this.put<ApiResponse<MaintenanceSchedule>>(
      `/management/maintenance-schedules/${scheduleId}/cancel`,
      { reason },
    );
  }

  /**
   * Delete a maintenance schedule
   * @param scheduleId - Schedule ID
   */
  async deleteSchedule(scheduleId: string): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(
      `/management/maintenance-schedules/${scheduleId}`,
    );
  }

  /**
   * Send notifications to affected tenants
   * @param scheduleId - Schedule ID
   * @param message - Custom notification message
   */
  async notifyTenants(
    scheduleId: string,
    message?: string,
  ): Promise<ApiResponse<{ notificationsSent: number }>> {
    return this.post<ApiResponse<{ notificationsSent: number }>>(
      `/management/maintenance-schedules/${scheduleId}/notify`,
      { message },
    );
  }

  /**
   * Get tenant impact preview for a scheduled date
   * @param buildingId - Building ID
   * @param date - Scheduled date
   * @param affectedAreas - Optional affected areas/floors
   */
  async getAffectedUnits(
    buildingId: string,
    date: string,
    affectedAreas?: string[],
  ): Promise<ApiResponse<TenantImpact>> {
    return this.post<ApiResponse<TenantImpact>>(
      `/management/buildings/${buildingId}/maintenance-schedules/impact`,
      { date, affectedAreas },
    );
  }

  /**
   * Detect conflicts for a maintenance schedule
   * @param scheduleData - Schedule data to validate
   */
  async detectConflicts(
    scheduleData: CreateMaintenanceScheduleDTO | (UpdateMaintenanceScheduleDTO & { scheduleId?: string }),
  ): Promise<ApiResponse<ScheduleConflict[]>> {
    return this.post<ApiResponse<ScheduleConflict[]>>(
      `/management/maintenance-schedules/detect-conflicts`,
      scheduleData,
    );
  }

  /**
   * Get maintenance schedule statistics for a building
   * @param buildingId - Building ID
   * @param period - Time period (month, quarter, year)
   */
  async getScheduleStats(
    buildingId: string,
    period: "month" | "quarter" | "year" = "month",
  ): Promise<
    ApiResponse<{
      total: number;
      upcoming: number;
      inProgress: number;
      completed: number;
      cancelled: number;
      completionRate: number; // percentage
    }>
  > {
    return this.get<
      ApiResponse<{
        total: number;
        upcoming: number;
        inProgress: number;
        completed: number;
        cancelled: number;
        completionRate: number;
      }>
    >(`/management/buildings/${buildingId}/maintenance-schedules/stats`, {
      period,
    });
  }

  /**
   * Reschedule a maintenance event
   * @param scheduleId - Schedule ID
   * @param newDate - New scheduled date
   * @param sendUpdate - Whether to send update notification to tenants
   */
  async reschedule(
    scheduleId: string,
    newDate: string,
    sendUpdate: boolean = false,
  ): Promise<ApiResponse<MaintenanceSchedule>> {
    return this.put<ApiResponse<MaintenanceSchedule>>(
      `/management/maintenance-schedules/${scheduleId}/reschedule`,
      { newDate, sendUpdate },
    );
  }

  /**
   * Mark schedule as in progress
   * @param scheduleId - Schedule ID
   */
  async markInProgress(scheduleId: string): Promise<ApiResponse<MaintenanceSchedule>> {
    return this.put<ApiResponse<MaintenanceSchedule>>(
      `/management/maintenance-schedules/${scheduleId}/start`,
      {},
    );
  }

  /**
   * Mark schedule as completed
   * @param scheduleId - Schedule ID
   * @param notes - Optional completion notes
   */
  async markCompleted(
    scheduleId: string,
    notes?: string,
  ): Promise<ApiResponse<MaintenanceSchedule>> {
    return this.put<ApiResponse<MaintenanceSchedule>>(
      `/management/maintenance-schedules/${scheduleId}/complete`,
      { notes },
    );
  }
}
