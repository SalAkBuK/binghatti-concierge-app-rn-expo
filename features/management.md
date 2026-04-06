# Management Role Deep Dive

## Overview
- The management experience (`app/(management)/`) is designed for building managers who operate within a limited portfolio. Managers visualize building health, drive request resolution, assign work, and communicate with residents.
- Access is building-scoped. Every list, summary, and mutation is filtered through `actions.getManagedBuildings?.()` and related helpers so managers only see their assigned properties.
- This doc mixes current mounted routes with target-state management workflows. If a path below does not exist under `app/(management)/`, treat it as planned/reference, not live router truth.
- The UI leans on the same shared primitives as the admin suite—`AnalyticsSection`, `MiniTrendCard`, `JobCard`, `EntityTable`, `HeaderBar`, and `SideMenu`—but layers management-specific tooling such as tenant broadcasts, amenity policies, and visitor passes.

## Access Model & Routing
- **Route group:** `app/(management)/`
- **Role identifier:** `management`
- **Navigation:** The current bottom tab bar exposes `index`, `requests`, and `more`, with `profile` mounted as a stack route. Additional modules are reached through **More** or in-app navigation.

| Entry point | Screen | Availability | Notes |
| --- | --- | --- | --- |
| Operations (tab) | `app/(management)/index.tsx` | Always | Building dashboard + broadcast composer. |
| Requests (tab) | `app/(management)/requests.tsx` | Always | Request triage with notes/messages. |
| More (tab) | `app/(management)/more.tsx` | Always | Current UI is minimal and primarily exposes profile navigation. |
| Profile (stack route) | `app/(management)/profile.tsx` | Always | Mounted, but hidden from the custom tab bar. |
| Secondary mounted routes | `units`, `amenities`, `visitors`, `buildings`, `workforce`, `activity`, `shifts`, `parcels`, `maintenance`, `billing`, `managers` | Mounted | These routes exist under `app/(management)/`, but current navigation only surfaces a subset of them. |
| Planned/reference routes | `jobs`, `tenants`, `maintenance-schedules` | Not mounted today | The deep-dive sections remain useful intent, but those route files are not present in the current router tree. |
| Global drawer | `components/ui/SideMenu.tsx` | Role-aware | Shows Management shortcuts plus account + sign-out. |

`MANAGEMENT_NOTIFICATION_ROUTE` is passed to every screen header so notification taps open the admin/management notification modal.

## Shared UI & State Patterns
- `HeaderBar` drives responsive titles, notification badges, and toggles the role-aware `SideMenu`.
- `AnalyticsSection`, `MiniTrendCard`, and `ManagementTile` deliver consistent analytics visuals across dashboard and list screens.
- `EntityTable` supplies tabular layouts (buildings) and `JobCard` standardizes job summaries.
- `react-native-reanimated` (`FadeIn`, `FadeInDown`) animates section entry without blocking data fetches.
- Broadcasts, notifications, and many CRUD actions surface optimistic UI through local state before real API wiring is added.

## Data & Action Sources (`useApp`)
- **Buildings & scope:** `getManagedBuildings`, `getManagedBuildingIds`, `getBuildings`, `getBuildingById`, `getUnitsByBuilding`, `getBuildingEmployees`, `getVisitorLogsByBuilding`.
- **Analytics & comms:** `getAnalytics`, `getManagementAnalytics`, `notifications`, `broadcastNotificationToRole`, `markNotificationAsRead`, `markAllNotificationsAsRead`.
- **Requests & jobs:** `requests`, `updateRequest`, `addRequestNote`, `addRequestMessage`, `setSelectedRequest`, `getJobs`, `assignJob`, `assignJobToBuildingEmployee`, `updateJobStatus`, `getServiceProviders`, `getServiceProvidersForBuilding`.
- **Tenants & leases:** `getUsers`, `leases`, `getManagedBuildingIds`, `getManagedBuildings`.
- **Units & amenities:** `buildingUnits`, `unitTypes`, `updateUnit`, `createUnit`, `amenityConfigs`, `updateAmenityConfig`, `createAmenityConfig`.
- **Visitors & workforce:** `getVisitorPasses`, `getVisitorPassesByBuilding`, `approveVisitorPass`, `rejectVisitorPass`, `markVisitorPassCheckIn`, `markVisitorPassComplete`, `cancelVisitorPass`, `createVisitorPass`, `addBuildingEmployee`, `updateBuildingEmployee`, `removeBuildingEmployee`.
- **Prototype data:** Parcels, shifts, and maintenance schedules currently rely on `MOCK_PARCELS`, `MOCK_SHIFTS`, and `MOCK_MAINTENANCE_SCHEDULES` (see `lib/utils/mockData.ts`). API clients exist in `lib/services/api/parcels.ts`, `shifts.ts`, and `maintenance.ts` but are not yet wired to the UI.

