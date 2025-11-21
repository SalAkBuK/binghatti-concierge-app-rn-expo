# Module 03 — Jobs Management (Management Role)

Managers monitor job assignments under `app/(management)/jobs.tsx`. This module mirrors the admin job spec but limits actions to the manager’s buildings.

**Key types**: `Job`, `JobNote`, `CreateJobDTO`, `UpdateJobDTO`, `AssignJobDTO` (`lib/types/index.ts:899-1058`, `1264-1340`).

---

## Endpoint matrix

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/management/jobs` | `GET` | List jobs filtered by building/status/assignee. |
| `/api/management/jobs/{id}` | `GET` | Job detail drawer with notes, cost breakdown, timeline. |
| `/api/management/jobs/{id}` | `PUT` | Update status, priority, schedule, or assignment. |
| `/api/management/jobs/{id}/assign` | `POST` | Assign to a service provider or building employee. |
| `/api/management/jobs/{id}/notes` | `POST` | Add internal notes visible to operations. |

---

## GET `/api/management/jobs`
- Query params:
  | Param | Type | Notes |
  | --- | --- | --- |
  | `buildingId` | string | Optional; if provided it must equal `user.profile.buildingId`. Backend should always filter by that single building. |
  | `status` | `"pending" \| "assigned" \| "in-progress" \| "completed" \| "cancelled"` | Drives the tabs in the management UI. |
  | `assignmentTargetType` | `"service_provider" \| "building_employee"` | Optional filter to separate external vs internal assignments. |
  | `assignedTo` | string | Filter jobs assigned to a specific provider/employee. |
  | `search` | string | Filters by job title, requestId, or unit number. |
- Response: `Job[]` with summary fields plus `buildingName`.
- Backend must ensure only jobs belonging to the manager’s assigned building are returned.

## GET `/api/management/jobs/{id}`
- Returns the full `Job` object including:
  - `assignmentHistory`, `notes`, `attachments`
  - `costBreakdown`, `scheduledDate`, `estimatedCost`
  - `requestId` (if linked to a tenant request)
  - `buildingName`, `unitNumber`
- Add `managerActions` flags if certain statuses should disable actions.

## PUT `/api/management/jobs/{id}`
- Allowed fields exposed in the UI:
  | Field | Type | Notes |
  | --- | --- | --- |
  | `status` | Job["status"] | For transitions (pending → assigned → in-progress → completed). |
  | `priority` | RequestPriority | Optional slider. |
  | `scheduledDate` | ISO string | For planned visits. |
  | `assignedTo` | string | Service provider company ID. |
  | `assignedBuildingEmployeeId` | string | Internal staff assignment when `assignmentTargetType = "building_employee"`. |
  | `assignmentTargetType` | `"service_provider" \| "building_employee"` | Must match the assignment target. |
  | `managerNotes` | string | Summary field displayed in the drawer. |
- Respond with the updated `Job`.
- Reject updates when the job’s `buildingId` differs from `user.profile.buildingId`.

## POST `/api/management/jobs/{id}/assign`
- Body: `AssignJobDTO` (same as admin module) but limited to the manager’s buildings.
- When assigning internal staff, include `assignmentTargetType: "building_employee"` and the `assignedBuildingEmployeeId`.
- Response: Updated `Job` with the new assignment appended to `assignmentHistory`.

## POST `/api/management/jobs/{id}/notes`
- Body: `{ note: string }`.
- Notes are visible to other staff but not to tenants/service providers unless you choose to expose them.

## Scenario — Manager reassigns an in-progress job
1. Manager filters by Building A → Status “In Progress.” UI issues `GET /api/management/jobs?buildingId=building-a&status=in-progress`.
2. They open job `JOB-77` and decide to reassign it to a different service provider. The app sends:
   ```json
   {
     "assignedTo": "sp-22",
     "assignmentTargetType": "service_provider",
     "managerNotes": "Reassigned due to coverage issues"
   }
   ```
   via `PUT /api/management/jobs/JOB-77`.
3. Backend updates the job, appends to `assignmentHistory`, and returns the new job record.
4. Manager adds an internal note (`POST /api/management/jobs/JOB-77/notes`) summarizing the reason.
5. When the job completes, they call `PUT ...` with `{ "status": "completed" }`. Backend must validate chronological transitions and confirm the job belongs to the manager’s assigned building before applying changes.
