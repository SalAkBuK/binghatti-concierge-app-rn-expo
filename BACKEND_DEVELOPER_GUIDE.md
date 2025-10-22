# Tower Desk - Complete Backend API Guide

**Version:** 1.0
**Base URL:** `https://1bnx.online/api`
**Authentication:** JWT Bearer Token

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Admin Role](#admin-role---full-system-access)
4. [Management Role](#management-role---building-managers)
5. [Tenant Role](#tenant-role---residents)
6. [Common APIs](#common-apis)
7. [Data Models Reference](#data-models-reference)

---

## Quick Start

### Implementation Priority

1.  Auth + Users + Buildings
2.  Service Requests + Jobs
3.  Amenities + Bookings + Visitors
4.  Ratings + Notifications + Polish

### Base Response Format

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Operation successful"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": "Detailed error for developers",
  "message": "User-friendly message",
  "code": "ERROR_CODE",
  "status": 400
}
```

---

## Authentication

### POST `/auth/login`

Login user and return JWT token.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "tenant",
    "profile": {
      "apartment": "1205",
      "buildingId": "bldg_456"
    }
  }
}
```

### POST `/auth/register`

Register new tenant.

### POST `/auth/refresh`

Refresh JWT token.

### POST `/auth/logout`

Invalidate token.

---

## Admin Role - Full System Access

### User Management

#### GET `/admin/users`

List all users with filters.

**Query Params:**

- `role` - Filter by role
- `buildingId` - Filter by building
- `status` - active|inactive
- `page`, `limit` - Pagination

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "email": "tenant@example.com",
      "name": "John Doe",
      "role": "tenant",
      "status": "active",
      "profile": {
        "apartment": "1205",
        "buildingId": "bldg_456"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1234
  }
}
```

#### POST `/admin/users`

Create new user.

**Request:**

```json
{
  "email": "newuser@example.com",
  "name": "Jane Smith",
  "role": "tenant",
  "phone": "+971501234567",
  "profile": {
    "apartment": "1206",
    "buildingId": "bldg_456"
  }
}
```

**Response:** Returns created user with temp password if password not provided.

#### PUT `/admin/users/:id`

Update user.

#### DELETE `/admin/users/:id`

Delete user (soft delete recommended).

### Building Management

#### GET `/admin/buildings`

List all buildings.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "bldg_123",
      "name": "Seaside Tower",
      "address": "123 Marina Street",
      "city": "Dubai",
      "managerId": "user_mgr_456",
      "totalUnits": 200,
      "occupiedUnits": 175,
      "status": "active"
    }
  ]
}
```

#### POST `/admin/buildings`

Create building.

**Request:**

```json
{
  "name": "New Tower",
  "address": "456 Business Bay",
  "city": "Dubai",
  "country": "UAE",
  "managerId": "user_mgr_789",
  "totalUnits": 150
}
```

#### PUT `/admin/buildings/:id`

Update building.

#### DELETE `/admin/buildings/:id`

Delete building.

### Unit Management

#### GET `/admin/buildings/:buildingId/units`

List units in building.

**Query Params:**

- `status` - occupied|vacant|maintenance
- `floor` - Filter by floor

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "unit_123",
      "buildingId": "bldg_456",
      "unitNumber": "1205",
      "floor": 12,
      "typeId": "type_2br",
      "bedrooms": 2,
      "bathrooms": 2,
      "areaSqFt": 1200,
      "status": "occupied",
      "tenantId": "user_789",
      "rentAmount": 85000,
      "furnishing": "furnished",
      "managedBy": "building",
      "depositAmount": 85000,
      "maintenanceCharges": 500
    }
  ]
}
```

#### POST `/admin/buildings/:buildingId/units`

Create unit.

**Request:**

```json
{
  "unitNumber": "1206",
  "floor": 12,
  "typeId": "type_2br",
  "areaSqFt": 1200,
  "status": "vacant",
  "rentAmount": 85000,
  "furnishing": "furnished",
  "managedBy": "building",
  "depositAmount": 85000,
  "maintenanceCharges": 500,
  "amenities": ["balcony", "parking"]
}
```

**Important Fields:**

- `furnishing`: "furnished" | "semi_furnished" | "unfurnished" (required)
- `managedBy`: "building" | "owner" (required)
- If `managedBy = "building"`: `depositAmount` & `maintenanceCharges` required
- If `managedBy = "owner"`: `billsInclusive` & `maintenanceInclusive` optional booleans

#### PUT `/admin/units/:id`

Update unit.

#### DELETE `/admin/units/:id`

Delete unit.

#### GET `/admin/unit-types`

Get unit type templates.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "type_studio",
      "name": "Studio",
      "bedrooms": 0,
      "bathrooms": 1,
      "areaSqFt": 450,
      "baseRent": 45000,
      "amenities": ["balcony"]
    }
  ]
}
```

