# Tenant Request API - MVP Simplified Flow

## Overview

This document specifies the **simplified MVP flow** for the Tenant Portal service request system. The flow is streamlined to be easy to implement while maintaining core functionality.

**Base URL**: `https://1bnx.online/api`

**Authentication**: All endpoints require JWT Bearer token

```
Authorization: Bearer {jwt_token}
```

---

## Simplified Flow

### For Building Employees (SIMPLE):

1. Tenant creates request
2. Management assigns building employee
3. Employee acknowledges → starts → completes
4. Tenant approves/rejects completion
5. **NO messaging, NO estimates, NO photo uploads**

### For Service Providers (COMPLEX - stays as is):

1. Tenant creates request
2. Management assigns service provider
3. Provider submits estimate → tenant approves
4. Provider completes work with photos
5. Tenant approves completion
6. **KEEPS messaging, estimates, photo uploads**

---

## 1. Tenant APIs

### 1.1 Create New Request

**Endpoint**: `POST /requests`

**Request Body**:

```json
{
  "title": "Leaking faucet in kitchen",
  "description": "The kitchen faucet has been leaking water for 2 days. Water drips continuously even when turned off completely.",
  "type": "plumbing",
  "priority": "high",
  "apartment": "1205",
  "tower": "Tower A",
  "buildingId": "building-uuid-123",
  "preferredTime": "Morning (9 AM - 12 PM)",
  "contactPhone": "+971501234567",
  "additionalNotes": "I work from home on Mondays and Wednesdays",
  "attachments": [
    "https://storage.towerdesk.com/uploads/faucet-leak-photo1.jpg",
    "https://storage.towerdesk.com/uploads/faucet-leak-photo2.jpg"
  ]
}
```

**Required Fields**:

- `title` (string, min 5 chars, max 100 chars)
- `description` (string, min 10 chars, max 500 chars)
- `type` (enum: `maintenance`, `repair`, `cleaning`, `electrical`, `plumbing`, `hvac`, `other`)
- `priority` (enum: `low`, `medium`, `high`, `urgent`)

**Optional Fields**:

- `apartment` (string) - auto-filled from user profile
- `tower` (string) - auto-filled from user profile
- `buildingId` (string) - auto-filled from user profile
- `preferredTime` (string, free text)
- `contactPhone` (string) - auto-filled from user profile
- `additionalNotes` (string, max 300 chars)
- `attachments` (array of strings - file URLs)

**Success Response (201)**:

```json
{
  "success": true,
  "data": {
    "id": "req-abc123",
    "title": "Leaking faucet in kitchen",
    "description": "The kitchen faucet has been leaking...",
    "type": "plumbing",
    "status": "pending",
    "priority": "high",
    "tenantId": "user-xyz789",
    "tenantName": "Ahmed Hassan",
    "apartment": "1205",
    "tower": "Tower A",
    "buildingId": "building-uuid-123",
    "preferredTime": "Morning (9 AM - 12 PM)",
    "contactPhone": "+971501234567",
    "additionalNotes": "I work from home on Mondays and Wednesdays",
    "attachments": ["https://storage.../photo1.jpg"],
    "assignedTo": null,
    "assignedToName": null,
    "assignmentTargetType": null,
    "createdAt": "2025-12-13T10:30:00Z",
    "updatedAt": "2025-12-13T10:30:00Z"
  },
  "message": "Request created successfully"
}
```

