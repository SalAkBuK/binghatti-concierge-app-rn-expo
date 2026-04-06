# Tenant Perf Handoff

Date: 2026-04-06

## Goal

Make the live tenant portal under `app/(tenant)/` feel materially smoother in production by reducing unnecessary rerenders, eager list rendering, and duplicate resident data fetches.

## Completed

### 1. Reduced broad tenant rerenders from `useApp()`

The first pass removed tenant portal dependence on the broad composite `useApp()` hook where it was not needed.

Main changes:

- `lib/context/connected-app-provider.tsx`
  - moved expensive composite app-state wiring behind provider-backed state
  - added `useAppDomain()` for narrower domain access
- tenant screens updated to use direct auth/notification hooks plus narrower domain access instead of the broad app hook:
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
  - `components/ui/SideMenu.tsx`
- test update:
  - `app/__tests__/tenant-layout.test.tsx`

Why this matters:

- tenant screens were subscribing to far more app state than they actually needed
- unrelated domain updates could rerender screens like home, profile, visitors, and amenities

### 2. Virtualized the main list-heavy tenant screens

Converted the most obvious `ScrollView + map()` screens to `FlatList`.

Files changed:

- `app/(tenant)/visitors.tsx`
- `app/(tenant)/amenities.tsx`
- `app/(tenant)/my-bookings.tsx`
- `app/(tenant)/my-ratings.tsx`

What changed:

- moved list rendering to `FlatList`
- added `ListHeaderComponent`
- added `ListEmptyComponent`
- added `ItemSeparatorComponent`
- tuned virtualization props such as:
  - `removeClippedSubviews`
  - `windowSize`
  - `initialNumToRender`
  - `maxToRenderPerBatch`
- removed eager rendering of all cards at mount

Notes:

- `visitors.tsx` still uses `ScrollView`, but only for the disabled tenancy state and the horizontal filter chip row
- `my-ratings.tsx` still uses `ScrollView` inside the modal for detail content, which is fine

### 3. Shared resident contract caching across tenant screens

The next pass targeted duplicate contract fetches between home, profile, and lease details.

Main changes:

- `lib/hooks/useResidentSelfService.ts`
  - added a shared in-memory contract snapshot
  - added a 30 second TTL cache for the latest contract + contract list payload
  - coalesces concurrent contract loads across multiple mounted hook instances
  - broadcasts the shared snapshot to all active hook consumers
  - app foreground reload now respects the cache instead of forcing an immediate refresh every time
- `app/(tenant)/index.tsx`
  - removed the hardcoded 500ms artificial loading delay before rendering the home screen

Why this matters:

- home, profile, and lease details were each mounting their own `useResidentContract()` instance
- each instance could trigger duplicate `getResidentLatestContract` and `listResidentContracts` calls
- the old home loading delay hurt perceived performance even when the data was already ready

## Verified

These checks passed after the perf work:

- `npm.cmd run typecheck`
- `npm.cmd test -- --runInBand`

Result at last run:

- 6 suites passed
- 22 tests passed

## Important Current State

### `useResidentTenancy`

- `lib/hooks/useResidentTenancy.ts` already had shared caching and request coalescing
- it now benefits from `invalidateResidentTenancy()` calls when contract data refreshes

### `useResidentContract`

- latest contract and contract list are now shared across hook instances
- contract detail by id, lease documents, and move history are still screen-local state inside each hook instance
- that is acceptable for now because the biggest duplication was the repeated latest-contract/list bootstrap

### `useResidentRequests`

- `lib/hooks/useResidentRequests.ts` is still the next clear perf target
- it has AsyncStorage-backed cache, but not a shared in-memory cache or shared request coalescing across mounted consumers
- home and the requests screen can still maintain separate request fetch lifecycles

## Recommended Next Steps

### P1. Shared resident requests cache/store

Target files:

- `lib/hooks/useResidentRequests.ts`
- `app/(tenant)/requests.tsx`
- `app/(tenant)/index.tsx`
- possibly `lib/context/requests-context.tsx` depending on whether the next agent chooses hook-level cache or context-level consolidation

What to do:

- add a shared in-memory snapshot with TTL, similar to `useResidentTenancy` / `useResidentContract`
- coalesce concurrent request fetches across hook instances
- avoid redundant refreshes from notification-driven updates when a fresh request snapshot already exists
- keep AsyncStorage hydration, but treat it as persistence, not the primary live coordination layer

Expected payoff:

- fewer duplicate request API calls
- less churn on tenant home and request list screens
- smoother pull-to-refresh and notification update behavior

### P2. Message list optimization

Target file:

- `app/(tenant)/messages.tsx`

Known issues from the earlier review:

- `getConversationMeta()` work is duplicated during filtering and row rendering
- row-level enter animations scale poorly as the list grows

Suggested fixes:

- precompute a stable view model once
- memoize the row component
- remove per-row enter animations from the scrolling list

### P3. Profile and lease screen fetch cleanup

After requests caching, reassess whether `profile.tsx` and `lease-details.tsx` still need every current refresh trigger.

Specifically review:

- focus-based refetches
- foreground refetches
- whether lease documents/history should gain their own short-lived shared cache

## Cautions For The Next Agent

- the git worktree is dirty with unrelated user changes; do not revert unrelated files
- this repo has live portals under:
  - `app/(tenant)/`
  - `app/(management)/`
  - `app/(buildingEmployee)/`
  - `app/(modals)/`
- keep handoff and temporary notes under `docs/archive/`, not the repo root

## Short Summary

The biggest tenant wins already landed:

1. reduced broad tenant rerender pressure by moving screens off the broad `useApp()` surface
2. virtualized the obvious list-heavy tenant screens
3. shared contract bootstrap data across tenant screens and removed the fake home loading delay

The next best move is shared resident request caching in `useResidentRequests.ts`.
