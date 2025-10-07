# Future Agent Notes — `lib/context/`
_Context sync: 7 October 2025_

## Core Providers
- `connected-app-provider.tsx` — Composes auth, requests, notifications, notices contexts and exposes a combined `useApp()` hook with mock admin state (amenities, bookings, visitors, analytics, etc.).
- `auth-context.tsx` — Handles authentication state backed by AsyncStorage; seeded users from `DEFAULT_USERS`.
- `requests-context.tsx` — Manages tenant maintenance requests, exposes CRUD actions, and issues notifications on updates.
- `notifications-context.tsx` / `notices-context.tsx` — Manage alerts vs. maintenance notices.
- `ratings-context.tsx` — Tracks service provider ratings.

## Implementation Details
- Uses reducers with action maps; look for `*_ACTIONS` constants.
- Async persistence courtesy of `useAsyncStorage`.
- API client references (`apiService`) are prepped but disabled to keep the mock-only flow stable; re-enable once backend endpoints exist.
