# Building Employee Role Features

## Overview

The **Building Employee** role represents on-site staff who work directly for a specific building, such as security guards, maintenance staff, concierge, and other building personnel. They handle day-to-day operations including visitor check-in/out, parcel receiving, amenity monitoring, and assisting with tenant requests.

**Route Group:** `app/(buildingEmployee)/`
**Role Identifier:** `building_employee`
**Access Level:** Building-scoped access (assigned building only)

**Mount Status:** Live route group, early-stage implementation
- `app/(buildingEmployee)/` is mounted in the current router.
- The current mounted files are `index`, `jobs`, `profile`, plus hidden routes `amenities`, `shifts`, and `messages`.
- Several workflows below remain planned expansions rather than fully implemented screens.

---

## Key Characteristics

- **On-Site Staff:** Physical presence in the building
- **Building-Specific:** Work for a single building only
- **Operational Support:** Handle daily building operations
- **Visitor Management:** Primary responsibility for visitor check-in/out
- **Parcel Handling:** Receive and track package deliveries
- **Amenity Monitoring:** Oversee amenity usage and cleanliness
- **Request Support:** Assist with tenant service requests

---

## Navigation Structure

### Bottom Tabs (Primary Navigation)
- **Dashboard** - Daily operations overview
- **Jobs** - Assigned tasks and maintenance
- **Profile** - Employee profile and schedule

### Hidden Mounted Routes
- **Amenities** - Amenity status monitoring
- **Shifts** - Shift-related flow placeholder
- **Messages** - Messaging route placeholder

---

## Screens & Features

### 1. Dashboard (`app/(buildingEmployee)/index.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Daily Overview
- Current shift information
  - Shift time (e.g., "7:00 AM - 3:00 PM")
  - Hours worked today
  - Break time remaining
  - Clock in/out status

- **Today's Summary Cards**
  - Visitors checked in/out today
  - Parcels received today
  - Active amenity bookings
  - Pending tasks count
  - Open requests

##### Quick Actions
- **Check In Visitor**
  - Quick QR code scanner
  - Manual check-in option
  - Pre-registered visitor lookup

- **Receive Parcel**
  - Scan tracking number
  - Log delivery
  - Notify tenant

- **Report Issue**
  - Quick incident report
  - Photo attachment
  - Send to management

- **Check Amenity**
  - View amenity status
  - Update cleanliness status
  - Report maintenance need

##### Active Tasks
- Today's assigned tasks
- Urgent items flagged
- Task priority indicators
- Time estimates
- Completion status

##### Visitor Log (Today)
- Recent check-ins
- Currently on-site visitors
- Expected arrivals
- Overdue visitors alert

##### Parcel Log (Today)
- Recent deliveries
- Pending pickup parcels
- Tenant notifications sent
- High-value items flagged

##### Announcements
- Management communications
- Building notices
- Safety alerts
- Shift handover notes

#### Data Sources
```typescript
actions.getBuildingEmployeeDashboard(buildingId)
actions.getShiftInfo(employeeId)
actions.getTodayVisitors(buildingId)
actions.getTodayParcels(buildingId)
```

#### API Endpoints Needed
- `GET /building-employee/dashboard` - Dashboard data
- `GET /building-employee/shift` - Current shift info
- `POST /building-employee/clock-in` - Clock in
- `POST /building-employee/clock-out` - Clock out
- `GET /building-employee/tasks/today` - Today's tasks

#### Code Reference
Location: `app/(buildingEmployee)/index.tsx`

---

### 2. Jobs & Tasks (`app/(buildingEmployee)/jobs.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Task List
- Filter tabs:
  - Assigned to Me
  - Pending
  - In Progress
  - Completed Today
  - All Tasks

- Task cards showing:
  - Task title and description
  - Priority (Urgent/High/Normal/Low)
  - Category (Cleaning, Maintenance, Security, Other)
  - Location (specific area in building)
  - Assigned by (manager name)
  - Due date/time
  - Estimated duration
  - Status badge

##### Task Details
- Full task description
- Location with directions
- Special instructions
- Required equipment/supplies
- Safety precautions
- Before photos (if applicable)
- Completion checklist

##### Task Actions
- Start task (clock in)
- Pause/resume task
- Upload progress photos
- Add notes/comments
- Request assistance
- Report obstacles
- Mark as completed
- Request verification

##### Task Types
- **Cleaning Tasks**
  - Common area cleaning
  - Spill cleanup
  - Trash removal
  - Window cleaning

- **Maintenance Tasks**
  - Light bulb replacement
  - Minor repairs
  - Equipment checks
  - Preventive maintenance

- **Security Tasks**
  - Patrol rounds
  - Camera checks
  - Access control verification
  - Incident response

