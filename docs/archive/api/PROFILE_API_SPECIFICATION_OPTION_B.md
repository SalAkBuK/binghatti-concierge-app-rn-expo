# Profile API Specification - Option B (Role-Specific Endpoints)

**Project:** Tower Desk - Building Management App
**Date:** December 8, 2025
**Priority:** HIGH - Frontend is blocked on profile save/upload features
**API Base URL:** `http://16.171.240.211/api`
**Architecture:** Separate endpoints per role (Type-safe approach)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Decision](#architecture-decision)
3. [Admin Profile API](#admin-profile-api)
4. [Management Profile API](#management-profile-api)
5. [Tenant Profile API](#tenant-profile-api)
6. [Data Models](#data-models)
7. [Error Responses](#error-responses)
8. [Testing Guide](#testing-guide)
9. [Security Considerations](#security-considerations)

---

## 🎯 Overview

### What This Implements

This specification describes **role-specific profile endpoints** where each user role (Admin, Management, Tenant) has its own dedicated API endpoints.

### Why Separate Endpoints?

✅ **Type Safety:** Each endpoint has specific, documented fields
✅ **No Role Checking:** Endpoint itself defines the role
✅ **Clear API Contract:** Frontend knows exactly what to send
✅ **Better Documentation:** Each role's requirements are explicit
✅ **Easier Validation:** Each endpoint validates only its fields

### Frontend Implementation

The frontend has been updated to route to the correct endpoint based on user role:

```typescript
// Frontend routing logic (already implemented)
switch (userRole) {
  case "admin":
    await apiService.users.updateAdminProfile({ ... });
    break;
  case "management":
    await apiService.users.updateManagementProfile({ ... });
    break;
  case "tenant":
    await apiService.users.updateTenantProfile({ ... });
    break;
}
```

---

## 🏗️ Architecture Decision

### Endpoint Structure

Each role has **3 dedicated endpoints**:

```
GET  /api/{Role}/profile        → Get profile
PUT  /api/{Role}/profile        → Update profile
POST /api/{Role}/profile/upload → Upload file (photo/logo)
```

### Role Mapping

| Role | Base Path | Example |
|------|-----------|---------|
| Admin | `/api/Admin/profile` | `PUT /api/Admin/profile` |
| Management | `/api/Management/profile` | `PUT /api/Management/profile` |
| Tenant | `/api/Tenant/profile` | `PUT /api/Tenant/profile` |

---

## 👔 Admin Profile API

### 1. Get Admin Profile

**Endpoint:** `GET /api/Admin/profile`

**Authentication:** Required (JWT Bearer token for admin user)

**Description:** Retrieve the authenticated admin's profile

**Request:**
```http
GET /api/Admin/profile HTTP/1.1
Host: 16.171.240.211
Authorization: Bearer {admin_jwt_token}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "companyName": "Tower Desk Management LLC",
    "phone": "+971 50 123 4567",
    "companyWebsite": "https://towerdesk.com",
    "companyDescription": "Leading building management platform",
    "companyAddress": "Dubai Marina, Dubai, UAE",
    "companyLogoUrl": "https://storage.example.com/logos/admin-logo.png"
  },
  "message": "Profile retrieved successfully"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid/missing token or not an admin user
- `404 Not Found` - Admin profile not found

---

### 2. Update Admin Profile

**Endpoint:** `PUT /api/Admin/profile`

**Authentication:** Required (JWT Bearer token for admin user)

**Description:** Update the authenticated admin's profile

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {admin_jwt_token}
```

**Request Body:**
```json
{
  "companyName": "Tower Desk Management LLC",
  "phone": "+971 50 123 4567",
  "companyWebsite": "https://towerdesk.com",
  "companyDescription": "Leading building management platform",
  "companyAddress": "Dubai Marina, Dubai, UAE",
  "companyLogoUrl": "https://storage.example.com/logos/logo-abc123.png"
}
```

**Field Specifications:**

| Field | Type | Required | Max Length | Description |
|-------|------|----------|------------|-------------|
| `companyName` | string | **Yes** | 255 | Company name |
| `phone` | string | **Yes** | 50 | Phone number (format: +XXX...) |
| `companyWebsite` | string | No | 500 | Company website URL |
| `companyDescription` | string | No | 2000 | Company description |
| `companyAddress` | string | No | 1000 | Physical address |
| `companyLogoUrl` | string | No | 500 | URL from upload endpoint |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "companyName": "Tower Desk Management LLC",
    "phone": "+971 50 123 4567",
    "companyWebsite": "https://towerdesk.com",
    "companyDescription": "Leading building management platform",
    "companyAddress": "Dubai Marina, Dubai, UAE",
    "companyLogoUrl": "https://storage.example.com/logos/logo-abc123.png"
  },
  "message": "Profile updated successfully"
}
```

**Validation Errors (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "companyName": "Company name is required",
    "phone": "Phone number is required and must be in format +XXX..."
  },
  "error": "VALIDATION_ERROR"
}
```

---

### 3. Upload Admin File

**Endpoint:** `POST /api/Admin/profile/upload`

**Authentication:** Required (JWT Bearer token for admin user)

**Description:** Upload company logo and receive cloud URL

**Request Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer {admin_jwt_token}
```

**Request Body (Form Data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (JPEG, PNG, WebP) |

**File Constraints:**
- Maximum size: 10 MB
- Allowed types: image/jpeg, image/png, image/webp
- Recommended dimensions: 512x512px (logo) or up to 2048x2048px

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "url": "https://towerdesk-storage.s3.amazonaws.com/logos/admin-123_abc456.jpg",
    "filename": "admin-123_abc456.jpg",
    "size": 245678,
    "uploadedAt": "2025-12-08T10:30:00Z"
  },
  "message": "File uploaded successfully"
}
```

**Error Responses:**
- `400 Bad Request` - No file / File too large / Invalid type
- `401 Unauthorized` - Invalid token or not admin
- `413 Payload Too Large` - File exceeds limit

---

## 👨‍💼 Management Profile API

### 1. Get Management Profile

**Endpoint:** `GET /api/Management/profile`

**Authentication:** Required (JWT Bearer token for management user)

**Request:**
```http
GET /api/Management/profile HTTP/1.1
Host: 16.171.240.211
Authorization: Bearer {management_jwt_token}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "Sarah Johnson",
    "phone": "+971 50 234 5678",
    "jobTitle": "Building Manager",
    "department": "Operations",
    "bio": "10 years of experience in building management",
    "avatar": "https://storage.example.com/avatars/manager.png",
    "buildingId": "building-001",
    "managedBuildingIds": ["building-001", "building-002"]
  },
  "message": "Profile retrieved successfully"
}
```

---

### 2. Update Management Profile

**Endpoint:** `PUT /api/Management/profile`

**Authentication:** Required (JWT Bearer token for management user)

**Request Body:**
```json
{
  "name": "Sarah Johnson",
  "phone": "+971 50 234 5678",
  "buildingId": "building-001",
  "managedBuildingIds": ["building-001", "building-002"],
  "jobTitle": "Building Manager",
  "department": "Operations",
  "bio": "10 years of experience in building management",
  "avatar": "https://storage.example.com/avatars/avatar-xyz789.jpg"
}
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Full name |
| `phone` | string | **Yes** | Phone number |
| `buildingId` | string | **Yes** | Primary building ID (must exist) |
| `managedBuildingIds` | string[] | **Yes** | Array of managed building IDs |
| `jobTitle` | string | No | Job title (e.g., "Building Manager") |
| `department` | string | No | Department name |
| `bio` | string | No | Biography/description |
| `avatar` | string | No | Avatar URL from upload endpoint |

**Validation Rules:**
- `buildingId` must reference an existing building
- `managedBuildingIds` must be a non-empty array
- `managedBuildingIds` should include `buildingId`
- All building IDs must exist in the database

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "Sarah Johnson",
    "phone": "+971 50 234 5678",
    "buildingId": "building-001",
    "managedBuildingIds": ["building-001", "building-002"],
    "jobTitle": "Building Manager",
    "department": "Operations",
    "bio": "10 years of experience",
    "avatar": "https://storage.example.com/avatars/avatar-xyz789.jpg"
  },
  "message": "Profile updated successfully"
}
```

**Validation Errors (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": "Name is required",
    "phone": "Phone number is required",
    "buildingId": "Building ID is required and must reference an existing building",
    "managedBuildingIds": "At least one managed building ID is required"
  },
  "error": "VALIDATION_ERROR"
}
```

---

### 3. Upload Management File

**Endpoint:** `POST /api/Management/profile/upload`

**Authentication:** Required (JWT Bearer token for management user)

**Description:** Upload profile avatar and receive cloud URL

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "url": "https://towerdesk-storage.s3.amazonaws.com/avatars/mgmt-123_def789.jpg",
    "filename": "mgmt-123_def789.jpg",
    "size": 182456,
    "uploadedAt": "2025-12-08T11:15:00Z"
  },
  "message": "File uploaded successfully"
}
```

---

## 👥 Tenant Profile API

### 1. Get Tenant Profile

**Endpoint:** `GET /api/Tenant/profile`

**Authentication:** Required (JWT Bearer token for tenant user)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "Ahmed Ali",
    "phone": "+971 50 345 6789",
    "buildingId": "building-001",
    "apartment": "1205",
    "floor": "12",
    "tower": "Tower A",
    "emergencyContact": "Fatima Ali",
    "emergencyPhone": "+971 50 999 8888",
    "emiratesId": "784-1234-5678901-2",
    "avatar": "https://storage.example.com/avatars/tenant.png"
  },
  "message": "Profile retrieved successfully"
}
```

---

### 2. Update Tenant Profile

**Endpoint:** `PUT /api/Tenant/profile`

**Authentication:** Required (JWT Bearer token for tenant user)

**Request Body:**
```json
{
  "name": "Ahmed Ali",
  "phone": "+971 50 345 6789",
  "buildingId": "building-001",
  "apartment": "1205",
  "floor": "12",
  "tower": "Tower A",
  "emergencyContact": "Fatima Ali",
  "emergencyPhone": "+971 50 999 8888",
  "emiratesId": "784-1234-5678901-2",
  "avatar": "https://storage.example.com/avatars/tenant-abc.png"
}
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Full name |
| `phone` | string | **Yes** | Phone number |
| `buildingId` | string | **Yes** | Building ID (must exist) |
| `apartment` | string | **Yes** | Apartment/unit number |
| `floor` | string | **Yes** | Floor number or code |
| `tower` | string | No | Tower/wing identifier |
| `emergencyContact` | string | No | Emergency contact name |
| `emergencyPhone` | string | No | Emergency contact phone |
| `emiratesId` | string | No | Emirates ID number |
| `avatar` | string | No | Avatar URL from upload endpoint |

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "Ahmed Ali",
    "phone": "+971 50 345 6789",
    "buildingId": "building-001",
    "apartment": "1205",
    "floor": "12",
    "tower": "Tower A",
    "emergencyContact": "Fatima Ali",
    "emergencyPhone": "+971 50 999 8888",
    "emiratesId": "784-1234-5678901-2",
    "avatar": "https://storage.example.com/avatars/tenant-abc.png"
  },
  "message": "Profile updated successfully"
}
```

---

### 3. Upload Tenant File

**Endpoint:** `POST /api/Tenant/profile/upload`

**Authentication:** Required (JWT Bearer token for tenant user)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "url": "https://towerdesk-storage.s3.amazonaws.com/avatars/tenant-456_ghi012.jpg",
    "filename": "tenant-456_ghi012.jpg",
    "size": 156789,
    "uploadedAt": "2025-12-08T12:00:00Z"
  },
  "message": "File uploaded successfully"
}
```

---

## 📊 Data Models

### Admin Profile Model

```typescript
interface AdminProfile {
  companyName: string;        // Required
  phone: string;              // Required
  companyWebsite?: string;
  companyDescription?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
}
```

### Management Profile Model

```typescript
interface ManagementProfile {
  name: string;                   // Required
  phone: string;                  // Required
  buildingId: string;             // Required
  managedBuildingIds: string[];   // Required
  jobTitle?: string;
  department?: string;
  bio?: string;
  avatar?: string;
}
```

### Tenant Profile Model

```typescript
interface TenantProfile {
  name: string;              // Required
  phone: string;             // Required
  buildingId: string;        // Required
  apartment: string;         // Required
  floor: string;             // Required
  tower?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  emiratesId?: string;
  avatar?: string;
}
```

---

## ❌ Error Responses

### Standard Error Format

All endpoints use consistent error response format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "errors": {
    "fieldName": "Field-specific error message"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid/missing token |
| `FORBIDDEN` | 403 | Wrong role for endpoint |
| `NOT_FOUND` | 404 | Profile/resource not found |
| `VALIDATION_ERROR` | 400 | Invalid field values |
| `NO_FILE` | 400 | File upload missing |
| `FILE_TOO_LARGE` | 400 | File exceeds 10MB |
| `INVALID_FILE_TYPE` | 400 | Not an allowed image type |
| `UPLOAD_FAILED` | 500 | Cloud storage error |

### Role Mismatch Example

If an admin user tries to access management endpoint:

**Request:**
```http
GET /api/Management/profile
Authorization: Bearer {admin_jwt_token}
```

**Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Access denied. This endpoint is for management users only.",
  "error": "FORBIDDEN"
}
```

---

## 🧪 Testing Guide

### Test Scenarios

#### Test 1: Admin Profile Update

```bash
curl -X PUT http://16.171.240.211/api/Admin/profile \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Test Company",
    "phone": "+971501234567",
    "companyWebsite": "https://test.com"
  }'

