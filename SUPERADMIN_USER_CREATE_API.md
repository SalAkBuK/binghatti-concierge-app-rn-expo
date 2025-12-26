# Super Admin User Creation API Specification

**Version:** 1.0
**Last Updated:** 2025-12-10
**Base URL:** `http://16.171.240.211/api`

---

## Overview

This document specifies the API endpoint for creating new users (admin, management, service_provider, employee, tenant) by Super Admin users. This endpoint is called from the mobile app when admins create users through the Admin User Management screen.

**Important Notes:**
- Only Super Admin users can create Admin-level users
- Regular Admin users can create all other role types (management, tenant, service_provider, employee)
- Super Admin user creation is prohibited (even for Super Admins)

---

## Endpoint: Create User

### HTTP Request

```http
POST /api/Admin/create
Content-Type: application/json
Authorization: Bearer {jwt_token}
```

### Request Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `Authorization` | string | ✅ Yes | JWT token from authenticated user. Format: `Bearer {token}` |
| `Content-Type` | string | ✅ Yes | Must be `application/json` |

### Request Body

```json
{
  "fullName": "string",
  "email": "string",
  "password": "string",
  "phoneNumber": "string",
  "address": "string",
  "nationality": "string"
}
```

### Request Body Parameters

| Parameter | Type | Required | Constraints | Description |
|-----------|------|----------|-------------|-------------|
| `fullName` | string | ✅ Yes | Min: 2 chars<br>Max: 100 chars | User's full name (e.g., "Ahmed Mohammed Al-Hashimi") |
| `email` | string | ✅ Yes | Valid email format<br>Must be unique | User's email address. Used for login credentials. |
| `password` | string | ✅ Yes | Min: 8 chars<br>Should contain: uppercase, lowercase, number | Initial password for the user. User can change later. |
| `phoneNumber` | string | ✅ Yes | Format: `+971XXXXXXXXX`<br>Min: 10 chars | User's phone number with country code (UAE: +971) |
| `address` | string | ✅ Yes | Min: 5 chars<br>Max: 500 chars | Full physical address (e.g., "Unit 502, Tower A, Dubai Marina, Dubai") |
| `nationality` | string | ✅ Yes | ISO 3166-1 alpha-2 code or full name | User's nationality (e.g., "AE", "UAE", "United Arab Emirates", "IN", "India") |

---

## Response Formats

### Success Response (HTTP 201 Created)

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid-string-here",
    "fullName": "Ahmed Mohammed Al-Hashimi",
    "email": "ahmed.alhashimi@example.com",
    "phoneNumber": "+971501234567",
    "address": "Unit 502, Tower A, Dubai Marina, Dubai",
    "nationality": "UAE",
    "role": "admin",
    "status": "active",
    "createdAt": "2025-12-10T10:30:00Z",
    "updatedAt": "2025-12-10T10:30:00Z"
  }
}
```

### Response Object Structure

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for successful requests |
| `message` | string | Human-readable success message |
| `data` | object | The created user object |
| `data.id` | string (UUID) | Unique identifier for the user |
| `data.fullName` | string | User's full name (as provided) |
| `data.email` | string | User's email (as provided) |
| `data.phoneNumber` | string | User's phone number (as provided) |
| `data.address` | string | User's address (as provided) |
| `data.nationality` | string | User's nationality (as provided) |
| `data.role` | string | User's role. For this endpoint, typically returns `"admin"` but could be any role based on your backend logic |
| `data.status` | string | User status: `"active"` or `"inactive"` |
| `data.createdAt` | string (ISO 8601) | Timestamp when user was created |
| `data.updatedAt` | string (ISO 8601) | Timestamp of last update |

---

## Error Responses

### Validation Error (HTTP 400 Bad Request)

```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Invalid input data",
  "details": {
    "email": ["Email is already registered"],
    "phoneNumber": ["Phone number must start with country code"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

### Unauthorized (HTTP 401 Unauthorized)

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### Forbidden (HTTP 403 Forbidden)

```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Only Super Admin users can create Admin accounts"
}
```

**When this occurs:**
- Regular Admin user tries to create an Admin-level user
- Only Super Admin should be able to create Admin users

### Duplicate User (HTTP 409 Conflict)

```json
{
  "success": false,
  "error": "Duplicate entry",
  "message": "A user with this email already exists",
  "details": {
    "field": "email",
    "value": "ahmed.alhashimi@example.com",
    "existingUserId": "existing-uuid-here"
  }
}
```

### Internal Server Error (HTTP 500 Internal Server Error)

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred while creating the user"
}
```

---

## Error Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `false` for errors |
| `error` | string | Error type/category |
| `message` | string | Human-readable error message |
| `details` | object (optional) | Additional error details (e.g., validation errors per field) |

---

## Request Examples

### Example 1: Create Admin User (Super Admin Only)

```bash
curl -X POST http://16.171.240.211/api/Admin/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "fullName": "Ahmed Al-Mansoori",
    "email": "ahmed.mansoori@binghatti.com",
    "password": "SecurePass123!",
    "phoneNumber": "+971501234567",
    "address": "Office 201, Business Bay, Dubai, UAE",
    "nationality": "UAE"
  }'