- **Concierge Tasks**
  - Visitor assistance
  - Delivery coordination
  - Tenant inquiries
  - Event setup

##### Recurring Tasks
- Daily checklists
- Weekly inspections
- Monthly maintenance
- Auto-scheduled tasks

##### Task History
- Completed tasks archive
- Performance metrics
- Average completion time
- Quality ratings

#### Data Structure
```typescript
interface BuildingEmployeeTask {
  id: string;
  buildingId: string;
  employeeId: string;
  title: string;
  description: string;
  category: 'cleaning' | 'maintenance' | 'security' | 'concierge' | 'other';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  location: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedBy: string;
  assignedAt: string;
  dueDate?: string;
  estimatedDuration?: number; // minutes
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  checklistItems?: Array<{
    item: string;
    completed: boolean;
  }>;
  photos?: string[];
  requiresVerification: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}
```

#### API Endpoints Needed
- `GET /building-employee/tasks` - List tasks
- `GET /building-employee/tasks/:id` - Task details
- `PUT /building-employee/tasks/:id/start` - Start task
- `PUT /building-employee/tasks/:id/complete` - Complete task
- `POST /building-employee/tasks/:id/photos` - Upload photos
- `POST /building-employee/tasks/:id/notes` - Add notes

#### Code Reference
Location: `app/(buildingEmployee)/jobs.tsx`

---

### 3. Requests (`app/(buildingEmployee)/requests.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Request List
- All tenant requests for the building
- Filter by:
  - Status (Pending/Assigned/In Progress/Completed)
  - Type (Maintenance/Repair/etc.)
  - Floor/area
  - Priority

- Request cards showing:
  - Request type and title
  - Unit number
  - Priority badge
  - Status
  - Assigned provider (if any)
  - Creation time

##### Request Details
- Full request information
- Tenant contact (if permitted)
- Location details
  - Unit number
  - Floor
  - Specific area (kitchen, bathroom, etc.)
- Description
- Attachments/photos
- Status history
- Assigned provider details

##### Employee Actions
- Add internal notes
- Update status (limited permissions)
- Provide building access assistance
- Coordinate with service provider
- Mark as completed (for minor tasks)
- Escalate to management

##### Coordination Tasks
- Provide access to service provider
- Monitor job progress
- Report completion
- Inspect completed work
- Close out requests

#### API Endpoints Needed
- `GET /building-employee/requests` - List building requests
- `GET /building-employee/requests/:id` - Request details
- `POST /building-employee/requests/:id/notes` - Add note
- `PUT /building-employee/requests/:id/status` - Update status (limited)

#### Code Reference
Location: `app/(buildingEmployee)/requests.tsx`

---

### 4. Amenities (`app/(buildingEmployee)/amenities.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Amenity Monitoring
- List of all building amenities
- Real-time status view
- Amenity cards showing:
  - Amenity name and type
  - Current status (Available/Occupied/Maintenance)
  - Current occupancy vs capacity
  - Today's bookings
  - Next booking time
  - Last inspection time
  - Cleanliness status

##### Amenity Status Management
- **Update Status**
  - Available
  - Occupied
  - Cleaning in Progress
  - Maintenance Required
  - Out of Service

- **Occupancy Tracking**
  - Check-in users (scan QR code)
  - Check-out users
  - Track current occupants
  - Enforce capacity limits
  - Duration monitoring

- **Cleanliness Checks**
  - Mark as clean
  - Report mess/spills
  - Log cleaning completion
  - Photo documentation
  - Cleaning schedule tracking

##### Booking Management
- View all bookings for today
- Upcoming bookings (next 2 hours)
- Verify booking QR codes
- Extend booking (with approval)
- Handle walk-ins (if allowed)
- Report no-shows

##### Maintenance Reporting
- Report equipment issues
- Photo documentation
- Severity level
- Immediate action taken
- Request service provider
- Out-of-service flag

##### Usage Logs
- Check-in/check-out logs
- Occupancy history
- Cleanliness inspection logs
- Maintenance history
- Incident reports

##### Amenity Inspections
- Daily opening checklist
- Mid-day checks
- Closing procedures
- Equipment verification
- Safety checks
- Supply inventory

#### Data Structure
```typescript
interface AmenityStatus {
  amenityId: string;
  amenityName: string;
  status: 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_service';
  currentOccupancy: number;
  maxCapacity: number;
  lastCheckedBy: string;
  lastCheckedAt: string;
  cleanliness: 'excellent' | 'good' | 'fair' | 'poor';
  issues?: string[];
  nextBooking?: {
    tenantName: string;
    startTime: string;
    duration: number;
  };
}

interface AmenityCheckIn {
  bookingId: string;
  amenityId: string;
  tenantId: string;
  checkedInBy: string;
  checkedInAt: string;
  expectedDuration: number;
  checkedOutAt?: string;
  actualDuration?: number;
}
```

