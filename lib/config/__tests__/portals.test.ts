import {
  getMountedPortalConfig,
  getPostLoginHrefForRole,
  hasMountedPortal,
  isMountedPortalHome,
} from "../portals";

describe("portal registry", () => {
  it("returns mounted portal routes for live roles", () => {
    expect(getMountedPortalConfig("tenant")?.rootHref).toBe("/(tenant)");
    expect(getMountedPortalConfig("owner")?.rootHref).toBe("/(owner)");
    expect(getMountedPortalConfig("management")?.rootHref).toBe(
      "/(management)",
    );
    expect(getMountedPortalConfig("building_employee")?.rootHref).toBe(
      "/(buildingEmployee)",
    );
    expect(getMountedPortalConfig("service_provider")?.rootHref).toBe(
      "/(serviceProvider)",
    );
  });

  it("routes unsupported roles to the unavailable portal", () => {
    expect(hasMountedPortal("admin")).toBe(false);
    expect(hasMountedPortal("service_provider")).toBe(true);
    expect(getPostLoginHrefForRole("admin")).toBe("/portal-unavailable");
    expect(getPostLoginHrefForRole("service_provider")).toBe("/(serviceProvider)");
  });

  it("detects mounted portal home segments", () => {
    expect(isMountedPortalHome(["(tenant)"])).toBe(true);
    expect(isMountedPortalHome(["(owner)", "index"])).toBe(true);
    expect(isMountedPortalHome(["(tenant)", "index"])).toBe(true);
    expect(isMountedPortalHome(["(management)", "requests"])).toBe(false);
    expect(isMountedPortalHome(["auth"])).toBe(false);
  });
});