### Job Management

#### GET `/admin/jobs`

List all jobs.

**Query Params:**

- `status` - pending|assigned|in-progress|completed|cancelled
- `buildingId`
- `assignedTo` - Service provider ID
- `priority`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "job_123",
      "requestId": "req_456",
      "title": "Fix AC in Unit 1205",
      "type": "hvac",
      "status": "in-progress",
      "priority": "high",
      "buildingId": "bldg_789",
      "unitNumber": "1205",
      "assignedTo": "sp_111",
      "assignedToName": "Cool Air HVAC",
      "estimatedCost": 500,
      "scheduledDate": "2024-01-21T10:00:00Z"
    }
  ]
}
```

#### POST `/admin/jobs`

Create job.

**Request:**

```json
{
  "title": "AC Maintenance",
  "description": "Quarterly AC system check",
  "type": "hvac",
  "priority": "medium",
  "buildingId": "bldg_789",
  "unitNumber": "1205",
  "assignedTo": "sp_333",
  "estimatedCost": 800,
  "scheduledDate": "2024-01-25T09:00:00Z"
}
```

#### PUT `/admin/jobs/:id`

Update job.

### Analytics

#### GET `/admin/analytics`

Get system-wide analytics.

**Response:**

```json
{
  "success": true,
  "data": {
    "openJobsCount": 15,
    "tenantsCount": 1234,
    "completedJobsThisMonth": 89,
    "occupancyRate": 87.3,
    "averageRating": 4.7,
    "buildingsCount": 12
  }
}
```

---

## Management Role - Building Managers

### Dashboard

#### GET `/management/analytics`

Get analytics for managed buildings.

**Query Params:**

- `buildingId` - Specific building (optional)

**Response:**

```json
{
  "success": true,
  "data": {
    "openJobsCount": 8,
    "tenantsCount": 175,
    "pendingRequestsCount": 12,
    "occupancyRate": 87.5,
    "buildingsManaged": [
      {
        "id": "bldg_123",
        "name": "Seaside Tower",
        "occupiedUnits": 175,
        "totalUnits": 200
      }
    ]
  }
}
```

#### GET `/management/buildings`

Get buildings managed by current user.

### Request Management (Most Important)

#### GET `/management/requests`

Get requests for managed buildings.

**Query Params:**

- `buildingId`
- `status` - pending|in-progress|completed|cancelled
- `priority`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "req_123",
      "title": "AC not cooling",
      "type": "hvac",
      "status": "pending",
      "priority": "high",
      "tenantId": "user_456",
      "tenantName": "John Doe",
      "buildingId": "bldg_789",
      "apartment": "1205",
      "attachments": ["https://cdn.example.com/photo.jpg"],
      "createdAt": "2024-01-20T10:30:00Z",
      "slaDueAt": "2024-01-21T10:30:00Z"
    }
  ]
}
```

#### GET `/management/requests/:id`

