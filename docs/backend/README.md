# Tower Desk Backend API Documentation

## Overview

Complete backend API specification for Tower Desk mobile application with role-based access control.

**Base URL:** `https://1bnx.online/api`
**Authentication:** JWT Bearer Token
**App Framework:** React Native (Expo)

## Quick Links

- [Role Flows & User Stories](./01_ROLE_FLOWS.md) - User journeys for each role
- [Admin APIs](./02_ADMIN_APIS.md) - Full system access endpoints  
- [Management APIs](./03_MANAGEMENT_APIS.md) - Building manager endpoints
- [Tenant APIs](./04_TENANT_APIS.md) - Resident user endpoints
- [Common APIs](./05_COMMON_APIS.md) - Shared endpoints (auth, notifications, files)
- [Data Models](./06_DATA_MODELS.md) - Complete schema reference

## Roles

| Role | Description | Key Features |
|------|-------------|--------------|
| **Admin** | System administrators | User management, building CRUD, full analytics, permissions |
| **Management** | Building managers | Request assignment, job creation, tenant management, notifications |
| **Tenant** | Building residents | Service requests, amenity booking, visitor registration, ratings |
| **Service Provider** | External contractors | Job management, schedule, ratings |
| **Employee** | Building staff | Task management, visitor check-in/out |

## Implementation Priority

### Phase 1 (Week 1-2)
1. Authentication & User Management
2. Buildings & Units Management
3. Service Requests (Tenants creating, Management viewing)

### Phase 2 (Week 2-3)
4. Jobs Management (Management & Service Providers)
5. Notifications System
6. File Uploads

### Phase 3 (Week 3-4)
7. Amenities & Bookings
8. Visitor Management
9. Ratings & Feedback

## Tech Stack Requirements

- **Database:** PostgreSQL (recommended)
- **File Storage:** S3 or similar CDN
- **Real-time:** WebSockets or Server-Sent Events
- **Authentication:** JWT with refresh tokens
- **API Standard:** REST with JSON

## Getting Started

1. Read [Role Flows](./01_ROLE_FLOWS.md) to understand user journeys
2. Review [Data Models](./06_DATA_MODELS.md) for database schema
3. Implement APIs by priority (Admin → Management → Tenant)
4. Use Postman collection (provided separately) for testing

## Contact

Frontend Team: [contact info]
Project Manager: [contact info]

---
**Last Updated:** January 2025
