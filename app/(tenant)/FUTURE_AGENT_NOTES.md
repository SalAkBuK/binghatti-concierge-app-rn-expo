# Future Agent Notes — `app/(tenant)`
_Context reviewed: 7 October 2025_

## Purpose
Tenant-facing tab navigator. Mounted when `currentUser.role` is `tenant` (or any non-admin role) via `app/index.tsx`.

## Tab Registry
- `index.tsx` — Tenant home dashboard, mixes booking highlights, quick actions, notices.
- `requests.tsx` — Maintenance request list, filters by status, opens `/request-details` modal.
- `new-request.tsx` — Form wizard that uses `actions.createRequest`.
- `amenities.tsx` — Amenity discovery plus booking CTA to `/amenity-booking-form`.
- `my-bookings.tsx` — Confirms bookings stored in context; builds status chips from `lib/utils/helpers`.
- `visitors.tsx` — Visitor pass manager; launches `/register-visitor`.
- `my-ratings.tsx` — Displays service provider ratings, enabling `/submit-rating`.
- `profile.tsx` — Tenant profile view/edit, pipelines updates through `actions.updateProfile`.

## Implementation Notes
- Shared chrome components (header, side menu, skeletons) live under `components/ui`.
- Route pushes use `expo-router` via `router.push`.
- Keep new tenant tabs lightweight: derive data with `useMemo` and rely on `useApp()` selectors.