Get request details with full timeline.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "req_123",
    "title": "AC not cooling",
    "description": "Living room AC stopped working",
    "type": "hvac",
    "status": "in-progress",
    "priority": "high",
    "tenantId": "user_456",
    "assignedTo": "sp_789",
    "comments": [],
    "messages": [
      {
        "id": "msg_1",
        "senderId": "user_mgr_111",
        "senderName": "Manager",
        "channel": "internal",
        "body": "Technician scheduled for tomorrow",
        "createdAt": "2024-01-20T11:00:00Z"
      }
    ],
    "timeline": [
      {
        "id": "event_1",
        "eventType": "status_change",
        "title": "Request created",
        "createdAt": "2024-01-20T10:30:00Z"
      },
      {
        "id": "event_2",
        "eventType": "assignment",
        "title": "Assigned to Cool Air HVAC",
        "createdAt": "2024-01-20T11:00:00Z"
      }
    ]
  }
}
```

#### PUT `/management/requests/:id`

Update request (assign, change status, priority).

**Request:**

```json
{
  "status": "in-progress",
  "assignedTo": "sp_789",
  "priority": "urgent"
}
```

#### POST `/management/requests/:id/messages`

Add message to request.

**Request:**

```json
{
  "senderId": "user_mgr_111",
  "senderName": "Alex Manager",
  "senderRole": "management",
  "channel": "internal",
  "body": "Technician will arrive tomorrow at 10 AM"
}
```

#### POST `/management/requests/:id/notes`

Add internal note.

**Request:**

```json
{
  "authorId": "user_mgr_111",
  "authorName": "Alex Manager",
  "body": "Tenant reported this issue multiple times",
  "visibility": "management"
}
```

### Job Management

#### GET `/management/jobs`

Get jobs for managed buildings.

#### POST `/management/jobs`

Create job.

#### PUT `/management/jobs/:id`

Update job.

### Tenant Management

#### GET `/management/buildings/:buildingId/tenants`

Get tenants in building.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+971501234567",
      "unitNumber": "1205",
      "leaseStatus": "active",
      "leaseEndDate": "2024-12-31"
    }
  ]
}
```

### Notifications

#### POST `/management/notifications/broadcast`

Broadcast to all tenants in building.

**Request:**

```json
{
  "buildingId": "bldg_123",
  "title": "Scheduled Maintenance",
  "message": "Water supply interrupted Jan 25, 9 AM - 12 PM",
  "type": "warning"
}
```

### Visitor Management

#### GET `/management/buildings/:buildingId/visitors`

Get visitor logs.

**Query Params:**

- `status` - expected|arrived|departed
- `from`, `to` - Date range

#### PUT `/management/visitors/:id/checkin`

Check in visitor (security staff).

**Request:**

```json
{
  "checkedInBy": "emp_security_001",
  "actualArrivalTime": "2024-01-21T14:05:00Z"
}
```

#### PUT `/management/visitors/:id/checkout`

Check out visitor.

### Amenity Management

#### GET `/management/buildings/:buildingId/amenities`

