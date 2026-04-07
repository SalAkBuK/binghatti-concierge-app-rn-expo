import type { UserRole } from "../types";

export type MountedPortalConfig = {
  role: "tenant" | "owner" | "management" | "building_employee";
  segment: "(tenant)" | "(owner)" | "(management)" | "(buildingEmployee)";
  rootHref: "/(tenant)" | "/(owner)" | "/(management)" | "/(buildingEmployee)";
};

export const MOUNTED_PORTAL_CONFIGS: readonly MountedPortalConfig[] = [
  {
    role: "tenant",
    segment: "(tenant)",
    rootHref: "/(tenant)",
  },
  {
    role: "owner",
    segment: "(owner)",
    rootHref: "/(owner)",
  },
  {
    role: "management",
    segment: "(management)",
    rootHref: "/(management)",
  },
  {
    role: "building_employee",
    segment: "(buildingEmployee)",
    rootHref: "/(buildingEmployee)",
  },
] as const;

export const MOUNTED_PORTAL_SEGMENTS = MOUNTED_PORTAL_CONFIGS.map(
  (portal) => portal.segment,
);

export const getMountedPortalConfig = (
  role?: UserRole | null,
): MountedPortalConfig | null =>
  MOUNTED_PORTAL_CONFIGS.find((portal) => portal.role === role) ?? null;

export const hasMountedPortal = (role?: UserRole | null): boolean =>
  getMountedPortalConfig(role) != null;

export const getRoleHomeHref = (role?: UserRole | null): string | null =>
  getMountedPortalConfig(role)?.rootHref ?? null;

export const getPostLoginHrefForRole = (role?: UserRole | null): string =>
  getRoleHomeHref(role) ?? "/portal-unavailable";

export const isMountedPortalSegment = (segment?: string): boolean =>
  MOUNTED_PORTAL_SEGMENTS.includes(
    segment as (typeof MOUNTED_PORTAL_SEGMENTS)[number],
  );

export const isMountedPortalHome = (segments: string[]): boolean => {
  if (!isMountedPortalSegment(segments[0])) {
    return false;
  }

  const secondSegment = segments[1];

  return (
    segments.length === 1 ||
    (segments.length === 2 &&
      (secondSegment === undefined ||
        secondSegment === "" ||
        secondSegment === "index"))
  );
};
