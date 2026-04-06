# Employee Role Features

## Overview

The **Employee** role represents field workers who are employed by service providers to perform maintenance, repair, and other service jobs in buildings. Employees receive job assignments, travel to job locations, complete work, document progress, and earn payments based on job completion.

**Planned Route Group:** `app/(employee)/`
**Role Identifier:** `employee`
**Access Level:** Job-scoped access (assigned jobs only)

**Runtime Status:** Not mounted
- There is no live `app/(employee)/` route group in the current Expo Router tree.
- Treat the screens and paths below as target-state documentation plus API integration intent, not current runtime routes.

---

## Key Characteristics

- **Field Worker:** Mobile workforce doing on-site jobs
- **Job-Based Access:** Only see jobs assigned to them
- **Service Provider Employee:** Works for a service provider company
- **Mobile-First:** Designed for on-the-go use
- **Earnings Tracking:** Monitor job payments and earnings
- **Direct Communication:** Message coordinators and customers
- **Photo Documentation:** Document work with before/after photos

---

## Navigation Structure

### Bottom Tabs (Primary Navigation)
- **Dashboard** - Today's jobs and overview
- **Jobs** - All assigned jobs
- **Schedule** - Calendar view of jobs
- **Messages** - Communication center
- **Earnings** - Payment tracking
- **Profile** - Employee profile

---

## Screens & Features

### 1. Dashboard (`app/(employee)/index.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Today's Overview
- Current date with day of week
- Today's jobs count
- Hours scheduled today
- Estimated earnings today
- Completion status

##### Active Job Card (if any)
- Current job in progress
- Job title and type
- Location with map thumbnail
- Customer name (building/unit)
- Start time
- Elapsed time
- Actions:
  - Continue working
  - Upload photo
  - Add costs
  - Complete job

##### Today's Jobs List
- Chronological order
- Job cards showing:
  - Time and duration
  - Job type icon
  - Location
  - Building name and unit
  - Status badge
  - Navigation button
  - Quick actions

##### Quick Stats
- Jobs completed today
- Jobs remaining today
- Hours worked
- Break time remaining
- Distance traveled

##### Notifications
- New job assignments
- Job updates
- Schedule changes
- Payment confirmations
- Customer messages
- Emergency alerts

##### Quick Actions
- Start next job
- View map/route for today
- Clock in/out
- Report issue
- Message dispatcher
- Request break

##### Upcoming Jobs (Tomorrow)
- Preview of next day's schedule
- Preparation needed
- Early start times flagged

#### Data Sources
```typescript
actions.getEmployeeDashboard()      // Today's overview
actions.getEmployeeJobsToday()      // Today's jobs
actions.getActiveJob()              // Current job
```

#### API Endpoints (Defined in constants.ts)
- ✅ `GET /employee/dashboard` - Dashboard data
- ✅ `GET /employee/jobs?status=today` - Today's jobs
- ✅ `GET /employee/jobs/active` - Active job

#### Code Reference
Location: `app/(employee)/index.tsx`

---

### 2. Jobs Management (`app/(employee)/jobs.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only, **API endpoints fully defined**

#### Planned Features

##### Job List with Tabs
- **Assigned** - New jobs awaiting acceptance
  - Job details preview
  - Accept/Decline buttons
  - Decline reason required
  - Deadline to respond

- **Upcoming** - Accepted jobs not yet started
  - Scheduled date/time
  - Preparation checklist
  - Required tools/materials
  - Customer contact info

- **In Progress** - Currently active jobs
  - Timer running
  - Progress tracker
  - Quick actions
  - Photo upload
  - Cost tracking

- **Completed** - Finished jobs
  - Completion date
  - Customer approval status
  - Payment status
  - Rating received

##### Job Card Display
- Job title and type icon
- Building name and address
- Unit number
- Customer name
- Scheduled date and time
- Duration estimate
- Payment amount
- Status badge
- Distance from current location
- Priority indicator

##### Job Workflow