**Error Response (400)**:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "title": "Title must be at least 5 characters long",
    "description": "Description is required",
    "type": "Invalid request type"
  }
}
```

---

### 1.2 Get My Requests

**Endpoint**: `GET /requests`

**Query Parameters** (all optional):

```
?tenantId=user-xyz789           // Filter by tenant (auto-filled from JWT)
&status=pending                 // Filter by status
&type=plumbing                  // Filter by type
&priority=high                  // Filter by priority
&limit=10                       // Pagination limit
&offset=0                       // Pagination offset
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "req-abc123",
      "title": "Leaking faucet in kitchen",
      "description": "The kitchen faucet has been leaking...",
      "type": "plumbing",
      "status": "in-progress",
      "priority": "high",
      "tenantId": "user-xyz789",
      "tenantName": "Ahmed Hassan",
      "apartment": "1205",
      "tower": "Tower A",
      "buildingId": "building-uuid-123",
      "assignedTo": "employee-123",
      "assignedToName": "Mohammed Ali",
      "assignmentTargetType": "building_employee",
      "createdAt": "2025-12-10T08:00:00Z",
      "updatedAt": "2025-12-11T14:30:00Z"
    },
    {
      "id": "req-def456",
      "title": "AC not cooling properly",
      "type": "hvac",
      "status": "pending",
      "priority": "medium",
      "tenantId": "user-xyz789",
      "createdAt": "2025-12-13T09:15:00Z"
    }
  ],
  "message": "Requests retrieved successfully",
  "pagination": {
    "total": 8,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

**Status Values**:

- `pending` - Submitted, awaiting assignment
- `in-progress` - Assigned and being worked on
- `completed` - Work finished and tenant approved
- `cancelled` - Cancelled by tenant or admin

---

### 1.3 Get Request Details

**Endpoint**: `GET /requests/{requestId}`

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "id": "req-abc123",
    "title": "Leaking faucet in kitchen",
    "description": "The kitchen faucet has been leaking water for 2 days...",
    "type": "plumbing",
    "status": "in-progress",
    "priority": "high",
    "tenantId": "user-xyz789",
    "tenantName": "Ahmed Hassan",
    "apartment": "1205",
    "tower": "Tower A",
    "buildingId": "building-uuid-123",
    "preferredTime": "Morning (9 AM - 12 PM)",
    "contactPhone": "+971501234567",
    "additionalNotes": "I work from home on Mondays and Wednesdays",
    "attachments": ["https://storage.../photo1.jpg"],
    "assignedTo": "employee-123",
    "assignedToName": "Mohammed Ali",
    "assignmentTargetType": "building_employee",
    "jobStatus": "in-progress",
    "completionStatus": null,
    "createdAt": "2025-12-10T08:00:00Z",
    "updatedAt": "2025-12-11T14:30:00Z"
  }
}
```

**If assigned to Service Provider, response includes estimate**:

```json
{
  "success": true,
  "data": {
    "id": "req-ghi789",
    "title": "Install new AC unit",
    "status": "in-progress",
    "assignedTo": "sp-provider-456",
    "assignedToName": "Cool Air LLC",
    "assignmentTargetType": "service_provider",
    "estimate": {
      "id": "est-123",
      "status": "sp_approved",
      "subtotal": 1500,
      "items": [
        {
          "id": "item-1",
          "label": "AC Unit - 2 Ton Split",
          "amount": 1200
        },
        {
          "id": "item-2",
          "label": "Installation labor",
          "amount": 300
        }
      ],
      "createdAt": "2025-12-11T10:00:00Z"
    }
  }
}
```

---

### 1.4 Approve Job Completion (Tenant)

**Endpoint**: `POST /jobs/{jobId}/completion/approve`

**Request Body** (all optional):

```json
{
  "rating": 5,
  "feedback": "Excellent work! Very professional and clean.",
  "photos": ["https://storage.../after-repair-photo.jpg"]
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "jobId": "job-xyz",
    "requestId": "req-abc123",
    "status": "completed",
    "completionStatus": "tenant_approved",
    "completionApprovedAt": "2025-12-13T16:00:00Z",
    "completionApprovedBy": "user-xyz789",
    "rating": 5,
    "feedback": "Excellent work! Very professional and clean."
  },
  "message": "Job completion approved successfully"
}
```

---

### 1.5 Reject Job Completion (Tenant)

**Endpoint**: `POST /jobs/{jobId}/completion/reject`

**Request Body**:

```json
{
  "reason": "The faucet is still leaking slightly. Needs another visit."
}
```

**Required Fields**:

- `reason` (string, required)

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "jobId": "job-xyz",
    "requestId": "req-abc123",
    "status": "in-progress",
    "completionStatus": "tenant_rejected",
    "rejectionReason": "The faucet is still leaking slightly. Needs another visit.",
    "rejectedAt": "2025-12-13T16:00:00Z"
  },
  "message": "Job completion rejected. Employee will be notified."
}
```

---

### 1.6 Approve Service Provider Estimate

**Endpoint**: `POST /jobs/{jobId}/estimate/approve`

