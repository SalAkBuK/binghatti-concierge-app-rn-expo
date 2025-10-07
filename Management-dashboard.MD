# Management Dashboard — Instructions for Claude

> Purpose: produce a fully functional mobile Management Dashboard (mobile app) matching the Building Management specification provided. Reuse existing Admin Dashboard components where possible. Orchestrate work via sub-agents that specialize in UI, data, auth/permissions, notifications, analytics, scheduling, and QA. Deliver production-ready React Native screens, components, API contracts, and an integration plan.

---

## 1. High-level goals for Claude

1. Build a mobile-first Management Dashboard covering: Analytics, Users Management (management users, building employees, service providers), Request & Job Management, Shift Management, Parcel/Delivery Management, Amenities Management, Visitors Management, Notifications, and Maintenance Scheduling.
2. Reuse existing Admin Dashboard components and patterns. If a reusable component is missing, create a new generic component (prefixed `Mgmt*`) that fits the app design system.
3. Use sub-agents for parallelizable responsibilities. Each sub-agent has a narrow responsibility, clear inputs/outputs, and tests.
4. Produce TypeScript React Native code (single-file components when appropriate), API definitions (OpenAPI/REST), data models, and acceptance tests. Provide simple exportable artifacts (component files, screen files, API spec) in expected repo structure.

---

## 2. Required sub-agents (roles & responsibilities)

1. **Supervisor Agent (Orchestrator)**

   * Coordinates sub-agents, enforces reuse of existing components, performs merges, and enforces CI checks.
   * Watches for regressions and requests rollbacks from subordinate agents if tests fail.

2. **UI / Components Agent**

   * Locate Admin Dashboard components and map which can be reused.
   * Create missing reusable components with standardized props and documentation.
   * Deliver a component palette (Card, Table, List, Modal, Form, Input, Select, Graph, Calendar, Badge, Avatar, Switch, Toast, Upload).

3. **Screens / Flows Agent**

   * Use the components produced to implement screens: Dashboard (analytics), Requests, Jobs, Users, Service Providers, Shifts, Parcels, Amenities, Visitors, Notifications, Settings.
   * Ensure accessible navigation and state handoff between screens.

4. **Data / API Agent**

   * Produce API contracts (OpenAPI or REST spec), data access layer hooks (React Query / SWR style), and mock server for local dev.
   * Map backend fields provided in spec into models.

5. **Auth & Permissions Agent**

   * Implement role-based access control: Management, Building Manager, Building Employee, Service Provider Employee.
   * Enforce fine-grained permission checks (see Permissions matrix below).

6. **Notifications Agent**

   * Create push and in-app notification flows, templates, and queueing logic. Provide test harness for sending sample notifications.

7. **Analytics Agent**

   * Implement analytics graphs, endpoints for aggregated counts (requests by status, requests by type, jobs completed/time-to-complete), and frontend visualizations.

8. **Scheduling & Shifts Agent**

   * Implement calendar view, recurring schedules, shift assignment flows, and sync logic for reminders.

9. **Service Provider Agent**

   * Manage SP CRUD, team assignment, rating, offered services and SP employee assignment flows.

10. **QA & Testing Agent**

    * Create unit, integration, and E2E tests. Include API contract tests, component snapshot tests, and critical flow acceptance criteria.

11. **CI / Deploy Agent**

    * Add CI pipelines for lint, type-check, unit tests, and e2e. Prepare build config for TestFlight / Play Console or internal distribution.

---

## 3. Permissions matrix (minimum):

Top-level roles: `ManagementAdmin`, `BuildingManager`, `BuildingEmployee`, `ServiceProvider`, `Tenant` (tenants may have read-only limited access via tenant app).

Permissions to implement (true/false per role):

* Analytics Graph: ManagementAdmin (true), BuildingManager (true)
* Add Management Users: ManagementAdmin (true), BuildingManager (cond: allowed for building they manage)
* Add Building Employees: ManagementAdmin (true), BuildingManager (true)
* Shift Management: ManagementAdmin (true), BuildingManager (true), BuildingEmployee (own shifts)
* Parcel/Delivery Management: ManagementAdmin, BuildingManager, BuildingEmployee (for assigned tasks)
* Amenities Management: ManagementAdmin, BuildingManager
* Visitors Management: BuildingManager, BuildingEmployee
* Request/Job Management: ManagementAdmin, BuildingManager, ServiceProvider (assigned jobs), BuildingEmployee

