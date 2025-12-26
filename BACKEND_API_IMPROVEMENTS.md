# Backend API Improvement Requests

This document lists features that the frontend expects but are not currently supported by the backend API.

**Last Updated**: December 8, 2025

---

## Admin API (`/api/Admin/*`)

### API #1: Create Admin (`POST /api/Admin/create`)

**Current Implementation**: ✅ Working
- Endpoint: `POST /api/Admin/create`
- Accepts: `fullName`, `email`, `password`, `phoneNumber`, `address`, `nationality`

**Frontend User Creation Form** (Admin Portal):
The Create New User modal in the admin portal currently collects:
- **Basic Info**: Name, Email, Phone
- **Role Selection**: `tenant`, `employee`, `management` (admin can add `admin` role if super admin)
  - Note: `service_provider` role removed from form - created via Service Provider Management screen
- **Emergency Contact** (tenants only): Contact name and phone

**Location Details Removed**: Building assignment fields (buildingId, apartment, tower, floor) have been removed from the Create New User form to simplify the user creation workflow. These can be assigned separately after user creation.

---

**Missing Fields** (Priority: HIGH):

1. **`role` (string)**: User role type ⚠️ **CRITICAL**
   - Values: `admin` | `tenant` | `management` | `service_provider` | `employee`
   - **Why Critical**: Multi-role application requires role assignment at creation
   - **Current State**:
     - Frontend collects role in Create User form
     - Role is stored client-side only (not persisted to backend)
     - Cannot distinguish user types in backend data
   - **Impact**:
     - Role-based permissions cannot be enforced server-side
     - Cannot query users by role
     - Requires client-side role management (fragile)
   - **Recommendation**:
     - Add `role` field to request payload (required)
     - Store in database with NOT NULL constraint
     - Return role in all user responses
     - Implement role-based authorization on backend

---

**Missing Fields** (Priority: MEDIUM - Nice to Have):

2. **Building Assignment Fields** (Optional - Can be added separately):
   - `buildingId` (number): ID of assigned building
   - `apartment` (string): Apartment/unit number
   - `tower` (string): Tower/building section
   - `floor` (string): Floor number
   - **Why Useful**: Tenants and employees need building context for features (requests, amenities, visitors)
   - **Current State**: Not collected in Create User form (removed for simplicity)
   - **Recommendation**:
     - Consider separate endpoint: `PUT /api/Admin/{id}/building-assignment`
     - Or add these fields as optional to create/update endpoints
     - Frontend can handle assignment in a separate step after user creation

3. **Extended Profile Data** (Optional):
   - `profile.emergencyContact` (string): Emergency contact name
   - `profile.emergencyPhone` (string): Emergency contact phone
   - **Why Useful**: Important for tenant safety and building management
   - **Current State**: Frontend collects for tenants but cannot persist to backend
   - **Recommendation**:
     - Add dedicated profile endpoint: `PUT /api/Admin/{id}/profile`
     - Or include nested profile object in create/update payload

---

**Recommended Enhanced Payload** (with all optional fields):
```json
{
  // Current fields (required):
  "fullName": "string",
  "email": "string",
  "password": "string",
  "phoneNumber": "string",
  "address": "string",
  "nationality": "string",

  // HIGH PRIORITY - Add this:
  "role": "admin|tenant|management|service_provider|employee",  // REQUIRED

  // MEDIUM PRIORITY - Optional fields for future:
  "buildingId": 0,                    // Optional - can assign separately
  "apartment": "string",              // Optional
  "tower": "string",                  // Optional
  "floor": "string",                  // Optional
  "profile": {                        // Optional - or use separate endpoint
    "emergencyContact": "string",
    "emergencyPhone": "string"
  }
}
```

**Minimum Viable Enhancement** (just add role):
```json
{
  "fullName": "string",
  "email": "string",
  "password": "string",
  "phoneNumber": "string",
  "address": "string",
  "nationality": "string",
  "role": "admin|tenant|management|service_provider|employee"  // ADD THIS
}
```

---

### API #2: Update Admin (`PUT /api/Admin/update/{id}`)

**Current Implementation**: ✅ Working
- Endpoint: `PUT /api/Admin/update/{id}`
- Accepts: `fullName`, `phoneNumber`, `address`, `nationality`
- **Note**: Email cannot be updated (immutable)

**Missing Capabilities**:

1. **Email Update**: Backend doesn't allow email changes
   - **Issue**: Users cannot update their email address
   - **Security Concern**: Email changes should require verification
   - **Recommendation**:
     - Add `email` field to update payload
     - Implement email verification flow (send confirmation email)
     - Or create separate endpoint: `PUT /api/Admin/{id}/change-email`

2. **Role Update**: Cannot change user role after creation
   - **Issue**: Cannot promote/demote users (e.g., tenant → management)
   - **Recommendation**:
     - Add `role` field to update payload with proper authorization checks
     - Or create separate endpoint: `PUT /api/Admin/{id}/change-role`

3. **Status Management**: Field type mismatch
   - **Backend**: Returns `isActive: boolean` in response
   - **Frontend**: Uses `status?: "active" | "inactive"` for UI
   - **Issue**: No way to activate/deactivate users via update endpoint
   - **Recommendation**:
     - Accept `isActive` boolean in update payload
     - Or accept `status: "active"|"inactive"` and map to boolean
     - Or create separate endpoints: `PUT /api/Admin/{id}/activate` and `PUT /api/Admin/{id}/deactivate`