```

### Example 2: Create Management User

```bash
curl -X POST http://16.171.240.211/api/Admin/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "fullName": "Sarah Johnson",
    "email": "sarah.johnson@towerdesk.com",
    "password": "Manager2025!",
    "phoneNumber": "+971507654321",
    "address": "Marina Tower, Dubai Marina, Dubai",
    "nationality": "GB"
  }'
```

### Example 3: Create Tenant User

```bash
curl -X POST http://16.171.240.211/api/Admin/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "fullName": "Rajesh Kumar",
    "email": "rajesh.kumar@gmail.com",
    "password": "TenantPass123",
    "phoneNumber": "+971551234567",
    "address": "Unit 1205, Binghatti Grand Tower, Dubai Marina, Dubai",
    "nationality": "IN"
  }'
```

---

## Validation Rules

### Email
- ✅ Must be valid email format (RFC 5322)
- ✅ Must be unique across all users
- ✅ Case-insensitive uniqueness check
- ✅ Max length: 255 characters
- ❌ Cannot contain spaces or special characters except `@`, `.`, `_`, `-`, `+`

### Password
- ✅ Minimum 8 characters
- ✅ Must contain at least one uppercase letter
- ✅ Must contain at least one lowercase letter
- ✅ Must contain at least one number
- ✅ Recommended: Special character
- ❌ Cannot be common passwords (e.g., "password123", "admin123")

### Phone Number
- ✅ Must start with country code (e.g., +971 for UAE)
- ✅ Valid formats: `+971501234567`, `+971 50 123 4567`
- ✅ Minimum 10 digits (after removing spaces/dashes)
- ✅ Should be unique (recommended, not enforced)

### Full Name
- ✅ Minimum 2 characters
- ✅ Maximum 100 characters
- ✅ Can contain letters, spaces, hyphens, apostrophes
- ✅ Supports Unicode (Arabic, Hindi, etc.)

### Address
- ✅ Minimum 5 characters
- ✅ Maximum 500 characters
- ✅ Should include: unit/apartment, building, area, city

### Nationality
- ✅ ISO 3166-1 alpha-2 code (e.g., "AE", "IN", "GB")
- ✅ OR full country name (e.g., "United Arab Emirates", "India")
- ✅ Case-insensitive

**Common UAE Nationalities:**
| Code | Full Name |
|------|-----------|
| AE | United Arab Emirates |
| IN | India |
| PK | Pakistan |
| BD | Bangladesh |
| PH | Philippines |
| GB | United Kingdom |
| US | United States |
| EG | Egypt |
| SA | Saudi Arabia |

---

## Authorization & Permissions

### JWT Token Requirements

The JWT token must contain:
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "super_admin" or "admin",
  "exp": 1734692400
}
```

### Permission Matrix

| Requester Role | Can Create Admin | Can Create Management | Can Create Tenant | Can Create Service Provider | Can Create Employee |
|----------------|------------------|----------------------|-------------------|----------------------------|---------------------|
| **super_admin** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **admin** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **management** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |
| **tenant** | ❌ No | ❌ No | ❌ No | ❌ No | ❌ No |

### Backend Validation Requirements

**The backend MUST:**
1. Verify JWT token is valid and not expired
2. Extract `role` from JWT claims
3. If creating an `"admin"` role user:
   - Check if requester role is `"super_admin"`
   - If not, return `403 Forbidden`
4. Hash password before storing (bcrypt, Argon2, or similar)
5. Generate unique user ID (UUID v4 recommended)
6. Set user status to `"active"` by default
7. Store timestamps in UTC

---

## Database Schema Expectations

The backend should store users with at least these fields:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- Never store plain password
  phone_number VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  nationality VARCHAR(50) NOT NULL,
  role VARCHAR(50) DEFAULT 'tenant',  -- 'super_admin', 'admin', 'management', 'tenant', etc.
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'inactive'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

---

## Security Considerations

