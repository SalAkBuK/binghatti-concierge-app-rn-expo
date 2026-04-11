import type { MobileWorkspace, User, UserPersona } from "../types";
import { getRoleHomeHref } from "./portals";

type MobileRouteName =
  | "ResidentHome"
  | "ResidentPreMoveIn"
  | "ResidentFormerAccount"
  | "OwnerHome"
  | "ProviderWorkerHome"
  | "BuildingStaffHome";

export type ResidentWorkspaceAccessLevel =
  | "active"
  | "pre_move_in"
  | "former"
  | "not_resident";

export type MobileRouteDecision =
  | {
      type: "unsupported";
      workspaces: MobileWorkspace[];
    }
  | {
      type: "workspace_selector";
      workspaces: MobileWorkspace[];
    }
  | {
      type: "route";
      href: string;
      name: MobileRouteName;
      role: User["role"];
      workspace: MobileWorkspace;
      workspaces: MobileWorkspace[];
    };

const MANAGEMENT_BUILDING_STAFF_MARKERS = [
  "ADMIN",
  "BUILDING_ADMIN",
  "BUILDING_MANAGER",
  "MANAGER",
  "MANAGEMENT",
];

const normalizeToken = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().toUpperCase()
    : null;

const normalizeTokenArray = (values: unknown): string[] =>
  Array.isArray(values)
    ? values
        .map((value) => normalizeToken(value))
        .filter((value): value is string => value != null)
    : [];

const dedupeWorkspaces = (
  workspaces: MobileWorkspace[],
): MobileWorkspace[] => [...new Set(workspaces)];

export const normalizeUserPersona = (
  persona: unknown,
): UserPersona | null => {
  if (!persona || typeof persona !== "object") {
    return null;
  }

  const source = persona as Record<string, unknown>;
  const residentOccupancyStatus = normalizeToken(
    source.residentOccupancyStatus,
  );
  const residentInviteStatus = normalizeToken(source.residentInviteStatus);

  return {
    keys: normalizeTokenArray(source.keys),
    isResident: source.isResident === true,
    isOwner: source.isOwner === true,
    isServiceProvider: source.isServiceProvider === true,
    serviceProviderRoles: normalizeTokenArray(source.serviceProviderRoles),
    isBuildingStaff: source.isBuildingStaff === true,
    buildingStaffRoleKeys: normalizeTokenArray(source.buildingStaffRoleKeys),
    residentOccupancyStatus,
    residentInviteStatus,
  };
};

export const getMobileWorkspaces = (
  user: Pick<User, "persona"> | { persona?: UserPersona | null } | null | undefined,
): MobileWorkspace[] => {
  const persona = normalizeUserPersona(user?.persona);

  if (!persona) {
    return [];
  }

  const workspaces: MobileWorkspace[] = [];

  if (persona.isResident) {
    workspaces.push("resident");
  }

  if (persona.isOwner) {
    workspaces.push("owner");
  }

  if (
    persona.isServiceProvider &&
    persona.serviceProviderRoles?.includes("WORKER")
  ) {
    workspaces.push("provider_worker");
  }

  if (persona.isBuildingStaff) {
    workspaces.push("building_staff");
  }

  return dedupeWorkspaces(workspaces);
};

export const getMobileWorkspaceLabel = (workspace: MobileWorkspace): string => {
  switch (workspace) {
    case "resident":
      return "Resident";
    case "owner":
      return "Owner";
    case "provider_worker":
      return "Service Provider";
    case "building_staff":
      return "Building Staff";
  }
};

export const getResidentWorkspaceAccessLevel = (
  persona: UserPersona | null | undefined,
): ResidentWorkspaceAccessLevel => {
  const normalizedPersona = normalizeUserPersona(persona);

  if (!normalizedPersona?.isResident) {
    return "not_resident";
  }

  switch (normalizedPersona.residentOccupancyStatus) {
    case "ACTIVE":
      return "active";
    case "NONE":
      return "pre_move_in";
    case "FORMER":
    default:
      return "former";
  }
};

