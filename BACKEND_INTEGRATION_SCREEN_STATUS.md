# Backend Integration – Screen Readiness

## Purpose
- Give backend engineers a concise map of which React Native screens are production-ready and only waiting on live API data.
- Document the payloads each screen expects, the mock actions currently in place, and the endpoints you need to provide.
- Highlight integration considerations (uploads, role scopes, caching) so that wiring the API layer into `useApp()` can be done with minimal friction.

## Current Data Plumbing (Mocked)
- `lib/context/connected-app-provider.tsx` composes all contexts and hydrates them with the `DEFAULT_*` collections from `lib/utils/mockData.ts`. Every screen calls `useApp()` to read those arrays or invoke action helpers (e.g., `actions.createRequest`).
- Persistent storage uses `useAsyncStorage(STORAGE_KEYS.*)` purely to mimic server state. When real endpoints exist, replace those writes with API calls (optionally caching critical datasets locally).
- A complete, but currently unused, API layer exists in `lib/services/api/*` with a shared `MainApiService`. Endpoints are defined in `lib/utils/constants.ts (API_ENDPOINTS)`.
- All domain models are typed in `lib/types/index.ts`. Align server responses with those interfaces to keep the TypeScript contracts intact.

## Swapping to the Real API
1. **Configure base URL** – Update `APP_CONFIG.api.baseUrl` or load it from an `.env` file, then teach `MainApiService` to respect the runtime value.
2. **Route context actions through `apiService`** – Replace each mock CRUD block inside `connected-app-provider.tsx` (users, requests, bookings, visitors, etc.) with calls to the appropriate service module, keeping the optimistic UI behaviour where it makes sense.
3. **Hydrate initial state** – On provider mount, call the server (`load*` actions already exist) instead of using the `DEFAULT_*` arrays. Reuse existing loading & error reducers.
4. **Preserve AsyncStorage selectively** – Keep token storage and optionally cache user profile / last-known lists to support offline fallbacks, but treat the server as source of truth.
5. **Remove mock utilities** once each domain is backed by the API to avoid the mock data being re-used accidentally.

---

## Tenant Experience

### Authentication & Session  
Files: `app/auth.tsx`, `lib/context/auth-context.tsx`, `lib/services/api/auth.ts`  
- **UI status**: Complete sign-in / sign-up flow with loading states, password toggles, and error handling. `AuthProvider` already shapes state for tokens & current user.  
- **Data requirements**:
  - Email/password login and registration.
  - Role-aware profile payload (`User` + `UserProfile` with `buildingId` and optional `managedBuildingIds`).
  - Token persistence and refresh; logout should revoke tokens server-side.
- **Endpoints**:
  - `POST /auth/login`
  - `POST /auth/register`
  - `POST /auth/logout`
  - `POST /auth/refresh` (returns fresh access + refresh tokens)
  - `GET /users/profile`
  - `PUT /users/profile`
  - _(Optional)_ `PUT /users/password`
- **Integration notes**:
  - `AuthApiService` automatically stores tokens via interceptors; return `{ user, tokens }` to leverage that.
  - `auth-context` currently seeds users via `DEFAULT_USERS`; once live, use `GET /users/profile` after login to hydrate `currentUser`.

### Home Dashboard (`app/(tabs)/index.tsx`)
- **UI status**: Ready; card layout renders stats, notices, quick actions, and recent lists.
- **Data requirements**:
  - Request counts by status + recent 3–5 requests.
  - Active building notices.
  - Upcoming bookings for the tenant.
  - Expected visitors for the day.
  - Unread notification count.
  - Managed building info for management-role users (via `profile.managedBuildingIds`).
- **Endpoints** (consider batching via a single dashboard endpoint):
  - `GET /requests?tenantId={userId}&limit=5`
  - `GET /requests/stats?tenantId={userId}` (recommended aggregated response)
  - `GET /bookings?tenantId={userId}&slotDate=gte:{today}`
  - `GET /visitors?tenantId={userId}&status=expected`
  - `GET /notifications?userId={userId}`
  - `GET /notices?status!=cancelled`
