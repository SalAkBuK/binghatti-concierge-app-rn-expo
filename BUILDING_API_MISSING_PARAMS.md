# Building API - Missing Parameters Checklist

**Backend Endpoint**: `http://16.171.240.211/api/Buildings`

## ⚠️ Critical Issues to Fix Immediately

### 1. Field Name Typo
- **Current**: `unintsCount` ❌
- **Should be**: `unitsCount` ✅
- **Impact**: Typo in field name

### 2. ID Type Mismatch
- **Current**: `number`
- **Frontend expects**: `string`
- **Recommendation**: Return ID as string or we'll convert on frontend

### 3. Status Format
- **Current**: `isActive: boolean`
- **Frontend expects**: `status: "active" | "maintenance" | "inactive"`
- **Recommendation**: Change to status enum for better granularity

---

## Missing Parameters by Priority

### 🔴 HIGH Priority (Required for MVP)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `country` | string | Country name | "UAE" |
| `occupiedUnits` | number | Number of occupied units | 120 |
| `status` | enum | "active" \| "maintenance" \| "inactive" | "active" |
| `updatedAt` | string (ISO) | Last update timestamp | "2025-12-13T10:05:47.4528315" |

### 🟡 MEDIUM Priority (Important for UAE Market)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `emirate` | string | Dubai, Abu Dhabi, Sharjah, etc. | "Dubai" |
| `community` | string | Community/district name | "Dubai Marina" |
| `buildingType` | enum | "residential" \| "commercial" \| "mixed" | "residential" |
| `managerId` | string | Building manager user ID | "mgr_123" |
| `managerName` | string | Building manager name | "Ahmed Mohammed" |
| `amenities` | string[] | Array of amenity IDs | ["gym", "pool", "parking"] |
| `totalFloors` | number | Total number of floors | 40 |

### 🟢 LOW Priority (Nice to Have)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `street` | string | Street name | "Sheikh Zayed Road" |
| `plotNumber` | string | Plot number | "Plot 123" |
| `buildingNumber` | string | Building number | "B-456" |
| `makaniNumber` | string | Dubai smart addressing | "2876543210" |
| `developer` | string | Developer name | "Emaar Properties" |
| `yearBuilt` | number | Year of construction | 2020 |
| `utilityPremisesNumber` | string | DEWA/FEWA premises number | "1234567890" |
| `unitBreakdown` | object | Breakdown of unit types | { studio: 50, "1br": 100 } |
| `location` | string | GPS coordinates | "25.0760,55.1320" |

---

## Current API Payload (Create)

```json
{
  "name": "string",
  "address": "string",
  "city": "string",
  "unitsCount": 159
}
```

## Ideal API Payload (Create) - With All Fields

```json
{
  // Basic Info
  "name": "Burj Vista Tower",
  "address": "Mohammed Bin Rashid Boulevard",
  "city": "Dubai",
  "country": "UAE",

  // UAE-Specific Location
  "emirate": "Dubai",
  "community": "Downtown Dubai",
  "street": "Sheikh Mohammed Bin Rashid Boulevard",
  "plotNumber": "Plot 123",
  "buildingNumber": "B-456",
  "makaniNumber": "2876543210",

  // Building Details
  "buildingType": "residential",
  "developer": "Emaar Properties",
  "yearBuilt": 2020,
  "totalFloors": 40,
  "utilityPremisesNumber": "1234567890",

  // Management
  "managerId": "mgr_123",
  "managerName": "Ahmed Mohammed",
  "totalUnits": 240,
  "occupiedUnits": 180,
  "amenities": ["gym", "pool", "parking", "security"],

  // Status
  "status": "active"
}
```

## Current API Response

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "string",
    "address": "string",
    "city": "string",
    "unintsCount": 2147483647,  // ⚠️ TYPO
    "isActive": true,
    "createdAt": "2025-12-08T13:38:28.6565463"
  }
}
```

---

## Implementation Timeline

### Phase 1 (Week 1) - Critical Fixes
- [ ] Fix `unintsCount` → `unitsCount` typo
- [ ] Add `country` field
- [ ] Add `occupiedUnits` field
- [ ] Change `isActive` → `status` enum
- [ ] Add `updatedAt` timestamp

### Phase 2 (Week 2-3) - UAE Market Features
- [ ] Add `emirate` field
- [ ] Add `community` field
- [ ] Add `buildingType` enum
- [ ] Add `managerId` and `managerName`
- [ ] Add `amenities` array
- [ ] Add `totalFloors` field

### Phase 3 (Month 2) - Complete Features
- [ ] Add UAE addressing fields (makani, plot, building number)
- [ ] Add developer information
- [ ] Add utility premises number
- [ ] Add unit breakdown object
- [ ] Add GPS location support
- [ ] Add Get by ID endpoint: `/Buildings/get/{id}`
- [ ] Add Delete endpoint: `/Buildings/delete/{id}`

---

## Notes for Backend Team

1. **Field Naming**: Please use `unitsCount` instead of `unintsCount`
2. **Status**: Consider using enum instead of boolean for more flexibility
3. **ID Type**: String IDs are preferred for consistency with other entities
4. **Missing Endpoints**:
   - GET `/Buildings/get/{id}` (single building)
   - DELETE `/Buildings/delete/{id}` (remove building)

---

**Last Updated**: 2025-12-13
**Frontend Contact**: Frontend Team
**Backend Contact**: Backend Team
