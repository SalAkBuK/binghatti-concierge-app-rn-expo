# Module 02 — Building Management APIs

The Buildings screen (`app/(admin)/buildings/index.tsx`) lets admins create buildings, assign managers, and inspect portfolio health. This doc lists the backend contracts the UI expects so we can replace the mock helpers in `lib/context/connected-app-provider.tsx:1664-1880` with real endpoints.

**Key types**: `Building`, `BuildingUnit`, `CreateBuildingDTO`, `UpdateBuildingDTO` (`lib/types/index.ts:429-520`, `1213-1262`).

## POST /api/admin/buildings
- **Used by**: "Create New Building" modal (`app/(admin)/buildings/index.tsx`).
- **DTO**: `CreateBuildingDTO` (`lib/types/index.ts:1186`).

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | Displayed everywhere (table, details modal). |
| `buildingType` | `"residential" \| "commercial" \| "mixed_use" \| "hospitality"` | Yes | Toggled via the Building Type chips. |
| `emirate` | string | Yes | Selected from `UAE_EMIRATES`; also reused as `city` for backward compatibility. |
| `community` | string | Yes | Acts as the district/neighborhood. |
| `street` | string | No | Optional street/area text field. |
| `plotNumber` | string | No | UAE plot metadata. |
| `buildingNumber` | string | No | Used to assemble `address`. |
| `makaniNumber` | string | No | Dubai’s smart addressing code. |
| `developer` | string | No | Free-form developer entry. |
| `yearBuilt` | number | No | Must be >=1900 if provided. |
| `totalFloors` | number | No | Positive integer when present. |
| `utilityPremisesNumber` | string | No | DEWA/FEWA/ADDC references. |
| `address` | string | No | Client concatenates `{buildingNumber}, {street}, {community}, {emirate}`. |
| `city` | string | No | Derived from `emirate`. |
| `country` | string | Yes | Defaults to `"United Arab Emirates"` in the UI. |
| `totalUnits` | number | Yes | Drives capacity widgets and table counts. |
| `unitBreakdown` | object | No | Optional composition map (`studios`, `oneBedroom`, etc.) populated when the toggle is expanded. |
| `managerId` | string | No | Selected from existing management users; omit/empty for "None". |
| `status` | `"active" \| "maintenance" \| "inactive"` | No | Defaults to `"active"` but the modal lets admins pick another value. |
| `amenities` | string[] | No | Multi-select list from the new Amenities chips (e.g., `["gym","pool","parking"]`). |

`unitBreakdown` mirrors `CreateBuildingDTO["unitBreakdown"]` and supports the keys `studios`, `oneBedroom`, `twoBedroom`, `threeBedroom`, `fourPlusBedroom`, and `commercial`—only include properties with values > 0.
### Scenario A — Mixed-use tower with full metadata (exact UI flow)
1. Admin enters “Binghatti Heights” and selects **Mixed-Use** as the type.
2. Picks **Dubai** from the Emirate chips, types “Dubai Marina” for community, and fills out the optional street/plot/building numbers.
3. Provides Makani + DEWA numbers, developer name, year built (validated to ≥1900), and total floors.
4. Opens the Unit Breakdown toggle, populates counts for studios through 3BR, and leaves 4+BR/commercial blank (omitted from payload).
5. Selects amenities chips: Gym, Pool, Covered Parking, Smart Access; chooses “Sara Manager” in the Manager row; keeps Status = Active.
6. Presses “Create Building.” The client assembles the request below. If any optional field was left empty, the UI omits it or sends `null` for manager.

```json
{
  "name": "Binghatti Heights",
  "buildingType": "mixed_use",
  "emirate": "Dubai",
  "community": "Dubai Marina",
  "street": "Al Marsa St",
  "plotNumber": "123-456",
  "buildingNumber": "45",
  "makaniNumber": "1234567890",
  "developer": "Binghatti",
  "yearBuilt": 2022,
  "totalFloors": 32,
  "utilityPremisesNumber": "DEWA-001234",
  "address": "45, Al Marsa St, Dubai Marina, Dubai",
  "city": "Dubai",
  "country": "United Arab Emirates",
  "totalUnits": 240,
  "unitBreakdown": {
    "studios": 40,
    "oneBedroom": 80,
    "twoBedroom": 80,
    "threeBedroom": 40
  },
  "managerId": "user-42",
  "status": "active",
  "amenities": ["gym", "pool", "parking", "smart_access"]
}
```
**Backend expectations**
- Reject if `totalUnits <= 0`, `yearBuilt` outside 1900..(currentYear+5), or `totalFloors <= 0` when provided.
- If the unit breakdown sum differs from `totalUnits`, accept the payload but persist the mismatch; the UI already warns the admin.
- Normalize amenity IDs to a canonical enum; unknown IDs should trigger a validation error so the frontend chips can be updated.

