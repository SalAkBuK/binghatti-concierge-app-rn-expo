# Module 01 — Session & Profile (Management Role)

When a manager signs in, the backend response must fully describe their scope so every downstream screen can filter correctly. This module lists the auth-related payloads expected by the Expo client (`app/(management)/*`).

**Key types**: `User`, `UserProfile`, `Building`, `AuthResponse` (`lib/types/index.ts:1-86`, `160-186`).

---

## POST `/api/auth/login` (manager credentials)
- **Request**: `{ email, password }` or whatever credential combo your backend uses.
- **Response**: `AuthResponse` containing:
  | Field | Type | Notes |
  | --- | --- | --- |
  | `success` | boolean | `true` on valid credentials. |
  | `token` | string | JWT/bearer token scoped to management role. |
  | `user` | `User` | Must include `role: "management"` and a profile with building metadata. |
  | `user.profile.buildingId` | string | Required. Represents the single building this manager controls. |
  | `assignedBuilding` (optional) | `{ id: string; name: string }` | Convenience payload so the client can show the building name immediately. |
  | `permissions` (optional) | string[] | If you expose granular permissions, return them here so the UI can disable restricted actions. |

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "manager-1",
    "email": "manager@example.com",
    "name": "Sara Manager",
    "role": "management",
    "profile": {
      "buildingId": "building-1",
      "phone": "+971500000123"
    },
    "assignedBuilding": {
      "id": "building-1",
      "name": "Binghatti Heights"
    },
    "createdAt": "2024-01-01T08:00:00Z",
    "updatedAt": "2024-07-01T08:00:00Z"
  }
}
```

**Backend requirements**
- Enforce that the token only authorizes the `management` role.
- Always return a single `profile.buildingId`. If the manager is unassigned, return `null` and the UI will block access until an admin assigns a building.

## GET `/api/management/profile`
- Returns the latest user profile plus the single assigned building record.
- Shape mirrors the login response, minus the token.
- Include `assignedBuilding` if you want to avoid an extra call to fetch its name/address.

## Session refresh / token exchange
- If you support refresh tokens, expose `/api/auth/refresh` returning the same `user` payload so the client can rehydrate after app restarts.
- Optionally include a `settings` object (timezone, locale, notification preferences) so future modules can mirror admin behavior.
