import React from "react";
import { Text, TouchableOpacity } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import type { User } from "../../lib/types";
import PortalUnavailableScreen from "../portal-unavailable";

const mockUseAuth = jest.fn();
const mockReplace = jest.fn();
const mockRedirect = jest.fn();

jest.mock("../../lib/context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  Redirect: (props: { href: string }) => {
    mockRedirect(props);
    return null;
  },
}));

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: "user-1",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("PortalUnavailableScreen", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockReplace.mockClear();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows the unavailable state for unsupported roles", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser({ role: "admin" }),
      actions: {
        logout: jest.fn().mockResolvedValue(undefined),
      },
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<PortalUnavailableScreen />);
    });

    const renderedTexts = tree!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .filter((value) => typeof value === "string");

    expect(renderedTexts).toContain("Portal Unavailable");
    expect(renderedTexts).toContain(
      "No mounted mobile portal for the current role",
    );
    expect(renderedTexts).toContain("Role: ");
    expect(renderedTexts).toContain("admin");
  });

  it("signs out and routes to auth when the button is pressed", async () => {
    const logout = jest.fn().mockResolvedValue(undefined);

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser({ role: "admin" }),
      actions: { logout },
    });

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<PortalUnavailableScreen />);
    });

    const touchables = tree!.root.findAllByType(TouchableOpacity);

    await act(async () => {
      await touchables[0].props.onPress();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/auth");
  });

  it("redirects mounted roles away from the unavailable screen", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser({ role: "service_provider" }),
      actions: {
        logout: jest.fn().mockResolvedValue(undefined),
      },
    });

    act(() => {
      TestRenderer.create(<PortalUnavailableScreen />);
    });

    expect(mockRedirect).toHaveBeenCalledWith({ href: "/(serviceProvider)" });
  });
});
