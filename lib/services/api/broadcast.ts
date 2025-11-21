// Broadcast Notifications & Announcements API service

import { BaseApiService } from "./base";
import type {
  Announcement,
  AnnouncementDraft,
  AnnouncementTemplate,
  CreateAnnouncementDTO,
  UpdateAnnouncementDTO,
  ApiResponse,
} from "../../types";

// Mock mode flag - set to false when backend is ready
const USE_MOCK = true;

// Mock delay to simulate network requests
const MOCK_DELAY = 500;

// Mock data generators
const generateMockAnnouncements = (): Announcement[] => {
  const now = Date.now();
  return [
    {
      id: "ann-1",
      title: "Building Maintenance - Tower A",
      body: "Dear residents,\n\nWe will be conducting routine HVAC maintenance on all floors next Monday from 9 AM to 1 PM. Please expect temporary AC interruption during this period.\n\nThank you for your cooperation.",
      priority: "normal",
      targetType: "building",
      targetBuildingIds: ["building-1"],
      status: "sent",
      sentAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: "admin-1",
      createdByName: "Admin User",
      recipientCount: 120,
      readCount: 95,
      deliveryStats: {
        sent: 120,
        delivered: 118,
        failed: 2,
        read: 95,
      },
      createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ann-2",
      title: "Emergency - Water Supply Interruption",
      body: "URGENT: Due to an unexpected pipe burst, water supply will be temporarily shut off for Towers A & B. Our maintenance team is working to resolve this issue. Expected restoration time: 3 PM.",
      priority: "urgent",
      targetType: "building",
      targetBuildingIds: ["building-1", "building-2"],
      status: "sent",
      sentAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: "admin-1",
      createdByName: "Admin User",
      recipientCount: 245,
      readCount: 228,
      deliveryStats: {
        sent: 245,
        delivered: 243,
        failed: 2,
        read: 228,
      },
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ann-3",
      title: "Community Event - Holiday Celebration",
      body: "Join us for our annual holiday celebration on December 20th at the community hall! Food, music, and fun activities for all ages. RSVP by December 15th.",
      priority: "low",
      targetType: "all_tenants",
      scheduledFor: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: "scheduled",
      createdBy: "admin-1",
      createdByName: "Admin User",
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "ann-4",
      title: "Rent Payment Reminder",
      body: "This is a friendly reminder that rent for the current month is due by the 5th. Please ensure timely payment to avoid late fees. Thank you!",
      priority: "normal",
      targetType: "all_tenants",
      status: "draft",
      createdBy: "admin-1",
      createdByName: "Admin User",
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
    },
  ];
};

const generateMockTemplates = (): AnnouncementTemplate[] => {
  return [
    {
      id: "tmpl-1",
      name: "HVAC Maintenance Notice",
      category: "maintenance",
      title: "Scheduled HVAC Maintenance",
      body: "Dear residents,\n\nWe will be conducting routine HVAC maintenance on [DATE] from [START_TIME] to [END_TIME]. Please expect temporary AC interruption during this period.\n\nThank you for your cooperation.",
      priority: "normal",
      targetType: "building",
      usageCount: 15,
      createdBy: "admin-1",
      createdAt: new Date("2024-01-15").toISOString(),
      updatedAt: new Date("2024-01-15").toISOString(),
    },
    {
      id: "tmpl-2",
      name: "Emergency Water Shutoff",
      category: "emergency",
      title: "Emergency - Water Supply Interruption",
      body: "URGENT: Due to [REASON], water supply will be temporarily shut off for [BUILDINGS]. Our maintenance team is working to resolve this issue. Expected restoration time: [TIME].",
      priority: "urgent",
      targetType: "building",
      usageCount: 8,
      createdBy: "admin-1",
      createdAt: new Date("2024-01-20").toISOString(),
      updatedAt: new Date("2024-01-20").toISOString(),
    },
    {
      id: "tmpl-3",
      name: "Community Event Invitation",
      category: "event",
      title: "Community Event - [EVENT_NAME]",
      body: "Join us for [EVENT_NAME] on [DATE] at [LOCATION]! [EVENT_DETAILS]. RSVP by [RSVP_DATE].",
      priority: "low",
      targetType: "all_tenants",
      usageCount: 12,
      createdBy: "admin-1",
      createdAt: new Date("2024-02-01").toISOString(),
      updatedAt: new Date("2024-02-01").toISOString(),
    },
    {
      id: "tmpl-4",
      name: "Rent Payment Reminder",
      category: "general",
      title: "Rent Payment Reminder",
      body: "This is a friendly reminder that rent for the current month is due by the [DUE_DATE]. Please ensure timely payment to avoid late fees. Thank you!",
      priority: "normal",
      targetType: "all_tenants",
      usageCount: 24,
      createdBy: "admin-1",
      createdAt: new Date("2024-01-10").toISOString(),
      updatedAt: new Date("2024-01-10").toISOString(),
    },
  ];
};

/**
 * Broadcast Notifications & Announcements API Service
 * Handles creating and sending announcements to tenants
 *
 * Currently using mock data with simulated delays.
 * Set USE_MOCK to false when backend is ready.
 */
