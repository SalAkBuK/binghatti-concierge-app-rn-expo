# Admin Role Deep Dive

## Overview
- The admin experience lives under `app/(admin)/` and orchestrates portfolio-level operations across users, buildings, jobs, vendors, and analytics.
- The layout is shared by three roles. `admin` and `super_admin` receive full visibility, while `management` users can mount the same stack but the UI scopes results to their assigned buildings and hides privileged navigation.
- All screens consume `useApp()` from `lib/context/connected-app-provider.tsx`. The provider supplies mock data and mutation helpers that should ultimately delegate to the REST client in `lib/services/api/admin.ts`.

## Access Model & Routing
`app/(admin)/_layout.tsx` enforces authentication and limits access to `admin`, `super_admin`, and `management`. Navigation is tab-based with role-specific visibility:

| Tab | Screen | Admin access | Management access | Notes |
| --- | --- | --- | --- | --- |
| Dashboard | app/(admin)/index.tsx | Yes | Yes (label shows "Operations") | View adapts between portfolio and building snapshots. |
| Users | app/(admin)/users.tsx | Yes | No (tab hidden) | `Tabs.Screen` sets `href: null` for management. |
| Buildings | app/(admin)/buildings.tsx | Yes | No | Management config lives in `app/(management)`. |
| Unit Types | app/(admin)/unit-types.tsx | Yes | No | Admin-only template catalog. |
| More | app/(admin)/more.tsx | Yes | No | Entry point to hidden admin tools. |
| Tenants | app/(admin)/tenants.tsx | Via More | Yes | Admin launches from More; management gets a primary tab. |
| Requests | app/(admin)/requests.tsx | Via More | Yes | Management data constrained to managed buildings. |
| Workforce | app/(admin)/workforce.tsx | Via More | Yes | Shares implementation with management scope rules. |
| Activity | app/(admin)/activity.tsx | Via More | Yes | Notification timeline; admin accesses through More. |
| Jobs | app/(admin)/jobs.tsx | Via More | No | Admin-only list; management uses its own route group. |
| Service Providers | app/(admin)/service-providers.tsx | Via More | No | Vendors are curated by admins. |
| Permissions | app/(admin)/permissions.tsx | Via More | Limited (informational only) | Management sees a locked callout; admin can toggle permissions. |

Hidden screens rely on the "More" grid and the `SideMenu` drawer (`components/ui/SideMenu.tsx`) for deep links. Every header passes `ADMIN_NOTIFICATION_ROUTE` so that notifications open the admin-focused modal.

## Shared UI Patterns
- `HeaderBar` renders the responsive title, notification bell, and menu toggle. It defers navigation to the drawer when `onSideMenuToggle` is provided.
- `SideMenu` adjusts its menu set per role (admin, management, building employee, service provider) and owns logout orchestration through `actions.logout()`.
- Several screens reuse cross-domain components such as `AnalyticsSection`, `AnalyticsTile`, `MiniTrendCard`, `EntityTable`, and `JobCard` for consistent styling.
- Animations are handled with `react-native-reanimated` (`FadeIn`, `FadeInDown`) to provide lightweight transitions without blocking data fetches.

## Data & State Sources
`useApp().actions` aggregates the domain helpers that power the admin UI. The most relevant calls are:

- Analytics and notifications: `getAnalytics()`, `getManagementAnalytics(buildingId)`, `markNotificationAsRead(id)`, `markAllNotificationsAsRead(userId)`.
- User management: `getUsers()`, `createUser(dto)`, `updateUser(id, dto)`, `deleteUser(id)`, `getManagedBuildingIds?.()`.
- Buildings: `getBuildings()`, `createBuilding(dto)`, `updateBuilding(id, dto)`, `getUnitsByBuilding?.(id)`, `getBuildingEmployees?.(id)`, `getVisitorLogsByBuilding?.(id)`, `getRatingSummaries?.("service_provider")`.
- Unit templates: `getUnitTypes()`, `getUnitTypeById?.(id)`, `createUnitType(dto)`, `updateUnitType(id, dto)`, `deleteUnitType(id)`.
- Requests and jobs: `requests` state, `updateRequest(id, dto)`, `setSelectedRequest(request)`, `createJob(dto)`, `assignJob(jobId, providerId)`, `updateJobStatus(jobId, status)`, `getJobs()`.
- Vendor management: `getServiceProviders()`, `getServiceProviderBuildingAssignments?.(providerId)`, `assignServiceProviderToBuilding?.(...)`, `removeServiceProviderFromBuilding?.(...)`, `providerAccessRequests`, `approveProviderAccessRequest?.(...)`, `rejectProviderAccessRequest?.(...)`.
- Workforce: `getBuildingEmployees(buildingId)`, `addBuildingEmployee(buildingId, dto)`, `updateBuildingEmployee(id, dto)`, `removeBuildingEmployee(id)`.
- Buildings and bookings also surface helper arrays like `buildings`, `notifications`, and `providerAccessRequests` that the components read directly.

## Screen Breakdown

