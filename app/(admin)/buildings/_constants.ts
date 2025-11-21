import type { BuildingType } from "../../../lib/types";

export const ADMIN_NOTIFICATION_ROUTE = "/(modals)/admin-notifications" as const;

export const UAE_EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const;

export const BUILDING_TYPES: { value: BuildingType; label: string }[] = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "mixed_use", label: "Mixed-Use" },
  { value: "hospitality", label: "Hospitality" },
];

export const BUILDING_AMENITY_OPTIONS = [
  { id: "gym", label: "Gym" },
  { id: "pool", label: "Swimming Pool" },
  { id: "concierge", label: "24/7 Concierge" },
  { id: "security", label: "Security & CCTV" },
  { id: "parking", label: "Covered Parking" },
  { id: "play_area", label: "Kids Play Area" },
  { id: "garden", label: "Rooftop Garden" },
  { id: "business_center", label: "Business Center" },
  { id: "spa", label: "Spa & Wellness" },
  { id: "smart_access", label: "Smart Access Control" },
];