**Request Body**: Empty `{}`

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "jobId": "job-xyz",
    "estimate": {
      "id": "est-123",
      "status": "tenant_approved",
      "subtotal": 1500,
      "approvedAt": "2025-12-13T12:00:00Z",
      "approvedBy": "user-xyz789"
    }
  },
  "message": "Estimate approved successfully. Work will begin soon."
}
```

---

### 1.7 Decline Service Provider Estimate

**Endpoint**: `POST /jobs/{jobId}/estimate/decline`

**Request Body**:

```json
{
  "reason": "The cost is too high. Can we use standard parts instead of premium ones?"
}
```

**Required Fields**:

- `reason` (string, required)

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "jobId": "job-xyz",
    "estimate": {
      "id": "est-123",
      "status": "tenant_declined",
      "declinedReason": "The cost is too high...",
      "declinedAt": "2025-12-13T12:05:00Z",
      "declinedBy": "user-xyz789"
    }
  },
  "message": "Estimate declined. Service provider will be notified."
}
```

---

## 2. Building Notices

### 2.1 Get Building Notices

**Endpoint**: `GET /notices`

**Query Parameters**:

```
?buildingId=building-uuid-123   // Filter by building (auto-filled)
&status=scheduled               // Filter by status (optional)
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "notice-123",
      "title": "Water Tank Cleaning",
      "description": "Annual water tank cleaning will be performed. Water supply will be interrupted from 8 AM to 12 PM.",
      "scheduledDate": "2025-12-15T08:00:00Z",
      "status": "scheduled",
      "affectedAreas": ["All floors", "Common areas", "Rooftop"],
      "estimatedDuration": "4 hours",
      "createdBy": "mgmt-user-123",
      "createdAt": "2025-12-10T10:00:00Z",
      "updatedAt": "2025-12-10T10:00:00Z"
    }
  ],
  "message": "Building notices retrieved successfully"
}
```

**Notice Status Values**:

- `scheduled` - Planned for future
- `in-progress` - Currently happening
- `completed` - Finished
- `cancelled` - Cancelled

---

## 3. Management APIs

### 3.1 Get All Requests (Management)

**Endpoint**: `GET /requests`

**Query Parameters**:

```
?buildingId=building-uuid-123   // Filter by managed building
&status=pending                 // Filter by status
&assignedTo=employee-123        // Filter by assignee
```

**Success Response (200)**: Same structure as tenant's get requests, but returns all requests for managed buildings

---

### 3.2 Assign Request to Building Employee

**Endpoint**: `POST /requests/{requestId}/assign`

**Request Body**:

```json
{
  "assignedTo": "employee-123",
  "assignedToName": "Mohammed Ali",
  "assignmentTargetType": "building_employee"
}
```

**Required Fields**:

- `assignedTo` (string) - Employee user ID
- `assignedToName` (string) - Employee name
- `assignmentTargetType` (enum: `building_employee` or `service_provider`)

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "id": "req-abc123",
    "status": "in-progress",
    "assignedTo": "employee-123",
    "assignedToName": "Mohammed Ali",
    "assignmentTargetType": "building_employee",
    "assignedAt": "2025-12-13T14:00:00Z"
  },
  "message": "Request assigned successfully"
}
```

**Creates a Job automatically**:

```json
{
  "jobId": "job-xyz",
  "requestId": "req-abc123",
  "assignedTo": "employee-123",
  "assignedToName": "Mohammed Ali",
  "assignmentTargetType": "building_employee",
  "status": "assigned",
  "createdAt": "2025-12-13T14:00:00Z"
}
```

---

### 3.3 Assign Request to Service Provider

**Endpoint**: `POST /requests/{requestId}/assign`

**Request Body**:

```json
{
  "assignedTo": "sp-provider-456",
  "assignedToName": "Cool Air LLC",
  "assignmentTargetType": "service_provider"
}
```

**Success Response**: Same as building employee assignment, but triggers the complex SP flow (estimates, messaging, etc.)

---

## 4. Building Employee APIs (SIMPLIFIED)

### 4.1 Get My Assigned Jobs

**Endpoint**: `GET /employee/jobs`

**Query Parameters**:

```
?status=assigned                // Filter by job status
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "job-xyz",
      "requestId": "req-abc123",
      "title": "Leaking faucet in kitchen",
      "description": "The kitchen faucet has been leaking...",
      "type": "plumbing",
      "priority": "high",
      "status": "assigned",
      "buildingId": "building-uuid-123",
      "buildingName": "Binghatti Azure",
      "apartment": "1205",
      "tower": "Tower A",
      "tenantName": "Ahmed Hassan",
      "tenantPhone": "+971501234567",
      "preferredTime": "Morning (9 AM - 12 PM)",
      "assignedAt": "2025-12-13T14:00:00Z",
      "createdAt": "2025-12-13T14:00:00Z"
    }
  ],
  "message": "Jobs retrieved successfully"
}
```

**Job Status Values**:

- `assigned` - Just assigned, not started
- `in-progress` - Employee is working on it
- `completed` - Employee marked as complete, awaiting tenant approval
- `cancelled` - Job cancelled

---

### 4.2 Acknowledge Job (Simple Status Update)

**Endpoint**: `POST /employee/jobs/{jobId}/acknowledge`

**Request Body**: Empty `{}`

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "jobId": "job-xyz",
    "status": "assigned",
    "acknowledgedAt": "2025-12-13T15:00:00Z"
  },
  "message": "Job acknowledged successfully"
}
```

