import { useCallback, useState } from "react";

import type {
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
import type { AuthContextType } from "../auth-context";
import type { NotificationsContextType } from "../notifications-context";

type AuthDependency = Pick<AuthContextType, "currentUser">;
type NotificationsDependency = Pick<NotificationsContextType, "actions">;

export type VisitorModuleState = {
  visitors: Visitor[];
  visitorPasses: VisitorPass[];
  visitorLogs: VisitorLog[];
};

export type VisitorModuleActions = {
  registerVisitor: (data: Partial<Visitor>) => Promise<Visitor>;
  getVisitors: (filter?: { status?: VisitorStatus }) => Visitor[];
  cancelVisitor: (visitorId: string) => Promise<void>;
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
  const [visitorPasses, setVisitorPasses] =
    useState<VisitorPass[]>(DEFAULT_VISITOR_PASSES);
  const [visitorLogs, setVisitorLogs] =
    useState<VisitorLog[]>(DEFAULT_VISITOR_LOGS);

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
      visitorPasses,
      visitorLogs,
    },
    actions: {
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
    },
  };
};
