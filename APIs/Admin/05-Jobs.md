# Module 05 — Jobs & Workflow Management

Admins track and dispatch maintenance jobs from `app/(admin)/jobs.tsx` and the dashboard widgets. This module documents the job lifecycle endpoints handled by `adminApi`.

**Key types**: `Job`, `CreateJobDTO`, `UpdateJobDTO`, `AssignJobDTO` (`lib/types/index.ts:899-1058`, `1264-1340`).

---

## GET `/api/admin/jobs`
- Optional query params:
  | Param | Type | Notes |
  | --- | --- | --- |
  | `status` | `Job["status"]` | Filters tabs (Pending, Assigned, In Progress, Completed, Cancelled). |
  | `buildingId` | string | Used when the dashboard scopes to a building. |
  | `assignedTo` | string | Filter by service provider company or employee. |
  | `from` / `to` | ISO string | Date range filters for analytics. |
- Response: `ApiResponse<Job[]>` including nested `assignmentHistory`, `costBreakdown`, and `complianceChecklist` arrays so the drawer opens instantly.

## GET `/api/admin/jobs/{id}`
- Returns a single `Job` with all nested collections, used when clicking a row or notification.

## POST `/api/admin/jobs`
- Payload (`CreateJobDTO`):
  | Field | Type | Required | Notes |
  | --- | --- | --- | --- |
  | `title`, `description` | string | ✅ | Captured from the modal. |
  | `type` | `RequestType` | ✅ | Aligns with request categories. |
  | `priority` | `RequestPriority` | ✅ | `"low" | "medium" | "high" | "urgent"`. |
  | `buildingId` | string | ✅ | Used for analytics and filtering. |
  | `unitNumber` | string | ❌ | Blank for common-area jobs. |
  | `assignedTo` | string | ❌ | Service provider company ID. |
  | `assignmentTargetType` | `"service_provider" \| "building_employee"` | ❌ | Required when sending `assignedTo` or `assignedBuildingEmployeeId`. |
  | `assignedBuildingEmployeeId` | string | ❌ | For internal workforce routing. |
  | `scheduledDate` | ISO string | ❌ | Planned start. |
  | `attachments` | string[] | ❌ | Uploaded media URIs. |
  | `estimatedCost`, `costBreakdown[]` | number/list | ❌ | Accept either aggregated or detailed values. |
  | `complianceChecklist[]` | list | ❌ | See `CreateJobChecklistItemDTO`. |
- Response: Created `Job`.

## PUT `/api/admin/jobs/{id}`
- Accepts any subset of `UpdateJobDTO` to edit descriptions, costs, scheduling, or assignments.
- Response: Updated `Job`.

## PATCH `/api/admin/jobs/{id}/status`
- Body: `{ status: Job["status"] }`.
- Enforce workflow rules (e.g., cannot mark `completed` unless `completionStatus` is set).
- Response: Updated `Job`.

## POST `/api/admin/jobs/{jobId}/assign`
- Body: `AssignJobDTO` (`jobId`, `serviceProviderId`, optional `scheduledDate`, `notes`).
- Should append an entry to `assignmentHistory` and return the updated `Job`.
- To support building employee assignments, honor `assignmentTargetType` or introduce a similar endpoint.

## DELETE `/api/admin/jobs/{id}`
- Archives a job created in error. Respond with `{ success: true }`.
- Reject deletion when the job already has completion data; advise cancelation instead.
