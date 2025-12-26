# Create New Building API Documentation

This document outlines the building creation functionality in the Tower Desk admin portal, providing complete specifications for backend API implementation.

**Last Updated**: December 8, 2025

---

## Overview

The Create New Building feature allows admins to register new buildings into the Tower Desk platform. The frontend form collects comprehensive building information organized into 6 sections.

**Frontend Location**: `app/(admin)/buildings/_components/CreateBuildingModal.tsx`

---

## Frontend Form Structure

### Section 1: Basic Information (Required)

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | `string` | ✅ Yes | Building name | "Binghatti Tower A", "Marina Heights" |
| `buildingType` | `enum` | ✅ Yes | Type of building | `residential`, `commercial`, `mixed_use`, `hospitality` |
| `developer` | `string` | No | Developer/builder name | "Emaar", "Damac", "Binghatti" |
| `yearBuilt` | `number` | No | Year of construction | `2024`, `2023` |
| `totalFloors` | `number` | No | Number of floors | `25`, `40` |

### Section 2: Location Details (UAE-Specific)

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `emirate` | `string` | ✅ Yes | UAE Emirate | "Dubai", "Abu Dhabi", "Sharjah", etc. |
| `community` | `string` | ✅ Yes | Community/District | "Dubai Marina", "Downtown Dubai", "JBR" |
| `street` | `string` | No | Street/road name | "Sheikh Zayed Road", "Al Wasl Road" |
| `plotNumber` | `string` | No | Land plot number | "123-456" |
| `buildingNumber` | `string` | No | Building identifier | "45" |
| `makaniNumber` | `string` | No | Dubai smart address (Dubai only) | "1234567890" |

**Note**: The form currently sets these location fields (used in Building type but not in form):
- `address`: Full address string (generated from other fields)
- `city`: Inferred from emirate
- `country`: "United Arab Emirates"

### Section 3: Utilities & Registration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `utilityPremisesNumber` | `string` | No | DEWA/FEWA/ADDC utility account number |

### Section 4: Capacity

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `totalUnits` | `number` | ✅ Yes | Total number of units in building |

**Unit Breakdown** (Optional - nested object):
| Field | Type | Description |
|-------|------|-------------|
| `studios` | `number` | Number of studio units |
| `oneBedroom` | `number` | Number of 1-bedroom units |
| `twoBedroom` | `number` | Number of 2-bedroom units |
| `threeBedroom` | `number` | Number of 3-bedroom units |
| `fourPlusBedroom` | `number` | Number of 4+ bedroom units |
| `commercial` | `number` | Number of commercial units |

### Section 5: Amenities

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amenities` | `string[]` | No | Array of amenity IDs | `["gym", "pool", "parking"]` |

**Available Amenity Options** (from frontend):
- Swimming Pool (`pool`)
- Gym / Fitness Center (`gym`)
- Parking (`parking`)
- Security (`security`)
- Concierge (`concierge`)
- Play Area (`play_area`)
- BBQ Area (`bbq_area`)
- Meeting Room (`meeting_room`)
- Cinema Room (`cinema`)
- Sauna / Steam Room (`sauna`)
- Spa (`spa`)
- Squash Court (`squash`)
- Tennis Court (`tennis`)
- Basketball Court (`basketball`)

### Section 6: Management

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `managerId` | `string` | No | User ID of assigned building manager |

---

## Recommended Backend API Endpoint

### `POST /api/Building/create`

**Content-Type**: `application/json`

**Authentication**: Required (Admin or Super Admin only)

---

## Request Payload

### Minimum Required Payload

```json
{
  "name": "string",
  "buildingType": "residential|commercial|mixed_use|hospitality",
  "emirate": "string",
  "community": "string",
  "totalUnits": 0
}
```

**Note**: New buildings should default to `"active"` status on the backend. The `status` field is not set during creation as it doesn't make logical sense for a brand new building - maintenance/inactive states are only relevant for existing buildings.

### Complete Payload (All Fields)

```json
{
  // Basic Information
  "name": "Binghatti Tower A",
  "buildingType": "residential",
  "developer": "Binghatti Developers",
  "yearBuilt": 2024,
  "totalFloors": 30,

  // Location Details (UAE-Specific)
  "emirate": "Dubai",
  "community": "Dubai Marina",
  "street": "Sheikh Zayed Road",
  "plotNumber": "123-456",
  "buildingNumber": "45",
  "makaniNumber": "1234567890",

  // Generated/Derived Fields (optional - can be set by frontend or backend)
  "address": "Binghatti Tower A, Dubai Marina, Dubai, UAE",
  "city": "Dubai",
  "country": "United Arab Emirates",

  // Utilities & Registration
  "utilityPremisesNumber": "1234567890123",

  // Capacity
  "totalUnits": 150,
  "occupiedUnits": 0,  // Initially 0, updated later
  "unitBreakdown": {
    "studios": 20,
    "oneBedroom": 50,
    "twoBedroom": 40,
    "threeBedroom": 30,
    "fourPlusBedroom": 5,
    "commercial": 5
  },

  // Amenities
  "amenities": ["gym", "pool", "parking", "security", "concierge"],

  // Management
  "managerId": "user-uuid-123",
  "managerName": "John Smith"  // Optional - can be derived from managerId
}
```

---

## Response Structure

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Building created successfully",
  "data": {
    "id": "building-uuid-123",
    "name": "Binghatti Tower A",
    "address": "Binghatti Tower A, Dubai Marina, Dubai, UAE",
    "city": "Dubai",
    "country": "United Arab Emirates",
    "emirate": "Dubai",
    "community": "Dubai Marina",
    "street": "Sheikh Zayed Road",
    "plotNumber": "123-456",
    "buildingNumber": "45",
    "makaniNumber": "1234567890",
    "buildingType": "residential",
    "developer": "Binghatti Developers",
    "yearBuilt": 2024,
    "totalFloors": 30,
    "utilityPremisesNumber": "1234567890123",
    "managerId": "user-uuid-123",
    "managerName": "John Smith",
    "totalUnits": 150,
    "occupiedUnits": 0,
    "unitBreakdown": {
      "studios": 20,
      "oneBedroom": 50,
      "twoBedroom": 40,
      "threeBedroom": 30,
      "fourPlusBedroom": 5,
      "commercial": 5
    },
    "amenities": ["gym", "pool", "parking", "security", "concierge"],
    "status": "active",
    "createdAt": "2025-12-08T10:30:00Z",
    "updatedAt": "2025-12-08T10:30:00Z"
  }
}
```