Expected: 200 OK with updated profile
```

#### Test 2: Management Profile with Building Validation

```bash
curl -X PUT http://16.171.240.211/api/Management/profile \
  -H "Authorization: Bearer {management_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Manager",
    "phone": "+971501234567",
    "buildingId": "building-001",
    "managedBuildingIds": ["building-001", "building-002"]
  }'

Expected: 200 OK if buildings exist, 400 if invalid buildingId
```

#### Test 3: Role Mismatch (Security Test)

```bash
curl -X PUT http://16.171.240.211/api/Admin/profile \
  -H "Authorization: Bearer {tenant_token}" \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Hack Attempt"}'

Expected: 403 Forbidden
```

#### Test 4: File Upload

```bash
curl -X POST http://16.171.240.211/api/Admin/profile/upload \
  -H "Authorization: Bearer {admin_token}" \
  -F "file=@/path/to/logo.jpg"

Expected: 200 OK with cloud URL
```

#### Test 5: Validation Error

```bash
curl -X PUT http://16.171.240.211/api/Admin/profile \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+971501234567"}'

Expected: 400 Bad Request (missing companyName)
```

---

## 🔒 Security Considerations

### Authentication

1. **JWT Validation:**
   - Verify token signature
   - Check token expiration
   - Extract user ID and role from token

2. **Role-Based Access:**
   ```csharp
   // Endpoint: PUT /api/Admin/profile
   [Authorize(Roles = "admin")]
   [HttpPut("profile")]
   public async Task<IActionResult> UpdateAdminProfile(...)
   {
       // Only admin users can access this endpoint
   }
   ```

3. **User Ownership:**
   - User can only update their OWN profile
   - Extract user ID from JWT token
   - Match against authenticated user

### Example Backend Authorization

```csharp
[Authorize(Roles = "admin")]
[HttpPut("/api/Admin/profile")]
public async Task<IActionResult> UpdateAdminProfile(AdminProfileDto profileData)
{
    // Get user ID from JWT token
    var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    // Get user from database
    var user = await _userService.GetUserByIdAsync(userId);

    // Verify role (double-check)
    if (user.Role != "admin")
        return Forbid();

    // Validate required fields
    if (string.IsNullOrEmpty(profileData.CompanyName))
        return BadRequest(new { success = false, errors = new { companyName = "Required" } });

    // Update profile
    user.Profile = profileData;
    await _userService.UpdateAsync(user);

    return Ok(new { success = true, data = user.Profile });
}
```

---

## 📦 Implementation Checklist

### Phase 1: Admin Profile Endpoints

- [ ] Create `GET /api/Admin/profile` endpoint
- [ ] Create `PUT /api/Admin/profile` endpoint
- [ ] Add validation for required fields (companyName, phone)
- [ ] Test with Postman
- [ ] Add role authorization attribute

### Phase 2: Management Profile Endpoints

- [ ] Create `GET /api/Management/profile` endpoint
- [ ] Create `PUT /api/Management/profile` endpoint
- [ ] Add building ID validation (foreign key check)
- [ ] Validate managedBuildingIds array
- [ ] Test with Postman

### Phase 3: File Upload Endpoints

- [ ] Set up AWS S3 (or Azure Blob Storage)
- [ ] Create `POST /api/Admin/profile/upload` endpoint
- [ ] Create `POST /api/Management/profile/upload` endpoint
- [ ] Implement file validation (size, type)
- [ ] Test actual file uploads
- [ ] Verify cloud URLs are accessible

### Phase 4: Tenant Profile (Future)

- [ ] Create `GET /api/Tenant/profile` endpoint
- [ ] Create `PUT /api/Tenant/profile` endpoint
- [ ] Create `POST /api/Tenant/profile/upload` endpoint
- [ ] Test complete flow

---

## 🎯 Success Criteria

### For Each Role:

- [ ] Frontend can GET profile and receive correct data
- [ ] Frontend can PUT profile and data persists
- [ ] Frontend can upload file and receive cloud URL
- [ ] Cloud URLs are publicly accessible
- [ ] Validation errors return proper 400 responses
- [ ] Role mismatch returns 403 Forbidden
- [ ] Unauthorized access returns 401

---

## 📞 Frontend Integration Points

### Frontend Calls

The frontend is already configured to call these endpoints:

**Admin:**
```typescript
await apiService.users.updateAdminProfile({
  companyName: "...",
  phone: "...",
  companyLogoUrl: "..."
});
```

**Management:**
```typescript
await apiService.users.updateManagementProfile({
  name: "...",
  phone: "...",
  buildingId: "...",
  managedBuildingIds: ["..."]
});
```

**File Upload:**
```typescript
const formData = new FormData();
formData.append('file', fileData);
await apiService.users.uploadAdminFile(formData);
```

---

## 📄 Summary

### What Backend Must Implement

**Total Endpoints:** 9 (3 per role × 3 roles)

| Role | GET | PUT | POST (Upload) |
|------|-----|-----|---------------|
| Admin | `/api/Admin/profile` | `/api/Admin/profile` | `/api/Admin/profile/upload` |
| Management | `/api/Management/profile` | `/api/Management/profile` | `/api/Management/profile/upload` |
| Tenant | `/api/Tenant/profile` | `/api/Tenant/profile` | `/api/Tenant/profile/upload` |

### Key Benefits

✅ **Type-Safe:** Each endpoint has specific field requirements
✅ **Self-Documenting:** Endpoint path indicates role
✅ **Simple Authorization:** `[Authorize(Roles = "admin")]`
✅ **Clear Validation:** Each endpoint validates only its fields
✅ **Frontend-Ready:** All API methods already implemented

---

**Document Version:** 2.0 (Option B)
**Last Updated:** December 8, 2025
**Status:** Ready for Implementation
**Priority:** 🔴 HIGH - Frontend is configured and waiting
