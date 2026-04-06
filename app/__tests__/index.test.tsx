import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import type { User } from "../../lib/types";
import IndexScreen from "../index";

const mockUseAuth = jest.fn();
const mockRedirect = jest.fn();

jest.mock("../../lib/context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../components/ui/LoadingScreen", () => ({
  LoadingScreen: () => null,
}));

jest.mock("expo-router", () => ({
  Redirect: (props: { href: string }) => {
    mockRedirect(props);
    return null;
  },
}));

const buildUser = (overrides: Partial<User> = {}): User => ({
  id: "user-1",
  email: "tenant@example.com",
  name: "Test User",
  role: "tenant",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

describe("IndexScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRedirect.mockClear();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("redirects authenticated tenant users to the tenant portal", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser({ role: "tenant" }),
    });

    act(() => {
      TestRenderer.create(<IndexScreen />);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockRedirect).toHaveBeenLastCalledWith({ href: "/(tenant)" });
  });

  it("redirects unsupported roles to the unavailable portal", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      currentUser: buildUser({ role: "admin" }),
    });

    act(() => {
      TestRenderer.create(<IndexScreen />);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockRedirect).toHaveBeenLastCalledWith({
      href: "/portal-unavailable",
    });
  });

  it("redirects unauthenticated users to auth", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      currentUser: null,
    });

    act(() => {
      TestRenderer.create(<IndexScreen />);
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockRedirect).toHaveBeenLastCalledWith({ href: "/auth" });
  });
});
