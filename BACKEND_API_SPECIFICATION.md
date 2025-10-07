# Backend API Specification for Binghatti Concierge App

**Document Version:** 1.0
**Date:** October 2, 2025
**Frontend Status:** Mock data implementation complete, ready for API integration

---

## Overview

This document specifies the REST API endpoints required for the Binghatti Concierge mobile app. The frontend is currently using mock data and is ready to integrate with real APIs.

**Base URL:** `https://1bnx.online/api`

**Authentication:** All requests require Bearer token authentication except login/register endpoints.

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {token}
```

---

## 1. Amenities Management

### 1.1 Get Amenities List

**Endpoint:** `GET /amenities`

**Query Parameters:**

- `building_id` (optional): Filter by building
- `amenity_type` (optional): pool|gym|sauna|theater|playground|bbq|other
- `status` (optional): active|maintenance|inactive

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "amenity-1",
      "buildingId": "building-1",
      "amenityType": "pool",
      "name": "Rooftop Swimming Pool",
      "description": "Olympic-sized pool with stunning city views",
      "capacity": 30,
      "operatingHours": {
        "monday": { "open": "06:00", "close": "22:00" },
        "tuesday": { "open": "06:00", "close": "22:00" }
      },
      "bookingDurationMinutes": 120,
      "maxAdvanceBookingDays": 14,
      "status": "active",
      "imageUrl": "https://cdn.example.com/pool.jpg",
      "createdAt": "2025-10-01T10:00:00Z",
      "updatedAt": "2025-10-01T10:00:00Z"
    }
  ]
}
```

### 1.2 Get Amenity by ID

**Endpoint:** `GET /amenities/{amenityId}`

**Response:** Same as single amenity object above

### 1.3 Get Amenity Availability (for booking slot selection)

**Endpoint:** `GET /amenities/{amenityId}/availability`

**Query Parameters:**

- `date` (required): YYYY-MM-DD format

**Response:**

```json
{
  "success": true,
  "data": {
    "amenityId": "amenity-1",
    "date": "2025-10-05",
    "slots": [
      {
        "startTime": "06:00",
        "endTime": "08:00",
        "available": true
      },
      {
        "startTime": "08:00",
        "endTime": "10:00",
        "available": false
      }
    ]
  }
}
```

---

## 2. Amenity Bookings

### 2.1 Create Booking

**Endpoint:** `POST /bookings`

**Request Body:**

```json
{
  "amenityId": "amenity-1",
  "slotDate": "2025-10-05",
  "slotTimeStart": "08:00",
  "slotTimeEnd": "10:00",
  "numberOfGuests": 4,
  "bookingNotes": "Family swimming session"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "booking-1",
    "amenityId": "amenity-1",
    "amenityName": "Rooftop Swimming Pool",
    "amenityType": "pool",
    "tenantId": "user-1",
    "buildingId": "building-1",
    "slotDate": "2025-10-05",
    "slotTimeStart": "08:00",
    "slotTimeEnd": "10:00",
    "status": "confirmed",
    "numberOfGuests": 4,
    "bookingNotes": "Family swimming session",
    "bookingCode": "POOL-20251005-001",
    "createdAt": "2025-10-02T10:00:00Z",
    "updatedAt": "2025-10-02T10:00:00Z"
  },
  "message": "Booking confirmed successfully"
}
```

### 2.2 Get User's Bookings

**Endpoint:** `GET /bookings`

**Query Parameters:**