### Password Storage
- ❌ **NEVER** store passwords in plain text
- ✅ Use bcrypt (cost factor 12+) or Argon2id
- ✅ Salt passwords automatically (handled by bcrypt/Argon2)

### Rate Limiting
- Implement rate limiting on user creation endpoint
- Recommended: 10 requests per minute per IP
- Prevent automated account creation attacks

### Email Verification (Optional for MVP)
For production, consider:
- Sending verification email after user creation
- User cannot login until email is verified
- Verification token expires after 24 hours

### Audit Logging
Log user creation events:
```json
{
  "event": "user_created",
  "timestamp": "2025-12-10T10:30:00Z",
  "actor": {
    "userId": "super-admin-uuid",
    "email": "superadmin@example.com",
    "role": "super_admin"
  },
  "target": {
    "userId": "new-user-uuid",
    "email": "newuser@example.com",
    "role": "admin"
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Tower Desk Mobile/1.0"
}
```

---

## Testing Checklist

### Functional Tests

- [ ] **Happy Path:** Valid request creates user successfully
- [ ] **Duplicate Email:** Returns 409 when email already exists
- [ ] **Invalid Email:** Returns 400 for malformed email
- [ ] **Weak Password:** Returns 400 if password doesn't meet requirements
- [ ] **Missing Field:** Returns 400 if required field is missing
- [ ] **Invalid Phone:** Returns 400 for invalid phone format
- [ ] **Permission Check:** Admin cannot create Admin users (403)
- [ ] **Super Admin:** Can create Admin users successfully
- [ ] **Token Expired:** Returns 401 for expired JWT
- [ ] **Invalid Token:** Returns 401 for malformed JWT
- [ ] **No Token:** Returns 401 when Authorization header missing

### Security Tests

- [ ] Password is hashed before storage (not plain text)
- [ ] Email uniqueness is case-insensitive
- [ ] SQL injection attempts are blocked
- [ ] XSS payloads in name/address are sanitized
- [ ] Rate limiting prevents abuse (10 req/min)

### Edge Cases

- [ ] Email with special characters (e.g., `user+test@example.com`)
- [ ] Name with Unicode characters (Arabic, Hindi, Chinese)
- [ ] Very long address (500 chars)
- [ ] Phone number with various formats (`+971 50 123 4567`, `+971501234567`)
- [ ] Nationality as code ("AE") vs full name ("United Arab Emirates")

---

## Mobile App Integration Notes

### Frontend Flow

1. User fills out CreateUserModal form
2. Form data mapped from frontend DTO to API DTO:
   ```typescript
   // Frontend sends (for backward compatibility)
   { name: "John", phone: "+971..." }

   // Mapper transforms to
   { fullName: "John", phoneNumber: "+971..." }
   ```
3. API call made to `/api/Admin/create`
4. Response handled:
   - Success: Show "User created successfully" alert
   - Error: Show specific error message to user

### Frontend Files Involved

- [app/(admin)/users/index.tsx:154-245](app/(admin)/users/index.tsx) - User creation logic
- [lib/services/api/admin.ts:82-123](lib/services/api/admin.ts) - API service method
- [lib/services/api/mappers.ts:39-49](lib/services/api/mappers.ts) - DTO mapper
- [lib/types/index.ts:1192-1246](lib/types/index.ts) - Type definitions

---

## Future Enhancements (Post-MVP)

### Role Assignment
Currently, the endpoint doesn't accept a `role` parameter. Consider adding:

```json
{
  "fullName": "...",
  "email": "...",
  "password": "...",
  "phoneNumber": "...",
  "address": "...",
  "nationality": "...",
  "role": "admin",  // 👈 New field
  "buildingId": "uuid",  // 👈 For management/tenant roles
  "profile": {  // 👈 Extended profile data
    "apartment": "502",
    "tower": "A",
    "floor": "5"
  }
}
```

### Bulk Import
Add endpoint for CSV bulk import:
```http
POST /api/Admin/bulk-create
Content-Type: multipart/form-data

file: users.csv
```

### User Invitation Flow
Instead of setting password immediately:
1. Admin creates user without password
2. System sends invitation email
3. User sets their own password via link

---

## Contact & Support

**Questions about this API?**
- Mobile App Developer: [Your Name]
- Backend Developer: [Backend Dev Name]
- API Base URL: `http://16.171.240.211/api`

**Related Documentation:**
- [User Update API](./UPDATE_USER_API.md)
- [User Delete API](./DELETE_USER_API.md)
- [Authentication API](./AUTH_API.md)

---

**Document Version History:**
- v1.0 (2025-12-10): Initial specification
