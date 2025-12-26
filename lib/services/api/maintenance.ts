// Maintenance Requests API service

import { BaseApiService } from "./base";
import type { ApiResponse } from "../../types";

export class MaintenanceApiService extends BaseApiService {
  /**
   * Create a maintenance request
   * POST /MaintenanceRequest/create
   */
  async createMaintenanceRequest(requestData: {
    buildingId: number;
    createdById: number;
    title: string;
    description: string;
    priority: number;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('[MaintenanceApi] Creating maintenance request:', requestData);
      const response = await this.post<ApiResponse<any>>(
        '/MaintenanceRequest/create',
        requestData
      );
      console.log('[MaintenanceApi] Maintenance request created:', response.data);
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to create maintenance request:', error);
      throw error;
    }
  }

  /**
   * Get maintenance requests by tenant ID
   * GET /MaintenanceRequest/createdby/{tenantId}
   */
  async getMaintenanceRequestsByTenantId(tenantId: number | string): Promise<ApiResponse<any[]>> {
    try {
      const tenantIdNum = typeof tenantId === 'string'
        ? parseInt(tenantId.replace(/\D/g, ''), 10)
        : tenantId;

      console.log('[MaintenanceApi] Fetching maintenance requests for tenant:', tenantIdNum);
      const response = await this.get<ApiResponse<any[]>>(`/MaintenanceRequest/createdby/${tenantIdNum}`);
      console.log('[MaintenanceApi] Maintenance requests fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to fetch maintenance requests:', error);
      throw error;
    }
  }

  /**
   * Get a maintenance request by ID
   * GET /MaintenanceRequest/get/{id}
   */
  async getMaintenanceRequestById(requestId: number | string): Promise<ApiResponse<any>> {
    try {
      const requestIdNum = typeof requestId === 'string'
        ? parseInt(requestId.replace(/\D/g, ''), 10)
        : requestId;

      console.log('[MaintenanceApi] Fetching maintenance request:', requestIdNum);
      const response = await this.get<ApiResponse<any>>(`/MaintenanceRequest/get/${requestIdNum}`);
      console.log('[MaintenanceApi] Maintenance request fetched');
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to fetch maintenance request:', error);
      throw error;
    }
  }

  /**
   * Add attachment to a maintenance request
   * POST /MaintenanceRequest/attachment
   */
  async addMaintenanceRequestAttachment(attachmentData: {
    requestId: number;
    uploadedById: number;
    fileUrl: string;
    fileName: string;
    contentType: string;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('[MaintenanceApi] Adding attachment to request:', attachmentData.requestId);
      const response = await this.post<ApiResponse<any>>(
        '/MaintenanceRequest/attachment',
        attachmentData
      );
      console.log('[MaintenanceApi] Attachment added successfully');
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to add attachment:', error);
      throw error;
    }
  }

  /**
   * Delete a maintenance request
   * DELETE /Maintenance/delete/{id}
   */
  async deleteMaintenanceRequest(requestId: number | string): Promise<ApiResponse<any>> {
    try {
      const requestIdNum = typeof requestId === 'string'
        ? parseInt(requestId.replace(/\D/g, ''), 10)
        : requestId;

      console.log('[MaintenanceApi] Deleting maintenance request:', requestIdNum);
      const response = await this.delete<ApiResponse<any>>(`/Maintenance/delete/${requestIdNum}`);
      console.log('[MaintenanceApi] Maintenance request deleted successfully');
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to delete maintenance request:', error);
      throw error;
    }
  }

  /**
   * Get maintenance requests by building ID
   * GET /MaintenanceRequest/building/{buildingId}
   * @param buildingId - The ID of the building
   */
  async getMaintenanceRequestsByBuildingId(buildingId: number | string): Promise<ApiResponse<any[]>> {
    try {
      const buildingIdNum = typeof buildingId === 'string'
        ? parseInt(buildingId.replace(/\D/g, ''), 10)
        : buildingId;

      console.log('[MaintenanceApi] Fetching maintenance requests for building:', buildingIdNum);
      const response = await this.get<ApiResponse<any[]>>(`/MaintenanceRequest/building/${buildingIdNum}`);
      console.log('[MaintenanceApi] Maintenance requests fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to fetch maintenance requests for building:', error);
      throw error;
    }
  }

