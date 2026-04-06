import { useCallback, useState } from "react";

import type { AuthContextType } from "./auth-context";
import type { NotificationsContextType } from "./notifications-context";
import type { RequestsContextType } from "./requests-context";
import { adminApi } from "../services/api/admin";
import type {
  AmenityBooking,
  Analytics,
  Building,
  CreateUserDTO,
  Job,
  Request,
  RolePermissions,
  UpdateUserDTO,
  User,
  Visitor,
} from "../types";
import {
  DEFAULT_ANALYTICS,
  DEFAULT_ROLE_PERMISSIONS,
} from "../utils/mockData";

type UseAdminAppStateParams = {
  auth: AuthContextType;
  notifications: NotificationsContextType;
  requests: RequestsContextType;
  buildings: Building[];
  getBuildings: () => Building[];
  getJobs: (filters?: { buildingId?: string }) => Job[];
  getBookingsByBuilding: (buildingId: string) => AmenityBooking[];
  getVisitorsByBuilding: (buildingId: string) => Visitor[];
};

const mapServiceProviderUser = (provider: any): User => {
  const buildingIdFromSource =
    provider.buildingId ||
    provider._fetchedBuildingId ||
    "";

  const user: User = {
    id: String(provider.id || provider.providerId || provider.serviceProviderId),
    email:
      provider.email ||
      provider.providerEmail ||
      `provider-${provider.id}@system.local`,
    name:
      provider.fullName ||
      provider.name ||
      provider.companyName ||
      `Provider ${provider.id}`,
    role: "service_provider",
    phone: provider.phoneNumber || provider.phone || "",
    profile: {
      buildingId: String(buildingIdFromSource || ""),
      companyName: provider.companyName,
      specialties: provider.skills,
      jobTitle: provider.jobTitle,
      phone: provider.phoneNumber || provider.phone || "",
      address: provider.address || "",
      nationality: provider.nationality || "",
    },
    createdAt: provider.createdAt || new Date().toISOString(),
    updatedAt: provider.updatedAt || new Date().toISOString(),
  } as any;

  (user as any).fullName =
    provider.fullName || provider.name || provider.companyName || "";
  (user as any).phoneNumber = provider.phoneNumber || provider.phone || "";
  (user as any).address = provider.address || "";
  (user as any).nationality = provider.nationality || "";

  return user;
};

const mapTenantUser = (tenant: any): User => {
  const buildingIdFromSource =
    tenant.buildingId ||
    tenant._fetchedBuildingId ||
    tenant.profile?.buildingId ||
    "";

  const user: User = {
    id: String(tenant.id || tenant.tenantId),
    email: tenant.email || `tenant-${tenant.id}@system.local`,
    name: tenant.fullName || tenant.name || `Tenant ${tenant.id}`,
    role: "tenant",
    phone: tenant.phoneNumber || tenant.phone || "",
    profile: {
      buildingId: String(buildingIdFromSource || ""),
      apartment: tenant.unitNumber || tenant.apartment || "",
      floor: String(tenant.floorNumber || tenant.floor || ""),
      tower: tenant.tower || "",
      emergencyContact: tenant.emergencyContact || "",
      emergencyPhone: tenant.emergencyPhone || "",
      phone: tenant.phoneNumber || tenant.phone || "",
      address: tenant.address || "",
      nationality: tenant.nationality || "",
      emiratesId: tenant.emiratesId || "",
    },
    createdAt:
      tenant.createdAt ||
      tenant.entranceDate ||
      new Date().toISOString(),
    updatedAt: tenant.updatedAt || new Date().toISOString(),
  } as any;

  (user as any).fullName = tenant.fullName || tenant.name || "";
  (user as any).phoneNumber = tenant.phoneNumber || tenant.phone || "";
  (user as any).address = tenant.address || "";
  (user as any).nationality = tenant.nationality || "";
  (user as any).entranceDate = tenant.entranceDate || "";
  (user as any).unitNumber = tenant.unitNumber || tenant.apartment || "";
  (user as any).floorNumber = tenant.floorNumber || tenant.floor || "";

  return user;
};

