import { useCallback, useState } from "react";

/**
 * Data maturity: hybrid.
 * Resident visitor CRUD is API-backed via `residentVisitorsApi`, while visitor
 * lists, passes, and logs still start from mock data and local in-memory state.
 */
import type {
  CreateResidentVisitorDTO,
  ResidentVisitor,
  ResidentVisitorStatus,
  UpdateResidentVisitorDTO,
  Visitor,
  VisitorLog,
  VisitorPass,
  VisitorStatus,
} from "../../types";
import {
  DEFAULT_VISITORS,
  DEFAULT_VISITOR_LOGS,
  DEFAULT_VISITOR_PASSES,
} from "../../utils/mockData";
import { generateId } from "../../utils";
import { residentVisitorsApi } from "../../services/api/resident-visitors";
import type { AuthContextType } from "../auth-context";
import type { NotificationsContextType } from "../notifications-context";

type AuthDependency = Pick<AuthContextType, "currentUser">;
type NotificationsDependency = Pick<NotificationsContextType, "actions">;

export type VisitorModuleState = {
  visitors: Visitor[];
  residentVisitors: ResidentVisitor[];
  residentVisitorsLoading: boolean;
  residentVisitorsError: string | null;
  visitorPasses: VisitorPass[];
  visitorLogs: VisitorLog[];
};

export type VisitorModuleActions = {
  registerVisitor: (data: Partial<Visitor>) => Promise<Visitor>;
  getVisitors: (filter?: { status?: VisitorStatus }) => Visitor[];
  cancelVisitor: (visitorId: string) => Promise<void>;
  fetchResidentVisitors: (
    filter?: { status?: ResidentVisitorStatus },
  ) => Promise<ResidentVisitor[]>;
  getResidentVisitors: (
    filter?: { status?: ResidentVisitorStatus },
  ) => ResidentVisitor[];
  getResidentVisitor: (visitorId: string) => Promise<ResidentVisitor>;
  createResidentVisitor: (
    payload: CreateResidentVisitorDTO,
  ) => Promise<ResidentVisitor>;
  updateResidentVisitor: (
    visitorId: string,
    payload: UpdateResidentVisitorDTO,
  ) => Promise<ResidentVisitor>;
  cancelResidentVisitor: (visitorId: string) => Promise<ResidentVisitor>;
  clearResidentVisitorsError: () => void;
  appendVisitorPass: (pass: VisitorPass) => void;
  getVisitorPasses: () => VisitorPass[];
  getVisitorPassesByBuilding: (buildingId: string) => VisitorPass[];
  approveVisitorPass: (passId: string) => Promise<VisitorPass>;
  rejectVisitorPass: (passId: string, notes?: string) => Promise<VisitorPass>;
  markVisitorPassCheckIn: (passId: string, timestamp?: string) => Promise<VisitorPass>;
  markVisitorPassComplete: (passId: string, timestamp?: string) => Promise<VisitorPass>;
  cancelVisitorPass: (passId: string, notes?: string) => Promise<VisitorPass>;
  addVisitorLog: (logData: Partial<VisitorLog>) => Promise<VisitorLog>;
  updateVisitorLog: (logId: string, updates: Partial<VisitorLog>) => Promise<VisitorLog>;
  getVisitorLogsByBuilding: (
    buildingId: string,
    filter?: { type?: VisitorLog["type"]; status?: VisitorLog["status"] },
  ) => VisitorLog[];
  getVisitorsByBuilding: (buildingId: string) => Visitor[];
};

type VisitorModuleDeps = {
  auth: AuthDependency;
  notifications: NotificationsDependency;
};

