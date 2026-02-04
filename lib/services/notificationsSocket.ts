import { io, Socket } from "socket.io-client";
import { APP_CONFIG } from "../utils/constants";

const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_BASE_URL ??
  APP_CONFIG.api.baseUrl.replace(/\/api$/, "");

let socket: Socket | null = null;
type SocketListener = (socketInstance: Socket | null) => void;
const socketListeners = new Set<SocketListener>();

const notifySocketListeners = () => {
  socketListeners.forEach((listener) => {
    try {
      listener(socket);
    } catch (error) {
      if (__DEV__) {
        console.log("[notificationsSocket] listener error", error);
      }
    }
  });
};

const buildQueryParams = (token: string, orgId?: string | null) => {
  const params = [`token=${encodeURIComponent(token)}`];
  if (orgId) {
    params.push(`orgId=${encodeURIComponent(orgId)}`);
  }
  return params.join("&");
};

export const connectNotifications = (
  token: string,
  options?: { useQueryAuth?: boolean; orgId?: string | null },
) => {
  if (socket) return socket;

  const useQueryAuth = Boolean(options?.useQueryAuth);
  const orgId = options?.orgId ?? null;
  const url = useQueryAuth
    ? `${WS_BASE_URL}/notifications?${buildQueryParams(token, orgId)}`
    : `${WS_BASE_URL}/notifications`;

  socket = io(url, {
    transports: ["polling"],
    upgrade: false,
    ...(useQueryAuth ? {} : { auth: { token, ...(orgId ? { orgId } : {}) } }),
  });

  notifySocketListeners();
  return socket;
};

export const disconnectNotifications = () => {
  socket?.disconnect();
  socket = null;
  notifySocketListeners();
};

export const subscribeNotificationsSocket = (listener: SocketListener) => {
  socketListeners.add(listener);
  listener(socket);
  return () => {
    socketListeners.delete(listener);
  };
};
