import { useCallback, useState } from "react";

import type {
  Amenity,
  AmenityBooking,
  AmenityType,
  BookingStatus,
  BuildingAmenityConfig,
} from "../../types";
import {
  DEFAULT_AMENITIES,
  DEFAULT_AMENITY_CONFIGS,
  DEFAULT_BOOKINGS,
} from "../../utils/mockData";
import { generateId } from "../../utils";
import type { AuthContextType } from "../auth-context";
import type { NotificationsContextType } from "../notifications-context";

type AuthDependency = Pick<AuthContextType, "currentUser">;
type NotificationsDependency = Pick<NotificationsContextType, "actions">;

export type AmenityModuleState = {
  amenities: Amenity[];
  amenityConfigs: BuildingAmenityConfig[];
  bookings: AmenityBooking[];
};

export type AmenityModuleActions = {
  getAmenities: () => Amenity[];
  getAmenityById: (id: string) => Amenity | undefined;
  getAmenityConfigs: () => BuildingAmenityConfig[];
  getAmenityConfigsByBuilding: (buildingId: string) => BuildingAmenityConfig[];
  updateAmenityConfig: (
    configId: string,
    updates: Partial<BuildingAmenityConfig>,
  ) => Promise<BuildingAmenityConfig>;
  createAmenityConfig: (
    payload: Partial<BuildingAmenityConfig> & {
      buildingId: string;
      amenityName: string;
    },
  ) => Promise<BuildingAmenityConfig>;
  createBooking: (data: Partial<AmenityBooking>) => Promise<AmenityBooking>;
  getBookings: (filter?: {
    status?: BookingStatus;
    amenityType?: AmenityType;
  }) => AmenityBooking[];
  cancelBooking: (bookingId: string, reason: string) => Promise<void>;
  getBookingsByBuilding: (buildingId: string) => AmenityBooking[];
};

type AmenityModuleDeps = {
  auth: AuthDependency;
  notifications: NotificationsDependency;
};

export const useAmenityModule = ({
  auth,
  notifications,
}: AmenityModuleDeps): {
  state: AmenityModuleState;
  actions: AmenityModuleActions;
} => {
  const [amenities] = useState<Amenity[]>(DEFAULT_AMENITIES);
  const [amenityConfigs, setAmenityConfigs] =
    useState<BuildingAmenityConfig[]>(DEFAULT_AMENITY_CONFIGS);
  const [bookings, setBookings] = useState<AmenityBooking[]>(DEFAULT_BOOKINGS);

  const getAmenities = useCallback(() => amenities, [amenities]);

  const getAmenityById = useCallback(
    (id: string) => amenities.find((amenity) => amenity.id === id),
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
    ): Promise<BuildingAmenityConfig> =>
      new Promise((resolve, reject) => {
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
      }),
    [],
  );

  const createAmenityConfig = useCallback(
    async (
      payload: Partial<BuildingAmenityConfig> & {
        buildingId: string;
        amenityName: string;
      },
    ): Promise<BuildingAmenityConfig> =>
      new Promise((resolve) => {
        setTimeout(() => {
          const newConfig: BuildingAmenityConfig = {
            id: payload.id ?? `amenity-config-${Date.now()}`,
            buildingId: payload.buildingId,
            amenityId:
              payload.amenityId ??
              `amenity-${payload.amenityName
                .toLowerCase()
                .replace(/\s+/g, "-")}-${Date.now()}`,
            amenityName: payload.amenityName,
            bookingWindowDays: payload.bookingWindowDays ?? 7,
            maxDurationMinutes: payload.maxDurationMinutes ?? 60,
            maxConcurrentBookings: payload.maxConcurrentBookings ?? 1,
            advanceCancellationHours: payload.advanceCancellationHours ?? 4,
            status: payload.status ?? "active",
            rules: payload.rules ?? [],
            maintenanceWindow: payload.maintenanceWindow,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setAmenityConfigs((prev) => [newConfig, ...prev]);
          resolve(newConfig);
        }, 250);
      }),
    [],
  );

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
    async (bookingId: string, reason: string): Promise<void> =>
      new Promise((resolve) => {
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
      }),
    [bookings, auth.currentUser, notifications.actions],
  );

  const getBookingsByBuilding = useCallback(
    (buildingId: string) => {
      if (!buildingId) return [];
      return bookings.filter((booking) => booking.buildingId === buildingId);
    },
    [bookings],
  );

  return {
    state: {
      amenities,
      amenityConfigs,
      bookings,
    },
    actions: {
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
    },
  };
};
