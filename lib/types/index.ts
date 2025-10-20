// Core application types

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
    | "employee";
  phone?: string;
  profile?: UserProfile;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  name?: string;
  phone?: string;
  apartment?: string;
  tower?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  avatar?: string;
  buildingId?: string;
  managedBuildingIds?: string[];
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
  status: "pending" | "in-progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  tenantId: string;
  assignedTo?: string;
  buildingId?: string;
  apartment?: string;
  tower?: string;
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
  attachments: string[];
  responseText?: string;
  responseDate?: string;
  respondedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Admin-specific types

export interface Building {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  managerId?: string;
  managerName?: string;
  totalUnits: number;
  occupiedUnits: number;
  amenities: string[]; // Array of amenity IDs
  status: "active" | "maintenance" | "inactive";
  createdAt: string;
  updatedAt: string;
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
  name: string;
  role: string;
  phone: string;
  shift?: "morning" | "evening" | "night";
  rating?: number;
  jobsCompleted?: number;
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
  assignedTo?: string; // Service provider ID
  assignedToName?: string;
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
  serviceProviderId: string;
  serviceProviderName: string;
  assignedBy: string;
  assignedByName?: string;
  assignedAt: string;
  scheduledDate?: string;
  status: "pending" | "accepted" | "declined" | "completed";
  notes?: string;
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
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  phone?: string;
  apartment?: string;
  tower?: string;
  buildingId?: string;
  profile?: {
    apartment?: string;
    tower?: string;
    buildingId?: string;
  };
}

export interface UpdateUserDTO {
  email?: string;
  name?: string;
  role?: UserRole;
  phone?: string;
  apartment?: string;
  tower?: string;
  buildingId?: string;
  status?: "active" | "inactive";
}

export interface CreateBuildingDTO {
  name: string;
  address: string;
  city: string;
  country: string;
  managerId?: string;
  totalUnits: number;
  amenities?: string[];
}

export interface UpdateBuildingDTO {
  name?: string;
  address?: string;
  city?: string;
  country?: string;
  managerId?: string;
  totalUnits?: number;
  occupiedUnits?: number;
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
  attachments?: string[];
  estimatedCost?: number;
  actualCost?: number;
  scheduledDate?: string;
  completedDate?: string;
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

// Error types
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Utility types
export type UserRole = User["role"];
export type RequestStatus = Request["status"];
export type RequestPriority = Request["priority"];
export type RequestType = Request["type"];
export type NotificationType = Notification["type"];
export type JobStatus = Job["status"];
export type BuildingStatus = Building["status"];
