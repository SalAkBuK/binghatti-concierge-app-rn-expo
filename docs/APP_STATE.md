# App State Guide

This file documents the current `lib/context/` structure after the provider stabilization pass.

## 1. Current Shape

The live app state is composed from narrow hooks in `lib/context/connected-app-provider.tsx`.

`useApp()` has been removed. New runtime code should prefer:

- `useAuth()`
- `useRequests()`
- `useNotifications()`
- `useNotices()`
- `useMessaging()`
- `useAppDomain()` with only the needed domain slice

That file should be treated as composition glue, not as the primary place where domain behavior is implemented.

## 2. Ownership Map

### `lib/context/connected-app-provider.tsx`

Owns:
- provider composition order
- the narrow hook composition used by `useAppDomain()`
- cross-context glue such as combined loading/error state

Should not grow with new domain logic unless the change is genuinely cross-domain or public-surface glue.

### `lib/context/use-amenity-visitor-app-state.ts`

Owns the app-level flattening for:
- amenities
- amenity configs
- bookings
- visitors
- resident visitors
- visitor passes
- visitor logs

Its job is to expose amenity and visitor module behavior through `useAppDomain()`.

### `lib/context/use-property-app-state.ts`

Owns the app-level flattening for:
- buildings
- unit types and units
- leases
- building employees
- service providers
- provider access requests

This is the app-facing bridge over the property module.

### `lib/context/use-operations-app-state.ts`

Owns the app-level flattening for:
- ratings
- rating summaries
- jobs
- job operation helpers

It also keeps the legacy `assignJob(jobId, serviceProviderId, options)` wrapper shape stable for existing callers.

### `lib/context/use-admin-app-state.ts`

Owns the app-level flattening for:
- admin user CRUD helpers
- building-wide user fetch helpers
- management analytics helpers
- permissions lookup helpers

This is the admin-facing aggregation layer over multiple lower-level domains.

### `lib/context/modules/*.ts`

These files are still the main place for domain behavior.

They should own:
- domain state
- domain mutations
- domain-specific business rules
- domain-specific helper functions
- domain-specific API coordination

If a rule only matters to one domain, it should usually live in the matching module, not in `connected-app-provider.tsx`.

## 3. Where New Logic Goes

### Add logic to a module when

- the behavior belongs to one domain
- the behavior is not needed globally
- the behavior is part of domain rules or data handling

Example:
- a new visitor-pass validation rule belongs in `lib/context/modules/visitors.ts`

### Add logic to an app-state hook when

- a domain module already owns the behavior
- the app-level contract needs to expose it through `useAppDomain()`
- the hook is only flattening, lightly adapting, or preserving compatibility

Example:
- a new property action may be exported through `lib/context/use-property-app-state.ts`

### Touch `connected-app-provider.tsx` when

- the provider composition order changes
- combined loading/error/public shape changes
- a cross-domain wrapper is truly necessary

If the change can live in a module or a `use-*-app-state.ts` hook, prefer that.

## 4. Guardrails

- Do not put fresh business rules straight into `connected-app-provider.tsx`.
- Do not add new domain state directly to the provider if a matching module already exists.
- Do not reintroduce `useApp()`.
- Prefer new public access through narrow hooks and `useAppDomain()`.
- Runtime code should not introduce `useApp()` imports; lint is expected to block that path.

## 5. Current Limitation

The implementation is cleaner than before, and the runtime app now uses narrow hooks instead of `useApp()`.

The remaining limitation is not a compatibility hook anymore; it is just the general need to keep ownership clear between `connected-app-provider.tsx`, the app-state hooks, and the underlying domain modules.
