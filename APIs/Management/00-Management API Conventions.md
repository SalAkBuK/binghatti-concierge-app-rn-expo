# Module 00 — Management API Conventions

All management-only endpoints share the same transport layer and envelope used across the app. This primer explains the guardrails before diving into the module specs.

## Base Principles
- **Base path**: `/api/management/*` or `/api/admin/*` endpoints filtered by `role=management`, depending on the backend’s routing. Every request includes the manager’s auth token.
- **Envelope**: `ApiResponse<T>` (`lib/types/index.ts:160-186`):
  ```ts
  interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }
  ```
- **Roles & Scope**: Managers are assigned to exactly one building. The backend must enforce that `buildingId` on every request matches `user.profile.buildingId`.
- **Timestamps & IDs**: ISO 8601 strings, UUIDs, identical to the admin modules so we can reuse the same rendering utilities.

## Authorization
- Return the manager’s `profile.buildingId` (or `assignedBuildingId`) during auth so the client can filter requests/jobs immediately.
- Reject any create/update/delete attempts on resources outside that building with `403` (provide a clear `message`).

## Validation & Payloads
- Requests and jobs share the same DTOs as the admin side (`CreateJobDTO`, `UpdateRequestDTO`, etc.) but the management UI only exposes a subset of fields—documented per module below.
- For read endpoints, always include the building name/id pair; the UI uses it for header pills and filters.

## Module Index
| Module | File |
| --- | --- |
| 01 — Session & Profile | `APIs/Management/01-Session & Profile.md` |
| 02 — Requests Management | `APIs/Management/02-Requests Management.md` |
| 03 — Jobs Management | `APIs/Management/03-Jobs Management.md` |

Work through the modules in order: login payload first, then the two operational areas.
