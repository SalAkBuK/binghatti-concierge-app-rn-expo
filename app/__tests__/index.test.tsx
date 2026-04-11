import React from "react";
import { TouchableOpacity } from "react-native";
import TestRenderer, { act } from "react-test-renderer";

import type { MobileWorkspace, User } from "../../lib/types";
import IndexScreen from "../index";

const mockUseAuth = jest.fn();
const mockRedirect = jest.fn();
const mockReplace = jest.fn();
const mockAppBootstrapErrorScreen = jest.fn();

jest.mock("../../lib/context/auth-context", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("../../components/ui/LoadingScreen", () => ({
  LoadingScreen: () => null,
}));

jest.mock("../../components/ui/AppBootstrapErrorScreen", () => ({
  AppBootstrapErrorScreen: (props: {
    message: string;
    onRetry: () => void;
    onContinueToSignIn: () => void;
  }) => {
    const React = jest.requireActual("react");
    const { Text, TouchableOpacity } = jest.requireActual("react-native");
    mockAppBootstrapErrorScreen(props);
    return (
      <React.Fragment>
        <Text>{props.message}</Text>
        <TouchableOpacity onPress={props.onRetry}>
          <Text>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={props.onContinueToSignIn}>
          <Text>Continue to Sign In</Text>
        </TouchableOpacity>
      </React.Fragment>
    );
  },
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
  email: "tenant@example.com",
  name: "Test User",
  role: "tenant",
  persona: {
    isResident: true,
    residentOccupancyStatus: "ACTIVE",
  },
  mobileWorkspaces: ["resident"],
  activeWorkspace: "resident",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const buildWorkspaceUser = (
  workspaces: MobileWorkspace[],
  overrides: Partial<User> = {},
): User =>
  buildUser({
    mobileWorkspaces: workspaces,
    activeWorkspace: workspaces.length === 1 ? workspaces[0] : null,
    ...overrides,
  });

const buildAuthValue = (overrides: Record<string, unknown> = {}) => ({
  isAuthenticated: false,
  currentUser: null,
  bootstrapStatus: "ready",
  bootstrapError: null,
  actions: {
    retryBootstrap: jest.fn(),
    recoverFromBootstrapError: jest.fn().mockResolvedValue(undefined),
  },
  ...overrides,
});

describe("IndexScreen", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockReplace.mockClear();
    mockAppBootstrapErrorScreen.mockClear();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("redirects authenticated tenant users to the tenant portal", () => {
    mockUseAuth.mockReturnValue(
      buildAuthValue({
        isAuthenticated: true,
        currentUser: buildUser({ role: "tenant" }),
      }),
    );

    act(() => {
      TestRenderer.create(<IndexScreen />);
    });

    expect(mockRedirect).toHaveBeenLastCalledWith({ href: "/(tenant)" });
  });

  it("redirects authenticated owner users to the owner portal", () => {
    mockUseAuth.mockReturnValue(
      buildAuthValue({
        isAuthenticated: true,
        currentUser: buildWorkspaceUser(["owner"], {
          role: "owner",
          persona: {
            isOwner: true,
          },
        }),
      }),
    );

    act(() => {
      TestRenderer.create(<IndexScreen />);
    });

    expect(mockRedirect).toHaveBeenLastCalledWith({ href: "/(owner)" });
  });

  it("redirects multi-workspace users to the selector", () => {
    mockUseAuth.mockReturnValue(
      buildAuthValue({
        isAuthenticated: true,
        currentUser: buildWorkspaceUser(["resident", "owner"], {
          activeWorkspace: null,
          role: "tenant",
          persona: {
            isResident: true,
            isOwner: true,
            residentOccupancyStatus: "ACTIVE",
          },
        }),
      }),
    );

    act(() => {
      TestRenderer.create(<IndexScreen />);
    });

    expect(mockRedirect).toHaveBeenLastCalledWith({
      href: "/workspace-selector",
    });
  });

  it("redirects unsupported personas to the unavailable portal", () => {
    mockUseAuth.mockReturnValue(
      buildAuthValue({
        isAuthenticated: true,
        currentUser: buildUser({
          role: "admin",
          persona: {
            keys: ["ORG_ADMIN"],
          },
          mobileWorkspaces: [],
          activeWorkspace: null,
        }),
      }),
    );

    act(() => {
      TestRenderer.create(<IndexScreen />);
    });

    expect(mockRedirect).toHaveBeenLastCalledWith({
      href: "/portal-unavailable",
    });
  });

  it("redirects unauthenticated users to auth", () => {
    mockUseAuth.mockReturnValue(buildAuthValue());

    act(() => {
      TestRenderer.create(<IndexScreen />);
    });

    expect(mockRedirect).toHaveBeenLastCalledWith({ href: "/auth" });
  });

  it("stays in loading state while auth bootstrap is restoring", () => {
    mockUseAuth.mockReturnValue(
      buildAuthValue({
        bootstrapStatus: "restoring",
      }),
    );

    act(() => {
      TestRenderer.create(<IndexScreen />);
    });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockAppBootstrapErrorScreen).not.toHaveBeenCalled();
  });

  it("shows recovery actions when auth bootstrap fails", async () => {
    const retryBootstrap = jest.fn();
    const recoverFromBootstrapError = jest.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue(
      buildAuthValue({
        bootstrapStatus: "error",
        bootstrapError: "Bootstrap failed",
        actions: {
          retryBootstrap,
          recoverFromBootstrapError,
        },
      }),
    );

    let tree: TestRenderer.ReactTestRenderer;

    act(() => {
      tree = TestRenderer.create(<IndexScreen />);
    });

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockAppBootstrapErrorScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Bootstrap failed",
      }),
    );

    const touchables = tree!.root.findAllByType(TouchableOpacity);

    act(() => {
      touchables[0].props.onPress();
    });

    expect(retryBootstrap).toHaveBeenCalledTimes(1);

    await act(async () => {
      touchables[1].props.onPress();
      await Promise.resolve();
    });

    expect(recoverFromBootstrapError).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/auth");
  });
});