export const getResidentWorkspaceDescription = (
  persona: UserPersona | null | undefined,
): string => {
  switch (getResidentWorkspaceAccessLevel(persona)) {
    case "active":
      return "Resident home and day-to-day self-service.";
    case "pre_move_in":
      return "Pre-move-in access, onboarding, and move-in readiness.";
    case "former":
      return "Former resident access and limited tenancy history.";
    default:
      return "Resident access is unavailable for this account.";
  }
};

const resolveBuildingStaffPortalRole = (
  persona: UserPersona | null,
): User["role"] => {
  const roleKeys = normalizeTokenArray(persona?.buildingStaffRoleKeys);
  const isManagementWorkspace = roleKeys.some((roleKey) =>
    MANAGEMENT_BUILDING_STAFF_MARKERS.some((marker) =>
      roleKey.includes(marker),
    ),
  );

  return isManagementWorkspace ? "management" : "building_employee";
};

export const getRoleForMobileWorkspace = (
  workspace: MobileWorkspace,
  persona: UserPersona | null,
): User["role"] => {
  switch (workspace) {
    case "resident":
      return "tenant";
    case "owner":
      return "owner";
    case "provider_worker":
      return "service_provider";
    case "building_staff":
      return resolveBuildingStaffPortalRole(persona);
  }
};

export const getDefaultRoleFromPersona = (
  persona: UserPersona | null,
  fallbackRole: User["role"] = "tenant",
): User["role"] => {
  if (!persona) {
    return fallbackRole;
  }

  const keys = normalizeTokenArray(persona.keys);

  if (persona.isResident) {
    return "tenant";
  }

  if (persona.isOwner) {
    return "owner";
  }

  if (
    persona.isServiceProvider &&
    persona.serviceProviderRoles?.includes("WORKER")
  ) {
    return "service_provider";
  }

  if (persona.isBuildingStaff) {
    return resolveBuildingStaffPortalRole(persona);
  }

  if (keys.includes("PLATFORM_ADMIN")) {
    return "super_admin";
  }

  if (keys.includes("ORG_ADMIN")) {
    return "admin";
  }

  if (persona.isServiceProvider) {
    return "service_provider";
  }

  return fallbackRole;
};

export const getResidentRouteName = (
  persona: UserPersona | null,
): Extract<MobileRouteDecision, { type: "route" }>["name"] => {
  switch (getResidentWorkspaceAccessLevel(persona)) {
    case "active":
      return "ResidentHome";
    case "pre_move_in":
      return "ResidentPreMoveIn";
    default:
      return "ResidentFormerAccount";
  }
};

export const resolveInitialMobileRoute = (
  user: Pick<User, "persona" | "mobileWorkspaces" | "activeWorkspace"> | null | undefined,
): MobileRouteDecision => {
  const persona = normalizeUserPersona(user?.persona);
  const workspaces =
    Array.isArray(user?.mobileWorkspaces) && user.mobileWorkspaces.length > 0
      ? dedupeWorkspaces(user.mobileWorkspaces)
      : getMobileWorkspaces(user);

  if (workspaces.length === 0) {
    return {
      type: "unsupported",
      workspaces,
    };
  }

  const activeWorkspace =
    user?.activeWorkspace && workspaces.includes(user.activeWorkspace)
      ? user.activeWorkspace
      : null;

  if (workspaces.length > 1 && !activeWorkspace) {
    return {
      type: "workspace_selector",
      workspaces,
    };
  }

  const workspace = activeWorkspace ?? workspaces[0];
  const role = getRoleForMobileWorkspace(workspace, persona);
  const href = getRoleHomeHref(role) ?? "/portal-unavailable";
  const name =
    workspace === "resident"
      ? getResidentRouteName(persona)
      : workspace === "owner"
        ? "OwnerHome"
        : workspace === "provider_worker"
          ? "ProviderWorkerHome"
          : "BuildingStaffHome";

  return {
    type: "route",
    href,
    name,
    role,
    workspace,
    workspaces,
  };
};
