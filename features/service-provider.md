# Service Provider Role Features

## Overview

The **Service Provider** role represents external vendors and companies that provide maintenance, repair, and other services to buildings. Service providers receive job assignments, manage their teams, track job progress, and maintain service quality ratings across multiple buildings.

**Planned Route Group:** `app/(serviceProvider)/`
**Role Identifier:** `service_provider`
**Access Level:** Job-scoped access (assigned jobs and buildings with access)

**Runtime Status:** Not mounted
- There is no live `app/(serviceProvider)/` route group in the current Expo Router tree.
- Treat the screens and paths below as target-state documentation and API planning reference, not mounted runtime behavior.

---

## Key Characteristics

- **Job-Focused:** Receive, accept, and complete service jobs
- **Team Management:** Assign jobs to employees and track their work
- **Multi-Building:** Can service multiple buildings (based on access agreements)
- **Performance Tracking:** Monitor ratings, completion rates, and earnings
- **Service Areas:** Manage building assignments and access requests
- **Scheduling:** Calendar-based job scheduling and availability management

---

## Navigation Structure

### Bottom Tabs (Primary Navigation)
- **Dashboard** - Provider overview and metrics
- **Jobs** - Job offers and assignments
- **Schedule** - Calendar view of jobs
- **Team** - Employee management
- **More** - Additional features

### More Menu Items
- Analytics
- Ratings & Reviews
- Service Areas
- Profile
- Settings

---

## Screens & Features

### 1. Dashboard (`app/(serviceProvider)/index.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Overview Cards
- **Pending Job Offers**
  - Count of new job offers awaiting response
  - "Accept/Decline" quick action
  - Deadline countdown for response

- **Active Jobs**
  - Currently in-progress jobs count
  - Today's scheduled jobs
  - Overdue jobs alert

- **This Month Performance**
  - Jobs completed
  - Completion rate percentage
  - Average rating
  - Total revenue

##### Quick Stats
- Jobs completed today
- Jobs scheduled for tomorrow
- Team members available
- Unread messages count

##### Recent Activity
- New job offer notifications
- Job status changes
- Customer ratings received
- Payment confirmations
- Team member updates

##### Urgent Actions
- Jobs requiring immediate attention
- Job offers expiring soon
- Customer feedback pending response
- Incomplete job reports

##### Revenue Summary
- This month earnings
- Pending payments
- Payment history link
- Top earning services

##### Rating Overview
- Current average rating
- Recent reviews
- Rating trend (improving/declining)
- Response rate to reviews

#### Data Sources
```typescript
actions.getServiceProviderDashboard()  // Provider metrics
actions.getJobOffers()                 // Pending offers
actions.getActiveJobs()                // In-progress jobs
```

#### API Endpoints Needed
- `GET /service-provider/dashboard` - Dashboard metrics
- `GET /service-provider/job-offers` - Pending offers
- `GET /service-provider/jobs/active` - Active jobs
- `GET /service-provider/revenue/summary` - Revenue data

#### Code Reference
Location: `app/(serviceProvider)/index.tsx`

---

### 2. Jobs Management (`app/(serviceProvider)/jobs.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Job List with Tabs
- **Offered** - New job offers awaiting decision
  - Response deadline countdown
  - Job details preview
  - Accept/Decline buttons
  - Request more information option

- **Assigned** - Accepted jobs not yet started
  - Awaiting team assignment
  - Scheduling needed
  - Material procurement status

- **In Progress** - Currently active jobs
  - Real-time status updates
  - Employee assigned
  - Progress percentage
  - Estimated completion time

- **Completed** - Finished jobs
  - Completion date
  - Customer approval status
  - Payment status
  - Rating received

- **Cancelled** - Declined or cancelled jobs
  - Cancellation reason
  - Impact on rating (if any)

##### Job Card Display
- Job type icon and title
- Building name and unit
- Priority badge (Low/Medium/High/Urgent)
- Status with color coding
- Assigned employee (if any)
- Scheduled date/time
- Cost estimate/actual
- Customer information
- Distance from current location

