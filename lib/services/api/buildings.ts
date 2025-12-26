// Buildings API service

import { BaseApiService } from "./base";
import type { ApiResponse } from "../../types";

interface Building {
  id: number;
  name: string;
  address: string;
  city: string;
  unintsCount: number;
  isActive: boolean;
  createdAt: string;
}

export class BuildingsApiService extends BaseApiService {
  /**
   * Get building by ID
   * GET /Buildings/get/{buildingId}
   * @param buildingId - The ID of the building
   */
  async getBuildingById(buildingId: number | string): Promise<ApiResponse<Building>> {
    try {
      const buildingIdNum = typeof buildingId === 'string'
        ? parseInt(buildingId.replace(/\D/g, ''), 10)
        : buildingId;

      console.log('[BuildingsApi] Fetching building by ID:', buildingIdNum);
      const response = await this.get<ApiResponse<Building>>(`/Buildings/get/${buildingIdNum}`);
      console.log('[BuildingsApi] Building fetched:', response.data);
      return response;
    } catch (error) {
      console.error('[BuildingsApi] Failed to fetch building:', error);
      throw error;
    }
  }

  /**
   * Get all buildings
   * GET /Buildings/list
   */
  async getAllBuildings(): Promise<ApiResponse<Building[]>> {
    try {
      console.log('[BuildingsApi] Fetching all buildings');
      const response = await this.get<ApiResponse<Building[]>>('/Buildings/list');
      console.log('[BuildingsApi] Buildings fetched:', response.data?.length || 0);
      return response;
    } catch (error) {
      console.error('[BuildingsApi] Failed to fetch buildings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const buildingsApi = new BuildingsApiService();
