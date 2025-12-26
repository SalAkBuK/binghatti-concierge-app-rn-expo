import React, { ReactNode, useState, useCallback } from "react";
import { AuthProvider, useAuth } from "./auth-context";
import { RequestsProvider, useRequests } from "./requests-context";
import {
  NotificationsProvider,
  useNotifications,
} from "./notifications-context";
import { NoticesProvider, useNotices } from "./notices-context";
import { useAmenityModule } from "./modules/amenities";
import { useVisitorModule } from "./modules/visitors";
import { useRatingsModule } from "./modules/ratings";
import { usePropertyModule } from "./modules/property";
import { useJobModule } from "./modules/jobs";
import { measure } from "../../utils/adminProfiler";
import type {
  Building,
  UnitType,
  BuildingUnit,
  BuildingEmployee,
  ServiceProviderProfile,
  ServiceProviderBuildingAssignment,
  ProviderAccessRequest,
  VisitorLog,
  RatingSummary,
  Lease,
  BuildingAmenityConfig,
  VisitorPass,
  Job,
  JobCostBreakdownItem,
  JobComplianceChecklistItem,
  JobAssignmentRecord,
  JobAdditionalCost,
  JobEstimate,
  JobEstimateItem,
  JobEstimateStatus,
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
  CreateVisitorPassDTO,
} from "../types";
import {
  DEFAULT_ANALYTICS,
  DEFAULT_ROLE_PERMISSIONS,
} from "../utils/mockData";
import { generateId } from "../utils";
import { adminApi } from "../services/api/admin";

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

  const {
    state: { amenities, amenityConfigs, bookings },
    actions: amenityActions,
  } = useAmenityModule({ auth, notifications });
  const {
    getAmenities,
    getAmenityById,
    getAmenityConfigs,
    getAmenityConfigsByBuilding,
    updateAmenityConfig,
    createAmenityConfig,
    createBooking,
    getBookings,
    cancelBooking,
    getBookingsByBuilding,
  } = amenityActions;

  // CRITICAL PERFORMANCE FIX: Memoize amenity actions to prevent new object creation
  const memoizedAmenityActions = React.useMemo(
    () => ({
      getAmenities,
      getAmenityById,
      getAmenityConfigs,
      getAmenityConfigsByBuilding,
      updateAmenityConfig,
      createAmenityConfig,
      createBooking,
      getBookings,
      cancelBooking,
      getBookingsByBuilding,
    }),
    [
      getAmenities,
      getAmenityById,
      getAmenityConfigs,
      getAmenityConfigsByBuilding,
      updateAmenityConfig,
      createAmenityConfig,
      createBooking,
      getBookings,
      cancelBooking,
      getBookingsByBuilding,
    ]
  );

  const {
    state: { visitors, visitorPasses, visitorLogs },
    actions: visitorActions,
  } = useVisitorModule({ auth, notifications });
  const {
    registerVisitor,
    getVisitors,
    cancelVisitor,
    appendVisitorPass,
    getVisitorPasses,
    getVisitorPassesByBuilding,
    approveVisitorPass,
    rejectVisitorPass,
    markVisitorPassCheckIn,
    markVisitorPassComplete,
    cancelVisitorPass,
    addVisitorLog,
    updateVisitorLog,
    getVisitorLogsByBuilding,
    getVisitorsByBuilding,
  } = visitorActions;

  // CRITICAL PERFORMANCE FIX: Memoize visitor actions to prevent new object creation
  const memoizedVisitorActions = React.useMemo(
    () => ({
      registerVisitor,
      getVisitors,
      cancelVisitor,
      appendVisitorPass,
      getVisitorPasses,
      getVisitorPassesByBuilding,
      approveVisitorPass,
      rejectVisitorPass,
      markVisitorPassCheckIn,
      markVisitorPassComplete,
      cancelVisitorPass,
      addVisitorLog,
      updateVisitorLog,
      getVisitorLogsByBuilding,
      getVisitorsByBuilding,
    }),
    [
      registerVisitor,
      getVisitors,
      cancelVisitor,
      appendVisitorPass,
      getVisitorPasses,
      getVisitorPassesByBuilding,
      approveVisitorPass,
      rejectVisitorPass,
      markVisitorPassCheckIn,
      markVisitorPassComplete,
      cancelVisitorPass,
      addVisitorLog,
      updateVisitorLog,
      getVisitorLogsByBuilding,
      getVisitorsByBuilding,
    ]
  );

  const {
    state: propertyState,
    actions: propertyActions,
  } = usePropertyModule({ auth, notifications, appendVisitorPass });
  const {
    buildings,
    unitTypes,
    buildingUnits,
    leases,
    buildingEmployees,
    serviceProviders,
    serviceProviderAssignments,
    providerAccessRequests,
  } = propertyState;
  const {
    getBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    assignManagerToBuilding,
    assignAdminToBuilding,
    assignMaintenanceStaffToBuilding,
    getBuildingAdmins,
    getAdminBuildings,
    refreshBuildings,
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
    addBuildingEmployee,
    updateBuildingEmployee,
    removeBuildingEmployee,
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
  } = propertyActions;

  const [analytics] = useState<Analytics>(DEFAULT_ANALYTICS);
  const [rolePermissions] = useState<RolePermissions[]>(DEFAULT_ROLE_PERMISSIONS);

  const {
    state: { ratings, ratingSummaries },
    actions: ratingsActions,
  } = useRatingsModule({
    auth,
    notifications,
    requests,
    buildings,
  });
  const {
    submitRating,
    getRatings,
    getRatingByRequestId,
    getRatingSummaries,
    upsertRatingSummary,
  } = ratingsActions;

  const getUsers = useCallback(
    () => Object.values(auth.users),
    [auth.users]
  );

  /**
   * Fetch all users (service providers, tenants, employees) from all managed buildings
   * This ensures we have fresh data from the backend for all building-scoped users
   */
  const fetchAllUsersForBuildings = useCallback(
    async (): Promise<void> => {
      try {
        console.log('[fetchAllUsersForBuildings] Starting to fetch users for managed buildings');

        // Get all managed buildings
        const buildings = getBuildings();
        console.log(`[fetchAllUsersForBuildings] Found ${buildings.length} managed buildings`);

        if (buildings.length === 0) {
          console.log('[fetchAllUsersForBuildings] No buildings to fetch users for');
          return;
        }

        // Fetch users for all buildings in parallel
        const fetchPromises = buildings.map(async (building) => {
          const buildingIdNum = typeof building.id === 'string'
            ? parseInt(building.id.replace(/\D/g, ''), 10)
            : building.id;

          if (isNaN(buildingIdNum)) {
            console.warn(`[fetchAllUsersForBuildings] Invalid building ID: ${building.id}`);
            return { serviceProviders: [], tenants: [], employees: [] };
          }

          console.log(`[fetchAllUsersForBuildings] Fetching users for building ${buildingIdNum} (${building.name})`);

          const buildingIdStr = String(building.id);

          // Fetch all user types for this building in parallel
          const [serviceProvidersRes, tenantsRes, employeesRes, managersRes] = await Promise.allSettled([
            adminApi.getServiceProvidersByBuilding(buildingIdNum),
            adminApi.getTenantsByBuilding(buildingIdNum),
            adminApi.getMaintenanceStaffByBuilding(buildingIdNum),
            adminApi.getBuildingManagers(buildingIdNum),
          ]);

          const serviceProviders = serviceProvidersRes.status === 'fulfilled' && serviceProvidersRes.value.data
            ? serviceProvidersRes.value.data.map((sp: any) => ({
                ...sp,
                buildingId: sp.buildingId ?? buildingIdStr,
                _fetchedBuildingId: buildingIdStr,
              }))
            : [];
          const tenants = tenantsRes.status === 'fulfilled' && tenantsRes.value.data
            ? tenantsRes.value.data.map((tenant: any) => ({
                ...tenant,
                buildingId: tenant.buildingId ?? buildingIdStr,
                _fetchedBuildingId: buildingIdStr,
              }))
            : [];
          const employees = employeesRes.status === 'fulfilled' && employeesRes.value.data
            ? employeesRes.value.data.map((employee: any) => ({
                ...employee,
                buildingId: employee.buildingId ?? buildingIdStr,
                _fetchedBuildingId: buildingIdStr,
            }))
            : [];
          const managers = managersRes.status === 'fulfilled' && managersRes.value.data
            ? managersRes.value.data.map((manager: any) => ({
                ...manager,
                buildingId: manager.buildingId ?? buildingIdStr,
                _fetchedBuildingId: buildingIdStr,
              }))
            : [];

          console.log(
            `[fetchAllUsersForBuildings] Building ${buildingIdNum}: ${serviceProviders.length} providers, ${tenants.length} tenants, ${employees.length} employees, ${managers.length} managers`,
          );

          return { serviceProviders, tenants, employees, managers, buildingId: buildingIdStr };
        });

        const results = await Promise.all(fetchPromises);

        // Combine all users from all buildings
        const allServiceProviders: any[] = [];
        const allTenants: any[] = [];
        const allEmployees: any[] = [];
        const allManagers: any[] = [];

        results.forEach((result) => {
          if (!result) return;
          const resultBuildingId = (result as any).buildingId ?? '';
          const svc = result.serviceProviders ?? [];
          const tenants = result.tenants ?? [];
          const emps = result.employees ?? [];
          const mgrs = (result as any).managers ?? [];

          allServiceProviders.push(
            ...svc.map((sp: any) => ({
              ...sp,
              buildingId: sp.buildingId ?? resultBuildingId,
              _fetchedBuildingId: sp._fetchedBuildingId ?? resultBuildingId,
            })),
          );
          allTenants.push(
            ...tenants.map((tenant: any) => ({
              ...tenant,
              buildingId: tenant.buildingId ?? resultBuildingId,
              _fetchedBuildingId: tenant._fetchedBuildingId ?? resultBuildingId,
            })),
          );
          allEmployees.push(
            ...emps.map((employee: any) => ({
              ...employee,
              buildingId: employee.buildingId ?? resultBuildingId,
              _fetchedBuildingId: employee._fetchedBuildingId ?? resultBuildingId,
            })),
          );
          allManagers.push(
            ...mgrs.map((manager: any) => ({
              ...manager,
              buildingId: manager.buildingId ?? resultBuildingId,
              _fetchedBuildingId: manager._fetchedBuildingId ?? resultBuildingId,
            })),
          );
        });

        console.log(
          `[fetchAllUsersForBuildings] Total users fetched: ${allServiceProviders.length} providers, ${allTenants.length} tenants, ${allEmployees.length} employees, ${allManagers.length} managers`,
        );

        // Map backend responses to frontend User type and store in auth context
        const mappedUsers: User[] = [];

        // Map service providers
        allServiceProviders.forEach((sp: any) => {
          const buildingIdFromSource =
            (sp as any).buildingId ||
            (sp as any)._fetchedBuildingId ||
            '';

          const user: User = {
            id: String(sp.id || sp.providerId || sp.serviceProviderId),
            email: sp.email || sp.providerEmail || `provider-${sp.id}@system.local`,
            name: sp.fullName || sp.name || sp.companyName || `Provider ${sp.id}`,
            role: 'service_provider',
            phone: sp.phoneNumber || sp.phone || '',
            profile: {
              buildingId: String(buildingIdFromSource || ''),
              companyName: sp.companyName,
              specialization: sp.specialization,
              jobTitle: sp.jobTitle,
              skills: sp.skills,
              phone: sp.phoneNumber || sp.phone || '',
              address: sp.address || '',
              nationality: sp.nationality || '',
            },
            createdAt: sp.createdAt || new Date().toISOString(),
            updatedAt: sp.updatedAt || new Date().toISOString(),
          } as any;

          // Add top-level fields for backward compatibility and edit modal population
          (user as any).fullName = sp.fullName || sp.name || sp.companyName || '';
          (user as any).phoneNumber = sp.phoneNumber || sp.phone || '';
          (user as any).address = sp.address || '';
          (user as any).nationality = sp.nationality || '';

          mappedUsers.push(user);
        });

        // Map tenants
        allTenants.forEach((tenant: any) => {
          console.log('[fetchAllUsersForBuildings] Raw tenant data from backend:', JSON.stringify(tenant, null, 2));

          const buildingIdFromSource =
            (tenant as any).buildingId ||
            (tenant as any)._fetchedBuildingId ||
            (tenant.profile && (tenant.profile as any).buildingId) ||
            '';

          const user: User = {
            id: String(tenant.id || tenant.tenantId),
            email: tenant.email || `tenant-${tenant.id}@system.local`,
            name: tenant.fullName || tenant.name || `Tenant ${tenant.id}`,
            role: 'tenant',
            phone: tenant.phoneNumber || tenant.phone || '',
            profile: {
              buildingId: String(buildingIdFromSource || ''),
              apartment: tenant.unitNumber || tenant.apartment || '',
              floor: String(tenant.floorNumber || tenant.floor || ''),
              tower: tenant.tower || '',
              emergencyContact: tenant.emergencyContact || '',
              emergencyPhone: tenant.emergencyPhone || '',
              phone: tenant.phoneNumber || tenant.phone || '',
              address: tenant.address || '',
              nationality: tenant.nationality || '',
              emiratesId: tenant.emiratesId || '',
            },
            createdAt: tenant.createdAt || tenant.entranceDate || new Date().toISOString(),
            updatedAt: tenant.updatedAt || new Date().toISOString(),
          } as any;

          // Add top-level fields for backward compatibility and edit modal population
          (user as any).fullName = tenant.fullName || tenant.name || '';
          (user as any).phoneNumber = tenant.phoneNumber || tenant.phone || '';
          (user as any).address = tenant.address || '';
          (user as any).nationality = tenant.nationality || '';
          (user as any).entranceDate = tenant.entranceDate || '';
          (user as any).unitNumber = tenant.unitNumber || tenant.apartment || '';
          (user as any).floorNumber = tenant.floorNumber || tenant.floor || '';

          console.log('[fetchAllUsersForBuildings] Mapped tenant user:', JSON.stringify(user, null, 2));

          mappedUsers.push(user);
        });

        // Map employees (maintenance staff)
        allEmployees.forEach((employee: any) => {
          console.log('[fetchAllUsersForBuildings] Raw employee data from backend:', JSON.stringify(employee, null, 2));

          const buildingIdFromSource =
            (employee as any).buildingId ||
            (employee as any)._fetchedBuildingId ||
            '';

          const user: User = {
            id: String(employee.id || employee.staffId || employee.employeeId),
            email: employee.email || `employee-${employee.id}@system.local`,
            name: employee.fullName || employee.name || `Employee ${employee.id}`,
            role: 'employee',
            phone: employee.phoneNumber || employee.phone || '',
            profile: {
              buildingId: String(buildingIdFromSource || ''),
              tower: employee.tower || '',
              floor: String(employee.floor || ''),
              phone: employee.phoneNumber || employee.phone || '',
              address: employee.address || '',
              nationality: employee.nationality || '',
              jobTitle: employee.jobTitle || 'Maintenance Staff',
            },
            createdAt: employee.createdAt || new Date().toISOString(),
            updatedAt: employee.updatedAt || new Date().toISOString(),
          } as any;

          // Add top-level fields for backward compatibility and edit modal population
          (user as any).fullName = employee.fullName || employee.name || '';
          (user as any).phoneNumber = employee.phoneNumber || employee.phone || '';
          (user as any).address = employee.address || '';
          (user as any).nationality = employee.nationality || '';

          console.log('[fetchAllUsersForBuildings] Mapped employee user:', JSON.stringify(user, null, 2));

          mappedUsers.push(user);
        });

        // Map managers
        allManagers.forEach((manager: any) => {
          console.log('[fetchAllUsersForBuildings] Raw manager data from backend:', JSON.stringify(manager, null, 2));

          const buildingIdFromSource =
            (manager as any).buildingId ||
            (manager as any)._fetchedBuildingId ||
            '';

          const user: User = {
            id: String(manager.id || manager.userId),
            email: manager.email || `manager-${manager.id}@system.local`,
            name: manager.fullName || manager.name || `Manager ${manager.id}`,
            role: 'management',
            phone: manager.phoneNumber || manager.phone || '',
            profile: {
              buildingId: String(buildingIdFromSource || ''),
              managedBuildingIds: [String(buildingIdFromSource || '')],
              phone: manager.phoneNumber || manager.phone || '',
              address: manager.address || '',
              nationality: manager.nationality || '',
              jobTitle: manager.jobTitle || 'Building Manager',
            } as any,
            createdAt: manager.createdAt || new Date().toISOString(),
            updatedAt: manager.updatedAt || new Date().toISOString(),
          } as any;

          (user as any).fullName = manager.fullName || manager.name || '';
          (user as any).phoneNumber = manager.phoneNumber || manager.phone || '';
          (user as any).address = manager.address || '';
          (user as any).nationality = manager.nationality || '';

          console.log('[fetchAllUsersForBuildings] Mapped manager user:', JSON.stringify(user, null, 2));

          mappedUsers.push(user);
        });

        // Store all fetched users in auth context
        console.log(`[fetchAllUsersForBuildings] Storing ${mappedUsers.length} total users in auth context`);
        mappedUsers.forEach((user) => {
          auth.actions.addUser(user.email, user);
        });

        console.log('[fetchAllUsersForBuildings] Successfully fetched and stored all users');
      } catch (error) {
        console.error('[fetchAllUsersForBuildings] Failed to fetch users:', error);
        throw error;
      }
    },
    [getBuildings, auth.actions]
  );

  const createUser = useCallback(
    async (userData: CreateUserDTO): Promise<User> => {
      if (
        !auth.currentUser ||
        !["admin", "super_admin", "management"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins and management can create users"));
      }

      try {
        console.log("[createUser] Creating user with role:", userData.role);

        let response: any;

        // Call appropriate API endpoint based on user role
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

        // Add user to auth context (this will persist to AsyncStorage via auth-context)
        auth.actions.addUser(createdUser.email, createdUser);

        // Create success notification
        notifications.actions.createNotification(
          auth.currentUser!.id,
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
    [auth.currentUser, auth.actions, notifications.actions],
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
              name: updates.fullName || existingUser.profile?.name,  // Updated to use fullName
              phone: updates.phoneNumber || existingUser.profile?.phone,  // Updated to use phoneNumber
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
        !["admin", "super_admin", "management"].includes(auth.currentUser.role)
      ) {
        return Promise.reject(new Error("Only admins and management can delete users"));
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

  const {
    state: { jobs },
    actions: jobActions,
  } = useJobModule({
    auth,
    notifications,
    requests,
    buildings,
    buildingEmployees,
    getManagedBuildingIds,
    resolveServiceProviderIdentity,
  });
  const {
    getJobs,
    getJobById,
    createJob,
    updateJobStatus,
    bulkUpdateJobStatus,
    assignJob: assignJobInternal,
    assignJobToBuildingEmployee,
    queueJobAssignment,
    promoteQueuedJobAssignment,
    updateJob,
    acceptEmployeeJob,
    declineEmployeeJob,
    startEmployeeJob,
    uploadEmployeeJobPhoto,
    addEmployeeJobAdditionalCost,
    completeEmployeeJob,
    submitJobEstimate,
    assignEmployeeToJob,
    approveJobAdditionalCost,
    rejectJobAdditionalCost,
    overrideJobCompletion,
    reviewJobEstimateAsProvider,
    approveTenantJobCompletion,
    rejectTenantJobCompletion,
    reviewJobEstimateAsTenant,
  } = jobActions;

  const assignJob = useCallback(
    (jobId: string, serviceProviderId: string, options?: { scheduledDate?: string }) =>
      assignJobInternal(jobId, {
        serviceProviderId,
        scheduledDate: options?.scheduledDate,
      }),
    [assignJobInternal],
  );

  const getRequestsByBuilding = useCallback(
    (buildingId: string) => {
      if (!buildingId) return [];
      return (requests.requests || []).filter(
        (req) => req.buildingId === buildingId,
      );
    },
    [requests.requests],
  );

  const getManagementAnalytics = useCallback(
    (buildingId: string) => {
      if (!buildingId) return null;

      const building = buildings.find((b) => b.id === buildingId);
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
        (req) => req.status === "pending",
      ).length;
      const inProgressRequests = buildingRequests.filter(
        (req) => req.status === "in-progress",
      ).length;
      const completedRequests = buildingRequests.filter(
        (req) => req.status === "completed",
      );
      const completedThisWeek = completedRequests.filter((req) => {
        const ts = new Date(req.updatedAt || req.createdAt || "").getTime();
        return !Number.isNaN(ts) && ts >= sevenDaysAgo.getTime();
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
        .sort((a, b) => a.slotDate.localeCompare(b.slotDate))
        .slice(0, 5);

      const visitorsToday = buildingVisitors.filter((visitor) => {
        const day =
          visitor.expectedArrivalTime?.split("T")[0] ||
          visitor.expectedDepartureTime?.split("T")[0];
        return day === todayDate;
      });

      const requestsToday = buildingRequests
        .filter(
          (req) => (req.createdAt || "").split("T")[0] === todayDate,
        )
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

  // CRITICAL PERFORMANCE FIX: Memoize the entire return object to prevent unnecessary re-renders
  return React.useMemo(
    () => ({
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
      unreadCount: auth.currentUser
        ? notifications.notifications.filter(
            (n) => n.userId === auth.currentUser?.id && !n.read
          ).length
        : 0,

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
      providerAccessRequests,
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
      createAmenityConfig,
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
      createVisitorPass,
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
      fetchAllUsersForBuildings,
      createUser,
      adminUpdateUser: updateUser,
      adminDeleteUser: deleteUser,

      // Admin actions - Buildings
      getBuildings,
      getBuildingById,
      createBuilding,
      updateBuilding,
      deleteBuilding,
      assignManagerToBuilding,
      assignAdminToBuilding,
      assignMaintenanceStaffToBuilding,
      getBuildingAdmins,
      getAdminBuildings,
      refreshBuildings,
      removeAdminFromBuilding,
      getAdminAssignedBuildingIds,
      getAdminAssignedBuildings,
      getManagedBuildingIds,
      getManagedBuildings,
      getBuildingEmployees,
      getBuildingEmployeeByUserId,
      getBuildingEmployeeScope,
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
      assignJobToBuildingEmployee,
      queueJobAssignment,
      promoteQueuedJobAssignment,
      updateJob,

      // Employee actions - Jobs
      acceptEmployeeJob,
      declineEmployeeJob,
      startEmployeeJob,
      uploadEmployeeJobPhoto,
      addEmployeeJobAdditionalCost,
      completeEmployeeJob,
      submitJobEstimate,

      // Service provider actions - Jobs
      assignEmployeeToJob,
      approveJobAdditionalCost,
      rejectJobAdditionalCost,
      overrideJobCompletion,
      reviewJobEstimateAsProvider,

      // Tenant actions - Jobs
      approveTenantJobCompletion,
      rejectTenantJobCompletion,
      reviewJobEstimateAsTenant,

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
  }),
  [
    // Auth dependencies
    auth.isAuthenticated,
    auth.currentUser,
    auth.userRole,
    auth.users,
    auth.loading,
    auth.error,
    auth.actions,
    // Request dependencies
    requests.requests,
    requests.selectedRequest,
    requests.loading,
    requests.error,
    requests.actions,
    // Notification dependencies
    notifications.notifications,
    notifications.unreadCount,
    notifications.loading,
    notifications.error,
    notifications.actions,
    // Notice dependencies
    notices.notices,
    notices.selectedNotice,
    notices.activeNoticesCount,
    notices.loading,
    notices.error,
    notices.actions,
    // Module state dependencies
    amenities,
    amenityConfigs,
    bookings,
    visitors,
    visitorPasses,
    ratings,
    buildings,
    jobs,
    analytics,
    rolePermissions,
    unitTypes,
    buildingUnits,
    leases,
    buildingEmployees,
    serviceProviders,
    providerAccessRequests,
    visitorLogs,
    ratingSummaries,
    // Action dependencies
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    getBuildings,
    getBuildingById,
    createBuilding,
    updateBuilding,
    deleteBuilding,
    getManagedBuildingIds,
    getManagedBuildings,
    getJobs,
    getJobById,
    createJob,
    updateJobStatus,
    bulkUpdateJobStatus,
    assignJob,
    getAnalytics,
    getManagementAnalytics,
    getPermissions,
    getPermissionsByRole,
    getRequestsByBuilding,
    getBookings,
    cancelBooking,
    getBookingsByBuilding,
    getVisitors,
    getVisitorsByBuilding,
    // Additional action dependencies
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
    addBuildingEmployee,
    updateBuildingEmployee,
    removeBuildingEmployee,
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
    getVisitorPasses,
    getVisitorPassesByBuilding,
    approveVisitorPass,
    rejectVisitorPass,
    markVisitorPassCheckIn,
    markVisitorPassComplete,
    cancelVisitorPass,
    getVisitorLogsByBuilding,
    addVisitorLog,
    updateVisitorLog,
    submitRating,
    getRatings,
    getRatingByRequestId,
    getRatingSummaries,
    upsertRatingSummary,
    assignJobToBuildingEmployee,
    queueJobAssignment,
    promoteQueuedJobAssignment,
    updateJob,
    acceptEmployeeJob,
    declineEmployeeJob,
    startEmployeeJob,
    uploadEmployeeJobPhoto,
    addEmployeeJobAdditionalCost,
    completeEmployeeJob,
    submitJobEstimate,
    assignEmployeeToJob,
    approveJobAdditionalCost,
    rejectJobAdditionalCost,
    overrideJobCompletion,
    reviewJobEstimateAsProvider,
    approveTenantJobCompletion,
    rejectTenantJobCompletion,
    reviewJobEstimateAsTenant,
  ]
);
};

// Re-export individual hooks
export { useAuth, useRequests, useNotifications, useNotices };