##### Job Offer Details
- Complete job description
- Request origin (tenant details)
- Location (building, unit, access instructions)
- Scope of work
- Attachments (photos from tenant)
- Estimated time required
- Proposed budget
- Required skills/certifications
- Preferred completion date
- Special requirements

##### Job Assignment
- **Assign to Employee**
  - List of available employees
  - Filter by skill match
  - Show employee availability
  - Show employee current workload
  - Past performance with similar jobs

- **Schedule Job**
  - Date picker
  - Time slot selection
  - Duration estimate
  - Buffer time for travel
  - Conflict detection

- **Add Cost Estimate**
  - Labor cost
  - Materials cost
  - Equipment rental
  - Transportation
  - Total estimate
  - Markup/profit margin

##### Job Actions
- Accept job offer
- Decline job offer (with reason)
- Assign to employee
- Start job (clock in)
- Update job status
- Upload progress photos
- Add additional costs
- Request deadline extension
- Mark as completed
- Request customer approval

##### Job Tracking
- Status timeline
- Employee check-in/check-out times
- Progress photos with timestamps
- Cost tracking (estimated vs actual)
- Customer communications
- Internal notes

#### Data Structure
```typescript
interface Job {
  id: string;
  requestId?: string;
  type: string;
  title: string;
  description: string;
  buildingId: string;
  buildingName: string;
  unitNumber: string;
  status: 'offered' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'pending_approval';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tenantId: string;
  tenantName?: string;
  tenantPhone?: string;
  assignedProviderId: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  startedAt?: string;
  completedAt?: string;
  estimatedCost?: number;
  actualCost?: number;
  costBreakdown?: {
    labor: number;
    materials: number;
    equipment: number;
    other: number;
  };
  attachments?: string[];
  progressPhotos?: string[];
  notes?: string;
  customerRating?: number;
  offerExpiresAt?: string;
  responseDeadline?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### API Endpoints Needed
- `GET /service-provider/jobs` - List all jobs
- `PUT /service-provider/jobs/:id/accept` - Accept job offer
- `PUT /service-provider/jobs/:id/decline` - Decline offer
- `PUT /service-provider/jobs/:id/assign` - Assign to employee
- `PUT /service-provider/jobs/:id/schedule` - Schedule job
- `PUT /service-provider/jobs/:id/start` - Start job
- `PUT /service-provider/jobs/:id/status` - Update status
- `POST /service-provider/jobs/:id/photos` - Upload photos
- `POST /service-provider/jobs/:id/costs` - Add costs
- `PUT /service-provider/jobs/:id/complete` - Mark complete

#### Code Reference
Location: `app/(serviceProvider)/jobs.tsx`

---

### 3. Job Details (`app/(serviceProvider)/job-details.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Job Information Display
- Job type and title
- Status badge with timeline
- Priority indicator
- Description with formatting
- Scope of work checklist

##### Location Details
- Building name and address
- Unit number
- Floor
- Access instructions
- Parking information
- Security requirements
- Map view with navigation

##### Customer Information
- Tenant name
- Contact phone number
- Email address
- Preferred contact method
- Best time to contact
- Special requests/notes
- Communication history

##### Assignment Details
- Assigned employee name and photo
- Employee contact
- Employee skills match
- Current location (if tracking enabled)
- Estimated arrival time

##### Schedule Information
- Scheduled date
- Start time and end time
- Duration estimate
- Buffer time
- Travel time estimate
- Other jobs nearby (for routing optimization)

##### Cost Management
- Initial estimate breakdown
- Approved budget
- Additional costs log
  - Item description
  - Quantity
  - Unit price
  - Total
  - Photo evidence
  - Customer approval status
- Running total
- Profit margin calculation

##### Progress Tracking
- Status timeline with timestamps
- Check-in/check-out logs
- Time spent on job
- Progress photos gallery
  - Before photos
  - During work photos
  - After completion photos
  - Timestamp and uploader