**Note**: This is optional - just a simple "I saw it" update. Not required for MVP.

---

### 4.3 Start Job

**Endpoint**: `POST /employee/jobs/{jobId}/start`

**Request Body**: Empty `{}`

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "jobId": "job-xyz",
    "status": "in-progress",
    "startedAt": "2025-12-13T15:30:00Z"
  },
  "message": "Job started successfully"
}
```

---

### 4.4 Complete Job (Building Employee)

**Endpoint**: `POST /employee/jobs/{jobId}/complete`

**Request Body** (all optional):

```json
{
  "notes": "Replaced the faucet washer. Issue resolved."
}
```

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "jobId": "job-xyz",
    "requestId": "req-abc123",
    "status": "completed",
    "completionStatus": "awaiting_tenant_approval",
    "completedAt": "2025-12-13T17:00:00Z",
    "completionNotes": "Replaced the faucet washer. Issue resolved."
  },
  "message": "Job marked as complete. Awaiting tenant approval."
}
```

**What happens next**:

- Request status stays `in-progress`
- Tenant sees "Review Completion" button
- Tenant approves → Request status → `completed`
- Tenant rejects → Job status → back to `in-progress`

---

## 5. Service Provider APIs (COMPLEX - Existing Flow)

**These endpoints remain unchanged from the current implementation**:

### 5.1 Submit Estimate

`POST /employee/jobs/{jobId}/estimate`

**Request Body**:

```json
{
  "items": [
    {
      "label": "AC Unit - 2 Ton Split",
      "amount": 1200
    },
    {
      "label": "Installation labor",
      "amount": 300
    }
  ],
  "notes": "Premium Daikin AC unit with 5-year warranty"
}
```

### 5.2 Upload Progress Photos

`POST /employee/jobs/{jobId}/photos`

### 5.3 Add Messages

`POST /employee/messages`

### 5.4 Complete Job with Photos

`POST /employee/jobs/{jobId}/complete`
(With photo attachments and detailed notes)

---

## Key Differences: Building Employee vs Service Provider

| Feature       | Building Employee                      | Service Provider                                       |
| ------------- | -------------------------------------- | ------------------------------------------------------ |
| **Estimates** | ❌ No estimates                        | ✅ Required                                            |
| **Photos**    | ❌ No photo uploads                    | ✅ Required                                            |
| **Messages**  | ❌ No messaging                        | ✅ Full messaging                                      |
| **Workflow**  | Simple: Acknowledge → Start → Complete | Complex: Estimate → Approve → Work → Photos → Complete |
| **Approval**  | Tenant approval required               | Tenant approval required                               |

---

## Data Model Summary

### Request Object (Complete Structure)

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "type": "maintenance|repair|cleaning|electrical|plumbing|hvac|other",
  "status": "pending|in-progress|completed|cancelled",
  "priority": "low|medium|high|urgent",
  "tenantId": "string",
  "tenantName": "string",
  "apartment": "string",
  "tower": "string",
  "buildingId": "string",
  "buildingName": "string",
  "preferredTime": "string",
  "contactPhone": "string",
  "additionalNotes": "string",
  "attachments": ["string"],
  "assignedTo": "string|null",
  "assignedToName": "string|null",
  "assignmentTargetType": "building_employee|service_provider|null",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}
