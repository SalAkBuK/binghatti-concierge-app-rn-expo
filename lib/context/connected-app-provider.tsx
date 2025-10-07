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
  Job,
  Analytics,
  RolePermissions,
  CreateUserDTO,
  UpdateUserDTO,
  CreateBuildingDTO,
  UpdateBuildingDTO,
  CreateJobDTO,
  UpdateJobDTO,
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

  // Admin state
  const [buildings, setBuildings] = useState<Building[]>(DEFAULT_BUILDINGS);
  const [jobs, setJobs] = useState<Job[]>(DEFAULT_JOBS);
  const [analytics] = useState<Analytics>(DEFAULT_ANALYTICS);
  const [rolePermissions] = useState<RolePermissions[]>(DEFAULT_ROLE_PERMISSIONS);

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

  // Booking actions
  const createBooking = useCallback(
    async (bookingData: Partial<AmenityBooking>): Promise<AmenityBooking> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser) {
            throw new Error("User must be authenticated to create bookings");
          }

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
            tenantId: auth.currentUser.id,
            buildingId: bookingData.buildingId || "building-1",
            slotDate: bookingData.slotDate || new Date().toISOString().split("T")[0],
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

          // Create notification
          notifications.actions.createNotification(
            auth.currentUser.id,
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
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser) {
            throw new Error("User must be authenticated to register visitors");
          }

          const date = new Date();
          const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
          const visitorCount = visitors.length + 1;

          const newVisitor: Visitor = {
            id: generateId(visitors).toString(),
            tenantId: auth.currentUser.id,
            buildingId: visitorData.buildingId || "building-1",
            unitNumber:
              auth.currentUser.profile?.apartment ||
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

          // Create notification
          notifications.actions.createNotification(
            auth.currentUser.id,
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
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser || auth.currentUser.role !== "admin") {
            throw new Error("Only admins can create users");
          }

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
            auth.currentUser.id,
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
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser || auth.currentUser.role !== "admin") {
            throw new Error("Only admins can update users");
          }

          const existingUser = auth.users[userId] || Object.values(auth.users).find(u => u.id === userId);
          if (!existingUser) {
            throw new Error("User not found");
          }

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
            auth.currentUser.id,
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
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser || auth.currentUser.role !== "admin") {
            throw new Error("Only admins can delete users");
          }

          const user = auth.users[userId] || Object.values(auth.users).find(u => u.id === userId);

          auth.actions.deleteUser(userId);

          notifications.actions.createNotification(
            auth.currentUser.id,
            "User Deleted",
            `User "${user?.name || userId}" has been deleted`,
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
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser || !["admin", "management"].includes(auth.currentUser.role)) {
            throw new Error("Only admins and management can create buildings");
          }

          const manager = buildingData.managerId
            ? auth.users[buildingData.managerId] || Object.values(auth.users).find(u => u.id === buildingData.managerId)
            : undefined;

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
            auth.currentUser.id,
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
    async (buildingId: string, updates: UpdateBuildingDTO): Promise<Building> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser || !["admin", "management"].includes(auth.currentUser.role)) {
            throw new Error("Only admins and management can update buildings");
          }

          setBuildings((prev) =>
            prev.map((building) => {
              if (building.id === buildingId) {
                const manager = updates.managerId
                  ? auth.users[updates.managerId] || Object.values(auth.users).find(u => u.id === updates.managerId)
                  : building.managerId
                    ? auth.users[building.managerId] || Object.values(auth.users).find(u => u.id === building.managerId)
                    : undefined;

                return {
                  ...building,
                  ...updates,
                  managerName: manager?.name,
                  updatedAt: new Date().toISOString(),
                };
              }
              return building;
            }),
          );

          const updated = buildings.find((b) => b.id === buildingId);

          notifications.actions.createNotification(
            auth.currentUser.id,
            "Building Updated",
            `Building "${updated?.name || buildingId}" has been updated`,
            "success",
          );

          resolve(updated!);
        }, 500);
      });
    },
    [buildings, auth.currentUser, auth.users, notifications.actions],
  );

  const deleteBuilding = useCallback(
    async (buildingId: string): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser || auth.currentUser.role !== "admin") {
            throw new Error("Only admins can delete buildings");
          }

          const building = buildings.find((b) => b.id === buildingId);
          setBuildings((prev) => prev.filter((b) => b.id !== buildingId));

          notifications.actions.createNotification(
            auth.currentUser.id,
            "Building Deleted",
            `Building "${building?.name || buildingId}" has been deleted`,
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
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser || !["admin", "management"].includes(auth.currentUser.role)) {
            throw new Error("Only admins and management can create jobs");
          }

          const building = buildings.find((b) => b.id === jobData.buildingId);
          const assignedUser = jobData.assignedTo
            ? auth.users[jobData.assignedTo] || Object.values(auth.users).find(u => u.id === jobData.assignedTo)
            : undefined;

          const newJob: Job = {
            id: `job-${generateId(jobs)}`,
            requestId: jobData.requestId,
            title: jobData.title,
            description: jobData.description,
            type: jobData.type,
            status: jobData.assignedTo ? "assigned" : "pending",
            priority: jobData.priority,
            buildingId: jobData.buildingId,
            buildingName: building?.name,
            unitNumber: jobData.unitNumber,
            assignedTo: jobData.assignedTo,
            assignedToName: assignedUser?.name,
            createdBy: auth.currentUser.id,
            attachments: jobData.attachments || [],
            notes: [],
            estimatedCost: jobData.estimatedCost,
            scheduledDate: jobData.scheduledDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setJobs((prev) => [...prev, newJob]);

          notifications.actions.createNotification(
            auth.currentUser.id,
            "Job Created",
            `New job "${jobData.title}" has been created`,
            "success",
          );

          if (jobData.assignedTo) {
            notifications.actions.createNotification(
              jobData.assignedTo,
              "Job Assigned",
              `You have been assigned to job: ${jobData.title}`,
              "info",
            );
          }

          resolve(newJob);
        }, 500);
      });
    },
    [jobs, buildings, auth.currentUser, auth.users, notifications.actions],
  );

  const updateJobStatus = useCallback(
    async (jobId: string, status: Job["status"]): Promise<Job> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser) {
            throw new Error("User must be authenticated");
          }

          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId) {
                updatedJob = {
                  ...job,
                  status,
                  completedDate: status === "completed" ? new Date().toISOString() : job.completedDate,
                  updatedAt: new Date().toISOString(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (updatedJob) {
            notifications.actions.createNotification(
              auth.currentUser.id,
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
          }

          resolve(updatedJob!);
        }, 500);
      });
    },
    [jobs, auth.currentUser, notifications.actions],
  );

  const assignJob = useCallback(
    async (jobId: string, serviceProviderId: string, scheduledDate?: string): Promise<Job> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser || !["admin", "management"].includes(auth.currentUser.role)) {
            throw new Error("Only admins and management can assign jobs");
          }

          const serviceProvider = auth.users[serviceProviderId] || Object.values(auth.users).find(u => u.id === serviceProviderId);
          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId) {
                updatedJob = {
                  ...job,
                  assignedTo: serviceProviderId,
                  assignedToName: serviceProvider?.name,
                  status: "assigned",
                  scheduledDate: scheduledDate || job.scheduledDate,
                  updatedAt: new Date().toISOString(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (updatedJob) {
            notifications.actions.createNotification(
              auth.currentUser.id,
              "Job Assigned",
              `Job "${updatedJob.title}" assigned to ${serviceProvider?.name}`,
              "success",
            );

            notifications.actions.createNotification(
              serviceProviderId,
              "Job Assigned",
              `You have been assigned to job: ${updatedJob.title}`,
              "info",
            );
          }

          resolve(updatedJob!);
        }, 500);
      });
    },
    [jobs, auth.currentUser, auth.users, notifications.actions],
  );

  const updateJob = useCallback(
    async (jobId: string, updates: UpdateJobDTO): Promise<Job> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (!auth.currentUser) {
            throw new Error("User must be authenticated");
          }

          let updatedJob: Job | undefined;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.id === jobId) {
                const assignedUser = updates.assignedTo
                  ? auth.users[updates.assignedTo] || Object.values(auth.users).find(u => u.id === updates.assignedTo)
                  : job.assignedTo
                    ? auth.users[job.assignedTo] || Object.values(auth.users).find(u => u.id === job.assignedTo)
                    : undefined;

                updatedJob = {
                  ...job,
                  ...updates,
                  assignedToName: assignedUser?.name,
                  updatedAt: new Date().toISOString(),
                };
                return updatedJob;
              }
              return job;
            }),
          );

          if (updatedJob) {
            notifications.actions.createNotification(
              auth.currentUser.id,
              "Job Updated",
              `Job "${updatedJob.title}" has been updated`,
              "success",
            );
          }

          resolve(updatedJob!);
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
    bookings,
    visitors,
    ratings,

    // Admin state - Buildings, Jobs, Analytics, Permissions
    buildings,
    jobs,
    analytics,
    rolePermissions,

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
          throw new Error("User must be authenticated to create requests");
        }
        return requests.actions.createRequest(requestData, auth.currentUser.id);
      },
      updateRequest: requests.actions.updateRequest,
      deleteRequest: requests.actions.deleteRequest,
      setSelectedRequest: requests.actions.setSelectedRequest,

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

      // Booking actions
      createBooking,
      getBookings,
      cancelBooking,

      // Visitor actions
      registerVisitor,
      getVisitors,
      cancelVisitor,

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

      // Admin actions - Jobs
      getJobs,
      getJobById,
      createJob,
      updateJobStatus,
      assignJob,
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
