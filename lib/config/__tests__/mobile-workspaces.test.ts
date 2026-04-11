import {
  getDefaultRoleFromPersona,
  getMobileWorkspaces,
  getResidentRouteName,
  getResidentWorkspaceAccessLevel,
  getResidentWorkspaceDescription,
  getRoleForMobileWorkspace,
  normalizeUserPersona,
  resolveInitialMobileRoute,
} from "../mobile-workspaces";

describe("mobile workspace routing", () => {
  it("routes invited residents without occupancy to the resident pre-move-in flow", () => {
    const persona = normalizeUserPersona({
      isResident: true,
      residentOccupancyStatus: "NONE",
    });

    const decision = resolveInitialMobileRoute({
      persona,
      mobileWorkspaces: ["resident"],
      activeWorkspace: "resident",
    });

    expect(decision).toMatchObject({
      type: "route",
      name: "ResidentPreMoveIn",
      href: "/(tenant)",
      workspace: "resident",
      role: "tenant",
    });
  });

  it("routes active residents to the resident home flow", () => {
    const decision = resolveInitialMobileRoute({
      persona: {
        isResident: true,
        residentOccupancyStatus: "ACTIVE",
      },
      mobileWorkspaces: ["resident"],
      activeWorkspace: "resident",
    });

    expect(decision).toMatchObject({
      type: "route",
      name: "ResidentHome",
      href: "/(tenant)",
    });
  });

  it("routes former residents to the limited resident shell by default", () => {
    const decision = resolveInitialMobileRoute({
      persona: {
        isResident: true,
        residentOccupancyStatus: "FORMER",
      },
      mobileWorkspaces: ["resident"],
      activeWorkspace: "resident",
    });

    expect(decision).toMatchObject({
      type: "route",
      name: "ResidentFormerAccount",
      href: "/(tenant)",
      workspace: "resident",
      role: "tenant",
    });
  });

  it("keeps resident workspace access level tied to persona occupancy even in multi-workspace accounts", () => {
    const persona = normalizeUserPersona({
      isResident: true,
      isOwner: true,
      residentOccupancyStatus: "FORMER",
    });

    expect(getResidentWorkspaceAccessLevel(persona)).toBe("former");
    expect(getResidentRouteName(persona)).toBe("ResidentFormerAccount");
    expect(getResidentWorkspaceDescription(persona)).toBe(
      "Former resident access and limited tenancy history.",
    );
  });

  it("shows the selector when multiple mobile workspaces exist and none is selected", () => {
    const decision = resolveInitialMobileRoute({
      persona: {
        isResident: true,
        isOwner: true,
        residentOccupancyStatus: "ACTIVE",
      },
      mobileWorkspaces: ["resident", "owner"],
      activeWorkspace: null,
    });

    expect(decision).toEqual({
      type: "workspace_selector",
      workspaces: ["resident", "owner"],
    });
  });

  it("keeps provider admin only accounts out of the mobile workspace list", () => {
    const workspaces = getMobileWorkspaces({
      persona: {
        isServiceProvider: true,
        serviceProviderRoles: ["ADMIN"],
      },
    });

    expect(workspaces).toEqual([]);
  });

  it("maps provider workers into the mounted provider workspace", () => {
    const persona = normalizeUserPersona({
      isServiceProvider: true,
      serviceProviderRoles: ["WORKER"],
    });

    expect(
      getRoleForMobileWorkspace("provider_worker", persona),
    ).toBe("service_provider");
  });

  it("maps building managers to the management portal through persona role keys", () => {
    const persona = normalizeUserPersona({
      isBuildingStaff: true,
      buildingStaffRoleKeys: ["BUILDING_MANAGER"],
    });

    expect(getMobileWorkspaces({ persona })).toEqual(["building_staff"]);
    expect(getRoleForMobileWorkspace("building_staff", persona)).toBe(
      "management",
    );
    expect(getDefaultRoleFromPersona(persona)).toBe("management");
  });
});