export const useVisitorModule = ({
  auth,
  notifications,
}: VisitorModuleDeps): {
  state: VisitorModuleState;
  actions: VisitorModuleActions;
} => {
  const [visitors, setVisitors] = useState<Visitor[]>(DEFAULT_VISITORS);
  const [residentVisitors, setResidentVisitors] = useState<ResidentVisitor[]>([]);
  const [residentVisitorsLoading, setResidentVisitorsLoading] = useState(false);
  const [residentVisitorsError, setResidentVisitorsError] =
    useState<string | null>(null);
  const [visitorPasses, setVisitorPasses] =
    useState<VisitorPass[]>(DEFAULT_VISITOR_PASSES);
  const [visitorLogs, setVisitorLogs] =
    useState<VisitorLog[]>(DEFAULT_VISITOR_LOGS);

  const UNIT_SCOPE_ERROR =
    "Visitor management is only available when your account has one active unit.";

  const normalizeResidentVisitorError = useCallback((error: unknown): Error => {
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      (error as { status?: number }).status === 409
    ) {
      return new Error(UNIT_SCOPE_ERROR);
    }

    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      return new Error((error as { message: string }).message);
    }

    return new Error("Failed to manage visitors");
  }, []);

  const upsertResidentVisitor = useCallback((incoming: ResidentVisitor) => {
    setResidentVisitors((prev) => {
      const exists = prev.some((visitor) => visitor.id === incoming.id);
      const next = exists
        ? prev.map((visitor) =>
            visitor.id === incoming.id ? incoming : visitor,
          )
        : [incoming, ...prev];

      return next.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
  }, []);

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
    async (visitorId: string): Promise<void> =>
      new Promise((resolve) => {
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
      }),
    [visitors, auth.currentUser, notifications.actions],
  );

  const fetchResidentVisitors = useCallback(
    async (
      filter?: { status?: ResidentVisitorStatus },
    ): Promise<ResidentVisitor[]> => {
      if (!auth.currentUser) {
        setResidentVisitors([]);
        return [];
      }

      setResidentVisitorsLoading(true);
      setResidentVisitorsError(null);

      try {
        const data = await residentVisitorsApi.listVisitors(filter?.status);
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setResidentVisitors(sorted);
        return sorted;
      } catch (error) {
        const normalizedError = normalizeResidentVisitorError(error);
        setResidentVisitorsError(normalizedError.message);
        throw normalizedError;
      } finally {
        setResidentVisitorsLoading(false);
      }
    },
    [auth.currentUser, normalizeResidentVisitorError],
  );

  const getResidentVisitors = useCallback(
    (filter?: { status?: ResidentVisitorStatus }) => {
      let filtered = residentVisitors;

      if (filter?.status) {
        filtered = filtered.filter((visitor) => visitor.status === filter.status);
      }

      return filtered;
    },
    [residentVisitors],
  );

  const getResidentVisitor = useCallback(
    async (visitorId: string): Promise<ResidentVisitor> => {
      const existing = residentVisitors.find((visitor) => visitor.id === visitorId);
      if (existing) {
        return existing;
      }

      try {
        setResidentVisitorsError(null);
        const visitor = await residentVisitorsApi.getVisitor(visitorId);
        upsertResidentVisitor(visitor);
        return visitor;
      } catch (error) {
        const normalizedError = normalizeResidentVisitorError(error);
        setResidentVisitorsError(normalizedError.message);
        throw normalizedError;
      }
    },
    [normalizeResidentVisitorError, residentVisitors, upsertResidentVisitor],
  );

  const createResidentVisitor = useCallback(
    async (payload: CreateResidentVisitorDTO): Promise<ResidentVisitor> => {
      if (!auth.currentUser) {
        throw new Error("User must be authenticated to manage visitors");
      }

      try {
        setResidentVisitorsError(null);
        const visitor = await residentVisitorsApi.createVisitor(payload);
        upsertResidentVisitor(visitor);
        notifications.actions.createNotification(
          auth.currentUser.id,
          "Visitor Registered",
          `${visitor.visitorName} has been added to your visitor list.`,
          "success",
        );
        return visitor;
      } catch (error) {
        const normalizedError = normalizeResidentVisitorError(error);
        setResidentVisitorsError(normalizedError.message);
        throw normalizedError;
      }
    },
    [
      auth.currentUser,
      normalizeResidentVisitorError,
      notifications.actions,
      upsertResidentVisitor,
    ],
  );

  const updateResidentVisitor = useCallback(
    async (
      visitorId: string,
      payload: UpdateResidentVisitorDTO,
    ): Promise<ResidentVisitor> => {
      if (!auth.currentUser) {
        throw new Error("User must be authenticated to manage visitors");
      }

      try {
        setResidentVisitorsError(null);
        const visitor = await residentVisitorsApi.updateVisitor(visitorId, payload);
        upsertResidentVisitor(visitor);
        notifications.actions.createNotification(
          auth.currentUser.id,
          "Visitor Updated",
          `${visitor.visitorName}'s details have been updated.`,
          "info",
        );
        return visitor;
      } catch (error) {
        const normalizedError = normalizeResidentVisitorError(error);
        setResidentVisitorsError(normalizedError.message);
        throw normalizedError;
      }
    },
    [
      auth.currentUser,
      normalizeResidentVisitorError,
      notifications.actions,
      upsertResidentVisitor,
    ],
  );

  const cancelResidentVisitor = useCallback(
    async (visitorId: string): Promise<ResidentVisitor> => {
      if (!auth.currentUser) {
        throw new Error("User must be authenticated to manage visitors");
      }

      try {
        setResidentVisitorsError(null);
        const visitor = await residentVisitorsApi.cancelVisitor(visitorId);
        upsertResidentVisitor(visitor);
        notifications.actions.createNotification(
          auth.currentUser.id,
          "Visitor Cancelled",
          `Registration for ${visitor.visitorName} has been cancelled.`,
          "info",
        );
        return visitor;
      } catch (error) {
        const normalizedError = normalizeResidentVisitorError(error);
        setResidentVisitorsError(normalizedError.message);
        throw normalizedError;
      }
    },
    [
      auth.currentUser,
      normalizeResidentVisitorError,
      notifications.actions,
      upsertResidentVisitor,
    ],
  );

  const getVisitorPasses = useCallback(() => visitorPasses, [visitorPasses]);

  const appendVisitorPass = useCallback((pass: VisitorPass) => {
    setVisitorPasses((prev) => [pass, ...prev]);
  }, []);

  const getVisitorPassesByBuilding = useCallback(
    (buildingId: string) =>
      visitorPasses.filter((pass) => pass.buildingId === buildingId),
    [visitorPasses],
  );

  const mutateVisitorPass = useCallback(
    async (
      passId: string,
      updates: Partial<VisitorPass>,
    ): Promise<VisitorPass> =>
      new Promise((resolve, reject) => {
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
      }),
    [],
  );

  const approveVisitorPass = useCallback(
    async (passId: string): Promise<VisitorPass> =>
      mutateVisitorPass(passId, { status: "approved" }),
    [mutateVisitorPass],
  );

  const rejectVisitorPass = useCallback(
    async (passId: string, notes?: string): Promise<VisitorPass> =>
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
    async (passId: string, notes?: string): Promise<VisitorPass> =>
      mutateVisitorPass(passId, { status: "cancelled", notes }),
    [mutateVisitorPass],
  );

  const addVisitorLog = useCallback(
    async (logData: Partial<VisitorLog>): Promise<VisitorLog> =>
      new Promise((resolve) => {
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
      }),
    [],
  );

  const updateVisitorLog = useCallback(
    async (
      logId: string,
      updates: Partial<VisitorLog>,
    ): Promise<VisitorLog> =>
      new Promise((resolve, reject) => {
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
      }),
    [],
  );

  const getVisitorLogsByBuilding = useCallback(
    (
      buildingId: string,
      filter?: { type?: VisitorLog["type"]; status?: VisitorLog["status"] },
    ) => {
      let filtered = visitorLogs.filter((log) => log.buildingId === buildingId);

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

  const getVisitorsByBuilding = useCallback(
    (buildingId: string) => {
      if (!buildingId) return [];
      return visitors.filter((visitor) => visitor.buildingId === buildingId);
    },
    [visitors],
  );

  return {
    state: {
      visitors,
      residentVisitors,
      residentVisitorsLoading,
      residentVisitorsError,
      visitorPasses,
      visitorLogs,
    },
    actions: {
      registerVisitor,
      getVisitors,
      cancelVisitor,
      fetchResidentVisitors,
      getResidentVisitors,
      getResidentVisitor,
      createResidentVisitor,
      updateResidentVisitor,
      cancelResidentVisitor,
      clearResidentVisitorsError: () => setResidentVisitorsError(null),
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
    },
  };
};
