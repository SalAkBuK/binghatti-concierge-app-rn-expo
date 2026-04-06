# Module Maturity Guide

This file tracks whether core runtime domains are currently API-backed, hybrid, or mock-backed.

Use it before changing a workflow so you do not assume persistence that the code does not actually have.

## Status Labels

- `api-backed`: the main workflow is driven by a real service/client and persists through the backend
- `hybrid`: part of the workflow is real, but important state or mutations still rely on local/mock logic
- `mock-backed`: state is seeded locally and mutations are simulated in memory

## Current Domain Status

| Domain | Primary files | Status | Notes |
| --- | --- | --- | --- |
| Amenities | `lib/context/modules/amenities.ts` | `mock-backed` | Seeds from `utils/mockData`; bookings/config mutations are simulated locally |
| Visitors | `lib/context/modules/visitors.ts` | `hybrid` | Resident visitor CRUD uses `residentVisitorsApi`; general visitors, visitor passes, and visitor logs still rely on mock/local state |
| Property | `lib/context/modules/property.ts` | `hybrid` | Uses `adminApi` for many building/admin/provider flows, but still mixes cache/local storage and simulated local-state helpers |
| Jobs | `lib/context/modules/jobs.ts` | `mock-backed` | Seeds from `DEFAULT_JOBS`; all updates are simulated in local state |
| Ratings | `lib/context/modules/ratings.ts` | `mock-backed` | Seeds from `DEFAULT_RATINGS` and `DEFAULT_RATING_SUMMARIES`; no real persistence yet |
| Auth/session | `lib/context/auth-context.tsx`, `lib/services/api/auth.ts` | `api-backed` | Session and login flows are tied to backend auth services |

## Working Rules

When editing a flow:

1. Check this file first.
2. Confirm the route and app-state hook that expose the behavior.
3. Open the matching module and service before changing assumptions.
4. If you move a domain from `mock-backed` to `hybrid` or `api-backed`, update this file in the same change.

## Current Risk Areas

- `jobs` and `ratings` still look operational from the UI but are not truly persistent.
- `property` has real backend integration, but not every helper in that module has the same maturity level.
- `visitors` is easy to misread because resident visitor flows are more real than visitor-pass and visitor-log flows.
