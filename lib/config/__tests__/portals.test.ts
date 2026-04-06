import {
  getMountedPortalConfig,
  getPostLoginHrefForRole,
  hasMountedPortal,
  isMountedPortalHome,
} from "../portals";

describe("portal registry", () => {
  it("returns mounted portal routes for live roles", () => {
    expect(getMountedPortalConfig("tenant")?.rootHref).toBe("/(tenant)");
    expect(getMountedPortalConfig("management")?.rootHref).toBe(
      "/(management)",
    );
    expect(getMountedPortalConfig("building_employee")?.rootHref).toBe(
      "/(buildingEmployee)",
    );
  });

  it("routes unsupported roles to the unavailable portal", () => {
    expect(hasMountedPortal("admin")).toBe(false);
    expect(hasMountedPortal("service_provider")).toBe(false);
    expect(getPostLoginHrefForRole("admin")).toBe("/portal-unavailable");
    expect(getPostLoginHrefForRole("service_provider")).toBe(
      "/portal-unavailable",
    );
  });

  it("detects mounted portal home segments", () => {
    expect(isMountedPortalHome(["(tenant)"])).toBe(true);
    expect(isMountedPortalHome(["(tenant)", "index"])).toBe(true);
    expect(isMountedPortalHome(["(management)", "requests"])).toBe(false);
    expect(isMountedPortalHome(["auth"])).toBe(false);
  });
});