### Scenario B — Minimal residential tower (admin skips optional sections)
1. Admin fills only the mandatory trio: `name`, `emirate`, `community`, plus total units.
2. Leaves building type at the default (“Residential”), does not expand Unit Breakdown or select amenities, and keeps manager “None.”
3. The request body trims everything else; backend must backfill defaults (status=`"active"`, amenities unset) and still create the building.

```json
{
  "name": "Sunrise Residences",
  "buildingType": "residential",
  "emirate": "Abu Dhabi",
  "community": "Al Raha Beach",
  "address": "Al Raha Beach, Abu Dhabi",
  "city": "Abu Dhabi",
  "country": "United Arab Emirates",
  "totalUnits": 120,
  "status": "active"
}
```
**Backend expectations**
- Auto-generate `id`, `managerName: null`, timestamps, and set `amenities: []` if omitted.
- `unitBreakdown` should be absent in the response (or `null`) since the admin never opened the toggle.

### Response payload
Must return a `Building` (`lib/types/index.ts:447`):
```json
{
  "id": "building-9",
  "name": "Binghatti Heights",
  "address": "123 Marina Rd",
  "city": "Dubai",
  "country": "UAE",
  "managerId": "user-42",
  "managerName": "Sara Manager",
  "totalUnits": 240,
  "occupiedUnits": 0,
  "amenities": ["gym", "pool"],
  "status": "active",
  "createdAt": "2024-07-16T10:20:00Z",
  "updatedAt": "2024-07-16T10:20:00Z"
}
```
`occupiedUnits` starts at 0 (UI increments later via unit assignments). Omitting `managerName` or timestamps breaks the details modal.

## PUT /api/admin/buildings/:id
- **Used by**: manager assignment modal (`app/(admin)/buildings/index.tsx`) and future status edits.
- **DTO**: `UpdateBuildingDTO` (`lib/types/index.ts:1196`). Allow partial updates.

Common payloads the UI sends today:
- **Assign/replace manager**
  ```json
  {
    "managerId": "user-42"
  }
  ```
- **Remove manager**
  ```json
  {
    "managerId": null
  }
  ```
- **Status change / metadata**
  ```json
  {
    "status": "maintenance",
    "totalUnits": 260,
    "amenities": ["gym", "pool", "spa"]
  }
  ```

Responses should echo the updated `Building` so `actions.updateBuilding` can replace the row and push notifications.

## GET /api/admin/buildings
- **Used by**: initial table load and refresh (`app/(admin)/buildings/index.tsx`).
- **Response**: `ApiResponse<Building[]>` sorted however the backend prefers. For each building include:
  - `managerName` (string) so the Manager column can render without client-side lookups.
  - `totalUnits` and `occupiedUnits` so the capacity chips and details modal can compute occupancy percentages.
  - `amenities` (string[]) for the detail modal chips and quick filters.
  - Location metadata (`emirate`, `community`, `address`) to populate the overview card.
  - `buildingType` so the UI can display icons/badges consistently.
  - Optional `units`, `employees`, and `visitorLogs` arrays if you plan to hydrate the details modal from a single response; otherwise keep the existing helper endpoints (`getUnitsByBuilding`, `getBuildingEmployees`, `getVisitorLogsByBuilding`) aligned with the `BuildingUnit`, `BuildingEmployee`, and `VisitorLog` types.

## Fixes required for `http://16.171.240.211/api/Building/Create`
The stub posted earlier only accepts `{ name, address, city, country, zipCode }`. To integrate with the app:
- Accept the full Create DTO: `buildingType`, `emirate`, `community`, `totalUnits`, optional UAE-specific fields (`plotNumber`, `makaniNumber`, `utilityPremisesNumber`), and the `unitBreakdown` object.
- Support `managerId`, `status`, and `amenities` fields so admins can assign management, mark maintenance blocks, and tag facilities from day one.
- Drop or optionalize `zipCode` (the UI never collects it). Rejecting missing `zipCode` would make creation impossible.
- Return the full `Building` shape (ids, managerName, total/occupied units, status, timestamps). The table and details modal both depend on those properties.
