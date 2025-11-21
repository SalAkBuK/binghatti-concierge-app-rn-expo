# Module 02 — Requests Management (Management Role)

This module documents the endpoints the management app (`app/(management)/requests.tsx`, `/more.tsx`, etc.) uses to triage tenant requests. The flows mirror the admin side but are scoped to the manager’s assigned buildings.

**Key types**: `Request`, `RequestMessage`, `RequestNote`, `CreateRequestDTO`, `UpdateRequestDTO` (`lib/types/index.ts:205-389`, `1419-1445`).

---

## Endpoint matrix

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/management/requests` | `GET` | List requests for the manager’s buildings with filters (status, type, building). |
| `/api/management/requests/{id}` | `GET` | Fetch full request detail (timeline, messages, attachments). |
| `/api/management/requests/{id}` | `PUT` | Update status, priority, assignee, or internal notes. |
| `/api/management/requests/{id}/messages` | `POST` | Add a message/comment in the tenant thread. |
| `/api/management/requests/{id}/notes` | `POST` | Add an internal note visible only to staff. |

All responses return `ApiResponse<T>` envelopes.

---

## GET `/api/management/requests`
- Query params used by the UI:
  | Param | Type | Notes |
  | --- | --- | --- |
  | `buildingId` | string | Optional; when provided it **must** match `user.profile.buildingId`. If omitted, backend should automatically filter by that assigned building. |
  | `status` | `"open" \| "in_progress" \| "completed" \| "cancelled"` | Drives the status tabs. |
  | `type` | `"maintenance" \| "visitor" \| "delivery" ...` | Optional filter chips. |
  | `search` | string | Case-insensitive match on title/code/unit. |
  | `page` / `pageSize` | number | Optional pagination. |
- Response: `Request[]` with summary fields (`id`, `title`, `type`, `status`, `priority`, `unitNumber`, `buildingId`, `buildingName`, `createdAt`, `updatedAt`).
- Backend MUST filter by `user.profile.buildingId` regardless of the query param so managers can never see other properties.

## GET `/api/management/requests/{id}`
- Returns the full `Request` object including:
  - `messages: RequestMessage[]` (channel-based chat history)
  - `notes: RequestNote[]` (internal notes)
  - `attachments`, `preferredTime`, `tenantContactInfo`
  - `jobId` if the request has been converted to a job
- Include `buildingName` and `managerActions` flags (e.g., `canComplete`, `canEscalate`) if you apply fine-grained permissions.

## PUT `/api/management/requests/{id}`
- Management UI exposes the following fields:
  | Field | Type | Notes |
  | --- | --- | --- |
  | `status` | `"open" \| "in_progress" \| "completed" \| "cancelled"` | Used for the quick action buttons. |
  | `priority` | `"low" \| "medium" \| "high" \| "urgent"` | Dropdown in the detail drawer. |
  | `assignedTo` | string | Optional handoff to a service provider or staff member. |
  | `scheduledDate` | ISO string | When converting a request to a scheduled visit. |
  | `managerNotes` | string | Lightweight summary field (separate from threaded notes). |
- Respond with the updated `Request`.
- Authorization: reject if the request’s `buildingId` differs from `user.profile.buildingId`.

## POST `/api/management/requests/{id}/messages`
- Body: `{ body: string, attachments?: string[] }`.
- The backend should set `senderId`, `senderRole`, and timestamps server-side based on the auth token.
- Response: Created `RequestMessage`.

## POST `/api/management/requests/{id}/notes`
- Body: `{ note: string, visibility: "management" | "operations" | "security" }`.
- Used for internal coordination; never exposed to tenants.
- Response: Created `RequestNote`.

## Scenario — Manager updates a maintenance request
1. Manager opens `REQUEST-123` (building `building-1`). The app fetches `/api/management/requests/REQUEST-123` and receives the full `Request`.
2. They click “Start Work,” which triggers `PUT /api/management/requests/REQUEST-123` with `{ "status": "in_progress" }`.
3. The manager adds a message for the tenant via `/messages`.
4. After verifying completion, they call `PUT ...` again with `{ "status": "completed", "managerNotes": "Issue resolved, please confirm." }`.
5. Each step must succeed only if `REQUEST-123.buildingId === user.profile.buildingId`; otherwise the API returns `403` with `message: "Not authorized for this building."`
