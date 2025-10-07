import type { User, Request, Notification, MaintenanceNotice, Amenity, AmenityBooking, Visitor, Rating, Building, Job, Analytics, RolePermissions, Permission } from "../types";

// Default users data
export const DEFAULT_USERS: Record<string, User> = {
  "tenant@demo.com": {
    id: "1",
    email: "tenant@demo.com",
    name: "Ahmed Al-Rashid",
    role: "tenant",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      name: "Ahmed Al-Rashid",
      apartment: "1205",
      tower: "Tower A",
      phone: "+971 50 123 4567",
      emergencyContact: "Fatima Al-Rashid",
      emergencyPhone: "+971 50 987 6543",
      buildingId: "building-1",
    },
  },
  "tenant1@email.com": {
    id: "6",
    email: "tenant1@email.com",
    name: "Sarah Mohammed",
    role: "tenant",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      name: "Sarah Mohammed",
      apartment: "804",
      tower: "Tower B",
      phone: "+971 50 234 5678",
      emergencyContact: "Omar Mohammed",
      emergencyPhone: "+971 50 876 5432",
      buildingId: "building-2",
    },
  },
  "management@demo.com": {
    id: "2",
    email: "management@demo.com",
    name: "John Smith",
    role: "management",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      name: "John Smith",
      phone: "+971 50 345 6789",
      managedBuildingIds: ["building-1", "building-2", "building-3"],
    },
  },
  "admin@demo.com": {
    id: "3",
    email: "admin@demo.com",
    name: "Admin User",
    role: "admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      name: "Admin User",
      phone: "+971 50 456 7890",
    },
  },
};