- Work completed checklist

##### Attachments
- Customer-provided photos
- Job-related documents
- Invoices
- Receipts
- Warranty information

##### Communication
- Message thread with customer
- Internal notes (team only)
- Management notifications
- Customer feedback

##### Actions Panel
- Start job button
- Pause job
- Upload photo
- Add cost
- Add note
- Request approval
- Mark complete
- Contact customer
- Get directions
- Call employee

##### Completion Flow
- Completion checklist
- Before/after photo requirement
- Final cost confirmation
- Customer signature (if required)
- Request customer approval
- Submit for payment

#### API Endpoints Needed
- `GET /service-provider/jobs/:id` - Job details
- `POST /service-provider/jobs/:id/messages` - Send message
- `POST /service-provider/jobs/:id/notes` - Add note
- `GET /service-provider/jobs/:id/timeline` - Status history

#### Code Reference
Location: `app/(serviceProvider)/job-details.tsx`

---

### 4. Schedule (`app/(serviceProvider)/schedule.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Calendar Views
- **Month View**
  - Full month calendar
  - Jobs indicated by dots/badges
  - Color-coded by status
  - Tap day to see day details

- **Week View**
  - 7-day horizontal scroll
  - Jobs as time blocks
  - Employee assignment visible
  - Drag-and-drop rescheduling

- **Day View**
  - Hour-by-hour breakdown
  - Job timeline with duration
  - Travel time between jobs
  - Available time slots

- **Agenda View**
  - List of upcoming jobs
  - Chronological order
  - Quick filters

##### Job Scheduling
- Drag-and-drop job cards
- Auto-suggest optimal time slots
- Conflict detection
- Travel time calculation
- Employee availability check
- Customer availability consideration

##### Filters
- All employees
- Specific employee
- Job type
- Building/area
- Status

##### Job Routing Optimization
- Multiple jobs in same building
- Jobs in nearby buildings
- Suggested route order
- Estimated travel times
- Traffic consideration

##### Availability Management
- Set working hours
- Mark days off
- Block time slots
- Recurring unavailability
- Emergency availability toggle

##### Notifications
- Upcoming job reminders
- Schedule conflicts alerts
- Rescheduling requests
- Customer schedule changes

#### Data Structure
```typescript
interface ScheduledJob {
  id: string;
  jobId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  estimatedDuration: number; // minutes
  travelTimeBefore?: number;
  buildingAddress: string;
  unitNumber: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  color: string; // for calendar display
}
```

#### API Endpoints Needed
- `GET /service-provider/schedule` - Get schedule
- `PUT /service-provider/schedule/reschedule` - Reschedule job
- `GET /service-provider/schedule/conflicts` - Check conflicts
- `POST /service-provider/schedule/block` - Block time
- `GET /service-provider/schedule/optimize-route` - Route optimization

#### Code Reference
Location: `app/(serviceProvider)/schedule.tsx`

---

### 5. Team Management (`app/(serviceProvider)/team.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Employee Directory
- List of all team members
- Employee cards showing:
  - Name and photo
  - Role/specialization
  - Status (Available/On Job/Off Duty)
  - Current location (if tracking enabled)
  - Today's jobs count
  - Overall rating
  - Contact button

##### Employee Details
- Personal information
- Contact details
- Skills and certifications
  - Certification type
  - Issue date
  - Expiration date
  - Certification number
  - Document upload
- Specializations
- Languages spoken
- Work schedule/availability
- Emergency contact

##### Performance Metrics
- Jobs completed (total, this month)
- Average completion time
- Customer rating average
- On-time completion rate
- Response time
- Revenue generated
- Complaint count

##### Assignment History
- Past jobs list
- Jobs by building
- Jobs by type
- Customer feedback
- Photos from jobs

##### Team Actions
- Add new employee
- Edit employee details
- Deactivate/reactivate employee
- Assign job to employee
- View employee schedule
- Message employee
- Track employee location (with consent)

