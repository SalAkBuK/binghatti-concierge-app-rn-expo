# Admin and Management Profile Parameters Documentation

This document outlines the user profile structure for **Admin** and **Management** roles in the Tower Desk application. The backend should support these profile fields to enable full functionality.

**Last Updated**: December 8, 2025

---

## Overview

This document focuses on the profile requirements for Admin and Management users. The frontend stores profile data in a nested `profile` object within the User entity.

### User Entity Structure

```typescript
{
  id: string;
  email: string;
  name: string;  // Also stored as profile.name for convenience
  role: "admin" | "management";
  phone?: string;  // Also stored in profile.phone
  status?: "active" | "inactive";
  profile?: UserProfile;  // ⚠️ Extended profile data (see below)
  profileCompleted?: boolean;  // Tracks if user finished profile setup
  createdAt: string;
  updatedAt: string;
}
```

---

## Profile Fields by Role

### 1. Admin

**Used in**: `app/(admin)/profile.tsx`

Admins represent system administrators who manage the entire platform.

#### Core Fields (Currently Implemented)

| Field                        | Type     | Required               | Description                  |
| ---------------------------- | -------- | ---------------------- | ---------------------------- |
| `profile.companyName`        | `string` | Yes (first-time setup) | Company or organization name |
| `profile.phone`              | `string` | Yes (first-time setup) | Contact phone number         |
| `profile.companyWebsite`     | `string` | No                     | Company website URL          |
| `profile.companyDescription` | `string` | No                     | Brief company description    |
| `profile.companyAddress`     | `string` | No                     | Physical company address     |
| `profile.companyLogoUrl`     | `string` | No                     | URL to company logo image    |

#### Additional Fields (Defined but Not Yet Used)

| Field                 | Type       | Description                    |
| --------------------- | ---------- | ------------------------------ |
| `profile.avatar`      | `string`   | URL to admin's profile picture |
| `profile.attachments` | `string[]` | Profile documents/images       |

**Example Admin Profile**:

```json
{
  "id": "1",
  "email": "admin@towerdesk.com",
  "name": "John Smith",
  "role": "admin",
  "phone": "+971 50 123 4567",
  "profileCompleted": true,
  "profile": {
    "companyName": "Tower Desk Management LLC",
    "phone": "+971 50 123 4567",
    "companyWebsite": "https://towerdesk.com",
    "companyDescription": "Leading building management platform",
    "companyAddress": "Dubai Marina, Dubai, UAE",
    "companyLogoUrl": "https://storage.example.com/logos/admin-logo.png"
  }
}
```

---

### 2. Management Profile

**Used in**: `app/(management)/profile.tsx`

Management users are building managers who oversee daily operations.

#### Core Fields (Currently Implemented)

| Field              | Type     | Required               | Description                          |
| ------------------ | -------- | ---------------------- | ------------------------------------ |
| `name`             | `string` | Yes (first-time setup) | Full name (stored at top level)      |
| `profile.phone`    | `string` | Yes (first-time setup) | Contact phone number                 |
| `profile.jobTitle` | `string` | No                     | Job title (e.g., "Building Manager") |
| `profile.avatar`   | `string` | No                     | URL to profile picture               |

#### Additional Fields (Used in form but missing from UserProfile type)

| Field                | Type     | Description     | Status                               |
| -------------------- | -------- | --------------- | ------------------------------------ |
| `profile.department` | `string` | Department name | ⚠️ **Missing from UserProfile type** |
| `profile.bio`        | `string` | Short biography | ⚠️ **Missing from UserProfile type** |

#### Building Context (Critical)

| Field                        | Type       | Description                      |
| ---------------------------- | ---------- | -------------------------------- |
| `profile.buildingId`         | `string`   | Primary building assignment      |
| `profile.managedBuildingIds` | `string[]` | List of all managed building IDs |

**Example Management Profile**:

```json
{
  "id": "2",
  "email": "manager@building1.com",
  "name": "Sarah Johnson",
  "role": "management",
  "phone": "+971 50 234 5678",
  "profileCompleted": true,
  "profile": {
    "name": "Sarah Johnson",
    "phone": "+971 50 234 5678",
    "jobTitle": "Building Manager",
    "department": "Operations",
    "bio": "10 years of experience in building management",
    "avatar": "https://storage.example.com/avatars/manager.png",
    "buildingId": "building-001",
    "managedBuildingIds": ["building-001", "building-002"]
  }
}
```

---

## Backend Implementation Recommendations

### 1. Profile Storage Strategy

**Option A: JSON Column (Recommended for MVP)**

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',
  profile JSONB,  -- Store entire profile object as JSON
  profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_profile ON users USING GIN (profile);
```

**Option B: Separate Profile Tables (Better for Complex Queries)**

```sql
CREATE TABLE user_profiles (
  user_id INTEGER REFERENCES users(id),
  building_id INTEGER,
  apartment VARCHAR(50),
  tower VARCHAR(50),
  floor VARCHAR(50),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(50),
  job_title VARCHAR(255),
  department VARCHAR(255),
  bio TEXT,
  avatar VARCHAR(500),
  -- Add other fields as needed
  PRIMARY KEY (user_id)
);

