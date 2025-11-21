// Shift Management API service

import type {
  Shift,
  CreateShiftDTO,
  UpdateShiftDTO,
  ShiftConflict,
  ApiResponse,
} from "../../types";
import { BaseApiService } from "./base";

export class ShiftsApiService extends BaseApiService {
  /**
   * Get all shifts for a building
   * @param buildingId - Building ID
   * @param params - Optional query params (date, employeeId, status)
   */
  async getShifts(
    buildingId: string,
    params?: {
      date?: string; // YYYY-MM-DD
      startDate?: string; // For date range
      endDate?: string;
      employeeId?: string;
      status?: string;
    },
  ): Promise<ApiResponse<Shift[]>> {
    return this.get<ApiResponse<Shift[]>>(
      `/management/buildings/${buildingId}/shifts`,
      params,
    );
  }

  /**
   * Get a specific shift by ID
   * @param shiftId - Shift ID
   */
  async getShift(shiftId: string): Promise<ApiResponse<Shift>> {
    return this.get<ApiResponse<Shift>>(`/management/shifts/${shiftId}`);
  }

  /**
   * Create a new shift
   * @param data - Shift data
   */
  async createShift(data: CreateShiftDTO): Promise<ApiResponse<Shift>> {
    return this.post<ApiResponse<Shift>>(
      `/management/buildings/${data.buildingId}/shifts`,
      data,
    );
  }

  /**
   * Update shift details
   * @param shiftId - Shift ID
   * @param data - Updated shift data
   */
  async updateShift(
    shiftId: string,
    data: UpdateShiftDTO,
  ): Promise<ApiResponse<Shift>> {
    return this.put<ApiResponse<Shift>>(
      `/management/shifts/${shiftId}`,
      data,
    );
  }

  /**
   * Delete a shift
   * @param shiftId - Shift ID
   */
  async deleteShift(shiftId: string): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`/management/shifts/${shiftId}`);
  }

  /**
   * Cancel a shift (soft delete by updating status)
   * @param shiftId - Shift ID
   * @param reason - Cancellation reason
   */
  async cancelShift(
    shiftId: string,
    reason?: string,
  ): Promise<ApiResponse<Shift>> {
    return this.put<ApiResponse<Shift>>(
      `/management/shifts/${shiftId}/cancel`,
      { reason },
    );
  }

  /**
   * Detect conflicts for a shift
   * @param shiftData - Shift data to validate
   */
  async detectConflicts(
    shiftData: CreateShiftDTO | (UpdateShiftDTO & { shiftId?: string }),
  ): Promise<ApiResponse<ShiftConflict[]>> {
    return this.post<ApiResponse<ShiftConflict[]>>(
      `/management/shifts/detect-conflicts`,
      shiftData,
    );
  }

  /**
   * Bulk create shifts (e.g., copy a day to a week)
   * @param buildingId - Building ID
   * @param shifts - Array of shift data
   */
  async bulkCreateShifts(
    buildingId: string,
    shifts: CreateShiftDTO[],
  ): Promise<ApiResponse<Shift[]>> {
    return this.post<ApiResponse<Shift[]>>(
      `/management/buildings/${buildingId}/shifts/bulk`,
      { shifts },
    );
  }

  /**
   * Get shifts for a specific employee
   * @param employeeId - Employee ID
   * @param params - Optional query params (startDate, endDate, buildingId)
   */
  async getEmployeeShifts(
    employeeId: string,
    params?: {
      startDate?: string;
      endDate?: string;
      buildingId?: string;
      status?: string;
    },
  ): Promise<ApiResponse<Shift[]>> {
    return this.get<ApiResponse<Shift[]>>(
      `/management/employees/${employeeId}/shifts`,
      params,
    );
  }

  /**
   * Get shift statistics for a building
   * @param buildingId - Building ID
   * @param period - Time period (day, week, month)
   */
  async getShiftStats(
    buildingId: string,
    period: "day" | "week" | "month" = "week",
  ): Promise<
    ApiResponse<{
      total: number;
      active: number;
      completed: number;
      cancelled: number;
      conflicts: number;
      coverage: number; // percentage of time covered
    }>
  > {
    return this.get<
      ApiResponse<{
        total: number;
        active: number;
        completed: number;
        cancelled: number;
        conflicts: number;
        coverage: number;
      }>
    >(`/management/buildings/${buildingId}/shifts/stats`, { period });
  }

  /**
   * Copy shifts from one date to multiple dates
   * @param buildingId - Building ID
   * @param sourceDate - Date to copy from (YYYY-MM-DD)
   * @param targetDates - Array of dates to copy to
   */
  async copyShifts(
    buildingId: string,
    sourceDate: string,
    targetDates: string[],
  ): Promise<ApiResponse<Shift[]>> {
    return this.post<ApiResponse<Shift[]>>(
      `/management/buildings/${buildingId}/shifts/copy`,
      { sourceDate, targetDates },
    );
  }
}
