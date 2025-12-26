# Profile API Specification for Backend Developer

**Project:** Tower Desk - Building Management App
**Date:** December 8, 2025
**Priority:** HIGH - Frontend is blocked on profile save/upload features
**API Base URL:** `http://16.171.240.211/api`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [User Roles & Profile Requirements](#user-roles--profile-requirements)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Validation Rules](#validation-rules)
6. [Cloud Storage Setup](#cloud-storage-setup)
7. [Error Responses](#error-responses)
8. [Testing Guide](#testing-guide)
9. [Security Considerations](#security-considerations)

---

## 🎯 Overview

### What This API Does

This API allows users to:
- **Get** their profile information
- **Update** their profile information (partial updates supported)
- **Upload** files (photos/logos) and receive permanent cloud URLs

### Current Problem

- Frontend has profile screens built for **Admin** and **Management** roles
- Profile save currently only updates local state (no backend call)
- File uploads are completely non-functional (saves local paths only)
- **Frontend is BLOCKED until these endpoints are implemented**

### Affected User Roles

**Phase 1 (Immediate Need):**
- ✅ **Admin** - Need to save company information and upload logo
- ✅ **Management** - Need to save personal information and upload avatar

**Phase 2 (Future):**
- 🔵 **Tenant** - Will use same endpoints when profile screen is built
- 🔵 **Service Provider** - Will use same endpoints when profile screen is built
- 🔵 **Employee** - Will use same endpoints when profile screen is built

---

## 👥 User Roles & Profile Requirements

### Admin Profile

**Purpose:** System administrators managing the platform

**Required Fields (First-Time Setup):**
- `companyName` (string, required)
- `phone` (string, required)

**Optional Fields:**
- `companyWebsite` (string, URL)
- `companyDescription` (string, text)
- `companyAddress` (string, text)
- `companyLogoUrl` (string, URL from upload endpoint)
- `attachments` (string[], array of URLs)

**Example Admin Profile:**
```json
{
  "companyName": "Tower Desk Management LLC",
  "phone": "+971 50 123 4567",
  "companyWebsite": "https://towerdesk.com",
  "companyDescription": "Leading building management platform",
  "companyAddress": "Dubai Marina, Dubai, UAE",
  "companyLogoUrl": "https://storage.example.com/logos/admin-logo.png"
}
```

---

### Management Profile

**Purpose:** Building managers overseeing daily operations

**Required Fields (First-Time Setup):**
- `name` (string, required)
- `phone` (string, required)
- `buildingId` (string, required)
- `managedBuildingIds` (string[], required)

**Optional Fields:**
- `jobTitle` (string)
- `department` (string)
- `bio` (string, text)
- `avatar` (string, URL from upload endpoint)

**Example Management Profile:**
```json
{
  "name": "Sarah Johnson",
  "phone": "+971 50 234 5678",
  "jobTitle": "Building Manager",
  "department": "Operations",
  "bio": "10 years of experience in building management",
  "avatar": "https://storage.example.com/avatars/manager.png",
  "buildingId": "building-001",
  "managedBuildingIds": ["building-001", "building-002"]
}
```

---

### Future Roles (For Reference)

#### Tenant Profile (Phase 2)
**Required:** `name`, `phone`, `buildingId`, `apartment`, `floor`
**Optional:** `tower`, `emergencyContact`, `emergencyPhone`, `emiratesId`, `avatar`

#### Service Provider Profile (Phase 2)
**Required:** `companyName`, `serviceProviderId`, `phone`
**Optional:** `companyWebsite`, `specialties[]`, `certifications[]`, `rating`, `completedJobs`, `companyLogoUrl`

#### Employee Profile (Phase 2)
**Required:** `name`, `phone`, `buildingId`, `jobTitle`
**Optional:** `emiratesId`, `passportNumber`, `avatar`

---

## 🔌 API Endpoints

### 1. Get User Profile

**Endpoint:** `GET /api/User/{id}/profile`

**Description:** Retrieve a user's profile information

**Authentication:** Required (JWT Bearer token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | User ID |

**Request Example:**
```http
GET /api/User/123/profile HTTP/1.1
Host: 16.171.240.211
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "John Smith",
    "phone": "+971 50 123 4567",
    "companyName": "Tower Desk Management LLC",
    "companyWebsite": "https://towerdesk.com",
    "companyDescription": "Leading building management platform",
    "companyAddress": "Dubai Marina, Dubai, UAE",
    "companyLogoUrl": "https://storage.example.com/logos/admin-logo.png"
  },
  "message": "Profile retrieved successfully"
}
```

**Error Responses:**

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing token",
  "error": "UNAUTHORIZED"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "User not found",
  "error": "USER_NOT_FOUND"
}
```

---

### 2. Update User Profile

**Endpoint:** `PUT /api/User/{id}/profile`

**Description:** Update a user's profile information (partial updates supported)

**Authentication:** Required (JWT Bearer token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | User ID |

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body (Admin Example):**
```json
{
  "companyName": "Tower Desk Management LLC",
  "companyWebsite": "https://towerdesk.com",
  "phone": "+971 50 123 4567",
  "companyDescription": "Leading building management platform",
  "companyAddress": "Dubai Marina, Dubai, UAE",
  "companyLogoUrl": "https://storage.example.com/logos/logo-abc123.png"
}
```

**Request Body (Management Example):**
```json
{
  "name": "Sarah Johnson",
  "phone": "+971 50 234 5678",
  "jobTitle": "Building Manager",
  "department": "Operations",
  "bio": "Experienced building manager",
  "avatar": "https://storage.example.com/avatars/avatar-xyz789.jpg",
  "buildingId": "building-001",
  "managedBuildingIds": ["building-001", "building-002"]
}
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
    "bio": "Experienced building manager",
    "avatar": "https://storage.example.com/avatars/avatar-xyz789.jpg",
    "buildingId": "building-001",
    "managedBuildingIds": ["building-001", "building-002"]
  },
  "message": "Profile updated successfully"
}
```

**Error Responses:**

**400 Bad Request (Validation Failed):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "companyName": "Company name is required for admin users",
    "phone": "Phone number is required"
  },
  "error": "VALIDATION_ERROR"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing token",
  "error": "UNAUTHORIZED"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "You can only update your own profile",
  "error": "FORBIDDEN"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "User not found",
  "error": "USER_NOT_FOUND"
}
```

---

### 3. Upload Profile File

**Endpoint:** `POST /api/User/{id}/profile/upload`

**Description:** Upload a file (image) and receive a permanent cloud URL

**Authentication:** Required (JWT Bearer token)

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | User ID |

**Request Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Request Body (Form Data):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (JPEG, PNG, WebP) |

**File Constraints:**
- **Maximum size:** 10 MB
- **Allowed types:** `image/jpeg`, `image/png`, `image/webp`
- **Recommended dimensions:** Max 2048x2048px (auto-resize if larger)

**Request Example (Postman/cURL):**
```bash
curl -X POST http://16.171.240.211/api/User/123/profile/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@/path/to/photo.jpg"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "url": "https://towerdesk-storage.s3.amazonaws.com/profiles/user-123/avatar-abc123.jpg",
    "filename": "avatar-abc123.jpg",
    "size": 245678,
    "uploadedAt": "2025-12-08T10:30:00Z"
  },
  "message": "File uploaded successfully"
}
```

**Error Responses:**

**400 Bad Request (No File):**
```json
{
  "success": false,
  "message": "No file provided",
  "error": "NO_FILE"
}
```

**400 Bad Request (File Too Large):**
```json
{
  "success": false,
  "message": "File size exceeds maximum limit of 10MB",
  "error": "FILE_TOO_LARGE"
}
```

**400 Bad Request (Invalid Type):**
```json
{
  "success": false,
  "message": "Invalid file type. Only JPEG, PNG, and WebP are allowed",
  "error": "INVALID_FILE_TYPE"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing token",
  "error": "UNAUTHORIZED"
}
```

**413 Payload Too Large:**
```json
{
  "success": false,
  "message": "Request entity too large",
  "error": "PAYLOAD_TOO_LARGE"
}
```

**500 Internal Server Error (Upload Failed):**
```json
{
  "success": false,
  "message": "Failed to upload file to cloud storage",
  "error": "UPLOAD_FAILED"
}
```

---

## 📊 Data Models

### UserProfile Model (Complete)

```typescript
interface UserProfile {
  // Common Fields (All Roles)
  name?: string;
  phone?: string;
  avatar?: string;

  // Admin-Specific Fields
  companyName?: string;
  companyWebsite?: string;
  companyDescription?: string;
  companyAddress?: string;
  companyLogoUrl?: string;

  // Management-Specific Fields
  buildingId?: string;
  managedBuildingIds?: string[];
  jobTitle?: string;
  department?: string;
  bio?: string;

  // Tenant-Specific Fields (Future)
  apartment?: string;
  floor?: string;
  tower?: string;
  emergencyContact?: string;
  emergencyPhone?: string;

  // Service Provider-Specific Fields (Future)
  serviceProviderId?: string;
  serviceProviderName?: string;
  specialties?: string[];
  certifications?: string[];
  rating?: number;
  completedJobs?: number;

  // Documents (Multiple Roles)
  emiratesId?: string;
  passportNumber?: string;
  attachments?: string[];
}
```

### User Model (Reference)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: "tenant" | "admin" | "super_admin" | "management" | "service_provider" | "employee" | "building_employee";
  phone?: string;
  status?: "active" | "inactive";
  profile?: UserProfile;  // ← Nested profile object
  profileCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## ✅ Validation Rules

### Role-Based Validation

The backend **MUST** validate required fields based on the user's role:

| Role | Required Fields | Validation Logic |
|------|----------------|------------------|
| **admin** | `companyName`, `phone` | If role = "admin" AND companyName is empty → Return 400 error |
| **management** | `name`, `phone`, `buildingId`, `managedBuildingIds` | If role = "management" AND any required field is empty → Return 400 error |
| **tenant** | `name`, `phone`, `buildingId`, `apartment`, `floor` | (Future implementation) |
| **service_provider** | `companyName`, `serviceProviderId`, `phone` | (Future implementation) |
| **employee** | `name`, `phone`, `buildingId`, `jobTitle` | (Future implementation) |

### Field-Level Validation

**Phone Numbers:**
```
- Format: Must start with "+"
- Length: 10-15 characters
- Example: +971501234567
- Regex: ^\+[1-9]\d{9,14}$
```

**URLs (companyWebsite, companyLogoUrl, avatar):**
```
- Must start with "http://" or "https://"
- Max length: 500 characters
- Example: https://example.com
```

**Email:**
```
- Must be valid email format
- Max length: 255 characters
- Example: user@example.com
```

**Text Fields (bio, companyDescription):**
```
- Max length: 2000 characters
- Allow multiline text
```

**Building IDs:**
```
- Must reference existing buildings in database
- Validate foreign key constraints
```

---

## ☁️ Cloud Storage Setup

### Recommended: AWS S3

#### Step 1: Create S3 Bucket

```bash
# Bucket name: towerdesk-profiles
# Region: us-east-1 (or closest to your users)
# Access: Public read, authenticated write
```

#### Step 2: Set Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::towerdesk-profiles/*"
    }
  ]
}
```

#### Step 3: Configure CORS

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```

