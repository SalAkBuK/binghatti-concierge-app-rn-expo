# Super Admin - Create Admin User API

## Overview
This document specifies the API endpoint for creating **admin users** from the Super Admin interface in Tower Desk mobile app.

## Authorization
- **Required Role**: `super_admin`
- **Restriction**: Only Super Admins can create admin users. Regular admins cannot create other admin users.
- **Security**: Backend MUST validate the requesting user has `super_admin` role before allowing admin user creation.

## Endpoint

```
POST /api/Admin/create
```

## Request Headers

```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

## Request Body

The frontend sends the following 3 core fields for admin user creation:

```json
{
  "fullName": "string",
  "email": "string",
  "phoneNumber": "string"
}
```

### Field Specifications

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `fullName` | string | **Yes** | Full name of the admin user | "Ahmed Hassan" |
| `email` | string | **Yes** | Email address (used for login) | "ahmed.hassan@towerdesk.com" |
| `phoneNumber` | string | **Yes** | Phone number with country code | "+971501234567" |

### Field Mapping (Frontend → Backend)

The frontend uses different field names internally but maps them to backend format:

- Frontend `name` → Backend `fullName`
- Frontend `email` → Backend `email`
- Frontend `phone` → Backend `phoneNumber`

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "string",
    "fullName": "string",
    "email": "string",
    "phoneNumber": "string",
    "role": "admin",
    "status": "active",
    "createdAt": "2025-12-13T10:30:00Z",
    "updatedAt": "2025-12-13T10:30:00Z"
  },
  "message": "Admin user created successfully"
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Permission denied: Only super administrators can create admin users"
}
```

#### 409 Conflict
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "fullName": "Full name is required",
    "email": "Invalid email format",
    "phoneNumber": "Invalid phone number format"
  }
}
```

## Business Rules

1. **Role Assignment**:
   - The created user is automatically assigned the `admin` role
   - Role is NOT sent from frontend - backend should set it to `admin`

2. **Initial Password**:
   - Backend should generate a temporary password
   - Send password reset email to the new admin user
   - OR return the temporary password in the response for manual communication

3. **Email Uniqueness**:
   - Email must be unique across all users in the system
   - Return 409 Conflict if email already exists

4. **Phone Format**:
   - Accept international format with country code
   - Example: `+971501234567` (UAE format)

5. **Default Status**:
   - New admin users should be created with `status: "active"`

6. **Authorization Check**:
   - Backend MUST verify the requesting user's token has `role: "super_admin"`
   - Regular admins attempting this endpoint should receive 403 Forbidden

## Example Usage

### cURL Request

```bash
curl -X POST https://1bnx.online/api/Admin/create \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Ahmed Hassan",
    "email": "ahmed.hassan@towerdesk.com",
    "phoneNumber": "+971501234567"
  }'
```

### JavaScript/TypeScript Request

```typescript
const response = await fetch('https://1bnx.online/api/Admin/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fullName: 'Ahmed Hassan',
    email: 'ahmed.hassan@towerdesk.com',
    phoneNumber: '+971501234567'
  })
});

const result = await response.json();
```

## Frontend Implementation Reference

- **UI Component**: `app/(admin)/users/_components/CreateUserModal/index.tsx`
- **API Service**: `lib/services/api/admin.ts` (line 82-123)
- **Field Mapper**: `lib/services/api/mappers.ts` (line 39-49)
- **Role Constants**: `app/(admin)/users/_constants.ts` (line 15-20)

## Notes

- The frontend form collects only **Name**, **Email**, and **Phone** for admin creation
- Additional fields (address, nationality, password) are optional and not currently used for admin user creation
- The mapper function (`mapCreateUserToApi`) handles field name conversion automatically
- Super Admin users cannot create other Super Admin users - this is blocked at the frontend level
