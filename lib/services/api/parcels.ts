// Parcel & Delivery Management API service

import type {
  Parcel,
  CreateParcelDTO,
  UpdateParcelDTO,
  ApiResponse,
} from "../../types";
import { BaseApiService } from "./base";

// Mock mode flag - set to false when backend is ready
const USE_MOCK = true;

// Mock delay to simulate network requests
const MOCK_DELAY = 500;

// Mock data generator
const generateMockParcels = (): Parcel[] => {
  const now = Date.now();
  return [
    {
      id: "prcl-1",
      buildingId: "building-1",
      unitNumber: "101",
      tenantId: "tenant-1",
      tenantName: "John Doe",
      courier: "FedEx",
      receivedBy: "Security Guard Ahmed",
      receivedByEmployeeId: "emp-1",
      status: "pending",
      deliveryDate: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      pickupCode: "PKP-101-001",
      notes: "Package from Amazon",
      imageUrl: "https://example.com/parcel-1.jpg",
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "prcl-2",
      buildingId: "building-1",
      unitNumber: "205",
      tenantId: "tenant-2",
      tenantName: "Jane Smith",
      courier: "DHL",
      receivedBy: "Security Guard Mohammed",
      receivedByEmployeeId: "emp-2",
      status: "picked_up",
      deliveryDate: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      pickupDate: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      pickupCode: "PKP-205-002",
      notes: "Document envelope",
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "prcl-3",
      buildingId: "building-2",
      unitNumber: "302",
      tenantId: "tenant-3",
      tenantName: "Ahmed Al Mansoori",
      courier: "Aramex",
      receivedBy: "Security Guard Ali",
      receivedByEmployeeId: "emp-3",
      status: "pending",
      deliveryDate: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      pickupCode: "PKP-302-003",
      notes: "Large box - Handle with care",
      imageUrl: "https://example.com/parcel-3.jpg",
      createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "prcl-4",
      buildingId: "building-3",
      unitNumber: "105",
      tenantId: "tenant-4",
      tenantName: "Emily Chen",
      courier: "UPS",
      receivedBy: "Security Guard Hassan",
      receivedByEmployeeId: "emp-4",
      status: "delivered",
      deliveryDate: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      pickupDate: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      pickupCode: "PKP-105-004",
      notes: "Delivered to unit directly",
      createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

export class ParcelsApiService extends BaseApiService {
  /**
   * Get all parcels for a building
   * @param buildingId - Building ID
   * @param params - Optional query params (status, unitNumber, date range, etc.)
   */
  async getParcels(
    buildingId: string,
    params?: {
      status?: string;
      unitNumber?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ApiResponse<Parcel[]>> {
    return this.get<ApiResponse<Parcel[]>>(
      `/management/buildings/${buildingId}/parcels`,
      params,
    );
  }

  /**
   * Get a specific parcel by ID
   * @param parcelId - Parcel ID
   */
  async getParcel(parcelId: string): Promise<ApiResponse<Parcel>> {
    return this.get<ApiResponse<Parcel>>(`/management/parcels/${parcelId}`);
  }

  /**
   * Register a new parcel
   * @param data - Parcel data
   */
  async createParcel(data: CreateParcelDTO): Promise<ApiResponse<Parcel>> {
    return this.post<ApiResponse<Parcel>>(
      `/management/buildings/${data.buildingId}/parcels`,
      data,
    );
  }

  /**
   * Update parcel details
   * @param parcelId - Parcel ID
   * @param data - Updated parcel data
   */
  async updateParcel(
    parcelId: string,
    data: UpdateParcelDTO,
  ): Promise<ApiResponse<Parcel>> {
    return this.put<ApiResponse<Parcel>>(
      `/management/parcels/${parcelId}`,
      data,
    );
  }

  /**
   * Update parcel status (picked_up, delivered, lost)
   * @param parcelId - Parcel ID
   * @param status - New status
   * @param pickupDate - Optional pickup timestamp
   */
  async updateParcelStatus(
    parcelId: string,
    status: Parcel["status"],
    pickupDate?: string,
  ): Promise<ApiResponse<Parcel>> {
    return this.put<ApiResponse<Parcel>>(
      `/management/parcels/${parcelId}/status`,
      { status, pickupDate },
    );
  }

  /**
   * Delete a parcel record
   * @param parcelId - Parcel ID
   */
  async deleteParcel(parcelId: string): Promise<ApiResponse<void>> {
    return this.delete<ApiResponse<void>>(`/management/parcels/${parcelId}`);
  }

  /**
   * Verify pickup code and update status
   * @param parcelId - Parcel ID
   * @param pickupCode - Pickup verification code
   */
  async verifyPickup(
    parcelId: string,
    pickupCode: string,
  ): Promise<ApiResponse<Parcel>> {
    return this.post<ApiResponse<Parcel>>(
      `/management/parcels/${parcelId}/verify-pickup`,
      { pickupCode },
    );
  }

  /**
   * Bulk import parcels from CSV data
   * @param buildingId - Building ID
   * @param parcels - Array of parcel data
   */
  async bulkImportParcels(
    buildingId: string,
    parcels: CreateParcelDTO[],
  ): Promise<ApiResponse<Parcel[]>> {
    return this.post<ApiResponse<Parcel[]>>(
      `/management/buildings/${buildingId}/parcels/bulk-import`,
      { parcels },
    );
  }

  /**
   * Get parcel statistics for a building
   * @param buildingId - Building ID
   * @param period - Time period (day, week, month)
   */
  async getParcelStats(
    buildingId: string,
    period: "day" | "week" | "month" = "month",
  ): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      pickedUp: number;
      delivered: number;
      lost: number;
    }>
  > {
    return this.get<
      ApiResponse<{
        total: number;
        pending: number;
        pickedUp: number;
        delivered: number;
        lost: number;
      }>
    >(`/management/buildings/${buildingId}/parcels/stats`, { period });
  }

  // ===== PORTFOLIO-WIDE ADMIN METHODS =====

  /**
   * Get all parcels across all buildings (Admin view)
   * @param params - Optional query params (buildingId, status, unitNumber, date range)
   */
  async getAllParcels(params?: {
    buildingId?: string;
    status?: string;
    unitNumber?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Parcel[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let parcels = generateMockParcels();

          if (params?.buildingId) {
            parcels = parcels.filter(p => p.buildingId === params.buildingId);
          }
          if (params?.status) {
            parcels = parcels.filter(p => p.status === params.status);
          }
          if (params?.unitNumber) {
            parcels = parcels.filter(p => p.unitNumber === params.unitNumber);
          }
          if (params?.startDate) {
            parcels = parcels.filter(p => new Date(p.deliveryDate) >= new Date(params.startDate!));
          }
          if (params?.endDate) {
            parcels = parcels.filter(p => new Date(p.deliveryDate) <= new Date(params.endDate!));
          }

          resolve({
            success: true,
            data: parcels,
            message: "Parcels fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    return this.get<ApiResponse<Parcel[]>>("/api/admin/parcels", params);
  }

  /**
   * Export parcels to CSV (Admin portfolio view)
   * @param params - Optional filters
   */
  async exportParcelsToCSV(params?: {
    buildingId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Blob>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const csvContent = "Building,Unit,Tenant,Courier,Received By,Delivery Date,Pickup Date,Status\n" +
            "Tower A,101,John Doe,FedEx,Security Guard Ahmed,2025-01-03,N/A,pending\n" +
            "Tower A,205,Jane Smith,DHL,Security Guard Mohammed,2025-01-02,2025-01-04,picked_up\n" +
            "Tower B,302,Ahmed Al Mansoori,Aramex,Security Guard Ali,2025-01-05,N/A,pending\n" +
            "Tower C,105,Emily Chen,UPS,Security Guard Hassan,2024-12-29,2024-12-30,delivered\n";
          const blob = new Blob([csvContent], { type: "text/csv" });
          resolve({
            success: true,
            data: blob as any,
            message: "Parcels exported to CSV successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    return this.get<ApiResponse<Blob>>("/api/admin/parcels/export", params);
  }

  /**
   * Get portfolio-wide parcel statistics (Admin view)
   * @param period - Time period (day, week, month)
   */
  async getPortfolioParcelStats(
    period: "day" | "week" | "month" = "month",
  ): Promise<
    ApiResponse<{
      total: number;
      pending: number;
      pickedUp: number;
      delivered: number;
      lost: number;
      byBuilding: { buildingId: string; buildingName: string; count: number }[];
      byCourier: { courier: string; count: number }[];
      averagePickupTime: number; // in hours
    }>
  > {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const stats = {
            total: 284,
            pending: 52,
            pickedUp: 198,
            delivered: 28,
            lost: 6,
            byBuilding: [
              { buildingId: "building-1", buildingName: "Tower A", count: 108 },
              { buildingId: "building-2", buildingName: "Tower B", count: 94 },
              { buildingId: "building-3", buildingName: "Tower C", count: 82 },
            ],
            byCourier: [
              { courier: "FedEx", count: 78 },
              { courier: "DHL", count: 65 },
              { courier: "Aramex", count: 59 },
              { courier: "UPS", count: 48 },
              { courier: "Other", count: 34 },
            ],
            averagePickupTime: 18.5,
          };
          resolve({
            success: true,
            data: stats,
            message: "Portfolio parcel stats fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    return this.get<
      ApiResponse<{
        total: number;
        pending: number;
        pickedUp: number;
        delivered: number;
        lost: number;
        byBuilding: { buildingId: string; buildingName: string; count: number }[];
        byCourier: { courier: string; count: number }[];
        averagePickupTime: number;
      }>
    >(`/api/admin/parcels/stats?period=${period}`);
  }

  /**
   * Bulk import parcels from CSV (Admin portfolio view)
   * @param parcels - Array of parcel data
   */
  async bulkImportParcelsPortfolio(
    parcels: CreateParcelDTO[],
  ): Promise<ApiResponse<{ imported: number; failed: number; errors?: string[] }>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: {
              imported: parcels.length,
              failed: 0,
            },
            message: `Successfully imported ${parcels.length} parcels (mock)`,
          });
        }, MOCK_DELAY * 2);
      });
    }

    return this.post<ApiResponse<{ imported: number; failed: number; errors?: string[] }>>(
      "/api/admin/parcels/bulk-import",
      { parcels }
    );
  }

  /**
   * Send notifications to tenants about pending parcels
   * @param buildingId - Optional building ID to filter
   */
  async notifyTenantsAboutParcels(
    buildingId?: string,
  ): Promise<ApiResponse<{ notificationsSent: number }>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: { notificationsSent: buildingId ? 15 : 52 },
            message: "Tenant notifications sent successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    return this.post<ApiResponse<{ notificationsSent: number }>>(
      "/api/admin/parcels/notify-tenants",
      { buildingId }
    );
  }
}
