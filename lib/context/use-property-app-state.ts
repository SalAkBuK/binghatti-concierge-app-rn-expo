import type { VisitorPass } from "../types";
import type { AuthContextType } from "./auth-context";
import type { NotificationsContextType } from "./notifications-context";
import { usePropertyModule } from "./modules/property";

type UsePropertyAppStateParams = {
  auth: AuthContextType;
  notifications: NotificationsContextType;
  appendVisitorPass: (pass: VisitorPass) => void;
};

export const usePropertyAppState = ({
  auth,
  notifications,
  appendVisitorPass,
}: UsePropertyAppStateParams) => {
  const {
    state: {
      buildings,
      unitTypes,
      buildingUnits,
      leases,
      buildingEmployees,
      serviceProviders,
      providerAccessRequests,
    },
    actions,
  } = usePropertyModule({ auth, notifications, appendVisitorPass });

  return {
    buildings,
    unitTypes,
    buildingUnits,
    leases,
    buildingEmployees,
    serviceProviders,
    providerAccessRequests,
    getBuildings: actions.getBuildings,
    getBuildingById: actions.getBuildingById,
    createBuilding: actions.createBuilding,
    updateBuilding: actions.updateBuilding,
    deleteBuilding: actions.deleteBuilding,
    assignManagerToBuilding: actions.assignManagerToBuilding,
    assignAdminToBuilding: actions.assignAdminToBuilding,
    assignMaintenanceStaffToBuilding:
      actions.assignMaintenanceStaffToBuilding,
    getBuildingAdmins: actions.getBuildingAdmins,
    getAdminBuildings: actions.getAdminBuildings,
    refreshBuildings: actions.refreshBuildings,
    removeAdminFromBuilding: actions.removeAdminFromBuilding,
    getAdminAssignedBuildingIds: actions.getAdminAssignedBuildingIds,
    getAdminAssignedBuildings: actions.getAdminAssignedBuildings,
    getManagedBuildingIds: actions.getManagedBuildingIds,
    getManagedBuildings: actions.getManagedBuildings,
    getUnitTypes: actions.getUnitTypes,
    getUnitTypeById: actions.getUnitTypeById,
    createUnitType: actions.createUnitType,
    updateUnitType: actions.updateUnitType,
    deleteUnitType: actions.deleteUnitType,
    getUnitsByBuilding: actions.getUnitsByBuilding,
    getUnitById: actions.getUnitById,
    createUnit: actions.createUnit,
    updateUnit: actions.updateUnit,
    deleteUnit: actions.deleteUnit,
    getBuildingEmployees: actions.getBuildingEmployees,
    getBuildingEmployeeByUserId: actions.getBuildingEmployeeByUserId,
    getBuildingEmployeeScope: actions.getBuildingEmployeeScope,
    addBuildingEmployee: actions.addBuildingEmployee,
    updateBuildingEmployee: actions.updateBuildingEmployee,
    removeBuildingEmployee: actions.removeBuildingEmployee,
    getServiceProviders: actions.getServiceProviders,
    createServiceProvider: actions.createServiceProvider,
    updateServiceProvider: actions.updateServiceProvider,
    getServiceProviderBuildingAssignments:
      actions.getServiceProviderBuildingAssignments,
    getServiceProvidersForBuilding: actions.getServiceProvidersForBuilding,
    assignServiceProviderToBuilding: actions.assignServiceProviderToBuilding,
    removeServiceProviderFromBuilding:
      actions.removeServiceProviderFromBuilding,
    updateServiceProviderAssignment:
      actions.updateServiceProviderAssignment,
    createProviderAccessRequest: actions.createProviderAccessRequest,
    updateProviderAccessRequest: actions.updateProviderAccessRequest,
    approveProviderAccessRequest: actions.approveProviderAccessRequest,
    rejectProviderAccessRequest: actions.rejectProviderAccessRequest,
    resolveServiceProviderIdentity: actions.resolveServiceProviderIdentity,
    getLeases: actions.getLeases,
    getLeaseById: actions.getLeaseById,
    getLeasesByBuilding: actions.getLeasesByBuilding,
    getLeasesByTenant: actions.getLeasesByTenant,
    createLease: actions.createLease,
    updateLease: actions.updateLease,
    terminateLease: actions.terminateLease,
    createVisitorPass: actions.createVisitorPass,
  };
};
