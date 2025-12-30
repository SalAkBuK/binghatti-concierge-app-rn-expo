import { io, Socket } from "socket.io-client";
import { APP_CONFIG } from "../utils/constants";

const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_BASE_URL ??
  APP_CONFIG.api.baseUrl.replace(/\/api$/, "");

let socket: Socket | null = null;

export const connectNotifications = (
  token: string,
  options?: { useQueryAuth?: boolean },
) => {
  if (socket) return socket;

  const useQueryAuth = Boolean(options?.useQueryAuth);
  const url = useQueryAuth
    ? `${WS_BASE_URL}/notifications?token=${encodeURIComponent(token)}`
    : `${WS_BASE_URL}/notifications`;

  socket = io(url, {
    transports: ["websocket"],
    ...(useQueryAuth ? {} : { auth: { token } }),
  });

  return socket;
};

export const disconnectNotifications = () => {
  socket?.disconnect();
  socket = null;
};