##### Skills Management
- Add/remove skills
- Update certifications
- Set skill proficiency level
- Verify certifications
- Track training completion

##### Availability
- Set employee working hours
- Track time off requests
- Approve/deny leave
- View attendance history
- Manage overtime

#### Data Structure
```typescript
interface ServiceProviderEmployee {
  id: string;
  serviceProviderId: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  role: string;
  status: 'available' | 'on_job' | 'off_duty' | 'on_leave';
  skills: string[];
  certifications: Array<{
    type: string;
    number: string;
    issueDate: string;
    expiryDate: string;
    documentUrl?: string;
  }>;
  languages: string[];
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
  workSchedule: {
    [day: string]: { start: string; end: string };
  };
  stats: {
    jobsCompleted: number;
    averageRating: number;
    onTimeRate: number;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  joinedAt: string;
  isActive: boolean;
}
```

#### API Endpoints Needed
- `GET /service-provider/team` - List employees
- `POST /service-provider/team` - Add employee
- `GET /service-provider/team/:id` - Employee details
- `PUT /service-provider/team/:id` - Update employee
- `DELETE /service-provider/team/:id` - Deactivate employee
- `GET /service-provider/team/:id/performance` - Performance data
- `GET /service-provider/team/:id/history` - Job history
- `PUT /service-provider/team/:id/certifications` - Update certifications

#### Code Reference
Location: `app/(serviceProvider)/team.tsx`

---

### 6. Analytics (`app/(serviceProvider)/analytics.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Overview Dashboard
- Time period selector (Week/Month/Quarter/Year)
- Key metrics cards:
  - Total jobs completed
  - Total revenue
  - Average job value
  - Completion rate
  - Average rating
  - Response time

##### Revenue Analytics
- Revenue trend chart
- Revenue by job type
- Revenue by building
- Revenue by employee
- Profit margin analysis
- Payment status breakdown
- Outstanding invoices

##### Job Analytics
- Jobs by status pie chart
- Jobs by type distribution
- Jobs by priority
- Average job duration
- Peak demand times
- Seasonal trends
- Job acceptance rate

##### Performance Metrics
- Customer satisfaction trend
- Rating breakdown (1-5 stars)
- Response time average
- Completion time vs estimate
- Rework rate
- Complaint resolution time

##### Employee Performance
- Top performers leaderboard
- Jobs per employee
- Revenue per employee
- Rating per employee
- Efficiency metrics
- Comparison view

##### Building Analytics
- Jobs by building
- Revenue by building
- Most serviced buildings
- Building-specific ratings
- Travel distance/time

##### Customer Analytics
- Repeat customers
- Customer satisfaction by building
- Feedback themes
- Service request patterns

##### Export & Reports
- PDF report generation
- Excel export
- Email reports
- Custom date ranges
- Scheduled reports

#### API Endpoints Needed
- `GET /service-provider/analytics` - Analytics data
- `GET /service-provider/analytics/revenue` - Revenue data
- `GET /service-provider/analytics/performance` - Performance metrics
- `GET /service-provider/analytics/employees` - Employee stats
- `POST /service-provider/analytics/export` - Export report

#### Code Reference
Location: `app/(serviceProvider)/analytics.tsx`

---

### 7. Ratings & Reviews (`app/(serviceProvider)/ratings.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Ratings Overview
- Overall average rating (large display)
- Total reviews count
- Rating distribution chart (5★, 4★, 3★, 2★, 1★)
- Rating trend over time
- Comparison to industry average

##### Reviews List
- Filter by:
  - All reviews
  - 5 stars
  - 4 stars
  - 3 stars
  - 2 stars
  - 1 star
  - Responded/Not responded
- Sort by:
  - Most recent
  - Highest rating
  - Lowest rating

##### Review Cards
- Customer name (or anonymous)
- Star rating
- Review text
- Job type and date
- Building/unit
- Photos (if included)
- Response status
- Response deadline