const mapEmployeeUser = (employee: any): User => {
  const buildingIdFromSource =
    employee.buildingId ||
    employee._fetchedBuildingId ||
    "";

  const user: User = {
    id: String(employee.id || employee.staffId || employee.employeeId),
    email: employee.email || `employee-${employee.id}@system.local`,
    name: employee.fullName || employee.name || `Employee ${employee.id}`,
    role: "employee",
    phone: employee.phoneNumber || employee.phone || "",
    profile: {
      buildingId: String(buildingIdFromSource || ""),
      tower: employee.tower || "",
      floor: String(employee.floor || ""),
      phone: employee.phoneNumber || employee.phone || "",
      address: employee.address || "",
      nationality: employee.nationality || "",
      jobTitle: employee.jobTitle || "Maintenance Staff",
    },
    createdAt: employee.createdAt || new Date().toISOString(),
    updatedAt: employee.updatedAt || new Date().toISOString(),
  } as any;

  (user as any).fullName = employee.fullName || employee.name || "";
  (user as any).phoneNumber = employee.phoneNumber || employee.phone || "";
  (user as any).address = employee.address || "";
  (user as any).nationality = employee.nationality || "";

  return user;
};

const mapManagerUser = (manager: any): User => {
  const buildingIdFromSource =
    manager.buildingId ||
    manager._fetchedBuildingId ||
    "";

  const user: User = {
    id: String(manager.id || manager.userId),
    email: manager.email || `manager-${manager.id}@system.local`,
    name: manager.fullName || manager.name || `Manager ${manager.id}`,
    role: "management",
    phone: manager.phoneNumber || manager.phone || "",
    profile: {
      buildingId: String(buildingIdFromSource || ""),
      managedBuildingIds: [String(buildingIdFromSource || "")],
      phone: manager.phoneNumber || manager.phone || "",
      address: manager.address || "",
      nationality: manager.nationality || "",
      jobTitle: manager.jobTitle || "Building Manager",
    } as any,
    createdAt: manager.createdAt || new Date().toISOString(),
    updatedAt: manager.updatedAt || new Date().toISOString(),
  } as any;

  (user as any).fullName = manager.fullName || manager.name || "";
  (user as any).phoneNumber = manager.phoneNumber || manager.phone || "";
  (user as any).address = manager.address || "";
  (user as any).nationality = manager.nationality || "";

  return user;
};

