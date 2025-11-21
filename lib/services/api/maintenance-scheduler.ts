// Admin Maintenance Scheduler API service (Portfolio-wide view)

import { BaseApiService } from "./base";
import type {
  MaintenanceSchedule,
  MaintenanceEvent,
  CreateMaintenanceScheduleDTO,
  UpdateMaintenanceScheduleDTO,
  TenantImpact,
  ScheduleConflict,
  ApiResponse,
} from "../../types";

// Mock mode flag - set to false when backend is ready
const USE_MOCK = true;

// Mock delay to simulate network requests
const MOCK_DELAY = 500;

// Mock data generator
const generateMockMaintenanceSchedules = (): MaintenanceSchedule[] => {
  const now = Date.now();
  return [
    {
      id: "ms-1",
      buildingId: "building-1",
      buildingName: "Tower A",
      title: "HVAC System Annual Service",
      description: "Annual preventive maintenance for all HVAC units in the building",
      maintenanceType: "hvac",
      scheduledDate: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledTime: "09:00",
      duration: 4,
      status: "upcoming",
      affectedAreas: ["All Floors"],
      estimatedImpact: "AC will be off between 9 AM - 1 PM",
      notifiedTenants: true,
      notificationSentAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      notificationMessage: "Dear residents, HVAC maintenance is scheduled for next week...",
      createdBy: "admin-1",
      createdByName: "Admin User",
      createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ms-2",
      buildingId: "building-2",
      buildingName: "Tower B",
      title: "Elevator Safety Inspection",
      description: "Quarterly elevator safety inspection and certification",
      maintenanceType: "elevator",
      scheduledDate: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledTime: "08:00",
      duration: 3,
      status: "upcoming",
      affectedAreas: ["All Elevators"],
      estimatedImpact: "One elevator at a time will be out of service",
      notifiedTenants: true,
      notificationSentAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      notificationMessage: "Elevator inspection scheduled this Friday...",
      createdBy: "admin-1",
      createdByName: "Admin User",
      createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ms-3",
      buildingId: "building-1",
      buildingName: "Tower A",
      title: "Water Tank Cleaning",
      description: "Bi-annual water tank cleaning and sanitization",
      maintenanceType: "water_system",
      scheduledDate: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledTime: "06:00",
      duration: 6,
      status: "completed",
      affectedAreas: ["Entire Building"],
      estimatedImpact: "Water supply will be interrupted from 6 AM - 12 PM",
      notifiedTenants: true,
      notificationSentAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      notificationMessage: "Water tank cleaning scheduled for this Monday...",
      completedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: "admin-1",
      createdByName: "Admin User",
      notes: "Completed on time, no issues reported",
      createdAt: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ms-4",
      buildingId: "building-3",
      buildingName: "Tower C",
      title: "Fire Safety System Check",
      description: "Monthly fire alarm and sprinkler system inspection",
      maintenanceType: "fire_safety",
      scheduledDate: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
      scheduledTime: "10:00",
      duration: 2,
      status: "upcoming",
      affectedAreas: ["All Floors"],
      estimatedImpact: "Brief fire alarm tests will be conducted",
      notifiedTenants: false,
      createdBy: "admin-1",
      createdByName: "Admin User",
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

/**
 * Admin Maintenance Scheduler API Service
 * Handles portfolio-wide maintenance scheduling operations for admins
 *
 * Currently using mock data with simulated delays.
 * Set USE_MOCK to false when backend is ready.
 */
export class MaintenanceSchedulerApiService extends BaseApiService {
  // Portfolio-wide maintenance schedules (Admin view)
  async getAllSchedules(
    status?: string,
    buildingId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<MaintenanceSchedule[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let schedules = generateMockMaintenanceSchedules();

          if (status) {
            schedules = schedules.filter(s => s.status === status);
          }
          if (buildingId) {
            schedules = schedules.filter(s => s.buildingId === buildingId);
          }
          if (startDate) {
            schedules = schedules.filter(s => new Date(s.scheduledDate) >= new Date(startDate));
          }
          if (endDate) {
            schedules = schedules.filter(s => new Date(s.scheduledDate) <= new Date(endDate));
          }

          resolve({
            success: true,
            data: schedules,
            message: "Maintenance schedules fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (buildingId) params.append("buildingId", buildingId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `/api/admin/maintenance/schedules${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await this.get<ApiResponse<MaintenanceSchedule[]>>(url);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getScheduleById(id: string): Promise<ApiResponse<MaintenanceSchedule>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const schedule = generateMockMaintenanceSchedules().find(s => s.id === id);
          resolve({
            success: true,
            data: schedule,
            message: "Maintenance schedule fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<MaintenanceSchedule>>(`/api/admin/maintenance/schedules/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createSchedule(data: CreateMaintenanceScheduleDTO): Promise<ApiResponse<MaintenanceSchedule>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const newSchedule: MaintenanceSchedule = {
            id: `ms-${Date.now()}`,
            buildingId: data.buildingId,
            buildingName: "Building Name",
            title: data.title,
            description: data.description,
            maintenanceType: data.maintenanceType,
            scheduledDate: data.scheduledDate,
            scheduledTime: data.scheduledTime,
            duration: data.duration,
            status: "upcoming",
            affectedAreas: data.affectedAreas,
            affectedUnits: data.affectedUnits,
            estimatedImpact: data.estimatedImpact,
            notifiedTenants: data.notifyTenants || false,
            notificationMessage: data.notificationMessage,
            createdBy: "admin-1",
            createdByName: "Admin User",
            notes: data.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          if (data.notifyTenants) {
            newSchedule.notificationSentAt = new Date().toISOString();
          }

          resolve({
            success: true,
            data: newSchedule,
            message: "Maintenance schedule created successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<MaintenanceSchedule>>("/api/admin/maintenance/schedules", data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateSchedule(id: string, data: UpdateMaintenanceScheduleDTO): Promise<ApiResponse<MaintenanceSchedule>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const existing = generateMockMaintenanceSchedules().find(s => s.id === id);
          const updated: MaintenanceSchedule = {
            ...existing!,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: updated,
            message: "Maintenance schedule updated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<MaintenanceSchedule>>(`/api/admin/maintenance/schedules/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteSchedule(id: string): Promise<ApiResponse<void>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "Maintenance schedule deleted successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.delete<ApiResponse<void>>(`/api/admin/maintenance/schedules/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async cancelSchedule(id: string, reason: string): Promise<ApiResponse<MaintenanceSchedule>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const existing = generateMockMaintenanceSchedules().find(s => s.id === id);
          const cancelled: MaintenanceSchedule = {
            ...existing!,
            status: "cancelled",
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason,
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: cancelled,
            message: "Maintenance schedule cancelled successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<MaintenanceSchedule>>(
        `/api/admin/maintenance/schedules/${id}/cancel`,
        { reason }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async notifyTenants(id: string, message?: string): Promise<ApiResponse<{ notificationsSent: number }>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: { notificationsSent: 45 },
            message: "Tenants notified successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<{ notificationsSent: number }>>(
        `/api/admin/maintenance/schedules/${id}/notify`,
        { message }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getTenantImpact(buildingId: string, date: string, affectedAreas?: string[]): Promise<ApiResponse<TenantImpact>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const impact: TenantImpact = {
            totalUnits: 120,
            affectedUnits: affectedAreas?.includes("Entire Building") ? 120 : 45,
            estimatedTenants: affectedAreas?.includes("Entire Building") ? 180 : 68,
            unitNumbers: affectedAreas?.includes("Entire Building")
              ? ["101", "102", "103", "..."]
              : ["201", "202", "203", "301", "302"],
          };
          resolve({
            success: true,
            data: impact,
            message: "Tenant impact calculated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<TenantImpact>>(
        `/api/admin/maintenance/impact`,
        { buildingId, date, affectedAreas }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async detectConflicts(scheduleData: CreateMaintenanceScheduleDTO): Promise<ApiResponse<ScheduleConflict[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // Simulate no conflicts for mock
          resolve({
            success: true,
            data: [],
            message: "No conflicts detected (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<ScheduleConflict[]>>(
        "/api/admin/maintenance/schedules/detect-conflicts",
        scheduleData
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getPortfolioStats(period: "month" | "quarter" | "year" = "month"): Promise<
    ApiResponse<{
      total: number;
      upcoming: number;
      inProgress: number;
      completed: number;
      cancelled: number;
      byBuilding: { buildingId: string; buildingName: string; count: number }[];
      byType: { type: string; count: number }[];
    }>
  > {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const stats = {
            total: 24,
            upcoming: 10,
            inProgress: 2,
            completed: 11,
            cancelled: 1,
            byBuilding: [
              { buildingId: "building-1", buildingName: "Tower A", count: 10 },
              { buildingId: "building-2", buildingName: "Tower B", count: 8 },
              { buildingId: "building-3", buildingName: "Tower C", count: 6 },
            ],
            byType: [
              { type: "hvac", count: 6 },
              { type: "elevator", count: 4 },
              { type: "plumbing", count: 5 },
              { type: "fire_safety", count: 4 },
              { type: "water_system", count: 3 },
              { type: "other", count: 2 },
            ],
          };
          resolve({
            success: true,
            data: stats,
            message: "Portfolio stats fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<
        ApiResponse<{
          total: number;
          upcoming: number;
          inProgress: number;
          completed: number;
          cancelled: number;
          byBuilding: { buildingId: string; buildingName: string; count: number }[];
          byType: { type: string; count: number }[];
        }>
      >(`/api/admin/maintenance/stats?period=${period}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
}