// Default requests data
export const DEFAULT_REQUESTS: Request[] = [
  {
    id: "1",
    title: "AC not working in living room",
    description:
      "The air conditioning unit in the living room has stopped working. It was making strange noises yesterday and now completely stopped.",
    type: "hvac",
    status: "pending",
    priority: "high",
    tenantId: "1",
    buildingId: "building-1",
    apartment: "1205",
    tower: "Tower A",
    contactPhone: "+971 50 123 4567",
    attachments: [],
    comments: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    title: "Kitchen sink drainage issue",
    description:
      "Water is draining very slowly from the kitchen sink. There might be a blockage.",
    type: "plumbing",
    status: "in-progress",
    priority: "medium",
    tenantId: "1",
    assignedTo: "4",
    buildingId: "building-1",
    apartment: "1205",
    tower: "Tower A",
    contactPhone: "+971 50 123 4567",
    attachments: [],
    comments: [
      {
        id: "1",
        requestId: "2",
        userId: "4",
        userName: "Mike Johnson",
        message:
          "I will be there tomorrow morning to check the drainage system.",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    title: "Elevator maintenance request",
    description:
      "The elevator has been making unusual sounds and sometimes stops between floors.",
    type: "maintenance",
    status: "completed",
    priority: "urgent",
    tenantId: "6",
    assignedTo: "5",
    buildingId: "building-2",
    apartment: "804",
    tower: "Tower B",
    contactPhone: "+971 50 234 5678",
    attachments: [],
    comments: [
      {
        id: "2",
        requestId: "3",
        userId: "5",
        userName: "Alex Wilson",
        message: "Elevator has been fully serviced and tested. Issue resolved.",
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
];

// Default notifications data
export const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    userId: "1",
    title: "Request Status Update",
    message: "Your AC repair request has been assigned to a technician.",
    type: "info",
    read: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    userId: "1",
    title: "Maintenance Notice",
    message:
      "Scheduled water maintenance in Tower A from 9 AM to 12 PM tomorrow.",
    type: "warning",
    read: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    userId: "1",
    title: "Request Completed",
    message: "Your kitchen sink drainage issue has been resolved.",
    type: "success",
    read: true,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    userId: "6",
    title: "Welcome!",
    message:
      "Welcome to Binghatti Concierge Services. Your account has been set up successfully.",
    type: "success",
    read: true,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    userId: "3",
    title: "SLA Breach Warning",
    message:
      "3 HVAC jobs are within 4 hours of breaching the 24h SLA. Reassign a technician to avoid penalties.",
    type: "warning",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "6",
    userId: "3",
    title: "Revenue Snapshot Ready",
    message:
      "The weekly revenue report is final. Review the analytics dashboard to approve the executive summary.",
    type: "info",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
];

// Default maintenance notices data
export const DEFAULT_NOTICES: MaintenanceNotice[] = [
  {
    id: "1",
    title: "Water System Maintenance",
    description:
      "Scheduled maintenance of the water supply system. Water will be temporarily unavailable during the maintenance window.",
    scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    status: "scheduled",
    affectedAreas: ["Tower A", "Tower B"],
    estimatedDuration: "3 hours",
    createdBy: "2",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    title: "Elevator Inspection",
    description:
      "Annual safety inspection of all elevators. Service will be temporarily interrupted.",
    scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
    status: "scheduled",
    affectedAreas: ["All Towers"],
    estimatedDuration: "6 hours",
    createdBy: "2",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    title: "Parking Area Cleaning",
    description:
      "Deep cleaning of the parking areas. Please ensure your vehicles are moved to temporary parking.",
    scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    status: "completed",
    affectedAreas: ["Basement Parking"],
    estimatedDuration: "4 hours",
    createdBy: "2",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    title: "HVAC System Upgrade",
    description:
      "Installation of new energy-efficient HVAC units in Tower C. This will improve air quality and reduce energy consumption. Temporary disruption to cooling systems expected.",
    scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    status: "scheduled",
    affectedAreas: ["Tower C", "Lobby Areas"],
    estimatedDuration: "8 hours",
    createdBy: "2",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Default amenities data
export const DEFAULT_AMENITIES: Amenity[] = [
  {
    id: "1",
    buildingId: "building-1",
    amenityType: "pool",
    name: "Rooftop Swimming Pool",
    description: "Olympic-sized pool with stunning city views, heated in winter months.",
    capacity: 30,
    operatingHours: {
      monday: { open: "06:00", close: "22:00" },
      tuesday: { open: "06:00", close: "22:00" },
      wednesday: { open: "06:00", close: "22:00" },
      thursday: { open: "06:00", close: "22:00" },
      friday: { open: "06:00", close: "23:00" },
      saturday: { open: "06:00", close: "23:00" },
      sunday: { open: "06:00", close: "22:00" },
    },
    bookingDurationMinutes: 120,
    maxAdvanceBookingDays: 14,
    status: "active",
    imageUrl: "https://example.com/pool.jpg",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    buildingId: "building-1",
    amenityType: "gym",
    name: "Fitness Center",
    description: "Fully equipped gym with cardio machines, weights, and personal training services.",
    capacity: 20,
    operatingHours: {
      monday: { open: "05:00", close: "23:00" },
      tuesday: { open: "05:00", close: "23:00" },
      wednesday: { open: "05:00", close: "23:00" },
      thursday: { open: "05:00", close: "23:00" },
      friday: { open: "05:00", close: "23:00" },
      saturday: { open: "06:00", close: "22:00" },
      sunday: { open: "06:00", close: "22:00" },
    },
    bookingDurationMinutes: 90,
    maxAdvanceBookingDays: 7,
    status: "active",
    imageUrl: "https://example.com/gym.jpg",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    buildingId: "building-1",
    amenityType: "sauna",
    name: "Wellness Sauna",
    description: "Traditional Finnish sauna for relaxation and wellness.",
    capacity: 8,
    operatingHours: {
      monday: { open: "07:00", close: "21:00" },
      tuesday: { open: "07:00", close: "21:00" },
      wednesday: { open: "07:00", close: "21:00" },
      thursday: { open: "07:00", close: "21:00" },
      friday: { open: "07:00", close: "21:00" },
      saturday: { open: "08:00", close: "20:00" },
      sunday: { open: "08:00", close: "20:00" },
    },
    bookingDurationMinutes: 60,
    maxAdvanceBookingDays: 7,
    status: "active",
    imageUrl: "https://example.com/sauna.jpg",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    buildingId: "building-1",
    amenityType: "bbq",
    name: "Outdoor BBQ Area",
    description: "Covered BBQ area with grills, tables, and seating for outdoor gatherings.",
    capacity: 40,
    operatingHours: {
      monday: { open: "10:00", close: "22:00" },
      tuesday: { open: "10:00", close: "22:00" },
      wednesday: { open: "10:00", close: "22:00" },
      thursday: { open: "10:00", close: "22:00" },
      friday: { open: "10:00", close: "23:00" },
      saturday: { open: "10:00", close: "23:00" },
      sunday: { open: "10:00", close: "22:00" },
    },
    bookingDurationMinutes: 180,
    maxAdvanceBookingDays: 14,
    status: "active",
    imageUrl: "https://example.com/bbq.jpg",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Default bookings data
export const DEFAULT_BOOKINGS: AmenityBooking[] = [
  {
    id: "1",
    amenityId: "1",
    amenityName: "Rooftop Swimming Pool",
    amenityType: "pool",
    tenantId: "1",
    buildingId: "building-1",
    slotDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    slotTimeStart: "16:00",
    slotTimeEnd: "18:00",
    status: "confirmed",
    numberOfGuests: 4,
    bookingNotes: "Family swimming session",
    bookingCode: "POOL-20251005-001",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    amenityId: "2",
    amenityName: "Fitness Center",
    amenityType: "gym",
    tenantId: "1",
    buildingId: "building-1",
    slotDate: new Date().toISOString().split('T')[0],
    slotTimeStart: "07:00",
    slotTimeEnd: "08:30",
    status: "completed",
    numberOfGuests: 1,
    bookingNotes: "Morning workout",
    bookingCode: "GYM-20251003-015",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    amenityId: "4",
    amenityName: "Outdoor BBQ Area",
    amenityType: "bbq",
    tenantId: "6",
    buildingId: "building-1",
    slotDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    slotTimeStart: "18:00",
    slotTimeEnd: "21:00",
    status: "confirmed",
    numberOfGuests: 12,
    bookingNotes: "Birthday celebration",
    bookingCode: "BBQ-20251007-003",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Default visitors data
export const DEFAULT_VISITORS: Visitor[] = [
  {
    id: "1",
    tenantId: "1",
    buildingId: "building-1",
    unitNumber: "1205",
    visitorName: "Mohammed Hassan",
    visitorPhone: "+971 50 111 2222",
    visitorIdType: "national_id",
    visitorIdNumber: "784-1990-1234567-1",
    visitPurpose: "Family visit",
    expectedArrivalTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    expectedDepartureTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    status: "expected",
    visitorCode: "VST-20251002-001",
    qrCodeUrl: "https://example.com/qr/VST-20251002-001",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    tenantId: "1",
    buildingId: "building-1",
    unitNumber: "1205",
    visitorName: "John Delivery Service",
    visitorPhone: "+971 50 333 4444",
    visitorIdType: "driving_license",
    visitorIdNumber: "DL-123456",
    visitPurpose: "Package delivery",
    expectedArrivalTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expectedDepartureTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    actualArrivalTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actualDepartureTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    status: "departed",
    visitorCode: "VST-20251002-002",
    qrCodeUrl: "https://example.com/qr/VST-20251002-002",
    checkedInBy: "security-1",
    checkedOutBy: "security-1",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    tenantId: "6",
    buildingId: "building-1",
    unitNumber: "804",
    visitorName: "AC Repair Technician",
    visitorPhone: "+971 50 555 6666",
    visitorIdType: "national_id",
    visitorIdNumber: "784-1988-7654321-2",
    visitPurpose: "AC maintenance",
    expectedArrivalTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    expectedDepartureTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    status: "expected",
    visitorCode: "VST-20251003-001",
    qrCodeUrl: "https://example.com/qr/VST-20251003-001",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Default ratings data
export const DEFAULT_RATINGS: Rating[] = [
  {
    id: "1",
    tenantId: "1",
    requestId: "2",
    serviceProviderId: "4",
    rating: 5,
    reviewText: "Excellent service! The plumber was professional and fixed the issue quickly.",
    attachments: [],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    tenantId: "6",
    requestId: "3",
    serviceProviderId: "5",
    buildingEmployeeId: "emp-1",
    rating: 4,
    reviewText: "Good work on the elevator. Everything is working smoothly now.",
    attachments: [],
    responseText: "Thank you for your feedback! We're glad the issue was resolved.",
    responseDate: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    respondedBy: "2",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

// Admin-specific mock data

// Service provider users (add to DEFAULT_USERS for role checking)
export const SERVICE_PROVIDER_USERS = {
  "sp1@demo.com": {
    id: "4",
    email: "sp1@demo.com",
    name: "Mike Johnson",
    role: "service_provider" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      name: "Mike Johnson",
      phone: "+971 50 567 8901",
    },
  },
  "sp2@demo.com": {
    id: "5",
    email: "sp2@demo.com",
    name: "Alex Wilson",
    role: "service_provider" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    profile: {
      name: "Alex Wilson",
      phone: "+971 50 678 9012",
    },
  },
};

// Buildings data
export const DEFAULT_BUILDINGS: Building[] = [
  {
    id: "building-1",
    name: "Binghatti Tower A",
    address: "Sheikh Mohammed Bin Rashid Blvd",
    city: "Dubai",
    country: "UAE",
    managerId: "2",
    managerName: "John Smith",
    totalUnits: 150,
    occupiedUnits: 135,
    amenities: ["1", "2", "3", "4"],
    status: "active",
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "building-2",
    name: "Binghatti Tower B",
    address: "Sheikh Mohammed Bin Rashid Blvd",
    city: "Dubai",
    country: "UAE",
    managerId: "2",
    managerName: "John Smith",
    totalUnits: 120,
    occupiedUnits: 110,
    amenities: ["1", "2"],
    status: "active",
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "building-3",
    name: "Binghatti Tower C",
    address: "Business Bay",
    city: "Dubai",
    country: "UAE",
    managerId: "2",
    managerName: "John Smith",
    totalUnits: 200,
    occupiedUnits: 185,
    amenities: ["1", "2", "3"],
    status: "active",
    createdAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "building-4",
    name: "Binghatti Residence",
    address: "JBR Walk",
    city: "Dubai",
    country: "UAE",
    totalUnits: 80,
    occupiedUnits: 75,
    amenities: ["1"],
    status: "maintenance",
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Jobs data
export const DEFAULT_JOBS: Job[] = [
  {
    id: "job-1",
    requestId: "1",
    title: "AC Repair - Unit 1205",
    description: "AC unit in living room not working. Needs immediate attention.",
    type: "hvac",
    status: "assigned",
    priority: "high",
    buildingId: "building-1",
    buildingName: "Binghatti Tower A",
    unitNumber: "1205",
    assignedTo: "4",
    assignedToName: "Mike Johnson",
    createdBy: "3",
    attachments: [],
    notes: [
      {
        id: "note-1",
        jobId: "job-1",
        userId: "4",
        userName: "Mike Johnson",
        note: "Parts ordered, will fix tomorrow morning",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    estimatedCost: 500,
    scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-2",
    requestId: "2",
    title: "Plumbing - Kitchen Sink Unit 1205",
    description: "Kitchen sink drainage issue, slow draining water",
    type: "plumbing",
    status: "in-progress",
    priority: "medium",
    buildingId: "building-1",
    buildingName: "Binghatti Tower A",
    unitNumber: "1205",
    assignedTo: "4",
    assignedToName: "Mike Johnson",
    createdBy: "3",
    attachments: [],
    notes: [],
    estimatedCost: 200,
    scheduledDate: new Date().toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-3",
    requestId: "3",
    title: "Elevator Maintenance - Tower B",
    description: "Elevator making unusual sounds, safety inspection needed",
    type: "maintenance",
    status: "completed",
    priority: "urgent",
    buildingId: "building-2",
    buildingName: "Binghatti Tower B",
    unitNumber: "804",
    assignedTo: "5",
    assignedToName: "Alex Wilson",
    createdBy: "3",
    attachments: [],
    notes: [
      {
        id: "note-2",
        jobId: "job-3",
        userId: "5",
        userName: "Alex Wilson",
        note: "Completed full inspection and maintenance",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
    estimatedCost: 1500,
    actualCost: 1400,
    scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    completedDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-4",
    title: "Pool Cleaning - Tower A",
    description: "Regular monthly pool cleaning and chemical balancing",
    type: "maintenance",
    status: "pending",
    priority: "low",
    buildingId: "building-1",
    buildingName: "Binghatti Tower A",
    createdBy: "3",
    attachments: [],
    notes: [],
    estimatedCost: 300,
    scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "job-5",
    title: "Electrical - Common Area Tower C",
    description: "Replace faulty lighting in lobby area",
    type: "electrical",
    status: "assigned",
    priority: "medium",
    buildingId: "building-3",
    buildingName: "Binghatti Tower C",
    assignedTo: "5",
    assignedToName: "Alex Wilson",
    createdBy: "2",
    attachments: [],
    notes: [],
    estimatedCost: 800,
    scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Analytics data
export const DEFAULT_ANALYTICS: Analytics = {
  openJobsCount: 3,
  tenantsCount: 430,
  bookingsToday: 8,
  completedJobsThisMonth: 45,
  completionRate: 78.5,
  averageCompletionTime: 24, // hours
  averageRating: 4.5,
  totalRevenue: 125000,
  revenueThisMonth: 28500,
  pendingRequestsCount: 5,
  activeMaintenanceNotices: 2,
  buildingsCount: 4,
  occupancyRate: 92.3,
  topServiceProviders: [
    {
      id: "4",
      name: "Mike Johnson",
      jobsCompleted: 28,
      completedJobs: 28,
      averageRating: 4.7,
    },
    {
      id: "5",
      name: "Alex Wilson",
      jobsCompleted: 17,
      completedJobs: 17,
      averageRating: 4.3,
    },
  ],
  recentActivity: [
    {
      id: "act-1",
      type: "job",
      description: "AC Repair job assigned to Mike Johnson",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "act-2",
      type: "request",
      description: "New plumbing request from Unit 1205",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "act-3",
      type: "booking",
      description: "Pool booking confirmed for tomorrow",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "act-4",
      type: "notice",
      description: "Water maintenance notice published",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "act-5",
      type: "job",
      description: "Elevator maintenance completed",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

// Permissions data
const PERMISSIONS: Permission[] = [
  // User permissions
  { id: "perm-1", resource: "users", action: "create", description: "Create new users" },
  { id: "perm-2", resource: "users", action: "read", description: "View user details" },
  { id: "perm-3", resource: "users", action: "update", description: "Update user information" },
  { id: "perm-4", resource: "users", action: "delete", description: "Delete users" },
  { id: "perm-5", resource: "users", action: "manage", description: "Full user management" },

  // Building permissions
  { id: "perm-6", resource: "buildings", action: "create", description: "Create new buildings" },
  { id: "perm-7", resource: "buildings", action: "read", description: "View building details" },
  { id: "perm-8", resource: "buildings", action: "update", description: "Update building information" },
  { id: "perm-9", resource: "buildings", action: "delete", description: "Delete buildings" },
  { id: "perm-10", resource: "buildings", action: "manage", description: "Full building management" },

  // Job permissions
  { id: "perm-11", resource: "jobs", action: "create", description: "Create new jobs" },
  { id: "perm-12", resource: "jobs", action: "read", description: "View job details" },
  { id: "perm-13", resource: "jobs", action: "update", description: "Update job information" },
  { id: "perm-14", resource: "jobs", action: "delete", description: "Delete jobs" },
  { id: "perm-15", resource: "jobs", action: "manage", description: "Full job management" },

  // Request permissions
  { id: "perm-16", resource: "requests", action: "create", description: "Create new requests" },
  { id: "perm-17", resource: "requests", action: "read", description: "View request details" },
  { id: "perm-18", resource: "requests", action: "update", description: "Update request status" },
  { id: "perm-19", resource: "requests", action: "delete", description: "Delete requests" },
  { id: "perm-20", resource: "requests", action: "manage", description: "Full request management" },

  // Analytics permissions
  { id: "perm-21", resource: "analytics", action: "read", description: "View analytics dashboard" },
  { id: "perm-22", resource: "analytics", action: "manage", description: "Full analytics access" },

  // Permissions management
  { id: "perm-23", resource: "permissions", action: "read", description: "View permissions" },
  { id: "perm-24", resource: "permissions", action: "manage", description: "Manage role permissions" },
];

export const DEFAULT_ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: "admin",
    permissions: PERMISSIONS, // Admin has all permissions
  },
  {
    role: "management",
    permissions: PERMISSIONS.filter(p =>
      ["users", "buildings", "jobs", "requests", "analytics"].includes(p.resource) &&
      ["read", "update", "manage"].includes(p.action)
    ),
  },
  {
    role: "service_provider",
    permissions: PERMISSIONS.filter(p =>
      ["jobs", "requests"].includes(p.resource) &&
      ["read", "update"].includes(p.action)
    ),
  },
  {
    role: "tenant",
    permissions: PERMISSIONS.filter(p =>
      ["requests"].includes(p.resource) &&
      ["create", "read"].includes(p.action)
    ),
  },
  {
    role: "employee",
    permissions: PERMISSIONS.filter(p =>
      ["requests", "jobs"].includes(p.resource) &&
      ["read"].includes(p.action)
    ),
  },
];