### Dashboard (`app/(admin)/index.tsx`)
- Admin view renders a performance banner, two rows of `AnalyticsTile`s (Open Jobs, Pending Requests, Completion Rate, Revenue, Average Completion Time, Occupancy), activity trend cards, an operational snapshot trio, the top service provider leaderboard, and the recent activity timeline.
- When `currentUser.role === "management"` the layout switches to building chips, a building summary grid, and live lists for today's requests, upcoming bookings, expected visitors, and active jobs. Links point back into tenant bookings or the jobs screen as appropriate.
- Data dependencies: `actions.getAnalytics()`, `actions.getManagedBuildings?.()`, `actions.getManagementAnalytics(selectedBuildingId)`, plus `filterNotificationsByUser`.
- Outstanding tasks: convert the refresh control to re-fetch analytics, guard against empty analytics arrays, and replace mock data with calls to `apiService.admin.getAnalytics`.

### Users Management (`app/(admin)/users.tsx`)
- `EntityTable` lists users with search, pull-to-refresh, and an alert-based quick view; management users only see records tied to their buildings or themselves.
- Admins and super admins can create tenants, service providers, employees, or management users through the modal. Tenant creation captures apartment, tower, and building context.
- Role badge colors are derived in-component and match the broader design system.
- Data dependencies: `actions.getUsers()`, `actions.getManagedBuildingIds?.()`, `actions.createUser()`, `filterNotificationsByUser`.
- Outstanding tasks: expose update/delete flows that wrap `actions.updateUser()` and `actions.deleteUser()`, add server-backed pagination and role filters, and surface validation errors inline instead of relying solely on alerts.

### Buildings Management (`app/(admin)/buildings.tsx`)
- Displays all buildings (or scoped sets for management) with search and pull-to-refresh.
- Admins can create buildings, assign managers via a dedicated modal, and view detailed building modals showing units, staffing, visitor logs, and top-rated service providers.
- Detail views pull unit status, maintenance history, visitor logs, employee rosters, and provider summaries using helper selectors.
- Data dependencies: `actions.getBuildings()`, `actions.getUsers()`, `actions.createBuilding()`, `actions.updateBuilding()`, `actions.getUnitsByBuilding?.()`, `actions.getBuildingEmployees?.()`, `actions.getVisitorLogsByBuilding?.()`, `actions.getRatingSummaries?.("service_provider")`, `unitTypes`.
- Outstanding tasks: wire building creation/update to backend, add delete/archive support, and ensure provider summaries degrade gracefully when ratings are absent.

### Unit Types (`app/(admin)/unit-types.tsx`)
- Provides searchable unit templates with columns for name, bedroom/bath counts, area, rent, and amenity count.
- Create/edit modal supports numeric validation, amenity toggles, and base rent capture; delete is available when editing.
- Access is restricted to admin/super admin; management users only read templates indirectly.
- Data dependencies: `actions.getUnitTypes()`, `actions.createUnitType()`, `actions.updateUnitType()`, `actions.deleteUnitType()`, `actions.getUnitTypeById?.()`.
- Outstanding tasks: persist amenities and rent updates to the API, add confirmation prompts around deletions, and consider surfacing usage counts per building.

### Request Operations (`app/(admin)/requests.tsx`)
- Summary tiles track total, open, resolved, and unassigned requests within the current scope (portfolio for admin, assigned buildings for management).
- Building, status, and keyword filters feed a list of request cards that highlight priority, timestamps, and whether a work order exists.
- The detail modal allows status updates, job creation or reassignment (via `createJob`, `assignJob`), job status changes, and provider handoff. Selecting a request also updates shared state with `actions.setSelectedRequest`.
- Provider selection modal lists vendors with specialty, job count, and rating data.
- Data dependencies: `actions.getBuildings()`, `actions.getManagedBuildings?.()`, `actions.requests`, `actions.updateRequest()`, `actions.getJobs()`, `actions.createJob()`, `actions.assignJob()`, `actions.updateJobStatus()`, `actions.getServiceProviders()`, `filterNotificationsByUser`.
- Outstanding tasks: connect mutations to backend endpoints, add optimistic state handling rather than reloading lists manually, and capture assignment audit metadata.

### Jobs Management (`app/(admin)/jobs.tsx`)
- Presents all jobs (or management-scoped jobs) with a horizontal status filter and `JobCard` previews.
- Tapping a job opens a simple alert with core meta information; there is no editing surface yet.
- Data dependencies: `actions.getJobs()`, `actions.getManagedBuildingIds?.()`, `filterNotificationsByUser`.
- Outstanding tasks: integrate job creation and reassignment outside the request flow, surface more metadata (cost, SLA timers), and wire status filters to backend queries.