**Step 1: Accept Job**
- View full job details
- Check location and time
- Accept or decline
- If decline: Select reason
  - Schedule conflict
  - Wrong skills
  - Too far
  - Not available
  - Other (specify)

**Step 2: Prepare for Job**
- Review job description
- Check required tools
- Review materials needed
- View location on map
- Contact customer (if needed)
- Navigate to location

**Step 3: Start Job**
- Arrive at location
- Check in (location verified)
- Take "before" photos
- Clock in/start timer
- Review scope with customer
- Begin work

**Step 4: During Job**
- Progress photo updates
- Add notes
- Log additional work
- Add costs for materials
  - Item description
  - Quantity
  - Cost per unit
  - Photo of receipt
  - Customer approval
- Request help (if needed)
- Pause timer (breaks)

**Step 5: Complete Job**
- Final inspection
- Take "after" photos
- Create completion report
- Customer walkthrough
- Customer signature
- Final cost summary
- Submit for approval

**Step 6: Customer Approval**
- Wait for customer review
- Respond to feedback
- Make corrections if needed
- Final approval received
- Payment processed

##### Job Details Screen
- Complete job information
- Customer details
- Location with map
- Access instructions
- Special requirements
- Attachments from request
- Cost breakdown
- Status timeline
- Communication thread

##### Actions Available
- Accept job
- Decline job (with reason)
- Start job
- Pause job
- Resume job
- Upload progress photos
- Add materials cost
- Add labor hours
- Add notes
- Contact customer
- Contact dispatcher
- Request assistance
- Complete job
- View navigation

#### Data Structure
```typescript
interface EmployeeJob {
  id: string;
  requestId?: string;
  serviceProviderId: string;
  employeeId: string;
  type: string;
  title: string;
  description: string;
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  unitNumber: string;
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'pending_approval' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tenantName?: string;
  tenantPhone?: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  estimatedDuration: number; // minutes
  payment: number;
  paymentStatus: 'pending' | 'approved' | 'paid';
  startedAt?: string;
  completedAt?: string;
  actualDuration?: number;
  beforePhotos?: string[];
  afterPhotos?: string[];
  progressPhotos?: string[];
  additionalCosts?: Array<{
    item: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    receiptPhoto?: string;
    approved: boolean;
  }>;
  notes?: string;
  customerSignature?: string;
  customerRating?: number;
  customerFeedback?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance?: number; // km from employee location
  accessInstructions?: string;
  parkingInfo?: string;
  requiredTools?: string[];
  requiredMaterials?: string[];
}
```

#### API Endpoints (All Defined in constants.ts)
- ✅ `GET /employee/jobs` - List all jobs
- ✅ `GET /employee/jobs/:id` - Job details
- ✅ `PUT /employee/jobs/:id/accept` - Accept job
- ✅ `PUT /employee/jobs/:id/decline` - Decline job
- ✅ `PUT /employee/jobs/:id/start` - Start job
- ✅ `POST /employee/jobs/:id/photos` - Upload photos
- ✅ `POST /employee/jobs/:id/costs` - Add material costs
- ✅ `PUT /employee/jobs/:id/complete` - Complete job

#### Code Reference
Location: `app/(employee)/jobs.tsx`
API Service: `lib/services/api/employee.ts` (90% complete)

---

### 3. Job Details (`app/(employee)/job-details.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only, **API endpoints defined**

#### Planned Features

##### Job Information Panel
- Job title with type icon
- Status with progress bar
- Priority badge
- Description with formatting
- Scope of work bullet points

##### Location & Navigation
- Building name and full address
- Unit number and floor
- Map view with pin
- "Navigate" button (opens maps app)
- Distance and ETA
- Parking instructions
- Building access info

##### Customer Information
- Customer name
- Unit number
- Phone number (tap to call)
- Email (if available)
- Preferred contact method
- Special instructions from customer
- Language preference