  /**
   * Create a maintenance staff member
   * POST /MaintenanceStaff/create
   */
  async createMaintenanceStaff(staffData: {
    fullName: string;
    email: string;
    password: string;
    phoneNumber: string;
    address: string;
    nationality: string;
  }): Promise<ApiResponse<{ id: number; fullName: string; email: string }>> {
    try {
      console.log('[MaintenanceApi] Creating maintenance staff:', staffData.fullName);
      const response = await this.post<ApiResponse<{ id: number; fullName: string; email: string }>>(
        '/MaintenanceStaff/create',
        staffData
      );
      console.log('[MaintenanceApi] Maintenance staff created:', response.data);
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to create maintenance staff:', error);
      throw error;
    }
  }

  /**
   * Assign maintenance staff to a building
   * POST /BuildingMaintenanceStaff/assign
   */
  async assignMaintenanceStaffToBuilding(assignmentData: {
    buildingId: number;
    staffId: number;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('[MaintenanceApi] Assigning staff to building:', assignmentData);
      const response = await this.post<ApiResponse<any>>(
        '/BuildingMaintenanceStaff/assign',
        assignmentData
      );
      console.log('[MaintenanceApi] Staff assigned to building successfully');
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to assign staff to building:', error);
      throw error;
    }
  }

  /**
   * Get maintenance staff assigned to a building
   * GET /BuildingMaintenanceStaff/building/{buildingId}
   */
  async getMaintenanceStaffByBuilding(buildingId: number | string): Promise<ApiResponse<Array<{
    id: number;
    fullName: string;
    email: string;
    phoneNumber: string;
    isActive: boolean;
  }>>> {
    try {
      const buildingIdNum = typeof buildingId === 'string'
        ? parseInt(buildingId.replace(/\D/g, ''), 10)
        : buildingId;

      console.log('[MaintenanceApi] Fetching maintenance staff for building:', buildingIdNum);
      const response = await this.get<ApiResponse<Array<{
        id: number;
        fullName: string;
        email: string;
        phoneNumber: string;
        isActive: boolean;
      }>>>(`/BuildingMaintenanceStaff/building/${buildingIdNum}`);
      console.log('[MaintenanceApi] Maintenance staff fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to fetch maintenance staff for building:', error);
      throw error;
    }
  }

  /**
   * Get service providers assigned to a building
   * GET /BuildingServiceProvider/building/{buildingId}
   */
  async getServiceProvidersByBuilding(buildingId: number | string): Promise<ApiResponse<Array<{
    id: number;
    fullName: string;
    email: string;
    phoneNumber: string;
    isActive: boolean;
  }>>> {
    try {
      const buildingIdNum = typeof buildingId === 'string'
        ? parseInt(buildingId.replace(/\D/g, ''), 10)
        : buildingId;

      console.log('[MaintenanceApi] Fetching service providers for building:', buildingIdNum);
      const response = await this.get<ApiResponse<Array<{
        id: number;
        fullName: string;
        email: string;
        phoneNumber: string;
        isActive: boolean;
      }>>>(`/BuildingServiceProvider/building/${buildingIdNum}`);
      console.log('[MaintenanceApi] Service providers fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to fetch service providers for building:', error);
      throw error;
    }
  }

  /**
   * Get buildings assigned to a service provider
   * GET /BuildingServiceProvider/provider/{providerId}
   */
  async getBuildingsByServiceProvider(providerId: number | string): Promise<ApiResponse<Array<{
    id: number;
    name: string;
    address: string;
    city: string;
    unintsCount: number;
    isActive: boolean;
  }>>> {
    try {
      const providerIdNum = typeof providerId === 'string'
        ? parseInt(providerId.replace(/\D/g, ''), 10)
        : providerId;

      console.log('[MaintenanceApi] Fetching buildings for service provider:', providerIdNum);
      const response = await this.get<ApiResponse<Array<{
        id: number;
        name: string;
        address: string;
        city: string;
        unintsCount: number;
        isActive: boolean;
      }>>>(`/BuildingServiceProvider/provider/${providerIdNum}`);
      console.log('[MaintenanceApi] Buildings fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to fetch buildings for service provider:', error);
      throw error;
    }
  }

