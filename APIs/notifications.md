# Expo React Native: Realtime Notifications Integration

This guide shows how to connect the mobile app to Socket.IO notifications and
keep the UI in sync with REST.

## What you are connecting to

- Namespace: `/notifications`
- Socket.IO path: default `/socket.io`
- Events:
  - `notifications:hello` -> `{ unreadCount }`
  - `notifications:new` -> `{ id, type, title, body, data, readAt, dismissedAt, createdAt }`
  - `notifications:read` -> `{ id, readAt }`
  - `notifications:read_all` -> `{ readAt }`
  - `notifications:dismiss` -> `{ id, dismissedAt }`
  - `notifications:undismiss` -> `{ id }`

Payload shape (reference):

```ts
type RealtimeNotification = {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  data?: Record<string, any>;
  readAt?: string | null;
  dismissedAt?: string | null;
  createdAt: string;
};
```

## Install dependency

```bash
npm install socket.io-client
```

## Create a Socket.IO helper (mobile)

Create `lib/services/notificationsSocket.ts`:

```ts
import { io, Socket } from "socket.io-client";
import { APP_CONFIG } from "@/lib/utils/constants";

const WS_BASE_URL =
  process.env.EXPO_PUBLIC_WS_BASE_URL ??
  APP_CONFIG.api.baseUrl.replace(/\/api$/, "");

let socket: Socket | null = null;

export const connectNotifications = (token: string) => {
  if (socket) return socket;

  socket = io(`${WS_BASE_URL}/notifications`, {
    transports: ["websocket"],
    auth: { token },
  });

  return socket;
};

export const disconnectNotifications = () => {
  socket?.disconnect();
  socket = null;
};
```

## Wiring it into the app

Use `useAuth` + `apiService.getAuthToken()` (or `expo-secure-store`) to read
the access token, then connect in a top-level component.

Example (Expo Router `app/_layout.tsx` or a root provider):

```tsx
import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuth } from "@/lib/context/auth-context";
import { apiService } from "@/lib/services/api";
import {
  connectNotifications,
  disconnectNotifications,
} from "@/lib/services/notificationsSocket";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let isMounted = true;
    let activeSocket: ReturnType<typeof connectNotifications> | null = null;

    const connect = async () => {
      const token = await apiService.getAuthToken();
      if (!token || !isMounted) return;
      activeSocket = connectNotifications(token);
    };

    if (isAuthenticated) {
      connect();
    }

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        connect();
      } else {
        disconnectNotifications();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
      disconnectNotifications();
    };
  }, [isAuthenticated]);

  return <>{children}</>;
}
```

## Handling events in the app

Use the socket to update your notifications state:

- `notifications:hello` -> refresh unread count
- `notifications:new` -> prepend to list
- `notifications:read` -> mark one as read
- `notifications:read_all` -> mark all as read
- `notifications:dismiss` -> hide (or archive) in UI
- `notifications:undismiss` -> restore in UI

Tip: when `body` arrives, map it to your UI `message` field if needed.

## Reconnect strategy (important)

When socket connects/reconnects, refetch unread notifications:

```
GET /notifications?unreadOnly=true&limit=50
```

## REST endpoints

- List: `GET /notifications?unreadOnly=true&limit=20&cursor=...`
- Mark one as read: `POST /notifications/:id/read`
- Mark all as read: `POST /notifications/read-all`
- Dismiss: `POST /notifications/:id/dismiss`
- Restore: `POST /notifications/:id/undismiss`

All routes require `Authorization: Bearer <accessToken>`.

## Cursor pagination (history view)

- Cursor format: base64 of `${createdAt.toISOString()}|${id}`
- Order: `createdAt DESC, id DESC`
- Example:
  ```
  GET /notifications?limit=20&cursor=<base64>
  ```

## Common pitfalls

- Connect only on device (no SSR).
- Use `transports: ["websocket"]` on mobile.
- Disconnect or pause when the app is backgrounded.
