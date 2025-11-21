import { useCallback, useState } from "react";

import type {
  Building,
  UnitType,
  BuildingUnit,
  BuildingEmployee,
  ServiceProviderProfile,
  ServiceProviderBuildingAssignment,
  ProviderAccessRequest,
  VisitorPass,
  Lease,
  CreateBuildingDTO,
  UpdateBuildingDTO,
  CreateVisitorPassDTO,
  User,
} from "../../types";
import {
  DEFAULT_BUILDINGS,
  DEFAULT_UNIT_TYPES,
  DEFAULT_BUILDING_UNITS,
  DEFAULT_BUILDING_EMPLOYEES,
  DEFAULT_SERVICE_PROVIDERS_PROFILES,
  DEFAULT_SERVICE_PROVIDER_BUILDING_ASSIGNMENTS,
  DEFAULT_LEASES,
} from "../../utils/mockData";
import { generateId } from "../../utils";
import type { AuthContextType } from "../auth-context";
import type { NotificationsContextType } from "../notifications-context";

type AuthDependency = Pick<AuthContextType, "currentUser" | "users" | "actions">;
type NotificationsDependency = Pick<NotificationsContextType, "actions">;

type PropertyModuleDeps = {
  auth: AuthDependency;
  notifications: NotificationsDependency;
  appendVisitorPass: (pass: VisitorPass) => void;
};

export type PropertyModuleState = {
  buildings: Building[];
  unitTypes: UnitType[];
  buildingUnits: BuildingUnit[];
  leases: Lease[];
  buildingEmployees: BuildingEmployee[];
  serviceProviders: ServiceProviderProfile[];
  serviceProviderAssignments: ServiceProviderBuildingAssignment[];
  providerAccessRequests: ProviderAccessRequest[];
};

export type PropertyModuleActions = {
  getBuildings: () => Building[];
  getBuildingById: (id: string) => Building | undefined;
  createBuilding: (buildingData: CreateBuildingDTO) => Promise<Building>;
  updateBuilding: (
    buildingId: string,
    updates: UpdateBuildingDTO,
  ) => Promise<Building>;
  deleteBuilding: (buildingId: string) => Promise<void>;
  getManagedBuildingIds: () => string[];
  getManagedBuildings: () => Building[];
  getUnitTypes: () => UnitType[];
  getUnitTypeById: (id: string) => UnitType | undefined;
  createUnitType: (data: {
    name: string;
    bedrooms: number;
    bathrooms: number;
    areaSqFt: number;
    baseRent?: number;
    amenities: string[];
  }) => Promise<UnitType>;
  updateUnitType: (
    id: string,
    updates: Partial<Pick<UnitType, "name" | "bedrooms" | "bathrooms" | "areaSqFt" | "baseRent" | "amenities">>,
  ) => Promise<void>;
  deleteUnitType: (id: string) => Promise<void>;
  getUnitsByBuilding: (buildingId: string) => BuildingUnit[];
  getUnitById: (unitId: string) => BuildingUnit | undefined;
  createUnit: (
    buildingId: string,
    templateId: string,
    overrides?: Partial<BuildingUnit>,
  ) => Promise<BuildingUnit>;
  updateUnit: (unitId: string, updates: Partial<BuildingUnit>) => Promise<BuildingUnit>;
  deleteUnit: (unitId: string) => Promise<void>;
  getBuildingEmployees: (buildingId: string) => BuildingEmployee[];
  getBuildingEmployeeByUserId: (userId: string) => BuildingEmployee | undefined;
  getBuildingEmployeeScope: (
    userId: string,
  ) => { employee: BuildingEmployee; buildingIds: string[] } | null;
  addBuildingEmployee: (
    buildingId: string,
    data: Omit<BuildingEmployee, "id" | "buildingId">,
  ) => Promise<BuildingEmployee>;
  updateBuildingEmployee: (
    employeeId: string,
    updates: Partial<BuildingEmployee>,
  ) => Promise<BuildingEmployee>;
  removeBuildingEmployee: (employeeId: string) => Promise<void>;
  getServiceProviders: () => ServiceProviderProfile[];
  createServiceProvider: (data: {
    name: string;
    email: string;
    phone: string;
    specialty: string;
    buildingIds?: string[];
  }) => Promise<{ user: User; profile: ServiceProviderProfile }>;
  getServiceProviderBuildingAssignments: (
    providerId: string,
  ) => ServiceProviderBuildingAssignment[];
  getServiceProvidersForBuilding: (buildingId: string) => ServiceProviderProfile[];
  assignServiceProviderToBuilding: (
    providerId: string,
    buildingId: string,
    options?: { specialties?: string[] },
  ) => Promise<ServiceProviderBuildingAssignment>;
  removeServiceProviderFromBuilding: (
    assignmentId: string,
  ) => Promise<void>;
  updateServiceProviderAssignment: (
    assignmentId: string,
    updates: Partial<ServiceProviderBuildingAssignment>,
  ) => Promise<ServiceProviderBuildingAssignment>;
  createProviderAccessRequest: (data: ProviderAccessRequest) => void;
  updateProviderAccessRequest: (
    id: string,
    updates: Partial<ProviderAccessRequest>,
  ) => void;
  approveProviderAccessRequest: (
    requestId: string,
    reviewer: { id: string; name: string },
  ) => void;
  rejectProviderAccessRequest: (
    requestId: string,
    reviewer: { id: string; name: string },
    reason?: string,
  ) => void;
  resolveServiceProviderIdentity: (
    identifier?: string,
  ) => { id: string; name: string; notificationTargetId: string } | null;
  getLeases: () => Lease[];
  getLeaseById: (leaseId: string) => Lease | undefined;
  getLeasesByBuilding: (buildingId: string) => Lease[];
  getLeasesByTenant: (tenantId: string) => Lease[];
  createLease: (payload: {
    buildingId: string;
    unitId: string;
    tenantId: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    depositAmount?: number;
    status?: Lease["status"];
    documents?: string[];
    notes?: string;
  }) => Promise<Lease>;
  updateLease: (leaseId: string, updates: Partial<Lease>) => Promise<Lease>;
  terminateLease: (
    leaseId: string,
    payload?: { endDate?: string; notes?: string },
  ) => Promise<Lease>;
  createVisitorPass: (payload: CreateVisitorPassDTO) => Promise<VisitorPass>;
};