#### Step 4: Folder Structure

```
towerdesk-profiles/
├── avatars/
│   ├── user-123_abc123.jpg
│   ├── user-456_def456.jpg
│   └── ...
├── logos/
│   ├── admin-1_xyz789.png
│   ├── admin-2_uvw012.png
│   └── ...
└── documents/
    ├── user-789_document1.pdf
    └── ...
```

#### Step 5: Generate URLs

**Format:**
```
https://{bucket-name}.s3.{region}.amazonaws.com/{folder}/{filename}

Example:
https://towerdesk-profiles.s3.us-east-1.amazonaws.com/avatars/user-123_abc123.jpg
```

---

### Alternative: Azure Blob Storage

#### Step 1: Create Storage Account

```bash
# Account name: towerdeskstorage
# Container name: profiles
# Access level: Blob (public read)
```

#### Step 2: Generate URLs

**Format:**
```
https://{account-name}.blob.core.windows.net/{container}/{filename}

Example:
https://towerdeskstorage.blob.core.windows.net/profiles/avatars/user-123.jpg
```

---

### Backend Implementation (C# Example)

```csharp
using Amazon.S3;
using Amazon.S3.Model;

[HttpPost("{id}/profile/upload")]
public async Task<IActionResult> UploadProfileFile(int id, IFormFile file)
{
    // 1. Validate file
    if (file == null || file.Length == 0)
        return BadRequest(new { success = false, message = "No file provided", error = "NO_FILE" });

    if (file.Length > 10 * 1024 * 1024) // 10MB
        return BadRequest(new { success = false, message = "File size exceeds 10MB", error = "FILE_TOO_LARGE" });

    var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
    if (!allowedTypes.Contains(file.ContentType))
        return BadRequest(new { success = false, message = "Invalid file type", error = "INVALID_FILE_TYPE" });

    // 2. Generate unique filename
    var fileExtension = Path.GetExtension(file.FileName);
    var uniqueFileName = $"user-{id}_{Guid.NewGuid()}{fileExtension}";
    var folderPath = "avatars"; // or "logos" for admin

    // 3. Upload to S3
    var s3Client = new AmazonS3Client("YOUR_ACCESS_KEY", "YOUR_SECRET_KEY", Amazon.RegionEndpoint.USEast1);

    var uploadRequest = new PutObjectRequest
    {
        BucketName = "towerdesk-profiles",
        Key = $"{folderPath}/{uniqueFileName}",
        InputStream = file.OpenReadStream(),
        ContentType = file.ContentType,
        CannedACL = S3CannedACL.PublicRead
    };

    try
    {
        await s3Client.PutObjectAsync(uploadRequest);
    }
    catch (Exception ex)
    {
        return StatusCode(500, new {
            success = false,
            message = "Failed to upload file",
            error = "UPLOAD_FAILED"
        });
    }

    // 4. Generate public URL
    var publicUrl = $"https://towerdesk-profiles.s3.us-east-1.amazonaws.com/{folderPath}/{uniqueFileName}";

    // 5. Return URL
    return Ok(new {
        success = true,
        data = new {
            url = publicUrl,
            filename = uniqueFileName,
            size = file.Length,
            uploadedAt = DateTime.UtcNow
        },
        message = "File uploaded successfully"
    });
}
```