##### Review Details
- Full review text
- Job details link
- Customer history
- Employee who performed job
- Before/after photos
- Cost information
- Response composer

##### Respond to Reviews
- Thank you templates
- Apologize templates
- Custom response
- Character limit
- Professional tone suggestions
- Response visibility (public/private)

##### Review Analytics
- Average rating by job type
- Average rating by employee
- Average rating by building
- Common positive feedback themes
- Common complaints
- Improvement areas

##### Actions
- Respond to review
- Flag inappropriate review
- Request review removal (with reason)
- Share positive reviews (marketing)
- Export reviews report

#### Data Structure
```typescript
interface Rating {
  id: string;
  jobId: string;
  tenantId: string;
  tenantName?: string;
  serviceProviderId: string;
  employeeId?: string;
  employeeName?: string;
  overallRating: number; // 1-5
  qualityRating: number;
  communicationRating: number;
  timelinessRating: number;
  review?: string;
  photos?: string[];
  buildingId: string;
  unitNumber: string;
  jobType: string;
  isAnonymous: boolean;
  providerResponse?: string;
  respondedAt?: string;
  helpful?: number; // count of "helpful" votes
  createdAt: string;
}
```

#### API Endpoints Needed
- `GET /service-provider/ratings` - List all ratings
- `GET /service-provider/ratings/summary` - Rating statistics
- `POST /service-provider/ratings/:id/response` - Respond to review
- `PUT /service-provider/ratings/:id/response` - Edit response
- `POST /service-provider/ratings/:id/flag` - Flag review

#### Code Reference
Location: `app/(serviceProvider)/ratings.tsx`

---

### 8. Service Areas (`app/(serviceProvider)/service-areas.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Building Assignments
- List of buildings with access
- Building cards showing:
  - Building name and photo
  - Address
  - Number of units
  - Active jobs count
  - Total jobs completed
  - Average rating for this building
  - Contract status (Active/Pending/Expired)
  - Access level

##### Access Details
- Building-specific information
- Access instructions
- Security procedures
- Parking information
- Key/fob details
- Emergency contacts
- Operating hours
- Restricted areas

##### Request Building Access
- Search for buildings
- Select building
- Service types offered
- Certifications upload
- Insurance documents
- Reference letters
- Proposed pricing
- Availability

##### Access Request Status
- Pending requests
- Approval timeline
- Required documents checklist
- Follow-up actions
- Rejection reasons (if any)

##### Contract Management
- Contract start date
- Contract end date
- Renewal status
- Terms and conditions
- Service level agreements
- Pricing agreements
- Payment terms

##### Coverage Map
- Map view of service areas
- Buildings marked with pins
- Color-coded by access status
- Nearby buildings to target
- Travel distance from base

##### Performance by Building
- Jobs completed per building
- Revenue per building
- Rating per building
- Response time per building
- Issues/complaints

#### Data Structure
```typescript
interface ServiceProviderBuildingAssignment {
  id: string;
  serviceProviderId: string;
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  status: 'active' | 'pending' | 'expired' | 'revoked';
  accessLevel: 'full' | 'limited' | 'emergency_only';
  contractStartDate: string;
  contractEndDate?: string;
  servicesOffered: string[];
  accessInstructions?: string;
  parkingInfo?: string;
  emergencyContact?: {
    name: string;
    phone: string;
  };
  stats: {
    jobsCompleted: number;
    totalRevenue: number;
    averageRating: number;
  };
  documents: Array<{
    type: string;
    url: string;
    uploadedAt: string;
    expiryDate?: string;
  }>;
}

interface ProviderAccessRequest {
  id: string;
  serviceProviderId: string;
  buildingId: string;
  buildingName: string;
  requestedServices: string[];
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  requiredDocuments: string[];
  submittedDocuments: string[];
}
```

#### API Endpoints Needed
- `GET /service-provider/service-areas` - List building assignments
- `GET /service-provider/service-areas/:id` - Building details
- `POST /service-provider/access-requests` - Request building access
- `GET /service-provider/access-requests` - List access requests
- `GET /service-provider/service-areas/map` - Map data
- `POST /service-provider/service-areas/:id/documents` - Upload docs

