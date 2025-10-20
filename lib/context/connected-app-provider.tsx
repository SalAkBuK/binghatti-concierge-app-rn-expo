import React, { ReactNode, useState, useCallback } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { RequestsProvider, useRequests } from "./requests-context";
import {
  NotificationsProvider,
  useNotifications,
} from "./notifications-context";
import { NoticesProvider, useNotices } from "./notices-context";
import type {
  Amenity,
  AmenityBooking,
  Visitor,
  Rating,
  AmenityType,
  BookingStatus,
  VisitorStatus,
  Building,
  UnitType,
  BuildingUnit,
  BuildingEmployee,
  ServiceProviderProfile,
  VisitorLog,
  RatingSummary,
  Lease,
  BuildingAmenityConfig,
  VisitorPass,
  Job,
  JobCostBreakdownItem,
  JobComplianceChecklistItem,
  JobAssignmentRecord,
  Analytics,
  RolePermissions,
  CreateUserDTO,
  UpdateUserDTO,
  CreateBuildingDTO,
  UpdateBuildingDTO,
  CreateJobDTO,
  UpdateJobDTO,
  BulkUpdateJobStatusDTO,
  QueueJobAssignmentDTO,
  User,
} from "../types";
import {
  DEFAULT_AMENITIES,
  DEFAULT_BOOKINGS,
  DEFAULT_VISITORS,
  DEFAULT_RATINGS,
  DEFAULT_BUILDINGS,
  DEFAULT_JOBS,
  DEFAULT_ANALYTICS,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_UNIT_TYPES,
  DEFAULT_BUILDING_UNITS,
  DEFAULT_BUILDING_EMPLOYEES,
  DEFAULT_SERVICE_PROVIDERS_PROFILES,
  DEFAULT_VISITOR_LOGS,
  DEFAULT_RATING_SUMMARIES,
  DEFAULT_AMENITY_CONFIGS,
  DEFAULT_VISITOR_PASSES,
  DEFAULT_LEASES,
} from "../utils/mockData";
import { generateId } from "../utils";

interface ConnectedAppProviderProps {
  children: ReactNode;
}

/**
 * Internal component that connects contexts together
 * This ensures that RequestsProvider can access NotificationsProvider actions
 */
const ConnectedRequestsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { actions: notificationActions } = useNotifications();
  const { users } = useAuth();

  const handleNotificationCreate = (
    userId: string,
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => {
    notificationActions.createNotification(userId, title, message, type);
  };

  const handleRoleBroadcast = (
    role: any,
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error",
  ) => {
    notificationActions.broadcastNotificationToRole(
      role,
      title,
      message,
      type,
      users,
    );
  };

  return (
    <RequestsProvider onNotificationCreate={handleNotificationCreate}>
      {children}
    </RequestsProvider>
  );
};

/**
 * Root provider with proper context composition and connection
 */
export const ConnectedAppProvider: React.FC<ConnectedAppProviderProps> = ({
  children,
}) => {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <NoticesProvider>
          <ConnectedRequestsProvider>{children}</ConnectedRequestsProvider>
        </NoticesProvider>
      </NotificationsProvider>
    </AuthProvider>
  );
};