### Error Responses

**400 Bad Request** - Validation Error
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "name",
      "message": "Building name is required"
    },
    {
      "field": "totalUnits",
      "message": "Total units must be a positive number"
    }
  ]
}
```

**409 Conflict** - Duplicate Building
```json
{
  "success": false,
  "message": "A building with this name already exists in this community"
}
```

**403 Forbidden** - Insufficient Permissions
```json
{
  "success": false,
  "message": "Only admins can create buildings"
}
```

---

## Validation Rules

### Required Fields
1. `name` - Not empty, 3-200 characters
2. `buildingType` - Must be one of: `residential`, `commercial`, `mixed_use`, `hospitality`
3. `emirate` - Must be valid UAE emirate
4. `community` - Not empty, 3-100 characters
5. `totalUnits` - Positive integer, minimum 1

### Optional Fields Validation
- `developer` - Max 200 characters
- `yearBuilt` - Between 1900 and current year + 5
- `totalFloors` - Positive integer, max 200
- `makaniNumber` - 10 digits (Dubai only)
- `utilityPremisesNumber` - 10-20 characters
- `managerId` - Must be valid user ID with `management` role
- Unit breakdown fields - Positive integers, sum should not exceed `totalUnits`

### Business Rules
1. `status` should default to `"active"` for new buildings (not provided in create payload)
2. If `unitBreakdown` is provided, the sum of all unit types should equal `totalUnits`
3. `occupiedUnits` should default to 0 for new buildings
4. `amenities` array values must match available amenity IDs
5. `managerId` must reference an existing user with `management` role
6. `makaniNumber` is only valid for Dubai emirate

---

## Database Schema Recommendation

```sql
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Dubai',
  country VARCHAR(100) NOT NULL DEFAULT 'United Arab Emirates',

  -- UAE-specific location
  emirate VARCHAR(50) NOT NULL,
  community VARCHAR(100) NOT NULL,
  street VARCHAR(200),
  plot_number VARCHAR(50),
  building_number VARCHAR(50),
  makani_number VARCHAR(10),

  -- Building details
  building_type VARCHAR(20) NOT NULL CHECK (building_type IN ('residential', 'commercial', 'mixed_use', 'hospitality')),
  developer VARCHAR(200),
  year_built INTEGER CHECK (year_built >= 1900 AND year_built <= EXTRACT(YEAR FROM CURRENT_DATE) + 5),
  total_floors INTEGER CHECK (total_floors > 0),
  utility_premises_number VARCHAR(50),

  -- Management
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Capacity
  total_units INTEGER NOT NULL CHECK (total_units > 0),
  occupied_units INTEGER NOT NULL DEFAULT 0 CHECK (occupied_units >= 0 AND occupied_units <= total_units),

  -- Unit breakdown (stored as JSONB for flexibility)
  unit_breakdown JSONB,

  -- Amenities (array of amenity IDs)
  amenities TEXT[] DEFAULT '{}',

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_building_community UNIQUE (name, community, emirate)
);

