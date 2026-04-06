# Architecture Guide

This file is the fast-start map for developers and AI agents working in this repository.

For the current `lib/context/` ownership split and `useApp()` composition rules, see `docs/APP_STATE.md`.
For the current API-backed vs hybrid vs mock-backed domain status, see `docs/MODULE_MATURITY.md`.

## 1. What Is Actually Running

The runtime app currently mounts these route groups:

- `app/(tenant)`
- `app/(management)`
- `app/(buildingEmployee)`
- `app/(modals)`

Auth, startup routing, and root route registration live in:

- `app/_layout.tsx`
- `app/index.tsx`
- `app/auth.tsx`

If a role or portal is not mounted there, treat it as planned or partial, even if other docs mention it.

## 2. Current Source Of Truth

Use these areas as the primary map of the application:

- `app/`: route entries and screen composition
- `lib/context/`: auth, app state, and domain modules
- `lib/services/api/`: backend clients
- `lib/types/`: shared types
- `components/`: shared and portal-specific UI

Do not assume `src/` exists as the main app structure. Older docs still mention it, but the repo currently uses `app/`, `lib/`, and `components/`.

## 3. Folder Responsibilities

### `app/`

Purpose:
- Expo Router entry points
- Portal layouts
- Route-level screen composition
- Shared modal routes

Rules:
- Keep business logic out of route files when possible.
- Put reusable logic into hooks, domain modules, or services.

### `lib/context/`

Purpose:
- Shared state and mutations
- Auth/session restoration
- Domain modules such as jobs, property, amenities, ratings, visitors

Important files:
- `lib/context/auth-context.tsx`
- `lib/context/connected-app-provider.tsx`
- `lib/context/use-amenity-visitor-app-state.ts`
- `lib/context/use-property-app-state.ts`
- `lib/context/use-operations-app-state.ts`
- `lib/context/use-admin-app-state.ts`
- `lib/context/modules/*.ts`

Reality:
- This is the main state layer today.
- `connected-app-provider.tsx` is now mostly a composition layer over extracted domain app-state hooks.
- The app-state hooks flatten module APIs into `useAppDomain()` and the legacy `useApp()` compatibility wrapper.
- Most domain behavior still lives in `lib/context/modules/*.ts`.
- `docs/APP_STATE.md` is the detailed ownership map for this layer.

### `lib/services/api/`

Purpose:
- Typed backend access
- Auth token handling
- Domain-specific API wrappers

Reality:
- Some services are real API clients.
- Some services still return mock or hybrid data.
- Check the implementation before assuming persistence.

### `components/`

Purpose:
- Reusable UI primitives
- Role-specific UI building blocks
- Icons and shell elements

Rules:
- Shared UI belongs here, not in route files.

### `features/`

Purpose:
- Product and role documentation
- Implementation status by portal/role

Reality:
- Useful for intent
- Not always aligned with the mounted app

### `docs/archive/`

Purpose:
- Historical files, source backups, design export artifacts, and diagnostics

Reality:
- Not part of the active runtime path
- Keep new feature work out of these directories

## 4. Portal Status

### Live

- Tenant
- Management
- Building employee

### Partial or planned

- Admin
- Super admin
- Service provider
- Employee
- Owner

These planned roles appear in types, docs, and some navigation code, but they are not yet fully mounted, consistent, and production-ready.

## 5. Data Maturity

The app is not uniformly API-backed.

### Mostly API-backed

- Auth/session
- Resident self-service and contract-related flows
- A growing part of management/property operations

### Hybrid or local-state backed

- Jobs
- Some management operations
- Some ratings/notifications/helper flows

Before changing a screen:

1. Check the route file.
2. Check `docs/MODULE_MATURITY.md`.
3. Check the relevant `lib/context/modules/*` file.
4. Check the matching API service.
5. Confirm whether the flow is API-backed, hybrid, or mock-backed.

## 6. How To Add Code

### New screen behavior

- Keep route files thin.
- Add logic to a hook, module, or service.
- Reuse shared components when possible.

### New backend integration

- Add or extend `lib/services/api/*`
- Map responses in the service or module layer
- Keep route files focused on display and user actions

### New role or portal

Do not add a new portal by only editing a side menu or type union.

Minimum expected touch points:
- `app/_layout.tsx`
- `app/index.tsx`
- role routing logic
- route group layout
- auth role mapping
- navigation/menu source of truth
- contributor docs

## 7. Current Pain Points

These are the main sources of confusion today:

- Docs describe a `src/` structure that the repo does not use.
- Some docs describe portals that are not mounted.
- Navigation code points to route groups that do not exist.
- `useApp()` still exists as a broad compatibility hook even though runtime code has largely moved to narrower hooks.
- Large helper/reference material can still drift toward the repo root if it is not intentionally archived.

## 8. Cleanup Priorities

Recommended order:

1. Keep docs aligned with the mounted app.
2. Introduce a single role-to-portal registry for redirects and menus.
3. Continue reducing root clutter by moving confirmed-inactive artifacts into `docs/` or `docs/archive/`.
4. Keep `useApp()` compatibility-only, shrink it where possible, and tighten ownership between app-state hooks and domain modules.
5. Mark mock-backed modules explicitly and phase them out.

## 9. Root-Level Triage

Treat these as active runtime/config files:

- `package.json`
- `app.json`
- `eas.json`
- `babel.config.js`
- `metro.config.js`
- `tsconfig.json`
- `eslint.config.js`
- `app/`
- `lib/`
- `components/`
- `assets/`
- `scripts/`
- `CLAUDE.md`

Treat these as documentation/reference areas, not core runtime:

- `docs/guides/`
- `docs/archive/`
- `APIs/`
- `features/`

Treat these as cleanup candidates, not core runtime:

- ad hoc utility files left at the repo root

Note:
- `CLAUDE.md` intentionally stays at the repo root for Claude tooling compatibility.

## 10. Contributor Checklist

Before starting work:

1. Confirm whether the target portal is actually mounted.
2. Find the domain module that owns the behavior.
3. Confirm whether the target flow is API-backed or mock-backed.
4. Update docs if you change routing or repo structure.

When in doubt, prefer clarity over cleverness. This repo benefits more from obvious ownership and accurate docs than from additional abstraction.
