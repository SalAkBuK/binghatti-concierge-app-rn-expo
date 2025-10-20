# Admin API Implementation Guide

This document maps every admin-facing surface in the Expo app to the backend endpoints and payloads it expects. It is organized by feature area so the backend engineer can implement and validate the contracts module by module.

## 1. Dashboard & Analytics

| Endpoint | Method | Purpose | Request details | Response contract |
| --- | --- | --- | --- | --- |
| `/analytics/dashboard` | `GET` | Returns the portfolio snapshot that powers the admin dashboard cards, trends, and alert banner. | Optional query params for date ranges can be added later; current UI always requests the latest snapshot. | JSON matching the `Analytics` interface (`openJobsCount`, `tenantsCount`, `bookingsToday`, `completionRate`, `occupancyRate`, `topServiceProviders`, `recentActivity`, etc.).【F:app/(admin)/index.tsx†L31-L188】【F:lib/types/index.ts†L677-L704】 |
| `/analytics/buildings/{buildingId}` | `GET` | Serves the management-specific view when an admin/manager scopes the dashboard to a single building. | `buildingId` path param identifies the property; support role-based authorization so managers see only assigned buildings. | Object with `building` metadata, `metrics` (`totalRequests`, `pendingRequests`, `inProgressRequests`, `jobsInProgress`, `bookingsToday`, `visitorsToday`, `completionRate`, `occupancyRate`) and `lists` (`requestsToday`, `upcomingBookings`, `visitorsToday`, `activeJobs`).【F:app/(admin)/index.tsx†L80-L134】【F:lib/context/connected-app-provider.tsx†L2322-L2399】 |

*Implementation notes*
- `recentActivity` drives the Activity feed, so keep the array populated with timestamped records for jobs, requests, bookings, notices, and tenant events.【F:app/(admin)/activity.tsx†L44-L152】【F:lib/types/index.ts†L691-L703】
- Expose timestamps in ISO 8601 so the client can format them consistently (`formatDate`/`formatDateTime`).【F:app/(admin)/index.tsx†L24-L27】

## 2. Notifications & Activity Feed

| Endpoint | Method | Purpose | Request details | Response contract |
| --- | --- | --- | --- | --- |
| `/notifications?userId={id}` | `GET` | Fetches the inbox shown on the Activity screen for the signed-in admin or manager. | Accept `userId` (and optionally pagination parameters). | Array of notification objects with `id`, `title`, `message`, `type`, `read`, `createdAt`.【F:app/(admin)/activity.tsx†L33-L123】【F:lib/types/index.ts†L94-L118】 |
| `/notifications/{id}/read` | `PATCH` | Marks an individual notification as read when tapped. | Body `{ read: true }`. | Updated notification record confirming the change. The UI toggles styling based on `read`.【F:app/(admin)/activity.tsx†L55-L58】 |
| `/notifications/read-all` | `POST` | Bulk marks every notification for the current user as read. | Body `{ userId: string }`. | `{ success: true }` style acknowledgement so the UI can reset its “unread” badge.【F:app/(admin)/activity.tsx†L60-L147】 |
| `/analytics/recent-activity` | `GET` | Optionally expose timeline items separately if you do not bundle them inside `/analytics/dashboard`. | Same scope filter as dashboard. | Array of activity entries (`id`, `type`, `description`, `timestamp`).【F:app/(admin)/activity.tsx†L44-L182】【F:lib/types/index.ts†L691-L703】 |

## 3. Buildings & Portfolio Overview

