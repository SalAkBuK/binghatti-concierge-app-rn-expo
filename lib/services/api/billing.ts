// Billing API service

import { BaseApiService } from "./base";
import type {
  MeterReading,
  BillSummary,
  CreateMeterReadingDTO,
  UpdateMeterReadingDTO,
  VerifyMeterReadingDTO,
  ApiResponse,
} from "../../types";

// Mock mode flag - set to false when backend is ready
const USE_MOCK = true;

// Mock delay to simulate network requests
const MOCK_DELAY = 500;

// Mock data generator
const generateMockMeterReadings = (): MeterReading[] => {
  return [
    {
      id: "mr-1",
      buildingId: "building-1",
      buildingName: "Tower A",
      unitNumber: "101",
      tenantId: "tenant-1",
      tenantName: "John Doe",
      meterType: "gas",
      currentReading: 1523.5,
      previousReading: 1480.2,
      consumption: 43.3,
      unit: "m³",
      readingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      submittedBy: "tenant-1",
      submittedByName: "John Doe",
      photoUrl: "https://example.com/meter-photo-1.jpg",
      status: "pending",
      notes: "Monthly gas meter reading",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "mr-2",
      buildingId: "building-1",
      buildingName: "Tower A",
      unitNumber: "102",
      tenantId: "tenant-2",
      tenantName: "Jane Smith",
      meterType: "gas",
      currentReading: 2150.8,
      previousReading: 2100.5,
      consumption: 50.3,
      unit: "m³",
      readingDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      submittedBy: "tenant-2",
      submittedByName: "Jane Smith",
      photoUrl: "https://example.com/meter-photo-2.jpg",
      status: "verified",
      verifiedBy: "admin-1",
      verifiedByName: "Admin User",
      verifiedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "mr-3",
      buildingId: "building-2",
      buildingName: "Tower B",
      unitNumber: "203",
      tenantId: "tenant-5",
      tenantName: "Omar Al Falasi",
      meterType: "water",
      currentReading: 890.2,
      previousReading: 860.4,
      consumption: 29.8,
      unit: "m³",
      readingDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      submittedBy: "tenant-5",
      submittedByName: "Omar Al Falasi",
      photoUrl: "https://example.com/meter-photo-3.jpg",
      status: "pending",
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "mr-4",
      buildingId: "building-3",
      buildingName: "Tower C",
      unitNumber: "PH-01",
      tenantId: "tenant-6",
      tenantName: "Noor Al Mansoori",
      meterType: "electricity",
      currentReading: 5120.4,
      previousReading: 5010.1,
      consumption: 110.3,
      unit: "kWh",
      readingDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      submittedBy: "tenant-6",
      submittedByName: "Noor Al Mansoori",
      photoUrl: "https://example.com/meter-photo-4.jpg",
      status: "pending",
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

const generateMockBills = (): BillSummary[] => {
  return [
    {
      id: "bill-1",
      buildingId: "building-1",
      buildingName: "Tower A",
      unitNumber: "101",
      tenantId: "tenant-1",
      tenantName: "John Doe",
      billingPeriod: "2025-01",
      billingPeriodStart: new Date("2025-01-01").toISOString(),
      billingPeriodEnd: new Date("2025-01-31").toISOString(),
      rentAmount: 3500,
      gasCharges: 125.50,
      waterCharges: 80.00,
      electricityCharges: 220.75,
      maintenanceCharges: 150,
      otherCharges: 50,
      totalAmount: 4126.25,
      paidAmount: 0,
      balanceAmount: 4126.25,
      dueDate: new Date("2025-02-05").toISOString(),
      status: "pending",
      meterReadings: ["mr-1"],
      createdAt: new Date("2025-01-01").toISOString(),
      updatedAt: new Date("2025-01-01").toISOString(),
    },
    {
      id: "bill-2",
      buildingId: "building-1",
      buildingName: "Tower A",
      unitNumber: "102",
      tenantId: "tenant-2",
      tenantName: "Jane Smith",
      billingPeriod: "2025-01",
      billingPeriodStart: new Date("2025-01-01").toISOString(),
      billingPeriodEnd: new Date("2025-01-31").toISOString(),
      rentAmount: 4000,
      gasCharges: 145.80,
      waterCharges: 95.00,
      electricityCharges: 280.50,
      maintenanceCharges: 150,
      otherCharges: 0,
      totalAmount: 4671.30,
      paidAmount: 4671.30,
      balanceAmount: 0,
      dueDate: new Date("2025-02-05").toISOString(),
      paidDate: new Date("2025-01-28").toISOString(),
      status: "paid",
      paymentMethod: "Bank Transfer",
      transactionId: "TXN-20250128-001",
      meterReadings: ["mr-2"],
      createdAt: new Date("2025-01-01").toISOString(),
      updatedAt: new Date("2025-01-28").toISOString(),
    },
    {
      id: "bill-3",
      buildingId: "building-2",
      buildingName: "Tower B",
      unitNumber: "203",
      tenantId: "tenant-5",
      tenantName: "Omar Al Falasi",
      billingPeriod: "2025-01",
      billingPeriodStart: new Date("2025-01-01").toISOString(),
      billingPeriodEnd: new Date("2025-01-31").toISOString(),
      rentAmount: 5200,
      gasCharges: 0,
      waterCharges: 65,
      electricityCharges: 350,
      maintenanceCharges: 200,
      otherCharges: 0,
      totalAmount: 5815,
      paidAmount: 3000,
      balanceAmount: 2815,
      dueDate: new Date("2025-02-10").toISOString(),
      status: "partial",
      meterReadings: ["mr-3"],
      createdAt: new Date("2025-01-02").toISOString(),
      updatedAt: new Date("2025-01-20").toISOString(),
    },
    {
      id: "bill-4",
      buildingId: "building-3",
      buildingName: "Tower C",
      unitNumber: "PH-01",
      tenantId: "tenant-6",
      tenantName: "Noor Al Mansoori",
      billingPeriod: "2025-01",
      billingPeriodStart: new Date("2025-01-01").toISOString(),
      billingPeriodEnd: new Date("2025-01-31").toISOString(),
      rentAmount: 9500,
      gasCharges: 0,
      waterCharges: 120,
      electricityCharges: 480,
      maintenanceCharges: 300,
      otherCharges: 150,
      totalAmount: 10550,
      paidAmount: 0,
      balanceAmount: 10550,
      dueDate: new Date("2025-02-05").toISOString(),
      status: "overdue",
      meterReadings: ["mr-4"],
      createdAt: new Date("2025-01-01").toISOString(),
      updatedAt: new Date("2025-02-08").toISOString(),
    },
  ];
};

/**
 * Billing API Service
 * Handles billing and meter reading operations
 *
 * Currently using mock data with simulated delays.
 * Set USE_MOCK to false when backend is ready.
 */
export class BillingApiService extends BaseApiService {
  // Meter Readings
  async getMeterReadings(buildingId?: string, status?: string): Promise<ApiResponse<MeterReading[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let readings = generateMockMeterReadings();
          if (buildingId) {
            readings = readings.filter(r => r.buildingId === buildingId);
          }
          if (status) {
            readings = readings.filter(r => r.status === status);
          }
          resolve({
            success: true,
            data: readings,
            message: "Meter readings fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const params = new URLSearchParams();
      if (buildingId) params.append("buildingId", buildingId);
      if (status) params.append("status", status);

      const url = `/api/admin/billing/meter-readings${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await this.get<ApiResponse<MeterReading[]>>(url);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getMeterReadingById(id: string): Promise<ApiResponse<MeterReading>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const reading = generateMockMeterReadings().find(r => r.id === id);
          resolve({
            success: true,
            data: reading,
            message: "Meter reading fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<MeterReading>>(`/api/admin/billing/meter-readings/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createMeterReading(data: CreateMeterReadingDTO): Promise<ApiResponse<MeterReading>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const newReading: MeterReading = {
            id: `mr-${Date.now()}`,
            ...data,
            buildingName: "Tower A",
            tenantName: "New Tenant",
            consumption: data.previousReading ? data.currentReading - data.previousReading : undefined,
            status: "pending",
            submittedByName: "Tenant",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: newReading,
            message: "Meter reading created successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<MeterReading>>("/api/admin/billing/meter-readings", data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateMeterReading(id: string, data: UpdateMeterReadingDTO): Promise<ApiResponse<MeterReading>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const existing = generateMockMeterReadings().find(r => r.id === id);
          const updated: MeterReading = {
            ...existing!,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: updated,
            message: "Meter reading updated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<MeterReading>>(`/api/admin/billing/meter-readings/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async verifyMeterReading(data: VerifyMeterReadingDTO): Promise<ApiResponse<MeterReading>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const existing = generateMockMeterReadings().find(r => r.id === data.readingId);
          const verified: MeterReading = {
            ...existing!,
            status: data.status,
            verifiedBy: data.verifiedBy,
            verifiedByName: data.verifiedByName,
            verifiedAt: new Date().toISOString(),
            rejectionReason: data.rejectionReason,
            notes: data.notes || existing!.notes,
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: verified,
            message: `Meter reading ${data.status} successfully (mock)`,
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<MeterReading>>(
        `/api/admin/billing/meter-readings/${data.readingId}/verify`,
        data
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteMeterReading(id: string): Promise<ApiResponse<void>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "Meter reading deleted successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.delete<ApiResponse<void>>(`/api/admin/billing/meter-readings/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Bills Management
  async getBills(buildingId?: string, status?: string, period?: string): Promise<ApiResponse<BillSummary[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let bills = generateMockBills();
          if (buildingId) {
            bills = bills.filter(b => b.buildingId === buildingId);
          }
          if (status) {
            bills = bills.filter(b => b.status === status);
          }
          if (period) {
            bills = bills.filter(b => b.billingPeriod === period);
          }
          resolve({
            success: true,
            data: bills,
            message: "Bills fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const params = new URLSearchParams();
      if (buildingId) params.append("buildingId", buildingId);
      if (status) params.append("status", status);
      if (period) params.append("period", period);

      const url = `/api/admin/billing/bills${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await this.get<ApiResponse<BillSummary[]>>(url);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getBillById(id: string): Promise<ApiResponse<BillSummary>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const bill = generateMockBills().find(b => b.id === id);
          resolve({
            success: true,
            data: bill,
            message: "Bill fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<BillSummary>>(`/api/admin/billing/bills/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async exportBillsToCSV(buildingId?: string, period?: string): Promise<ApiResponse<Blob>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const csvContent = "Building,Unit,Tenant,Period,Rent,Gas,Water,Electricity,Total,Status\n" +
            "Tower A,101,John Doe,2025-01,3500,125.50,80.00,220.75,4126.25,pending\n" +
            "Tower A,102,Jane Smith,2025-01,4000,145.80,95.00,280.50,4671.30,paid\n";
          const blob = new Blob([csvContent], { type: "text/csv" });
          resolve({
            success: true,
            data: blob as any,
            message: "Bills exported to CSV successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const params = new URLSearchParams();
      if (buildingId) params.append("buildingId", buildingId);
      if (period) params.append("period", period);

      const url = `/api/admin/billing/bills/export${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await this.get<ApiResponse<Blob>>(url);
      return response;
    } catch (error) {
      throw error;
    }
  }
}