- **Notes**: The component expects ISO timestamps; keep `createdAt` / `updatedAt` fields so the helper `formatDateTime` continues to work.

### New Service Request (`app/(tabs)/new-request.tsx`)
- **UI status**: Fully validated form with attachment picker, priority/type enums, and success flow.
- **DTO used**: `CreateRequestDTO` (`type`, `title`, `description`, `priority`, optional `apartment`, `tower`, `buildingId`, `preferredTime`, `contactPhone`, `additionalNotes`, `attachments`).
- **Endpoints**:
  - `POST /requests`
  - `POST /uploads` (or `POST /uploads/multiple`) returning hosted URLs for attachments.
- **Notes**: `AttachmentPicker` supplies local URIs; return CDN/Blob URLs from the upload endpoint so the request payload contains remote strings.

### Request List (`app/(tabs)/requests.tsx`)
- **UI status**: Complete list with filters, status chips, pull-to-refresh.
- **Data requirements**:
  - Request collection filtered by `tenantId`.
  - Fields: `status`, `priority`, `assignedTo`, timestamps, etc., matching `Request` interface.
- **Endpoints**:
  - `GET /requests?tenantId={userId}`
  - `GET /requests?tenantId={userId}&status={filter}` for filtered views (or use query params).
- **Notes**: Returns feed used to populate stats cards; keep response stable to avoid recalculating on client.

### Request Details Modal (`app/(modals)/request-details.tsx`)
- **UI status**: Edit/delete/feedback actions with attachment preview.
- **Data requirements**:
  - Single request payload with `comments`, `attachments`, `assignedToName`.
  - Ability to mutate status, title, description, and delete.
- **Endpoints**:
  - `GET /requests/{id}`
  - `PUT /requests/{id}`
  - `DELETE /requests/{id}`
  - `POST /requests/{id}/comments`
  - _(Optional)_ `POST /requests/{id}/cancel` or `PUT /requests/{id}/status`
- **Notes**: Only allow updates while status is `pending`; server should enforce same rule to mirror UI constraints.

### Notifications Hub & Notice Details  
Files: `app/(modals)/notifications-hub.tsx`, `app/(modals)/notice-details.tsx`, `lib/context/notifications-context.tsx`, `lib/context/notices-context.tsx`  
- **UI status**: Complete two-tab hub, mark-read actions, detail modal with admin editing.  
- **Endpoints**:
  - `GET /notifications?userId={userId}`
  - `PUT /notifications/{id}/read`
  - `POST /notifications/mark-all-read`
  - `DELETE /notifications/{id}`
  - `GET /notices`
  - `POST /notices` (admin/management)
  - `PUT /notices/{id}`
  - `DELETE /notices/{id}`
- **Notes**:
  - Notices expose `affectedAreas: string[]`, `status`, `estimatedDuration`. Maintain those fields for editing.
  - Admin modal reads role from `currentUser.role`; enforce authorization server-side.

### Amenities & Bookings  
Files: `app/(tabs)/amenities.tsx`, `app/(modals)/amenity-booking-form.tsx`, `app/(tabs)/my-bookings.tsx`, `lib/types`  
- **UI status**: Catalog grid, booking form with slot picker, bookings list with cancel flow.
- **Data requirements**:
  - Amenity list by `buildingId`, each with `operatingHours`, `capacity`, `bookingDurationMinutes`, `status`.
  - Availability matrix per day for selected amenity.
  - Booking objects (`AmenityBooking`) including `bookingCode`, `status`, `slotDate`, `slotTimeStart/End`.
- **Endpoints**:
  - `GET /amenities?buildingId={id}`
  - `GET /amenities/{id}`
  - `GET /amenities/{id}/availability?date=YYYY-MM-DD`
  - `POST /bookings`
  - `GET /bookings?tenantId={userId}`
  - `PATCH /bookings/{id}/cancel`