##### Schedule Details
- Scheduled date (large display)
- Start time
- End time
- Duration estimate
- Time window (e.g., "Between 9 AM - 12 PM")
- Time remaining (if in progress)
- Actual time spent

##### Payment Information
- Base payment amount
- Additional costs (materials)
- Total payment
- Payment status badge
- Payment method

##### Requirements
- Required tools checklist
- Required materials list
- Required certifications
- Safety equipment needed

##### Photo Gallery
- **Before Photos Section**
  - Upload before starting work
  - Multiple photos support
  - Photo timestamps
  - Photo captions

- **Progress Photos Section**
  - Upload during work
  - Timestamped automatically
  - Show work progress

- **After Photos Section**
  - Upload on completion
  - Compare with before photos
  - Final result documentation

##### Cost Tracking
- Materials/supplies log
- Add cost button
- Cost entry form:
  - Item name/description
  - Quantity
  - Unit price
  - Total (auto-calculated)
  - Receipt photo
  - Submit for approval
- Running total
- Approved/pending indicators

##### Notes & Communication
- Internal notes (for service provider)
- Customer communication thread
- Timestamps on all messages
- Read receipts
- Attachment support

##### Action Buttons
Context-sensitive buttons based on job status:
- **When Assigned:**
  - Accept Job (green)
  - Decline Job (red)
  - Contact Customer

- **When Accepted (Before Start):**
  - Start Job (primary)
  - Navigate to Location
  - Contact Customer
  - Decline Job

- **When In Progress:**
  - Upload Photo
  - Add Cost
  - Add Note
  - Pause Job
  - Complete Job
  - Request Help

- **When Completed:**
  - View Completion Report
  - View Customer Signature
  - View Rating

##### Completion Flow
- Completion checklist
- Before/after photo review
- Final cost summary
- Customer signature pad
- Completion notes
- Submit button
- Success confirmation

#### API Endpoints (Defined)
- ✅ `GET /employee/jobs/:id` - Detailed job info
- ✅ `POST /employee/jobs/:id/photos` - Upload photos
- ✅ `POST /employee/jobs/:id/costs` - Add costs
- ✅ `POST /employee/jobs/:id/notes` - Add notes

#### Code Reference
Location: `app/(employee)/job-details.tsx`

---

### 4. Schedule (`app/(employee)/schedule.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only

#### Planned Features

##### Calendar Views
- **Month View**
  - Full month calendar
  - Jobs indicated by color dots
  - Tap day to see details
  - Color coding by status

- **Week View**
  - 7-day horizontal scroll
  - Jobs as timeline blocks
  - Time-based layout
  - Scroll to current time

- **Day View**
  - Hourly breakdown
  - Job blocks with durations
  - Travel time shown
  - Free time visible
  - Current time indicator

- **Agenda List View**
  - Chronological job list
  - Next 30 days
  - Grouping by date
  - Quick scroll to today

##### Job Schedule Information
- Job time and duration
- Location
- Customer name
- Payment amount
- Travel time to next job
- Status badge

##### Route Planning
- Multiple jobs in one day
- Optimized route suggestion
- Total travel distance
- Total travel time
- Map view of all locations
- Turn-by-turn navigation

##### Availability Management
- Set working days
- Set working hours
- Mark days off
- Block specific times
- Indicate availability to dispatcher

##### Filters
- Show all jobs
- Show only my accepted jobs
- Show only today's jobs
- Hide completed jobs

##### Job Actions from Schedule
- View job details
- Accept/decline job
- Navigate to location
- Contact customer
- Reschedule request

#### API Endpoints Needed
- `GET /employee/schedule` - Get schedule
- `GET /employee/schedule/week` - Week view data
- `GET /employee/schedule/day` - Day view data
- `PUT /employee/availability` - Update availability

#### Code Reference
Location: `app/(employee)/schedule.tsx`

---

### 5. Messages (`app/(employee)/messages.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only, **API endpoints defined**

#### Planned Features

