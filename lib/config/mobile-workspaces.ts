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

type MobileWorkspaceUser = Pick<User, "persona"> &
  Partial<Pick<User, "buildingAccess" | "buildingAssignments">>;

const BUILDING_STAFF_PERSONA_KEYS = new Set(["BUILDING_STAFF"]);
const BUILDING_STAFF_ACCESS_ROLE_KEYS = new Set([
  "BUILDING_STAFF",
  "BUILDING_ADMIN",
  "BUILDING_MANAGER",
  "BUILDING_EMPLOYEE",
  "MAINTENANCE_STAFF",
  "MAINTENANCESTAFF",
  "STAFF",
]);

const normalizeToken = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().toUpperCase()
    : null;

const normalizeKeyToken = (value: unknown): string | null => {
  const token = normalizeToken(value);
  return token ? token.replace(/[\s-]+/g, "_") : null;
};

const normalizeKeyTokenArray = (values: unknown): string[] =>
  Array.isArray(values)
    ? values
        .map((value) => normalizeKeyToken(value))
        .filter((value): value is string => value != null)
    : [];

const dedupeWorkspaces = (
  workspaces: MobileWorkspace[],
): MobileWorkspace[] => [...new Set(workspaces)];

const dedupeTokens = (tokens: string[]): string[] => [...new Set(tokens)];

const asAccessEntries = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (entry): entry is Record<string, unknown> =>
        entry != null && typeof entry === "object",
    );
  }

  if (value != null && typeof value === "object") {
    return [value as Record<string, unknown>];
  }

  return [];
};

const getBuildingAccessRoleKeys = (
  ...accessSources: unknown[]
): string[] =>
  dedupeTokens(
    accessSources
      .flatMap((source) => asAccessEntries(source))
      .flatMap((entry) => [
        entry.roleTemplateKey,
        entry.roleKey,
        entry.roleName,
        entry.type,
        entry.name,
        entry.key,
      ])
      .map((value) => normalizeKeyToken(value))
      .filter((value): value is string => value != null),
  );

const hasBuildingStaffRoleKey = (roleKeys: string[]): boolean =>
  roleKeys.some((roleKey) => BUILDING_STAFF_ACCESS_ROLE_KEYS.has(roleKey));

export const normalizeUserPersona = (
  persona: unknown,
): UserPersona | null => {
  if (!persona || typeof persona !== "object") {
    return null;
  }

  const source = persona as Record<string, unknown>;
  const keys = normalizeKeyTokenArray(source.keys);
  const buildingStaffRoleKeys = normalizeKeyTokenArray(
    source.buildingStaffRoleKeys,
  );
  const residentOccupancyStatus = normalizeToken(
    source.residentOccupancyStatus,
  );
  const residentInviteStatus = normalizeToken(source.residentInviteStatus);

  return {
    keys,
    isResident: source.isResident === true,
    isOwner: source.isOwner === true,
    isServiceProvider: source.isServiceProvider === true,
    serviceProviderRoles: normalizeKeyTokenArray(source.serviceProviderRoles),
    isBuildingStaff:
      source.isBuildingStaff === true ||
      keys.some((key) => BUILDING_STAFF_PERSONA_KEYS.has(key)) ||
      hasBuildingStaffRoleKey(buildingStaffRoleKeys),
    buildingStaffRoleKeys,
    isOrgAdmin: source.isOrgAdmin === true,
    isPlatformAdmin: source.isPlatformAdmin === true,
    residentOccupancyStatus,
    residentInviteStatus,
  };
};

export const normalizeMobileWorkspacePersona = (
  user: MobileWorkspaceUser | { persona?: UserPersona | null } | null | undefined,
): UserPersona | null => {
  const persona = normalizeUserPersona(user?.persona);

  if (!persona) {
    return null;
  }

  const accessRoleKeys = getBuildingAccessRoleKeys(
    (user as MobileWorkspaceUser | undefined)?.buildingAccess,
    (user as MobileWorkspaceUser | undefined)?.buildingAssignments,
  );

  if (accessRoleKeys.length === 0) {
    return persona;
  }

  const buildingStaffRoleKeys = dedupeTokens([
    ...(persona.buildingStaffRoleKeys ?? []),
    ...accessRoleKeys,
  ]);

  return {
    ...persona,
    buildingStaffRoleKeys,
    isBuildingStaff:
      persona.isBuildingStaff === true ||
      hasBuildingStaffRoleKey(buildingStaffRoleKeys),
  };
};

export const getMobileWorkspaces = (
  user: MobileWorkspaceUser | { persona?: UserPersona | null } | null | undefined,
): MobileWorkspace[] => {
  const persona = normalizeMobileWorkspacePersona(user);

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

  if (persona.isBuildingStaff || persona.isOrgAdmin) {
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
      return "Operations";
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
  if (persona?.isOrgAdmin === true) {
    return "management";
  }

  return "building_employee";
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

  if (persona.isBuildingStaff) {
    return resolveBuildingStaffPortalRole(persona);
  }

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

  if (persona.isPlatformAdmin) {
    return "super_admin";
  }

  if (persona.isOrgAdmin) {
    return "admin";
  }

  if (persona.isServiceProvider) {
    return "service_provider";
  }

  return fallbackRole;
};

export const getPriorityMobileWorkspace = (
  persona: UserPersona | null | undefined,
  workspaces: MobileWorkspace[],
): MobileWorkspace | null => {
  const normalizedPersona = normalizeUserPersona(persona);

  if (
    normalizedPersona?.isBuildingStaff === true &&
    workspaces.includes("building_staff")
  ) {
    return "building_staff";
  }

  return null;
};

export const canSwitchMobileWorkspace = (
  user: MobileWorkspaceUser | { persona?: UserPersona | null } | null | undefined,
): boolean => {
  const persona = normalizeMobileWorkspacePersona(user);
  const workspaces = getMobileWorkspaces(user);

  return (
    workspaces.length > 1 &&
    getPriorityMobileWorkspace(persona, workspaces) == null
  );
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
  user:
    | Pick<
        User,
        | "persona"
        | "mobileWorkspaces"
        | "activeWorkspace"
        | "buildingAccess"
        | "buildingAssignments"
      >
    | null
    | undefined,
): MobileRouteDecision => {
  const persona = normalizeMobileWorkspacePersona(user);
  const workspaces = getMobileWorkspaces(user);

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
  const priorityWorkspace = getPriorityMobileWorkspace(persona, workspaces);

  if (workspaces.length > 1 && !activeWorkspace && !priorityWorkspace) {
    return {
      type: "workspace_selector",
      workspaces,
    };
  }

  const workspace = activeWorkspace ?? priorityWorkspace ?? workspaces[0];
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
