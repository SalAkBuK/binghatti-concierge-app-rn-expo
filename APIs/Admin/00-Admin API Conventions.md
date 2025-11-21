# Module 00 — Admin API Conventions

Every admin module shares the same transport layer. Use this page as the primer before diving into the numbered specs.

## Base Principles
- **Base path**: `/api/admin/*` routes are restricted to admin/super admin tokens.
- **Envelope**: All endpoints return the shared `ApiResponse<T>` (`lib/types/index.ts:160-186`):
  ```ts
  interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
  }
  ```
- **Roles**: Valid `User["role"]` values — `tenant`, `admin`, `super_admin`, `management`, `service_provider`, `employee`, `building_employee`.
- **IDs**: UUID strings; responses must echo real IDs so the Expo UI can optimistically update tables.
- **Timestamps**: ISO 8601 strings (UTC). Client utilities (`formatDate`, `formatDateTime`) assume this.
- **Search/pagination**: When you expose list endpoints, allow `page`, `pageSize`, `search`, and resource-specific filters even if the current UI does client-side pagination.

## Authorization
- Only `super_admin` users can update permission matrices, delete buildings, or create other admins.
- Audit everything: log `actorId`, `actorRole`, timestamp, and payload slides for each write so we can produce audit trails later.
- Honor server-side authorization; client role checks are UX hints, not security.

## Validation
- Mirror modal rules: tenants must include `buildingId/apartment/tower`, service providers need at least one specialty, buildings require `totalUnits`, etc.
- Reject invalid enums and provide actionable `message` text (e.g., `"Manager already manages two buildings"`).
- For destructive actions, return clear `error` values so the UI can surface them via toasts.

## Mock Compatibility
`lib/services/api/admin.ts` currently runs in mock mode (`USE_MOCK = true`). Keep API response shapes aligned with `lib/context/connected-app-provider.tsx` mock data so the swap to live endpoints is seamless.

## Module Index
| Module | File |
| --- | --- |
| 01 — User Management | `APIs/Admin/01-User Management.md` |
| 02 — Building Management | `APIs/Admin/02-Building Management.md` |
| 03 — Role & Permission Governance | `APIs/Admin/03-Role Permissions.md` |
| 04 — Unit Type Catalog | `APIs/Admin/04-Unit Types.md` |
| 05 — Jobs & Workflow Management | `APIs/Admin/05-Jobs.md` |
| 06 — Analytics & Dashboard | `APIs/Admin/06-Analytics.md` |
| 07 — Notifications & Activity Feed | `APIs/Admin/07-Notifications.md` |

Work through the modules sequentially to keep scope focused.