Get amenities.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "amenity_pool_123",
      "amenityType": "pool",
      "name": "Rooftop Pool",
      "capacity": 30,
      "operatingHours": {
        "monday": { "open": "06:00", "close": "22:00" }
      },
      "status": "active"
    }
  ]
}
```

#### PUT `/management/amenities/:id`

Update amenity.

#### GET `/management/amenities/:id/bookings`

Get bookings.

---

## Tenant Role - Residents

### Dashboard

#### GET `/tenant/dashboard`

Get tenant dashboard.

**Response:**

```json
{
  "success": true,
  "data": {
    "activeRequests": 2,
    "upcomingBookings": 1,
    "expectedVisitors": 3,
    "unreadNotifications": 5,
    "leaseInfo": {
      "startDate": "2023-01-01",
      "endDate": "2024-12-31",
      "rentAmount": 85000,
      "status": "active"
    }
  }
}
```

### Service Requests

#### GET `/tenant/requests`

Get my requests.

**Query Params:**

- `status`
- `type`

#### GET `/tenant/requests/:id`

Get request details.

#### POST `/tenant/requests`

Create new request.

**Request:**

```json
{
  "title": "Bathroom faucet leaking",
  "description": "Sink faucet dripping for 2 days",
  "type": "plumbing",
  "priority": "medium",
  "apartment": "1205",
  "tower": "Tower A",
  "buildingId": "bldg_789",
  "preferredTime": "2024-01-22T10:00:00Z",
  "contactPhone": "+971501234567",
  "attachments": ["https://cdn.example.com/upload_123.jpg"]
}
```

#### PUT `/tenant/requests/:id/cancel`

Cancel request.

**Request:**

```json
{
  "reason": "Issue resolved"
}
```

#### POST `/tenant/requests/:id/messages`

Add message to request.

### Amenity Bookings

#### GET `/tenant/amenities`

Get available amenities.

#### GET `/tenant/amenities/:id/availability`

Check availability for date.

**Query Params:**

- `date` - YYYY-MM-DD

**Response:**

```json
{
  "success": true,
  "data": {
    "amenityId": "amenity_gym_123",
    "date": "2024-01-22",
    "availableSlots": [
      {
        "startTime": "06:00",
        "endTime": "07:00",
        "available": true
      },
      {
        "startTime": "07:00",
        "endTime": "08:00",
        "available": false
      }
    ]
  }
}
```

#### GET `/tenant/bookings`

Get my bookings.

#### POST `/tenant/bookings`

Create booking.

**Request:**

```json
{
  "amenityId": "amenity_pool_123",
  "slotDate": "2024-01-23",
  "slotTimeStart": "15:00",
  "slotTimeEnd": "17:00",
  "numberOfGuests": 6,
  "bookingNotes": "Family gathering"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "booking_456",
    "amenityName": "Rooftop Pool",
    "slotDate": "2024-01-23",
    "slotTimeStart": "15:00",
    "status": "confirmed",
    "bookingCode": "BOOK789012",
    "qrCodeUrl": "https://cdn.example.com/qr/BOOK789012.png"
  }
}
```

#### PUT `/tenant/bookings/:id/cancel`

Cancel booking.

### Visitor Management

#### GET `/tenant/visitors`

Get my registered visitors.

#### POST `/tenant/visitors`

Register visitor.

**Request:**

```json
{
  "visitorName": "Jane Smith",
  "visitorPhone": "+971509876543",
  "visitorIdType": "passport",
  "visitorIdNumber": "A12345678",
  "idPhotoUrl": "https://cdn.example.com/id_photo.jpg",
  "visitPurpose": "Personal visit",
  "expectedArrivalTime": "2024-01-22T15:00:00Z",
  "expectedDepartureTime": "2024-01-22T19:00:00Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "visitor_456",
    "visitorName": "Jane Smith",
    "visitorCode": "VIS789012",
    "qrCodeUrl": "https://cdn.example.com/qr/VIS789012.png",
    "status": "expected"
  }
}
```

#### PUT `/tenant/visitors/:id/cancel`

Cancel visitor.

### Ratings

#### GET `/tenant/ratings`

Get my ratings.

#### POST `/tenant/ratings`

Submit rating.

**Request:**

```json
{
  "requestId": "req_456",
  "serviceProviderId": "sp_789",
  "rating": 5,
  "reviewText": "Excellent service, very professional",
  "attachments": []
}
```

**Validation:**

- Request must be completed
- Can only rate once per request
- Rating 1-5

### Profile

#### GET `/tenant/profile`

Get my profile.

#### PUT `/tenant/profile`

Update profile.

---

## Common APIs

### Notifications

#### GET `/notifications`

Get notifications for current user.

**Query Params:**

- `read` - true|false
- `type` - info|success|warning|error
- `limit` - Default 50

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "title": "Request Update",
      "message": "Your request #REQ-123 has been assigned",
      "type": "info",
      "read": false,
      "metadata": {
        "relatedId": "req_123",
        "relatedType": "request"
      },
      "createdAt": "2024-01-20T11:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

#### PUT `/notifications/:id/read`

Mark as read.

#### PUT `/notifications/read-all`

Mark all as read.

#### DELETE `/notifications/:id`

Delete notification.

### File Upload

#### POST `/uploads`

Upload files.

**Content-Type:** multipart/form-data

**Form Data:**

- `files[]` - Array of files (max 10MB each)

**Response:**

```json
{
  "success": true,
  "data": {
    "urls": [
      "https://cdn.example.com/uploads/20240120_photo1.jpg",
      "https://cdn.example.com/uploads/20240120_photo2.jpg"
    ]
  }
}
```

---

## Data Models Reference

### User

```typescript
{
  id: string;
  email: string;
  name: string;
  role: "tenant" | "admin" | "management" | "service_provider" | "employee";
  phone?: string;
  profile?: {
    apartment?: string;
    buildingId?: string;
    managedBuildingIds?: string[];
  };
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

### Building

```typescript
{
  id: string;
  name: string;
  address: string;
  city: string;
  managerId?: string;
  totalUnits: number;
  occupiedUnits: number;
  status: "active" | "maintenance" | "inactive";
  createdAt: string;
  updatedAt: string;
}
```

### BuildingUnit

```typescript
{
  id: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  typeId: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqFt?: number;
  status: "occupied" | "vacant" | "maintenance";
  tenantId?: string;
  amenities: string[];
  rentAmount?: number;
  furnishing?: "furnished" | "semi_furnished" | "unfurnished";
  managedBy?: "building" | "owner";
  billsInclusive?: boolean;           // Only if managedBy = "owner"
  maintenanceInclusive?: boolean;     // Only if managedBy = "owner"
  depositAmount?: number;             // Only if managedBy = "building"
  maintenanceCharges?: number;        // Only if managedBy = "building"
  createdAt: string;
  updatedAt: string;
}
```

### Request

```typescript
{
  id: string;
  title: string;
  description: string;
  type: "maintenance" | "repair" | "cleaning" | "electrical" | "plumbing" | "hvac" | "other";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  tenantId: string;
  assignedTo?: string;
  buildingId?: string;
  apartment?: string;
  attachments: string[];
  slaDueAt?: string;
  messages: RequestMessage[];
  notes: RequestNote[];
  timeline: RequestTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}
```

### Job

```typescript
{
  id: string;
  requestId?: string;
  title: string;
  description: string;
  type: string;
  status: "pending" | "assigned" | "in-progress" | "completed" | "cancelled";
  priority: string;
  buildingId: string;
  unitNumber?: string;
  assignedTo?: string;
  createdBy: string;
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}
```

### AmenityBooking

```typescript
{
  id: string;
  amenityId: string;
  amenityName: string;
  tenantId: string;
  buildingId: string;
  slotDate: string;        // YYYY-MM-DD
  slotTimeStart: string;   // HH:MM
  slotTimeEnd: string;     // HH:MM
  status: "pending" | "confirmed" | "cancelled" | "completed";
  numberOfGuests: number;
  bookingCode: string;
  bookingNotes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Visitor

```typescript
{
  id: string;
  tenantId: string;
  buildingId: string;
  unitNumber: string;
  visitorName: string;
  visitorPhone: string;
  visitorIdType: "passport" | "national_id" | "driving_license" | "other";
  visitorIdNumber: string;
  visitPurpose: string;
  expectedArrivalTime: string;
  expectedDepartureTime: string;
  actualArrivalTime?: string;
  actualDepartureTime?: string;
  status: "expected" | "arrived" | "departed" | "cancelled";
  visitorCode: string;
  qrCodeUrl: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Key Implementation Notes

1. **Authentication:**

   - All endpoints except `/auth/*` require Bearer token
   - Extract user ID from JWT for data filtering
   - Implement role-based access control

2. **Data Filtering:**

   - Tenants see only their own data
   - Management sees data for their managed buildings
   - Admin sees everything

3. **Real-time Updates:**

   - Implement WebSockets for request status changes
   - Push notifications for assignments, completions
   - In-app notifications stored in database

4. **File Storage:**

   - Use CDN (S3, Cloudinary, etc.)
   - Return public URLs
   - Implement image optimization

5. **QR Codes:**

   - Generate unique codes for bookings and visitors
   - Store QR code images in CDN
   - Codes should be scannable and verifiable

6. **SLA Tracking:**

   - Calculate due dates based on priority:
     - Urgent: 4 hours
     - High: 24 hours
     - Medium: 48 hours
     - Low: 72 hours
   - Send escalation notifications

7. **Soft Deletes:**
   - Don't hard delete users, buildings, units
   - Use `deleted_at` timestamp
   - Keep audit trail

---

**End of Backend Developer Guide**