  /**
   * Assign maintenance request to a worker
   * POST /MaintenanceRequest/assign
   */
  async assignMaintenanceRequest(assignmentData: {
    requestId: number;
    assignedToId: number;
    assignedById: number;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('[MaintenanceApi] Assigning maintenance request:', assignmentData);
      const response = await this.post<ApiResponse<any>>(
        '/MaintenanceRequest/assign',
        assignmentData
      );
      console.log('[MaintenanceApi] Maintenance request assigned successfully');
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to assign maintenance request:', error);
      throw error;
    }
  }

  /**
   * Get buildings assigned to a maintenance staff member
   * GET /BuildingMaintenanceStaff/staff/{staffId}
   */
  async getBuildingsByStaffId(staffId: number | string): Promise<ApiResponse<Array<{
    id: number;
    name: string;
    address?: string;
  }>>> {
    try {
      const staffIdNum = typeof staffId === 'string'
        ? parseInt(staffId.replace(/\D/g, ''), 10)
        : staffId;

      console.log('[MaintenanceApi] Fetching buildings for staff:', staffIdNum);
      const response = await this.get<ApiResponse<Array<{
        id: number;
        name: string;
        address?: string;
      }>>>(`/BuildingMaintenanceStaff/staff/${staffIdNum}`);
      console.log('[MaintenanceApi] Buildings fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to fetch buildings for staff:', error);
      throw error;
    }
  }

  /**
   * Get maintenance requests assigned to a maintenance staff member
   * GET /MaintenanceRequest/assignedto/{staffId}
   */
  async getMaintenanceRequestsByStaffId(staffId: number | string): Promise<ApiResponse<any[]>> {
    try {
      const staffIdNum = typeof staffId === 'string'
        ? parseInt(staffId.replace(/\D/g, ''), 10)
        : staffId;

      console.log('[MaintenanceApi] Fetching maintenance requests for staff:', staffIdNum);
      const response = await this.get<ApiResponse<any[]>>(`/MaintenanceRequest/assignedto/${staffIdNum}`);
      console.log('[MaintenanceApi] Maintenance requests fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to fetch maintenance requests for staff:', error);
      throw error;
    }
  }

  /**
   * Update maintenance request status
   * POST /MaintenanceRequest/status
   */
  async updateMaintenanceRequestStatus(payload: {
    requestId: number;
    newStatus: number;
    changedById: number;
    note?: string;
  }): Promise<ApiResponse<any>> {
    try {
      console.log("[MaintenanceApi] Updating maintenance request status:", payload);
      const response = await this.post<ApiResponse<any>>(
        "/MaintenanceRequest/status",
        payload
      );
      console.log("[MaintenanceApi] Maintenance request status updated");
      return response;
    } catch (error) {
      console.error("[MaintenanceApi] Failed to update maintenance request status:", error);
      throw error;
    }
  }

  /**
   * Add comment to a maintenance request
   * POST /MaintenanceRequest/comment
   */
  async addMaintenanceRequestComment(commentData: {
    requestId: number;
    userId: number;
    commentText: string;
  }): Promise<ApiResponse<any>> {
    try {
      console.log('[MaintenanceApi] Adding comment to request:', commentData.requestId);
      const response = await this.post<ApiResponse<any>>(
        '/MaintenanceRequest/comment',
        commentData
      );
      console.log('[MaintenanceApi] Comment added successfully');
      return response;
    } catch (error) {
      console.error('[MaintenanceApi] Failed to add comment:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const maintenanceApi = new MaintenanceApiService();