Enforce at frontend and backend. Auth agent must return an `allowedPermissions[]` claim in JWT.

---

## 4. Reusable component library (deliverable API + props)

Create or reuse components with these suggested props. Name convention: `Mgmt*` for new ones.

* `MgmtCard` — props: `title:string`, `subtitle?:string`, `actions?:ReactNode`, `children:ReactNode`, `footer?:ReactNode`
* `MgmtTable` — props: `columns:Array<{key:string,label:string,sortable?:boolean,render?:Fn}>`, `data:Array<object>`, `onRowPress?(row)`, `pagination?`
* `MgmtList` — props: `items:Array`, `renderItem:(item)=>JSX`, `onEndReached?`
* `MgmtForm` — props: `fields:Array<FieldSpec>`, `onSubmit`, `initialValues?`, `validationSchema?`
* `MgmtModal` — `visible:boolean`, `title:string`, `onClose`, `children`
* `MgmtGraph` — `type: 'line'|'bar'|'pie'`, `data`, `xKey`, `yKey`, `legend?`
* `MgmtCalendar` — `events:Array<{id,start,end,title,meta}>`, `onEventPress`, `onDateChange`
* `MgmtUserAvatar` — `user`, `size`.
* `MgmtBadge` — `label`, `status` (success/warning/error/info)
* `MgmtUpload` — `onUpload`, `accept`, `multiple?`
* `MgmtToast` — `message`, `type`, `duration`

All components must be documented with examples and storybook stories when possible.

---

## 5. Screens & flows (priority + acceptance criteria)

1. **Management Home / Analytics**

   * Show: total requests (last 7/30/90 days), pending, active, completed, time-to-complete, graph by request_type.
   * Accept if graphs match backend aggregates and filters.

2. **Requests (List + Detail)**

   * List with filters (status, type, building, assigned_to). Detail shows description, attachments, tenant, timeline, job link, and actions (assign, escalate, close).

3. **Jobs (Job Board)**

   * Create job, assign to SP or building employee, attach files, set priority, schedule. Job status lifecycle: open -> in_progress -> completed -> closed.

4. **Users (Mgmt Users & Building Employees)**

   * CRUD with roles, building assignment, contact info. Password reset flows.

5. **Service Providers**

   * CRUD for SP, view team, ratings, services offered, assign SP employees to jobs.

6. **Shift Management**

   * Calendar view of shifts, create recurring shifts, swap request flow.

7. **Parcel/Delivery Management**

   * Register deliveries, notify tenants, log pickup, print slip.

8. **Amenities Management**

   * Bookings for Gym/Pool, time slots, approve/reject, capacity handling.

9. **Visitors Management**

   * Pre-registered visitors, on-spot registration, photo capture, issue temporary pass, check-in/out.

10. **Notifications Center**

    * List of notifications, mark read/unread, templates for SMS/email/push.

11. **Maintenance Scheduling**

    * Recurring maintenance tasks, assign employees, set SLA and reminders.

---

## 6. Data models (based on your fields)

### Request

```
request_id: string
tenant_id: string
building_id: string
request_type: string
status: enum(pending, active, assigned, completed, closed, escalated)
created_at: timestamp
assigned_to: user_id | service_provider_employee_id
job_id?: string
attachments?: [url]
priority?: enum(low, medium, high)
```

### Job

```
job_id: string
job_type: string
assigned_to: user_id | service_provider_employee_id
status: enum(open,in_progress,completed,closed)
description: string
attachments: [url]
scheduled_at?: timestamp
completed_at?: timestamp
```

### ServiceProvider

```
service_provider_id: string
name: string
team_size: number
rating: number
services_offered: [string]
employees: [sp_employee_id]
```

### User

```
user_id
name
role
phone
email
building_id
permissions: [string]
```

### Notification

