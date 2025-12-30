import { useCallback, useState, useEffect } from "react";

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
// No mock data imports - all data comes from API
import { generateId } from "../../utils";
import type { AuthContextType } from "../auth-context";
import type { NotificationsContextType } from "../notifications-context";
import {
  buildingsStorage,
  unitTypesStorage,
  serviceProvidersStorage,
} from "../../services/storage/localStorageService";
import { adminApi } from "../../services/api/admin";
import { cacheService, CACHE_KEYS, DEFAULT_TTL } from "../../services/storage/cacheService";

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
  getBuildingWithManager: (id: string) => Promise<Building | undefined>;
  createBuilding: (buildingData: CreateBuildingDTO) => Promise<Building>;
  updateBuilding: (
    buildingId: string,
    updates: UpdateBuildingDTO,
  ) => Promise<Building>;
  deleteBuilding: (buildingId: string) => Promise<void>;
  assignManagerToBuilding: (buildingId: string, managerId: string) => Promise<void>;
  assignAdminToBuilding: (buildingId: number, adminId: number) => Promise<void>;
  assignMaintenanceStaffToBuilding: (buildingId: number, staffId: number) => Promise<void>;
  getBuildingAdmins: (buildingId: number) => Promise<any[]>;
  getTenantsByBuilding: (buildingId: number | string) => Promise<User[]>;
  getAdminBuildings: (adminId: number) => Promise<any[]>;
  removeAdminFromBuilding: (buildingId: number, adminId: number) => Promise<void>;
  getAdminAssignedBuildingIds: () => string[];
  getAdminAssignedBuildings: () => Building[];
  refreshBuildings: () => Promise<void>;
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
    password?: string;
    address?: string;
    nationality?: string;
    companyName?: string;
    jobTitle?: string;
    skills?: string;
  }) => Promise<{ user: User; profile: ServiceProviderProfile }>;
  updateServiceProvider: (
    id: string,
    updates: Partial<Pick<ServiceProviderProfile, "name" | "email" | "phone" | "specialty">>,
  ) => Promise<ServiceProviderProfile>;
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
  // Initialize with empty arrays - data will be loaded from AsyncStorage or mock data
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [buildingUnits, setBuildingUnits] = useState<BuildingUnit[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [buildingEmployees, setBuildingEmployees] = useState<BuildingEmployee[]>([]);
  const [serviceProviders, setServiceProviders] = useState<ServiceProviderProfile[]>([]);
  const [serviceProviderAssignments, setServiceProviderAssignments] =
    useState<ServiceProviderBuildingAssignment[]>([]);
  const [providerAccessRequests, setProviderAccessRequests] =
    useState<ProviderAccessRequest[]>([]);
  const [adminAssignedBuildingIds, setAdminAssignedBuildingIds] = useState<string[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data from AsyncStorage on mount (per-user scope)
  useEffect(() => {
    const loadUserData = async () => {
      if (!auth.currentUser?.id) return;

      const userId = auth.currentUser.id;
      console.log(`[PropertyModule] Loading data for user: ${userId}`);

      try {
        // Fetch buildings from backend API for super_admin users only
        // Regular admins only see buildings they're assigned to via BuildingAdmin API
        let buildings: Building[] = [];
        if (auth.currentUser.role?.toLowerCase() === 'super_admin') {
          console.log('[PropertyModule] Super admin - Checking cache first...');

          // Try to get buildings from cache first (TTL: 5 minutes)
          const cachedBuildings = await cacheService.get<Building[]>(CACHE_KEYS.BUILDINGS(userId));

          if (cachedBuildings) {
            console.log(`[PropertyModule] ✅ Using cached buildings (${cachedBuildings.length} items)`);
            buildings = cachedBuildings;
          } else {
            // Cache miss or expired - fetch from API
            console.log('[PropertyModule] Cache miss - Fetching buildings from backend API...');
            try {
              const response = await adminApi.getBuildings();
              if (response.success && response.data) {
                buildings = response.data;
                console.log(`[PropertyModule] ✅ Fetched ${buildings.length} buildings from API`);

                // ⚡ OPTIMIZATION: Skip manager enrichment on initial load
                // Manager data will be loaded on-demand when viewing building details
                console.log('[PropertyModule] ⚡ Skipping manager enrichment for performance (loaded on-demand)');

                // Cache buildings for 5 minutes
                await cacheService.set(CACHE_KEYS.BUILDINGS(userId), buildings, DEFAULT_TTL.BUILDINGS);
                console.log(`[PropertyModule] ✅ Cached ${buildings.length} buildings (TTL: ${DEFAULT_TTL.BUILDINGS} minutes)`);

                // Also save to local storage for offline access
                await buildingsStorage.save(userId, buildings);
              }
            } catch (error) {
              console.error('[PropertyModule] Failed to fetch buildings from API:', error);
              // Fallback to local storage if API fails
              buildings = await buildingsStorage.load(userId);
              console.log(`[PropertyModule] Loaded ${buildings.length} buildings from local storage (offline)`);
            }
          }
        } else {
          // For non-admin users, load from local storage
          buildings = await buildingsStorage.load(userId);
        }

        const [loadedUnitTypes, loadedServiceProviders] = await Promise.all([
          unitTypesStorage.load(userId),
          serviceProvidersStorage.load(userId),
        ]);

        // Use data from API or local storage
        const unitTypes = loadedUnitTypes; // No mock unit types

        // Strip legacy mock service providers by name (one-time migration)
        const MOCK_PROVIDER_NAMES = new Set([
          "CoolTech HVAC Services LLC",
          "VerticalRise Elevator Solutions",
          "AquaFlow Plumbing & Drainage Co.",
        ]);
        let serviceProviders = loadedServiceProviders;
        const filteredProviders = loadedServiceProviders.filter(
          (provider) => !MOCK_PROVIDER_NAMES.has(provider.name || ""),
        );
        if (filteredProviders.length !== loadedServiceProviders.length) {
          serviceProviders = filteredProviders;
          await serviceProvidersStorage.save(userId, serviceProviders);
          console.log(
            `[PropertyModule] Removed ${loadedServiceProviders.length - filteredProviders.length} mock service providers`,
          );
        }

        // Fetch admin-assigned building IDs for filtering
        let adminBuildingIds: string[] = [];
        console.log('[PropertyModule] Current user role:', auth.currentUser.role);

        if (auth.currentUser.role?.toLowerCase() === 'admin') {
          console.log('[PropertyModule] User is admin - will fetch assigned buildings');
          // Regular admins: fetch their assigned buildings
          try {
            const adminId = typeof auth.currentUser.id === 'string'
              ? parseInt(auth.currentUser.id.replace(/\D/g, ''), 10)
              : auth.currentUser.id;

            if (!isNaN(adminId)) {
              console.log('[PropertyModule] Fetching admin-assigned buildings...');
              const adminBuildingsResponse = await adminApi.getAdminBuildings(adminId);
              if (adminBuildingsResponse.success) {
                // Even if data is empty/null, that's valid - admin has no assigned buildings
                if (adminBuildingsResponse.data && adminBuildingsResponse.data.length > 0) {
                  adminBuildingIds = adminBuildingsResponse.data.map((b: any) => String(b.buildingId || b.id));
                  console.log(`[PropertyModule] Admin is assigned to ${adminBuildingIds.length} buildings:`, adminBuildingIds);

                  // Fetch full building details and filter to assigned set
                  try {
                    const allBuildingsResponse = await adminApi.getBuildings();
                    if (allBuildingsResponse.success && allBuildingsResponse.data) {
                      const allFromApi = allBuildingsResponse.data;
                      const filtered = allFromApi.filter((b: any) =>
                        adminBuildingIds.includes(String(b.id)),
                      );
                      if (filtered.length > 0) {
                        buildings = filtered;
                        console.log(
                          `[PropertyModule] Loaded ${filtered.length} assigned buildings for admin from API`,
                        );
                      }
                    }
                  } catch (fetchErr) {
                    console.warn(
                      "[PropertyModule] Failed to fetch full buildings list for admin; falling back to local storage",
                      fetchErr,
                    );
                  }
                } else {
                  console.log('[PropertyModule] Admin has no assigned buildings (fresh admin)');
                  adminBuildingIds = []; // Empty array - admin sees no buildings
                }
              } else {
                console.warn('[PropertyModule] API returned unsuccessful response for admin buildings');
                adminBuildingIds = []; // On error, show no buildings (safe default)
              }
            }
          } catch (error) {
            console.error('[PropertyModule] Failed to fetch admin assigned buildings:', error);
            // On error, show NO buildings (not all buildings) - safer default
            adminBuildingIds = [];
            buildings = []; // ensure we don't show stale data
          }
        } else if (auth.currentUser.role?.toLowerCase() === 'super_admin') {
          // Super admins can see all buildings
          adminBuildingIds = buildings.map(b => b.id);
        }

        setBuildings(buildings);
        setUnitTypes(unitTypes);
        setServiceProviders(serviceProviders);
        setAdminAssignedBuildingIds(adminBuildingIds);

        // Fetch service provider building assignments from API (only for admin/management roles)
        // Tenants/other roles skip this to avoid unnecessary network noise
        // Super admins skip this too - they can fetch on-demand when viewing service providers screen
        let providerAssignments: any[] = [];
        const roleLower = auth.currentUser.role?.toLowerCase();
        const shouldFetchProviderAssignments =
          roleLower === 'admin' || roleLower === 'management';

        if (shouldFetchProviderAssignments) {
          try {
            console.log('[PropertyModule] Fetching service provider building assignments...');

            const collectedProviders: ServiceProviderProfile[] = [];

            // Filter buildings based on user role
            // - Admin users: only fetch for their assigned buildings (adminBuildingIds)
            // - Super admin: fetch for all buildings
            // - Management: fetch for their managed buildings
            let buildingsToFetch = buildings;
            if (roleLower === 'admin') {
              buildingsToFetch = buildings.filter(b => adminBuildingIds.includes(b.id));
              console.log(`[PropertyModule] Admin user - fetching providers for ${buildingsToFetch.length} assigned buildings`);
            } else if (roleLower === 'management') {
              buildingsToFetch = buildings.filter(b => adminBuildingIds.includes(b.id));
              console.log(`[PropertyModule] Management user - fetching providers for ${buildingsToFetch.length} managed buildings`);
            } else {
              console.log(`[PropertyModule] Super admin - fetching providers for all ${buildingsToFetch.length} buildings`);
            }

            // Fetch providers for each building
            const assignmentPromises = buildingsToFetch.map(async (building) => {
              try {
                const response = await adminApi.getServiceProvidersByBuilding(building.id);
                if (response.success && response.data) {
                  response.data.forEach((provider: any) => {
                    const id =
                      provider.id ??
                      provider.providerId ??
                      provider.serviceProviderId ??
                      provider.userId ??
                      `provider-${building.id}`;

                    const ratingValue = Number(
                      provider.rating ?? provider.averageRating ?? provider.ratingScore ?? 0,
                    );
                    const jobsCount = Number(
                      provider.jobsCompleted ??
                        provider.completedJobs ??
                        provider.totalJobs ??
                        provider.workOrdersCompleted ??
                        0,
                    );

                    collectedProviders.push({
                      id: String(id),
                      userId: provider.userId ? String(provider.userId) : undefined,
                      name: provider.fullName || provider.name || provider.companyName || "Unknown provider",
                      specialty:
                        provider.specialization ||
                        provider.speciality ||
                        provider.specialty ||
                        provider.category ||
                        "Service Provider",
                      phone: provider.phoneNumber || provider.phone || provider.contactNumber || "",
                      email: provider.email || provider.contactEmail,
                      rating: Number.isFinite(ratingValue) ? ratingValue : 0,
                      jobsCompleted: Number.isFinite(jobsCount) ? jobsCount : 0,
                      responseTimeMinutes: provider.responseTimeMinutes || provider.averageResponseTime,
                    });
                  });

                  // Create assignment records for each provider assigned to this building
                  return response.data.map((provider: any) => ({
                    id: `${provider.id}-${building.id}`, // Composite ID
                    serviceProviderId: String(provider.id),
                    buildingId: String(building.id),
                    assignedBy: '',
                    assignedByName: 'System',
                    assignedAt: new Date().toISOString(),
                    status: 'active',
                    specialties: [],
                  }));
                }
                return [];
              } catch (error) {
                console.error(`[PropertyModule] Failed to fetch providers for building ${building.id}:`, error);
                return [];
              }
            });

            const assignmentArrays = await Promise.all(assignmentPromises);
            providerAssignments = assignmentArrays.flat();
            console.log(`[PropertyModule] ✅ Loaded ${providerAssignments.length} service provider assignments from ${buildingsToFetch.length} buildings`);

            if (collectedProviders.length > 0) {
              const mergedProvidersMap = new Map<string, ServiceProviderProfile>();
              serviceProviders.forEach((provider) => mergedProvidersMap.set(provider.id, provider));

              collectedProviders.forEach((provider) => {
                const existing = mergedProvidersMap.get(provider.id);
                mergedProvidersMap.set(provider.id, { ...existing, ...provider });
              });

              serviceProviders = Array.from(mergedProvidersMap.values());
              setServiceProviders(serviceProviders);
            }
          } catch (error) {
            console.error('[PropertyModule] Failed to fetch service provider assignments:', error);
            providerAssignments = [];
          }
        }

        // Initialize with empty arrays - no mock data to avoid building ID conflicts
        setBuildingUnits([]);
        setLeases([]);
        setBuildingEmployees([]);
        setServiceProviderAssignments(providerAssignments);

        // No need to save default data - all data comes from API or user creation

        setIsDataLoaded(true);

        // console.log(`[PropertyModule] Data loaded - Buildings: ${buildings.length}, Unit Types: ${unitTypes.length}, Service Providers: ${serviceProviders.length}`);
      } catch (error) {
        console.error('[PropertyModule] Failed to load user data:', error);
        // On error, use empty arrays - no mock data
        setBuildings([]);
        setUnitTypes([]);
        setServiceProviders([]);
        setBuildingUnits([]);
        setLeases([]);
        setBuildingEmployees([]);
        setServiceProviderAssignments([]);
        setIsDataLoaded(true);
      }
    };

    loadUserData();
  }, [auth.currentUser?.id]);

  // Save buildings to AsyncStorage whenever they change
  useEffect(() => {
    const saveBuildings = async () => {
      if (!auth.currentUser?.id || !isDataLoaded) return;
      try {
        await buildingsStorage.save(auth.currentUser.id, buildings);
      } catch (error) {
        console.error('[PropertyModule] Failed to save buildings:', error);
      }
    };
    saveBuildings();
  }, [buildings, auth.currentUser?.id, isDataLoaded]);

  // Save unit types to AsyncStorage whenever they change
  useEffect(() => {
    const saveUnitTypes = async () => {
      if (!auth.currentUser?.id || !isDataLoaded) return;
      try {
        await unitTypesStorage.save(auth.currentUser.id, unitTypes);
      } catch (error) {
        console.error('[PropertyModule] Failed to save unit types:', error);
      }
    };
    saveUnitTypes();
  }, [unitTypes, auth.currentUser?.id, isDataLoaded]);

  // Save service providers to AsyncStorage whenever they change
  useEffect(() => {
    const saveServiceProviders = async () => {
      if (!auth.currentUser?.id || !isDataLoaded) return;
      try {
        await serviceProvidersStorage.save(auth.currentUser.id, serviceProviders);
      } catch (error) {
        console.error('[PropertyModule] Failed to save service providers:', error);
      }
    };
    saveServiceProviders();
  }, [serviceProviders, auth.currentUser?.id, isDataLoaded]);

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

  const parseNumericId = useCallback((value: string | number, fieldName: string): number => {
    if (typeof value === "number" && !isNaN(value)) return value;
    const raw = String(value ?? "").trim();
    const match = raw.match(/(\d+)/);
    const parsed = match ? parseInt(match[1], 10) : NaN;
    if (isNaN(parsed)) {
      throw new Error(`Invalid ${fieldName}: "${raw}" - must include a number`);
    }
    return parsed;
  }, []);

  const updateServiceProvider = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<ServiceProviderProfile, "name" | "email" | "phone" | "specialty">
      >,
    ): Promise<ServiceProviderProfile> => {
      const existing = serviceProviders.find((provider) => provider.id === id);
      if (!existing) {
        throw new Error("Service provider not found");
      }

      try {
        const providerIdNum = parseNumericId(id, "service provider id");
        const payload = {
          fullName: updates.name ?? existing.name,
          phoneNumber: updates.phone ?? existing.phone,
          address: (existing as any).address,
          nationality: (existing as any).nationality,
          companyName:
            (existing as any).companyName ||
            updates.name ||
            existing.name,
          specialization: updates.specialty ?? existing.specialty,
          jobTitle: (existing as any).jobTitle,
          skills: (existing as any).skills,
        };

        await adminApi.updateServiceProvider(providerIdNum, payload);
      } catch (error) {
        console.error("[PropertyModule] Failed to update service provider via API:", error);
        throw error;
      }

      let updatedProfile: ServiceProviderProfile | undefined;

      setServiceProviders((prev) =>
        prev.map((provider) => {
          if (provider.id !== id) return provider;
          updatedProfile = {
            ...provider,
            ...updates,
          };
          return updatedProfile;
        }),
      );

      if (!updatedProfile) {
        throw new Error("Service provider not found");
      }

      return updatedProfile;
    },
    [parseNumericId, serviceProviders],
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
      options?: { specialties?: string[]; providerProfile?: ServiceProviderProfile },
    ): Promise<ServiceProviderBuildingAssignment> => {
      if (
        !auth.currentUser ||
        !["admin", "management", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(
          new Error("You do not have permission to assign service providers"),
        );
      }

      try {
        const providerProfile =
          options?.providerProfile ||
          serviceProviders.find((provider) => provider.id === providerId);

        if (!providerProfile) {
          throw new Error("Service provider not found");
        }

        const providerIdNum = parseNumericId(providerProfile.id, "providerId");
        const buildingIdNum = parseNumericId(buildingId, "buildingId");

        const building =
          buildings.find((b) => b.id === buildingId) ||
          buildings.find((b) => parseNumericId(b.id, "buildingId") === buildingIdNum);

        if (!building) {
          throw new Error("Building not found");
        }

        if (
          auth.currentUser.role === "management" &&
          building.managerId !== auth.currentUser.id
        ) {
          throw new Error("Only the assigned building manager can assign service providers");
        }

        const response = await adminApi.assignServiceProviderToBuilding({
          providerId: providerIdNum,
          buildingId: buildingIdNum,
        });

        if (!response.success) {
          throw new Error(response.message || "Failed to assign service provider");
        }

        const assignmentId =
          response.data?.id ??
          response.data?.assignmentId ??
          generateId(serviceProviderAssignments);

        const assignment: ServiceProviderBuildingAssignment = {
          id: String(assignmentId),
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

        return assignment;
      } catch (error: any) {
        console.error('[PropertyModule] Failed to assign service provider via API:', error);
        throw new Error(error?.message || "Failed to assign service provider");
      }
    },
    [auth.currentUser, buildings, serviceProviders, serviceProviderAssignments, notifications.actions, parseNumericId],
  );

  const createServiceProvider = useCallback(
    async (providerData: {
      name: string;
      fullName?: string;
      email: string;
      phone: string;
      specialty?: string;
      buildingIds?: string[];
      password?: string;
      address?: string;
      nationality?: string;
      companyName?: string;
      jobTitle?: string;
      skills?: string;
    }): Promise<{ user: any; profile: ServiceProviderProfile }> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can create service providers"));
      }

      // Build backend payload with sensible defaults for required fields
      const providerPayload = {
        fullName: providerData.fullName || providerData.name,
        email: providerData.email,
        password: providerData.password || "TempPass123!",
        phoneNumber: providerData.phone || "",
        address: providerData.address || "N/A",
        nationality: providerData.nationality || "N/A",
        companyName: providerData.companyName || providerData.name,
        specialization: providerData.specialty || providerData.skills || "General",
        jobTitle: providerData.jobTitle || "Service Provider",
        skills: providerData.skills || providerData.specialty || "",
      };

      try {
        const response = await adminApi.createServiceProvider(providerPayload);
        if (!response.success) {
          throw new Error(response.message || "Failed to create service provider");
        }

        const raw = response.data || {};
        const profileId = raw.id ?? raw.providerId ?? generateId(serviceProviders);

        const newProfile: ServiceProviderProfile = {
          id: String(profileId),
          userId: raw.userId ? String(raw.userId) : undefined,
          name: raw.companyName || raw.fullName || providerData.name,
          specialty: raw.specialization || providerData.specialty,
          phone: raw.phoneNumber || providerData.phone,
          email: raw.email || providerData.email,
          rating: raw.rating ?? 0,
          jobsCompleted: raw.jobsCompleted ?? 0,
          responseTimeMinutes: raw.responseTimeMinutes ?? 0,
        };

        const newUser: User = {
          id: String(raw.userId || raw.id || generateId(Object.values(auth.users))),
          email: providerData.email,
          name: providerData.name,
          role: "service_provider",
          phone: providerData.phone,
          profile: {
            name: providerData.name,
            phone: providerData.phone,
            serviceProviderId: newProfile.id,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        auth.actions.addUser(providerData.email, newUser);
        setServiceProviders((prev) => [...prev, newProfile]);

        // Assign provider to buildings if requested
        if (providerData.buildingIds && providerData.buildingIds.length > 0) {
          for (const buildingId of providerData.buildingIds) {
            try {
              await assignServiceProviderToBuilding(newProfile.id, buildingId, {
                specialties: [providerData.specialty],
                providerProfile: newProfile,
              });
            } catch (assignmentError) {
              console.warn(
                `[PropertyModule] Failed to assign provider ${newProfile.id} to building ${buildingId}:`,
                assignmentError,
              );
            }
          }
        }

        notifications.actions.createNotification(
          auth.currentUser.id,
          "Service Provider Created",
          `New service provider "${providerData.name}" has been created`,
          "success",
        );

        return { user: newUser, profile: newProfile };
      } catch (error: any) {
        console.error('[PropertyModule] Failed to create service provider via API:', error);
        throw new Error(error?.message || "Failed to create service provider");
      }
    },
    [
      auth.currentUser,
      auth.users,
      auth.actions,
      serviceProviders,
      notifications.actions,
      assignServiceProviderToBuilding,
    ],
  );

  const removeServiceProviderFromBuilding = useCallback(
    async (assignmentId: string): Promise<void> => {
      const assignment = serviceProviderAssignments.find(
        (item) => item.id === assignmentId,
      );

      if (!assignment) {
        throw new Error("Assignment not found");
      }

      try {
        // Parse IDs to numbers for API call
        const providerIdNum = parseNumericId(assignment.serviceProviderId, "providerId");
        const buildingIdNum = parseNumericId(assignment.buildingId, "buildingId");

        // Call API to remove provider from building
        console.log('[PropertyModule] Removing provider from building via API:', {
          providerId: providerIdNum,
          buildingId: buildingIdNum,
        });

        const response = await adminApi.removeServiceProviderFromBuilding({
          providerId: providerIdNum,
          buildingId: buildingIdNum,
        });

        if (!response.success) {
          throw new Error(response.message || "Failed to remove service provider");
        }

        // Remove from local state on success
        setServiceProviderAssignments((prev) =>
          prev.filter((item) => item.id !== assignmentId),
        );

        console.log('[PropertyModule] Provider removed successfully');
      } catch (error: any) {
        console.error('[PropertyModule] Failed to remove service provider via API:', error);
        throw new Error(error?.message || "Failed to remove service provider");
      }
    },
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

  const getBuildings = useCallback(() => {
    // Filter buildings based on user role
    // console.log('[getBuildings] Called with:', {
    //   role: auth.currentUser?.role,
    //   totalBuildings: buildings.length,
    //   adminAssignedCount: adminAssignedBuildingIds.length,
    //   adminAssignedIds: adminAssignedBuildingIds,
    // });

    if (!auth.currentUser) return buildings;

    // Super admins see all buildings
    if (auth.currentUser.role?.toLowerCase() === "super_admin") {
      // console.log('[getBuildings] Super admin - returning all buildings');
      return buildings;
    }

    // Regular admins only see buildings they're assigned to
    if (auth.currentUser.role?.toLowerCase() === "admin") {
      if (adminAssignedBuildingIds.length === 0) {
        // console.log('[getBuildings] Admin with NO assigned buildings - returning empty array');
        return [];
      }
      const filtered = buildings.filter(b => adminAssignedBuildingIds.includes(b.id));
      // console.log('[getBuildings] Admin filtered buildings:', filtered.length);
      return filtered;
    }

    // Management users see their managed buildings (handled elsewhere)
    // Other roles see all buildings (for now)
    // console.log('[getBuildings] Other role - returning all buildings');
    return buildings;
  }, [buildings, auth.currentUser, adminAssignedBuildingIds]);

  const getBuildingById = useCallback(
    (id: string) => buildings.find((building) => building.id === id),
    [buildings],
  );

  /**
   * Get building with manager data (lazy loaded)
   * Fetches manager info on-demand with caching
   */
  const getBuildingWithManager = useCallback(
    async (id: string): Promise<Building | undefined> => {
      const building = buildings.find((b) => b.id === id);
      if (!building) return undefined;

      // If manager data already exists, return immediately
      if (building.managerName) {
        return building;
      }

      // Try to fetch manager data from cache first
      const cacheKey = CACHE_KEYS.BUILDING_MANAGERS(id);
      const cachedManager = await cacheService.get<{ id: string; fullName: string }>(cacheKey);

      if (cachedManager) {
        console.log(`[PropertyModule] ✅ Using cached manager for building ${id}`);
        const enrichedBuilding = {
          ...building,
          managerId: cachedManager.id,
          managerName: cachedManager.fullName,
        };

        // Update local state
        setBuildings((prev) =>
          prev.map((b) => (b.id === id ? enrichedBuilding : b))
        );

        return enrichedBuilding;
      }

      // Fetch manager data from API
      try {
        const buildingIdNum = parseInt(id, 10);
        if (isNaN(buildingIdNum)) return building;

        console.log(`[PropertyModule] Fetching manager for building ${id}...`);
        const managersResponse = await adminApi.getBuildingManagers(buildingIdNum);

        if (managersResponse.success && managersResponse.data && managersResponse.data.length > 0) {
          const manager = managersResponse.data[0];
          const enrichedBuilding = {
            ...building,
            managerId: String(manager.id),
            managerName: manager.fullName,
          };

          // Cache manager data for 10 minutes
          await cacheService.set(cacheKey, { id: String(manager.id), fullName: manager.fullName }, DEFAULT_TTL.MANAGERS);

          // Update local state
          setBuildings((prev) =>
            prev.map((b) => (b.id === id ? enrichedBuilding : b))
          );

          console.log(`[PropertyModule] ✅ Manager fetched and cached for building ${id}`);
          return enrichedBuilding;
        }
      } catch (error) {
        console.warn(`[PropertyModule] Failed to fetch manager for building ${id}:`, error);
      }

      return building;
    },
    [buildings],
  );

  /**
   * Manually refresh buildings data (clears cache and refetches)
   */
  const refreshBuildings = useCallback(async (): Promise<void> => {
    if (!auth.currentUser?.id) return;

    const userId = auth.currentUser.id;
    console.log('[PropertyModule] 🔄 Manually refreshing buildings...');

    // Clear cache
    await cacheService.remove(CACHE_KEYS.BUILDINGS(userId));

    // Refetch from API
    if (auth.currentUser.role?.toLowerCase() === 'super_admin') {
      try {
        const response = await adminApi.getBuildings();
        if (response.success && response.data) {
          const freshBuildings = response.data;
          console.log(`[PropertyModule] ✅ Refreshed ${freshBuildings.length} buildings`);

          // Update cache
          await cacheService.set(CACHE_KEYS.BUILDINGS(userId), freshBuildings, DEFAULT_TTL.BUILDINGS);

          // Update local storage
          await buildingsStorage.save(userId, freshBuildings);

          // Update state
          setBuildings(freshBuildings);
        }
      } catch (error) {
        console.error('[PropertyModule] Failed to refresh buildings:', error);
        throw error;
      }
    }
  }, [auth.currentUser]);

  const createBuilding = useCallback(
    async (buildingData: CreateBuildingDTO): Promise<Building> => {
      if (
        !auth.currentUser ||
        !["admin", "management", "super_admin"].includes(
          auth.currentUser.role?.toLowerCase() || "",
        )
      ) {
        return Promise.reject(
          new Error("Only admins and management can create buildings"),
        );
      }

      try {
        // Call backend API to create building
        console.log('[PropertyModule.createBuilding] 🔵 Creating building via API');
        console.log('[PropertyModule.createBuilding] Building data:', JSON.stringify(buildingData, null, 2));
        const response = await adminApi.createBuilding(buildingData);
        console.log('[PropertyModule.createBuilding] API Response:', JSON.stringify(response, null, 2));

        if (!response.success || !response.data) {
          console.error('[PropertyModule.createBuilding] ❌ API returned failure or no data:', response.message);
          throw new Error(response.message || "Failed to create building");
        }

        const createdBuilding = response.data;
        console.log('[PropertyModule.createBuilding] Created building ID:', createdBuilding.id);

        // Update local state with the new building from API
        setBuildings((prev) => {
          console.log('[PropertyModule.createBuilding] Updating buildings state - previous count:', prev.length);
          return [createdBuilding, ...prev];
        });

        // Create success notification
        notifications.actions.createNotification(
          auth.currentUser!.id,
          "Building Created",
          `Building "${createdBuilding.name}" has been added`,
          "success",
        );

        console.log('[PropertyModule.createBuilding] ✅ Building created successfully');
        console.log('[PropertyModule.createBuilding] Returning response with building ID:', createdBuilding.id);
        return response as any; // Return full response so caller can access response.data.id
      } catch (error: any) {
        console.error('[PropertyModule] Failed to create building:', error);
        throw new Error(error?.message || "Failed to create building");
      }
    },
    [auth.currentUser, notifications.actions],
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

      try {
        // Call backend API to update building
        console.log('[PropertyModule] Updating building via API:', buildingId, updates);
        const response = await adminApi.updateBuilding(buildingId, updates);

        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to update building");
        }

        const updatedBuilding = response.data;

        // Update local state with the updated building from API
        setBuildings((prev) =>
          prev.map((building) =>
            building.id === buildingId ? updatedBuilding : building
          )
        );

        // Create success notification
        notifications.actions.createNotification(
          auth.currentUser!.id,
          "Building Updated",
          `Building "${updatedBuilding.name}" has been updated`,
          "success",
        );

        console.log('[PropertyModule] Building updated successfully:', updatedBuilding.id);
        return updatedBuilding;
      } catch (error: any) {
        console.error('[PropertyModule] Failed to update building:', error);
        throw new Error(error?.message || "Failed to update building");
      }
    },
    [auth.currentUser, notifications.actions],
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

      try {
        // Call backend API to delete building
        console.log('[PropertyModule] Deleting building via API:', buildingId);
        const response = await adminApi.deleteBuilding(buildingId);

        if (!response.success) {
          throw new Error(response.message || "Failed to delete building");
        }

        // Remove from local state
        setBuildings((prev) => prev.filter((b) => b.id !== buildingId));

        // Create success notification
        notifications.actions.createNotification(
          auth.currentUser!.id,
          "Building Deleted",
          `Building "${building.name}" has been deleted`,
          "info",
        );

        console.log('[PropertyModule] Building deleted successfully:', buildingId);
      } catch (error: any) {
        console.error('[PropertyModule] Failed to delete building:', error);
        throw new Error(error?.message || "Failed to delete building");
      }
    },
    [buildings, auth.currentUser, notifications.actions],
  );

  const assignManagerToBuilding = useCallback(
    async (buildingId: string, managerId: string): Promise<void> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can assign managers"));
      }

      const building = buildings.find((b) => b.id === buildingId);
      if (!building) {
        return Promise.reject(new Error("Building not found"));
      }

      try {
        // Parse buildingId and managerId to numbers (backend expects numbers)
        const buildingIdNum = parseInt(buildingId, 10);
        const managerIdNum = parseInt(managerId, 10);

        if (isNaN(buildingIdNum)) {
          throw new Error(`Invalid buildingId: "${buildingId}" - must be a number`);
        }
        if (isNaN(managerIdNum)) {
          throw new Error(`Invalid managerId: "${managerId}" - must be a number`);
        }

        // Call backend API to assign manager
        console.log('[PropertyModule] Assigning manager to building via API:', buildingIdNum, managerIdNum);
        const response = await adminApi.assignManagerToBuilding(buildingIdNum, managerIdNum);

        if (!response.success) {
          throw new Error(response.message || "Failed to assign manager");
        }

        // Fetch the updated manager information from the building managers endpoint
        console.log('[PropertyModule] Fetching updated manager information...');
        let managerName = "Unknown";
        try {
          const managersResponse = await adminApi.getBuildingManagers(buildingIdNum);
          if (managersResponse.success && managersResponse.data && managersResponse.data.length > 0) {
            const manager = managersResponse.data[0]; // Take first manager
            managerName = manager.fullName;
            console.log('[PropertyModule] Fetched manager name:', managerName);
          }
        } catch (error) {
          console.warn('[PropertyModule] Failed to fetch manager name, using fallback:', error);
          // Fallback to auth.users if available
          const manager = Object.values(auth.users).find(u => u.id === managerId);
          if (manager) {
            managerName = manager.name;
          }
        }

        // Update local building state with new manager
        setBuildings((prev) =>
          prev.map((b) =>
            b.id === buildingId
              ? { ...b, managerId, managerName }
              : b
          )
        );

        // Create success notification
        notifications.actions.createNotification(
          auth.currentUser!.id,
          "Manager Assigned",
          `${managerName} assigned to "${building.name}" successfully`,
          "success",
        );

        console.log('[PropertyModule] Manager assigned successfully:', buildingId, managerId);
      } catch (error: any) {
        console.error('[PropertyModule] Failed to assign manager:', error);
        throw new Error(error?.message || "Failed to assign manager");
      }
    },
    [buildings, auth.currentUser, auth.users, notifications.actions],
  );

  const assignAdminToBuilding = useCallback(
    async (buildingId: number, adminId: number): Promise<void> => {
      console.log('[PropertyModule.assignAdminToBuilding] 🔵 Called with:', { buildingId, adminId });
      console.log('[PropertyModule.assignAdminToBuilding] Current user:', {
        id: auth.currentUser?.id,
        role: auth.currentUser?.role,
        hasCurrentUser: !!auth.currentUser,
      });

      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role?.toLowerCase() || "")
      ) {
        console.error('[PropertyModule.assignAdminToBuilding] ❌ Permission denied - user is not admin/super_admin');
        return Promise.reject(new Error("Only admins can assign admins to buildings"));
      }

      try {
        console.log('[PropertyModule.assignAdminToBuilding] 📞 Calling API assignAdminToBuilding...');
        const response = await adminApi.assignAdminToBuilding(buildingId, adminId);
        console.log('[PropertyModule.assignAdminToBuilding] API Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
          console.error('[PropertyModule.assignAdminToBuilding] ❌ API returned failure:', response.message);
          throw new Error(response.message || "Failed to assign admin to building");
        }

        console.log('[PropertyModule.assignAdminToBuilding] ✅ API call successful');

        // If the current user is the admin being assigned, refresh their assigned buildings
        const adminIdStr = String(adminId);
        const isCurrentUserAssignment = auth.currentUser.id === adminIdStr;
        console.log('[PropertyModule.assignAdminToBuilding] Is current user being assigned?', {
          isCurrentUserAssignment,
          currentUserId: auth.currentUser.id,
          adminId: adminId,
          match1: auth.currentUser.id === adminIdStr,
        });

        if (isCurrentUserAssignment) {
          console.log('[PropertyModule.assignAdminToBuilding] 🔄 Refreshing assigned buildings for current user...');
          try {
            const adminBuildingsResponse = await adminApi.getAdminBuildings(adminId);
            console.log('[PropertyModule.assignAdminToBuilding] Admin buildings response:', JSON.stringify(adminBuildingsResponse, null, 2));

            if (adminBuildingsResponse.success && adminBuildingsResponse.data) {
              const buildingIds = adminBuildingsResponse.data.map((b: any) => String(b.buildingId || b.id));
              console.log('[PropertyModule.assignAdminToBuilding] 📝 Setting adminAssignedBuildingIds:', buildingIds);
              console.log('[PropertyModule.assignAdminToBuilding] Previous adminAssignedBuildingIds:', adminAssignedBuildingIds);

              setAdminAssignedBuildingIds(buildingIds);

              console.log('[PropertyModule.assignAdminToBuilding] ✅ Successfully refreshed admin assigned buildings');
              console.log('[PropertyModule.assignAdminToBuilding] Building count changed from', adminAssignedBuildingIds.length, 'to', buildingIds.length);
            } else {
              console.warn('[PropertyModule.assignAdminToBuilding] ⚠️ Admin buildings response not successful or empty data');
            }
          } catch (error) {
            console.error('[PropertyModule.assignAdminToBuilding] ❌ Failed to refresh admin assigned buildings:', error);
            console.error('[PropertyModule.assignAdminToBuilding] Error details:', {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            });
          }
        } else {
          console.log('[PropertyModule.assignAdminToBuilding] ℹ️ Not current user - skipping refresh');
        }
      } catch (error: any) {
        console.error('[PropertyModule.assignAdminToBuilding] ❌ Failed to assign admin to building:', error);
        console.error('[PropertyModule.assignAdminToBuilding] Error details:', {
          message: error?.message,
          stack: error?.stack,
          fullError: error,
        });
        throw new Error(error?.message || "Failed to assign admin to building");
      }
    },
    [auth.currentUser, adminAssignedBuildingIds],
  );

  /**
   * Assign maintenance staff (employee) to a building
   * Calls /BuildingMaintenanceStaff/assign API endpoint
   */
  const assignMaintenanceStaffToBuilding = useCallback(
    async (buildingId: number, staffId: number): Promise<void> => {
      console.log('[PropertyModule.assignMaintenanceStaffToBuilding] 🔵 Called with:', { buildingId, staffId });

      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role?.toLowerCase() || "")
      ) {
        console.error('[PropertyModule.assignMaintenanceStaffToBuilding] ❌ Permission denied');
        return Promise.reject(new Error("Only admins can assign maintenance staff to buildings"));
      }

      try {
        console.log('[PropertyModule.assignMaintenanceStaffToBuilding] 📞 Calling API...');
        const response = await adminApi.assignMaintenanceStaffToBuilding({ buildingId, staffId });
        console.log('[PropertyModule.assignMaintenanceStaffToBuilding] API Response:', JSON.stringify(response, null, 2));

        if (!response.success) {
          console.error('[PropertyModule.assignMaintenanceStaffToBuilding] ❌ API returned failure:', response.message);
          throw new Error(response.message || "Failed to assign maintenance staff to building");
        }

        console.log('[PropertyModule.assignMaintenanceStaffToBuilding] ✅ Successfully assigned maintenance staff to building');
      } catch (error: any) {
        console.error('[PropertyModule.assignMaintenanceStaffToBuilding] ❌ Failed:', error);
        throw new Error(error?.message || "Failed to assign maintenance staff to building");
      }
    },
    [auth.currentUser],
  );

  const getBuildingAdmins = useCallback(
    async (buildingId: number): Promise<any[]> => {
      try {
        console.log('[PropertyModule] Fetching admins for building:', buildingId);
        const response = await adminApi.getBuildingAdmins(buildingId);

        if (!response.success) {
          throw new Error(response.message || "Failed to fetch building admins");
        }

        return response.data || [];
      } catch (error: any) {
        console.error('[PropertyModule] Failed to fetch building admins:', error);
        throw new Error(error?.message || "Failed to fetch building admins");
      }
    },
    [],
  );

  const getTenantsByBuilding = useCallback(
    async (buildingId: number | string): Promise<User[]> => {
      try {
        console.log('[PropertyModule.getTenantsByBuilding] 🔵 Called with buildingId:', buildingId);
        console.log('[PropertyModule.getTenantsByBuilding] 📞 Calling adminApi.getTenantsByBuilding...');
        const response = await adminApi.getTenantsByBuilding(buildingId);
        console.log('[PropertyModule.getTenantsByBuilding] 📦 API Response:', {
          success: response.success,
          message: response.message,
          dataLength: response.data?.length || 0,
          data: response.data
        });

        if (!response.success) {
          console.error('[PropertyModule.getTenantsByBuilding] ❌ API returned unsuccessful:', response.message);
          throw new Error(response.message || "Failed to fetch tenants");
        }

        const tenants = response.data || [];
        console.log('[PropertyModule.getTenantsByBuilding] ✅ Returning tenants:', tenants.length, tenants);
        return tenants;
      } catch (error: any) {
        console.error('[PropertyModule.getTenantsByBuilding] ❌ Exception caught:', error);
        console.error('[PropertyModule.getTenantsByBuilding] ❌ Error details:', {
          message: error?.message,
          stack: error?.stack,
          fullError: error
        });
        throw new Error(error?.message || "Failed to fetch tenants");
      }
    },
    [],
  );

  const getAdminBuildings = useCallback(
    async (adminId: number): Promise<any[]> => {
      try {
        console.log('[PropertyModule] Fetching buildings for admin:', adminId);
        const response = await adminApi.getAdminBuildings(adminId);

        if (!response.success) {
          throw new Error(response.message || "Failed to fetch admin buildings");
        }

        return response.data || [];
      } catch (error: any) {
        console.error('[PropertyModule] Failed to fetch admin buildings:', error);
        throw new Error(error?.message || "Failed to fetch admin buildings");
      }
    },
    [],
  );

  const removeAdminFromBuilding = useCallback(
    async (buildingId: number, adminId: number): Promise<void> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins can remove admin assignments"));
      }

      try {
        console.log('[PropertyModule] Removing admin from building via API:', buildingId, adminId);
        const response = await adminApi.removeAdminFromBuilding(buildingId, adminId);

        if (!response.success) {
          throw new Error(response.message || "Failed to remove admin from building");
        }

        console.log('[PropertyModule] Admin removed from building successfully:', buildingId, adminId);
      } catch (error: any) {
        console.error('[PropertyModule] Failed to remove admin from building:', error);
        throw new Error(error?.message || "Failed to remove admin from building");
      }
    },
    [auth.currentUser],
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

  /**
   * Get building IDs assigned to the current admin user
   * For super_admin: returns all building IDs
   * For regular admin: returns only buildings they're assigned to (from cached API response)
   */
  const getAdminAssignedBuildingIds = useCallback((): string[] => {
    if (!auth.currentUser) return [];

    // For admin roles, use the cached assigned building IDs
    const role = auth.currentUser.role?.toLowerCase();
    if (role === "admin" || role === "super_admin") {
      return adminAssignedBuildingIds;
    }

    return [];
  }, [auth.currentUser, adminAssignedBuildingIds]);

  /**
   * Get buildings assigned to the current admin user
   * For super_admin: returns all buildings
   * For regular admin: returns only buildings they're assigned to (filtered from cached IDs)
   */
  const getAdminAssignedBuildings = useCallback((): Building[] => {
    if (!auth.currentUser) return [];

    // For admin roles, filter buildings based on cached assigned IDs
    const role = auth.currentUser.role?.toLowerCase();
    if (role === "admin" || role === "super_admin") {
      if (adminAssignedBuildingIds.length === 0) return [];
      return buildings.filter(b => adminAssignedBuildingIds.includes(b.id));
    }

    return buildings;
  }, [auth.currentUser, buildings, adminAssignedBuildingIds]);

  const createVisitorPass = useCallback(
    async (payload: CreateVisitorPassDTO): Promise<VisitorPass> => {
      if (!auth.currentUser) {
        return Promise.reject(
          new Error("User must be authenticated to create passes"),
        );
      }

      const role = auth.currentUser.role;
      const isManagement = role === "management";

      if (!isManagement) {
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
      getBuildingWithManager,
      refreshBuildings,
      createBuilding,
      updateBuilding,
      deleteBuilding,
      assignManagerToBuilding,
      assignAdminToBuilding,
      assignMaintenanceStaffToBuilding,
      getBuildingAdmins,
      getTenantsByBuilding,
      getAdminBuildings,
      removeAdminFromBuilding,
      getAdminAssignedBuildingIds,
      getAdminAssignedBuildings,
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
      updateServiceProvider,
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