| Endpoint | Method | Purpose | Request details | Response contract |
| --- | --- | --- | --- | --- |
| `/buildings` | `GET` | Lists buildings for the admin table (with search on name/address). | Support optional `managedOnly=true` to filter by the caller’s scope. | Array of `Building` objects including `managerId`, `managerName`, `totalUnits`, `occupiedUnits`, `status`.【F:app/(admin)/buildings.tsx†L61-L109】【F:lib/types/index.ts†L429-L443】 |
| `/buildings` | `POST` | Creates a new building from the modal form. | Body matches `CreateBuildingDTO` (`name`, `address`, `city`, `country`, `totalUnits`, optional `managerId`). | Newly created `Building` record. The UI expects immediate creation to refresh the list.【F:app/(admin)/buildings.tsx†L120-L166】【F:lib/types/index.ts†L747-L755】 |
| `/buildings/{id}` | `PUT` | Updates building metadata (including manager assignment). | Body follows `UpdateBuildingDTO` (accept `managerId`, `status`, capacity fields). | Updated `Building`. Used for manager reassignment and future edits.【F:app/(admin)/buildings.tsx†L168-L200】【F:lib/types/index.ts†L757-L767】 |
| `/buildings/{id}` | `DELETE` | Removes a building (future-proofing the UI actions). | Ensure guard rails if units or leases exist. | `{ success: true }` confirmation (no UI yet, but admin actions object exposes `deleteBuilding`).【F:lib/services/api/admin.ts†L214-L236】 |
| `/buildings/{id}/units` | `GET` | Supplies the “Unit Inventory” list and occupancy chips in the detail modal. | Support filters for status if needed later. | Array of `BuildingUnit` entries with `status`, `floor`, `typeId`, `lastInspectionDate`.【F:app/(admin)/buildings.tsx†L313-L347】【F:lib/types/index.ts†L458-L484】 |
| `/buildings/{id}/employees` | `GET` | Populates the “Building Employees” section. | — | Array of `BuildingEmployee` profiles (`name`, `role`, `phone`, `shift`, `rating`, `jobsCompleted`).【F:app/(admin)/buildings.tsx†L261-L278】【F:lib/types/index.ts†L562-L571】 |
| `/buildings/{id}/visitor-logs` | `GET` | Shows recent visitor/delivery activity. | Accept query params `type` and `status`. | Array of `VisitorLog` records (`type`, `status`, `expectedArrival`).【F:app/(admin)/buildings.tsx†L293-L309】【F:lib/types/index.ts†L585-L598】 |
| `/service-providers` | `GET` | Provides provider cards with rating summaries for the building details and workforce overview. | Optional filter by building or specialty. | Array of `ServiceProviderProfile` plus aggregate stats (rating, jobsCompleted, responseTimeMinutes).【F:app/(admin)/buildings.tsx†L331-L349】【F:app/(admin)/workforce.tsx†L117-L152】【F:lib/types/index.ts†L573-L583】 |
| `/ratings/summaries?role=service_provider` | `GET` | Supplies the rating snapshot matched to the provider list. | Query `role`. | Array of `RatingSummary` objects linking provider IDs to averages. Used to highlight top vendors.【F:app/(admin)/buildings.tsx†L331-L349】【F:lib/types/index.ts†L600-L608】 |

*Manager scoping*: Provide helpers like `/users/{id}/managed-buildings` or embed `managedBuildingIds` in the user profile so the UI can limit data for management roles.【F:app/(admin)/index.tsx†L50-L78】【F:lib/types/index.ts†L20-L30】

## 4. Unit Types Catalog

| Endpoint | Method | Purpose | Request details | Response contract |
| --- | --- | --- | --- | --- |
| `/unit-types` | `GET` | Lists all templates for the admin catalog with search by name/bed/bath. | Optional query `q`. | Array of `UnitType` objects. The UI reads `bedrooms`, `bathrooms`, `areaSqFt`, `baseRent`, and `amenities`.【F:app/(admin)/unit-types.tsx†L40-L80】【F:lib/types/index.ts†L445-L453】 |
| `/unit-types` | `POST` | Creates a new template. | Body follows `CreateUnitTypeDTO`. Validate numeric fields. | Created `UnitType`.【F:app/(admin)/unit-types.tsx†L103-L153】【F:lib/types/index.ts†L845-L852】 |
| `/unit-types/{id}` | `PUT` | Updates an existing template. | Body matches `UpdateUnitTypeDTO`. | Updated `UnitType`.【F:app/(admin)/unit-types.tsx†L155-L205】【F:lib/types/index.ts†L854-L861】 |
| `/unit-types/{id}` | `DELETE` | Deletes a template when not in use. | Return a descriptive error if units still reference the type. | `{ success: true }` confirmation. The UI surfaces API errors from deletion attempts.【F:app/(admin)/unit-types.tsx†L208-L224】【F:lib/context/connected-app-provider.tsx†L240-L274】 |

## 5. User Management