### Service Provider Management (`app/(admin)/service-providers.tsx`)
- Pending access requests are highlighted with approve/reject flows that trigger corresponding action helpers.
- Summary metrics track total vendors, active vendors, and building assignments; each provider card exposes rating, job volume, and building badges.
- The manage modal lets admins assign or remove buildings, adjust specialties, and add notes when updating coverage.
- Data dependencies: `actions.getServiceProviders()`, `actions.getBuildings()`, `actions.getManagedBuildings?.()`, `actions.getServiceProviderBuildingAssignments?.()`, `actions.assignServiceProviderToBuilding?.()`, `actions.removeServiceProviderFromBuilding?.()`, `actions.approveProviderAccessRequest?.()`, `actions.rejectProviderAccessRequest?.()`, `providerAccessRequests`.
- Outstanding tasks: add search/filter controls, persist specialty updates, and deliver audit trails for assignment changes.

### Tenant Directory (`app/(admin)/tenants.tsx`)
- Summary cards show active tenants, occupancy rate, and vacant units calculated from building metadata.
- Building chips and search allow quick filtering; tenant cards surface unit, tower, email, and phone details.
- A modal provides contact, residence, and emergency contact info for the selected tenant.
- Data dependencies: `actions.getBuildings()`, `actions.getManagedBuildings?.()`, `actions.getUsers()`, `filterNotificationsByUser`.
- Outstanding tasks: connect occupancy metrics to live data, expose export/share options, and support bulk communications.

### Workforce Planning (`app/(admin)/workforce.tsx`)
- Displays staffing summaries (total employees, night shift coverage, average rating) alongside a vendor performance snapshot.
- Building filters drive the employee list; cards allow shift cycling and removal, and capture contact details.
- An add-employee modal collects base profile data and assigns the employee to a building and shift.
- Data dependencies: `actions.getBuildings()`, `actions.getManagedBuildings?.()`, `actions.getBuildingEmployees()`, `actions.addBuildingEmployee()`, `actions.updateBuildingEmployee()`, `actions.removeBuildingEmployee()`, `actions.getServiceProviders()`, `filterNotificationsByUser`.
- Outstanding tasks: sync add/update/delete operations to the backend, log shift changes, and extend forms with role-specific fields (e.g., certifications).

### Activity Feed (`app/(admin)/activity.tsx`)
- Combines analytics activity with user notifications. Summary cards show recent events, inbox counts, and a "mark all read" action.
- Timeline rows render recent analytics events with iconography; the notifications list lets admins mark individual alerts as read.
- Data dependencies: `analytics.recentActivity`, `notifications`, `filterNotificationsByUser`, `actions.markNotificationAsRead()`, `actions.markAllNotificationsAsRead()`.
- Outstanding tasks: paginate large notification lists, expose filters (type/severity), and pipe through backend read receipts.

### Permissions Management (`app/(admin)/permissions.tsx`)
- Admins review role-by-resource permission groups and toggle individual permissions. Pending changes are tracked in the local `changes` map and saved in batch.
- Admin and super admin permissions are locked in the UI; toggles are disabled to prevent accidental revocation.
- Management users see a restricted message that points them back to the dashboard instead of the full matrix.
- Data dependencies: `actions.getPermissions()`, `filterNotificationsByUser`. The `handleSaveChanges` stub awaits integration with a permissions update endpoint.
- Outstanding tasks: wire `handleSaveChanges` to `actions.updatePermissions`, expose change review dialogs, and audit permission labels for clarity.

### More Menu (`app/(admin)/more.tsx`)
- Card grid links to Request Operations, Jobs, Service Providers, Tenant Directory, Activity, Workforce Planning, and Permissions.
- Account section displays the current admin name, role, and email, providing quick confirmation of the active identity.
- Data dependencies: `useApp` for user data and notifications; navigation runs through `expo-router`.
- Outstanding tasks: respect feature flagging when certain modules should be hidden and consider surfacing environment/build info for support teams.

## Permissions & Role Behavior
- Admin and super admin roles can create, update, and delete users, buildings, unit types, and provider assignments. They also control permissions and see all analytics.
- Super admins are treated as building-scoped for certain helpers (`hasScopedBuildings`) but still retain global access.
- Management users can mount the admin dashboard but only see data for their managed buildings. They cannot create entities, modify permissions, or reach admin-only tabs.
- All roles rely on `filterNotificationsByUser` so notification counts reflect personal unread state.

## Next Steps
- Replace the mock implementations in `ConnectedAppProvider` with calls into `lib/services/api/admin.ts` across analytics, users, buildings, unit types, requests, jobs, vendors, and workforce endpoints.
- Build UI flows for editing and deleting users, buildings, and unit types, and add optimistic updates with rollback on failure.
- Extend the jobs module with creation, reassignment, and SLA tracking independent of the request modal.
- Add automated tests (React Native Testing Library) for critical screens such as Dashboard, Requests, and Service Providers to protect core workflows.
- Document the expected payloads for analytics, requests, and permissions so backend and mobile teams can validate contracts together.

## Related Resources
- `lib/context/connected-app-provider.tsx` — source of the `useApp` actions referenced above.
- `lib/services/api/admin.ts` — planned REST client for admin endpoints.
- `features/management.md` — complementary documentation for the management-facing subset of the experience.
- `components/admin/*` — shared UI primitives (`AnalyticsSection`, `JobCard`, `EntityTable`, etc.) used across these screens.
