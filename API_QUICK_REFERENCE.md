# API Quick Reference - User Creation

## Endpoint
```
POST http://16.171.240.211/api/Admin/create
```

## Request
```json
{
  "fullName": "Ahmed Al-Mansoori",
  "email": "ahmed@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+971501234567",
  "address": "Unit 502, Tower A, Dubai Marina, Dubai",
  "nationality": "UAE"
}
```

## Response (Success)
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid-here",
    "fullName": "Ahmed Al-Mansoori",
    "email": "ahmed@example.com",
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

## Response (Error)
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Email is already registered"
}
```

## Field Requirements

| Field | Required | Example |
|-------|----------|---------|
| fullName | ✅ Yes | "Ahmed Al-Mansoori" |
| email | ✅ Yes | "ahmed@example.com" |
| password | ✅ Yes | "SecurePass123!" (min 8 chars) |
| phoneNumber | ✅ Yes | "+971501234567" |
| address | ✅ Yes | "Unit 502, Tower A, Dubai Marina" |
| nationality | ✅ Yes | "UAE" or "AE" |

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 201 | User created successfully |
| 400 | Validation error (invalid input) |
| 401 | Unauthorized (invalid/expired token) |
| 403 | Forbidden (insufficient permissions) |
| 409 | Conflict (duplicate email) |
| 500 | Server error |

## Authorization Header
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Common Validation Errors

- **Email already exists** → Change email
- **Password too weak** → Min 8 chars, uppercase, lowercase, number
- **Invalid phone format** → Use +971XXXXXXXXX format
- **Missing required field** → Check all 6 fields are provided

## Permission Rules

- ✅ **Super Admin** can create: Admin, Management, Tenant, Service Provider, Employee
- ✅ **Admin** can create: Management, Tenant, Service Provider, Employee
- ❌ **Admin** CANNOT create: Admin users (403 Forbidden)
- ❌ Nobody can create: Super Admin users (prohibited)

## Testing with cURL

```bash
curl -X POST http://16.171.240.211/api/Admin/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "fullName": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "phoneNumber": "+971501234567",
    "address": "Test Address, Dubai, UAE",
    "nationality": "UAE"
  }'
```

## Common UAE Nationalities

| Code | Country |
|------|---------|
| AE | United Arab Emirates |
| IN | India |
| PK | Pakistan |
| BD | Bangladesh |
| PH | Philippines |
| EG | Egypt |
| SA | Saudi Arabia |

---

See [SUPERADMIN_USER_CREATE_API.md](./SUPERADMIN_USER_CREATE_API.md) for full documentation.