export class BroadcastApiService extends BaseApiService {
  // Announcements Management
  async getAnnouncements(status?: string, priority?: string): Promise<ApiResponse<Announcement[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let announcements = generateMockAnnouncements();
          if (status) {
            announcements = announcements.filter(a => a.status === status);
          }
          if (priority) {
            announcements = announcements.filter(a => a.priority === priority);
          }
          resolve({
            success: true,
            data: announcements,
            message: "Announcements fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (priority) params.append("priority", priority);

      const url = `/api/admin/broadcast/announcements${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await this.get<ApiResponse<Announcement[]>>(url);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getAnnouncementById(id: string): Promise<ApiResponse<Announcement>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const announcement = generateMockAnnouncements().find(a => a.id === id);
          resolve({
            success: true,
            data: announcement,
            message: "Announcement fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<Announcement>>(`/api/admin/broadcast/announcements/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async createAnnouncement(data: CreateAnnouncementDTO): Promise<ApiResponse<Announcement>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const newAnnouncement: Announcement = {
            id: `ann-${Date.now()}`,
            title: data.title,
            body: data.body,
            priority: data.priority,
            targetType: data.targetType,
            targetBuildingIds: data.targetBuildingIds,
            targetUnitNumbers: data.targetUnitNumbers,
            targetRoles: data.targetRoles,
            scheduledFor: data.scheduledFor,
            status: data.scheduledFor ? "scheduled" : "draft",
            templateId: data.templateId,
            attachments: data.attachments,
            createdBy: data.createdBy,
            createdByName: data.createdByName,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: newAnnouncement,
            message: "Announcement created successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<Announcement>>("/api/admin/broadcast/announcements", data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateAnnouncement(id: string, data: UpdateAnnouncementDTO): Promise<ApiResponse<Announcement>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const existing = generateMockAnnouncements().find(a => a.id === id);
          const updated: Announcement = {
            ...existing!,
            ...data,
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: updated,
            message: "Announcement updated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<Announcement>>(`/api/admin/broadcast/announcements/${id}`, data);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async sendAnnouncement(id: string): Promise<ApiResponse<{ recipientCount: number }>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: { recipientCount: 156 },
            message: "Announcement sent successfully to 156 recipients (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<{ recipientCount: number }>>(
        `/api/admin/broadcast/announcements/${id}/send`,
        {}
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async cancelScheduledAnnouncement(id: string): Promise<ApiResponse<Announcement>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const existing = generateMockAnnouncements().find(a => a.id === id);
          const cancelled: Announcement = {
            ...existing!,
            status: "cancelled",
            updatedAt: new Date().toISOString(),
          };
          resolve({
            success: true,
            data: cancelled,
            message: "Scheduled announcement cancelled successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.put<ApiResponse<Announcement>>(
        `/api/admin/broadcast/announcements/${id}/cancel`,
        {}
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteAnnouncement(id: string): Promise<ApiResponse<void>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "Announcement deleted successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.delete<ApiResponse<void>>(`/api/admin/broadcast/announcements/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Templates Management
  async getTemplates(category?: string): Promise<ApiResponse<AnnouncementTemplate[]>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let templates = generateMockTemplates();
          if (category) {
            templates = templates.filter(t => t.category === category);
          }
          resolve({
            success: true,
            data: templates,
            message: "Templates fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const params = new URLSearchParams();
      if (category) params.append("category", category);

      const url = `/api/admin/broadcast/templates${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await this.get<ApiResponse<AnnouncementTemplate[]>>(url);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getTemplateById(id: string): Promise<ApiResponse<AnnouncementTemplate>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const template = generateMockTemplates().find(t => t.id === id);
          resolve({
            success: true,
            data: template,
            message: "Template fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<AnnouncementTemplate>>(`/api/admin/broadcast/templates/${id}`);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async previewRecipients(announcementData: AnnouncementDraft): Promise<ApiResponse<{
    count: number;
    buildings: { buildingId: string; buildingName: string; recipientCount: number }[];
  }>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          let count = 0;
          let buildings: { buildingId: string; buildingName: string; recipientCount: number }[] = [];

          if (announcementData.targetType === "all_tenants") {
            count = 420;
            buildings = [
              { buildingId: "building-1", buildingName: "Tower A", recipientCount: 150 },
              { buildingId: "building-2", buildingName: "Tower B", recipientCount: 135 },
              { buildingId: "building-3", buildingName: "Tower C", recipientCount: 135 },
            ];
          } else if (announcementData.targetType === "building" && announcementData.targetBuildingIds) {
            count = announcementData.targetBuildingIds.length * 150;
            buildings = announcementData.targetBuildingIds.map(id => ({
              buildingId: id,
              buildingName: `Building ${id}`,
              recipientCount: 150,
            }));
          }

          resolve({
            success: true,
            data: { count, buildings },
            message: "Recipients preview generated successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.post<ApiResponse<{
        count: number;
        buildings: { buildingId: string; buildingName: string; recipientCount: number }[];
      }>>("/api/admin/broadcast/preview-recipients", announcementData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async getAnnouncementStats(): Promise<ApiResponse<{
    totalSent: number;
    totalScheduled: number;
    totalDrafts: number;
    averageReadRate: number;
    recentActivity: { date: string; sent: number }[];
  }>> {
    if (USE_MOCK) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const stats = {
            totalSent: 48,
            totalScheduled: 3,
            totalDrafts: 5,
            averageReadRate: 78.5,
            recentActivity: [
              { date: "2025-01-01", sent: 5 },
              { date: "2025-01-02", sent: 3 },
              { date: "2025-01-03", sent: 7 },
              { date: "2025-01-04", sent: 4 },
              { date: "2025-01-05", sent: 6 },
            ],
          };
          resolve({
            success: true,
            data: stats,
            message: "Announcement stats fetched successfully (mock)",
          });
        }, MOCK_DELAY);
      });
    }

    try {
      const response = await this.get<ApiResponse<{
        totalSent: number;
        totalScheduled: number;
        totalDrafts: number;
        averageReadRate: number;
        recentActivity: { date: string; sent: number }[];
      }>>("/api/admin/broadcast/stats");
      return response;
    } catch (error) {
      throw error;
    }
  }
}