##### Conversations List
- All message threads
- Conversation cards showing:
  - Contact name (Dispatcher, Customer, Supervisor)
  - Last message preview
  - Timestamp
  - Unread badge count
  - Job reference (if job-related)
  - Priority indicator
- Search conversations
- Filter by:
  - All
  - Unread
  - Job-related
  - General

##### Message Thread
- Chronological message display
- Sent/received distinction
- Timestamps (grouped by time proximity)
- Read receipts
- Typing indicators
- Job context (if job-related)
- Quick actions bar

##### Message Types
- Text messages
- Photos
- Voice notes (if supported)
- Location sharing
- Job updates
- System notifications

##### Message Composer
- Text input with formatting
- Attachment button (photos)
- Quick replies
- Emoji support
- Send button
- Character counter (if limited)

##### Quick Replies
- "On my way"
- "Running 15 min late"
- "Completed successfully"
- "Need more time"
- "Materials needed"
- "Job paused"

##### Notifications
- Push notifications for new messages
- Badge counts
- Sound/vibration alerts
- Do not disturb mode

#### Data Structure
```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'employee' | 'dispatcher' | 'customer' | 'system';
  recipientId: string;
  content: string;
  type: 'text' | 'photo' | 'voice' | 'location' | 'system';
  attachments?: string[];
  jobId?: string;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  readAt?: string;
}

interface Conversation {
  id: string;
  participantIds: string[];
  participantNames: string[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  jobId?: string;
  jobTitle?: string;
}
```

#### API Endpoints (Defined in constants.ts)
- ✅ `GET /employee/messages` - List conversations
- ✅ `GET /employee/messages/:conversationId` - Get messages
- ✅ `POST /employee/messages` - Send message
- ✅ `PUT /employee/messages/:id/read` - Mark as read

#### Code Reference
Location: `app/(employee)/messages.tsx`
API Service: `lib/services/api/employee.ts`

---

### 6. Earnings (`app/(employee)/earnings.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only, **API endpoints defined**

#### Planned Features

##### Earnings Overview
- **This Month Summary**
  - Total earnings (large display)
  - Jobs completed count
  - Average per job
  - Pending payments
  - Paid amount
  - Payment date (next payout)

- **Quick Stats**
  - This week earnings
  - Today's earnings
  - Yesterday's earnings
  - Best earning day this month

##### Earnings Breakdown
- Filter by time period:
  - This week
  - This month
  - Last month
  - Last 3 months
  - Custom date range

- **Earnings by Job Type**
  - Pie chart or bar chart
  - Plumbing
  - Electrical
  - HVAC
  - Maintenance
  - Other

- **Earnings Timeline**
  - Line chart showing daily/weekly/monthly
  - Trend indicators
  - Comparison with previous period

##### Job Earnings List
- All jobs with payment info
- Job cards showing:
  - Job title and type
  - Date completed
  - Building/unit
  - Base payment
  - Additional costs (materials)
  - Total payment
  - Payment status badge
  - Payment date

##### Payment Status Types
- **Pending Approval** (yellow)
  - Customer approval needed
  - Estimated payment

- **Approved** (blue)
  - Approved for payment
  - Waiting for payout cycle

- **Paid** (green)
  - Payment received
  - Payment date
  - Payment method

- **Disputed** (red)
  - Customer dispute
  - Reason provided
  - Action required

##### Payment History
- All received payments
- Payment date
- Payment method (Bank transfer, Check, etc.)
- Payment reference number
- Jobs included in payment
- Total amount
- Download receipt/statement

##### Earnings Insights
- Best performing job types
- Peak earning days/times
- Average job duration vs payment
- Efficiency metrics
- Growth trends

##### Tax Information
- Year-to-date earnings
- Estimated tax liability
- Quarterly summaries
- Export for tax filing
- 1099 forms (if applicable)

##### Actions
- View payment details
- Download statements
- Export to CSV/Excel
- Print pay stubs
- Update payment method
- Contact payroll