- **Notes**:
  - The form currently generates time slots client-side; supplying `availability` lets you drive that from the server instead.
  - When cancelling, server should return updated booking so the UI can refresh status & `cancelledReason`.

### Visitors (`app/(tabs)/visitors.tsx`, `app/(modals)/register-visitor.tsx`)
- **UI status**: List with status filter, registration modal, cancel flow.
- **Data requirements**:
  - Visitor objects keyed by `tenantId` (`VisitorStatus` values: `expected`, `arrived`, `departed`, `cancelled`).
  - Visitor registration DTO expects `visitorName`, `visitorPhone`, `visitorIdType`, `visitorIdNumber`, `visitPurpose`, arrival/departure timestamps, optional `idPhotoUrl`.
- **Endpoints**:
  - `GET /visitors?tenantId={userId}`
  - `POST /visitors`
  - `PATCH /visitors/{id}/cancel`
  - _(Optional)_ `PATCH /visitors/{id}` to mark arrival/departure.
- **Notes**: Server should generate a unique `visitorCode` and `qrCodeUrl` so the UI can display it without additional logic.

### Ratings (`app/(tabs)/my-ratings.tsx`, `app/(modals)/submit-rating.tsx`)
- **UI status**: Ratings list, detail modal, submission modal with star picker & attachments.
- **Data requirements**:
  - Ratings filtered by tenant, each linking to `requestId` and `serviceProviderId`.
  - Service provider display name to replace the placeholder TODOs.
- **Endpoints**:
  - `GET /ratings?tenantId={userId}`
  - `POST /ratings`
  - `GET /requests/{id}` (to fetch request title when rendering)
  - `GET /users/{id}` (to resolve service provider name) or embed `serviceProviderName` in the rating payload.
- **Notes**: Frontend enforces “only completed requests can be rated”; backend should mirror the rule to keep data consistent.

### Profile (`app/(tabs)/profile.tsx`)
- **UI status**: Editable form with validation and logout.
- **Data requirements**:
  - User profile payload with nested `profile` object (apartment, tower, phone, emergency contacts).
- **Endpoints**:
  - `GET /users/profile`
  - `PUT /users/profile`
  - _(Optional)_ `PUT /users/password`
- **Notes**: Logout already clears context; backend should invalidate refresh tokens to complete the flow.

---

## Admin & Management Consoles

### Admin Dashboard (`app/(admin)/index.tsx`)
- **UI status**: Cards, trend charts, and management snapshots per building.
- **Data requirements**:
  - Portfolio-level metrics: open requests, completion rate, jobs in progress, bookings today, visitors today, occupancy, trend arrays.
  - Management-specific snapshot for each building (`getManagementAnalytics(buildingId)` expects totals plus short lists: `requestsToday`, `upcomingBookings`, `visitorsToday`, `activeJobs`).
- **Endpoints**:
  - `GET /analytics/dashboard` (aggregate for admin role)
  - `GET /analytics/buildings/{buildingId}` for management-filtered view
  - Under the hood, analytics can derive from requests/bookings/visitors tables; expose a pre-computed response to avoid client-side heavy lifting.
- **Notes**: Include ISO dates and counts mirroring the `Analytics` interface; the UI already handles empty states if there is no data.

### Buildings Management (`app/(admin)/buildings.tsx`)
- **UI status**: Table with search, create modal, assign manager modal.
- **Data requirements**:
  - Building list with `managerId`, `managerName`, `totalUnits`, `occupiedUnits`, `status`.
  - Ability to create/update/delete buildings and assign managers.
- **Endpoints**:
  - `GET /buildings`
  - `POST /buildings`
  - `PUT /buildings/{id}`
  - `PATCH /buildings/{id}/assign-manager`
  - `DELETE /buildings/{id}`
- **Notes**: Manager dropdown filters `User` records by `role === "management"`; surface that via `GET /users?role=management` or embed managers in the building payload.

