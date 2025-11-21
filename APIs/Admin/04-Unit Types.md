# Module 04 — Unit Type Catalog

Admins maintain reusable apartment templates under the Unit Types tab (`app/(admin)/unit-types.tsx`). These templates hydrate vacancy cards and default rent ranges inside building modals.

**Key types**: `UnitType`, `CreateUnitTypeDTO`, `UpdateUnitTypeDTO` (`lib/types/index.ts:491-517`, `1343-1371`).

---

## GET `/api/admin/unit-types`
- Returns `ApiResponse<UnitType[]>`.
- Include `amenities`, `baseRent`, and all numeric specs so the UI can render chips without additional fetches.
- Optional params: `search` (name), `bedrooms`, `bathrooms`.

## POST `/api/admin/unit-types`
- Payload (`CreateUnitTypeDTO`):
  | Field | Type | Required | Notes |
  | --- | --- | --- | --- |
  | `name` | string | ✅ | e.g., “2BR Deluxe”. |
  | `bedrooms`, `bathrooms` | number | ✅ | Integers only. |
  | `areaSqFt` | number | ✅ | Displayed as `xx sqft`. |
  | `baseRent` | number | ❌ | Defaults to 0 (rendered as “N/A”). |
  | `amenities` | string[] | ✅ | Provide at least one amenity for chip rendering. |
- Response: Created `UnitType` with generated `id`.

## PUT `/api/admin/unit-types/{id}`
- Accepts partial updates via `UpdateUnitTypeDTO`.
- Respond with updated `UnitType` so the table can optimistically refresh.

## DELETE `/api/admin/unit-types/{id}`
- Soft delete the template and return `{ success: true }`.
- Reject deletions if the template is attached to active units/leases (send a helpful `error` string).
