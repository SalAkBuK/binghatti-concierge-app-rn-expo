jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

import { AdminApiService } from "../admin";
import { MaintenanceApiService } from "../maintenance";

describe("API identifier preservation", () => {
  it("preserves raw string request ids for maintenance detail and delete endpoints", async () => {
    const service = new MaintenanceApiService();
    const getSpy = jest.spyOn(service as any, "get").mockResolvedValue({ success: true });
    const deleteSpy = jest
      .spyOn(service as any, "delete")
      .mockResolvedValue({ success: true });

    const requestId = "714514359449779000000";

    await service.getMaintenanceRequestById(requestId);
    await service.deleteMaintenanceRequest(requestId);

    expect(getSpy).toHaveBeenCalledWith(`/MaintenanceRequest/get/${requestId}`);
    expect(deleteSpy).toHaveBeenCalledWith(`/Maintenance/delete/${requestId}`);
  });

  it("preserves raw string ids in maintenance comment payloads", async () => {
    const service = new MaintenanceApiService();
    const postSpy = jest.spyOn(service as any, "post").mockResolvedValue({ success: true });

    await service.addMaintenanceRequestComment({
      requestId: "714514359449779000000",
      userId: "d49dc825-fc40-404c-801b-219717ef91ab",
      commentText: "Test comment",
    });

    expect(postSpy).toHaveBeenCalledWith("/MaintenanceRequest/comment", {
      requestId: "714514359449779000000",
      userId: "d49dc825-fc40-404c-801b-219717ef91ab",
      commentText: "Test comment",
    });
  });

  it("preserves raw building ids for building manager lookups", async () => {
    const service = new AdminApiService();
    const getSpy = jest.spyOn(service as any, "get").mockResolvedValue({ success: true });

    const buildingId = "0a572909-5e40-40d2-b3a6-84e35bb51297";
    await service.getBuildingManagers(buildingId);

    expect(getSpy).toHaveBeenCalledWith(`/BuildingManager/building/${buildingId}`);
  });
});