### Users Management (`app/(admin)/users.tsx`)
- **UI status**: Entity table, search, create modal.
- **Data requirements**:
  - User list with role, email, profile metadata (apartment/tower/buildingId).
- **Endpoints**:
  - `GET /users`
  - `POST /users`
  - `PUT /users/{id}`
  - `DELETE /users/{id}`
- **Notes**: When returning users, include `profile.managedBuildingIds` if the role is management so the management dashboard can scope correctly.

### Jobs Management (`app/(admin)/jobs.tsx`)
- **UI status**: Filter tabs, job cards with status badges.
- **Data requirements**:
  - Jobs list filtered by building for management users.
  - Job payload fields: `requestId`, `status`, `priority`, `assignedTo`, `assignedToName`, `scheduledDate`, `estimatedCost`, `notes`.
- **Endpoints**:
  - `GET /jobs`
  - `POST /jobs`
  - `PUT /jobs/{id}` (full update)
  - `PATCH /jobs/{id}/status`
  - `PATCH /jobs/{id}/assign`
- **Notes**: Server should populate `assignedToName` or expose a relationship so the UI can display the technician name without extra lookups.

### Role Permissions (`app/(admin)/permissions.tsx`)
- **UI status**: Toggle matrix with save workflow; restricted for management users.
- **Data requirements**:
  - Role definitions with attached permission objects `{ id, name, description, resource }`.
- **Endpoints**:
  - `GET /roles/permissions` (returns array of `{ role, permissions[] }`)
  - `PUT /roles/{roleId}/permissions`
- **Notes**: The UI batches updates per role; responding with the new permission array lets the client reset its “dirty” state.

### Admin Notifications Modal (`app/(modals)/admin-notifications.tsx`)
- Shares the same endpoints as the tenant notifications hub but expects portfolio-wide notices and the ability to delete notices.

---

## Shared & Supporting Concerns

- **File uploads**: `AttachmentPicker` is reused for requests, visitor IDs, and ratings. Provide an upload endpoint (single + multiple) that returns `{ urls: string[] }`. Respect the size limits defined in `IMAGE_CONFIG` (`lib/utils/imageUtils.ts`).
- **Type contracts**: Reference `lib/types/index.ts` for canonical interfaces (`Request`, `Amenity`, `AmenityBooking`, `Visitor`, `Rating`, `Building`, `Job`, `RolePermissions`, etc.). Keeping the API aligned avoids TypeScript edits.
- **Status / enum values**:  
  - Requests statuses: `pending | in-progress | completed | cancelled`  
  - Request priorities: `low | medium | high | urgent`  
  - Visitor statuses: `expected | arrived | departed | cancelled`  
  - Amenity statuses: `active | maintenance | inactive`  
  - Booking statuses: `pending | confirmed | cancelled | completed`
- **Role scopes**: Many admin/management screens call `actions.getManagedBuildingIds()` which rely on `profile.managedBuildingIds`. Ensure API responses include that array for management accounts and honour RBAC when mutating resources.
- **Dates**: All screens assume ISO 8601 strings (`new Date(iso).toLocaleString()`); keep everything UTC to avoid timezone drift.

---

## Suggested Backend Next Steps
1. Flesh out the REST surface defined in `lib/utils/constants.ts` and this document; publish an OpenAPI spec so the frontend can generate runtime validators if needed.
2. Implement authentication endpoints first, then requests/notifications, followed by amenities/bookings and visitors (these power most tenant flows).
3. Expose dashboard analytics (either pre-computed or aggregated on read) so the admin landing page can drop mock data.
4. Provide upload endpoints and return absolute URLs to unblock attachments across requests, visitors, and ratings.
5. Coordinate on any additional fields before cutting over: service provider naming for ratings, building occupancy fields, and permission identifiers.
6. When endpoints are stable, flip `connected-app-provider` to call the real API, delete the `DEFAULT_*` data, and run through regression using `npm run lint` / `npm test`.

With these endpoints live, every shipping screen in the Expo app can pivot from mocks to production data without further UI work.