export const useAdminAppState = ({
  auth,
  notifications,
  requests,
  buildings,
  getBuildings,
  getJobs,
  getBookingsByBuilding,
  getVisitorsByBuilding,
}: UseAdminAppStateParams) => {
  const [analytics] = useState<Analytics>(DEFAULT_ANALYTICS);
  const [rolePermissions] = useState<RolePermissions[]>(DEFAULT_ROLE_PERMISSIONS);

  const getUsers = useCallback(() => Object.values(auth.users), [auth.users]);

  const fetchAllUsersForBuildings = useCallback(async (): Promise<void> => {
    try {
      console.log("[fetchAllUsersForBuildings] Starting to fetch users for managed buildings");

      const managedBuildings = getBuildings();
      console.log(
        `[fetchAllUsersForBuildings] Found ${managedBuildings.length} managed buildings`,
      );

      if (managedBuildings.length === 0) {
        console.log("[fetchAllUsersForBuildings] No buildings to fetch users for");
        return;
      }

      const fetchPromises = managedBuildings.map(async (building) => {
        const buildingIdNum =
          typeof building.id === "string"
            ? parseInt(building.id.replace(/\D/g, ""), 10)
            : building.id;

        if (isNaN(buildingIdNum)) {
          console.warn(
            `[fetchAllUsersForBuildings] Invalid building ID: ${building.id}`,
          );
          return {
            serviceProviders: [],
            tenants: [],
            employees: [],
            managers: [],
            buildingId: String(building.id),
          };
        }

        console.log(
          `[fetchAllUsersForBuildings] Fetching users for building ${buildingIdNum} (${building.name})`,
        );

        const buildingIdStr = String(building.id);
        const [
          serviceProvidersRes,
          tenantsRes,
          employeesRes,
          managersRes,
        ] = await Promise.allSettled([
          adminApi.getServiceProvidersByBuilding(buildingIdNum),
          adminApi.getTenantsByBuilding(buildingIdNum),
          adminApi.getMaintenanceStaffByBuilding(buildingIdNum),
          adminApi.getBuildingManagers(buildingIdNum),
        ]);

        const serviceProviders =
          serviceProvidersRes.status === "fulfilled" &&
          serviceProvidersRes.value.data
            ? serviceProvidersRes.value.data.map((provider: any) => ({
                ...provider,
                buildingId: provider.buildingId ?? buildingIdStr,
                _fetchedBuildingId: buildingIdStr,
              }))
            : [];
        const tenants =
          tenantsRes.status === "fulfilled" && tenantsRes.value.data
            ? tenantsRes.value.data.map((tenant: any) => ({
                ...tenant,
                buildingId: tenant.buildingId ?? buildingIdStr,
                _fetchedBuildingId: buildingIdStr,
              }))
            : [];
        const employees =
          employeesRes.status === "fulfilled" && employeesRes.value.data
            ? employeesRes.value.data.map((employee: any) => ({
                ...employee,
                buildingId: employee.buildingId ?? buildingIdStr,
                _fetchedBuildingId: buildingIdStr,
              }))
            : [];
        const managers =
          managersRes.status === "fulfilled" && managersRes.value.data
            ? managersRes.value.data.map((manager: any) => ({
                ...manager,
                buildingId: manager.buildingId ?? buildingIdStr,
                _fetchedBuildingId: buildingIdStr,
              }))
            : [];

        console.log(
          `[fetchAllUsersForBuildings] Building ${buildingIdNum}: ${serviceProviders.length} providers, ${tenants.length} tenants, ${employees.length} employees, ${managers.length} managers`,
        );

        return {
          serviceProviders,
          tenants,
          employees,
          managers,
          buildingId: buildingIdStr,
        };
      });

      const results = await Promise.all(fetchPromises);

      const allServiceProviders: any[] = [];
      const allTenants: any[] = [];
      const allEmployees: any[] = [];
      const allManagers: any[] = [];

      results.forEach((result) => {
        const resultBuildingId = result.buildingId ?? "";

        allServiceProviders.push(
          ...result.serviceProviders.map((provider: any) => ({
            ...provider,
            buildingId: provider.buildingId ?? resultBuildingId,
            _fetchedBuildingId: provider._fetchedBuildingId ?? resultBuildingId,
          })),
        );
        allTenants.push(
          ...result.tenants.map((tenant: any) => ({
            ...tenant,
            buildingId: tenant.buildingId ?? resultBuildingId,
            _fetchedBuildingId: tenant._fetchedBuildingId ?? resultBuildingId,
          })),
        );
        allEmployees.push(
          ...result.employees.map((employee: any) => ({
            ...employee,
            buildingId: employee.buildingId ?? resultBuildingId,
            _fetchedBuildingId: employee._fetchedBuildingId ?? resultBuildingId,
          })),
        );
        allManagers.push(
          ...result.managers.map((manager: any) => ({
            ...manager,
            buildingId: manager.buildingId ?? resultBuildingId,
            _fetchedBuildingId: manager._fetchedBuildingId ?? resultBuildingId,
          })),
        );
      });

      console.log(
        `[fetchAllUsersForBuildings] Total users fetched: ${allServiceProviders.length} providers, ${allTenants.length} tenants, ${allEmployees.length} employees, ${allManagers.length} managers`,
      );

      const mappedUsers = [
        ...allServiceProviders.map(mapServiceProviderUser),
        ...allTenants.map(mapTenantUser),
        ...allEmployees.map(mapEmployeeUser),
        ...allManagers.map(mapManagerUser),
      ];

      console.log(
        `[fetchAllUsersForBuildings] Storing ${mappedUsers.length} total users in auth context`,
      );
      mappedUsers.forEach((user) => {
        auth.actions.addUser(user.email, user);
      });

      console.log("[fetchAllUsersForBuildings] Successfully fetched and stored all users");
    } catch (error) {
      console.error("[fetchAllUsersForBuildings] Failed to fetch users:", error);
      throw error;
    }
  }, [auth.actions, getBuildings]);

  const createUser = useCallback(
    async (userData: CreateUserDTO): Promise<User> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin", "management"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(
          new Error("Only admins and management can create users"),
        );
      }

      try {
        console.log("[createUser] Creating user with role:", userData.role);

        let response: any;

        switch (userData.role) {
          case "management":
            response = await adminApi.createManager(userData);
            break;
          case "employee":
            response = await adminApi.createMaintenanceStaff(userData);
            break;
          case "tenant":
            response = await adminApi.createTenant(userData);
            break;
          case "admin":
          case "super_admin":
            response = await adminApi.createAdmin(userData);
            break;
          default:
            throw new Error(`Unsupported user role: ${userData.role}`);
        }

        if (!response.success || !response.data) {
          throw new Error(response.message || "Failed to create user");
        }

        const createdUser = response.data;

        console.log("[createUser] User created successfully via API:", createdUser.id);

        auth.actions.addUser(createdUser.email, createdUser);

        notifications.actions.createNotification(
          auth.currentUser.id,
          "User Created",
          `New ${userData.role} user "${userData.fullName}" has been created`,
          "success",
        );

        return createdUser;
      } catch (error: any) {
        console.error("[createUser] Failed to create user:", error);
        throw new Error(error?.message || "Failed to create user");
      }
    },
    [auth.actions, auth.currentUser, notifications.actions],
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
        Object.values(auth.users).find((user) => user.id === userId);

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
              name: updates.fullName || existingUser.profile?.name,
              phone: updates.phoneNumber || existingUser.profile?.phone,
              apartment: updates.apartment || existingUser.profile?.apartment,
              tower: updates.tower || existingUser.profile?.tower,
            },
            updatedAt: new Date().toISOString(),
          };

          auth.actions.updateUser(updatedUser.email, updatedUser);

          notifications.actions.createNotification(
            auth.currentUser.id,
            "User Updated",
            `User "${updatedUser.name}" has been updated`,
            "success",
          );

          resolve(updatedUser);
        }, 500);
      });
    },
    [auth.actions, auth.currentUser, auth.users, notifications.actions],
  );

  const deleteUser = useCallback(
    async (userId: string): Promise<void> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin", "management"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(
          new Error("Only admins and management can delete users"),
        );
      }

      const userRecord =
        auth.users[userId] ||
        Object.values(auth.users).find((user) => user.id === userId);

      if (!userRecord) {
        return Promise.reject(new Error("User not found"));
      }

      return new Promise((resolve) => {
        setTimeout(() => {
          auth.actions.deleteUser(userRecord.email);

          notifications.actions.createNotification(
            auth.currentUser.id,
            "User Deleted",
            `User "${userRecord.name || userRecord.email}" has been deleted`,
            "info",
          );

          resolve();
        }, 500);
      });
    },
    [auth.actions, auth.currentUser, auth.users, notifications.actions],
  );

  const getRequestsByBuilding = useCallback(
    (buildingId: string): Request[] => {
      if (!buildingId) return [];

      return (requests.requests || []).filter(
        (request) => request.buildingId === buildingId,
      );
    },
    [requests.requests],
  );

  const getManagementAnalytics = useCallback(
    (buildingId: string) => {
      if (!buildingId) return null;

      const building = buildings.find((candidate) => candidate.id === buildingId);
      if (!building) return null;

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
        (request) => request.status === "pending",
      ).length;
      const inProgressRequests = buildingRequests.filter(
        (request) => request.status === "in-progress",
      ).length;
      const completedRequests = buildingRequests.filter(
        (request) => request.status === "completed",
      );
      const completedThisWeek = completedRequests.filter((request) => {
        const timestamp = new Date(
          request.updatedAt || request.createdAt || "",
        ).getTime();
        return !Number.isNaN(timestamp) && timestamp >= sevenDaysAgo.getTime();
      }).length;
      const completionRate =
        totalRequests === 0
          ? analytics.completionRate
          : Math.round((completedRequests.length / totalRequests) * 100);

      const openJobs = buildingJobs.filter(
        (job) => job.status !== "completed" && job.status !== "cancelled",
      );
      const jobsInProgress = buildingJobs.filter(
        (job) => job.status === "in-progress",
      ).length;

      const bookingsToday = buildingBookings.filter(
        (booking) => booking.slotDate === todayDate,
      );

      const upcomingBookings = buildingBookings
        .filter((booking) => booking.slotDate >= todayDate)
        .sort((left, right) => left.slotDate.localeCompare(right.slotDate))
        .slice(0, 5);

      const visitorsToday = buildingVisitors.filter((visitor) => {
        const day =
          visitor.expectedArrivalTime?.split("T")[0] ||
          visitor.expectedDepartureTime?.split("T")[0];
        return day === todayDate;
      });

      const requestsToday = buildingRequests
        .filter((request) => (request.createdAt || "").split("T")[0] === todayDate)
        .slice(0, 5);

      const occupancyRate =
        building.totalUnits > 0
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
          activeJobs: openJobs.slice(0, 5),
        },
      };
    },
    [
      analytics.completionRate,
      analytics.occupancyRate,
      buildings,
      getBookingsByBuilding,
      getJobs,
      getRequestsByBuilding,
      getVisitorsByBuilding,
    ],
  );

  const getAnalytics = useCallback(() => analytics, [analytics]);

  const getPermissions = useCallback(() => rolePermissions, [rolePermissions]);

  const getPermissionsByRole = useCallback(
    (role: User["role"]) =>
      rolePermissions.find((permissionGroup) => permissionGroup.role === role),
    [rolePermissions],
  );

  return {
    analytics,
    rolePermissions,
    getUsers,
    fetchAllUsersForBuildings,
    createUser,
    updateUser,
    deleteUser,
    getRequestsByBuilding,
    getManagementAnalytics,
    getAnalytics,
    getPermissions,
    getPermissionsByRole,
  };
};
