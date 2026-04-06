# Request Details Maintainability Handoff

Date: 2026-04-06

## Goal

Continue the maintainability pass after the `useApp()` reduction by shrinking oversized route files and moving behavior into narrow hooks and local presentational components.

This pass focused on `app/(modals)/request-details.tsx`.

## Completed

### 1. `request-details` behavior was pulled out of the route

Created:

- `app/(modals)/_hooks/request-details-helpers.ts`
- `app/(modals)/_hooks/useRequestDetailsScreen.ts`

What moved:

- request status/priority normalization
- attachment normalization
- date/currency/status helper logic
- request detail fetching
- tenant/backend request refresh logic
- comment mapping and author resolution
- request update/delete/comment handlers
- job estimate approval/decline handlers
- tenant completion-review navigation
- local screen workflow state such as comment posting, edit mode, image viewer state, and delete confirmation state

Important exported types:

- `RequestDetailsComment`
- `RequestDetailsEditForm`

### 2. `request-details` JSX was split into presentational components

Created:

- `app/(modals)/_components/request-details-overview.tsx`
- `app/(modals)/_components/request-details-comments.tsx`
- `app/(modals)/_components/request-details-delete-modal.tsx`

Current responsibility split:

- `request-details.tsx`
  - route glue
  - tab selection
  - derived request/job display state
  - local navigation handlers for rating and image viewer
  - owns the large local `StyleSheet`
- `request-details-overview.tsx`
  - overview tab UI
  - request header/edit form
  - location card
  - timeline
  - assigned team card
  - activity log
  - job overview
  - estimate card
  - additional costs
  - rating CTA
- `request-details-comments.tsx`
  - comments list
  - attachment rendering
  - comment composer
- `request-details-delete-modal.tsx`
  - cancel-request confirmation modal

### 3. `useApp()` reduction work already completed before this handoff

Relevant state already in place:

- `lib/context/connected-app-provider.tsx`
  - `useApp()` is compatibility-only
  - no extra broad runtime provider layer
- `app/(modals)/request-details.tsx`
  - already uses narrow hooks via `useRequestDetailsScreen`
  - no runtime `useApp()` dependency remains here

## Current File Sizes

Current approximate sizes:

- `app/(management)/requests.tsx`: `99.7 KB`
- `app/(modals)/request-details.tsx`: `37.6 KB`
- `app/(modals)/_components/request-details-overview.tsx`: `29.4 KB`
- `app/(modals)/_components/request-details-comments.tsx`: `5.4 KB`
- `app/(modals)/_components/request-details-delete-modal.tsx`: `2.1 KB`
- `app/(modals)/_hooks/request-details-helpers.ts`: `7.1 KB`
- `app/(modals)/_hooks/useRequestDetailsScreen.ts`: `25.5 KB`

Net effect:

- `request-details.tsx` dropped from about `78.1 KB` to about `37.6 KB`
- the remaining route bulk is mostly styles plus route-level derived display state

## Verified

These checks passed after the split:

- `npm.cmd run typecheck`
- `npm.cmd test -- --runInBand`

Latest Jest result:

- 6 suites passed
- 22 tests passed

## Working Tree State

Relevant current file state:

- modified:
  - `app/(modals)/request-details.tsx`
  - `lib/context/connected-app-provider.tsx`
- added but not yet committed:
  - `app/(modals)/_components/request-details-comments.tsx`
  - `app/(modals)/_components/request-details-delete-modal.tsx`
  - `app/(modals)/_components/request-details-overview.tsx`
  - `app/(modals)/_hooks/request-details-helpers.ts`
  - `app/(modals)/_hooks/useRequestDetailsScreen.ts`

Do not revert unrelated dirty files in the repo.

## What Still Needs Work In `request-details`

The route is much cleaner, but not fully minimal yet.

Remaining opportunities:

- move the large `StyleSheet` out of `request-details.tsx` into a local style module
- optionally move the remaining route-level derived values into a small view-model hook
  - `timelineSteps`
  - `activityItems`
  - estimate/completion status banners