-- Indexes for common queries
CREATE INDEX idx_buildings_emirate ON buildings(emirate);
CREATE INDEX idx_buildings_community ON buildings(community);
CREATE INDEX idx_buildings_status ON buildings(status);
CREATE INDEX idx_buildings_manager ON buildings(manager_id);
CREATE INDEX idx_buildings_type ON buildings(building_type);

-- GIN index for amenities array queries
CREATE INDEX idx_buildings_amenities ON buildings USING GIN (amenities);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Related Endpoints (Recommended)

### Update Building
```
PUT /api/Building/update/{id}
```
- Same payload structure as create (all fields optional)
- Cannot change `createdAt`
- Can update `occupiedUnits` manually

### Get Buildings List
```
GET /api/Building/list?emirate=Dubai&status=active&managerId=123
```
- Support filtering by: emirate, community, status, managerId, buildingType
- Support pagination: `?page=1&limit=20`
- Support search: `?search=marina`
- Support sorting: `?sortBy=name&order=asc`

### Get Building Details
```
GET /api/Building/{id}
```
- Returns complete building information
- Include manager details (expanded)
- Include unit statistics

### Delete Building
```
DELETE /api/Building/{id}
```
- Soft delete (set status to inactive) or hard delete
- Check for dependencies (units, tenants, active requests)

### Get Buildings by Manager
```
GET /api/Building/managed/{managerId}
```
- Returns all buildings managed by specific user

---

## Frontend Type Definition Reference

```typescript
export type BuildingType = "residential" | "commercial" | "mixed_use" | "hospitality";

export interface UnitBreakdown {
  studios?: number;
  oneBedroom?: number;
  twoBedroom?: number;
  threeBedroom?: number;
  fourPlusBedroom?: number;
  commercial?: number;
}

export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;

  // UAE-specific location fields
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

  // Capacity
  totalUnits: number;
  occupiedUnits: number;
  unitBreakdown?: UnitBreakdown;

  // Amenities
  amenities: string[];

  // Status
  status: "active" | "maintenance" | "inactive";

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

---

## UAE Emirates Reference

Valid values for `emirate` field:
- Dubai
- Abu Dhabi
- Sharjah
- Ajman
- Umm Al Quwain (UAQ)
- Ras Al Khaimah (RAK)
- Fujairah

---

## Common Communities by Emirate

**Dubai**:
- Dubai Marina
- Downtown Dubai
- Jumeirah Beach Residence (JBR)
- Business Bay
- Dubai Silicon Oasis
- Arabian Ranches
- Emirates Hills
- The Greens
- Palm Jumeirah
- Dubai Sports City

**Abu Dhabi**:
- Al Reem Island
- Saadiyat Island
- Yas Island
- Al Reef
- Masdar City
- Khalifa City

---

## Example API Call (cURL)

```bash
curl -X POST http://16.171.240.211/api/Building/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "name": "Binghatti Tower A",
    "buildingType": "residential",
    "developer": "Binghatti Developers",
    "yearBuilt": 2024,
    "totalFloors": 30,
    "emirate": "Dubai",
    "community": "Dubai Marina",
    "street": "Sheikh Zayed Road",
    "totalUnits": 150,
    "unitBreakdown": {
      "studios": 20,
      "oneBedroom": 50,
      "twoBedroom": 40,
      "threeBedroom": 30,
      "fourPlusBedroom": 10
    },
    "amenities": ["gym", "pool", "parking", "security"],
    "managerId": "user-uuid-123"
  }'
```

---

## Notes for Backend Developer

1. **Address Generation**: Consider auto-generating the full `address` field from component parts (name, community, emirate) if not provided

2. **Manager Assignment**: When `managerId` is provided, verify the user has the `management` role and fetch `managerName` automatically

3. **Unit Breakdown Validation**: If `unitBreakdown` is provided, validate that the sum matches `totalUnits`

4. **Amenities**: Store as array of strings (amenity IDs). Consider creating a separate `amenities` table for metadata

5. **Makani Number**: Only validate/store if `emirate === "Dubai"`

6. **Status**: Should default to `"active"` on creation. Frontend does not send status field - new buildings are always active. Maintenance/inactive states are only relevant for existing buildings.

7. **Occupied Units**: Should default to 0 on creation. Updated separately when units are assigned to tenants

8. **Unique Constraint**: Consider enforcing uniqueness on `(name, community, emirate)` to prevent duplicate buildings

9. **Soft Delete**: When deleting, consider soft delete (status = inactive) rather than hard delete to preserve historical data

10. **Audit Trail**: Track who created/updated the building (add `createdBy`, `updatedBy` fields)

11. **Geocoding**: Consider adding `latitude` and `longitude` fields for map features (can be populated via geocoding API)

---

**Document prepared by**: Frontend Team
**Related Files**:
- Form Component: `app/(admin)/buildings/_components/CreateBuildingModal.tsx`
- Type Definitions: `lib/types/index.ts:454-496`
- Constants: `app/(admin)/buildings/_constants.ts`