#### API Endpoints Needed
- `GET /building-employee/amenities` - List amenities
- `GET /building-employee/amenities/:id` - Amenity details
- `PUT /building-employee/amenities/:id/status` - Update status
- `POST /building-employee/amenities/:id/check-in` - Check-in user
- `POST /building-employee/amenities/:id/check-out` - Check-out user
- `POST /building-employee/amenities/:id/inspection` - Log inspection
- `POST /building-employee/amenities/:id/issue` - Report issue

#### Code Reference
Location: `app/(buildingEmployee)/amenities.tsx`

---

### 5. Visitors Management (via Dashboard Quick Action)

**Planned Features** (Integrated into Dashboard)

##### Visitor Check-In Process
- **QR Code Scan**
  - Scan visitor's pre-registration QR code
  - Auto-populate visitor information
  - Verify against expected visitors

- **Manual Check-In**
  - Search by name or host unit
  - Select from expected visitors list
  - Enter visitor details if not pre-registered

- **Identity Verification**
  - ID type selection
  - ID number entry
  - Photo capture (front/back of ID)
  - Face photo capture
  - Signature capture (touchscreen)

- **Parking Assignment** (if applicable)
  - Available parking spots
  - Assign visitor parking
  - Issue parking pass
  - Log vehicle details

- **Badge Printing**
  - Generate visitor badge
  - Print badge with:
    - Visitor name
    - Host unit
    - Date and time
    - Valid duration
    - Building employee name

- **Access Assignment**
  - Floor access
  - Elevator access
  - Amenity access (if allowed)
  - Duration limits

- **Host Notification**
  - Auto-notify tenant of arrival
  - SMS notification sent
  - In-app notification

##### Visitor Check-Out Process
- Scan visitor badge
- Manual lookup by name
- Record departure time
- Return parking pass
- Calculate visit duration
- Close visitor log

##### Visitor List Views
- Currently on-site
- Expected today
- Checked out today
- Overdue visitors (overstayed)
- Denied visitors
- VIP visitors

##### Security Features
- Denied visitor list check
- Photo ID verification
- Host confirmation required (for unregistered)
- Security alert system
- Incident reporting
- Activity log

##### Recurring Visitors
- Frequent visitor recognition
- Fast-track check-in
- Saved visitor profiles
- Long-term access passes

#### API Endpoints Needed
- `GET /building-employee/visitors/expected` - Expected visitors
- `POST /building-employee/visitors/check-in` - Check in visitor
- `POST /building-employee/visitors/check-out` - Check out visitor
- `GET /building-employee/visitors/on-site` - Current visitors
- `POST /building-employee/visitors/photos` - Upload ID photos
- `GET /building-employee/visitors/denied-list` - Denied visitors

---

### 6. Parcels Management (via Dashboard Quick Action)

**Planned Features** (Integrated into Dashboard)

##### Parcel Receiving
- **Quick Scan**
  - Scan tracking number barcode
  - Capture courier name
  - Select unit number (auto-suggest)
  - Photo of parcel
  - Generate pickup code
  - Notify tenant automatically

- **Manual Entry**
  - Unit number selection
  - Tenant lookup
  - Courier service
  - Tracking number (optional)
  - Parcel description
  - Size (Small/Medium/Large)
  - Special handling (Fragile/Refrigerated/etc.)

- **Photo Documentation**
  - Photo of parcel
  - Photo of label/tracking number
  - Condition documentation
  - Special markings

##### Parcel Storage
- Assign storage location
  - Shelf number
  - Locker number
  - Refrigerated section (if needed)
- Storage location tracking
- High-value item security
- Oversize item handling

##### Tenant Notification
- Auto-SMS notification
- In-app notification
- Email notification (optional)
- Notification includes:
  - Pickup code
  - Storage location
  - Office hours
  - Pickup instructions

##### Parcel Pickup
- **Verification Methods**
  - Scan tenant QR code
  - Enter pickup code
  - Verify ID
  - Signature required

- **Pickup Process**
  - Lookup parcel by code or unit
  - Verify tenant identity
  - Signature capture
  - Photo of recipient
  - Mark as picked up
  - Timestamp pickup

##### Parcel List Views
- Pending pickup
- Picked up today
- Overdue parcels (7+ days)
- Lost/damaged parcels
- High-value parcels

##### Parcel Actions
- Mark as damaged
- Mark as lost
- Request tenant pickup
- Reminder notifications
- Return to sender (after 30 days)