```
notification_id
user_id
message
type: enum(push,email,sms,in_app)
created_at
read_at?
```

### Shift

```
shift_id
user_id
building_id
start_time
end_time
recurrence_rule?
```

---

## 7. API endpoints (examples)

* `GET /api/v1/analytics/requests?range=30d&building_id=` -> aggregated counts and series
* `GET /api/v1/requests?status=&type=&building_id=&assigned_to=` -> list
* `GET /api/v1/requests/:id` -> request detail
* `POST /api/v1/requests/:id/assign` -> { assigned_to }
* `POST /api/v1/jobs` -> create job
* `PATCH /api/v1/jobs/:id` -> update status / assign
* `GET /api/v1/service-providers` -> list
* `POST /api/v1/shifts` -> create shift
* `POST /api/v1/notifications/send` -> { user_id, type, template, payload }

API must return `allowedPermissions[]` inside `/auth/me`.

---

## 8. Reuse strategy (how to detect & reuse Admin components)

1. UI Agent compares component names and props. If an Admin component matches (e.g., `AdminTable`, `AdminModal`, `AdminForm`), create thin wrappers `MgmtTable` that map props and add mobile-friendly defaults.
2. Convert web/table patterns into mobile equivalents (lists with expandable rows, swipe actions, modals).
3. Document every reuse decision in a `COMPONENT_REUSE.md` file.

---

## 9. Orchestration & sub-agent communication

* Use the Supervisor Agent to provide tasks to sub-agents with a structured request JSON: `{ taskId, contextFiles[], reuseHints[], acceptanceCriteria[] }`.
* Each sub-agent returns `{ artifactPaths[], testsRun[], status, blockers[] }`.
* Supervisor merges artifacts, runs CI tests, and if failure occurs requests hotfix from the responsible sub-agent.

---

## 10. Testing & acceptance criteria

* Unit tests for all components (>= 80% coverage for critical components).
* Integration tests for API contracts (mock server + contract tests).
* E2E scenarios: create request -> assign job to SP -> SP marks completed -> tenant feedback -> analytics shows updated counts.
* Visual regression tests for Graphs and critical screens.

---

## 11. UX notes & small details

* Keep actions reachable with thumb (bottom sheets for actions on mobile).
* Use clear status badges (Pending, Active, Assigned, Completed).
* Attachments allow preview and download.
* Offline: show cached list and optimistic updates for assign/close actions.

---

## 12. Deliverables to produce for Claude-run

1. Component library (`/src/components/mgmt/*`) + Storybook stories.
2. Screens (`/src/screens/mgmt/*`) implemented in React Native + TypeScript.
3. API Spec (OpenAPI YAML) and mock server (swagger/mock server).
4. Auth contract including `allowedPermissions[]` claim.
5. Test suite and CI config.
6. A `COMPONENT_REUSE.md` documenting which Admin components were reused and where.
7. A `README` with run instructions and acceptance test checklist.

---

## 13. Example instruction payload for a sub-agent

```json
{
  "taskId": "ui_components_v1",
  "goal": "Create MgmtCard, MgmtTable, MgmtForm with storybook stories",
  "contextFiles": ["/admin/src/components/Card.tsx", "/admin/src/components/Table.tsx"],
  "reuseHints": ["wrap AdminCard to MgmtCard with mobile defaults"],
  "acceptanceCriteria": ["storybook stories exist", "unit tests */, "exported in index.ts"]
}
```

---

## 14. Implementation stack recommendation

* React Native + TypeScript
* State: React Query (data fetching) + Zustand/Context for local UI state
* Navigation: React Navigation
* UI primitives: Tailwind RN or shadcn-style components; use existing Admin tokens for colors/space
* Charts: `recharts` or `react-native-svg-charts`
* Storage: IndexedDB/SQLite for offline cache
* Notifications: Firebase Cloud Messaging + server queue

---

## 15. Final notes for Claude

* Do not ship anything without Supervisor Agent approval and passing CI.
* Keep artifacts small and modular so other agents can reuse them.
* Prioritize Analytics, Request List/Detail, Assign Job flows first as MVP.

---

*End of instructions. Give me the success report and artifacts list after running these tasks.*