#### Data Structure
```typescript
interface Earning {
  id: string;
  employeeId: string;
  jobId: string;
  jobTitle: string;
  jobType: string;
  completedAt: string;
  basePayment: number;
  additionalCosts: number;
  totalPayment: number;
  status: 'pending_approval' | 'approved' | 'paid' | 'disputed';
  approvedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  disputeReason?: string;
}

interface PaymentSummary {
  period: 'week' | 'month' | 'quarter' | 'year';
  totalEarnings: number;
  jobsCompleted: number;
  averagePerJob: number;
  pendingAmount: number;
  paidAmount: number;
  nextPayoutDate: string;
  nextPayoutAmount: number;
}
```

#### API Endpoints (Defined in constants.ts)
- ✅ `GET /employee/earnings` - Earnings data
- ✅ `GET /employee/earnings/summary` - Summary statistics
- ✅ `GET /employee/earnings/history` - Payment history
- ✅ `GET /employee/earnings/export` - Export data

#### Code Reference
Location: `app/(employee)/earnings.tsx`
API Service: `lib/services/api/employee.ts`

---

### 7. Profile (`app/(employee)/profile.tsx`)

**Status:** ⚠️ **15% Placeholder** - Basic routing only, **API endpoints defined**

#### Planned Features

##### Personal Information
- Profile photo upload
- Full name
- Employee ID
- Email address
- Phone number
- Date of birth
- Emergency contact
- Address

##### Employment Details
- Service provider/company name
- Job title/role
- Department
- Hire date
- Employment type (Full-time/Part-time/Contract)
- Supervisor name and contact

##### Skills & Certifications
- **Skills List**
  - Skill name
  - Proficiency level (Beginner/Intermediate/Expert)
  - Years of experience
  - Add/remove skills

- **Certifications**
  - Certification name
  - Issuing organization
  - Certificate number
  - Issue date
  - Expiry date
  - Certificate document upload
  - Verification status
  - Renewal reminders

- **Licenses**
  - License type
  - License number
  - Expiry date
  - Upload document

##### Performance Metrics
- Total jobs completed
- Average job rating (stars)
- On-time completion rate
- Customer satisfaction score
- Response time average
- Rework rate
- Efficiency score
- Total earnings (lifetime)

##### Achievements & Badges
- Top performer badges
- Milestone achievements
- 5-star reviews count
- Perfect month badges
- Specialization badges

##### Work Preferences
- Preferred job types
- Preferred working days
- Preferred working hours
- Maximum travel distance
- Availability for emergency calls
- Preferred locations/areas

##### Documents
- Resume/CV
- ID proof
- Address proof
- Insurance documents
- Background check
- References

##### Settings
- **Notifications**
  - Job assignments
  - Schedule changes
  - Messages
  - Payment updates
  - System alerts
  - Push/Email/SMS preferences

- **Privacy**
  - Location sharing
  - Profile visibility
  - Contact information visibility

- **Account**
  - Change password
  - Two-factor authentication
  - Language preference
  - Timezone
  - App theme (light/dark)

##### Banking Information
- Bank name
- Account number (masked)
- Routing number
- Account type
- Payment preferences

#### API Endpoints (Defined in constants.ts)
- ✅ `GET /employee/profile` - Get profile
- ✅ `PUT /employee/profile` - Update profile
- ✅ `POST /employee/profile/photo` - Upload photo
- ✅ `POST /employee/profile/documents` - Upload documents
- ✅ `PUT /employee/profile/settings` - Update settings

#### Code Reference
Location: `app/(employee)/profile.tsx`
API Service: `lib/services/api/employee.ts`

---

## API Service Integration

### Service Status
**Status:** ✅ **90% Complete** - Full API service module exists

### Service Location
`lib/services/api/employee.ts`

### All Endpoints Defined
All employee endpoints are fully defined in `lib/utils/constants.ts`:

```typescript
API_ENDPOINTS.employee = {
  jobs: "/employee/jobs",
  job: (id) => `/employee/jobs/${id}`,
  acceptJob: (id) => `/employee/jobs/${id}/accept`,
  declineJob: (id) => `/employee/jobs/${id}/decline`,
  startJob: (id) => `/employee/jobs/${id}/start`,
  uploadPhoto: (id) => `/employee/jobs/${id}/photos`,
  addCost: (id) => `/employee/jobs/${id}/costs`,
  completeJob: (id) => `/employee/jobs/${id}/complete`,
  messages: "/employee/messages",
  sendMessage: "/employee/messages",
  earnings: "/employee/earnings",
  profile: "/employee/profile",
  updateProfile: "/employee/profile",
}
```

---

## Data Types & Interfaces

### Primary Types
```typescript
EmployeeJob, Earning, Message, Conversation,
EmployeeProfile, Certification, Skill, PaymentSummary
```

### Type Location
All types defined in: `lib/types/index.ts`

---

## Permissions & Access Control

### Employee Capabilities
✅ View and accept jobs assigned to them
✅ Start and complete jobs
✅ Upload progress photos
✅ Add material costs
✅ Track earnings and payments
✅ Communicate with dispatchers and customers
✅ Manage own profile and certifications
✅ View own schedule
✅ Update availability

### Restrictions
❌ Cannot view other employees' jobs
❌ Cannot assign jobs to themselves
❌ Cannot access jobs not assigned to them
❌ Cannot modify payment amounts
❌ Cannot access customer personal information beyond job context
❌ Cannot view service provider financial data
❌ Cannot manage other employees
❌ Cannot override customer decisions

---

## Current Implementation Status

### Summary Table
| Feature | Status | Completion | Notes |
|---------|--------|-----------|-------|
| Dashboard | ⚠️ Placeholder | 15% | Routing only |
| Jobs Management | ⚠️ Placeholder | 15% | Routing only |
| Job Details | ⚠️ Placeholder | 15% | Routing only |
| Schedule | ⚠️ Placeholder | 15% | Routing only |
| Messages | ⚠️ Placeholder | 15% | Routing only |
| Earnings | ⚠️ Placeholder | 15% | Routing only |
| Profile | ⚠️ Placeholder | 15% | Routing only |
| **API Service** | ✅ **Complete** | **90%** | **Fully implemented!** |
| **API Endpoints** | ✅ **Complete** | **100%** | **All defined in constants** |

---

## Next Steps for Employee Role

### Priority 1: Job Workflow (Backend Ready!)
1. ❌ Implement Dashboard with today's jobs
2. ❌ Implement Jobs list with accept/decline
3. ❌ Implement Job Details with full workflow
4. ❌ Implement photo upload functionality
5. ✅ **Backend integration ready - API service exists!**

### Priority 2: Communication & Earnings
1. ❌ Implement Messages/communication center
2. ❌ Implement Earnings tracking and display
3. ❌ Add payment history
4. ❌ Implement push notifications

### Priority 3: Schedule & Profile
1. ❌ Implement Schedule calendar views
2. ❌ Implement Profile with certifications
3. ❌ Add route optimization
4. ❌ Implement availability management

---

## Key Advantage

🎯 **The Employee role has the most complete backend foundation:**
- ✅ API service layer fully implemented (`lib/services/api/employee.ts`)
- ✅ All API endpoints defined in constants
- ✅ Ready for rapid frontend development
- ✅ Backend integration can proceed immediately

---

## Recent Updates

- **[2025-11-05]** Created comprehensive employee features documentation
- **[2025-10-22]** Completed API service implementation (90%)
- **[2025-10-20]** Defined all API endpoints in constants
- **[2025-10-18]** Initial routing structure created

---

## Related Documentation

- API Service Implementation: `lib/services/api/employee.ts`
- API Endpoints: `lib/utils/constants.ts`
- Type Definitions: `lib/types/index.ts`
- Project Overview: `README.md`
- Architecture Guide: `docs/ARCHITECTURE.md`
