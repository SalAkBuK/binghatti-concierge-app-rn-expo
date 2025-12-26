// Core application types

export type UserStatus = "active" | "inactive";

export interface User {
  id: string;
  email: string;
  name: string;
  role:
    | "tenant"
    | "admin"
    | "super_admin"
    | "management"
    | "service_provider"
    | "employee"
    | "building_employee";
  phone?: string;
  status?: UserStatus;
  profile?: UserProfile;
  profileCompleted?: boolean; // Track if user has completed initial profile setup
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  name?: string;
  phone?: string;
  apartment?: string;
  tower?: string;
  floor?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  avatar?: string;
  buildingId?: string;
  managedBuildingIds?: string[];
  serviceProviderId?: string;
  serviceProviderName?: string;
  jobTitle?: string;
  specialties?: string[];
  certifications?: string[];
  rating?: number;
  completedJobs?: number;
  emiratesId?: string;
  passportNumber?: string;
  attachments?: string[]; // Profile pictures and documents
  companyName?: string;
  companyLogoUrl?: string;
  companyWebsite?: string;
  companyDescription?: string;
  companyAddress?: string;
  // Admin-specific fields from backend API
  address?: string;        // User's address (returned by Admin API)
  nationality?: string;    // User's nationality (returned by Admin API)
}

export interface Attachment {
  id: string;
  uri: string;
  type: "image" | "video";
  filename: string;
  size: number; // bytes
  mimeType: string;
  width?: number;
  height?: number;
  thumbnail?: string; // URI to thumbnail for videos
  createdAt: string;
}

export type RequestMessageChannel = "tenant" | "provider" | "internal";

export interface RequestMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: User["role"];
  channel: RequestMessageChannel;
  body: string;
  attachments?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type RequestNoteVisibility = "management" | "operations" | "security";

export interface RequestNote {
  id: string;
  requestId: string;
  authorId: string;
  authorName: string;
  body: string;
  visibility: RequestNoteVisibility;
  createdAt: string;
  updatedAt?: string;
}

export type RequestTimelineEventType =
  | "status_change"
  | "assignment"
  | "sla"
  | "message"
  | "note"
  | "attachment"
  | "escalation";

