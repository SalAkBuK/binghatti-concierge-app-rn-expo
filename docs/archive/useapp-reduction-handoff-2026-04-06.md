# `useApp()` Reduction Handoff

Date: 2026-04-06

## Goal

Shrink the broad composite `useApp()` dependency surface so tenant and building-employee work can proceed with lower rerender pressure, smaller regression risk, and clearer domain boundaries.

This pass focused on moving route screens and shared hooks onto:

- `useAuth()`
- `useNotifications()`
- `useRequests()`
- `useAppDomain()` with only the needed `admin`, `property`, `operations`, or `amenityVisitor` slice

## Completed

### 1. Typed and narrowed the app composition layer

Main changes:

- `lib/context/connected-app-provider.tsx`
  - replaced the untyped `ConnectedAppContext` usage with a typed context value
  - preserved `useApp()` for compatibility, but made it type-safe
  - kept `useAppDomain()` as the preferred narrow domain entry point
- `lib/context/app-provider.tsx`
  - converted into a compatibility wrapper over the live connected provider stack instead of a separate legacy provider graph
- `lib/context/ratings-context.tsx`
  - converted from a separate state store into a compatibility layer over live operations state

Why this matters:

- the composite provider is still large, but it is no longer an `any` blob
- legacy parallel providers were a major source of architectural drift

### 2. Fixed auth state drift

Main change:

- `lib/context/auth-context.tsx`
  - `updateProfile()` now updates `state.users` as well as `currentUser`

Why this matters:

- profile edits no longer leave `currentUser` and shared user lookups out of sync

### 3. Reduced broad `useApp()` consumers across tenant, auth, management, and building-employee routes

The following screens/layouts/hooks were moved off `useApp()`:

- Auth and root routing
  - `app/_layout.tsx`
  - `app/index.tsx`
  - `app/auth.tsx`
  - `app/change-password.tsx`
  - `app/portal-unavailable.tsx`
- Tenant
  - `app/(tenant)/_layout.tsx`
  - `app/(tenant)/index.tsx`
  - `app/(tenant)/lease-details.tsx`
  - `app/(tenant)/profile.tsx`
  - `app/(tenant)/new-request.tsx`
  - `app/(tenant)/requests.tsx`
  - `app/(tenant)/visitors.tsx`
  - `app/(tenant)/amenities.tsx`
  - `app/(tenant)/my-bookings.tsx`
  - `app/(tenant)/my-ratings.tsx`
- Management
  - `app/(management)/_layout.tsx`
  - `app/(management)/more.tsx`
  - `app/(management)/profile.tsx`
  - `app/(management)/activity.tsx`
  - `app/(management)/index.tsx`
  - `app/(management)/requests.tsx`
  - `app/(management)/buildings.tsx`
  - `app/(management)/workforce.tsx`
  - `app/(management)/amenities.tsx`
  - `app/(management)/units.tsx`
  - `app/(management)/managers/index.tsx`
  - `app/(management)/parcels/_hooks/useParcelsData.ts`
  - `app/(management)/visitors/_hooks/useVisitorsData.ts`
  - `app/(management)/billing/_hooks/useBillingData.ts`
  - `app/(management)/maintenance/_hooks/useMaintenanceData.ts`
- Building employee
  - `app/(buildingEmployee)/_layout.tsx`
  - `app/(buildingEmployee)/index.tsx`
  - `app/(buildingEmployee)/profile.tsx`
  - `app/(buildingEmployee)/amenities.tsx`
  - `app/(buildingEmployee)/shifts.tsx`
  - `app/(buildingEmployee)/jobs.tsx`

General split pattern used:

