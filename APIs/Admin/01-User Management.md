# Module 01 — User Management APIs

This module covers every admin-only endpoint that lists, creates, edits, or deletes users. The React Native surfaces calling these APIs live in `app/(admin)/users.tsx` and the quick-create actions found throughout the admin tab.

**Key types**: `User`, `UserProfile`, `CreateUserDTO`, `UpdateUserDTO` (`lib/types/index.ts:1-86`, `1185-1211`).

---

## Endpoint Matrix

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/admin/users` | `GET` | Fetch paginated users for the admin table and quick filters. |
| `/api/admin/users/{id}` | `GET` | Hydrate the detail drawer for a specific user. |
| `/api/admin/users` | `POST` | Create a new admin/management/tenant/SP/employee account. |
| `/api/admin/users/{id}` | `PUT` | Update contact info, role, or scoped metadata. |
| `/api/admin/users/{id}` | `DELETE` | Soft delete/archive a user. |
| `/api/admin/users?role={role}` | `GET` | Convenience filter used for role-based pickers. |

All endpoints return `ApiResponse<T>` envelopes.

---

## GET `/api/admin/users`
- Optional query params:
  | Param | Type | Notes |
  | --- | --- | --- |
  | `role` | `User["role"]` | Filters the table to a single role (tabs in UI). |
  | `search` | string | Case-insensitive substring match on name/email/phone. |
  | `status` | `"active" \| "inactive"` | Aligns with activation toggles. |
  | `page` / `pageSize` | number | Future pagination (UI currently loads all). |
- Response: `ApiResponse<User[]>` sorted by `createdAt` desc. Include `profile` so the table can show building/unit metadata without extra fetches.

## GET `/api/admin/users/{id}`
- Returns one `User` with the freshest `profile`, `managedBuildingIds`, or service provider stats.
- Used when the admin opens the drawer to inspect activity or update info.

---

## POST `/api/admin/users`
- **Source**: `lib/services/api/admin.ts:81`
- **Description**: Primary REST entry point for provisioning all roles from the admin UI.
- **Transport**: JSON body matching `CreateUserDTO`.

### Base Payload — `CreateUserDTO`
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `email` | string | ✅ | Unique login; validated client side. |
| `password` | string | ❌ | Optional until credentials are wired. |
| `name` | string | ✅ | Display name for headers and notifications. |
| `role` | `User["role"]` | ✅ | Drives downstream form fields. |
| `phone` | string | ❌ | Stored inside `profile.phone`. |
| `buildingId` / `apartment` / `tower` | string | ❌ | Convenience fields mirrored into `profile`. |
| `profile` | object | ⚠️ | Preferred place for nested metadata (see matrix). |

### Create User Modal requirements
The Expo UI (`app/(admin)/users/components/CreateUserModal/index.tsx`) only collects the fields below. Service providers are intentionally redirected to their dedicated management screen, so backend expectations should match these four roles:

| Role | Additional required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `tenant` | `profile.buildingId`, `profile.floor`, `profile.apartment` | `phone`, `profile.tower`, `profile.emergencyContact`, `profile.emergencyPhone` | Building, floor, and apartment are validated before submit. Tower + emergency details are optional. |
| `employee` | — (modal allows unassigned employees) | `phone`, `profile.buildingId`, `profile.tower`, `profile.floor` | If a building is chosen, the UI forces `profile.floor`; otherwise both are omitted. |
| `management` | — | `phone`, `profile.buildingId` | No extra fields collected; scope is determined later via building assignment flows. |
| `admin` | — | `phone` | Only admins/super admins can create new admins. Building metadata is cleared when switching to this role. |

> **Service providers**: the modal displays an inline tip directing admins to the Service Provider Management screen, so do not expect service provider onboarding through this endpoint yet.

#### Role payload templates (copy/paste)

```jsonc
// Tenant
{
  "name": "Jane Tenant",
  "email": "tenant@example.com",
  "phone": "+971500000000",
  "role": "tenant",
  "profile": {
    "buildingId": "building-1",
    "floor": "12",
    "apartment": "1205",
    "tower": "Tower A",
    "emergencyContact": "John Tenant",
    "emergencyPhone": "+971500000001"
  }
}
```

```jsonc
// Employee (building + floor optional; floor required when building present)
{
  "name": "Maintenance Staff",
  "email": "employee@example.com",
  "phone": "+971500000002",
  "role": "employee",
  "profile": {
    "buildingId": "building-3",
    "tower": "West Wing",
    "floor": "P2"
  }
}
```

```jsonc
// Management
{
  "name": "Building Manager",
  "email": "manager@example.com",
  "phone": "+971500000003",
  "role": "management",
  "profile": {
    "buildingId": "building-5"
  }
}
```

```jsonc
// Admin (no building context captured)
{
  "name": "Portfolio Admin",
  "email": "admin@example.com",
  "phone": "+971500000004",
  "role": "admin"
}
```

---

## PUT `/api/admin/users/{id}`
- Accepts partial updates via `UpdateUserDTO`.
- Fields:
  | Field | Type | Notes |
  | --- | --- | --- |
  | `email`, `name`, `phone` | string | Update contact info. |
  | `role` | `User["role"]` | Allow promotions/demotions except editing `admin` ⇄ `super_admin` without elevated auth. |
  | `status` | `"active" \| "inactive"` | Soft-disable logins. |
  | `apartment`, `tower`, `buildingId` | string | Shortcuts that mirror into `profile`. |
- Response: Updated `User`. The UI merges it straight into the table.

## DELETE `/api/admin/users/{id}`
- Performs a soft delete/archive.
- Response: `{ success: true, message?: string }`.
- Validation: Reject deletion if the user owns critical entities (tenants with active leases, service providers assigned to jobs). Return a descriptive `error`.

## GET `/api/admin/users?role={role}`
- Convenience call used by pickers/modals to show filtered listings (e.g., service providers only).
- Returns the same payload as the full list.

---

## Response Shape — `User`
Matches `lib/types/index.ts:5`:

```ts
interface User {
  id: string;
  email: string;
  name: string;
  role: "tenant" | "admin" | "super_admin" | "management" | "service_provider" | "employee" | "building_employee";
  phone?: string;
  status?: "active" | "inactive";
  profile?: UserProfile;
  createdAt: string;
  updatedAt: string;
}
```

---

## Integration Fixes for `http://16.171.240.211/api/User/Create`
- Accept `name`, `email`, `role`, and nested `profile` fields exactly as the Expo app posts them (no `fullName` or numeric role IDs).
- Keep `password` optional; admins currently invite without specifying credentials.
- Persist `profile.buildingId`, `apartment`, and `tower` for tenants plus `profile.specialties` for service providers so the UI can render building-scoped tables.
- Drop or auto-populate `createdBy`; the frontend derives it from the auth token.
- Return the full `User` object (id + timestamps) to immediately populate the admin grid.
