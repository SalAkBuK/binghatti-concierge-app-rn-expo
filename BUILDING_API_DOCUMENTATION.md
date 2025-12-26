# Building API Documentation

## Overview
This document tracks the Building API integration status and lists missing parameters that need to be added by the backend team.

**Base URL**: `http://16.171.240.211/api`
**API Prefix**: `/Buildings`

---

## Current Backend API Structure

### Response Format
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "string",
    "address": "string",
    "city": "string",
    "unintsCount": 2147483647,  // ⚠️ TYPO: Should be "unitsCount"
    "isActive": true,
    "createdAt": "2025-12-08T13:38:28.6565463"
  }
}
```

### Create Building Endpoint
**POST** `/Buildings/create`

**Current Payload**:
```json
{
  "name": "string",
  "address": "string",
  "city": "string",
  "unitsCount": 159
}
```

### Update Building Endpoint
**PUT** `/Buildings/update/{id}`

**Current Payload**:
```json
{
  "name": "string",
  "address": "string",
  "city": "string",
  "unitsCount": 2147483647
}
```

### Get All Buildings
**GET** `/Buildings/getall`

Returns array of buildings with the structure shown above.

---

## Missing Parameters

### Critical Fields (Required for MVP)

| Field | Type | Description | Priority |
|-------|------|-------------|----------|
| `country` | string | Country (e.g., "UAE") | **HIGH** |
| `occupiedUnits` | number | Number of occupied units | **HIGH** |
| `status` | enum | Building status: "active" \| "maintenance" \| "inactive" | **HIGH** |
| `updatedAt` | string (ISO) | Last update timestamp | **HIGH** |

### UAE-Specific Location Fields (Important for Dubai/UAE market)

| Field | Type | Description | Priority |
|-------|------|-------------|----------|
| `emirate` | string | Dubai, Abu Dhabi, Sharjah, Ajman, UAQ, RAK, Fujairah | **MEDIUM** |
| `community` | string | E.g., Dubai Marina, Downtown Dubai, JBR | **MEDIUM** |
| `street` | string | Street name | **MEDIUM** |
| `plotNumber` | string | Plot number | **LOW** |
| `buildingNumber` | string | Building number | **LOW** |
| `makaniNumber` | string | Dubai's smart addressing system | **LOW** |

### Building Details

| Field | Type | Description | Priority |
|-------|------|-------------|----------|
| `buildingType` | enum | "residential" \| "commercial" \| "mixed" | **MEDIUM** |
| `developer` | string | Developer name | **LOW** |
| `yearBuilt` | number | Year constructed | **LOW** |
| `totalFloors` | number | Total number of floors | **MEDIUM** |
| `utilityPremisesNumber` | string | DEWA/FEWA/ADDC premises number | **LOW** |

### Management & Configuration

| Field | Type | Description | Priority |
|-------|------|-------------|----------|
| `managerId` | string | Building manager user ID | **HIGH** |
| `managerName` | string | Building manager name | **MEDIUM** |
| `unitBreakdown` | object | Breakdown of unit types | **LOW** |
| `amenities` | string[] | Array of amenity IDs | **MEDIUM** |
| `location` | string | GPS coordinates or map location | **LOW** |

---

## Data Type Mismatches

### Issues to Fix

1. **ID Type Mismatch**
   - Backend: `number`
   - Frontend: `string`
   - **Action**: Backend should return ID as string or frontend should convert

2. **Field Name Typo**
   - Backend: `unintsCount` ❌
   - Should be: `unitsCount` ✅

3. **Status Format**
   - Backend: `isActive: boolean`
   - Frontend: `status: "active" | "maintenance" | "inactive"`
   - **Action**: Backend should return status enum instead of boolean

4. **Units Count Field Name**
   - Backend: `unintsCount` (typo) or `unitsCount`
   - Frontend: `totalUnits`
   - **Recommendation**: Use `totalUnits` for clarity

---

## Frontend Expectations

The frontend `Building` interface expects:

```typescript
interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;

  // UAE-specific
  emirate?: string;
  community?: string;
  street?: string;
  plotNumber?: string;
  buildingNumber?: string;
  makaniNumber?: string;

  // Building details
  buildingType?: BuildingType;
  developer?: string;
  yearBuilt?: number;
  totalFloors?: number;
  utilityPremisesNumber?: string;

  // Management
  managerId?: string;
  managerName?: string;
  totalUnits: number;
  occupiedUnits: number;
  unitBreakdown?: UnitBreakdown;
  amenities: string[];

  // Status & metadata
  status: "active" | "maintenance" | "inactive";
  createdAt: string;
  updatedAt: string;
  location?: string;
  units?: BuildingUnit[];
}
```

---

## Temporary Frontend Solution

Until backend adds missing fields, the frontend will:

1. **Map backend fields** to frontend format using mappers
2. **Provide default values** for missing required fields:
   - `country`: "UAE" (default)
   - `occupiedUnits`: 0 (default)
   - `status`: Map from `isActive` boolean
   - `updatedAt`: Use `createdAt` if missing
   - `amenities`: Empty array
   - `totalUnits`: Map from `unintsCount` (with typo)

3. **Convert ID** from number to string

4. **Handle typo** in `unintsCount` field

---

## Implementation Status

- ✅ Create Building - Integrated (limited fields)
- ✅ Update Building - Integrated (limited fields)
- ✅ Get All Buildings - Integrated with mappers
- ⏳ Get Building by ID - Pending backend endpoint
- ⏳ Delete Building - Pending backend endpoint

---

## Next Steps for Backend Team

### Immediate (HIGH Priority)
1. Fix typo: `unintsCount` → `unitsCount`
2. Add `country` field (string)
3. Add `occupiedUnits` field (number)
4. Change `isActive` to `status` enum
5. Add `updatedAt` timestamp

### Short Term (MEDIUM Priority)
6. Add UAE location fields (emirate, community)
7. Add `buildingType` enum
8. Add `managerId` and `managerName`
9. Add `amenities` array
10. Add `totalFloors` field

### Long Term (LOW Priority)
11. Add detailed UAE addressing (makani, plot, building number)
12. Add developer information
13. Add utility premises number
14. Add unit breakdown object
15. Add GPS location/coordinates

---

## Curl Examples (Current Implementation)

### Create Building
```bash
curl -X 'POST' \
  'http://16.171.240.211/api/Buildings/create' \
  -H 'accept: */*' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Burj Vista Tower",
  "address": "Downtown Dubai",
  "city": "Dubai",
  "unitsCount": 240
}'
```

### Update Building
```bash
curl -X 'PUT' \
  'http://16.171.240.211/api/Buildings/update/1' \
  -H 'accept: */*' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Burj Vista Tower A",
  "address": "Downtown Dubai, Mohammed Bin Rashid Boulevard",
  "city": "Dubai",
  "unitsCount": 240
}'
```

### Get All Buildings
```bash
curl -X 'GET' \
  'http://16.171.240.211/api/Buildings/getall' \
  -H 'accept: */*'
```

---

**Last Updated**: 2025-12-13
**Status**: In Development - Partial Integration
**Contact**: Backend Team for parameter additions