#### Code Reference
Location: `app/(serviceProvider)/service-areas.tsx`

---

### 9. Profile (`app/(serviceProvider)/profile.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Company Information
- Company name
- Logo upload
- Business type
- Registration number
- Tax ID
- Year established
- Company description
- Website URL
- Social media links

##### Contact Information
- Primary contact name
- Email address
- Phone number
- Office address
- Service area coverage
- Operating hours
- Emergency contact

##### Services Offered
- Service categories checkboxes
  - Plumbing
  - Electrical
  - HVAC
  - Carpentry
  - Painting
  - Cleaning
  - Landscaping
  - Security
  - Other
- Service description per category
- Pricing structure

##### Certifications & Licenses
- Business license
- Insurance certificates
  - General liability
  - Workers compensation
  - Professional liability
- Industry certifications
- Background check status
- Document upload
- Expiry date tracking

##### Banking Information
- Bank name
- Account holder name
- Account number (masked)
- Routing number
- Payment preferences
- Invoice settings

##### Team Overview
- Number of employees
- Key personnel
- Fleet size (vehicles)
- Equipment owned

##### Settings
- Notification preferences
- Auto-accept job criteria
- Minimum job value
- Maximum travel distance
- Preferred buildings
- Blackout dates

##### Performance Summary
- Member since date
- Total jobs completed
- Overall rating
- Response rate
- Completion rate
- Customer satisfaction

#### API Endpoints Needed
- `GET /service-provider/profile` - Get profile
- `PUT /service-provider/profile` - Update profile
- `POST /service-provider/profile/logo` - Upload logo
- `POST /service-provider/profile/documents` - Upload documents
- `PUT /service-provider/profile/settings` - Update settings

#### Code Reference
Location: `app/(serviceProvider)/profile.tsx`

---

### 10. More Menu (`app/(serviceProvider)/more.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic navigation menu

#### Features
- Grid layout of additional features
- Navigation to secondary screens

#### Menu Items
1. **Analytics** → `/analytics`
2. **Ratings** → `/ratings`
3. **Service Areas** → `/service-areas`
4. **Profile** → `/profile`
5. **Settings** → `/settings`
6. **Help & Support** → `/help`
7. **Documents** → `/documents`
8. **Payments** → `/payments`

#### Code Reference
Location: `app/(serviceProvider)/more.tsx`

---

## API Service Integration

### Service Used
```typescript
import apiService from '@/lib/services/api';

// Service provider endpoints (from constants.ts)
apiService.serviceProvider.getJobs()
apiService.serviceProvider.acceptJob(jobId)
apiService.serviceProvider.declineJob(jobId, reason)
apiService.serviceProvider.assignJob(jobId, employeeId)
apiService.serviceProvider.getTeam()
apiService.serviceProvider.addEmployee(data)
apiService.serviceProvider.getServiceAreas()
apiService.serviceProvider.requestAccess(buildingId, data)
apiService.serviceProvider.getAnalytics()
apiService.serviceProvider.getRatings()
apiService.serviceProvider.respondToRating(ratingId, response)
```

### API Endpoints (Defined in constants.ts)
```typescript
API_ENDPOINTS.serviceProvider = {
  jobs: "/service-provider/jobs",
  job: (id) => `/service-provider/jobs/${id}`,
  acceptJob: (id) => `/service-provider/jobs/${id}/accept`,
  declineJob: (id) => `/service-provider/jobs/${id}/decline`,
  assignJob: (id) => `/service-provider/jobs/${id}/assign`,
  startJob: (id) => `/service-provider/jobs/${id}/start`,
  completeJob: (id) => `/service-provider/jobs/${id}/complete`,
  uploadPhoto: (id) => `/service-provider/jobs/${id}/photos`,
  addCost: (id) => `/service-provider/jobs/${id}/costs`,
  team: "/service-provider/team",
  addEmployee: "/service-provider/team",
  employee: (id) => `/service-provider/team/${id}`,
  serviceAreas: "/service-provider/service-areas",
  requestAccess: "/service-provider/access-requests",
  analytics: "/service-provider/analytics",
  ratings: "/service-provider/ratings",
  respondToRating: (id) => `/service-provider/ratings/${id}/response`,
  profile: "/service-provider/profile",
  updateProfile: "/service-provider/profile",
}
```

