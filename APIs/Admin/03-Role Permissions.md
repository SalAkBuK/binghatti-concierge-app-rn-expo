# Module 03 — Role & Permission Governance

This module documents the APIs that manage role-by-resource permissions inside the Admin UI (`app/(admin)/users.tsx` permissions drawer). The UI already blocks edits to `admin` and `super_admin`, so the backend must enforce the same rule.

**Key types**: `Permission`, `RolePermissions` (`lib/types/index.ts:1156-1184`).

---

## GET `/api/admin/permissions`
- Returns `ApiResponse<RolePermissions[]>`.
- Each entry contains:
  | Field | Type | Notes |
  | --- | --- | --- |
  | `role` | `UserRole` | One of the seven roles. |
  | `permissions` | `Permission[]` | Each permission includes `id`, `resource` (`"users"`, `"buildings"`, `"jobs"`, etc.), `action` (`"create"`, `"read"`, `"update"`, `"delete"`, `"manage"`), and `description`. |
- Use deterministic IDs so the client can map toggles to permission rows.
- Optional query params: `role` (single), `resource`.

## PUT `/api/admin/permissions/{role}`
- Body: `{ permissions: string[] }` representing the new set of permission IDs to keep enabled.
- Implementation requirements:
  - Reject updates for `admin` and `super_admin` to avoid lockouts.
  - Treat the payload as the canonical set (replace, not merge); diffing happens client side before submit.
  - Wrap writes in a transaction and return the updated `RolePermissions`.
  - Record `changedBy`, `changedAt`, and `previousPermissions` in an audit log for compliance (UI displays only the end result today).

## Future Enhancements
- Add `GET /api/admin/permissions/audit?role=management` to review changes per release.
- Introduce optional `reason` field in the PUT payload so the backend can store context for each change.
