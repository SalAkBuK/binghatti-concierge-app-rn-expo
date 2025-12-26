# Admin Portal API Documentation

**Project:** Tower Desk - Binghatti Concierge App
**Last Updated:** December 12, 2025
**Base URL:** `https://1bnx.online/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Dashboard & Analytics](#dashboard--analytics)
4. [User Management](#user-management)
5. [Building Management](#building-management)
6. [Service Provider Management](#service-provider-management)
7. [Unit Type Management](#unit-type-management)
8. [Permissions Management](#permissions-management)
9. [Activity Logs](#activity-logs)
10. [Data Models](#data-models)
11. [Error Handling](#error-handling)

---

## Overview

This document specifies all API endpoints required for the **Admin Portal** of the Tower Desk application. The admin portal provides comprehensive management capabilities for:

- User accounts (all roles)
- Buildings and properties
- Service providers
- Unit types
- Role-based permissions
- System-wide analytics

### Priority Levels

- =4 **Critical**: Must have for basic functionality
- =á **High**: Important for full feature set
- =â **Medium**: Nice to have, can be phased
- =5 **Low**: Future enhancement

---

## Authentication

All admin API requests require authentication via JWT token in the `Authorization` header.

```
Authorization: Bearer <jwt_token>
```

### Role-Based Access

- **super_admin**: Full system access
- **admin**: Most administrative functions (cannot create other admins)
- **management**: Building-specific management (limited admin access)

---

## Dashboard & Analytics

### 1. Get Admin Dashboard Analytics
**=4 Priority: CRITICAL**

Provides comprehensive metrics for the admin dashboard.

```http
GET /api/admin/analytics/dashboard
```

#### Headers
```
Authorization: Bearer <token>
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| buildingId | string | No | Filter by specific building (for management role) |
| startDate | string (ISO) | No | Start date for metrics |
| endDate | string (ISO) | No | End date for metrics |

#### Response 200 (Success)

```json
{
  "success": true,
  "data": {
    "metrics": {
      "openJobsCount": 24,
      "pendingRequestsCount": 12,
      "completionRate": 76,
      "revenueThisMonth": 145000,
      "averageCompletionTime": 18,
      "occupancyRate": 92.4,
      "bookingsToday": 8,
      "activeMaintenanceNotices": 3,
      "averageRating": 4.7,
      "visitorsToday": 5,
      "jobsInProgress": 15,
      "pendingRequests": 8,
      "inProgressRequests": 4
    },
    "trends": {
      "completion": [65, 68, 70, 72, 74, 76, 76],
      "bookings": [6, 7, 5, 9, 8, 10, 8],
      "occupancy": [88.4, 89.3, 90.1, 90.9, 91.5, 92.0, 92.4]
    },
    "topServiceProviders": [
      {
        "id": "sp_001",
        "name": "Elite Maintenance LLC",
        "jobsCompleted": 45,
        "averageRating": 4.8,
        "specialty": "HVAC"
      }
    ],
    "recentActivity": [
      {
        "id": "act_001",
        "type": "job_completed",
        "description": "HVAC maintenance completed in Unit 402",
        "timestamp": "2025-12-12T10:30:00Z"
      }
    ]
  }
}
```

#### Status Codes
- `200`: Success
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)

---

### 2. Get Management Analytics (Building-Specific)
**=4 Priority: CRITICAL**

Provides building-specific analytics for management users.

```http
GET /api/admin/analytics/building/:buildingId
```

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| buildingId | string | Building ID |

#### Response 200 (Success)

```json
{
  "success": true,
  "data": {
    "building": {
      "id": "bld_001",
      "name": "Binghatti Heights",
      "address": "Business Bay, Dubai"
    },
    "metrics": {
      "pendingRequests": 8,
      "inProgressRequests": 4,
      "jobsInProgress": 15,
      "bookingsToday": 8,
      "visitorsToday": 5,
      "completionRate": 85,
      "occupancyRate": 94.2
    },
    "lists": {
      "requestsToday": [
        {
          "id": "req_001",
          "title": "AC not working",
          "status": "pending",
          "priority": "high",
          "createdAt": "2025-12-12T09:00:00Z"
        }
      ],
      "upcomingBookings": [
        {
          "id": "bkg_001",
          "amenityName": "Swimming Pool",
          "status": "confirmed",
          "slotDate": "2025-12-13",
          "slotTimeStart": "14:00",
          "slotTimeEnd": "16:00"
        }
      ],
      "visitorsToday": [
        {
          "id": "vis_001",
          "visitorName": "John Doe",
          "visitPurpose": "Delivery",
          "expectedArrivalTime": "2025-12-12T15:00:00Z",
          "status": "pending"
        }
      ],
      "activeJobs": [
        {
          "id": "job_001",
          "title": "Fix water leak",
          "status": "in-progress",
          "unitNumber": "402",
          "assignedToName": "Elite Plumbing LLC"
        }
      ]
    }
  }
}
```

---

## User Management

### 3. Get All Users (Scoped by Role)
**=4 Priority: CRITICAL**

Retrieve all users with optional filtering and pagination.

```http
GET /api/admin/users
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role | string | No | Filter by role (tenant, management, admin, etc.) |
| buildingId | string | No | Filter by building |
| search | string | No | Search by name, email |
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |

#### Response 200 (Success)

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "usr_001",
        "name": "Ahmed Al-Rashid",
        "email": "ahmed@example.com",
        "phone": "+971501234567",
        "role": "tenant",
        "profile": {
          "buildingId": "bld_001",
          "tower": "A",
          "floor": "12",
          "apartment": "1205",
          "emergencyContact": "Fatima Al-Rashid",
          "emergencyPhone": "+971507654321"
        },
        "createdAt": "2025-01-15T10:00:00Z",
        "updatedAt": "2025-12-01T14:30:00Z"
      }
    ],
    "pagination": {
      "total": 250,
      "page": 1,
      "limit": 20,
      "pages": 13
    }
  }
}
```