### Service Location
API endpoints fully defined in: `lib/utils/constants.ts`

---

## Data Types & Interfaces

### Primary Types
```typescript
Job, ServiceProviderProfile, ServiceProviderEmployee,
ServiceProviderBuildingAssignment, ProviderAccessRequest,
Rating, JobSchedule, Analytics
```

### Type Location
All types defined in: `lib/types/index.ts`

---

## Permissions & Access Control

### Service Provider Capabilities
✅ View and accept job offers for buildings with access
✅ Manage own employees and team
✅ Schedule jobs and assign to employees
✅ Track job progress and completion
✅ Upload progress photos and documentation
✅ Manage costs and invoicing
✅ View ratings and respond to reviews
✅ Request access to new buildings
✅ View performance analytics
✅ Manage company profile and certifications

### Restrictions
❌ Cannot create jobs (jobs come from requests)
❌ Cannot view jobs in buildings without access
❌ Cannot access tenant personal information (beyond job context)
❌ Cannot modify building settings
❌ Cannot view other service providers' data
❌ Cannot override customer ratings
❌ Cannot access system administration

---

## Current Implementation Status

### Summary Table
| Feature | Status | Completion | Notes |
|---------|--------|-----------|-------|
| Dashboard | ⚠️ Placeholder | 15% | Routing only |
| Jobs Management | ⚠️ Placeholder | 15% | Routing only |
| Job Details | ⚠️ Placeholder | 15% | Routing only |
| Schedule | ⚠️ Placeholder | 15% | Routing only |
| Team Management | ⚠️ Placeholder | 15% | Routing only |
| Analytics | ⚠️ Placeholder | 15% | Routing only |
| Ratings | ⚠️ Placeholder | 15% | Routing only |
| Service Areas | ⚠️ Placeholder | 15% | Routing only |
| Profile | ⚠️ Placeholder | 15% | Routing only |
| More Menu | ⚠️ Placeholder | 15% | Routing only |

### API Endpoints Status
✅ All endpoints defined in constants.ts
❌ Backend implementation needed
❌ Frontend UI implementation needed

---

## Next Steps for Service Provider Role

### Priority 1: Core Job Management
1. ❌ Implement Dashboard with job offers and metrics
2. ❌ Implement Jobs list with accept/decline flow
3. ❌ Implement Job Details with full workflow
4. ❌ Connect to backend APIs

### Priority 2: Team & Scheduling
1. ❌ Implement Team Management UI
2. ❌ Implement Schedule calendar view
3. ❌ Implement Job assignment to employees
4. ❌ Add employee tracking features

### Priority 3: Performance & Growth
1. ❌ Implement Analytics dashboard
2. ❌ Implement Ratings & Reviews management
3. ❌ Implement Service Areas management
4. ❌ Add access request workflow

### Priority 4: Professional Features
1. ❌ Add invoicing and payment tracking
2. ❌ Add document management
3. ❌ Add customer communication tools
4. ❌ Add route optimization

---

## Recent Updates

- **[2025-11-05]** Created comprehensive service provider features documentation
- **[2025-10-22]** Defined all API endpoints in constants
- **[2025-10-20]** Initial routing structure created

---

## Related Documentation

- Backend API Requirements: `docs/backend/README.md`
- API Endpoints: `lib/utils/constants.ts`
- Type Definitions: `lib/types/index.ts`
- Project Overview: `README.md`
- Architecture Guide: `docs/ARCHITECTURE.md`