export interface RequestTimelineEvent {
  id: string;
  requestId: string;
  eventType: RequestTimelineEventType;
  title: string;
  description?: string;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Request {
  id: string;
  title: string;
  description: string;
  type:
    | "maintenance"
    | "repair"
    | "cleaning"
    | "electrical"
    | "plumbing"
    | "hvac"
    | "other";
  status: "pending" | "in-progress" | "on-hold" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  tenantId: string;
  assignedTo?: string;
  buildingId?: string;
  buildingName?: string;
  apartment?: string;
  tower?: string;
  floor?: string;
  preferredTime?: string;
  contactPhone?: string;
  additionalNotes?: string;
  attachments: string[]; // URIs to attachments (kept as string[] for backward compatibility)
  slaDueAt?: string;
  lastEscalatedAt?: string;
  comments: RequestComment[];
  messages: RequestMessage[];
  notes: RequestNote[];
  timeline: RequestTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface RequestComment {
  id: string;
  requestId: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
  channel?: RequestMessageChannel;
  attachments?: string[];
  visibility?: RequestMessageChannel | "internal";
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
}

export interface MaintenanceNotice {
  id: string;
  title: string;
  description: string;
  scheduledDate?: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  affectedAreas: string[];
  estimatedDuration?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

// Form DTOs
export interface CreateRequestDTO {
  title: string;
  description: string;
  type: Request["type"];
  priority: Request["priority"];
  apartment?: string;
  tower?: string;
  floor?: string;
  buildingName?: string;
  buildingId?: string;
  preferredTime?: string;
  contactPhone?: string;
  additionalNotes?: string;
  attachments?: string[];
  slaDueAt?: string;
}

export interface UpdateRequestDTO {
  title?: string;
  description?: string;
  status?: Request["status"];
  priority?: Request["priority"];
  assignedTo?: string;
  buildingId?: string;
  additionalNotes?: string;
  attachments?: string[];
  slaDueAt?: string;
  lastEscalatedAt?: string;
}

export interface CreateRequestMessageDTO {
  requestId: string;
  senderId: string;
  senderName: string;
  senderRole: User["role"];
  channel: RequestMessageChannel;
  body: string;
  attachments?: string[];
}

export interface CreateRequestNoteDTO {
  requestId: string;
  authorId: string;
  authorName: string;
  body: string;
  visibility?: RequestNoteVisibility;
}

export interface CreateRequestTimelineEventDTO {
  requestId: string;
  eventType: RequestTimelineEventType;
  title: string;
  description?: string;
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, any>;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  phone?: string;
  apartment?: string;
  tower?: string;
}

export interface ResetPasswordDTO {
  email: string;
  newPassword: string;
}

// State types (matching the actual AppContext structure)
export interface AppState {
  isAuthenticated: boolean;
  currentUser: User | null;
  userRole: string | null;
  currentView: string;
  selectedRequest: Request | null;
  requests: Request[];
  notifications: Notification[];
  leases?: Lease[];
  maintenanceNotices: MaintenanceNotice[];
  users: Record<string, User>;
  loading: boolean;
  error: string | null;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
  userRole: string | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export interface RequestsState {
  requests: Request[];
  selectedRequest: Request | null;
  loading: boolean;
  error: string | null;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

// Action types
export interface AuthActions {
  setAuth: (authData: Partial<AuthState>) => void;
  login: (credentials: LoginDTO) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

export interface RequestActions {
  createRequest: (
    requestData: CreateRequestDTO,
    tenantId: string,
  ) => Promise<Request>;
  updateRequest: (id: string, updates: UpdateRequestDTO) => Promise<Request>;
  deleteRequest: (id: string) => Promise<Request>;
  setSelectedRequest: (request: Request | null) => void;
  addRequestMessage: (
    payload: CreateRequestMessageDTO,
  ) => Promise<RequestMessage>;
  addRequestNote: (payload: CreateRequestNoteDTO) => Promise<RequestNote>;
  logTimelineEvent: (
    payload: CreateRequestTimelineEventDTO,
  ) => RequestTimelineEvent;
}

export interface NotificationActions {
  createNotification: (
    userId: string,
    title: string,
    message: string,
    type?: Notification["type"],
  ) => Notification;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: (userId?: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
}

// Amenity types
export type AmenityType =
  | "pool"
  | "gym"
  | "sauna"
  | "theater"
  | "playground"
  | "bbq"
  | "other";
export type AmenityStatus = "active" | "maintenance" | "inactive";

export interface Amenity {
  id: string;
  buildingId: string;
  amenityType: AmenityType;
  name: string;
  description: string;
  capacity: number;
  operatingHours: {
    [day: string]: { open: string; close: string };
  };
  bookingDurationMinutes: number;
  maxAdvanceBookingDays: number;
  status: AmenityStatus;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

// Booking types
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export interface AmenityBooking {
  id: string;
  amenityId: string;
  amenityName: string;
  amenityType: AmenityType;
  tenantId: string;
  tenantName?: string;
  buildingId: string;
  unitNumber?: string;
  slotDate: string; // YYYY-MM-DD
  slotTimeStart: string; // HH:MM
  slotTimeEnd: string; // HH:MM
  status: BookingStatus;
  numberOfGuests: number;
  bookingNotes: string;
  bookingCode: string;
  cancelledReason?: string;
  createdAt: string;
  updatedAt: string;
}

// Visitor types
export type VisitorStatus = "expected" | "arrived" | "departed" | "cancelled";
export type VisitorIdType =
  | "passport"
  | "national_id"
  | "driving_license"
  | "other";

export interface Visitor {
  id: string;
  tenantId: string;
  buildingId: string;
  unitNumber: string;
  visitorName: string;
  visitorPhone: string;
  visitorIdType: VisitorIdType;
  visitorIdNumber: string;
  idPhotoUrl?: string;
  visitPurpose: string;
  expectedArrivalTime: string; // ISO timestamp
  expectedDepartureTime: string; // ISO timestamp
  actualArrivalTime?: string;
  actualDepartureTime?: string;
  status: VisitorStatus;
  visitorCode: string;
  qrCodeUrl: string;
  checkedInBy?: string;
  checkedOutBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Rating types
export interface Rating {
  id: string;
  tenantId: string;
  requestId: string;
  serviceProviderId: string;
  buildingEmployeeId?: string;
  rating: number; // 1-5
  reviewText: string;
  jobId?: string;
  tenantName?: string;
  attachments: string[];
  responseText?: string;
  response?: string;
  responseDate?: string;
  respondedBy?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

// Admin-specific types

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
  emirate?: string; // Dubai, Abu Dhabi, Sharjah, Ajman, UAQ, RAK, Fujairah
  community?: string; // e.g., Dubai Marina, Downtown Dubai, JBR
  street?: string;
  plotNumber?: string;
  buildingNumber?: string;
  makaniNumber?: string; // Dubai's smart addressing system
  // Building details
  buildingType?: BuildingType;
  developer?: string;
  yearBuilt?: number;
  totalFloors?: number;
  utilityPremisesNumber?: string; // DEWA/FEWA/ADDC premises number
  // Management
  managerId?: string;
  managerName?: string;
  totalUnits: number;
  occupiedUnits: number;
  unitBreakdown?: UnitBreakdown; // Optional breakdown of unit types
  amenities: string[]; // Array of amenity IDs
  status: "active" | "maintenance" | "inactive";
  createdAt: string;
  updatedAt: string;
  location?: string;
  units?: BuildingUnit[];
}

export interface UnitType {
  id: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  areaSqFt: number;
  baseRent?: number;
  amenities: string[];
}

export type ManagedBy = "building" | "owner";
export type Furnishing = "furnished" | "semi_furnished" | "unfurnished";

export interface BuildingUnit {
  id: string;
  buildingId: string;
  unitNumber: string;
  floor: number;
  typeId: string;
  templateId?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqFt?: number;
  status: "occupied" | "vacant" | "maintenance";
  tenantId?: string;
  amenities: string[];
  photos?: string[];
  rentAmount?: number;
  offlineReason?: string;
  lastInspectionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  tower?: string;
  furnishing?: Furnishing;
  managedBy?: ManagedBy;
  billsInclusive?: boolean;
  maintenanceInclusive?: boolean;
  depositAmount?: number;
  maintenanceCharges?: number;
}

export type LeaseStatus = "active" | "notice" | "scheduled" | "ended";

export interface Lease {
  id: string;
  buildingId: string;
  unitId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount?: number;
  status: LeaseStatus;
  documents?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type VisitorPassType = "visitor" | "delivery" | "contractor";
export type VisitorPassStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "checked_in"
  | "completed"
  | "cancelled";

export interface VisitorPass {
  id: string;
  buildingId: string;
  tenantId?: string;
  unitNumber?: string;
  type: VisitorPassType;
  name: string;
  company?: string;
  contactPhone?: string;
  contactEmail?: string;
  scheduledStart: string; // ISO timestamp
  scheduledEnd: string; // ISO timestamp
  status: VisitorPassStatus;
  qrCodeUrl?: string;
  hostName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVisitorPassDTO {
  buildingId: string;
  tenantId?: string;
  unitNumber?: string;
  type: VisitorPassType;
  name: string;
  company?: string;
  contactPhone?: string;
  contactEmail?: string;
  scheduledStart: string;
  scheduledEnd: string;
  hostName?: string;
  notes?: string;
}

export type AmenityRule = {
  id: string;
  label: string;
  description?: string;
};

export type AmenityMaintenanceWindow = {
  start: string;
  end: string;
  notes?: string;
};

export interface BuildingAmenityConfig {
  id: string;
  buildingId: string;
  amenityId: string;
  amenityName: string;
  bookingWindowDays: number;
  maxDurationMinutes: number;
  maxConcurrentBookings: number;
  advanceCancellationHours: number;
  status: AmenityStatus;
  rules: AmenityRule[];
  maintenanceWindow?: AmenityMaintenanceWindow;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuildingEmployee {
  id: string;
  buildingId: string;
  userId?: string;
  name: string;
  role: string;
  phone: string;
  shift?: "morning" | "evening" | "night";
  rating?: number;
  jobsCompleted?: number;
}

// Parcel & Delivery Management types
export type ParcelStatus = "pending" | "picked_up" | "delivered" | "lost";

export interface Parcel {
  id: string;
  buildingId: string;
  unitNumber: string;
  tenantId?: string;
  tenantName?: string;
  courier?: string;
  receivedBy: string; // Employee name who received the parcel
  receivedByEmployeeId?: string;
  status: ParcelStatus;
  deliveryDate: string; // ISO timestamp when parcel arrived
  pickupDate?: string; // ISO timestamp when picked up
  pickupCode?: string; // Optional code for pickup verification
  notes?: string;
  imageUrl?: string; // Optional photo of parcel
  createdAt: string;
  updatedAt: string;
}

export interface CreateParcelDTO {
  buildingId: string;
  unitNumber: string;
  tenantId?: string;
  courier?: string;
  receivedBy: string;
  receivedByEmployeeId?: string;
  deliveryDate: string;
  pickupCode?: string;
  notes?: string;
  imageUrl?: string;
}

export interface UpdateParcelDTO {
  unitNumber?: string;
  tenantId?: string;
  courier?: string;
  status?: ParcelStatus;
  pickupDate?: string;
  notes?: string;
  imageUrl?: string;
}

// Shift Management types
export type ShiftStatus = "active" | "completed" | "cancelled";

export interface Shift {
  id: string;
  buildingId: string;
  employeeId: string;
  employeeName: string;
  role: string; // Job role/position for this shift (e.g., "Security", "Cleaner")
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24-hour format)
  endTime: string; // HH:MM (24-hour format)
  status: ShiftStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
}

export interface CreateShiftDTO {
  buildingId: string;
  employeeId: string;
  employeeName: string;
  role: string;
  shiftDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes?: string;
}

export interface UpdateShiftDTO {
  employeeId?: string;
  employeeName?: string;
  role?: string;
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
  status?: ShiftStatus;
  notes?: string;
}

export interface ShiftConflict {
  conflictType: "overlap" | "employee_on_leave" | "exceeds_max_hours";
  message: string;
  conflictingShift?: Shift;
}

// Maintenance Scheduling types
export type MaintenanceScheduleStatus = "upcoming" | "in_progress" | "completed" | "cancelled";
export type MaintenanceType =
  | "hvac"
  | "elevator"
  | "plumbing"
  | "electrical"
  | "fire_safety"
  | "water_system"
  | "cleaning"
  | "pest_control"
  | "landscaping"
  | "general"
  | "other";

export interface MaintenanceSchedule {
  id: string;
  buildingId: string;
  buildingName?: string;
  title: string;
  description: string;
  maintenanceType: MaintenanceType;
  scheduledDate: string; // ISO timestamp
  scheduledTime?: string; // HH:MM (optional, for display)
  duration?: number; // Duration in hours
  status: MaintenanceScheduleStatus;
  affectedAreas?: string[]; // Floor numbers, zones, or "Entire Building"
  affectedUnits?: string[]; // Specific unit numbers
  estimatedImpact?: string; // e.g., "Water will be shut off", "Elevator unavailable"
  notifiedTenants: boolean;
  notificationSentAt?: string; // ISO timestamp
  notificationMessage?: string; // Message sent to tenants
  completedAt?: string; // ISO timestamp
  cancelledAt?: string; // ISO timestamp
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
  notes?: string;
}

export interface CreateMaintenanceScheduleDTO {
  buildingId: string;
  title: string;
  description: string;
  maintenanceType: MaintenanceType;
  scheduledDate: string;
  scheduledTime?: string;
  duration?: number;
  affectedAreas?: string[];
  affectedUnits?: string[];
  estimatedImpact?: string;
  notifyTenants?: boolean;
  notificationMessage?: string;
  notes?: string;
}

export interface UpdateMaintenanceScheduleDTO {
  title?: string;
  description?: string;
  maintenanceType?: MaintenanceType;
  scheduledDate?: string;
  scheduledTime?: string;
  duration?: number;
  status?: MaintenanceScheduleStatus;
  affectedAreas?: string[];
  affectedUnits?: string[];
  estimatedImpact?: string;
  completedAt?: string;
  notes?: string;
}

export interface TenantImpact {
  totalUnits: number;
  affectedUnits: number;
  estimatedTenants: number;
  unitNumbers: string[];
}

export interface ScheduleConflict {
  conflictType: "overlap" | "same_day_multiple";
  message: string;
  conflictingSchedule?: MaintenanceSchedule;
}

export interface ServiceProviderProfile {
  id: string;
  userId?: string;
  name: string;
  specialty: string;
  phone: string;
  email?: string;
  rating: number;
  jobsCompleted: number;
  responseTimeMinutes?: number;
}

export interface ServiceProviderEmployee {
  id: string;
  serviceProviderId: string; // Link to parent Service Provider company
  userId?: string; // Link to User account if they can login (for future employee portal)
  name: string;
  phone: string;
  email?: string;
  specialty: string; // e.g., "Plumber", "Electrician", "HVAC Technician"
  status: "active" | "inactive" | "on_leave";
  rating?: number;
  jobsCompleted?: number;
  certifications?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceProviderBuildingAssignment {
  id: string;
  serviceProviderId: string;
  buildingId: string;
  assignedBy: string; // admin/management user ID
  assignedByName?: string;
  assignedAt: string;
  status: "active" | "suspended" | "revoked";
  specialties: string[]; // What services they offer at this building
  notes?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
}

export interface ProviderAccessRequest {
  id: string;
  serviceProviderId: string;
  serviceProviderName: string;
  buildingId: string;
  buildingName: string;
  requestedBy: string; // manager user ID
  requestedByName: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface VisitorLog {
  id: string;
  buildingId: string;
  tenantId?: string;
  unitNumber?: string;
  type: "visitor" | "delivery";
  name: string;
  company?: string;
  expectedArrival: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: "expected" | "checked_in" | "completed" | "cancelled";
  notes?: string;
}

export interface RatingSummary {
  id: string;
  entityId: string;
  entityName: string;
  role: "service_provider" | "employee";
  averageRating: number;
  reviewsCount: number;
  lastReviewDate?: string;
}

export interface Job {
  id: string;
  requestId?: string; // Link to a tenant request if applicable
  title: string;
  description: string;
  type: RequestType;
  status: "pending" | "assigned" | "in-progress" | "completed" | "cancelled";
  priority: RequestPriority;
  buildingId: string;
  buildingName?: string;
  unitNumber?: string;
  assignedTo?: string; // Service Provider Company ID
  assignedToName?: string; // Service Provider Company Name
  assignedToEmployeeId?: string; // Service Provider Employee ID (who will execute the job)
  assignedToEmployeeName?: string; // Service Provider Employee Name
  assignmentTargetType?: "service_provider" | "building_employee";
  assignedBuildingEmployeeId?: string;
  assignedBuildingEmployeeName?: string;
  offerStatus?: "offered" | "accepted" | "declined"; // Track SP company acceptance of job offer
  offeredAt?: string; // Timestamp when job was offered to SP
  acceptedAt?: string; // Timestamp when SP accepted the job
  declinedAt?: string; // Timestamp when SP declined the job
  declinedBy?: string;
  declineReason?: string;
  acceptanceNotes?: string;
  createdBy: string; // Admin or system
  attachments: string[];
  notes: JobNote[];
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: string;
  completedDate?: string;
  costBreakdown?: JobCostBreakdownItem[];
  complianceChecklist?: JobComplianceChecklistItem[];
  assignmentHistory: JobAssignmentRecord[];
  assignmentQueue?: JobAssignmentRecord[];
  // Employee workflow fields
  completionPhotos?: JobCompletionPhoto[]; // Photos uploaded by employee when completing job
  additionalCosts?: JobAdditionalCost[]; // Additional costs added by employee (requires SP approval)
  completionStatus?: "awaiting_tenant_approval" | "tenant_approved" | "sp_override_approved"; // Completion approval workflow
  completionApprovedBy?: string; // User ID who approved completion (tenant or SP)
  completionApprovedByName?: string; // Name of who approved
  completionApprovedAt?: string; // Timestamp of approval
  completionNotes?: string; // Employee or provider completion notes
  completionFeedback?: string; // Optional feedback provided by tenant on approval
  completionOverrideReason?: string; // Reason if SP overrode completion without tenant approval
  completionRejectionReason?: string; // Tenant supplied reason when rejecting completion
  completionRejectedBy?: string; // User ID who rejected completion
  completionRejectedByName?: string; // Name of user who rejected completion
  completionRejectedAt?: string; // Timestamp of rejection
  startedAt?: string; // When employee started the job
  startedBy?: string; // Employee ID who started the job
  tenantName?: string;
  tenantPhone?: string;
  paidDate?: string;
  estimate?: JobEstimate;
  createdAt: string;
  updatedAt: string;
}

export interface JobNote {
  id: string;
  jobId: string;
  userId: string;
  userName: string;
  note: string;
  createdAt: string;
}

export interface JobCostBreakdownItem {
  id: string;
  label: string;
  amount: number;
  category?: "labor" | "parts" | "fees" | "other";
  description?: string;
}

export interface JobComplianceChecklistItem {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface JobAssignmentRecord {
  id: string;
  targetType: "service_provider" | "building_employee";
  serviceProviderId?: string;
  serviceProviderName?: string;
  buildingEmployeeId?: string;
  buildingEmployeeName?: string;
  assignedBy: string;
  assignedByName?: string;
  assignedAt: string;
  scheduledDate?: string;
  status: "pending" | "accepted" | "declined" | "completed";
  notes?: string;
}

// Employee-specific job types

export interface JobCompletionPhoto {
  id: string;
  jobId: string;
  employeeId: string;
  employeeName: string;
  uri: string;
  thumbnailUri?: string;
  caption?: string;
  uploadedAt: string;
}

export interface JobAdditionalCost {
  id: string;
  jobId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  description: string;
  category?: "parts" | "labor" | "materials" | "other";
  status: "pending" | "approved" | "rejected";
  proofPhotoUri?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobAssignmentAction = "accept" | "decline" | "start" | "complete" | "upload_photo" | "add_cost";

export type JobEstimateStatus =
  | "draft"
  | "submitted"
  | "sp_approved"
  | "sp_rejected"
  | "tenant_approved"
  | "tenant_declined";

export interface JobEstimateItem {
  id: string;
  label: string;
  amount: number;
  description?: string;
  category?: "labor" | "parts" | "fees" | "materials" | "other";
}

export interface JobEstimate {
  id: string;
  jobId: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  status: JobEstimateStatus;
  items: JobEstimateItem[];
  subtotal: number;
  notes?: string;
  updatedAt: string;
  spApprovedBy?: string;
  spApprovedByName?: string;
  spDecisionAt?: string;
  tenantDecisionBy?: string;
  tenantDecisionByName?: string;
  tenantDecisionAt?: string;
  rejectionReason?: string;
}

export interface EmployeeMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "service_provider" | "employee";
  recipientId: string;
  recipientName: string;
  recipientRole: "service_provider" | "employee";
  jobId?: string;
  subject?: string;
  body: string;
  attachments?: string[];
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeEarnings {
  employeeId: string;
  employeeName: string;
  totalEarnings: number;
  earningsThisMonth: number;
  earningsThisWeek: number;
  pendingPayments: number;
  completedJobsCount: number;
  completedJobsThisMonth: number;
  averageJobValue: number;
  averageRating: number;
  onTimeCompletionRate: number; // percentage
  jobHistory: EmployeeJobEarning[];
  updatedAt: string;
}

export interface EmployeeJobEarning {
  id: string;
  jobId: string;
  jobTitle: string;
  buildingName: string;
  completedDate: string;
  earning: number;
  rating?: number;
  bonus?: number;
  deductions?: number;
  netEarning: number;
}

export interface EmployeeSkill {
  id: string;
  employeeId: string;
  skillName: string;
  proficiencyLevel: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience?: number;
  certifications?: EmployeeCertification[];
  lastUsedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeCertification {
  id: string;
  employeeId: string;
  certificationName: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
  certificateUrl?: string; // URL to uploaded certificate image
  verificationUrl?: string;
  status: "active" | "expired" | "pending_renewal";
  createdAt: string;
  updatedAt: string;
}

export interface Analytics {
  openJobsCount: number;
  tenantsCount: number;
  bookingsToday: number;
  completedJobsThisMonth: number;
  completionRate: number; // percentage
  averageCompletionTime: number; // in hours
  averageRating: number;
  totalRevenue: number;
  revenueThisMonth: number;
  pendingRequestsCount: number;
  activeMaintenanceNotices: number;
  buildingsCount: number;
  occupancyRate: number; // percentage
  topServiceProviders: {
    id: string;
    name: string;
    jobsCompleted: number;
    completedJobs: number; // alias for jobsCompleted
    averageRating: number;
  }[];
  recentActivity: {
    id: string;
    type: "job" | "request" | "booking" | "notice" | "job_completed" | "new_request" | "new_tenant";
    description: string;
    timestamp: string;
  }[];
}

export interface Permission {
  id: string;
  resource: string; // e.g., "users", "buildings", "jobs"
  action: "create" | "read" | "update" | "delete" | "manage";
  description: string;
}

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

// DTOs for admin operations

export interface CreateUserDTO {
  // Backend fields (sent to API via mapper)
  fullName: string;           // Maps to backend 'fullName'
  email: string;
  password: string;           // Required for user creation
  phoneNumber: string;        // Maps to backend 'phoneNumber'
  address: string;            // Required by backend
  nationality: string;        // Required by backend

  // Role-specific backend fields
  role?: UserRole;            // Determines which API endpoint to use
  buildingId?: string;        // For tenants - backend expects number but we convert
  unitNumber?: string;        // For tenants - sent to Tenant/create
  floorNumber?: string;       // For tenants - backend expects number but we store as string
  entranceDate?: string;      // For tenants - ISO date string

  // Client-side only fields (not sent to backend, managed by mapper)
  apartment?: string;         // Kept for frontend logic (backend doesn't support yet)
  tower?: string;             // Kept for frontend logic (backend doesn't support yet)
  profile?: {                 // Extended profile (backend doesn't support yet)
    apartment?: string;
    tower?: string;
    floor?: string;
    buildingId?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  };
}

export interface UpdateUserDTO {
  // Backend fields (sent to API via mapper)
  fullName?: string;          // Maps to backend 'fullName'
  phoneNumber?: string;       // Maps to backend 'phoneNumber'
  address?: string;           // Supported by backend
  nationality?: string;       // Supported by backend

  // Client-side only fields (not sent to backend yet)
  email?: string;             // Backend doesn't allow email updates
  role?: UserRole;            // Backend doesn't support role updates yet
  buildingId?: string;        // Backend doesn't support building updates yet
  apartment?: string;         // Backend doesn't support apartment updates yet
  tower?: string;             // Backend doesn't support tower updates yet
  status?: "active" | "inactive";  // Backend uses 'isActive' boolean instead
}

// API-specific DTOs that match backend payload structure exactly
// These are used by mapper functions to transform frontend DTOs to backend format

/**
 * DTO that matches backend API exactly for admin user creation
 * Backend endpoint: POST /api/Admin/create
 */
export interface CreateAdminApiDTO {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  address: string;
  nationality: string;
}

/**
 * DTO that matches backend API exactly for admin user updates
 * Backend endpoint: PUT /api/Admin/update/{id}
 */
export interface UpdateAdminApiDTO {
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  nationality?: string;
}

export interface CreateBuildingDTO {
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
  // Management & capacity
  managerId?: string;
  totalUnits: number;
  unitBreakdown?: UnitBreakdown;
  amenities?: string[];
}

export interface UpdateBuildingDTO {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
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
  // Management & capacity
  managerId?: string;
  totalUnits?: number;
  occupiedUnits?: number;
  unitBreakdown?: UnitBreakdown;
  amenities?: string[];
  status?: "active" | "maintenance" | "inactive";
}

export interface CreateJobDTO {
  requestId?: string;
  title: string;
  description: string;
  type: RequestType;
  priority: RequestPriority;
  buildingId: string;
  unitNumber?: string;
  assignedTo?: string;
  assignmentTargetType?: Job["assignmentTargetType"];
  assignedBuildingEmployeeId?: string;
  assignedBuildingEmployeeName?: string;
  attachments?: string[];
  estimatedCost?: number;
  scheduledDate?: string;
  costBreakdown?: CreateJobCostItemDTO[];
  complianceChecklist?: CreateJobChecklistItemDTO[];
}

export interface UpdateJobDTO {
  title?: string;
  description?: string;
  status?: Job["status"];
  priority?: RequestPriority;
  assignedTo?: string;
  assignedToEmployeeId?: string;
  assignedToEmployeeName?: string;
  assignmentTargetType?: Job["assignmentTargetType"];
  assignedBuildingEmployeeId?: string;
  assignedBuildingEmployeeName?: string;
  attachments?: string[];
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: string;
  completedDate?: string;
  tenantName?: string;
  tenantPhone?: string;
  acceptanceNotes?: string;
  declineReason?: string;
  completionStatus?: Job["completionStatus"];
  completionApprovedBy?: string;
  completionApprovedByName?: string;
  completionApprovedAt?: string;
  completionNotes?: string;
  completionFeedback?: string;
  completionOverrideReason?: string;
  completionRejectionReason?: string;
  completionRejectedBy?: string;
  completionRejectedByName?: string;
  completionRejectedAt?: string;
  paidDate?: string;
  costBreakdown?: CreateJobCostItemDTO[];
  complianceChecklist?: UpdateJobChecklistItemDTO[];
}

export interface AssignJobDTO {
  jobId: string;
  serviceProviderId: string;
  scheduledDate?: string;
  notes?: string;
}

export interface CreateJobCostItemDTO
  extends Omit<JobCostBreakdownItem, "id"> {
  id?: string;
}

export interface CreateJobChecklistItemDTO
  extends Omit<JobComplianceChecklistItem, "id" | "completed"> {
  id?: string;
  completed?: boolean;
}

export interface UpdateJobChecklistItemDTO
  extends Partial<Omit<JobComplianceChecklistItem, "id">> {
  id: string;
}

export interface BulkUpdateJobStatusDTO {
  jobIds: string[];
  status: Job["status"];
  updatedBy: string;
  notes?: string;
}

export interface QueueJobAssignmentDTO {
  jobId: string;
  serviceProviderId: string;
  scheduledDate?: string;
  notes?: string;
}

export interface UpdateJobAssignmentDTO {
  jobId: string;
  assignmentId: string;
  status: JobAssignmentRecord["status"];
  notes?: string;
}

// Unit Type DTOs
export interface CreateUnitTypeDTO {
  name: string;
  bedrooms: number;
  bathrooms: number;
  areaSqFt: number;
  baseRent?: number;
  amenities: string[];
}

export interface UpdateUnitTypeDTO {
  name?: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqFt?: number;
  baseRent?: number;
  amenities?: string[];
}

// Employee DTOs

export interface AssignJobToEmployeeDTO {
  jobId: string;
  employeeId: string;
  scheduledDate?: string;
  notes?: string;
}

export interface AcceptJobAssignmentDTO {
  jobId: string;
  employeeId: string;
  notes?: string;
}

export interface DeclineJobAssignmentDTO {
  jobId: string;
  employeeId: string;
  reason: string;
}

export interface StartJobDTO {
  jobId: string;
  employeeId: string;
  startTime?: string;
  notes?: string;
}

export interface UploadJobPhotoDTO {
  jobId: string;
  employeeId: string;
  uri: string;
  caption?: string;
}

export interface AddJobAdditionalCostDTO {
  jobId: string;
  employeeId: string;
  amount: number;
  description: string;
  category?: "parts" | "labor" | "materials" | "other";
  proofPhotoUri?: string;
}

export interface ApproveAdditionalCostDTO {
  costId: string;
  jobId: string;
  approvedBy: string;
  notes?: string;
}

export interface RejectAdditionalCostDTO {
  costId: string;
  jobId: string;
  rejectedBy: string;
  reason: string;
}

export interface CompleteJobDTO {
  jobId: string;
  employeeId: string;
  completionNotes?: string;
  completionPhotos?: string[];
}

export interface ApproveJobCompletionDTO {
  jobId: string;
  approvedBy: string; // Tenant or SP user ID
  approvedByName: string;
  notes?: string;
}

export interface OverrideJobCompletionDTO {
  jobId: string;
  overriddenBy: string; // SP user ID
  overriddenByName: string;
  reason: string;
}

export interface SendEmployeeMessageDTO {
  senderId: string;
  senderName: string;
  senderRole: "service_provider" | "employee";
  recipientId: string;
  recipientName: string;
  recipientRole: "service_provider" | "employee";
  jobId?: string;
  subject?: string;
  body: string;
  attachments?: string[];
}

export interface AddEmployeeSkillDTO {
  employeeId: string;
  skillName: string;
  proficiencyLevel: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience?: number;
}

export interface AddEmployeeCertificationDTO {
  employeeId: string;
  certificationName: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
  certificateUrl?: string;
}

export interface UpdateServiceProviderEmployeeDTO {
  name?: string;
  phone?: string;
  email?: string;
  specialty?: string;
  status?: "active" | "inactive" | "on_leave";
  certifications?: string[];
}

// Error types
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Billing & Meter Reading types
export type MeterType = "gas" | "water" | "electricity";
export type MeterReadingStatus = "pending" | "verified" | "rejected" | "disputed";

export interface MeterReading {
  id: string;
  buildingId: string;
  buildingName?: string;
  unitNumber: string;
  tenantId: string;
  tenantName?: string;
  meterType: MeterType;
  currentReading: number;
  previousReading?: number;
  consumption?: number;
  unit: string; // e.g., "kWh", "m³", "gallons"
  readingDate: string; // ISO timestamp
  submittedBy: string; // Tenant or employee ID
  submittedByName?: string;
  photoUrl?: string; // Photo verification
  status: MeterReadingStatus;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillSummary {
  id: string;
  buildingId: string;
  buildingName?: string;
  unitNumber: string;
  tenantId: string;
  tenantName?: string;
  billingPeriod: string; // e.g., "2025-01" for January 2025
  billingPeriodStart: string; // ISO timestamp
  billingPeriodEnd: string; // ISO timestamp
  rentAmount: number;
  gasCharges?: number;
  waterCharges?: number;
  electricityCharges?: number;
  maintenanceCharges?: number;
  otherCharges?: number;
  totalAmount: number;
  paidAmount?: number;
  balanceAmount?: number;
  dueDate: string; // ISO timestamp
  paidDate?: string; // ISO timestamp
  status: "pending" | "partial" | "paid" | "overdue";
  paymentMethod?: string;
  transactionId?: string;
  meterReadings: string[]; // Array of MeterReading IDs
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeterReadingDTO {
  buildingId: string;
  unitNumber: string;
  tenantId: string;
  meterType: MeterType;
  currentReading: number;
  previousReading?: number;
  unit: string;
  readingDate: string;
  submittedBy: string;
  photoUrl?: string;
  notes?: string;
}

export interface UpdateMeterReadingDTO {
  currentReading?: number;
  photoUrl?: string;
  status?: MeterReadingStatus;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface VerifyMeterReadingDTO {
  readingId: string;
  verifiedBy: string;
  verifiedByName: string;
  status: "verified" | "rejected";
  rejectionReason?: string;
  notes?: string;
}

// Broadcast Notifications & Announcements types
export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";
export type AnnouncementTargetType = "all_tenants" | "building" | "specific_units" | "role_based";
export type AnnouncementStatus = "draft" | "scheduled" | "sent" | "cancelled";

export interface AnnouncementDraft {
  id?: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  targetType: AnnouncementTargetType;
  targetBuildingIds?: string[]; // If targetType is "building"
  targetUnitNumbers?: string[]; // If targetType is "specific_units"
  targetRoles?: UserRole[]; // If targetType is "role_based"
  scheduledFor?: string; // ISO timestamp for scheduled sending
  templateId?: string; // Reference to a template if used
  attachments?: string[];
  createdBy: string;
  createdByName?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  targetType: AnnouncementTargetType;
  targetBuildingIds?: string[];
  targetUnitNumbers?: string[];
  targetRoles?: UserRole[];
  scheduledFor?: string;
  sentAt?: string; // ISO timestamp when actually sent
  status: AnnouncementStatus;
  templateId?: string;
  attachments?: string[];
  createdBy: string;
  createdByName?: string;
  recipientCount?: number; // Number of users who received this
  readCount?: number; // Number of users who read this
  deliveryStats?: {
    sent: number;
    delivered: number;
    failed: number;
    read: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementTemplate {
  id: string;
  name: string;
  category: "maintenance" | "event" | "emergency" | "general";
  title: string;
  body: string;
  priority: AnnouncementPriority;
  targetType: AnnouncementTargetType;
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementDTO {
  title: string;
  body: string;
  priority: AnnouncementPriority;
  targetType: AnnouncementTargetType;
  targetBuildingIds?: string[];
  targetUnitNumbers?: string[];
  targetRoles?: UserRole[];
  scheduledFor?: string;
  templateId?: string;
  attachments?: string[];
  createdBy: string;
  createdByName?: string;
}

export interface UpdateAnnouncementDTO {
  title?: string;
  body?: string;
  priority?: AnnouncementPriority;
  targetType?: AnnouncementTargetType;
  targetBuildingIds?: string[];
  targetUnitNumbers?: string[];
  targetRoles?: UserRole[];
  scheduledFor?: string;
  status?: AnnouncementStatus;
  attachments?: string[];
}

// Maintenance Event (Portfolio-level view) - Alias for MaintenanceSchedule for consistency with Admin-Task.md naming
export type MaintenanceEvent = MaintenanceSchedule;

// Utility types
export type UserRole = User["role"];
export type RequestStatus = Request["status"];
export type RequestPriority = Request["priority"];
export type RequestType = Request["type"];
export type NotificationType = Notification["type"];
export type JobStatus = Job["status"];
export type BuildingStatus = Building["status"];
