import {
  canSwitchMobileWorkspace,
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
    expect(
      canSwitchMobileWorkspace({
        persona: {
          isResident: true,
          isOwner: true,
          residentOccupancyStatus: "ACTIVE",
        },
      }),
    ).toBe(true);
  });

  it("prioritizes building staff over resident when both personas are present", () => {
    const decision = resolveInitialMobileRoute({
      persona: {
        keys: ["RESIDENT", "BUILDING_STAFF"],
        isResident: true,
        residentOccupancyStatus: "ACTIVE",
      },
      mobileWorkspaces: ["resident", "building_staff"],
      activeWorkspace: null,
    });

    expect(decision).toMatchObject({
      type: "route",
      workspace: "building_staff",
      role: "building_employee",
      href: "/(buildingEmployee)",
    });
    expect(
      canSwitchMobileWorkspace({
        persona: {
          keys: ["RESIDENT", "BUILDING_STAFF"],
          isResident: true,
          residentOccupancyStatus: "ACTIVE",
        },
      }),
    ).toBe(false);
  });

  it("derives building staff workspace from building access role templates", () => {
    const decision = resolveInitialMobileRoute({
      persona: {
        keys: ["RESIDENT"],
        isResident: true,
        residentOccupancyStatus: "ACTIVE",
      },
      buildingAccess: [{ roleTemplateKey: "building_manager" }],
      mobileWorkspaces: ["resident", "building_staff"],
      activeWorkspace: null,
    });

    expect(decision).toMatchObject({
      type: "route",
      workspace: "building_staff",
      role: "building_employee",
      href: "/(buildingEmployee)",
    });
  });

  it("ignores stale persisted mobileWorkspaces that are not backed by persona", () => {
    const decision = resolveInitialMobileRoute({
      persona: {
        isBuildingStaff: true,
        buildingStaffRoleKeys: ["BUILDING_EMPLOYEE"],
      },
      mobileWorkspaces: ["resident", "owner"],
      activeWorkspace: "resident",
    });

    expect(decision).toMatchObject({
      type: "route",
      workspace: "building_staff",
      role: "building_employee",
      href: "/(buildingEmployee)",
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

  it("maps building staff to the building employee portal regardless of staff role key labels", () => {
    const persona = normalizeUserPersona({
      isBuildingStaff: true,
      buildingStaffRoleKeys: ["BUILDING_MANAGER"],
    });

    expect(getMobileWorkspaces({ persona })).toEqual(["building_staff"]);
    expect(getRoleForMobileWorkspace("building_staff", persona)).toBe(
      "building_employee",
    );
    expect(getDefaultRoleFromPersona(persona)).toBe("building_employee");
  });

  it("maps org admins into the mounted management workspace from persona entitlement", () => {
    const persona = normalizeUserPersona({
      isOrgAdmin: true,
    });

    expect(getMobileWorkspaces({ persona })).toEqual(["building_staff"]);
    expect(getRoleForMobileWorkspace("building_staff", persona)).toBe(
      "management",
    );
  });

  it("does not expose a mobile workspace for platform admin unless explicitly supported", () => {
    const persona = normalizeUserPersona({
      isPlatformAdmin: true,
    });

    expect(getMobileWorkspaces({ persona })).toEqual([]);
  });
});