- `status` (optional): pending|confirmed|cancelled|completed
- `amenityType` (optional): pool|gym|sauna|theater|etc.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "booking-1",
      "amenityId": "amenity-1",
      "amenityName": "Rooftop Swimming Pool",
      "amenityType": "pool",
      "tenantId": "user-1",
      "slotDate": "2025-10-05",
      "slotTimeStart": "08:00",
      "slotTimeEnd": "10:00",
      "status": "confirmed",
      "bookingCode": "POOL-20251005-001",
      "numberOfGuests": 4,
      "createdAt": "2025-10-02T10:00:00Z"
    }
  ]
}
```

### 2.3 Cancel Booking

**Endpoint:** `DELETE /bookings/{bookingId}`

**Request Body:**

```json
{
  "cancelledReason": "Change of plans"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Booking cancelled successfully"
}
```

---

## 3. Visitor Management

### 3.1 Register Visitor

**Endpoint:** `POST /visitors`

**Request Body:**

```json
{
  "visitorName": "Mohammed Hassan",
  "visitorPhone": "+971501234567",
  "visitorIdType": "national_id",
  "visitorIdNumber": "784-1990-1234567-1",
  "idPhotoUrl": "https://cdn.example.com/visitor-id.jpg",
  "visitPurpose": "Family visit",
  "expectedArrivalTime": "2025-10-05T14:00:00Z",
  "expectedDepartureTime": "2025-10-05T18:00:00Z",
  "unitNumber": "1205"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "visitor-1",
    "tenantId": "user-1",
    "buildingId": "building-1",
    "unitNumber": "1205",
    "visitorName": "Mohammed Hassan",
    "visitorPhone": "+971501234567",
    "visitorIdType": "national_id",
    "visitorIdNumber": "784-1990-1234567-1",
    "visitPurpose": "Family visit",
    "expectedArrivalTime": "2025-10-05T14:00:00Z",
    "expectedDepartureTime": "2025-10-05T18:00:00Z",
    "status": "expected",
    "visitorCode": "VST-20251005-001",
    "qrCodeUrl": "https://cdn.example.com/qr/VST-20251005-001.png",
    "createdAt": "2025-10-02T10:00:00Z"
  },
  "message": "Visitor registered successfully"
}
```

### 3.2 Get User's Visitors

**Endpoint:** `GET /visitors`

**Query Parameters:**

- `status` (optional): expected|arrived|departed|cancelled

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "visitor-1",
      "visitorName": "Mohammed Hassan",
      "visitorPhone": "+971501234567",
      "visitorCode": "VST-20251005-001",
      "status": "expected",
      "expectedArrivalTime": "2025-10-05T14:00:00Z",
      "expectedDepartureTime": "2025-10-05T18:00:00Z",
      "qrCodeUrl": "https://cdn.example.com/qr/VST-20251005-001.png",
      "createdAt": "2025-10-02T10:00:00Z"
    }
  ]
}
```

### 3.3 Cancel Visitor Registration

**Endpoint:** `DELETE /visitors/{visitorId}`

**Response:**

```json
{
  "success": true,
  "message": "Visitor registration cancelled successfully"
}
```

### 3.4 Check-in Visitor (Security Staff Only)

**Endpoint:** `PUT /visitors/{visitorId}/check-in`

**Request Body:**

```json
{
  "actualArrivalTime": "2025-10-05T14:05:00Z",
  "checkedInBy": "security-staff-1"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "visitor-1",
    "status": "arrived",
    "actualArrivalTime": "2025-10-05T14:05:00Z",
    "checkedInBy": "security-staff-1"
  },
  "message": "Visitor checked in successfully"
}
```

---

## 4. Ratings & Reviews

### 4.1 Submit Rating

**Endpoint:** `POST /ratings`

**Request Body:**

```json
{
  "requestId": "request-1",
  "serviceProviderId": "provider-1",
  "rating": 5,
  "reviewText": "Excellent service! Very professional and quick.",
  "attachments": [
    "https://cdn.example.com/rating-photo1.jpg",
    "https://cdn.example.com/rating-photo2.jpg"
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "rating-1",
    "tenantId": "user-1",
    "requestId": "request-1",
    "serviceProviderId": "provider-1",
    "rating": 5,
    "reviewText": "Excellent service! Very professional and quick.",
    "attachments": ["https://cdn.example.com/rating-photo1.jpg"],
    "createdAt": "2025-10-02T10:00:00Z"
  },
  "message": "Rating submitted successfully"
}
```

**Validation Rules:**

- Request must be in "completed" status
- User can only rate once per request
- Rating must be between 1-5

### 4.2 Get User's Ratings

