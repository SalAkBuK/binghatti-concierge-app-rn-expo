# Future Agent Notes — `app/`
_Last touched: 7 October 2025_

## Navigation Quick Facts
- `_layout.tsx` wires the root `Stack`; it mounts `ConnectedAppProvider` and exposes modal routes.
- `index.tsx` is the redirect gateway — waits ~300 ms then routes users to `/auth`, `/(tabs)`, or `/(admin)` based on `useApp()` auth state.
- `auth.tsx` renders the mocked login experience; credentials are validated against `lib/utils/mockData.ts`.
- `modal.tsx` and `app/(modals)/*` define Expo Router modal screens.

## Tenant Surfaces (`app/(tabs)`)
- `_layout.tsx` defines tab bar styling and icons.
- `index.tsx` is the tenant home dashboard summarising bookings, notices, and ratings.
- `requests.tsx` handles maintenance tickets with status filtering and `RequestsScreenSkeleton` fallback.
- `amenities.tsx`, `my-bookings.tsx`, `visitors.tsx`, `my-ratings.tsx`, `new-request.tsx`, and `profile.tsx` cover the remaining tenant flows; all depend on `useApp().actions`.

## Admin & Management (`app/(admin)`)
- `_layout.tsx` creates a dedicated tab bar for admin KPIs.
- `index.tsx` surfaces analytics cards plus top providers.
- `users.tsx`, `buildings.tsx`, `permissions.tsx`, `jobs.tsx` consume admin actions from `useApp()`.

## Modals (`app/(modals)`)
- `request-details.tsx`, `amenity-booking-form.tsx`, `register-visitor.tsx`, `submit-rating.tsx`, `notifications-hub.tsx`, `notice-details.tsx`.
- Each modal expects the corresponding selection to be set in context (`actions.setSelectedRequest`, etc.) before navigation.

## Dev Tips
- When adding new routes, mirror Expo Router conventions (`folder/screen.tsx`) and update the relevant `_layout.tsx`.
- Keep cross-feature data flows inside contexts; screens should stay thin and hook-driven.
