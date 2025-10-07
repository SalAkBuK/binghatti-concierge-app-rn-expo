# Future Agent Notes — `lib/types/`
_Updated: 7 October 2025_

## Purpose
- `index.ts` is the single source of truth for domain models (users, requests, notifications, amenities, bookings, jobs, analytics, DTOs, and context states).

## Guidance
- When adding new domains, update interfaces here before using them in contexts or services.
- Keep DTO types aligned with backend contracts so the API layer can lean on TypeScript for safety.