CREATE TABLE service_provider_profiles (
  user_id INTEGER REFERENCES users(id),
  service_provider_id INTEGER,
  company_name VARCHAR(255),
  company_website VARCHAR(500),
  specialties TEXT[],
  rating DECIMAL(3,2),
  completed_jobs INTEGER DEFAULT 0,
  PRIMARY KEY (user_id)
);
```

### 2. API Endpoints Needed

#### Get User Profile

```
GET /api/User/{id}/profile
Response: UserProfile object
```

#### Update User Profile

```
PUT /api/User/{id}/profile
Request Body: Partial<UserProfile>
Response: Updated UserProfile
```

#### Upload Profile Avatar/Documents

```
POST /api/User/{id}/profile/upload
Request: multipart/form-data
Response: { url: string }
```

### 3. Validation Rules

| Role           | Required Profile Fields                             |
| -------------- | --------------------------------------------------- |
| **Admin**      | `companyName`, `phone`                              |
| **Management** | `name`, `phone`, `buildingId`, `managedBuildingIds` |

### 4. Missing Backend Features

#### High Priority

1. **Building Assignment**: Link users to buildings via `buildingId`
2. **Profile Completion Tracking**: Store `profileCompleted` boolean
3. **Avatar Upload**: File upload endpoint with cloud storage integration
4. **Emergency Contacts**: Store emergency contact information for tenants

#### Medium Priority

5. **Service Provider Ratings**: Calculate and store rating/completedJobs
6. **Document Attachments**: Support multiple file uploads per user
7. **Managed Buildings Array**: Support multiple building assignments for management

#### Low Priority

8. **Extended Profile Fields**: `department`, `bio`, `specialties`, `certifications`
9. **Identity Documents**: Store `emiratesId`, `passportNumber`

---

## Field Type Reference

### UserProfile Type Definition (Admin & Management)

```typescript
export interface UserProfile {
  // Basic Info (Common)
  name?: string;
  phone?: string;
  avatar?: string;

  // Management-Specific Fields
  buildingId?: string;           // Primary building assignment
  managedBuildingIds?: string[]; // Array of managed building IDs
  jobTitle?: string;             // Job title (e.g., "Building Manager")
  department?: string;           // ⚠️ Used but not in type definition
  bio?: string;                  // ⚠️ Used but not in type definition

  // Admin-Specific Fields
  companyName?: string;          // Company or organization name
  companyLogoUrl?: string;       // URL to company logo image
  companyWebsite?: string;       // Company website URL
  companyDescription?: string;   // Brief company description
  companyAddress?: string;       // Physical company address

  // Documents (Optional for both)
  attachments?: string[];        // Array of file URLs
}
```

---

## Response Examples

### GET /api/User/profile (Admin)

```json
{
  "success": true,
  "data": {
    "id": "1",
    "email": "admin@towerdesk.com",
    "name": "John Smith",
    "role": "admin",
    "phone": "+971 50 123 4567",
    "status": "active",
    "profileCompleted": true,
    "profile": {
      "companyName": "Tower Desk Management LLC",
      "phone": "+971 50 123 4567",
      "companyWebsite": "https://towerdesk.com",
      "companyLogoUrl": "https://storage.example.com/logos/admin-logo.png"
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-12-08T10:30:00Z"
  }
}
```

### PUT /api/User/{id}/profile (Update)

```json
// Request
{
  "companyName": "Tower Desk Management LLC",
  "companyWebsite": "https://towerdesk.com",
  "phone": "+971 50 123 4567"
}

// Response
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "1",
    "profile": {
      "companyName": "Tower Desk Management LLC",
      "companyWebsite": "https://towerdesk.com",
      "phone": "+971 50 123 4567"
    },
    "updatedAt": "2025-12-08T10:35:00Z"
  }
}
```

---

## Notes for Backend Developer

1. **Profile Completion Flow**: After creating a user, they're redirected to a profile setup screen. Backend should support `profileCompleted` boolean to track this.

2. **Field Flexibility**: Not all profile fields are required for all roles. Use nullable/optional fields and validate based on `role`.

3. **Building Context**: The `buildingId` and `managedBuildingIds` fields are **critical** for multi-building functionality. Implement proper foreign key relationships.

4. **File Storage**: Avatar and attachment URLs should point to a cloud storage service (AWS S3, Azure Blob, etc.). Provide signed upload URLs.

5. **Type Safety**: The `department` and `bio` fields are used in the frontend but missing from the TypeScript type definition. Frontend will be updated, but backend should support these fields.

6. **API Consistency**: Use the same field naming convention:
   - `fullName` (not `name`) in create/update endpoints
   - `phoneNumber` (not `phone`) in create/update endpoints
   - But in profile responses, use `name` and `phone` to match existing structure

---

**Document prepared by**: Frontend Team
**Contact**: For questions or clarifications about profile structure
**Related Documents**:

- [BACKEND_API_IMPROVEMENTS.md](./BACKEND_API_IMPROVEMENTS.md) - User creation/update API mismatches
- User types defined in: `lib/types/index.ts:5-51`