---

## 🔒 Security Considerations

### Authentication & Authorization

1. **JWT Token Validation:**
   - All endpoints require valid JWT token
   - Token must contain user ID and role
   - Validate token signature and expiration

2. **User Ownership:**
   - Users can only update their OWN profile
   - Admin users should NOT be able to update other users' profiles via this endpoint
   - Check: `tokenUserId == pathUserId`

3. **Role-Based Access:**
   - Validate user role from token matches expected role
   - Apply role-specific validation rules

### File Upload Security

1. **File Type Validation:**
   - Check MIME type (Content-Type header)
   - Verify file signature (magic bytes) - don't trust extension
   - Block executable files (.exe, .sh, .bat)

2. **File Size Limits:**
   - Enforce 10MB limit at API level
   - Set nginx/IIS request size limit
   - Return proper error codes (413 Payload Too Large)

3. **File Name Sanitization:**
   - Generate unique filenames (don't use user-provided names)
   - Use UUID or GUID for uniqueness
   - Format: `user-{id}_{uuid}.{ext}`

4. **Virus Scanning (Recommended):**
   - Integrate ClamAV or similar
   - Scan files before uploading to cloud
   - Reject infected files

5. **Rate Limiting:**
   - Limit upload requests: 10 per user per minute
   - Prevent abuse and DoS attacks

---

## 🧪 Testing Guide

### Manual Testing with Postman

#### Test 1: Get Profile

```
GET http://16.171.240.211/api/User/1/profile
Headers:
  Authorization: Bearer {valid_token}

Expected: 200 OK with profile data
```

#### Test 2: Update Profile (Admin)

```
PUT http://16.171.240.211/api/User/1/profile
Headers:
  Authorization: Bearer {admin_token}
  Content-Type: application/json
Body:
{
  "companyName": "Test Company",
  "phone": "+971501234567",
  "companyWebsite": "https://test.com"
}

Expected: 200 OK with updated profile
```

#### Test 3: Update Profile (Validation Error)

```
PUT http://16.171.240.211/api/User/1/profile
Headers:
  Authorization: Bearer {admin_token}
  Content-Type: application/json
Body:
{
  "companyName": "",
  "phone": ""
}

Expected: 400 Bad Request with validation errors
```

#### Test 4: Upload File

```
POST http://16.171.240.211/api/User/1/profile/upload
Headers:
  Authorization: Bearer {valid_token}
Body (form-data):
  file: [Select a JPG file from your computer]

Expected: 200 OK with cloud URL
```

#### Test 5: Upload File (Too Large)

```
POST http://16.171.240.211/api/User/1/profile/upload
Headers:
  Authorization: Bearer {valid_token}
Body (form-data):
  file: [Select a file > 10MB]

Expected: 400 Bad Request with FILE_TOO_LARGE error
```

#### Test 6: Unauthorized Access

```
GET http://16.171.240.211/api/User/1/profile
Headers:
  Authorization: Bearer invalid_token

Expected: 401 Unauthorized
```

#### Test 7: Update Another User's Profile

```
PUT http://16.171.240.211/api/User/999/profile
Headers:
  Authorization: Bearer {token_for_user_1}
Body:
{
  "name": "Hacker"
}

Expected: 403 Forbidden
```

---

### Automated Test Cases

```csharp
[TestClass]
public class ProfileApiTests
{
    [TestMethod]
    public async Task GetProfile_ValidUser_ReturnsProfile()
    {
        // Arrange
        var userId = 1;
        var token = GenerateValidToken(userId);

        // Act
        var response = await _client.GetAsync($"/api/User/{userId}/profile", token);

        // Assert
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        var data = await response.Content.ReadAsAsync<ApiResponse>();
        Assert.IsTrue(data.Success);
        Assert.IsNotNull(data.Data);
    }

    [TestMethod]
    public async Task UpdateProfile_AdminWithoutCompanyName_ReturnsBadRequest()
    {
        // Arrange
        var userId = 1;
        var token = GenerateAdminToken(userId);
        var profileData = new { phone = "+971501234567" }; // Missing companyName

        // Act
        var response = await _client.PutAsync($"/api/User/{userId}/profile", profileData, token);

        // Assert
        Assert.AreEqual(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [TestMethod]
    public async Task UploadFile_ValidImage_ReturnsUrl()
    {
        // Arrange
        var userId = 1;
        var token = GenerateValidToken(userId);
        var fileContent = GenerateTestImage(); // 1MB JPEG

        // Act
        var response = await _client.PostAsync($"/api/User/{userId}/profile/upload", fileContent, token);

        // Assert
        Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
        var data = await response.Content.ReadAsAsync<ApiResponse>();
        Assert.IsTrue(data.Data.Url.StartsWith("https://"));
    }
}
```

---

## 📝 Database Schema

### Option 1: JSON Column (Recommended for MVP)

```sql
-- Add profile column to existing Users table
ALTER TABLE Users ADD profile NVARCHAR(MAX);

-- Add index for JSON queries (SQL Server 2016+)
CREATE INDEX idx_users_profile ON Users(profile);

-- Add profileCompleted flag
ALTER TABLE Users ADD profile_completed BIT DEFAULT 0;
```

**Example Row:**
```sql
INSERT INTO Users (id, email, name, role, phone, profile, profile_completed)
VALUES (
  1,
  'admin@example.com',
  'John Smith',
  'admin',
  '+971501234567',
  '{"companyName":"Test Company","companyWebsite":"https://test.com","companyLogoUrl":"https://storage.com/logo.jpg"}',
  1
);
```

---

### Option 2: Separate Profile Table (Better for Complex Queries)

```sql
CREATE TABLE UserProfiles (
  id INT PRIMARY KEY IDENTITY(1,1),
  user_id INT NOT NULL UNIQUE,

  -- Common fields
  name NVARCHAR(255),
  phone NVARCHAR(50),
  avatar NVARCHAR(500),

  -- Admin fields
  company_name NVARCHAR(255),
  company_website NVARCHAR(500),
  company_description NVARCHAR(2000),
  company_address NVARCHAR(1000),
  company_logo_url NVARCHAR(500),

  -- Management fields
  building_id INT,
  managed_building_ids NVARCHAR(MAX), -- JSON array
  job_title NVARCHAR(255),
  department NVARCHAR(255),
  bio NVARCHAR(2000),

  -- Tenant fields
  apartment NVARCHAR(50),
  floor NVARCHAR(50),
  tower NVARCHAR(50),
  emergency_contact NVARCHAR(255),
  emergency_phone NVARCHAR(50),

  -- Service Provider fields
  service_provider_id INT,
  service_provider_name NVARCHAR(255),
  specialties NVARCHAR(MAX), -- JSON array
  certifications NVARCHAR(MAX), -- JSON array
  rating DECIMAL(3,2),
  completed_jobs INT,

  -- Documents
  emirates_id NVARCHAR(50),
  passport_number NVARCHAR(50),
  attachments NVARCHAR(MAX), -- JSON array

  -- Timestamps
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),

  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (building_id) REFERENCES Buildings(id)
);

-- Create index on user_id for fast lookups
CREATE INDEX idx_user_profiles_user_id ON UserProfiles(user_id);
```

---

## 🚀 Implementation Checklist

### Phase 1: Profile Save (Priority: HIGH)

**Backend Tasks:**
- [ ] Set up database schema (Option 1 or Option 2)
- [ ] Create `GET /api/User/{id}/profile` endpoint
- [ ] Create `PUT /api/User/{id}/profile` endpoint
- [ ] Implement role-based validation (admin, management)
- [ ] Add JWT authentication middleware
- [ ] Add user ownership validation (users can only update their own profile)
- [ ] Test all endpoints with Postman
- [ ] Deploy to staging environment
- [ ] Share Postman collection with frontend team

**Estimated Time:** 1-2 days

---

### Phase 2: File Upload (Priority: HIGH)

**Backend Tasks:**
- [ ] Choose cloud storage provider (AWS S3 recommended)
- [ ] Create S3 bucket and configure permissions
- [ ] Install AWS SDK (or Azure SDK)
- [ ] Create `POST /api/User/{id}/profile/upload` endpoint
- [ ] Implement file validation (size, type)
- [ ] Implement upload to S3
- [ ] Generate and return public URLs
- [ ] Add rate limiting (10 uploads per minute per user)
- [ ] Test upload with Postman
- [ ] Test uploaded files are accessible via URL
- [ ] Deploy to staging environment

**Estimated Time:** 2-3 days

---

### Phase 3: Additional Roles (Priority: MEDIUM)

**Backend Tasks:**
- [ ] Add validation rules for tenant role
- [ ] Add validation rules for service provider role
- [ ] Add validation rules for employee role
- [ ] Test with all role types
- [ ] Update API documentation

**Estimated Time:** 1 day

---

## 📞 Contact & Support

### Frontend Team Contact
- **Blocked on:** Profile save functionality and file uploads
- **Frontend files affected:**
  - `lib/context/auth-context.tsx` (line 525 - updateProfile function)
  - `app/(admin)/profile.tsx` (line 103 - calls updateProfile)
  - `app/(management)/profile.tsx` (line 110 - calls updateProfile)
  - `components/ui/AttachmentPicker.tsx` (handles image picking)

### Questions?
- **Endpoint format unclear?** See examples in Testing Guide section
- **Validation rules unclear?** See Validation Rules section
- **Cloud storage setup help?** See Cloud Storage Setup section
- **Authentication issues?** See Security Considerations section

---

## 📦 Deliverables

When Phase 1 is complete, please provide:

1. ✅ Working API endpoints (deployed to staging)
2. ✅ Postman collection with example requests
3. ✅ Test user credentials for frontend team
4. ✅ API documentation URL (or this document updated)
5. ✅ Database migration scripts (if needed)

When Phase 2 is complete, please provide:

1. ✅ Upload endpoint working with test uploads
2. ✅ Example uploaded file URL that frontend can test
3. ✅ S3 bucket name and region (for debugging)
4. ✅ Updated Postman collection

---

## 🎯 Success Criteria

### Phase 1 Success:
- [ ] Frontend can call GET /api/User/{id}/profile and receive data
- [ ] Frontend can call PUT /api/User/{id}/profile and save data
- [ ] Data persists in database
- [ ] User can logout, login, and still see saved data
- [ ] Validation errors are returned correctly (400 status)
- [ ] Unauthorized access is blocked (401/403 status)

### Phase 2 Success:
- [ ] Frontend can upload image and receive cloud URL
- [ ] Cloud URL is publicly accessible
- [ ] Uploaded images appear correctly on all devices
- [ ] Large files are rejected with proper error
- [ ] Invalid file types are rejected
- [ ] Upload rate limiting works (prevents abuse)

---

**Document Version:** 1.0
**Last Updated:** December 8, 2025
**Status:** Ready for Implementation
**Priority:** 🔴 HIGH - Frontend team is blocked