export const usePropertyModule = ({
  auth,
  notifications,
  appendVisitorPass,
}: PropertyModuleDeps): {
  state: PropertyModuleState;
  actions: PropertyModuleActions;
} => {
  const [buildings, setBuildings] = useState<Building[]>(DEFAULT_BUILDINGS);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>(DEFAULT_UNIT_TYPES);
  const [buildingUnits, setBuildingUnits] =
    useState<BuildingUnit[]>(DEFAULT_BUILDING_UNITS);
  const [leases, setLeases] = useState<Lease[]>(DEFAULT_LEASES);
  const [buildingEmployees, setBuildingEmployees] =
    useState<BuildingEmployee[]>(DEFAULT_BUILDING_EMPLOYEES);
  const [serviceProviders, setServiceProviders] = useState<ServiceProviderProfile[]>(
    DEFAULT_SERVICE_PROVIDERS_PROFILES,
  );
  const [serviceProviderAssignments, setServiceProviderAssignments] =
    useState<ServiceProviderBuildingAssignment[]>(
      DEFAULT_SERVICE_PROVIDER_BUILDING_ASSIGNMENTS,
    );
  const [providerAccessRequests, setProviderAccessRequests] =
    useState<ProviderAccessRequest[]>([]);

  const adjustBuildingCounts = useCallback(
    (buildingId: string, delta: { total?: number; occupied?: number }) => {
      setBuildings((prev) =>
        prev.map((building) => {
          if (building.id !== buildingId) {
            return building;
          }

          const totalAdjustment = delta.total ?? 0;
          const occupiedAdjustment = delta.occupied ?? 0;
          const nextTotalUnits = Math.max(0, building.totalUnits + totalAdjustment);
          let nextOccupiedUnits = Math.max(
            0,
            building.occupiedUnits + occupiedAdjustment,
          );
          const clampedOccupied = Math.min(nextTotalUnits, nextOccupiedUnits);

          return {
            ...building,
            totalUnits: nextTotalUnits,
            occupiedUnits: clampedOccupied,
          };
        }),
      );
    },
    [],
  );

  const getUnitTypes = useCallback(() => unitTypes, [unitTypes]);

  const getUnitTypeById = useCallback(
    (id: string) => unitTypes.find((type) => type.id === id),
    [unitTypes],
  );

  const createUnitType = useCallback(
    async (data: {
      name: string;
      bedrooms: number;
      bathrooms: number;
      areaSqFt: number;
      baseRent?: number;
      amenities: string[];
    }) => {
      const newUnitType: UnitType = {
        id: `unit-type-${Date.now()}`,
        name: data.name,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        areaSqFt: data.areaSqFt,
        baseRent: data.baseRent,
        amenities: data.amenities,
      };
      setUnitTypes((prev) => [...prev, newUnitType]);
      return newUnitType;
    },
    [],
  );

  const updateUnitType = useCallback(
    async (
      id: string,
      updates: Partial<Pick<UnitType, "name" | "bedrooms" | "bathrooms" | "areaSqFt" | "baseRent" | "amenities">>,
    ) => {
      setUnitTypes((prev) =>
        prev.map((type) =>
          type.id === id ? { ...type, ...updates } : type,
        ),
      );
    },
    [],
  );

  const deleteUnitType = useCallback(async (id: string) => {
    const unitsUsingType = buildingUnits.filter((unit) => unit.typeId === id);
    if (unitsUsingType.length > 0) {
      throw new Error(
        `Cannot delete unit type. ${unitsUsingType.length} unit(s) are currently using this type.`,
      );
    }
    setUnitTypes((prev) => prev.filter((type) => type.id !== id));
  }, [buildingUnits]);

  const getUnitsByBuilding = useCallback(
    (buildingId: string) => buildingUnits.filter((unit) => unit.buildingId === buildingId),
    [buildingUnits],
  );

  const getUnitById = useCallback(
    (unitId: string) => buildingUnits.find((unit) => unit.id === unitId),
    [buildingUnits],
  );

  const createUnit = useCallback(
    async (
      buildingId: string,
      templateId: string,
      overrides: Partial<BuildingUnit> = {},
    ): Promise<BuildingUnit> => {
      const template = unitTypes.find((type) => type.id === templateId);
      if (!template) {
        return Promise.reject(new Error("Unit template not found"));
      }

      const building = buildings.find((b) => b.id === buildingId);
      if (!building) {
        return Promise.reject(new Error("Building not found"));
      }

      const currentUnitCount = buildingUnits.filter(
        (unit) => unit.buildingId === buildingId,
      ).length;

      if (currentUnitCount >= building.totalUnits) {
        return Promise.reject(
          new Error(
            `Building capacity reached. Maximum ${building.totalUnits} units allowed. Currently have ${currentUnitCount} units.`,
          ),
        );
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const newUnit: BuildingUnit = {
            id: `unit-${Date.now()}`,
            buildingId,
            unitNumber:
              overrides.unitNumber || `U${Date.now().toString().slice(-4)}`,
            floor: overrides.floor ?? 1,
            typeId: template.id,
            templateId: template.id,
            bedrooms: overrides.bedrooms ?? template.bedrooms,
            bathrooms: overrides.bathrooms ?? template.bathrooms,
            areaSqFt: overrides.areaSqFt ?? template.areaSqFt,
            status: overrides.status ?? "vacant",
            tenantId: overrides.tenantId,
            amenities: overrides.amenities ?? template.amenities,
            photos: overrides.photos ?? [],
            rentAmount: overrides.rentAmount ?? template.baseRent,
            offlineReason: overrides.offlineReason,
            lastInspectionDate:
              overrides.lastInspectionDate || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            tower: overrides.tower,
            furnishing: overrides.furnishing,
            managedBy: overrides.managedBy,
            billsInclusive: overrides.billsInclusive,
            maintenanceInclusive: overrides.maintenanceInclusive,
            depositAmount: overrides.depositAmount,
            maintenanceCharges: overrides.maintenanceCharges,
          };

          setBuildingUnits((prev) => [...prev, newUnit]);
          adjustBuildingCounts(buildingId, {
            total: 1,
            occupied: newUnit.status === "occupied" ? 1 : 0,
          });

          resolve(newUnit);
        }, 250);
      });
    },
    [unitTypes, buildings, buildingUnits, adjustBuildingCounts],
  );

  const deleteUnit = useCallback(
    async (unitId: string): Promise<void> => {
      const unit = buildingUnits.find((item) => item.id === unitId);
      if (!unit) {
        return Promise.reject(new Error("Unit not found"));
      }

      const activeLease = leases.find(
        (lease) => lease.unitId === unitId && lease.status !== "ended",
      );
      if (activeLease) {
        return Promise.reject(
          new Error("Cannot delete a unit with an active lease"),
        );
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          setBuildingUnits((prev) => prev.filter((item) => item.id !== unitId));
          adjustBuildingCounts(unit.buildingId, {
            total: -1,
            occupied: unit.status === "occupied" ? -1 : 0,
          });
          setLeases((prev) => prev.filter((lease) => lease.unitId !== unitId));
          resolve();
        }, 250);
      });
    },
    [buildingUnits, leases, adjustBuildingCounts],
  );

  const updateUnit = useCallback(
    async (
      unitId: string,
      updates: Partial<BuildingUnit>,
    ): Promise<BuildingUnit> =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedUnit: BuildingUnit | undefined;
          let previousUnit: BuildingUnit | undefined;

          setBuildingUnits((prev) =>
            prev.map((unit) => {
              if (unit.id === unitId) {
                previousUnit = unit;
                updatedUnit = {
                  ...unit,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
                return updatedUnit;
              }
              return unit;
            }),
          );

          if (!updatedUnit || !previousUnit) {
            reject(new Error("Unit not found"));
            return;
          }

          if (updates.status && updates.status !== previousUnit.status) {
            const delta =
              (updates.status === "occupied" ? 1 : 0) -
              (previousUnit.status === "occupied" ? 1 : 0);
            if (delta !== 0) {
              adjustBuildingCounts(updatedUnit.buildingId, { occupied: delta });
            }
          }

          resolve(updatedUnit);
        }, 400);
      }),
    [adjustBuildingCounts],
  );

  const getBuildingEmployees = useCallback(
    (buildingId: string) =>
      buildingEmployees.filter((employee) => employee.buildingId === buildingId),
    [buildingEmployees],
  );

  const getBuildingEmployeeByUserId = useCallback(
    (userId: string) => {
      if (!userId) {
        return undefined;
      }
      return buildingEmployees.find((employee) => employee.userId === userId);
    },
    [buildingEmployees],
  );

  const getBuildingEmployeeScope = useCallback(
    (userId: string) => {
      const employee = getBuildingEmployeeByUserId(userId);
      if (!employee) {
        return null;
      }
      return {
        employee,
        buildingIds: [employee.buildingId].filter(Boolean),
      };
    },
    [getBuildingEmployeeByUserId],
  );

  const getServiceProviders = useCallback(() => serviceProviders, [serviceProviders]);

  const createServiceProvider = useCallback(
    async (providerData: {
      name: string;
      email: string;
      phone: string;
      specialty: string;
      buildingIds?: string[];
    }): Promise<{ user: any; profile: ServiceProviderProfile }> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can create service providers"));
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const newUser = {
            id: generateId(Object.values(auth.users)).toString(),
            email: providerData.email,
            name: providerData.name,
            role: "service_provider",
            phone: providerData.phone,
            profile: {
              name: providerData.name,
              phone: providerData.phone,
              specialties: [providerData.specialty],
              rating: 0,
              completedJobs: 0,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const newProfile: ServiceProviderProfile = {
            id: `sp-profile-${generateId(serviceProviders)}`,
            userId: newUser.id,
            name: providerData.name,
            specialty: providerData.specialty,
            phone: providerData.phone,
            email: providerData.email,
            rating: 0,
            jobsCompleted: 0,
            responseTimeMinutes: 60,
          };

          auth.actions.addUser(providerData.email, newUser);
          setServiceProviders((prev) => [...prev, newProfile]);

          if (providerData.buildingIds && providerData.buildingIds.length > 0) {
            providerData.buildingIds.forEach((buildingId) => {
              const newAssignment: ServiceProviderBuildingAssignment = {
                id: generateId(serviceProviderAssignments).toString(),
                serviceProviderId: newProfile.id,
                buildingId,
                assignedBy: auth.currentUser!.id,
                assignedByName: auth.currentUser!.name,
                assignedAt: new Date().toISOString(),
                status: "active",
                specialties: [providerData.specialty],
              };
              setServiceProviderAssignments((prev) => [...prev, newAssignment]);
            });
          }

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Service Provider Created",
            `New service provider "${providerData.name}" has been created`,
            "success",
          );

          resolve({ user: newUser, profile: newProfile });
        }, 500);
      });
    },
    [auth.currentUser, auth.users, auth.actions, serviceProviders, serviceProviderAssignments, notifications.actions],
  );

  const getServiceProviderBuildingAssignments = useCallback(
    (providerId: string) =>
      serviceProviderAssignments.filter(
        (assignment) => assignment.serviceProviderId === providerId && assignment.status === "active",
      ),
    [serviceProviderAssignments],
  );

  const getServiceProvidersForBuilding = useCallback(
    (buildingId: string) => {
      const activeAssignments = serviceProviderAssignments.filter(
        (assignment) => assignment.buildingId === buildingId && assignment.status === "active",
      );
      const providerIds = activeAssignments.map((assignment) => assignment.serviceProviderId);
      return serviceProviders.filter((provider) => providerIds.includes(provider.id));
    },
    [serviceProviderAssignments, serviceProviders],
  );

  const assignServiceProviderToBuilding = useCallback(
    async (
      providerId: string,
      buildingId: string,
      options?: { specialties?: string[] },
    ): Promise<ServiceProviderBuildingAssignment> => {
      if (
        !auth.currentUser ||
        !["admin", "management", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(
          new Error("You do not have permission to assign service providers"),
        );
      }

      const building = buildings.find((b) => b.id === buildingId);
      if (!building) {
        return Promise.reject(new Error("Building not found"));
      }

      if (
        auth.currentUser.role === "management" &&
        building.managerId !== auth.currentUser.id
      ) {
        return Promise.reject(
          new Error("Only the assigned building manager can assign service providers"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const providerProfile = serviceProviders.find(
            (provider) => provider.id === providerId,
          );

          if (!providerProfile) {
            reject(new Error("Service provider not found"));
            return;
          }

          const assignment: ServiceProviderBuildingAssignment = {
            id: generateId(serviceProviderAssignments).toString(),
            serviceProviderId: providerProfile.id,
            buildingId,
            assignedBy: auth.currentUser!.id,
            assignedByName: auth.currentUser!.name || "System",
            assignedAt: new Date().toISOString(),
            status: "active",
            specialties: options?.specialties || [providerProfile.specialty],
          };

          setServiceProviderAssignments((prev) => [...prev, assignment]);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Provider Assigned",
            `Service provider "${providerProfile.name}" assigned to ${building.name}`,
            "success",
          );

          resolve(assignment);
        }, 400);
      });
    },
    [auth.currentUser, buildings, serviceProviders, serviceProviderAssignments, notifications.actions],
  );

  const removeServiceProviderFromBuilding = useCallback(
    async (assignmentId: string): Promise<void> =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          const assignment = serviceProviderAssignments.find(
            (item) => item.id === assignmentId,
          );

          if (!assignment) {
            reject(new Error("Assignment not found"));
            return;
          }

          setServiceProviderAssignments((prev) =>
            prev.filter((item) => item.id !== assignmentId),
          );

          resolve();
        }, 350);
      }),
    [serviceProviderAssignments],
  );

  const updateServiceProviderAssignment = useCallback(
    async (
      assignmentId: string,
      updates: Partial<ServiceProviderBuildingAssignment>,
    ): Promise<ServiceProviderBuildingAssignment> =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedAssignment: ServiceProviderBuildingAssignment | undefined;

          setServiceProviderAssignments((prev) =>
            prev.map((assignment) => {
              if (assignment.id === assignmentId) {
                updatedAssignment = {
                  ...assignment,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
                return updatedAssignment;
              }
              return assignment;
            }),
          );

          if (!updatedAssignment) {
            reject(new Error("Assignment not found"));
            return;
          }

          resolve(updatedAssignment);
        }, 300);
      }),
    [],
  );

  const createProviderAccessRequest = useCallback(
    (payload: ProviderAccessRequest) => {
      setProviderAccessRequests((prev) => [payload, ...prev]);
    },
    [],
  );

  const updateProviderAccessRequest = useCallback(
    (requestId: string, updates: Partial<ProviderAccessRequest>) => {
      setProviderAccessRequests((prev) =>
        prev.map((request) =>
          request.id === requestId ? { ...request, ...updates } : request,
        ),
      );
    },
    [],
  );

  const approveProviderAccessRequest = useCallback(
    (
      requestId: string,
      reviewer: { id: string; name: string },
    ) => {
      const request = providerAccessRequests.find((req) => req.id === requestId);
      if (!request) return;

      updateProviderAccessRequest(requestId, {
        status: "approved",
        reviewedBy: reviewer.id,
        reviewedByName: reviewer.name,
        reviewedAt: new Date().toISOString(),
      });

      assignServiceProviderToBuilding(request.serviceProviderId, request.buildingId);

      notifications.actions.createNotification(
        request.requestedBy,
        "Provider Access Approved",
        `Access for ${request.serviceProviderName} has been approved.`,
        "success",
      );
    },
    [providerAccessRequests, updateProviderAccessRequest, assignServiceProviderToBuilding, notifications.actions],
  );

  const rejectProviderAccessRequest = useCallback(
    (
      requestId: string,
      reviewer: { id: string; name: string },
      reason?: string,
    ) => {
      const request = providerAccessRequests.find((req) => req.id === requestId);
      if (!request) return;

      updateProviderAccessRequest(requestId, {
        status: "rejected",
        reviewedBy: reviewer.id,
        reviewedByName: reviewer.name,
        reviewedAt: new Date().toISOString(),
        rejectionReason: reason,
      });

      notifications.actions.createNotification(
        request.requestedBy,
        "Provider Access Rejected",
        `Your request for ${request.serviceProviderName} was rejected. ${reason ? `Reason: ${reason}` : ""}`,
        "error",
      );
    },
    [providerAccessRequests, updateProviderAccessRequest, notifications.actions],
  );

  const resolveServiceProviderIdentity = useCallback(
    (
      identifier?: string,
    ): { id: string; name: string; notificationTargetId: string } | null => {
      if (!identifier) {
        return null;
      }

      const directUser = auth.users[identifier];
      const userById =
        directUser ||
        Object.values(auth.users).find((user) => user.id === identifier);

      if (userById) {
        return {
          id: userById.id,
          name: userById.name,
          notificationTargetId: userById.id,
        };
      }

      const providerProfile = serviceProviders.find(
        (provider) =>
          provider.id === identifier || provider.userId === identifier,
      );

      if (providerProfile) {
        const resolvedId = providerProfile.userId || providerProfile.id;
        return {
          id: resolvedId,
          name: providerProfile.name,
          notificationTargetId: resolvedId,
        };
      }

      return null;
    },
    [auth.users, serviceProviders],
  );

  const getLeases = useCallback(() => leases, [leases]);

  const getLeaseById = useCallback(
    (leaseId: string) => leases.find((lease) => lease.id === leaseId),
    [leases],
  );

  const getLeasesByBuilding = useCallback(
    (buildingId: string) => leases.filter((lease) => lease.buildingId === buildingId),
    [leases],
  );

  const getLeasesByTenant = useCallback(
    (tenantId: string) => leases.filter((lease) => lease.tenantId === tenantId),
    [leases],
  );

  const createLease = useCallback(
    async (payload: {
      buildingId: string;
      unitId: string;
      tenantId: string;
      startDate: string;
      endDate: string;
      rentAmount: number;
      depositAmount?: number;
      status?: Lease["status"];
      documents?: string[];
      notes?: string;
    }): Promise<Lease> => {
      const unit = buildingUnits.find((item) => item.id === payload.unitId);
      if (!unit) {
        return Promise.reject(new Error("Unit not found"));
      }

      const existingLease = leases.find(
        (lease) => lease.unitId === payload.unitId && lease.status !== "ended",
      );
      if (existingLease) {
        return Promise.reject(
          new Error("An active lease already exists for this unit"),
        );
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const now = new Date().toISOString();
          const status = payload.status ?? "active";
          const lease: Lease = {
            id: `lease-${Date.now()}`,
            buildingId: payload.buildingId,
            unitId: payload.unitId,
            tenantId: payload.tenantId,
            startDate: payload.startDate,
            endDate: payload.endDate,
            rentAmount: payload.rentAmount,
            depositAmount: payload.depositAmount,
            status,
            documents: payload.documents,
            notes: payload.notes,
            createdAt: now,
            updatedAt: now,
          };

          const shouldOccupy = status === "active" || status === "notice";

          setLeases((prev) => [lease, ...prev]);
          setBuildingUnits((prev) =>
            prev.map((unitItem) => {
              if (unitItem.id !== lease.unitId) return unitItem;

              return {
                ...unitItem,
                tenantId: shouldOccupy ? lease.tenantId : unitItem.tenantId,
                status: shouldOccupy ? "occupied" : unitItem.status,
                rentAmount: lease.rentAmount,
                updatedAt: now,
              };
            }),
          );

          if (shouldOccupy && unit.status !== "occupied") {
            adjustBuildingCounts(lease.buildingId, { occupied: 1 });
          }

          resolve(lease);
        }, 300);
      });
    },
    [buildingUnits, leases, adjustBuildingCounts],
  );

  const updateLease = useCallback(
    async (leaseId: string, updates: Partial<Lease>): Promise<Lease> =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedLease: Lease | undefined;
          let previousLease: Lease | undefined;

          setLeases((prev) =>
            prev.map((lease) => {
              if (lease.id === leaseId) {
                previousLease = lease;
                updatedLease = {
                  ...lease,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
                return updatedLease;
              }
              return lease;
            }),
          );

          if (!updatedLease || !previousLease) {
            reject(new Error("Lease not found"));
            return;
          }

          const previousOccupancy =
            previousLease.status === "active" || previousLease.status === "notice";
          const nextStatus = updates.status ?? previousLease.status;
          const nextOccupancy =
            nextStatus === "active" || nextStatus === "notice";

          if (updates.rentAmount !== undefined) {
            setBuildingUnits((prev) =>
              prev.map((unit) =>
                unit.id === updatedLease!.unitId
                  ? {
                      ...unit,
                      rentAmount: updates.rentAmount,
                      updatedAt: new Date().toISOString(),
                    }
                  : unit,
              ),
            );
          }

          if (previousOccupancy !== nextOccupancy) {
            adjustBuildingCounts(updatedLease.buildingId, {
              occupied: nextOccupancy ? 1 : -1,
            });
          }

          resolve(updatedLease);
        }, 300);
      }),
    [adjustBuildingCounts],
  );

  const terminateLease = useCallback(
    async (
      leaseId: string,
      payload?: { endDate?: string; notes?: string },
    ): Promise<Lease> => {
      const lease = leases.find((item) => item.id === leaseId);
      if (!lease) {
        return Promise.reject(new Error("Lease not found"));
      }

      const updates: Partial<Lease> = {
        status: "ended",
        endDate: payload?.endDate,
        notes: payload?.notes,
      };

      return updateLease(leaseId, updates);
    },
    [updateLease, leases],
  );

  const getBuildings = useCallback(() => buildings, [buildings]);

  const getBuildingById = useCallback(
    (id: string) => buildings.find((building) => building.id === id),
    [buildings],
  );

  const createBuilding = useCallback(
    async (buildingData: CreateBuildingDTO): Promise<Building> => {
      if (
        !auth.currentUser ||
        !["admin", "management", "super_admin"].includes(
          auth.currentUser.role,
        )
      ) {
        return Promise.reject(
          new Error("Only admins and management can create buildings"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const manager =
            buildingData.managerId
              ? auth.users[buildingData.managerId] ||
                Object.values(auth.users).find(
                  (u) => u.id === buildingData.managerId,
                )
              : undefined;

          if (buildingData.managerId && !manager) {
            reject(new Error("Selected manager not found."));
            return;
          }

          if (
            buildingData.managerId &&
            buildings.some((building) => building.managerId === manager?.id)
          ) {
            reject(
              new Error(
                "Selected manager is already assigned to another building.",
              ),
            );
            return;
          }

          const building: Building = {
            id: `building-${generateId(buildings)}`,
            name: buildingData.name,
            address: buildingData.address,
            totalUnits: buildingData.totalUnits ?? 0,
            occupiedUnits: 0,
            occupancyRate: 0,
            managerId: manager?.id,
            managerName: manager?.name,
            amenities: buildingData.amenities ?? [],
            towers: buildingData.towers ?? [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setBuildings((prev) => [building, ...prev]);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Building Created",
            `Building "${building.name}" has been added`,
            "success",
          );

          resolve(building);
        }, 500);
      });
    },
    [buildings, auth.currentUser, auth.users, notifications.actions],
  );

  const updateBuilding = useCallback(
    async (
      buildingId: string,
      updates: UpdateBuildingDTO,
    ): Promise<Building> => {
      if (
        !auth.currentUser ||
        !["admin", "management", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(
          new Error("Only admins and management can update buildings"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (updates.managerId) {
            const manager =
              auth.users[updates.managerId] ||
              Object.values(auth.users).find(
                (u) => u.id === updates.managerId,
              );

            if (!manager) {
              reject(new Error("Selected manager not found."));
              return;
            }

            const managerInUse = buildings.some(
              (building) =>
                building.id !== buildingId &&
                building.managerId === updates.managerId,
            );

            if (managerInUse) {
              reject(
                new Error(
                  "Selected manager is already assigned to another building.",
                ),
              );
              return;
            }
          }

          let updatedBuilding: Building | undefined;

          setBuildings((prev) => {
            let found = false;
            const next = prev.map((building) => {
              if (building.id === buildingId) {
                found = true;
                const manager =
                  updates.managerId
                    ? auth.users[updates.managerId] ||
                      Object.values(auth.users).find(
                        (u) => u.id === updates.managerId,
                      )
                    : building.managerId
                      ? auth.users[building.managerId] ||
                        Object.values(auth.users).find(
                          (u) => u.id === building.managerId,
                        )
                      : undefined;

                updatedBuilding = {
                  ...building,
                  ...updates,
                  managerName: manager?.name,
                  updatedAt: new Date().toISOString(),
                };
                return updatedBuilding;
              }
              return building;
            });

            return found ? next : prev;
          });

          if (!updatedBuilding) {
            reject(new Error("Building not found"));
            return;
          }

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Building Updated",
            `Building "${updatedBuilding.name}" has been updated`,
            "success",
          );

          resolve(updatedBuilding);
        }, 500);
      });
    },
    [buildings, auth.currentUser, auth.users, notifications.actions],
  );

  const deleteBuilding = useCallback(
    async (buildingId: string): Promise<void> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can delete buildings"));
      }

      const building = buildings.find((b) => b.id === buildingId);
      if (!building) {
        return Promise.reject(new Error("Building not found"));
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          setBuildings((prev) => prev.filter((b) => b.id !== buildingId));

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Building Deleted",
            `Building "${building.name}" has been deleted`,
            "info",
          );

          resolve();
        }, 500);
      });
    },
    [buildings, auth.currentUser, notifications.actions],
  );

  const getManagedBuildingIds = useCallback((): string[] => {
    if (!auth.currentUser) return [];

    const managed = auth.currentUser.profile?.managedBuildingIds;
    if (managed && managed.length > 0) {
      return managed;
    }

    if (auth.currentUser.profile?.buildingId) {
      return [auth.currentUser.profile.buildingId];
    }

    return buildings
      .filter((building) => building.managerId === auth.currentUser?.id)
      .map((building) => building.id);
  }, [auth.currentUser, buildings]);

  const getManagedBuildings = useCallback((): Building[] => {
    const ids = getManagedBuildingIds();
    if (!ids.length) return [];
    return buildings.filter((building) => ids.includes(building.id));
  }, [buildings, getManagedBuildingIds]);

  const createVisitorPass = useCallback(
    async (payload: CreateVisitorPassDTO): Promise<VisitorPass> => {
      if (!auth.currentUser) {
        return Promise.reject(
          new Error("User must be authenticated to create passes"),
        );
      }

      const role = auth.currentUser.role;
      const isAdmin = role === "admin" || role === "super_admin";
      const isManagement = role === "management";

      if (!isAdmin && !isManagement) {
        return Promise.reject(
          new Error("Only management or admin users can create visitor passes"),
        );
      }

      const building = buildings.find(
        (item) => item.id === payload.buildingId,
      );
      if (!building) {
        return Promise.reject(new Error("Building not found"));
      }

      if (isManagement) {
        const managedBuildings = getManagedBuildingIds();
        const managesBuilding = managedBuildings.includes(building.id);
        const isBuildingManager = building.managerId === auth.currentUser.id;
        if (!managesBuilding || !isBuildingManager) {
          return Promise.reject(
            new Error("Only the assigned building manager can create passes for this building"),
          );
        }
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const passId = `visitor-pass-${Date.now()}`;
          const newPass: VisitorPass = {
            id: passId,
            buildingId: payload.buildingId,
            tenantId: payload.tenantId,
            unitNumber: payload.unitNumber,
            type: payload.type,
            name: payload.name,
            company: payload.company,
            contactPhone: payload.contactPhone,
            contactEmail: payload.contactEmail,
            scheduledStart: payload.scheduledStart,
            scheduledEnd: payload.scheduledEnd,
            status: "pending",
            hostName: payload.hostName,
            notes: payload.notes,
            qrCodeUrl: `https://example.com/pass/${passId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          appendVisitorPass(newPass);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Visitor Pass Created",
            `Created pass for ${payload.name}`,
            "success",
          );

          if (payload.tenantId) {
            notifications.actions.createNotification(
              payload.tenantId,
              "Visitor Pass Requested",
              `Management created a ${payload.type} pass for ${payload.name}`,
              "info",
            );
          }

          resolve(newPass);
        }, 350);
      });
    },
    [
      auth.currentUser,
      buildings,
      notifications.actions,
      getManagedBuildingIds,
      appendVisitorPass,
    ],
  );

  return {
    state: {
      buildings,
      unitTypes,
      buildingUnits,
      leases,
      buildingEmployees,
      serviceProviders,
      serviceProviderAssignments,
      providerAccessRequests,
    },
    actions: {
      getBuildings,
      getBuildingById,
      createBuilding,
      updateBuilding,
      deleteBuilding,
      getManagedBuildingIds,
      getManagedBuildings,
      getUnitTypes,
      getUnitTypeById,
      createUnitType,
      updateUnitType,
      deleteUnitType,
      getUnitsByBuilding,
      getUnitById,
      createUnit,
      updateUnit,
      deleteUnit,
      getBuildingEmployees,
      getBuildingEmployeeByUserId,
      getBuildingEmployeeScope,
      addBuildingEmployee: (
        buildingId: string,
        employeeData: Omit<BuildingEmployee, "id" | "buildingId">,
      ) =>
        new Promise((resolve) => {
          setTimeout(() => {
            const newEmployee: BuildingEmployee = {
              id: `emp-${Date.now()}`,
              buildingId,
              ...employeeData,
            };

            setBuildingEmployees((prev) => [...prev, newEmployee]);
            resolve(newEmployee);
          }, 300);
        }),
      updateBuildingEmployee: (
        employeeId: string,
        updates: Partial<BuildingEmployee>,
      ) =>
        new Promise((resolve, reject) => {
          setTimeout(() => {
            let updatedEmployee: BuildingEmployee | undefined;

            setBuildingEmployees((prev) =>
              prev.map((employee) => {
                if (employee.id === employeeId) {
                  updatedEmployee = { ...employee, ...updates };
                  return updatedEmployee;
                }
                return employee;
              }),
            );

            if (!updatedEmployee) {
              reject(new Error("Employee not found"));
              return;
            }

            resolve(updatedEmployee);
          }, 300);
        }),
      removeBuildingEmployee: async (employeeId: string) =>
        new Promise((resolve, reject) => {
          setTimeout(() => {
            const exists = buildingEmployees.some(
              (employee) => employee.id === employeeId,
            );

            if (!exists) {
              reject(new Error("Employee not found"));
              return;
            }

            setBuildingEmployees((prev) =>
              prev.filter((employee) => employee.id !== employeeId),
            );

            resolve();
          }, 300);
        }),
      getServiceProviders,
      createServiceProvider,
      getServiceProviderBuildingAssignments,
      getServiceProvidersForBuilding,
      assignServiceProviderToBuilding,
      removeServiceProviderFromBuilding,
      updateServiceProviderAssignment,
      createProviderAccessRequest,
      updateProviderAccessRequest,
      approveProviderAccessRequest,
      rejectProviderAccessRequest,
      resolveServiceProviderIdentity,
      getLeases,
      getLeaseById,
      getLeasesByBuilding,
      getLeasesByTenant,
      createLease,
      updateLease,
      terminateLease,
      createVisitorPass,
    },
  };
};