```

### Job Object (Building Employee - Simplified)

```json
{
  "id": "string",
  "requestId": "string",
  "title": "string",
  "description": "string",
  "type": "string",
  "status": "assigned|in-progress|completed|cancelled",
  "priority": "string",
  "buildingId": "string",
  "buildingName": "string",
  "apartment": "string",
  "tower": "string",
  "tenantId": "string",
  "tenantName": "string",
  "tenantPhone": "string",
  "preferredTime": "string",
  "assignedTo": "string",
  "assignedToName": "string",
  "assignmentTargetType": "building_employee",
  "completionStatus": "null|awaiting_tenant_approval|tenant_approved|tenant_rejected",
  "completionNotes": "string",
  "completedAt": "ISO 8601 datetime|null",
  "completionApprovedAt": "ISO 8601 datetime|null",
  "assignedAt": "ISO 8601 datetime",
  "startedAt": "ISO 8601 datetime|null",
  "createdAt": "ISO 8601 datetime",
  "updatedAt": "ISO 8601 datetime"
}
```

### Job Object (Service Provider - Complex)

**Same as above PLUS**:

```json
{
  "estimate": {
    "id": "string",
    "status": "submitted|sp_approved|tenant_approved|tenant_declined",
    "subtotal": 1500,
    "items": [
      {
        "id": "string",
        "label": "string",
        "amount": 350
      }
    ],
    "notes": "string",
    "approvedAt": "ISO 8601 datetime|null",
    "declinedAt": "ISO 8601 datetime|null",
    "declinedReason": "string|null"
  },
  "photos": [
    {
      "id": "string",
      "url": "string",
      "uploadedAt": "ISO 8601 datetime"
    }
  ],
  "messages": [
    {
      "id": "string",
      "senderId": "string",
      "senderName": "string",
      "body": "string",
      "createdAt": "ISO 8601 datetime"
    }
  ]
}
```

---

## Backend Implementation Notes

1. **Auto-fill from JWT**: Extract `tenantId`, `tenantName`, `buildingId` from the authenticated user's token. Don't trust client-sent values for these fields.

2. **Assignment Creates Job**: When management assigns a request via `POST /requests/{id}/assign`, automatically create a Job record.

3. **Status Transitions**:

   - Request created → `status: "pending"`
   - Request assigned → `status: "in-progress"`
   - Employee completes → Request stays `in-progress`, Job `completionStatus: "awaiting_tenant_approval"`
   - Tenant approves → Request `status: "completed"`
   - Tenant rejects → Job `status: "in-progress"`, `completionStatus: null`

4. **Building Employee Flow** (NO estimates, messages, photos):

   - Acknowledge (optional)
   - Start job
   - Complete job
   - Tenant approval required

5. **Service Provider Flow** (WITH estimates, messages, photos):

   - Submit estimate
   - Tenant approves estimate
   - Upload progress photos
   - Complete with photos
   - Tenant approval required

6. **Tenant Approval Timeout**: If tenant doesn't respond to completion request within 48 hours, allow service provider to override. Building employees should not have this override - they need actual tenant approval.

---

## Example: Complete Building Employee Flow

### Step 1: Tenant creates request

```bash
POST /requests
{
  "title": "Fix broken door lock",
  "description": "Apartment door lock is jammed",
  "type": "maintenance",
  "priority": "high"
}

Response: {status: "pending"}
```

### Step 2: Management assigns to building employee

```bash
POST /requests/req-123/assign
{
  "assignedTo": "emp-456",
  "assignedToName": "Mohammed Ali",
  "assignmentTargetType": "building_employee"
}

Response: {status: "in-progress", jobId: "job-789"}
```

### Step 3: Employee starts job

```bash
POST /employee/jobs/job-789/start

Response: {status: "in-progress", startedAt: "..."}
```

### Step 4: Employee completes job

```bash
POST /employee/jobs/job-789/complete
{
  "notes": "Replaced door lock mechanism"
}

Response: {completionStatus: "awaiting_tenant_approval"}
```

### Step 5: Tenant approves

```bash
POST /jobs/job-789/completion/approve
{
  "rating": 5,
  "feedback": "Great work!"
}

Response: {
  requestStatus: "completed",
  completionStatus: "tenant_approved"
}
```

---
