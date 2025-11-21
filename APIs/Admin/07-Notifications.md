# Module 07 — Notifications & Activity Feed

Notifications power the inbox on `app/(admin)/activity.tsx` and the badge on the universal header. This module defines the endpoints the UI expects when marking alerts as read or fetching the activity list.

**Key types**: `Notification` (`lib/types/index.ts:140-162`).

---

## GET `/api/admin/notifications`
- Query params:
  | Param | Type | Notes |
  | --- | --- | --- |
  | `userId` | string | Required; only fetch notifications for the signed-in admin/manager. |
  | `page` / `pageSize` | number | Optional pagination. |
  | `type` | `"info" \| "success" \| "warning" \| "error"` | Optional filter for future UI tabs. |
- Response: `ApiResponse<Notification[]>` sorted by `createdAt` desc.

## PATCH `/api/admin/notifications/{id}/read`
- Body: `{ read: true }`.
- Marks a single notification as read and returns the updated record so the UI can update local state.

## POST `/api/admin/notifications/read-all`
- Body: `{ userId: string }`.
- Clears every unread notification for the user and returns `{ success: true }`.
- Perform the update in a single transaction to avoid partial failures.

## Activity Timeline Data
If you decouple notifications from the operations timeline, expose `/api/admin/analytics/recent-activity` (see Module 06) or a dedicated `/api/admin/activity-feed` endpoint that returns `[{ id, type, description, timestamp }]`.