---

### 4. Create User
**=4 Priority: CRITICAL**

Create a new user account.

```http
POST /api/admin/users
```

#### Request Body

```json
{
  "name": "Mohammed Hassan",
  "email": "mohammed@example.com",
  "phone": "+971501111111",
  "role": "tenant",
  "profile": {
    "buildingId": "bld_001",
    "tower": "B",
    "floor": "8",
    "apartment": "805",
    "emergencyContact": "Sara Hassan",
    "emergencyPhone": "+971502222222"
  }
}
```

#### Field Specifications

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| name | string | Yes | min: 2, max: 100 | Full name |
| email | string | Yes | valid email, unique | Email address |
| phone | string | No | UAE format | Phone number |
| role | string | Yes | enum: tenant, management, admin, service_provider, employee, building_employee | User role |
| profile.buildingId | string | Conditional | Must exist | Required for tenant/employee |
| profile.tower | string | No | max: 10 | Tower identifier |
| profile.floor | string | Conditional | max: 10 | Required for tenant |
| profile.apartment | string | Conditional | max: 20 | Required for tenant |
| profile.emergencyContact | string | No | max: 100 | Emergency contact name |
| profile.emergencyPhone | string | No | UAE format | Emergency phone |

#### Validation Rules

1. **Tenants** must have: `buildingId`, `floor`, `apartment`
2. **Employees** with `buildingId` must have: `floor`
3. Only **super_admin** can create `admin` users
4. Cannot create `super_admin` users
5. Email must be unique across all users

#### Response 201 (Created)

```json
{
  "success": true,
  "data": {
    "id": "usr_002",
    "name": "Mohammed Hassan",
    "email": "mohammed@example.com",
    "phone": "+971501111111",
    "role": "tenant",
    "profile": {
      "buildingId": "bld_001",
      "tower": "B",
      "floor": "8",
      "apartment": "805",
      "emergencyContact": "Sara Hassan",
      "emergencyPhone": "+971502222222"
    },
    "createdAt": "2025-12-12T12:00:00Z",
    "updatedAt": "2025-12-12T12:00:00Z"
  },
  "message": "User created successfully"
}
```

#### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email already exists",
    "field": "email"
  }
}
```

---

### 5. Update User
**=4 Priority: CRITICAL**

Update an existing user's information.

```http
PUT /api/admin/users/:userId
```

#### Request Body

```json
{
  "name": "Mohammed Hassan Updated",
  "phone": "+971501111222",
  "profile": {
    "buildingId": "bld_001",
    "tower": "B",
    "floor": "9",
    "apartment": "905"
  }
}
```

#### Notes
- Cannot update `email` (immutable)
- Cannot change `role` (use separate endpoint)
- All fields are optional (partial update)

#### Response 200 (Success)

```json
{
  "success": true,
  "data": {
    "id": "usr_002",
    "name": "Mohammed Hassan Updated",
    "email": "mohammed@example.com",
    "phone": "+971501111222",
    "role": "tenant",
    "profile": {
      "buildingId": "bld_001",
      "tower": "B",
      "floor": "9",
      "apartment": "905"
    },
    "updatedAt": "2025-12-12T14:00:00Z"
  }
}
```

---

### 6. Delete User
**=á Priority: HIGH**

Delete a user account.

```http
DELETE /api/admin/users/:userId
```

#### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | string | User ID to delete |

#### Response 200 (Success)

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

#### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "DELETE_FAILED",
    "message": "Cannot delete user with active requests"
  }
}
```

---

## Building Management

### 7. Get All Buildings
**=4 Priority: CRITICAL**

Retrieve all buildings with optional filtering.

```http
GET /api/admin/buildings
```

#### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| emirate | string | No | Filter by emirate |
| status | string | No | Filter by status (active, inactive, under_construction) |
| search | string | No | Search by name, address |

#### Response 200 (Success)

```json
{
  "success": true,
  "data": {
    "buildings": [
      {
        "id": "bld_001",
        "name": "Binghatti Heights",
        "buildingType": "residential",
        "developer": "Binghatti Developers",
        "yearBuilt": 2022,
        "totalFloors": 35,
        "status": "active",
        "emirate": "Dubai",
        "community": "Business Bay",
        "street": "Marasi Drive",
        "plotNumber": "123-456",
        "buildingNumber": "42",
        "makaniNumber": "1234567890",
        "address": "42 Marasi Drive, Business Bay, Dubai",
        "city": "Dubai",
        "country": "United Arab Emirates",
        "utilityPremisesNumber": "UP-123456",
        "totalUnits": 420,
        "unitBreakdown": {
          "studios": 80,
          "oneBedroom": 150,
          "twoBedroom": 120,
          "threeBedroom": 60,
          "fourPlusBedroom": 10
        },
        "amenities": ["pool", "gym", "parking", "security"],
        "managerId": "usr_mgr_001",
        "managerName": "Fatima Al-Maktoum",
        "createdAt": "2023-01-10T00:00:00Z",
        "updatedAt": "2025-12-01T10:00:00Z"
      }
    ]
  }
}
```

---

(Document continues with all remaining endpoints...)