| Endpoint | Method | Purpose | Request details | Response contract |
| --- | --- | --- | --- | --- |
| `/users` | `GET` | Returns the user directory for the admin grid (supports search & role filter). | Query params: `q`, `role`, `buildingId`. | Array of `User` objects with nested `profile` (`apartment`, `tower`, `buildingId`, `managedBuildingIds`).【F:app/(admin)/users.tsx†L24-L120】【F:lib/types/index.ts†L3-L30】 |
| `/users` | `POST` | Creates tenants/employees/service providers/management accounts from the modal. | Body follows `CreateUserDTO`; include nested `profile` for housing metadata. | New `User` record. Backend should send welcome/activation emails as needed.【F:app/(admin)/users.tsx†L120-L177】【F:lib/types/index.ts†L720-L734】 |
| `/users/{id}` | `PUT` | Updates user details (role change, profile edits). | Body matches `UpdateUserDTO`. | Updated `User`.【F:lib/services/api/admin.ts†L102-L121】【F:lib/types/index.ts†L736-L745】 |
| `/users/{id}` | `DELETE` | Removes a user. | — | `{ success: true }`. Ensure cascading clean-up for tenant leases/requests.【F:lib/services/api/admin.ts†L123-L141】 |

## 6. Tenant Directory & Occupancy Insights

The tenant screen reuses `/users` (filtered to `role=tenant`) but also needs up-to-date building occupancy figures to drive the cards.

| Endpoint | Method | Purpose | Request details | Response contract |
| --- | --- | --- | --- | --- |
| `/tenants` | `GET` (alias of `/users?role=tenant`) | Fetches tenants with building linkage, apartment, tower, contact info. | Include `profile.buildingId`, `profile.apartment`, `profile.tower`, `profile.phone`. | Array of tenant `User` objects. Sorting is done client-side.【F:app/(admin)/tenants.tsx†L70-L157】【F:lib/types/index.ts†L3-L30】 |
| `/buildings/summary` | `GET` | Returns aggregated unit totals per building so the UI can compute occupancy/vacancy chips quickly. | Support optional `buildingId` list to reduce payload. | Array of `{ buildingId, totalUnits, occupiedUnits }` or embed the fields in `/buildings`. The screen currently sums `totalUnits` and `occupiedUnits`.【F:app/(admin)/tenants.tsx†L118-L145】【F:lib/types/index.ts†L429-L443】 |

## 7. Requests & Work Orders

| Endpoint | Method | Purpose | Request details | Response contract |
| --- | --- | --- | --- | --- |
| `/requests` | `GET` | Supplies the operations board with optional filters for status and building scope. | Query params: `status`, `buildingId`, `q`. Respect management scoping based on caller’s allowed buildings. | Array of `Request` objects including `assignedTo`, `priority`, `apartment`, timestamps. The UI sorts newest first.【F:app/(admin)/requests.tsx†L35-L150】【F:lib/types/index.ts†L94-L133】 |
| `/requests/{id}` | `PATCH` | Updates request status (`pending` → `in-progress` etc.). | Body `{ status: RequestStatus }`. | Updated `Request`. Trigger notifications downstream.【F:app/(admin)/requests.tsx†L203-L215】 |
| `/jobs` | `GET` | Lists jobs to link requests to work orders and to render the jobs screen. | Support filtering by `status`, `buildingId`, `assignedTo`. | Array of `Job` objects with `status`, `assignedToName`, `scheduledDate`, `estimatedCost`, etc.【F:app/(admin)/requests.tsx†L199-L212】【F:app/(admin)/jobs.tsx†L26-L152】【F:lib/types/index.ts†L610-L635】 |
| `/jobs` | `POST` | Creates a work order when an unassigned request is scheduled. | Body follows `CreateJobDTO` (carry `requestId`, `priority`, `buildingId`, `unitNumber`, optional `assignedTo`). | Created `Job`. Return linked request/job ids so the UI can refresh both lists.【F:app/(admin)/requests.tsx†L216-L235】【F:lib/types/index.ts†L769-L783】 |
| `/jobs/{id}/assign` | `PATCH` | Reassigns an existing job to a service provider. | Body `{ serviceProviderId, scheduledDate?, notes? }`. | Updated `Job` (and ideally push a notification).【F:app/(admin)/requests.tsx†L220-L244】【F:lib/types/index.ts†L800-L835】 |
| `/jobs/{id}/status` | `PATCH` | Updates job progress (pending/assigned/in-progress/completed). | Body `{ status: JobStatus }`. | Updated `Job` reflecting new status. Both the jobs list and request detail banner rely on this.【F:app/(admin)/requests.tsx†L247-L254】【F:lib/types/index.ts†L610-L618】 |
| `/jobs/{id}` | `PUT` | Full update for cost, notes, checklist, etc. | Body `UpdateJobDTO`. | Updated `Job`. Useful for future cost tracking expansions.【F:lib/services/api/admin.ts†L252-L336】【F:lib/types/index.ts†L785-L798】 |

