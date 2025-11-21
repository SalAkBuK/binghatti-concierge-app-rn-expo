// Visitors API service (Portfolio-wide admin view)

import { BaseApiService } from "./base";
import type {
  Visitor,
  VisitorLog,
  VisitorPass,
  CreateVisitorPassDTO,
  ApiResponse,
} from "../../types";

// Mock mode flag - set to false when backend is ready
const USE_MOCK = true;

// Mock delay to simulate network requests
const MOCK_DELAY = 500;

// Mock data generator
const generateMockVisitors = (): Visitor[] => {
  const now = Date.now();
  return [
    {
      id: "vis-1",
      tenantId: "tenant-1",
      buildingId: "building-1",
      unitNumber: "101",
      visitorName: "Michael Johnson",
      visitorPhone: "+971501234567",
      visitorIdType: "passport",
      visitorIdNumber: "AB123456",
      idPhotoUrl: "https://example.com/id-photo-1.jpg",
      visitPurpose: "Family Visit",
      expectedArrivalTime: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
      expectedDepartureTime: new Date(now + 8 * 60 * 60 * 1000).toISOString(),
      status: "expected",
      visitorCode: "VIS-101-001",
      qrCodeUrl: "https://example.com/qr-vis-1.png",
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "vis-2",
      tenantId: "tenant-2",
      buildingId: "building-1",
      unitNumber: "205",
      visitorName: "Sarah Williams",
      visitorPhone: "+971509876543",
      visitorIdType: "national_id",
      visitorIdNumber: "784-1990-1234567-8",
      visitPurpose: "Business Meeting",
      expectedArrivalTime: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      expectedDepartureTime: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      actualArrivalTime: new Date(now - 30 * 60 * 1000).toISOString(),
      status: "arrived",
      visitorCode: "VIS-205-002",
      qrCodeUrl: "https://example.com/qr-vis-2.png",
      checkedInBy: "security-1",
      createdAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 30 * 60 * 1000).toISOString(),
    },
    {
      id: "vis-3",
      tenantId: "tenant-3",
      buildingId: "building-2",
      unitNumber: "302",
      visitorName: "Ahmed Al Mansoori",
      visitorPhone: "+971502345678",
      visitorIdType: "driving_license",
      visitorIdNumber: "DL-123456",
      visitPurpose: "Delivery",
      expectedArrivalTime: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      expectedDepartureTime: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
      actualArrivalTime: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      actualDepartureTime: new Date(now - 3.5 * 60 * 60 * 1000).toISOString(),
      status: "departed",
      visitorCode: "VIS-302-003",
      qrCodeUrl: "https://example.com/qr-vis-3.png",
      checkedInBy: "security-2",
      checkedOutBy: "security-2",
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 3.5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "vis-4",
      tenantId: "tenant-4",
      buildingId: "building-3",
      unitNumber: "105",
      visitorName: "Emily Chen",
      visitorPhone: "+971508765432",
      visitorIdType: "passport",
      visitorIdNumber: "CD789012",
      visitPurpose: "Social Visit",
      expectedArrivalTime: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      expectedDepartureTime: new Date(now + 28 * 60 * 60 * 1000).toISOString(),
      status: "expected",
      visitorCode: "VIS-105-004",
      qrCodeUrl: "https://example.com/qr-vis-4.png",
      createdAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

const generateMockVisitorLogs = (): VisitorLog[] => {
  const now = Date.now();
  return [
    {
      id: "vlog-1",
      buildingId: "building-1",
      tenantId: "tenant-1",
      unitNumber: "101",
      type: "visitor",
      name: "Michael Johnson",
      expectedArrival: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
      status: "expected",
    },
    {
      id: "vlog-2",
      buildingId: "building-1",
      tenantId: "tenant-2",
      unitNumber: "205",
      type: "visitor",
      name: "Sarah Williams",
      expectedArrival: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      checkInTime: new Date(now - 30 * 60 * 1000).toISOString(),
      status: "checked_in",
    },
  ];
};

/**
 * Visitors API Service (Portfolio-wide Admin View)
 * Handles visitor management across all buildings
 *
 * Currently using mock data with simulated delays.
 * Set USE_MOCK to false when backend is ready.
 */
export class VisitorsApiService extends BaseApiService {
  // Portfolio-wide visitors (Admin view)
  async getAllVisitors(
    buildingId?: string,
    status?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<Visitor[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let visitors = generateMockVisitors();

          if (buildingId) {
            visitors = visitors.filter(v => v.buildingId === buildingId);
          }
          if (status) {
            visitors = visitors.filter(v => v.status === status);
          }
          if (startDate) {
            visitors = visitors.filter(v => new Date(v.expectedArrivalTime) >= new Date(startDate));
          }
          if (endDate) {
            visitors = visitors.filter(v => new Date(v.expectedArrivalTime) <= new Date(endDate));
          }

          resolve({
            success: true,
            data: visitors,
            message: "Visitors fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const params = new URLSearchParams();
      if (buildingId) params.append("buildingId", buildingId);
      if (status) params.append("status", status);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `/api/admin/visitors${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await this.get<ApiResponse<Visitor[]>>(url);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getVisitorById(id: string): Promise<ApiResponse<Visitor>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const visitor = generateMockVisitors().find(v => v.id === id);
          resolve({
            success: true,
            data: visitor,
            message: "Visitor fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<Visitor>>(`/api/admin/visitors/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async checkInVisitor(id: string, checkedInBy: string): Promise<ApiResponse<Visitor>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const existing = generateMockVisitors().find(v => v.id === id);
          const checkedIn: Visitor = {
            ...existing!,
            status: "arrived",
            actualArrivalTime: new Date().toISOString(),
            checkedInBy,
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: checkedIn,
            message: "Visitor checked in successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<Visitor>>(
        `/api/admin/visitors/${id}/check-in`,
        { checkedInBy }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async checkOutVisitor(id: string, checkedOutBy: string): Promise<ApiResponse<Visitor>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const existing = generateMockVisitors().find(v => v.id === id);
          const checkedOut: Visitor = {
            ...existing!,
            status: "departed",
            actualDepartureTime: new Date().toISOString(),
            checkedOutBy,
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: checkedOut,
            message: "Visitor checked out successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<Visitor>>(
        `/api/admin/visitors/${id}/check-out`,
        { checkedOutBy }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async cancelVisitor(id: string, reason?: string): Promise<ApiResponse<Visitor>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const existing = generateMockVisitors().find(v => v.id === id);
          const cancelled: Visitor = {
            ...existing!,
            status: "cancelled",
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: cancelled,
            message: "Visitor cancelled successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<Visitor>>(
        `/api/admin/visitors/${id}/cancel`,
        { reason }
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async exportVisitorsToCSV(
    buildingId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<Blob>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const csvContent = "Building,Unit,Visitor Name,Phone,ID Type,Purpose,Arrival,Departure,Status\n" +
            "Tower A,101,Michael Johnson,+971501234567,passport,Family Visit,2025-01-05 15:00,2025-01-05 20:00,expected\n" +
            "Tower A,205,Sarah Williams,+971509876543,national_id,Business Meeting,2025-01-05 11:00,2025-01-05 14:00,arrived\n" +
            "Tower B,302,Ahmed Al Mansoori,+971502345678,driving_license,Delivery,2025-01-05 08:00,2025-01-05 09:00,departed\n";
          const blob = new Blob([csvContent], { type: "text/csv" });
          resolve({
            success: true,
            data: blob as any,
            message: "Visitors exported to CSV successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const params = new URLSearchParams();
      if (buildingId) params.append("buildingId", buildingId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `/api/admin/visitors/export${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await this.get<ApiResponse<Blob>>(url);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getVisitorStats(period: "today" | "week" | "month" = "today"): Promise<
    ApiResponse<{
      total: number;
      expected: number;
      arrived: number;
      departed: number;
      cancelled: number;
      byBuilding: { buildingId: string; buildingName: string; count: number }[];
      byPurpose: { purpose: string; count: number }[];
    }>
  > {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const stats = {
            total: 145,
            expected: 42,
            arrived: 28,
            departed: 71,
            cancelled: 4,
            byBuilding: [
              { buildingId: "building-1", buildingName: "Tower A", count: 58 },
              { buildingId: "building-2", buildingName: "Tower B", count: 47 },
              { buildingId: "building-3", buildingName: "Tower C", count: 40 },
            ],
            byPurpose: [
              { purpose: "Family Visit", count: 45 },
              { purpose: "Business Meeting", count: 32 },
              { purpose: "Delivery", count: 38 },
              { purpose: "Social Visit", count: 18 },
              { purpose: "Other", count: 12 },
            ],
          };
          resolve({
            success: true,
            data: stats,
            message: "Visitor stats fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<
        ApiResponse<{
          total: number;
          expected: number;
          arrived: number;
          departed: number;
          cancelled: number;
          byBuilding: { buildingId: string; buildingName: string; count: number }[];
          byPurpose: { purpose: string; count: number }[];
        }>
      >(`/api/admin/visitors/stats?period=${period}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Create visitor (Management can create for any unit)
  async createVisitor(data: {
    buildingId: string;
    unitNumber: string;
    visitorName: string;
    visitorPhone: string;
    visitorIdType: string;
    visitorIdNumber: string;
    visitPurpose: string;
    expectedArrivalTime: string;
    expectedDepartureTime: string;
    idPhotoUrl?: string;
  }): Promise<ApiResponse<Visitor>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const now = Date.now();
          const visitorCode = `VIS-${data.unitNumber}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
          const newVisitor: Visitor = {
            id: `vis-${Date.now()}`,
            tenantId: `tenant-${data.unitNumber}`,
            buildingId: data.buildingId,
            unitNumber: data.unitNumber,
            visitorName: data.visitorName,
            visitorPhone: data.visitorPhone,
            visitorIdType: data.visitorIdType as any,
            visitorIdNumber: data.visitorIdNumber,
            idPhotoUrl: data.idPhotoUrl,
            visitPurpose: data.visitPurpose,
            expectedArrivalTime: data.expectedArrivalTime,
            expectedDepartureTime: data.expectedDepartureTime,
            status: "expected",
            visitorCode,
            qrCodeUrl: `https://example.com/qr-${visitorCode}.png`,
            createdAt: new Date(now).toISOString(),
            updatedAt: new Date(now).toISOString(),
          };
          resolve({
            success: true,
            data: newVisitor,
            message: "Visitor created successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<Visitor>>(
        "/api/admin/visitors",
        data
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Visitor Logs
  async getVisitorLogs(
    buildingId?: string,
    unitNumber?: string,
    type?: string
  ): Promise<ApiResponse<VisitorLog[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let logs = generateMockVisitorLogs();
          if (buildingId) {
            logs = logs.filter(l => l.buildingId === buildingId);
          }
          if (unitNumber) {
            logs = logs.filter(l => l.unitNumber === unitNumber);
          }
          if (type) {
            logs = logs.filter(l => l.type === type);
          }
          resolve({
            success: true,
            data: logs,
            message: "Visitor logs fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const params = new URLSearchParams();
      if (buildingId) params.append("buildingId", buildingId);
      if (unitNumber) params.append("unitNumber", unitNumber);
      if (type) params.append("type", type);

      const url = `/api/admin/visitors/logs${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await this.get<ApiResponse<VisitorLog[]>>(url);
      return response;
    } catch (error) {
      throw error;
    }
  }
}