- split `request-details-overview.tsx` further only if needed
  - likely only worth doing if that screen changes again soon
  - the best split points would be:
    - request summary/edit section
    - job and estimate section
    - activity/timeline section

This is not the highest-value next move anymore. The heavier hotspot is `app/(management)/requests.tsx`.

## Recommended Next Target

### `app/(management)/requests.tsx`

Why this is next:

- it is still about `99.7 KB`
- it mixes list screen UI, filters, pagination, selection state, API orchestration, request detail modal state, assignment modal state, comment flow, and status mutation flow in one file
- it already uses narrow hooks (`useAuth()`, `useNotifications()`, `useRequests()`), so the next step is structural decomposition, not context cleanup

## Suggested Extraction Plan For `app/(management)/requests.tsx`

Do this in this order to keep the diff safe:

### P1. Extract request-detail workflow into a hook

Create something like:

- `app/(management)/_hooks/useManagementRequestDetails.ts`

Move into it:

- selected request refresh
- `fetchRequestDetails()`
- request comments and attachments state
- detail tab state if you want the route thinner
- `handleAddMessage()`
- `handleMarkAsCompleted()`
- `handleCancelRequest()`
- request-detail modal open/close synchronization with `setSelectedRequestContext`
- `selectedRequestRef` and `lastFetchedRequestIdRef`

Reason:

- this is the same pattern that worked well for `request-details`
- it removes the highest-risk behavioral code from the screen first

### P2. Extract assignment modal workflow into a second hook

Create something like:

- `app/(management)/_hooks/useRequestAssignmentFlow.ts`

Move into it:

- `showAssignModal`
- `assignmentMode`
- worker/provider fetch logic
- `maintenanceStaff`
- `serviceProviders`
- `isAssigning`
- `isLoadingWorkers`
- `openAssignModal()`
- `handleAssignRequest()`

Reason:

- assignment logic is its own domain concern and currently creates a lot of state noise in the main route

### P3. Extract presentational pieces into local components

Create local components under:

- `app/(management)/_components/`

Suggested split:

- `management-requests-filters.tsx`
- `management-requests-list.tsx`
- `management-request-detail-modal.tsx`
- `management-request-assignment-modal.tsx`

Keep the route responsible for:

- layout shell
- top-level loading/empty states
- composing hooks and components

### P4. Leave list-data fetching for later unless necessary

The top-level screen fetch for buildings + requests is still intertwined with pagination and refresh. That can become a dedicated hook later, but it is a larger cut:

- assigned buildings fetch
- building requests aggregation
- refresh/load-more behavior
- request preselection from params

Do this only after P1 and P2, otherwise the diff will get noisy.

## Known High-Risk Areas In `app/(management)/requests.tsx`

If the next agent touches this file, verify these carefully:

- sync between local `selectedRequest` and `requests-context` `setSelectedRequestContext`
- `requestId` / `buildingId` route param preselection behavior
- cooldown and in-flight guards:
  - `REQUESTS_REFETCH_COOLDOWN_MS`
  - `isRequestsFetchInFlightRef`
  - `lastRequestsFetchAtRef`
- detail refresh guards:
  - `selectedRequestRef`
  - `lastFetchedRequestIdRef`
- assignment mode switching between `building_employee` and `service_provider`
- status transitions for:
  - `pending`
  - `assigned`
  - `in-progress`
  - `completed`
  - `cancelled`
- comment posting and detail refresh after posting

## Practical Next Command Sequence

Recommended next-agent sequence:

1. Read:
   - `app/(management)/requests.tsx`
   - `lib/context/requests-context.tsx`
   - `lib/services/api/org-buildings.ts`
2. Extract `useManagementRequestDetails`
3. Run:
   - `npm.cmd run typecheck`
   - `npm.cmd test -- --runInBand`
4. Only then extract assignment flow

## Constraints

- keep new notes under `docs/archive/`
- use `apply_patch` for manual edits
- do not reintroduce `useApp()` into route files
- preserve the current narrow-hook pattern:
  - `useAuth()`
  - `useNotifications()`
  - `useRequests()`
  - `useAppDomain()` only where a domain slice is actually needed