// Convenience hooks that combine multiple contexts
export const useApp = () => {
  const auth = useAuth();
  const requests = useRequests();
  const notifications = useNotifications();
  const notices = useNotices();

  // New state for amenities, bookings, visitors, and ratings
  const [amenities] = useState<Amenity[]>(DEFAULT_AMENITIES);
  const [bookings, setBookings] = useState<AmenityBooking[]>(DEFAULT_BOOKINGS);
  const [visitors, setVisitors] = useState<Visitor[]>(DEFAULT_VISITORS);
  const [ratings, setRatings] = useState<Rating[]>(DEFAULT_RATINGS);
  const [amenityConfigs, setAmenityConfigs] = useState<BuildingAmenityConfig[]>(
    DEFAULT_AMENITY_CONFIGS,
  );

  // Admin state
  const [buildings, setBuildings] = useState<Building[]>(DEFAULT_BUILDINGS);
  const [jobs, setJobs] = useState<Job[]>(DEFAULT_JOBS);
  const [analytics] = useState<Analytics>(DEFAULT_ANALYTICS);
  const [rolePermissions] = useState<RolePermissions[]>(DEFAULT_ROLE_PERMISSIONS);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>(DEFAULT_UNIT_TYPES);
  const [buildingUnits, setBuildingUnits] =
    useState<BuildingUnit[]>(DEFAULT_BUILDING_UNITS);
  const [leases, setLeases] = useState<Lease[]>(DEFAULT_LEASES);
  const [buildingEmployees, setBuildingEmployees] = useState<BuildingEmployee[]>(
    DEFAULT_BUILDING_EMPLOYEES,
  );
  const [serviceProviders] = useState<ServiceProviderProfile[]>(
    DEFAULT_SERVICE_PROVIDERS_PROFILES,
  );
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>(DEFAULT_VISITOR_LOGS);
  const [ratingSummaries, setRatingSummaries] = useState<RatingSummary[]>(
    DEFAULT_RATING_SUMMARIES,
  );
  const [visitorPasses, setVisitorPasses] = useState<VisitorPass[]>(
    DEFAULT_VISITOR_PASSES,
  );

  // Amenity actions
  const getAmenities = useCallback(() => {
    return amenities;
  }, [amenities]);

  const getAmenityById = useCallback(
    (id: string) => {
      return amenities.find((amenity) => amenity.id === id);
    },
    [amenities],
  );

  const getAmenityConfigs = useCallback(
    () => amenityConfigs,
    [amenityConfigs],
  );

  const getAmenityConfigsByBuilding = useCallback(
    (buildingId: string) =>
      amenityConfigs.filter((config) => config.buildingId === buildingId),
    [amenityConfigs],
  );

  const updateAmenityConfig = useCallback(
    async (
      configId: string,
      updates: Partial<BuildingAmenityConfig>,
    ): Promise<BuildingAmenityConfig> => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedConfig: BuildingAmenityConfig | undefined;

          setAmenityConfigs((prev) =>
            prev.map((config) => {
              if (config.id === configId) {
                updatedConfig = {
                  ...config,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
                return updatedConfig;
              }
              return config;
            }),
          );

          if (!updatedConfig) {
            reject(new Error("Amenity configuration not found"));
            return;
          }

          resolve(updatedConfig);
        }, 250);
      });
    },
    [],
  );

  // Unit type and unit helpers
  const getUnitTypes = useCallback(() => {
    return unitTypes;
  }, [unitTypes]);

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
      updates: {
        name?: string;
        bedrooms?: number;
        bathrooms?: number;
        areaSqFt?: number;
        baseRent?: number;
        amenities?: string[];
      },
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
    // Check if any units are using this type
    const unitsUsingType = buildingUnits.filter((unit) => unit.typeId === id);
    if (unitsUsingType.length > 0) {
      throw new Error(
        `Cannot delete unit type. ${unitsUsingType.length} unit(s) are currently using this type.`,
      );
    }
    setUnitTypes((prev) => prev.filter((type) => type.id !== id));
  }, [buildingUnits]);

  const getUnitsByBuilding = useCallback(
    (buildingId: string) => {
      return buildingUnits.filter((unit) => unit.buildingId === buildingId);
    },
    [buildingUnits],
  );

  const getUnitById = useCallback(
    (unitId: string) => buildingUnits.find((unit) => unit.id === unitId),
    [buildingUnits],
  );

  // Workforce helpers
  const getBuildingEmployees = useCallback(
    (buildingId: string) => {
      return buildingEmployees.filter(
        (employee) => employee.buildingId === buildingId,
      );
    },
    [buildingEmployees],
  );

  const getServiceProviders = useCallback(() => {
    return serviceProviders;
  }, [serviceProviders]);

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

  // Visitor / delivery logs
  const getVisitorLogsByBuilding = useCallback(
    (
      buildingId: string,
      filter?: { type?: VisitorLog["type"]; status?: VisitorLog["status"] },
    ) => {
      let filtered = visitorLogs.filter(
        (log) => log.buildingId === buildingId,
      );

      if (filter?.type) {
        filtered = filtered.filter((log) => log.type === filter.type);
      }

      if (filter?.status) {
        filtered = filtered.filter((log) => log.status === filter.status);
      }

      return filtered;
    },
    [visitorLogs],
  );

  // Ratings summaries
  const getRatingSummaries = useCallback(
    (role?: RatingSummary["role"]) => {
      if (!role) return ratingSummaries;
      return ratingSummaries.filter((summary) => summary.role === role);
    },
    [ratingSummaries],
  );

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

      // Check building capacity
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
    ): Promise<BuildingUnit> => {
      return new Promise((resolve, reject) => {
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

          if (updates.rentAmount !== undefined) {
            updatedUnit.rentAmount = updates.rentAmount;
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
      });
    },
    [adjustBuildingCounts],
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
                status: shouldOccupy
                  ? "occupied"
                  : unitItem.status,
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
    async (leaseId: string, updates: Partial<Lease>): Promise<Lease> => {
      return new Promise((resolve, reject) => {
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

          setBuildingUnits((prev) =>
            prev.map((unit) => {
              if (unit.id !== updatedLease!.unitId) return unit;

              return {
                ...unit,
                tenantId: nextOccupancy ? updatedLease!.tenantId : undefined,
                status: nextOccupancy
                  ? "occupied"
                  : unit.status === "maintenance"
                    ? "maintenance"
                    : "vacant",
                updatedAt: new Date().toISOString(),
              };
            }),
          );

          resolve(updatedLease);
        }, 300);
      });
    },
    [adjustBuildingCounts],
  );

  const terminateLease = useCallback(
    async (
      leaseId: string,
      payload?: { endDate?: string; notes?: string },
    ): Promise<Lease> => {
      const updates: Partial<Lease> = {
        status: "ended",
        endDate: payload?.endDate,
        notes: payload?.notes,
      };

      return updateLease(leaseId, updates);
    },
    [updateLease],
  );

  const addBuildingEmployee = useCallback(
    async (
      buildingId: string,
      employeeData: Omit<BuildingEmployee, "id" | "buildingId">,
    ): Promise<BuildingEmployee> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const newEmployee: BuildingEmployee = {
            id: `emp-${Date.now()}`,
            buildingId,
            ...employeeData,
          };

          setBuildingEmployees((prev) => [...prev, newEmployee]);
          resolve(newEmployee);
        }, 300);
      });
    },
    [],
  );

  const updateBuildingEmployee = useCallback(
    async (
      employeeId: string,
      updates: Partial<BuildingEmployee>,
    ): Promise<BuildingEmployee> => {
      return new Promise((resolve, reject) => {
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
      });
    },
    [],
  );

  const removeBuildingEmployee = useCallback(
    async (employeeId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
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
      });
    },
    [buildingEmployees],
  );

  const addVisitorLog = useCallback(
    async (logData: Partial<VisitorLog>): Promise<VisitorLog> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const newLog: VisitorLog = {
            id: `visit-${Date.now()}`,
            buildingId: logData.buildingId || "building-1",
            tenantId: logData.tenantId,
            unitNumber: logData.unitNumber,
            type: logData.type || "visitor",
            name: logData.name || "Guest",
            company: logData.company,
            expectedArrival:
              logData.expectedArrival || new Date().toISOString(),
            checkInTime: logData.checkInTime,
            checkOutTime: logData.checkOutTime,
            status: logData.status || "expected",
            notes: logData.notes,
          };

          setVisitorLogs((prev) => [newLog, ...prev]);
          resolve(newLog);
        }, 250);
      });
    },
    [],
  );

  const updateVisitorLog = useCallback(
    async (
      logId: string,
      updates: Partial<VisitorLog>,
    ): Promise<VisitorLog> => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedLog: VisitorLog | undefined;

          setVisitorLogs((prev) =>
            prev.map((log) => {
              if (log.id === logId) {
                updatedLog = { ...log, ...updates };
                return updatedLog;
              }
              return log;
            }),
          );

          if (!updatedLog) {
            reject(new Error("Visitor log not found"));
            return;
          }

          resolve(updatedLog);
        }, 250);
      });
    },
    [],
  );

  const upsertRatingSummary = useCallback(
    async (
      summary: RatingSummary,
    ): Promise<RatingSummary> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          setRatingSummaries((prev) => {
            const exists = prev.some((item) => item.id === summary.id);
            if (exists) {
              return prev.map((item) =>
                item.id === summary.id ? summary : item,
              );
            }
            return [...prev, summary];
          });
          resolve(summary);
        }, 200);
      });
    },
    [],
  );

  // Booking actions
  const createBooking = useCallback(
    async (bookingData: Partial<AmenityBooking>): Promise<AmenityBooking> => {
      if (!auth.currentUser) {
        return Promise.reject(
          new Error("User must be authenticated to create bookings"),
        );
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const amenity = amenities.find((a) => a.id === bookingData.amenityId);
          const date = new Date();
          const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
          const bookingCount = bookings.length + 1;
          const amenityPrefix =
            amenity?.amenityType.toUpperCase().slice(0, 4) || "BOOK";

          const newBooking: AmenityBooking = {
            id: generateId(bookings).toString(),
            amenityId: bookingData.amenityId || "",
            amenityName: amenity?.name || "",
            amenityType: (amenity?.amenityType as AmenityType) || "other",
            tenantId: auth.currentUser!.id,
            buildingId: bookingData.buildingId || "building-1",
            slotDate:
              bookingData.slotDate || new Date().toISOString().split("T")[0],
            slotTimeStart: bookingData.slotTimeStart || "09:00",
            slotTimeEnd: bookingData.slotTimeEnd || "10:00",
            status: "confirmed",
            numberOfGuests: bookingData.numberOfGuests || 1,
            bookingNotes: bookingData.bookingNotes || "",
            bookingCode: `${amenityPrefix}-${dateStr}-${String(bookingCount).padStart(3, "0")}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setBookings((prev) => [...prev, newBooking]);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Booking Confirmed",
            `Your ${amenity?.name || "amenity"} booking has been confirmed for ${bookingData.slotDate}`,
            "success",
          );

          resolve(newBooking);
        }, 500);
      });
    },
    [amenities, bookings, auth.currentUser, notifications.actions],
  );

  const getBookings = useCallback(
    (filter?: { status?: BookingStatus; amenityType?: AmenityType }) => {
      if (!auth.currentUser) return [];

      let filtered = bookings.filter(
        (booking) => booking.tenantId === auth.currentUser!.id,
      );

      if (filter?.status) {
        filtered = filtered.filter((b) => b.status === filter.status);
      }

      if (filter?.amenityType) {
        filtered = filtered.filter((b) => b.amenityType === filter.amenityType);
      }

      return filtered;
    },
    [bookings, auth.currentUser],
  );

  const cancelBooking = useCallback(
    async (bookingId: string, reason: string): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          setBookings((prev) =>
            prev.map((booking) =>
              booking.id === bookingId
                ? {
                    ...booking,
                    status: "cancelled" as BookingStatus,
                    cancelledReason: reason,
                    updatedAt: new Date().toISOString(),
                  }
                : booking,
            ),
          );

          const booking = bookings.find((b) => b.id === bookingId);
          if (booking && auth.currentUser) {
            notifications.actions.createNotification(
              auth.currentUser.id,
              "Booking Cancelled",
              `Your ${booking.amenityName} booking has been cancelled`,
              "info",
            );
          }

          resolve();
        }, 500);
      });
    },
    [bookings, auth.currentUser, notifications.actions],
  );

  // Visitor actions
  const registerVisitor = useCallback(
    async (visitorData: Partial<Visitor>): Promise<Visitor> => {
      if (!auth.currentUser) {
        return Promise.reject(
          new Error("User must be authenticated to register visitors"),
        );
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const date = new Date();
          const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
          const visitorCount = visitors.length + 1;

          const newVisitor: Visitor = {
            id: generateId(visitors).toString(),
            tenantId: auth.currentUser!.id,
            buildingId: visitorData.buildingId || "building-1",
            unitNumber:
              auth.currentUser!.profile?.apartment ||
              visitorData.unitNumber ||
              "",
            visitorName: visitorData.visitorName || "",
            visitorPhone: visitorData.visitorPhone || "",
            visitorIdType: visitorData.visitorIdType || "national_id",
            visitorIdNumber: visitorData.visitorIdNumber || "",
            visitPurpose: visitorData.visitPurpose || "",
            expectedArrivalTime:
              visitorData.expectedArrivalTime || new Date().toISOString(),
            expectedDepartureTime:
              visitorData.expectedDepartureTime ||
              new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            status: "expected",
            visitorCode: `VST-${dateStr}-${String(visitorCount).padStart(3, "0")}`,
            qrCodeUrl: `https://example.com/qr/VST-${dateStr}-${String(visitorCount).padStart(3, "0")}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setVisitors((prev) => [...prev, newVisitor]);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Visitor Registered",
            `${visitorData.visitorName} has been registered as a visitor`,
            "success",
          );

          resolve(newVisitor);
        }, 500);
      });
    },
    [visitors, auth.currentUser, notifications.actions],
  );

  const getVisitors = useCallback(
    (filter?: { status?: VisitorStatus }) => {
      if (!auth.currentUser) return [];

      let filtered = visitors.filter(
        (visitor) => visitor.tenantId === auth.currentUser!.id,
      );

      if (filter?.status) {
        filtered = filtered.filter((v) => v.status === filter.status);
      }

      return filtered;
    },
    [visitors, auth.currentUser],
  );

  const cancelVisitor = useCallback(
    async (visitorId: string): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          setVisitors((prev) =>
            prev.map((visitor) =>
              visitor.id === visitorId
                ? {
                    ...visitor,
                    status: "cancelled" as VisitorStatus,
                    updatedAt: new Date().toISOString(),
                  }
                : visitor,
            ),
          );

          const visitor = visitors.find((v) => v.id === visitorId);
          if (visitor && auth.currentUser) {
            notifications.actions.createNotification(
              auth.currentUser.id,
              "Visitor Registration Cancelled",
              `Registration for ${visitor.visitorName} has been cancelled`,
              "info",
            );
          }

          resolve();
        }, 500);
      });
    },
    [visitors, auth.currentUser, notifications.actions],
  );

  const getVisitorPasses = useCallback(() => visitorPasses, [visitorPasses]);

  const getVisitorPassesByBuilding = useCallback(
    (buildingId: string) =>
      visitorPasses.filter((pass) => pass.buildingId === buildingId),
    [visitorPasses],
  );

  const mutateVisitorPass = useCallback(
    async (
      passId: string,
      updates: Partial<VisitorPass>,
    ): Promise<VisitorPass> => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedPass: VisitorPass | undefined;

          setVisitorPasses((prev) =>
            prev.map((pass) => {
              if (pass.id === passId) {
                updatedPass = {
                  ...pass,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                };
                return updatedPass;
              }
              return pass;
            }),
          );

          if (!updatedPass) {
            reject(new Error("Visitor pass not found"));
            return;
          }

          resolve(updatedPass);
        }, 200);
      });
    },
    [],
  );

  const approveVisitorPass = useCallback(
    async (passId: string): Promise<VisitorPass> =>
      mutateVisitorPass(passId, { status: "approved" }),
    [mutateVisitorPass],
  );

  const rejectVisitorPass = useCallback(
    async (
      passId: string,
      notes?: string,
    ): Promise<VisitorPass> =>
      mutateVisitorPass(passId, { status: "rejected", notes }),
    [mutateVisitorPass],
  );

  const markVisitorPassCheckIn = useCallback(
    async (
      passId: string,
      timestamp: string = new Date().toISOString(),
    ): Promise<VisitorPass> =>
      mutateVisitorPass(passId, {
        status: "checked_in",
        scheduledStart: timestamp,
      }),
    [mutateVisitorPass],
  );

  const markVisitorPassComplete = useCallback(
    async (
      passId: string,
      timestamp: string = new Date().toISOString(),
    ): Promise<VisitorPass> =>
      mutateVisitorPass(passId, {
        status: "completed",
        scheduledEnd: timestamp,
      }),
    [mutateVisitorPass],
  );

  const cancelVisitorPass = useCallback(
    async (
      passId: string,
      notes?: string,
    ): Promise<VisitorPass> =>
      mutateVisitorPass(passId, {
        status: "cancelled",
        notes,
      }),
    [mutateVisitorPass],
  );

  // Rating actions
  const submitRating = useCallback(
    async (ratingData: Partial<Rating>): Promise<Rating> => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (!auth.currentUser) {
            reject(new Error("User must be authenticated to submit ratings"));
            return;
          }

          // Validate request is completed
          const request = requests.requests.find(
            (r) => r.id === ratingData.requestId,
          );
          if (!request) {
            reject(new Error("Request not found"));
            return;
          }

          if (request.status !== "completed") {
            reject(new Error("Can only rate completed requests"));
            return;
          }

          // Check if already rated
          const existingRating = ratings.find(
            (r) => r.requestId === ratingData.requestId,
          );
          if (existingRating) {
            reject(new Error("Request has already been rated"));
            return;
          }

          const newRating: Rating = {
            id: generateId(ratings).toString(),
            tenantId: auth.currentUser.id,
            requestId: ratingData.requestId || "",
            serviceProviderId:
              ratingData.serviceProviderId || request.assignedTo || "",
            buildingEmployeeId: ratingData.buildingEmployeeId,
            rating: ratingData.rating || 5,
            reviewText: ratingData.reviewText || "",
            attachments: ratingData.attachments || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setRatings((prev) => [...prev, newRating]);

          // Create notification
          notifications.actions.createNotification(
            auth.currentUser.id,
            "Rating Submitted",
            `Thank you for rating the service for "${request.title}"`,
            "success",
          );

          resolve(newRating);
        }, 500);
      });
    },
    [ratings, requests.requests, auth.currentUser, notifications.actions],
  );

  const getRatings = useCallback(() => {
    if (!auth.currentUser) return [];

    if (auth.currentUser.role === "super_admin") {
      return buildings.map((building) => building.id);
    }
    return ratings.filter((rating) => rating.tenantId === auth.currentUser!.id);
  }, [ratings, auth.currentUser]);

  const getRatingByRequestId = useCallback(
    (requestId: string) => {
      return ratings.find((rating) => rating.requestId === requestId);
    },
    [ratings],
  );

  // Admin actions - Users
  const getUsers = useCallback(() => {
    return Object.values(auth.users);
  }, [auth.users]);

  const createUser = useCallback(
    async (userData: CreateUserDTO): Promise<User> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can create users"));
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const newUser: User = {
            id: generateId(Object.values(auth.users)).toString(),
            email: userData.email,
            name: userData.name,
            role: userData.role,
            profile: {
              name: userData.name,
              phone: userData.phone,
              apartment: userData.apartment,
              tower: userData.tower,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          auth.actions.addUser(userData.email, newUser);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "User Created",
            `New ${userData.role} user "${userData.name}" has been created`,
            "success",
          );

          resolve(newUser);
        }, 500);
      });
    },
    [auth.currentUser, auth.users, auth.actions, notifications.actions],
  );

  const updateUser = useCallback(
    async (userId: string, updates: UpdateUserDTO): Promise<User> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can update users"));
      }

      const existingUser =
        auth.users[userId] ||
        Object.values(auth.users).find((u) => u.id === userId);

      if (!existingUser) {
        return Promise.reject(new Error("User not found"));
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          const updatedUser: User = {
            ...existingUser,
            ...updates,
            profile: {
              ...existingUser.profile,
              name: updates.name || existingUser.profile?.name,
              phone: updates.phone || existingUser.profile?.phone,
              apartment: updates.apartment || existingUser.profile?.apartment,
              tower: updates.tower || existingUser.profile?.tower,
            },
            updatedAt: new Date().toISOString(),
          };

          auth.actions.updateUser(updatedUser.email, updatedUser);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "User Updated",
            `User "${updatedUser.name}" has been updated`,
            "success",
          );

          resolve(updatedUser);
        }, 500);
      });
    },
    [auth.currentUser, auth.users, auth.actions, notifications.actions],
  );

  const deleteUser = useCallback(
    async (userId: string): Promise<void> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can delete users"));
      }

      const userRecord =
        auth.users[userId] ||
        Object.values(auth.users).find((u) => u.id === userId);

      if (!userRecord) {
        return Promise.reject(new Error("User not found"));
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          auth.actions.deleteUser(userRecord.email);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "User Deleted",
            `User "${userRecord.name || userRecord.email}" has been deleted`,
            "info",
          );

          resolve();
        }, 500);
      });
    },
    [auth.currentUser, auth.users, auth.actions, notifications.actions],
  );

  // Admin actions - Buildings
  const getBuildings = useCallback(() => {
    return buildings;
  }, [buildings]);

  const getBuildingById = useCallback(
    (id: string) => {
      return buildings.find((building) => building.id === id);
    },
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

          if (
            manager &&
            buildings.some((building) => building.managerId === manager.id)
          ) {
            reject(
              new Error(
                `${manager.name} is already managing another building.`,
              ),
            );
            return;
          }

          const newBuilding: Building = {
            id: `building-${generateId(buildings)}`,
            name: buildingData.name,
            address: buildingData.address,
            city: buildingData.city,
            country: buildingData.country,
            managerId: buildingData.managerId,
            managerName: manager?.name,
            totalUnits: buildingData.totalUnits,
            occupiedUnits: 0,
            amenities: buildingData.amenities || [],
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setBuildings((prev) => [...prev, newBuilding]);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Building Created",
            `New building "${buildingData.name}" has been created`,
            "success",
          );

          resolve(newBuilding);
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
        !["admin", "management", "super_admin"].includes(
          auth.currentUser.role,
        )
      ) {
        return Promise.reject(
          new Error("Only admins and management can update buildings"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          if (updates.managerId) {
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

  // Admin actions - Jobs
  const getJobs = useCallback(
    (filter?: { status?: Job["status"]; buildingId?: string; assignedTo?: string }) => {
      let filtered = jobs;

      if (filter?.status) {
        filtered = filtered.filter((j) => j.status === filter.status);
      }

      if (filter?.buildingId) {
        filtered = filtered.filter((j) => j.buildingId === filter.buildingId);
      }

      if (filter?.assignedTo) {
        filtered = filtered.filter((j) => j.assignedTo === filter.assignedTo);
      }

      return filtered;
    },
    [jobs],
  );

  const getJobById = useCallback(
    (id: string) => {
      return jobs.find((job) => job.id === id);
    },
    [jobs],
  );

  const createJob = useCallback(
    async (jobData: CreateJobDTO): Promise<Job> => {
      if (
        !auth.currentUser ||
        !["admin", "management", "super_admin"].includes(
          auth.currentUser.role,
        )
      ) {
        return Promise.reject(
          new Error("Only admins and management can create jobs"),
        );
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const building = buildings.find((b) => b.id === jobData.buildingId);
          if (!building) {
            reject(new Error("Building not found"));
            return;
          }

          const assignedIdentity = resolveServiceProviderIdentity(
            jobData.assignedTo,
          );

          if (jobData.assignedTo && !assignedIdentity) {
            reject(new Error("Assigned service provider not found"));
            return;
          }

          const costBreakdown: JobCostBreakdownItem[] =
            jobData.costBreakdown?.map((item, index) => ({
              id: item.id ?? `job-${Date.now()}-cost-${index}`,
              label: item.label,
              amount: item.amount,
              category: item.category,
              description: item.description,
            })) ?? [];

          const complianceChecklist: JobComplianceChecklistItem[] =
            jobData.complianceChecklist?.map((item, index) => ({
              id: item.id ?? `job-${Date.now()}-check-${index}`,
              label: item.label,
              description: item.description,
              completed: item.completed ?? false,
              completedAt: item.completedAt,
              completedBy: item.completedBy,
              notes: item.notes,
            })) ?? [];

          const newJob: Job = {
            id: `job-${generateId(jobs)}`,
            requestId: jobData.requestId,
            title: jobData.title,
            description: jobData.description,
            type: jobData.type,
            status: assignedIdentity ? "assigned" : "pending",
            priority: jobData.priority,
            buildingId: jobData.buildingId,
            buildingName: building.name,
            unitNumber: jobData.unitNumber,
            assignedTo: assignedIdentity?.id,
            assignedToName: assignedIdentity?.name,
            createdBy: auth.currentUser!.id,
            attachments: jobData.attachments || [],
            notes: [],
            estimatedCost: jobData.estimatedCost,
            scheduledDate: jobData.scheduledDate,
            costBreakdown,
            complianceChecklist,
            assignmentHistory: assignedIdentity
              ? [
                  {
                    id: `job-assign-${Date.now()}`,
                    serviceProviderId: assignedIdentity.id,
                    serviceProviderName: assignedIdentity.name,
                    assignedBy: auth.currentUser!.id,
                    assignedByName:
                      auth.currentUser!.name || auth.currentUser!.email || "",
                    assignedAt: new Date().toISOString(),
                    scheduledDate: jobData.scheduledDate,
                    status: "pending",
                    notes: jobData.description,
                  },
                ]
              : [],
            assignmentQueue: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setJobs((prev) => [...prev, newJob]);

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Job Created",
            `New job "${jobData.title}" has been created`,
            "success",
          );

          if (jobData.assignedTo && assignedIdentity) {
            notifications.actions.createNotification(
              assignedIdentity.notificationTargetId,
              "Job Assigned",
              `You have been assigned to job: ${jobData.title}`,
              "info",
            );
          }

          resolve(newJob);
        }, 500);
      });
    },
    [
      jobs,
      buildings,
      auth.currentUser,
      notifications.actions,
      resolveServiceProviderIdentity,
    ],
  );

  const updateJobStatus = useCallback(
    async (jobId: string, status: Job["status"]): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId) {
                const history = [...(job.assignmentHistory ?? [])];
                const updateAssignmentStatus = () => {
                  if (!history.length) return history;
                  const last = history[history.length - 1];
                  let assignmentStatus = last.status;
                  if (status === "assigned") {
                    assignmentStatus = "pending";
                  } else if (status === "in-progress") {
                    assignmentStatus = "accepted";
                  } else if (status === "completed") {
                    assignmentStatus = "completed";
                  } else if (status === "cancelled") {
                    assignmentStatus = "declined";
                  }

                  history[history.length - 1] = {
                    ...last,
                    status: assignmentStatus,
                  };
                  return history;
                };

                updatedJob = {
                  ...job,
                  status,
                  completedDate:
                    status === "completed"
                      ? new Date().toISOString()
                      : job.completedDate,
                  updatedAt: new Date().toISOString(),
                  assignmentHistory: updateAssignmentStatus(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Job Status Updated",
            `Job "${updatedJob.title}" status changed to ${status}`,
            "success",
          );

          if (updatedJob.assignedTo) {
            notifications.actions.createNotification(
              updatedJob.assignedTo,
              "Job Status Updated",
              `Job "${updatedJob.title}" status changed to ${status}`,
              "info",
            );
          }

          resolve(updatedJob);
        }, 500);
      });
    },
    [jobs, auth.currentUser, notifications.actions],
  );

  const bulkUpdateJobStatus = useCallback(
    async ({ jobIds, status, updatedBy, notes }: BulkUpdateJobStatusDTO) => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      return new Promise<Job[]>((resolve, reject) => {
        setTimeout(() => {
          const ids = new Set(jobIds);
          const updatedJobs: Job[] = [];

          setJobs((prev) =>
            prev.map((job) => {
              if (!ids.has(job.id)) {
                return job;
              }

              const history = [...(job.assignmentHistory ?? [])];
              if (history.length) {
                const last = history[history.length - 1];
                let assignmentStatus = last.status;
                if (status === "assigned") {
                  assignmentStatus = "pending";
                } else if (status === "in-progress") {
                  assignmentStatus = "accepted";
                } else if (status === "completed") {
                  assignmentStatus = "completed";
                } else if (status === "cancelled") {
                  assignmentStatus = "declined";
                }
                history[history.length - 1] = {
                  ...last,
                  status: assignmentStatus,
                  notes: notes ?? last.notes,
                };
              }

              const nextJob: Job = {
                ...job,
                status,
                completedDate:
                  status === "completed"
                    ? new Date().toISOString()
                    : job.completedDate,
                updatedAt: new Date().toISOString(),
                assignmentHistory: history,
              };

              updatedJobs.push(nextJob);
              return nextJob;
            }),
          );

          if (!updatedJobs.length) {
            reject(new Error("No matching jobs found for bulk update"));
            return;
          }

          notifications.actions.createNotification(
            updatedBy,
            "Jobs Updated",
            `Updated ${updatedJobs.length} job${updatedJobs.length > 1 ? "s" : ""} to status ${status}.`,
            "info",
          );

          resolve(updatedJobs);
        }, 400);
      });
    },
    [jobs, auth.currentUser, notifications.actions],
  );

  const assignJob = useCallback(
    async (
      jobId: string,
      serviceProviderId: string,
      scheduledDate?: string,
    ): Promise<Job> => {
      if (
        !auth.currentUser ||
        !["admin", "management", "super_admin"].includes(
          auth.currentUser.role,
        )
      ) {
        return Promise.reject(
          new Error("Only admins and management can assign jobs"),
        );
      }

      const serviceProvider =
        resolveServiceProviderIdentity(serviceProviderId);

      if (!serviceProvider) {
        return Promise.reject(new Error("Service provider not found"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId) {
                const assignmentRecord: JobAssignmentRecord = {
                  id: `job-${jobId}-assign-${Date.now()}`,
                  serviceProviderId: serviceProvider.id,
                  serviceProviderName: serviceProvider.name,
                  assignedBy: auth.currentUser!.id,
                  assignedByName:
                    auth.currentUser!.name || auth.currentUser!.email || "",
                  assignedAt: new Date().toISOString(),
                  scheduledDate: scheduledDate || job.scheduledDate,
                  status: "pending",
                  notes: undefined,
                };

                const filteredQueue = (job.assignmentQueue ?? []).filter(
                  (record) => record.serviceProviderId !== serviceProvider.id,
                );

                updatedJob = {
                  ...job,
                  assignedTo: serviceProvider.id,
                  assignedToName: serviceProvider.name,
                  status: "assigned",
                  scheduledDate: scheduledDate || job.scheduledDate,
                  updatedAt: new Date().toISOString(),
                  assignmentHistory: [
                    ...(job.assignmentHistory ?? []),
                    assignmentRecord,
                  ],
                  assignmentQueue: filteredQueue,
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Job Assigned",
            `Job "${updatedJob.title}" assigned to ${serviceProvider.name}`,
            "success",
          );

          notifications.actions.createNotification(
            serviceProvider.notificationTargetId,
            "Job Assigned",
            `You have been assigned to job: ${updatedJob.title}`,
            "info",
          );

          resolve(updatedJob);
        }, 500);
      });
    },
    [
      jobs,
      auth.currentUser,
      notifications.actions,
      resolveServiceProviderIdentity,
    ],
  );

  const queueJobAssignment = useCallback(
    async (payload: QueueJobAssignmentDTO): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      const serviceProvider = resolveServiceProviderIdentity(
        payload.serviceProviderId,
      );

      if (!serviceProvider) {
        return Promise.reject(new Error("Service provider not found"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== payload.jobId) {
                return job;
              }

              const record: JobAssignmentRecord = {
                id: `job-${payload.jobId}-queue-${Date.now()}`,
                serviceProviderId: serviceProvider.id,
                serviceProviderName: serviceProvider.name,
                assignedBy: auth.currentUser!.id,
                assignedByName:
                  auth.currentUser!.name || auth.currentUser!.email || "",
                assignedAt: new Date().toISOString(),
                scheduledDate: payload.scheduledDate,
                status: "pending",
                notes: payload.notes,
              };

              updatedJob = {
                ...job,
                assignmentQueue: [...(job.assignmentQueue ?? []), record],
                updatedAt: new Date().toISOString(),
              };

              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          resolve(updatedJob);
        }, 250);
      });
    },
    [jobs, auth.currentUser, resolveServiceProviderIdentity],
  );

  const promoteQueuedJobAssignment = useCallback(
    async (jobId: string): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      return new Promise((resolve, reject) => {
        let promoted = false;
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id !== jobId) {
                return job;
              }

              const [nextAssignment, ...remainingQueue] =
                job.assignmentQueue ?? [];

              if (!nextAssignment) {
                return job;
              }

              const assignmentRecord: JobAssignmentRecord = {
                ...nextAssignment,
                id: `job-${jobId}-assign-${Date.now()}`,
                assignedBy: auth.currentUser!.id,
                assignedByName:
                  auth.currentUser!.name || auth.currentUser!.email || "",
                assignedAt: new Date().toISOString(),
                status: "pending",
              };

              updatedJob = {
                ...job,
                assignedTo: nextAssignment.serviceProviderId,
                assignedToName: nextAssignment.serviceProviderName,
                status: "assigned",
                scheduledDate:
                  nextAssignment.scheduledDate || job.scheduledDate,
                assignmentHistory: [
                  ...(job.assignmentHistory ?? []),
                  assignmentRecord,
                ],
                assignmentQueue: remainingQueue,
                updatedAt: new Date().toISOString(),
              };

              promoted = true;

              return updatedJob;
            }),
          );

          if (!updatedJob) {
            reject(new Error("Job not found"));
            return;
          }

          if (!promoted) {
            reject(new Error("No queued assignments available"));
            return;
          }

          resolve(updatedJob);
        }, 300);
      });
    },
    [jobs, auth.currentUser],
  );

  const updateJob = useCallback(
    async (jobId: string, updates: UpdateJobDTO): Promise<Job> => {
      if (!auth.currentUser) {
        return Promise.reject(new Error("User must be authenticated"));
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId) {
                const {
                  costBreakdown: costUpdates,
                  complianceChecklist: checklistUpdates,
                  ...otherUpdates
                } = updates;

                const normalizedCostBreakdown: JobCostBreakdownItem[] =
                  costUpdates?.map((item, index) => ({
                    id: item.id ?? `job-${jobId}-cost-${Date.now()}-${index}`,
                    label: item.label ?? "Cost Item",
                    amount: item.amount ?? 0,
                    category: item.category,
                    description: item.description,
                  })) ?? job.costBreakdown ?? [];

                const normalizedChecklist: JobComplianceChecklistItem[] =
                  checklistUpdates?.map((item, index) => ({
                    id:
                      item.id ??
                      `job-${jobId}-check-${Date.now()}-${index}`,
                    label: item.label ?? "Checklist Item",
                    description: item.description,
                    completed: item.completed ?? false,
                    completedAt: item.completedAt,
                    completedBy: item.completedBy,
                    notes: item.notes,
                  })) ?? job.complianceChecklist ?? [];

                const assignedUser =
                  otherUpdates.assignedTo !== undefined
                    ? auth.users[otherUpdates.assignedTo] ||
                      Object.values(auth.users).find(
                        (u) => u.id === otherUpdates.assignedTo,
                      )
                    : job.assignedTo
                        ? auth.users[job.assignedTo] ||
                          Object.values(auth.users).find(
                            (u) => u.id === job.assignedTo,
                          )
                        : undefined;

                if (otherUpdates.assignedTo && !assignedUser) {
                  return job;
                }

                updatedJob = {
                  ...job,
                  ...otherUpdates,
                  costBreakdown: normalizedCostBreakdown,
                  complianceChecklist: normalizedChecklist,
                  assignedTo: assignedUser ? assignedUser.id : job.assignedTo,
                  assignedToName: assignedUser?.name,
                  updatedAt: new Date().toISOString(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (!updatedJob) {
            reject(
              updates.assignedTo
                ? new Error("Assigned user not found")
                : new Error("Job not found"),
            );
            return;
          }

          notifications.actions.createNotification(
            auth.currentUser!.id,
            "Job Updated",
            `Job "${updatedJob.title}" has been updated`,
            "success",
          );

          resolve(updatedJob);
        }, 500);
      });
    },
    [jobs, auth.currentUser, auth.users, notifications.actions],
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

  const getRequestsByBuilding = useCallback(
    (buildingId: string) => {
      if (!buildingId) return [];
      return (requests.requests || []).filter(
        (req) => req.buildingId === buildingId,
      );
    },
    [requests.requests],
  );

  const getBookingsByBuilding = useCallback(
    (buildingId: string) => {
      if (!buildingId) return [];
      return bookings.filter((booking) => booking.buildingId === buildingId);
    },
    [bookings],
  );

  const getVisitorsByBuilding = useCallback(
    (buildingId: string) => {
      if (!buildingId) return [];
      return visitors.filter((visitor) => visitor.buildingId === buildingId);
    },
    [visitors],
  );

  const getManagementAnalytics = useCallback(
    (buildingId: string) => {
      if (!buildingId) return null;

      const building = buildings.find((b) => b.id === buildingId);
      const buildingRequests = getRequestsByBuilding(buildingId);
      const buildingJobs = getJobs({ buildingId });
      const buildingBookings = getBookingsByBuilding(buildingId);
      const buildingVisitors = getVisitorsByBuilding(buildingId);

      const now = new Date();
      const todayDate = now.toISOString().split("T")[0];
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);

      const totalRequests = buildingRequests.length;
      const pendingRequests = buildingRequests.filter(
        (req) => req.status === "pending",
      ).length;
      const inProgressRequests = buildingRequests.filter(
        (req) => req.status === "in-progress",
      ).length;
      const completedRequests = buildingRequests.filter(
        (req) => req.status === "completed",
      ).length;
      const completedThisWeek = buildingRequests.filter((req) => {
        if (req.status !== "completed") return false;
        const updated = new Date(req.updatedAt);
        return updated >= sevenDaysAgo;
      }).length;
      const completionRate =
        totalRequests > 0
          ? Math.round((completedRequests / totalRequests) * 100)
          : 0;

      const openJobs = buildingJobs.filter((job) => job.status !== "completed");
      const jobsInProgress = buildingJobs.filter((job) =>
        ["in-progress", "assigned"].includes(job.status),
      ).length;

      const bookingsToday = buildingBookings.filter(
        (booking) => booking.slotDate === todayDate,
      );
      const upcomingBookings = buildingBookings
        .filter((booking) => booking.slotDate >= todayDate)
        .sort((a, b) => a.slotDate.localeCompare(b.slotDate))
        .slice(0, 5);

      const expectedVisitors = buildingVisitors
        .filter((visitor) => visitor.status === "expected")
        .sort(
          (a, b) =>
            new Date(a.expectedArrivalTime).getTime() -
            new Date(b.expectedArrivalTime).getTime(),
        );

      const visitorsToday = expectedVisitors.filter((visitor) => {
        const arrivalDate = visitor.expectedArrivalTime.split("T")[0];
        return arrivalDate === todayDate;
      });

      const requestsToday = buildingRequests
        .filter((req) => req.createdAt.split("T")[0] === todayDate)
        .slice(0, 5);

      const activeJobs = openJobs.slice(0, 5);

      const occupancyRate =
        building && building.totalUnits
          ? Math.round((building.occupiedUnits / building.totalUnits) * 100)
          : analytics.occupancyRate;

      return {
        building,
        metrics: {
          totalRequests,
          pendingRequests,
          inProgressRequests,
          completedThisWeek,
          completionRate,
          openJobsCount: openJobs.length,
          jobsInProgress,
          bookingsToday: bookingsToday.length,
          upcomingBookingsCount: upcomingBookings.length,
          visitorsToday: visitorsToday.length,
          occupancyRate,
        },
        lists: {
          requestsToday,
          upcomingBookings,
          visitorsToday,
          activeJobs,
        },
      };
    },
    [
      analytics.occupancyRate,
      buildings,
      getBookingsByBuilding,
      getJobs,
      getRequestsByBuilding,
      getVisitorsByBuilding,
    ],
  );

  // Admin actions - Analytics
  const getAnalytics = useCallback(() => {
    // In a real app, this would calculate from actual data
    return analytics;
  }, [analytics]);

  // Admin actions - Permissions
  const getPermissions = useCallback(() => {
    return rolePermissions;
  }, [rolePermissions]);

  const getPermissionsByRole = useCallback(
    (role: User["role"]) => {
      return rolePermissions.find((rp) => rp.role === role);
    },
    [rolePermissions],
  );

  return {
    // Auth state
    isAuthenticated: auth.isAuthenticated,
    currentUser: auth.currentUser,
    userRole: auth.userRole,
    users: auth.users,

    // Request state
    requests: requests.requests,
    selectedRequest: requests.selectedRequest,

    // Notification state
    notifications: notifications.notifications,
    unreadCount: notifications.unreadCount,

    // Notices state
    notices: notices.notices,
    selectedNotice: notices.selectedNotice,
    activeNoticesCount: notices.activeNoticesCount,
    maintenanceNotices: notices.notices, // Legacy compatibility

    // New state - Amenities, Bookings, Visitors, Ratings
    amenities,
    amenityConfigs,
    bookings,
    visitors,
    visitorPasses,
    ratings,

    // Admin state - Buildings, Jobs, Analytics, Permissions
    buildings,
    jobs,
    analytics,
    rolePermissions,
    unitTypes,
    buildingUnits,
    leases,
    buildingEmployees,
    serviceProviders,
    visitorLogs,
    ratingSummaries,

    // Combined loading state
    loading:
      auth.loading ||
      requests.loading ||
      notifications.loading ||
      notices.loading,

    // Combined error state
    error: auth.error || requests.error || notifications.error || notices.error,

    // All actions
    actions: {
      // Auth actions
      setAuth: auth.actions.setAuth,
      login: auth.actions.login,
      register: auth.actions.register,
      logout: auth.actions.logout,
      updateProfile: auth.actions.updateProfile,
      updateUser: auth.actions.updateUser,
      addUser: auth.actions.addUser,
      deleteUser: auth.actions.deleteUser,

      // Request actions
      createRequest: (requestData: any) => {
        if (!auth.currentUser) {
          return Promise.reject(
            new Error("User must be authenticated to create requests"),
          );
        }
        return requests.actions.createRequest(
          requestData,
          auth.currentUser.id,
        );
      },
      updateRequest: requests.actions.updateRequest,
      deleteRequest: requests.actions.deleteRequest,
      setSelectedRequest: requests.actions.setSelectedRequest,
      addRequestMessage: requests.actions.addRequestMessage,
      addRequestNote: requests.actions.addRequestNote,
      logTimelineEvent: requests.actions.logTimelineEvent,

      // Notification actions
      createNotification: notifications.actions.createNotification,
      broadcastNotificationToRole: (
        role: any,
        title: string,
        message: string,
        type?: any,
      ) =>
        notifications.actions.broadcastNotificationToRole(
          role,
          title,
          message,
          type,
          auth.users,
        ),
      markNotificationAsRead: notifications.actions.markNotificationAsRead,
      markAllNotificationsAsRead:
        notifications.actions.markAllNotificationsAsRead,
      deleteNotification: notifications.actions.deleteNotification,
      deleteAllNotifications: notifications.actions.deleteAllNotifications,

      // Notice actions
      createNotice: notices.actions.createNotice,
      updateNotice: notices.actions.updateNotice,
      deleteNotice: notices.actions.deleteNotice,
      setSelectedNotice: notices.actions.setSelectedNotice,

      // Amenity actions
      getAmenities,
      getAmenityById,
      getAmenityConfigs,
      getAmenityConfigsByBuilding,
      updateAmenityConfig,
      getUnitTypes,
      getUnitTypeById,
      createUnitType,
      updateUnitType,
      deleteUnitType,
      getUnitsByBuilding,
      getUnitById,

      // Booking actions
      createBooking,
      getBookings,
      cancelBooking,

      // Visitor actions
      registerVisitor,
      getVisitors,
      cancelVisitor,
      getVisitorPasses,
      getVisitorPassesByBuilding,
      approveVisitorPass,
      rejectVisitorPass,
      markVisitorPassCheckIn,
      markVisitorPassComplete,
      cancelVisitorPass,

      // Rating actions
      submitRating,
      getRatings,
      getRatingByRequestId,

      // Admin actions - Users
      getUsers,
      createUser,
      adminUpdateUser: updateUser,
      adminDeleteUser: deleteUser,

      // Admin actions - Buildings
      getBuildings,
      getBuildingById,
      createBuilding,
      updateBuilding,
      deleteBuilding,
      getBuildingEmployees,
      getServiceProviders,
      getVisitorLogsByBuilding,
      getRatingSummaries,
      createUnit,
      deleteUnit,
      updateUnit,
      addBuildingEmployee,
      updateBuildingEmployee,
      removeBuildingEmployee,
      addVisitorLog,
      updateVisitorLog,
      upsertRatingSummary,

      // Lease actions
      getLeases,
      getLeaseById,
      getLeasesByBuilding,
      getLeasesByTenant,
      createLease,
      updateLease,
      terminateLease,

      // Admin actions - Jobs
      getJobs,
      getJobById,
      createJob,
      updateJobStatus,
      bulkUpdateJobStatus,
      assignJob,
      queueJobAssignment,
      promoteQueuedJobAssignment,
      updateJob,

      // Admin actions - Analytics
      getAnalytics,
      getManagementAnalytics,

      // Admin actions - Permissions
      getPermissions,
      getPermissionsByRole,

      // Management helpers
      getManagedBuildingIds,
      getManagedBuildings,
      getRequestsByBuilding,
      getBookingsByBuilding,
      getVisitorsByBuilding,

      // Utility actions
      setLoading: (loading: boolean) => {
        auth.actions.setLoading(loading);
        requests.actions.setLoading(loading);
        notifications.actions.setLoading(loading);
        notices.actions.setLoading(loading);
      },
      setError: (error: string) => {
        auth.actions.setError(error);
        requests.actions.setError(error);
        notifications.actions.setError(error);
        notices.actions.setError(error);
      },
      clearError: () => {
        auth.actions.clearError();
        requests.actions.clearError();
        notifications.actions.clearError();
        notices.actions.clearError();
      },

      // Legacy compatibility
      refreshData: () => {
        auth.actions.clearError();
        requests.actions.clearError();
        notifications.actions.clearError();
      },
      goToHome: () => {
        // Legacy navigation helper - can be implemented as needed
      },
    },
  };
};

// Re-export individual hooks
export { useAuth, useRequests, useNotifications, useNotices };