## Screen Breakdown

### Operations Dashboard (`app/(management)/index.tsx`)
- Building selector chips appear when multiple properties are assigned; every section recalculates when the active building changes.
- `ManagementTile` grid surfaces open requests, jobs, bookings, visitors, completion rate, and occupancy from `actions.getManagementAnalytics`.
- Secondary sections list today’s requests, upcoming amenity bookings, expected visitors, and active jobs with “View jobs/bookings” shortcuts.
- Broadcast modal lets managers target one or many buildings, choose tone (info/success/warning/alert), preview styling, and send via `actions.broadcastNotificationToRole("tenant", ...)`.
- Outstanding work: replace mock analytics refresh with real fetches, prevent double submission while `isSending`, and integrate with backend notification service.

### Service Requests (`app/(management)/requests.tsx`)
- Summary tiles show totals scoped to the selected building or “All buildings”.
- Filters include building chips, status buttons, priority pills, type pills, and search over title/description/unit.
- Detail modal offers four tabs: overview (status changes, SLA, job linkage), notes (internal `addRequestNote` entries), messages (`addRequestMessage` thread), and timeline.
- Managers can update request status via `updateRequest`, create or navigate to work orders, and maintain audit trails through notes/messages.
- Outstanding work: connect to REST endpoints, add pagination, surface assignment activity, and expose attachments in notes/messages.

### Jobs Management (`app/(management)/jobs.tsx`)
- Job list filters by status and respects building scope via `getManagedBuildingIds`.
- Detail modal exposes job metadata, building/unit, assignment, cost, and schedule.
- Building managers can assign a service provider (`assignJob`) or an in-house employee (`assignJobToBuildingEmployee`). Only the worker currently assigned (`assignedTo`/`assignedBuildingEmployeeId`) may mark jobs in-progress or completed.
- Outstanding work: add job creation without leaving the screen, support reassignment history, pull data from backend, and align permission checks with server responses.

### Tenant Directory (`app/(management)/tenants.tsx`)
- Occupancy summary cards compute occupied/vacant units, active leases, and resident counts from `leases` and managed building metadata.
- Building filter chips and search over name/email/unit/tower tighten the list.
- Tenant cards surface unit, building, lease status, and contact info; tapping opens a modal with contact, residence, emergency, and lease details.
- Outstanding work: sync occupancy metrics with real inventory, allow exporting resident lists, and surface lease expiry reminders.

### Units Management (`app/(management)/units.tsx`)
- Status chips and building filters refine the unit list. Each card displays unit type, floor, rent, status, amenities, and occupant snapshot.
- Managers can adjust amenities, status, and furnishing tags via the edit modal. `createUnit` wizard captures template, size, rent, deposit, inclusions, and amenity set.
- Outstanding work: persist edits/creates to the API, enforce field validation, and add bulk import/update tooling.

### Amenity Policies (`app/(management)/amenities.tsx`)
- Lists amenity configurations per building with status badges and booking limits.
- Managers can toggle active/inactive, schedule maintenance windows (updates status to `maintenance` with notes), and create new amenity configs with custom rules.
- Outstanding work: route updates through `amenityConfigs` API, display live booking conflicts, and allow editing/removing existing rules.

### Visitor Passes (`app/(management)/visitors.tsx`)
- Status filters and optional date range pickers slim the pass list (`getVisitorPasses`, `getVisitorPassesByBuilding`).
- Pass detail modal allows approve/reject, check-in, completion, and cancellation; actions call corresponding helpers with permission checks ensuring the manager owns the building.
- “Create Pass” modal supports visitor, contractor, delivery, or vendor types with schedule pickers and validation messaging.
- Outstanding work: connect to backend visitor endpoints, attach QR codes from the server, and log notification dispatch.