- `useAuth()` for `currentUser`, `isAuthenticated`, `logout`, `updateProfile`, `updateUser`
- `useNotifications()` for `notifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `broadcastNotificationToRole`
- `useRequests()` where only request selection/action state was needed
- `useAppDomain().property` for buildings, units, leases, employees, providers
- `useAppDomain().amenityVisitor` for bookings and visitor logs
- `useAppDomain().operations` for ratings and jobs
- `useAppDomain().admin` for analytics and admin user queries

### 4. Test updates

Updated test setup and route tests to follow the auth split:

- `jest.setup.ts`
  - added AsyncStorage Jest mock
- updated tests that used to mock `useApp()` but now need `useAuth()`
  - `app/__tests__/index.test.tsx`
  - `app/__tests__/portal-unavailable.test.tsx`
  - `app/__tests__/building-employee-layout.test.tsx`
  - `app/__tests__/management-layout.test.tsx`

## Verified

These checks passed at the end of the pass:

- `npm.cmd run typecheck`
- `npm.cmd test -- --runInBand`

Latest result:

- 6 test suites passed
- 22 tests passed

## Current Remaining `useApp()` Route Consumers

At the time of handoff, `rg -n "useApp\\(" app` shows only these route-level consumers left:

- `app/(management)/shifts.tsx`
- `app/(modals)/admin-notifications.tsx`
- `app/(modals)/amenity-booking-form.tsx`
- `app/(modals)/approve-job-completion.tsx`
- `app/(modals)/notice-details.tsx`
- `app/(modals)/notifications-hub.tsx`
- `app/(modals)/request-details.tsx`
- `app/(modals)/request-provider-access.tsx`
- `app/(modals)/submit-rating.tsx`
- `app/(modals)/register-visitor.tsx`

There are also doc references in `lib/context/README.md`, but those are not runtime.

## Recommended Next Steps

### P1. Finish `app/(management)/shifts.tsx`

This should be a straightforward conversion.

Expected split:

- `useAuth()` for `currentUser`
- `useNotifications()` for unread state
- likely `useAppDomain().property` for employee/building access, depending on exact usage

This is the last route screen still on `useApp()`.

### P2. Convert modal screens by domain, not one-off guessing

Recommended order:

1. `app/(modals)/admin-notifications.tsx`
2. `app/(modals)/notifications-hub.tsx`
3. `app/(modals)/notice-details.tsx`
4. `app/(modals)/submit-rating.tsx`
5. `app/(modals)/approve-job-completion.tsx`
6. `app/(modals)/amenity-booking-form.tsx`
7. `app/(modals)/register-visitor.tsx`
8. `app/(modals)/request-provider-access.tsx`
9. `app/(modals)/request-details.tsx`

Suggested split:

- notifications modals:
  - `useAuth()`
  - `useNotifications()`
- ratings/job modals:
  - `useAuth()`
  - `useAppDomain().operations`
- amenity/visitor/provider-access modals:
  - `useAuth()`
  - `useAppDomain().amenityVisitor` and/or `useAppDomain().property`
- request details:
  - likely `useRequests()`
  - `useAuth()`
  - `useAppDomain().operations` for jobs
  - `useAppDomain().property` where building/provider lookups are needed

### P3. After route/modals are clean, reassess whether `useApp()` should remain public

Once modal usage is mostly gone, decide whether to:

- keep `useApp()` as a compatibility facade only
- or start shrinking the actual composed value inside `connected-app-provider.tsx`

Do not do this before the remaining runtime consumers are migrated, or the diff will get noisy fast.

## Notes On The Heavier Screens Already Converted

### `app/(management)/index.tsx`

- no longer depends on `useApp()`
- now uses:
  - `useAuth()` for `currentUser` and `users`
  - `useNotifications()` for notifications and broadcast actions
  - `useAppDomain().admin` for analytics
- building/request data is still fetched directly from `orgBuildingsApi`

### `app/(management)/requests.tsx`

- no longer depends on `useApp()`
- now uses:
  - `useAuth()` for `currentUser`
  - `useNotifications()` for unread state
  - `useRequests()` for `setSelectedRequest`
- request and assignment payloads are still API-driven via `orgBuildingsApi`

### `app/(management)/buildings.tsx`

- no longer depends on `useApp()`
- now uses:
  - `useAuth()`
  - `useNotifications()`
  - `useAppDomain().admin`
  - `useAppDomain().property`
  - `useAppDomain().amenityVisitor`
  - `useAppDomain().operations`

### `app/(buildingEmployee)/jobs.tsx`

- no longer depends on `useApp()`
- now uses:
  - `useAuth()`
  - `useNotifications()`
- request/job payloads remain API-backed via `orgBuildingsApi`

## Cautions

- the git worktree may be dirty with unrelated user changes; do not revert unrelated files
- keep new notes under `docs/archive/`
- the active portals are still:
  - `app/(tenant)/`
  - `app/(management)/`
  - `app/(buildingEmployee)/`
  - `app/(modals)/`
- do not assume a role or portal is removable just because its route surface is mostly cleaned up

## Short Summary

The route-level `useApp()` reduction is mostly done.

The next agent should:

1. convert `app/(management)/shifts.tsx`
2. convert the remaining modal screens one domain at a time
3. only then decide whether to further shrink or de-emphasize the compatibility `useApp()` facade