*Optional extras*: Bulk status updates and queued assignments are exposed in the context (`bulkUpdateJobStatus`, `queueJobAssignment`) — keep the endpoints ready even if the UI has not surfaced them yet.【F:lib/context/connected-app-provider.tsx†L2474-L2499】

## 8. Workforce & Service Providers

| Endpoint | Method | Purpose | Request details | Response contract |
| --- | --- | --- | --- | --- |
| `/buildings/{id}/employees` | `GET` | Lists onsite employees per building (also used in workforce summary). | Accept `buildingId` path param and optional `shift` filter. | Array of `BuildingEmployee`.【F:app/(admin)/workforce.tsx†L61-L116】【F:lib/types/index.ts†L562-L571】 |
| `/buildings/{id}/employees` | `POST` | Adds a building employee from the “Add staff” modal. | Body `{ name, role, phone, shift }`. | Created `BuildingEmployee` with generated `id`.【F:app/(admin)/workforce.tsx†L230-L264】 |
| `/employees/{id}` | `PATCH` | Updates employee shift/role (used to cycle shifts). | Body `{ shift }` (extendable for role/phone updates). | Updated `BuildingEmployee`.【F:app/(admin)/workforce.tsx†L171-L188】 |
| `/employees/{id}` | `DELETE` | Removes an employee from the roster. | — | `{ success: true }`. Surface validation messages when removal fails (e.g., active assignments).【F:app/(admin)/workforce.tsx†L190-L211】 |
| `/service-providers` | `GET` | Provides the vendor roster with rating and response metrics (also used by Requests for assignment). | Query params `specialty`, `buildingId` as needed. | Array of `ServiceProviderProfile` with rating, jobsCompleted, responseTimeMinutes. Keep this list performant — it feeds filters and summary stats.【F:app/(admin)/requests.tsx†L35-L105】【F:app/(admin)/workforce.tsx†L117-L152】【F:lib/types/index.ts†L573-L583】 |

## 9. Role Permissions Matrix

| Endpoint | Method | Purpose | Request details | Response contract |
| --- | --- | --- | --- | --- |
| `/roles/permissions` | `GET` | Fetches every role with its enabled permission objects for the toggle grid. | — | Array of `{ role, permissions[] }` where each permission includes `id`, `resource`, `action`, `description`. The UI groups permissions by `resource`.【F:app/(admin)/permissions.tsx†L19-L117】【F:lib/types/index.ts†L706-L716】 |
| `/roles/{role}/permissions` | `PUT` | Saves toggled permissions for a role (admin/super_admin should be immutable server-side). | Body `{ permissions: string[] }` representing enabled permission IDs. | Updated role permission payload. On success the UI clears its local “changes” map.【F:app/(admin)/permissions.tsx†L118-L205】 |

## 10. Supporting Capabilities

- **Manager building scope**: Expose either `/managers/{userId}/buildings` or enrich `/users` responses so `managedBuildingIds` is populated; management-only screens rely on it to limit visible data.【F:app/(admin)/index.tsx†L50-L78】【F:app/(admin)/jobs.tsx†L34-L52】
- **Search & filtering**: Most lists accept `q` and `status` filters client-side. Mirror these on the backend to offload heavy filtering (requests, jobs, tenants, buildings).【F:app/(admin)/requests.tsx†L106-L150】【F:app/(admin)/buildings.tsx†L93-L99】
- **Time zones & formatting**: Return ISO timestamps (UTC) for `createdAt`, `updatedAt`, `scheduledDate`, etc. The app already formats them locally via helper utilities.【F:app/(admin)/requests.tsx†L300-L318】【F:app/(admin)/activity.tsx†L175-L180】
- **Error messaging**: The UI displays alert dialogs with backend error messages; use descriptive `message` fields in error responses to help operators resolve issues quickly.【F:app/(admin)/unit-types.tsx†L103-L205】【F:app/(admin)/workforce.tsx†L230-L263】

Implementing the endpoints above will let the admin and management consoles operate against live data without additional client changes. Coordinate authentication/authorization so that management roles are restricted to their assigned buildings while admin/super_admin retain full visibility.【F:app/(admin)/index.tsx†L39-L82】【F:app/(admin)/permissions.tsx†L118-L188】