4. **Building Assignment Updates**: Cannot update building/apartment
   - **Issue**: Tenants who move units cannot update their assignment
   - **Recommendation**: Add `buildingId`, `apartment`, `tower` to update payload

**Recommended Enhanced Payload**:
```json
{
  "fullName": "string",
  "phoneNumber": "string",
  "address": "string",
  "nationality": "string",

  // ADD THESE:
  "email": "string",           // With email verification flow
  "role": "string",            // With authorization checks
  "isActive": boolean,         // Or accept "status": "active"|"inactive"
  "buildingId": 0,
  "apartment": "string",
  "tower": "string"
}
```

---

## General Recommendations

### 1. Consistent Field Naming ✅
Already good! Backend uses consistent naming:
- `fullName` (not `name`)
- `phoneNumber` (not `phone`)

### 2. Role-Based Access Control ⚠️ CRITICAL
**Current Gap**: No role field in API
**Impact**: Frontend cannot enforce role-based permissions with backend data
**Priority**: **HIGH - Critical for multi-tenant application**

**Frontend State**:
- Create User form collects role selection (tenant, employee, management, admin)
- Role stored client-side only - not persisted to backend
- All users appear the same to backend (no role differentiation)

**Recommendation**:
- Add `role` field to Create Admin endpoint (required field)
- Add `role` field to Update Admin endpoint (with authorization checks)
- Store role in database with NOT NULL constraint
- Implement role-based authorization middleware on backend
- Return user role in authentication responses

**Why This is Critical**:
- Without backend role storage, cannot implement server-side authorization
- Cannot query users by role (e.g., "get all tenants in building X")
- Fragile client-side role management - can be manipulated
- Core feature for multi-role building management application

### 3. Building Context for Users
**Current Gap**: No building assignment in API
**Impact**: Tenants cannot be linked to buildings/units during user creation
**Priority**: MEDIUM - Can be handled as separate workflow step

**Frontend State**:
- Building assignment fields **removed** from Create User form
- Simplified user creation workflow (basic info + role only)
- Location assignment can be handled separately after user creation

**Recommendation Options**:
- **Option A**: Create separate endpoint for building assignment
  ```
  PUT /api/Admin/{id}/building-assignment
  Body: { buildingId, apartment, tower, floor }
  ```
- **Option B**: Add optional fields to create/update endpoints
  - Include `buildingId`, `apartment`, `tower`, `floor` as optional
  - Frontend can omit during initial creation, add later
- **Option C**: Dedicated tenant onboarding endpoint
  ```
  POST /api/Admin/tenants/{id}/onboard
  Body: { buildingId, apartment, tower, floor, emergencyContact, emergencyPhone }
  ```

**Why This Changed**:
- Initial user creation simplified to reduce friction
- Building assignment can be a multi-step process
- Some users (admin, management) may not need building assignment
- Tenants can be assigned to building after account creation

### 4. Email Mutability
**Current Gap**: Emails are immutable after creation
**Impact**: Users cannot update their email address
**Priority**: MEDIUM - Common user request

**Recommendation**:
- Implement email change with verification:
  1. User requests email change
  2. Send verification email to new address
  3. User confirms via email link
  4. Email updated in database

### 5. User Status Management
**Current Gap**: No way to activate/deactivate users
**Impact**: Cannot soft-delete or suspend users
**Priority**: MEDIUM - Important for user management

**Recommendation Options**:
- **Option A**: Add `isActive` to update payload
- **Option B**: Create dedicated endpoints:
  - `PUT /api/Admin/{id}/activate`
  - `PUT /api/Admin/{id}/deactivate`
- **Option C**: Add `DELETE /api/Admin/{id}` for soft delete (set `isActive = false`)

---

## Future Enhancements

### User Profile Endpoint
Create dedicated endpoint for profile management:
```
GET    /api/Admin/{id}/profile
PUT    /api/Admin/{id}/profile
```

With extended profile fields:
- Emergency contact information
- Preferences and settings
- Profile picture URL
- Language preference
- Timezone

### Bulk Operations
For admin efficiency:
```
POST   /api/Admin/bulk-create     // Create multiple users
PUT    /api/Admin/bulk-update     // Update multiple users
DELETE /api/Admin/bulk-delete     // Soft delete multiple users
```

### User Search and Filtering
```
GET /api/Admin/users?search=john&role=tenant&buildingId=1&status=active
```

---

## Priority Matrix

| Feature | Priority | Impact | Effort | Status | Notes |
|---------|----------|--------|--------|--------|-------|
| **Role field** | **HIGH** | **Critical** | Low | ⏳ Pending | Frontend requires this at user creation |
| Building assignment | MEDIUM | Important | Medium | ⏳ Pending | Not in Create User form - can be separate step |
| Email update | MEDIUM | Important | High | ⏳ Pending | Requires verification flow |
| Status management | MEDIUM | Important | Low | ⏳ Pending | For user activation/deactivation |
| Extended profile | LOW | Nice-to-have | Medium | ⏳ Pending | Emergency contacts, preferences |
| Service Provider separation | ✅ DONE | Important | N/A | ✅ Complete | Removed from User Creation form |

---

**Document prepared by**: Frontend Team
**Contact**: For questions or clarifications about these requirements
**Next Review**: After backend team feedback