### Workforce Planning (`app/(management)/workforce.tsx`)
- Summary cards report headcount, night-shift coverage, and average ratings. Provider summary highlights top vendors and response times.
- Building filters scope the employee list. Cards expose contact info, shift, rating, and quick actions to cycle shift (`updateBuildingEmployee`) or remove staff.
- “Add Building Employee” modal creates on-site staff records via `addBuildingEmployee`.
- Outstanding work: wire to workforce REST APIs, capture role-specific fields (certifications, vendor assignment), and log shift changes.

### Parcels Prototype (`app/(management)/parcels.tsx`)
- UI renders `MOCK_PARCELS` with status filters, quick detail modal, and status change prompts. No mutations persist and building scoping is not yet applied.
- Outstanding work: replace mocks with `parcelsService`, add building filter + search, implement status updates and pickup verification via API, and surface handover logs.

### Shifts Prototype (`app/(management)/shifts.tsx`)
- Provides a weekly calendar and list view powered by `MOCK_SHIFTS`. Managers can open shift modals, edit details, or duplicate across days in-memory.
- Outstanding work: hook into `shiftsService`, persist edits/additions/cancellations, align timezone handling, and integrate employee lookup autocomplete.

### Maintenance Schedules Prototype (`app/(management)/maintenance-schedules.tsx`)
- Displays upcoming/in-progress/completed/cancelled schedules from `MOCK_MAINTENANCE_SCHEDULES`. Detail modal supports edit, cancel, start, complete, and notify actions—currently affecting mock state only.
- Outstanding work: connect to `maintenanceService`, enforce clash detection, feed notifications to tenants, and audit lifecycle transitions.

### Buildings Overview (`app/(management)/buildings.tsx`)
- Managers can browse buildings they oversee, open rich detail modals (units, staff, providers, visitors), and view searchable metadata.
- Creation and manager reassignment remain admin-only; permission guards block those actions for management users.
- Outstanding work: add read-only building summary tailored for managers and remove admin-only controls from the management view.

### Activity Feed (`app/(management)/activity.tsx`)
- Combines analytics timeline (`analytics.recentActivity`) with role-filtered notifications. Managers can mark single or all notifications as read.
- Outstanding work: paginate large histories, filter by event type, and expose quick actions (e.g., jump to request/job).

### More Menu & Side Drawer (`app/(management)/more.tsx`, `components/ui/SideMenu.tsx`)
- More menu cards surface secondary workflows. The side drawer mirrors those entries, adds quick navigation to the main tabs, and handles logout via `actions.logout()`.
- Outstanding work: gate prototype modules behind feature flags and surface environment/build metadata for support.

## Role-Specific Behaviors
- All queries funnel through `getManagedBuildings`/`getManagedBuildingIds`; when no buildings are assigned, screens render guard rails (e.g., empty state on the dashboard).
- Assignment helpers (`assignJob`, visitor pass mutations) verify the current manager owns the target building before proceeding.
- Managers cannot create buildings or edit role permissions; those flows are restricted to admin roles through explicit checks.
- Job status transitions are intentionally limited to the worker assigned to the job, preventing managers from closing work orders on behalf of technicians.

## Next Steps
1. Replace mock data in Parcels, Shifts, and Maintenance with the corresponding services, ensuring building scoping and persistence.
2. Wire dashboard, requests, jobs, units, and amenities mutations to real API endpoints with optimistic UI and error handling.
3. Expand tenant, request, and job screens with pagination/infinite scroll to support large portfolios.
4. Add validation and inline error messaging across creation/edit modals (units, amenities, visitor passes, workforce).
5. Introduce automated tests (React Native Testing Library) covering the dashboard, requests, and jobs flows to protect regressions as backend wiring lands.

## Related Resources
- Backend contracts: `docs/backend/TowerDesk-Management-Contracts.md`
- Frontend feature spec: `docs/frontend/TowerDesk-Management-Frontend-Spec.md`
- API client stubs: `lib/services/api/{parcels,shifts,maintenance}.ts`
- Shared types: `lib/types/index.ts`
- Analytics & mock data: `lib/context/connected-app-provider.tsx`, `lib/utils/mockData.ts`