**Endpoint:** `GET /ratings`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "rating-1",
      "requestId": "request-1",
      "requestTitle": "AC Repair",
      "serviceProviderId": "provider-1",
      "serviceProviderName": "CoolTech Services",
      "rating": 5,
      "reviewText": "Excellent service!",
      "attachments": [],
      "responseText": "Thank you for your feedback!",
      "responseDate": "2025-10-02T15:00:00Z",
      "createdAt": "2025-10-02T10:00:00Z"
    }
  ]
}
```

### 4.3 Get Rating by Request ID

**Endpoint:** `GET /ratings/request/{requestId}`

**Response:** Same as single rating object above

---

## 5. File Uploads

### 5.1 Upload Files (Attachments, Photos, etc.)

**Endpoint:** `POST /uploads`

**Content-Type:** `multipart/form-data`

**Form Data:**

- `files[]`: Array of files (max 10 files, max 10MB each)

**Response:**

```json
{
  "success": true,
  "data": {
    "urls": [
      "https://cdn.example.com/uploads/20251002_photo1.jpg",
      "https://cdn.example.com/uploads/20251002_photo2.jpg"
    ]
  }
}
```

**Supported File Types:**

- Images: jpg, jpeg, png, webp
- Max size: 10MB per file
- Images should be compressed and optimized automatically

---

## 6. Maintenance Requests (Enhanced)

### 6.1 Create Request with Attachments

**Endpoint:** `POST /requests`

**Request Body:**

```json
{
  "title": "AC not working",
  "description": "Living room AC stopped working",
  "type": "hvac",
  "priority": "high",
  "apartment": "1205",
  "tower": "Tower A",
  "contactPhone": "+971501234567",
  "attachments": [
    "https://cdn.example.com/uploads/ac-photo1.jpg",
    "https://cdn.example.com/uploads/ac-photo2.jpg"
  ]
}
```

**Note:** Attachments should be uploaded first using `/uploads` endpoint, then URLs included in request creation.

---

## Error Responses

All endpoints should return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**

- `UNAUTHORIZED`: 401 - Invalid or missing auth token
- `FORBIDDEN`: 403 - User doesn't have permission
- `NOT_FOUND`: 404 - Resource not found
- `VALIDATION_ERROR`: 400 - Invalid input data
- `CONFLICT`: 409 - Resource conflict (e.g., double booking)
- `SERVER_ERROR`: 500 - Internal server error

---

## Authentication & User Context

All endpoints automatically associate data with the authenticated user based on the Bearer token. The backend should:

1. Extract user ID from JWT token
2. Filter all GET requests to show only user's own data
3. Set `tenantId` automatically on all POST requests
4. Validate user has permission for UPDATE/DELETE operations

---

## Database Schema Requirements

### Amenities Table

```sql
CREATE TABLE amenities (
  id UUID PRIMARY KEY,
  building_id UUID NOT NULL,
  amenity_type VARCHAR(50),
  name VARCHAR(255),
  description TEXT,
  capacity INT,
  operating_hours JSON,
  booking_duration_minutes INT,
  max_advance_booking_days INT,
  status VARCHAR(20),
  image_url VARCHAR(512),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Amenity Bookings Table

```sql
CREATE TABLE amenity_bookings (
  id UUID PRIMARY KEY,
  amenity_id UUID REFERENCES amenities(id),
  tenant_id UUID REFERENCES users(id),
  building_id UUID,
  slot_date DATE,
  slot_time_start TIME,
  slot_time_end TIME,
  status VARCHAR(20),
  number_of_guests INT,
  booking_notes TEXT,
  booking_code VARCHAR(50) UNIQUE,
  cancelled_reason TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(amenity_id, slot_date, slot_time_start)
);
```

### Visitors Table

```sql
CREATE TABLE visitors (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES users(id),
  building_id UUID,
  unit_number VARCHAR(50),
  visitor_name VARCHAR(255),
  visitor_phone VARCHAR(50),
  visitor_id_type VARCHAR(50),
  visitor_id_number VARCHAR(100),
  id_photo_url VARCHAR(512),
  visit_purpose TEXT,
  expected_arrival_time TIMESTAMP,
  expected_departure_time TIMESTAMP,
  actual_arrival_time TIMESTAMP,
  actual_departure_time TIMESTAMP,
  status VARCHAR(20),
  visitor_code VARCHAR(50) UNIQUE,
  qr_code_url VARCHAR(512),
  checked_in_by UUID,
  checked_out_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Ratings Table

```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES users(id),
  request_id UUID REFERENCES requests(id),
  service_provider_id UUID,
  building_employee_id UUID,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  attachments JSON,
  response_text TEXT,
  response_date TIMESTAMP,
  responded_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(tenant_id, request_id)
);
```

---

## Integration Notes for Backend Developer

1. **Current Frontend State:**

   - All screens are built and working with mock data
   - Context providers are ready to consume real APIs
   - API service layer exists at `lib/services/api/`

2. **Priority Order:**

   - Start with Amenities & Bookings (most requested feature)
   - Then Visitors Management
   - Then Ratings & Reviews
   - File uploads can be done in parallel

3. **Testing:**

   - Postman collection recommended for API testing
   - Frontend team can start integration testing as soon as staging APIs are available
   - Use test data that matches mock data structure for easier validation

4. **Deployment:**

   - Stage backend at `https://staging.1bnx.online/api` first
   - Frontend has environment configuration to switch between mock/staging/production
   - Production deployment after frontend integration testing is complete

5. **CORS Configuration:**
   - Allow origin: `exp://` (for Expo development)
   - Allow origin: Production app domains
   - Allow credentials: true
   - Allow headers: Authorization, Content-Type

---

## Questions for Backend Developer?

**Contact:** Frontend Team via Whatsapp or email

**Expected Timeline:** 2-3 weeks for full backend implementation and integration

---

_End of Backend API Specification_