##### Reports
- Daily parcel summary
- Courier performance
- Average pickup time
- Unclaimed parcels report

#### Data Structure
```typescript
interface ParcelLog {
  id: string;
  buildingId: string;
  unitNumber: string;
  tenantId: string;
  tenantName?: string;
  trackingNumber?: string;
  courier: string;
  receivedBy: string; // employee ID
  receivedAt: string;
  pickupCode: string;
  storageLocation?: string;
  size: 'small' | 'medium' | 'large' | 'oversized';
  specialHandling?: string;
  status: 'pending' | 'picked_up' | 'lost' | 'damaged' | 'returned';
  photos?: string[];
  notificationSent: boolean;
  pickedUpAt?: string;
  pickedUpBy?: string;
  signature?: string;
  notes?: string;
}
```

#### API Endpoints Needed
- `POST /building-employee/parcels` - Log received parcel
- `GET /building-employee/parcels/pending` - Pending parcels
- `PUT /building-employee/parcels/:id/pickup` - Mark picked up
- `POST /building-employee/parcels/:id/notify` - Send reminder
- `PUT /building-employee/parcels/:id/status` - Update status

---

### 7. Profile (`app/(buildingEmployee)/profile.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Personal Information
- Name and photo
- Employee ID
- Job title/role
- Department
- Hire date
- Contact information
- Emergency contact

##### Work Schedule
- Current shift
- Regular schedule (weekly)
- Upcoming shifts
- Shift swap requests
- Time-off requests
- Overtime hours

##### Performance
- Tasks completed (this month)
- Average task completion time
- Quality ratings
- Punctuality score
- Tenant feedback
- Supervisor ratings

##### Training & Certifications
- Completed training courses
- Certification status
- Renewal dates
- Upcoming training
- Skill assessments

##### Time Tracking
- Clock in/out history
- Hours worked (daily/weekly/monthly)
- Break time logs
- Overtime tracking
- Attendance record

##### Settings
- Notification preferences
- Language preference
- Dark mode toggle
- Password change

#### API Endpoints Needed
- `GET /building-employee/profile` - Get profile
- `PUT /building-employee/profile` - Update profile
- `GET /building-employee/schedule` - Get schedule
- `GET /building-employee/performance` - Performance data
- `POST /building-employee/time-off` - Request time off

#### Code Reference
Location: `app/(buildingEmployee)/profile.tsx`

---

## Permissions & Access Control

### Building Employee Capabilities
✅ Check in/out visitors for their building
✅ Receive and track parcels
✅ Monitor amenity status and usage
✅ Complete assigned tasks
✅ View tenant requests (limited info)
✅ Report issues and incidents
✅ Update amenity cleanliness status
✅ Clock in/out for shifts
✅ Access building-specific data

### Restrictions
❌ Cannot view other buildings' data
❌ Cannot assign jobs to others
❌ Cannot modify tenant information
❌ Cannot access financial data
❌ Cannot change building settings
❌ Cannot manage other employees
❌ Cannot override management decisions
❌ Limited access to tenant personal information

---

## Current Implementation Status

### Summary Table
| Feature | Status | Completion | Notes |
|---------|--------|-----------|-------|
| Dashboard | ⚠️ Placeholder | 15% | Routing only |
| Jobs/Tasks | ⚠️ Placeholder | 15% | Routing only |
| Requests | ⚠️ Placeholder | 15% | Routing only |
| Amenities | ⚠️ Placeholder | 15% | Routing only |
| Profile | ⚠️ Placeholder | 15% | Routing only |
| All Features | ⚠️ Placeholder | 15% | Needs full implementation |

---

## Next Steps for Building Employee Role

### Priority 1: Core Operations
1. ❌ Implement Dashboard with shift info and quick actions
2. ❌ Implement Visitor check-in/out flow
3. ❌ Implement Parcel receiving and tracking
4. ❌ Connect to backend APIs

### Priority 2: Daily Tasks
1. ❌ Implement Tasks list and completion workflow
2. ❌ Implement Amenity monitoring and status updates
3. ❌ Add photo capture and documentation
4. ❌ Implement QR code scanning

### Priority 3: Advanced Features
1. ❌ Add time tracking and clock in/out
2. ❌ Implement shift management
3. ❌ Add performance tracking
4. ❌ Implement incident reporting

---

## Recent Updates

- **[2025-11-05]** Created comprehensive building employee features documentation
- **[2025-10-20]** Initial routing structure created

---

## Related Documentation

- Backend API Requirements: `docs/backend/README.md`
- Type Definitions: `lib/types/index.ts`
- Project Overview: `README.md`
- Architecture Guide: `docs/ARCHITECTURE.md`
